// GET /api/public-config — browser-safe runtime configuration for the admin SPA.
// This intentionally exposes only the Supabase URL and anon/publishable key. Those
// values are public by design; database access is still enforced by RLS. Secret and
// service-role keys are never returned.
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    return res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
  }

  const e = process.env;
  const supabaseUrl = (e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const supabaseKey = (
    e.SUPABASE_ANON_KEY ||
    e.SUPABASE_PUBLISHABLE_KEY ||
    e.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  // A misnamed secret must never be reflected to the browser.
  const safe = supabaseKey && !supabaseKey.startsWith("sb_secret_") && !/service_role/i.test(supabaseKey);
  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, configured: Boolean(supabaseUrl && safe), supabaseUrl: safe ? supabaseUrl : "", supabaseKey: safe ? supabaseKey : "" }));
}
