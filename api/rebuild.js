// POST /api/rebuild — "Publish website": triggers a Vercel Deploy Hook so the static
// site is rebuilt with the latest published content. Staff only (JWT verified by Supabase).
// GET  /api/rebuild — publish status for the admin (configured? last publish?).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEPLOY_HOOK_URL (Vercel → Settings → Git → Deploy Hooks)
import { config, logActivity, requireUser, sb, send } from "./_lib/supabase.js";

const MIN_INTERVAL_MS = 30_000;

async function lastPublish() {
  const r = await sb("/rest/v1/site_settings?key=eq.publish&select=value,updated_at");
  return Array.isArray(r.data) && r.data[0] ? r.data[0].value || {} : {};
}

export default async function handler(req, res) {
  if (!config().ok) return send(res, 503, { ok: false, error: "not_configured", message: "Supabase isn't configured on the server." });
  if (req.method !== "GET" && req.method !== "POST") return send(res, 405, { ok: false, error: "method_not_allowed" }, { Allow: "GET, POST" });

  const auth = await requireUser(req);
  if (auth.error) return send(res, auth.error[0], { ok: false, error: "unauthorized", message: auth.error[1] });

  const hook = (process.env.DEPLOY_HOOK_URL || "").trim();
  const last = await lastPublish();
  if (req.method === "GET") return send(res, 200, { ok: true, configured: Boolean(hook), last });

  if (!hook) return send(res, 503, { ok: false, error: "no_deploy_hook", message: "DEPLOY_HOOK_URL isn't set in Vercel, so the site can't be rebuilt automatically yet." });

  const wait = last.requested_at ? MIN_INTERVAL_MS - (Date.now() - Date.parse(last.requested_at)) : 0;
  if (wait > 0) {
    return send(res, 429, { ok: false, error: "too_soon", retryAfter: Math.ceil(wait / 1000), message: "A publish was just requested — the site is already rebuilding." }, { "Retry-After": String(Math.ceil(wait / 1000)) });
  }

  let job = null;
  try {
    const r = await fetch(hook, { method: "POST", signal: AbortSignal.timeout(10000) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return send(res, 502, { ok: false, error: "hook_failed", message: `The deploy hook answered HTTP ${r.status}.` });
    job = data.job ?? data ?? null;
  } catch (err) {
    return send(res, 502, { ok: false, error: "hook_failed", message: `The deploy hook couldn't be reached (${err.message}).` });
  }

  const value = { requested_at: new Date().toISOString(), by: auth.profile.email, job_id: job?.id ?? null };
  await sb("/rest/v1/site_settings?on_conflict=key", {
    method: "POST",
    body: { key: "publish", value, is_public: false },
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  });
  await logActivity(auth.profile, "published", "site", job?.id ?? null, "Website rebuild", { job: job?.id ?? null });
  return send(res, 202, { ok: true, job, requested_at: value.requested_at });
}
