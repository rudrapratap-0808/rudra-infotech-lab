/**
 * LOCAL SUPABASE EMULATOR — for development and automated QA only.
 *
 * Real Postgres + real PostgREST run the actual supabase/setup.sql (schema, RLS,
 * triggers). This file adds a small gateway on top that behaves like the Supabase
 * API for the parts the site uses:
 *   /rest/v1/*     → PostgREST (API keys + user JWTs, legacy and sb_publishable/sb_secret keys)
 *   /auth/v1/*     → email/password auth, refresh, recovery + invite links, admin users API
 *   /storage/v1/*  → uploads/deletes checked against the storage.objects RLS policies, public reads
 *   /_hooks/deploy → a fake Vercel deploy hook (optionally rebuilds the site)
 *   /_emulator/*   → outbox (emails that would have been sent), deploy log
 *
 * Needs: a running Postgres (PGHOST/PGPORT/PGUSER, trust auth), PG_BIN (dir with psql)
 * and POSTGREST_BIN. Usage: see scripts/dev.ts (`npm run dev:local`).
 */
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ROOT } from "./paths.js";

type Json = any;

export interface Mail {
  type: "recovery" | "invite";
  email: string;
  link: string;
  at: string;
}
export interface Deploy {
  id: string;
  state: "PENDING" | "BUILDING" | "READY" | "ERROR";
  createdAt: number;
  finishedAt?: number;
  error?: string;
}
export interface LocalSupabase {
  url: string;
  anonKey: string;
  serviceKey: string;
  publishableKey: string;
  secretKey: string;
  outbox: Mail[];
  deploys: Deploy[];
  createUser(email: string, password: string, role?: string, fullName?: string): Promise<string>;
  sql(query: string): string;
  stop(): Promise<void>;
}
export interface LocalOptions {
  port?: number;
  restPort?: number;
  db?: string;
  /** Access-token lifetime in seconds (short values exercise the admin's refresh logic). */
  accessTtl?: number;
  onDeploy?: () => Promise<void>;
  log?: (m: string) => void;
}

const SECRET = "local-dev-jwt-secret-with-at-least-32-characters!";
const PUBLISHABLE = "sb_publishable_local_dev_key";
const SECRET_KEY = "sb_secret_local_dev_key";

const b64u = (v: string | Uint8Array) => Buffer.from(v).toString("base64url");
const sign = (claims: Json) => {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(claims));
  return `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;
};
const verify = (token: string): { claims?: Json; error?: string } => {
  const parts = token.split(".");
  if (parts.length !== 3) return { error: "invalid JWT: unable to parse or verify signature, token is malformed" };
  const expect = Buffer.from(createHmac("sha256", SECRET).update(`${parts[0]}.${parts[1]}`).digest("base64url"));
  const got = Buffer.from(parts[2]);
  if (expect.length !== got.length || !timingSafeEqual(expect, got)) return { error: "invalid JWT: unable to parse or verify signature, signature is invalid" };
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (claims.exp && claims.exp < Date.now() / 1000) return { error: "JWT expired" };
  return { claims };
};
const hashPw = (pw: string) => {
  const salt = randomBytes(12).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 32).toString("hex")}`;
};
const checkPw = (pw: string, stored: string | null) => {
  const [, salt, hash] = (stored || "").split("$");
  if (!salt || !hash) return false;
  const a = Buffer.from(scryptSync(pw, salt, 32).toString("hex"));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, range, x-upsert, accept-profile, content-profile, cache-control",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
  "Access-Control-Expose-Headers": "content-range, content-location, location, preference-applied",
};

const readBody = async (req: Json): Promise<NodeBuffer> => {
  const chunks: Uint8Array[] = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
};

async function waitFor(url: string, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`timed out waiting for ${url}`);
}

