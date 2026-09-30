// Shared helpers for the Vercel functions in /api (zero dependencies, Node 22+).
// Files in api/_lib are not deployed as endpoints (leading underscore).
import { createHash } from "node:crypto";

/** Server-side Supabase config. The service-role / secret key never leaves the server. */
export function config() {
  const e = process.env;
  const url = (e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceKey = (e.SUPABASE_SERVICE_ROLE_KEY || e.SUPABASE_SECRET_KEY || "").trim();
  return { url, serviceKey, ok: Boolean(url && serviceKey) };
}

/** Legacy keys are JWTs (also sent as Bearer); new sb_secret_/sb_publishable_ keys go on `apikey` only. */
export function keyHeaders(key, userToken) {
  const h = { apikey: key };
  if (userToken) h.Authorization = `Bearer ${userToken}`;
  else if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}

/** fetch() against Supabase with the service key. Returns { status, ok, data, headers }. */
export async function sb(path, { method = "GET", body, headers = {}, token, timeout = 10000 } = {}) {
  const { url, serviceKey } = config();
  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      ...keyHeaders(serviceKey, token),
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

/** The signed-in user behind a request (verified by Supabase Auth), plus their role. */
export async function requireUser(req, roles = ["owner", "admin", "editor"]) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { error: [401, "Sign in required"] };
  const u = await sb("/auth/v1/user", { token });
  if (!u.ok || !u.data?.id) return { error: [401, "Your session has expired — sign in again"] };
  const p = await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(u.data.id)}&select=id,email,full_name,role`);
  const profile = Array.isArray(p.data) ? p.data[0] : null;
  if (!profile || !roles.includes(profile.role)) return { error: [403, "You don't have permission to do that"] };
  return { user: u.data, profile, token };
}

/** Writes an activity-log row as a verified user (service role — the function vouches for the actor). */
export async function logActivity(profile, action, resource_type, resource_id = null, resource_label = null, details = null) {
  await sb("/rest/v1/activity_logs", {
    method: "POST",
    body: { actor_id: profile?.id ?? null, actor_email: profile?.email ?? "system", action, resource_type, resource_id, resource_label, details },
    headers: { Prefer: "return=minimal" },
  }).catch(() => {});
}

/* ── HTTP helpers that work on Vercel and in the local dev server ── */
export function send(res, status, body, extra = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export async function readJson(req, limit = 16 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object" && !(req.body instanceof Uint8Array)) return req.body;
    const s = String(req.body);
    if (s.length > limit) throw Object.assign(new Error("Payload too large"), { status: 413 });
    return s ? JSON.parse(s) : {};
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error("Payload too large"), { status: 413 });
    chunks.push(c);
  }
  const s = Buffer.concat(chunks).toString("utf8");
  return s ? JSON.parse(s) : {};
}

/** Best-effort client IP (Vercel sets x-forwarded-for / x-real-ip). */
export function clientIp(req) {
  const h = req.headers;
  return String(h["x-real-ip"] || String(h["x-forwarded-for"] || "").split(",")[0] || req.socket?.remoteAddress || "").trim();
}

/** One-way, salted, daily-rotating hash — enough for rate limiting, useless for tracking. */
export function ipHash(ip) {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${process.env.IP_SALT || "ritl"}|${day}|${ip}`).digest("hex").slice(0, 40);
}

/** The origin a browser request came from matches this deployment (blocks cross-site form posts). */
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients; other checks still apply
  try {
    const o = new URL(origin).host;
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
    const site = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : "";
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL || "";
    return o === host || (site && o === site) || (prod && o === prod);
  } catch {
    return false;
  }
}

/** Mirrors normalizePhone() in src/data/model.ts. */
export function normalizePhone(raw, defaultCc = "") {
  const s = String(raw || "").trim();
  if (!s) return "";
  let d = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    /* already international */
  } else if (d.startsWith("00")) d = d.slice(2);
  else if (defaultCc && d.length === 10) d = defaultCc + d;
  else if (defaultCc && d.length === 11 && d.startsWith("0")) d = defaultCc + d.slice(1);
  return d.length >= 8 && d.length <= 15 ? d : "";
}
