// /api/admin-users — team management that needs Supabase's admin API (service key).
//   GET                                   list team (profiles + last sign-in)          owner/admin
//   POST { action: "invite", email, role, full_name }   send an invite email         owner/admin
//   POST { action: "reset", user_id }     send a password-reset email                owner/admin
//   POST { action: "delete", user_id }    remove a user (never an owner, never self) owner/admin
// Role changes themselves go straight through the database (RLS + the protect_profile trigger).
import { config, logActivity, readJson, requireUser, sb, send } from "./_lib/supabase.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLES = ["admin", "editor"];

const siteOrigin = (req) => {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https"));
  return (process.env.SITE_URL || `${proto}://${host}`).replace(/\/+$/, "");
};

export default async function handler(req, res) {
  if (!config().ok) return send(res, 503, { ok: false, error: "not_configured", message: "Supabase isn't configured on the server." });
  const auth = await requireUser(req, ["owner", "admin"]);
  if (auth.error) return send(res, auth.error[0], { ok: false, error: "unauthorized", message: auth.error[1] });
  const me = auth.profile;

  if (req.method === "GET") {
    const [profiles, users] = await Promise.all([
      sb("/rest/v1/profiles?select=id,email,full_name,role,created_at&order=created_at.asc"),
      sb("/auth/v1/admin/users?page=1&per_page=500"),
    ]);
    if (!profiles.ok) return send(res, 502, { ok: false, error: "load_failed" });
    const byId = new Map((users.data?.users ?? []).map((u) => [u.id, u]));
    return send(res, 200, {
      ok: true,
      users: profiles.data.map((p) => {
        const u = byId.get(p.id) || {};
        return { ...p, last_sign_in_at: u.last_sign_in_at ?? null, invited_at: u.invited_at ?? null, confirmed: Boolean(u.email_confirmed_at || u.confirmed_at) };
      }),
    });
  }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "method_not_allowed" }, { Allow: "GET, POST" });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { ok: false, error: "bad_request" });
  }
  const action = String(body?.action || "");

  if (action === "invite") {
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "editor");
    const full_name = String(body.full_name || "").trim().slice(0, 80);
    if (!EMAIL.test(email)) return send(res, 400, { ok: false, error: "invalid", message: "Enter a valid email address." });
    if (!ROLES.includes(role)) return send(res, 400, { ok: false, error: "invalid", message: "Invites can be for Admin or Editor. Owners are promoted from an existing account." });
    const redirect = `${siteOrigin(req)}/admin/reset/`;
    const inv = await sb(`/auth/v1/invite?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", body: { email, data: { full_name } } });
    if (!inv.ok) {
      const msg = inv.data?.msg || inv.data?.message || inv.data?.error_description || `HTTP ${inv.status}`;
      return send(res, inv.status === 422 ? 409 : 502, { ok: false, error: "invite_failed", message: /registered|exists/i.test(msg) ? "That email already has an account." : `Invite failed: ${msg}` });
    }
    const id = inv.data?.id;
    if (id) await sb(`/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", body: { role, full_name }, headers: { Prefer: "return=minimal" } });
    await logActivity(me, "invited", "profiles", id ?? null, email, { role });
    return send(res, 201, { ok: true, id, email, role });
  }

  const userId = String(body.user_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return send(res, 400, { ok: false, error: "invalid", message: "Unknown user." });
  const target = await sb(`/rest/v1/profiles?id=eq.${userId}&select=id,email,role`);
  const t = Array.isArray(target.data) ? target.data[0] : null;
  if (!t) return send(res, 404, { ok: false, error: "not_found", message: "User not found." });

  if (action === "reset") {
    const redirect = `${siteOrigin(req)}/admin/reset/`;
    const r = await sb(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", body: { email: t.email } });
    if (!r.ok) return send(res, 502, { ok: false, error: "reset_failed", message: "Couldn't send the reset email." });
    await logActivity(me, "password reset sent", "profiles", t.id, t.email);
    return send(res, 200, { ok: true });
  }

  if (action === "delete") {
    if (t.id === me.id) return send(res, 400, { ok: false, error: "invalid", message: "You can't remove your own account." });
    if (t.role === "owner") return send(res, 403, { ok: false, error: "forbidden", message: "The owner can't be removed." });
    const d = await sb(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
    if (!d.ok) return send(res, 502, { ok: false, error: "delete_failed", message: "Couldn't remove the user." });
    await logActivity(me, "removed", "profiles", t.id, t.email, { role: t.role });
    return send(res, 200, { ok: true });
  }

  return send(res, 400, { ok: false, error: "invalid", message: "Unknown action." });
}
