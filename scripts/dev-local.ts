/**
 * Full local stack: Postgres (yours) + PostgREST + the Supabase emulator + the site
 * server with /api functions — the admin's "Publish website" rebuilds the site for real.
 *
 *   PG_BIN=/path/to/postgres/bin POSTGREST_BIN=/path/to/postgrest PGHOST=127.0.0.1 PGPORT=5432 npm run dev:local
 *
 * Needs a Postgres superuser reachable with trust/password auth (PGUSER, default postgres).
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./paths.js";
import { startLocalSupabase } from "./local-supabase.js";
import { startServer } from "./server.js";

const PORT = Number(process.env.PORT || 4321);
const SITE = `http://127.0.0.1:${PORT}`;

export function runBuild(env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.argv[0], [join(ROOT, ".build/scripts/build.js")], { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d: unknown) => (out += String(d)));
    p.stderr.on("data", (d: unknown) => (out += String(d)));
    p.on("exit", (code: number) => (code === 0 ? resolve() : reject(new Error(`build failed:\n${out.slice(-2000)}`))));
  });
}

async function main() {
  let env: Record<string, string> = {};
  const sb = await startLocalSupabase({ log: (m) => console.log(`  ${m}`), onDeploy: () => runBuild(env).then(() => console.log("  ✓ site rebuilt from the database")) });
  env = { SUPABASE_URL: sb.url, SUPABASE_ANON_KEY: sb.publishableKey, SITE_URL: SITE };
  Object.assign(process.env, {
    SUPABASE_URL: sb.url,
    SUPABASE_SERVICE_ROLE_KEY: sb.secretKey,
    DEPLOY_HOOK_URL: `${sb.url}/_hooks/deploy/local`,
    IP_SALT: "local",
    SITE_URL: SITE,
  });
  const email = "owner@example.com";
  const password = "local-owner-password";
  await sb.createUser(email, password, "owner", "Local Owner");
  await runBuild(env);
  await startServer(PORT);
  console.log(`\n  Website  → ${SITE}/\n  Admin    → ${SITE}/admin/   (${email} / ${password})\n  Emails   → ${sb.url}/_emulator/outbox\n`);
  process.on("SIGINT", async () => {
    await sb.stop();
    process.exit(0);
  });
}

if (process.argv[1]?.endsWith("dev-local.js")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