export async function startLocalSupabase(o: LocalOptions = {}): Promise<LocalSupabase> {
  const port = o.port ?? 54321;
  const restPort = o.restPort ?? 54330;
  const dbName = o.db ?? "ritl_local";
  const ttl = o.accessTtl ?? 3600;
  const log = o.log ?? (() => {});
  const url = `http://127.0.0.1:${port}`;
  const REST = `http://127.0.0.1:${restPort}`;
  const dataDir = join(ROOT, ".build/local-supabase");
  const pgHost = process.env.PGHOST || "127.0.0.1";
  const pgPort = process.env.PGPORT || "54329";
  const pgUser = process.env.PGUSER || "postgres";
  const psql = join(process.env.PG_BIN || "", "psql");
  const postgrest = process.env.POSTGREST_BIN || "postgrest";

  const run = (db: string, args: string[]) => {
    const r = spawnSync(psql, ["-h", pgHost, "-p", pgPort, "-U", pgUser, "-d", db, "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`psql ${args.join(" ")} failed:\n${r.stderr}`);
    return String(r.stdout);
  };

  // 1. fresh database with the real schema + seed
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(join(dataDir, "storage"), { recursive: true });
  run("postgres", ["-c", `drop database if exists ${dbName} with (force)`, "-c", `create database ${dbName}`]);
  for (const f of ["supabase/local/bootstrap.sql", "supabase/setup.sql", "supabase/seed.sql"]) run(dbName, ["-f", join(ROOT, f)]);
  log(`database ${dbName}: bootstrap + setup.sql + seed.sql applied`);

  // 2. PostgREST
  const conf = join(dataDir, "postgrest.conf");
  await writeFile(
    conf,
    [
      `db-uri = "postgres://authenticator:authenticator@${pgHost.startsWith("/") ? "127.0.0.1" : pgHost}:${pgPort}/${dbName}"`,
      `db-schemas = "public,storage,auth"`,
      `db-anon-role = "anon"`,
      `jwt-secret = "${SECRET}"`,
      `server-host = "127.0.0.1"`,
      `server-port = ${restPort}`,
      `db-pool = 10`,
      `log-level = "error"`,
    ].join("\n") + "\n"
  );
  const rest = spawn(postgrest, [conf], { stdio: ["ignore", "pipe", "pipe"] });
  rest.stderr.on("data", (d: Json) => log(`[postgrest] ${String(d).trim()}`));
  await waitFor(`${REST}/`);

  const now = () => Math.floor(Date.now() / 1000);
  const anonJwt = sign({ iss: "supabase-local", role: "anon", iat: now(), exp: now() + 10 * 365 * 86400 });
  const serviceJwt = sign({ iss: "supabase-local", role: "service_role", iat: now(), exp: now() + 10 * 365 * 86400 });

  /** PostgREST as the service role (or as a given JWT). */
  const db = async (method: string, path: string, x: { body?: unknown; profile?: string; jwt?: string; prefer?: string } = {}) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${x.jwt ?? serviceJwt}`, Accept: "application/json" };
    if (x.body !== undefined) headers["Content-Type"] = "application/json";
    if (x.profile) headers[method === "GET" ? "Accept-Profile" : "Content-Profile"] = x.profile;
    if (x.prefer) headers.Prefer = x.prefer;
    const r = await fetch(`${REST}/${path}`, { method, headers, body: x.body !== undefined ? JSON.stringify(x.body) : undefined });
    const text = await r.text();
    return { status: r.status, data: text ? JSON.parse(text) : null };
  };
  const findUser = async (q: string) => (await db("GET", `users?${q}&select=*`, { profile: "auth" })).data?.[0] ?? null;
  const userJson = (u: Json) => ({
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    confirmed_at: u.email_confirmed_at,
    invited_at: u.invited_at,
    last_sign_in_at: u.last_sign_in_at,
    phone: "",
    app_metadata: u.raw_app_meta_data ?? { provider: "email", providers: ["email"] },
    user_metadata: u.raw_user_meta_data ?? {},
    identities: [],
    banned_until: u.banned_until,
    created_at: u.created_at,
    updated_at: u.updated_at,
  });
  const refresh = new Map<string, { uid: string; sid: string }>();
  const links = new Map<string, { uid: string; type: "recovery" | "invite"; exp: number }>();
  const outbox: Mail[] = [];
  const deploys: Deploy[] = [];

  const session = async (u: Json) => {
    const sid = randomUUID();
    const t = now();
    const access_token = sign({
      aud: "authenticated",
      exp: t + ttl,
      iat: t,
      iss: `${url}/auth/v1`,
      sub: u.id,
      email: u.email,
      phone: "",
      role: "authenticated",
      aal: "aal1",
      session_id: sid,
      app_metadata: u.raw_app_meta_data ?? {},
      user_metadata: u.raw_user_meta_data ?? {},
    });
    const refresh_token = randomBytes(24).toString("base64url");
    refresh.set(refresh_token, { uid: u.id, sid });
    await db("PATCH", `users?id=eq.${u.id}`, { profile: "auth", body: { last_sign_in_at: new Date().toISOString() } });
    return { access_token, token_type: "bearer", expires_in: ttl, expires_at: t + ttl, refresh_token, user: userJson({ ...u, last_sign_in_at: new Date().toISOString() }) };
  };
  const mail = (type: Mail["type"], u: Json, redirect: string) => {
    const token = randomBytes(20).toString("hex");
    links.set(token, { uid: u.id, type, exp: Date.now() + 3600_000 });
    const link = `${url}/auth/v1/verify?token=${token}&type=${type}&redirect_to=${encodeURIComponent(redirect)}`;
    outbox.push({ type, email: u.email, link, at: new Date().toISOString() });
    log(`[mail] ${type} → ${u.email}: ${link}`);
  };
  const createUser = async (email: string, password: string | null, meta: Json = {}, confirmed = true, invited = false) => {
    const r = await db("POST", "users", {
      profile: "auth",
      prefer: "return=representation",
      body: {
        email: email.toLowerCase(),
        encrypted_password: password ? hashPw(password) : null,
        email_confirmed_at: confirmed ? new Date().toISOString() : null,
        invited_at: invited ? new Date().toISOString() : null,
        raw_user_meta_data: meta,
      },
    });
    if (r.status === 409) return { error: "exists" as const };
    if (r.status >= 300) throw new Error(`create user failed: ${JSON.stringify(r.data)}`);
    return { user: r.data[0] };
  };

  const server = createServer(async (req: Json, res: Json) => {
    const out = (status: number, body: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(status, { ...CORS, "Content-Type": "application/json", ...headers });
      res.end(body === null ? "" : JSON.stringify(body));
    };
    const gerr = (status: number, error_code: string, msg: string) => out(status, { code: status, error_code, msg });
    try {
      if (req.method === "OPTIONS") return out(204, null);
      const u = new URL(req.url, url);
      const path = u.pathname;
      const raw = ["GET", "HEAD"].includes(req.method) ? Buffer.alloc(0) : await readBody(req);
      const body = () => (raw.length ? JSON.parse(raw.toString("utf8")) : {});

      /* ── emulator + fake deploy hook ──────────────────────── */
      if (path === "/_emulator/outbox") return out(200, outbox);
      if (path === "/_emulator/deploys") return out(200, deploys);
      if (path.startsWith("/_hooks/deploy/") && req.method === "POST") {
        const d: Deploy = { id: `dpl_${randomBytes(6).toString("hex")}`, state: "PENDING", createdAt: Date.now() };
        deploys.push(d);
        if (o.onDeploy) {
          d.state = "BUILDING";
          o.onDeploy().then(
            () => ((d.state = "READY"), (d.finishedAt = Date.now())),
            (e) => ((d.state = "ERROR"), (d.error = String(e?.message ?? e)), (d.finishedAt = Date.now()))
          );
        } else d.state = "READY";
        return out(201, { job: { id: d.id, state: "PENDING", createdAt: d.createdAt } });
      }

      /* ── public storage objects (no key needed) ───────────── */
      const pub = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(path);
      if (pub && (req.method === "GET" || req.method === "HEAD")) {
        const [bucket, name] = [pub[1], decodeURIComponent(pub[2])];
        const b = (await db("GET", `buckets?id=eq.${encodeURIComponent(bucket)}&select=public`, { profile: "storage" })).data?.[0];
        if (!b?.public) return out(400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
        const obj = (await db("GET", `objects?bucket_id=eq.${encodeURIComponent(bucket)}&name=eq.${encodeURIComponent(name)}&select=metadata`, { profile: "storage" })).data?.[0];
        if (!obj) return out(400, { statusCode: "404", error: "not_found", message: "Object not found" });
        const file = await readFile(join(dataDir, "storage", bucket, name));
        res.writeHead(200, { ...CORS, "Content-Type": obj.metadata?.mimetype || "application/octet-stream", "Content-Length": String(file.length), "Cache-Control": "max-age=3600" });
        return res.end(req.method === "HEAD" ? undefined : file);
      }

      /* ── email links (opened from an inbox: no API key) ─────── */
      if (path === "/auth/v1/verify" && req.method === "GET") {
        const redirectTo = u.searchParams.get("redirect_to") || `${url}/`;
        const token = u.searchParams.get("token") || "";
        const l = links.get(token);
        const target = redirectTo;
        if (!l || l.exp < Date.now()) {
          res.writeHead(303, { Location: `${target}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired` });
          return res.end();
        }
        links.delete(token);
        if (!(await findUser(`id=eq.${l.uid}&email_confirmed_at=not.is.null`))) await db("PATCH", `users?id=eq.${l.uid}`, { profile: "auth", body: { email_confirmed_at: new Date().toISOString() } });
        const s = await session(await findUser(`id=eq.${l.uid}`));
        res.writeHead(303, { Location: `${target}#access_token=${s.access_token}&expires_at=${s.expires_at}&expires_in=${s.expires_in}&refresh_token=${s.refresh_token}&token_type=bearer&type=${l.type}` });
        return res.end();
      }

      /* ── API key + JWT, like the Supabase gateway ─────────── */
      const apikey = String(req.headers.apikey || u.searchParams.get("apikey") || "");
      if (!apikey) return out(401, { message: "No API key found in request", hint: "No `apikey` request header or url param was found." });
      let keyRole: string | null = null;
      if (apikey === PUBLISHABLE) keyRole = "anon";
      else if (apikey === SECRET_KEY) {
        if (/Mozilla\//.test(String(req.headers["user-agent"] || ""))) return out(401, { message: "Secret API keys can only be used in a protected environment" });
        keyRole = "service_role";
      } else {
        const v = verify(apikey);
        keyRole = v.claims?.role ?? null;
      }
      if (!keyRole) return out(401, { message: "Invalid API key" });
      let jwt = keyRole === "service_role" ? serviceJwt : anonJwt;
      let claims: Json = { role: keyRole };
      const authz = String(req.headers.authorization || "");
      if (authz) {
        const token = authz.replace(/^Bearer\s+/i, "");
        const v = verify(token);
        if (v.error) return out(401, { code: v.error === "JWT expired" ? "PGRST303" : "PGRST301", message: v.error === "JWT expired" ? "JWT expired" : "Invalid JWT", msg: v.error });
        jwt = token;
        claims = v.claims;
      }

      /* ── REST ─────────────────────────────────────────────── */
      if (path.startsWith("/rest/v1")) {
        const headers: Record<string, string> = { Authorization: `Bearer ${jwt}` };
        for (const h of ["accept", "content-type", "prefer", "range", "range-unit", "accept-profile", "content-profile"]) if (req.headers[h]) headers[h] = String(req.headers[h]);
        const r = await fetch(`${REST}${path.slice(8) || "/"}${u.search}`, { method: req.method, headers, body: raw.length ? (raw as unknown as BodyInit) : undefined });
        const buf = Buffer.from(await r.arrayBuffer());
        const pass: Record<string, string> = {};
        for (const h of ["content-type", "content-range", "location", "preference-applied"]) {
          const v = r.headers.get(h);
          if (v) pass[h] = v;
        }
        res.writeHead(r.status, { ...CORS, ...pass });
        return res.end(buf);
      }

      /* ── AUTH ─────────────────────────────────────────────── */
      if (path.startsWith("/auth/v1/")) {
        const route = path.slice(9);
        const isService = claims.role === "service_role";
        const redirectTo = u.searchParams.get("redirect_to") || String(body().redirect_to || "") || `${url}/`;

        if (route === "settings") return out(200, { external: { email: true }, disable_signup: false });
        if (route === "token" && req.method === "POST") {
          const grant = u.searchParams.get("grant_type");
          const b = body();
          if (grant === "password") {
            const user = await findUser(`email=eq.${encodeURIComponent(String(b.email || "").toLowerCase())}`);
            if (!user || !checkPw(String(b.password || ""), user.encrypted_password)) return gerr(400, "invalid_credentials", "Invalid login credentials");
            if (user.banned_until && Date.parse(user.banned_until) > Date.now()) return gerr(400, "user_banned", "User is banned");
            if (!user.email_confirmed_at) return gerr(400, "email_not_confirmed", "Email not confirmed");
            return out(200, await session(user));
          }
          if (grant === "refresh_token") {
            const t = refresh.get(String(b.refresh_token || ""));
            if (!t) return gerr(400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
            refresh.delete(String(b.refresh_token));
            const user = await findUser(`id=eq.${t.uid}`);
            if (!user) return gerr(400, "user_not_found", "User not found");
            return out(200, await session(user));
          }
          return gerr(400, "unsupported_grant_type", "Unsupported grant type");
        }
        if (route === "signup" && req.method === "POST") {
          const b = body();
          const c = await createUser(String(b.email || ""), String(b.password || ""), b.data || {}, true);
          if ("error" in c) return gerr(422, "user_already_exists", "User already registered");
          return out(200, await session(c.user));
        }
        if (route === "recover" && req.method === "POST") {
          const user = await findUser(`email=eq.${encodeURIComponent(String(body().email || "").toLowerCase())}`);
          if (user) mail("recovery", user, redirectTo);
          return out(200, {});
        }
        if (route === "invite" && req.method === "POST") {
          if (!isService) return gerr(403, "not_admin", "User not allowed");
          const b = body();
          const c = await createUser(String(b.email || ""), null, b.data || {}, false, true);
          if ("error" in c) return gerr(422, "email_exists", "A user with this email address has already been registered");
          mail("invite", c.user, redirectTo);
          return out(200, userJson(c.user));
        }
        if (route === "user") {
          if (!claims.sub) return gerr(401, "no_authorization", "This endpoint requires a valid Bearer token");
          const user = await findUser(`id=eq.${claims.sub}`);
          if (!user) return gerr(403, "user_not_found", "User from sub claim in JWT does not exist");
          if (req.method === "GET") return out(200, userJson(user));
          if (req.method === "PUT") {
            const b = body();
            const patch: Json = {};
            if (b.password) {
              if (String(b.password).length < 8) return gerr(422, "weak_password", "Password should be at least 8 characters.");
              patch.encrypted_password = hashPw(String(b.password));
            }
            if (b.data) patch.raw_user_meta_data = { ...(user.raw_user_meta_data || {}), ...b.data };
            const r = await db("PATCH", `users?id=eq.${user.id}`, { profile: "auth", body: patch, prefer: "return=representation" });
            return out(200, userJson(r.data[0]));
          }
        }
        if (route === "logout" && req.method === "POST") {
          for (const [k, v] of refresh) if (v.uid === claims.sub) refresh.delete(k);
          return out(204, null);
        }
        const adm = /^admin\/users(?:\/([0-9a-f-]{36}))?$/.exec(route);
        if (adm) {
          if (!isService) return gerr(403, "not_admin", "User not allowed");
          if (!adm[1] && req.method === "GET") {
            const r = await db("GET", "users?select=*&order=created_at.asc", { profile: "auth" });
            return out(200, { users: r.data.map(userJson), aud: "authenticated" });
          }
          if (!adm[1] && req.method === "POST") {
            const b = body();
            const c = await createUser(String(b.email || ""), b.password ? String(b.password) : null, b.user_metadata || {}, !!b.email_confirm);
            if ("error" in c) return gerr(422, "email_exists", "A user with this email address has already been registered");
            return out(200, userJson(c.user));
          }
          if (adm[1] && req.method === "DELETE") {
            await db("DELETE", `users?id=eq.${adm[1]}`, { profile: "auth" });
            for (const [k, v] of refresh) if (v.uid === adm[1]) refresh.delete(k);
            return out(200, {});
          }
          if (adm[1] && req.method === "GET") {
            const user = await findUser(`id=eq.${adm[1]}`);
            return user ? out(200, userJson(user)) : gerr(404, "user_not_found", "User not found");
          }
        }
        return gerr(404, "not_found", `Unknown auth route ${route}`);
      }

      /* ── STORAGE ──────────────────────────────────────────── */
      const obj = /^\/storage\/v1\/object\/([^/]+)(?:\/(.+))?$/.exec(path);
      if (obj) {
        const bucket = decodeURIComponent(obj[1]);
        const name = obj[2] ? decodeURIComponent(obj[2]) : "";
        const b = (await db("GET", `buckets?id=eq.${encodeURIComponent(bucket)}&select=*`, { profile: "storage" })).data?.[0];
        if (!b) return out(400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
        const file = (n: string) => join(dataDir, "storage", bucket, n);

        if ((req.method === "POST" || req.method === "PUT") && name) {
          if (name.includes("..")) return out(400, { statusCode: "400", error: "InvalidKey", message: `Invalid key: ${name}` });
          const mime = String(req.headers["content-type"] || "application/octet-stream").split(";")[0].trim();
          if (b.allowed_mime_types?.length && !b.allowed_mime_types.includes(mime)) return out(415, { statusCode: "415", error: "invalid_mime_type", message: `mime type ${mime} is not supported` });
          if (b.file_size_limit && raw.length > Number(b.file_size_limit)) return out(413, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" });
          const upsert = req.method === "PUT" || String(req.headers["x-upsert"] || "") === "true";
          const r = await db("POST", `objects${upsert ? "?on_conflict=bucket_id,name" : ""}`, {
            profile: "storage",
            jwt,
            prefer: `return=representation${upsert ? ",resolution=merge-duplicates" : ""}`,
            body: { bucket_id: bucket, name, metadata: { mimetype: mime, size: raw.length, cacheControl: String(req.headers["cache-control"] || "max-age=3600") } },
          });
          if (r.status === 409) return out(409, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
          if (r.status >= 300) return out(403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
          await mkdir(dirname(file(name)), { recursive: true });
          await writeFile(file(name), raw);
          return out(200, { Key: `${bucket}/${name}`, Id: r.data[0].id });
        }
        if (req.method === "DELETE") {
          const names: string[] = name ? [name] : (body().prefixes ?? []);
          const deleted: Json[] = [];
          for (const n of names) {
            const r = await db("DELETE", `objects?bucket_id=eq.${encodeURIComponent(bucket)}&name=eq.${encodeURIComponent(n)}`, { profile: "storage", jwt, prefer: "return=representation" });
            if (Array.isArray(r.data) && r.data.length) {
              deleted.push(r.data[0]);
              await unlink(file(n)).catch(() => {});
            }
          }
          if (name) return deleted.length ? out(200, { message: "Successfully deleted" }) : out(400, { statusCode: "404", error: "not_found", message: "Object not found" });
          return out(200, deleted);
        }
      }
      return out(404, { message: `No route for ${req.method} ${path}` });
    } catch (err) {
      log(`[gateway] ${(err as Error).stack}`);
      return out(500, { message: (err as Error).message });
    }
  });
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", () => r()));
  log(`local supabase → ${url} (PostgREST ${REST})`);

  return {
    url,
    anonKey: anonJwt,
    serviceKey: serviceJwt,
    publishableKey: PUBLISHABLE,
    secretKey: SECRET_KEY,
    outbox,
    deploys,
    sql: (q: string) => run(dbName, ["-At", "-c", q]),
    async createUser(email, password, role = "pending", fullName = "") {
      const c = await createUser(email, password, { full_name: fullName }, true);
      if ("error" in c) throw new Error(`user ${email} exists`);
      if (role !== "pending") await db("PATCH", `profiles?id=eq.${c.user.id}`, { body: { role, full_name: fullName } });
      return c.user.id as string;
    },
    async stop() {
      server.close();
      rest.kill("SIGTERM");
    },
  };
}
