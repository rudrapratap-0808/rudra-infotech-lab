// POST /api/enquiry — stores a project brief in Supabase (status NEW, unread) and,
// optionally, emails a notification. The enquiry is saved FIRST: email problems never lose it.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY), IP_SALT,
//      optional RESEND_API_KEY + NOTIFY_EMAIL (+ NOTIFY_FROM) for email notifications.
import { clientIp, config, ipHash, normalizePhone, readJson, sameOrigin, sb, send } from "./_lib/supabase.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { name: 80, email: 120, phone: 24, company: 100, service: 80, budget: 60, details: 2000, page: 500 };
const PER_IP = 3; // briefs per IP in the window
const GLOBAL = 40; // briefs across the whole site in the window
const WINDOW_MIN = 10;

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

function validate(b) {
  const v = {
    name: clean(b.name, LIMITS.name),
    email: clean(b.email, LIMITS.email).toLowerCase(),
    phone: clean(b.phone, LIMITS.phone),
    company: clean(b.company, LIMITS.company),
    service: clean(b.service ?? b.type, LIMITS.service),
    budget: clean(b.budget, LIMITS.budget),
    message: clean(b.details ?? b.message, LIMITS.details),
    page: clean(b.page, LIMITS.page),
  };
  const errors = {};
  if (v.name.length < 2) errors.name = "Please tell us your name.";
  if (!EMAIL.test(v.email)) errors.email = "That email doesn't look quite right.";
  if (v.phone && (!/^[+\d\s().-]+$/.test(v.phone) || v.phone.replace(/\D/g, "").length < 7 || v.phone.replace(/\D/g, "").length > 15))
    errors.phone = "Please enter a valid phone / WhatsApp number.";
  if (!v.service) errors.service = "Pick the service you need.";
  if (v.message.length < 20) errors.details = "Tell us a little more about the project (20+ characters).";
  return { v, errors };
}

async function notify(row, v) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return "skipped";
  const from = process.env.NOTIFY_FROM || "Rudra InfoTech Lab <onboarding@resend.dev>";
  const lines = [
    `New project brief #${row.ref}`,
    "",
    `Name: ${v.name}`,
    `Email: ${v.email}`,
    v.phone && `Phone / WhatsApp: ${v.phone}`,
    v.company && `Business: ${v.company}`,
    `Service: ${v.service}`,
    v.budget && `Budget: ${v.budget}`,
    "",
    v.message,
    "",
    v.page && `Sent from: ${v.page}`,
  ].filter((l) => l !== "" && l !== undefined && l !== false);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: to.split(",").map((s) => s.trim()).filter(Boolean), reply_to: v.email, subject: `New brief #${row.ref} — ${v.name} (${v.service})`, text: lines.join("\n") }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? "sent" : `failed (${res.status})`;
  } catch (err) {
    return `failed (${err.message})`;
  }
}

export default async function handler(req, res) {
  const cfg = config();
  if (req.method === "GET") return send(res, 200, { ok: true, configured: cfg.ok, email: Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) });
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "method_not_allowed" }, { Allow: "GET, POST" });
  if (!cfg.ok) return send(res, 503, { ok: false, error: "not_configured" });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: "forbidden" });

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return send(res, err.status || 400, { ok: false, error: "bad_request" });
  }
  if (!body || typeof body !== "object") return send(res, 400, { ok: false, error: "bad_request" });

  // Bots: honeypot filled or form submitted impossibly fast → pretend success, store nothing.
  if (clean(body.website, 200) || (Number(body.elapsed) || 0) < 2500) return send(res, 200, { ok: true });

  const { v, errors } = validate(body);
  if (Object.keys(errors).length) return send(res, 400, { ok: false, error: "invalid", errors });

  try {
    const ip = ipHash(clientIp(req));
    const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();
    const [mine, all, contact] = await Promise.all([
      sb(`/rest/v1/enquiries?select=id&ip_hash=eq.${ip}&created_at=gte.${encodeURIComponent(since)}&limit=${PER_IP + 1}`),
      sb(`/rest/v1/enquiries?select=id&created_at=gte.${encodeURIComponent(since)}&limit=${GLOBAL + 1}`),
      sb(`/rest/v1/site_settings?key=eq.contact&select=value`),
    ]);
    if ((Array.isArray(mine.data) && mine.data.length >= PER_IP) || (Array.isArray(all.data) && all.data.length >= GLOBAL)) {
      return send(res, 429, { ok: false, error: "rate_limited", message: "You've sent a few briefs in a short time — please try again in a few minutes, or chat with us on WhatsApp." }, { "Retry-After": String(WINDOW_MIN * 60) });
    }
    const cc = (Array.isArray(contact.data) && contact.data[0]?.value?.default_country_code) || "91";
    const row = {
      name: v.name,
      email: v.email,
      phone: v.phone || null,
      whatsapp: normalizePhone(v.phone, String(cc).replace(/\D/g, "")) || null,
      company: v.company || null,
      service: v.service,
      budget: v.budget || null,
      message: v.message,
      source: "website",
      page_url: v.page || null,
      ip_hash: ip,
      user_agent: clean(req.headers["user-agent"], 400) || null,
    };
    const ins = await sb("/rest/v1/enquiries?select=id,ref", { method: "POST", body: row, headers: { Prefer: "return=representation" } });
    if (!ins.ok) {
      console.error("[enquiry] insert failed", ins.status, JSON.stringify(ins.data).slice(0, 300));
      return send(res, 502, { ok: false, error: "store_failed" });
    }
    const saved = Array.isArray(ins.data) ? ins.data[0] : ins.data;
    const mail = await notify(saved, v);
    if (mail.startsWith("failed")) console.warn(`[enquiry] #${saved.ref} saved; notification email ${mail}`);
    return send(res, 201, { ok: true, ref: saved.ref });
  } catch (err) {
    console.error("[enquiry]", err);
    return send(res, 502, { ok: false, error: "store_failed" });
  }
}
