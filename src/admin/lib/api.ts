/**
 * Minimal Supabase client for the admin (Auth + PostgREST + Storage) and the /api functions.
 * Works with legacy anon JWT keys and the new sb_publishable_ keys.
 */
export interface AdminConfig {
  supabaseUrl: string;
  supabaseKey: string;
  siteUrl: string;
  siteName: string;
}
export const CFG: AdminConfig = (window as unknown as { __RITL_ADMIN__: AdminConfig }).__RITL_ADMIN__ ?? { supabaseUrl: "", supabaseKey: "", siteUrl: "", siteName: "Rudra InfoTech Lab" };
export const configured = (): boolean => Boolean(CFG.supabaseUrl && CFG.supabaseKey);

export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  last_sign_in_at?: string;
}
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

export class ApiError extends Error {
  retryAfter = 0;
  constructor(message: string, public status = 0, public code = "", public details = "") {
    super(message);
  }
}

const STORE = "ritl-admin-session";
let session: Session | null = null;
try {
  session = JSON.parse(localStorage.getItem(STORE) || "null");
} catch {
  session = null;
}
const listeners = new Set<(s: Session | null) => void>();
const save = (s: Session | null) => {
  session = s;
  if (s) localStorage.setItem(STORE, JSON.stringify(s));
  else localStorage.removeItem(STORE);
  listeners.forEach((l) => l(s));
};

const keyHeaders = (): Record<string, string> => ({ apikey: CFG.supabaseKey });

/** Friendly messages for GoTrue / PostgREST / Postgres errors. */
function friendly(status: number, body: any): ApiError {
  const code = String(body?.code ?? body?.error_code ?? body?.error ?? "");
  const raw = String(body?.message ?? body?.msg ?? body?.error_description ?? body?.error ?? `Request failed (HTTP ${status})`);
  const details = String(body?.details ?? body?.hint ?? "");
  let msg = raw;
  if (code === "23505") msg = /slug/.test(raw + details) ? "That URL slug is already used by another item." : /name/.test(raw + details) ? "That name already exists." : "That already exists.";
  else if (code === "23514") msg = `A value isn't allowed (${(/"([^"]+)"/.exec(raw)?.[1] ?? "check").replace(/_/g, " ")}). Please review the form.`;
  else if (code === "23503") msg = "This item is still referenced elsewhere.";
  else if (code === "22P02") msg = "One of the values has the wrong format.";
  else if (code === "42501" && /row-level security|permission denied/i.test(raw)) msg = "You don't have permission to do that.";
  else if (/invalid login credentials/i.test(raw)) msg = "Wrong email or password.";
  else if (/email not confirmed/i.test(raw)) msg = "Please confirm your email address first (check your inbox).";
  else if (status === 0) msg = "Can't reach the server — check your connection.";
  return new ApiError(msg, status, code, details);
}

async function parse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ── Auth ─────────────────────────────────────────────────── */
let refreshing: Promise<Session | null> | null = null;

async function authCall(path: string, init: RequestInit & { token?: string } = {}): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${CFG.supabaseUrl}/auth/v1/${path}`, {
      ...init,
      headers: { ...keyHeaders(), "Content-Type": "application/json", ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}), ...(init.headers as Record<string, string>) },
    });
  } catch {
    throw friendly(0, null);
  }
  const body = await parse(res);
  if (!res.ok) throw friendly(res.status, body);
  return body;
}

const toSession = (b: any): Session => ({
  access_token: b.access_token,
  refresh_token: b.refresh_token,
  expires_at: b.expires_at ?? Math.floor(Date.now() / 1000) + (b.expires_in ?? 3600),
  user: b.user,
});

export const auth = {
  session: () => session,
  onChange(fn: (s: Session | null) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async signIn(email: string, password: string) {
    const b = await authCall("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
    save(toSession(b));
    return session!;
  },
  async refresh(): Promise<Session | null> {
    if (!session?.refresh_token) return null;
    if (!refreshing) {
      const rt = session.refresh_token;
      refreshing = authCall("token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: rt }) })
        .then((b) => (save(toSession(b)), session))
        .catch((err: ApiError) => {
          // A refresh token that no longer exists means the session is over.
          if (err.status >= 400 && err.status < 500) save(null);
          return null;
        })
        .finally(() => (refreshing = null));
    }
    return refreshing;
  },
  /** Session tokens from an email link (#access_token=…&type=recovery|invite). */
  async fromHash(hash: string): Promise<{ type: string } | { error: string } | null> {
    const p = new URLSearchParams(hash.replace(/^#/, ""));
    if (p.get("error_description")) return { error: p.get("error_description")!.replace(/\+/g, " ") };
    const access = p.get("access_token");
    const refresh = p.get("refresh_token");
    if (!access || !refresh) return null;
    const user = await authCall("user", { token: access });
    save({ access_token: access, refresh_token: refresh, expires_at: Number(p.get("expires_at")) || Math.floor(Date.now() / 1000) + Number(p.get("expires_in") || 3600), user });
    return { type: p.get("type") || "" };
  },
  async recover(email: string) {
    const redirect = `${location.origin}/admin/reset/`;
    await authCall(`recover?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", body: JSON.stringify({ email }) });
  },
  async updateUser(patch: { password?: string; data?: Record<string, unknown> }) {
    const token = await accessToken();
    const user = await authCall("user", { method: "PUT", token: token ?? undefined, body: JSON.stringify(patch) });
    if (session) save({ ...session, user });
    return user as User;
  },
  async signOut() {
    const token = session?.access_token;
    save(null);
    if (token) await authCall("logout", { method: "POST", token }).catch(() => {});
  },
};

/** A valid access token (refreshed ~1 min before expiry). */
export async function accessToken(): Promise<string | null> {
  if (!session) return null;
  if (session.expires_at - 60 < Date.now() / 1000) await auth.refresh();
  return session?.access_token ?? null;
}

/* ── REST (PostgREST) ─────────────────────────────────────── */
export interface RestOpts {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
  count?: boolean;
  headers?: Record<string, string>;
}

export async function rest<T = any>(path: string, o: RestOpts = {}, retried = false): Promise<{ data: T; count: number | null }> {
  const token = await accessToken();
  const headers: Record<string, string> = { ...keyHeaders(), Accept: "application/json", ...o.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (CFG.supabaseKey.startsWith("eyJ")) headers.Authorization = `Bearer ${CFG.supabaseKey}`;
  if (o.body !== undefined) headers["Content-Type"] = "application/json";
  const prefer = [o.prefer, o.count ? "count=exact" : ""].filter(Boolean).join(",");
  if (prefer) headers.Prefer = prefer;
  let res: Response;
  try {
    res = await fetch(`${CFG.supabaseUrl}/rest/v1/${path}`, { method: o.method ?? "GET", headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
  } catch {
    throw friendly(0, null);
  }
  const body = await parse(res);
  if (res.status === 401 && !retried && session && /jwt/i.test(JSON.stringify(body ?? ""))) {
    if (await auth.refresh()) return rest<T>(path, o, true);
  }
  if (!res.ok) throw friendly(res.status, body);
  const range = res.headers.get("content-range");
  const total = range && range.includes("/") ? Number(range.split("/")[1]) : null;
  return { data: body as T, count: Number.isFinite(total) ? total : null };
}

/** Quote a value for PostgREST filters (commas, dots, parentheses are safe inside quotes). */
export const pq = (v: string) => `"${v.replace(/["\\]/g, "")}"`;
/** URL-encoded, quoted "*text*" ilike pattern for use inside or=(…) filters. */
export const likeQ = (q: string) => encodeURIComponent(pq(`*${q.replace(/[*%(),"\\]/g, " ").trim()}*`));

export const db = {
  select: <T = any>(table: string, query = "", count = false) => rest<T[]>(`${table}?${query}`, { count }),
  one: async <T = any>(table: string, query: string): Promise<T | null> => (await rest<T[]>(`${table}?${query}&limit=1`)).data[0] ?? null,
  insert: async <T = any>(table: string, row: unknown): Promise<T> => (await rest<T[]>(`${table}?select=*`, { method: "POST", body: row, prefer: "return=representation" })).data[0],
  insertMany: async <T = any>(table: string, rows: unknown[]): Promise<T[]> => (await rest<T[]>(`${table}?select=*`, { method: "POST", body: rows, prefer: "return=representation" })).data,
  update: async <T = any>(table: string, filter: string, patch: unknown): Promise<T[]> => (await rest<T[]>(`${table}?${filter}&select=*`, { method: "PATCH", body: patch, prefer: "return=representation" })).data,
  upsert: async <T = any>(table: string, row: unknown, onConflict: string): Promise<T> =>
    (await rest<T[]>(`${table}?on_conflict=${onConflict}&select=*`, { method: "POST", body: row, prefer: "return=representation,resolution=merge-duplicates" })).data[0],
  remove: async (table: string, filter: string): Promise<number> => (await rest<unknown[]>(`${table}?${filter}`, { method: "DELETE", prefer: "return=representation" })).data.length,
  rpc: async <T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> => (await rest<T>(`rpc/${fn}`, { method: "POST", body: args })).data,
};

/* ── Storage ──────────────────────────────────────────────── */
export const BUCKET = "media";
export const storage = {
  publicUrl: (path: string) => `${CFG.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`,
  async upload(path: string, blob: Blob, contentType: string): Promise<void> {
    const token = await accessToken();
    let res: Response;
    try {
      res = await fetch(`${CFG.supabaseUrl}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`, {
        method: "POST",
        headers: { ...keyHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": contentType, "cache-control": "max-age=31536000", "x-upsert": "false" },
        body: blob,
      });
    } catch {
      throw friendly(0, null);
    }
    if (!res.ok) {
      const b = await parse(res);
      const status = Number(b?.statusCode) || res.status;
      throw new ApiError(
        status === 413 ? "That file is larger than the 10 MB limit." : status === 415 ? "That file type isn't allowed (JPG, PNG, WebP or AVIF only)." : status === 403 ? "You don't have permission to upload files." : String(b?.message ?? `Upload failed (HTTP ${res.status})`),
        status
      );
    }
  },
  async remove(paths: string[]): Promise<void> {
    if (!paths.length) return;
    const token = await accessToken();
    const res = await fetch(`${CFG.supabaseUrl}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...keyHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: paths }),
    });
    if (!res.ok) throw friendly(res.status, await parse(res));
  },
};

/* ── Our own Vercel functions (/api/*) ────────────────────── */
export async function fn<T = any>(name: string, init: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(`/api/${name}`, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw friendly(0, null);
  }
  const body = await parse(res);
  if (!res.ok) {
    const e = new ApiError(String(body?.message ?? (res.status === 404 ? "This server function isn't deployed yet." : `Request failed (HTTP ${res.status})`)), res.status, String(body?.error ?? ""));
    e.retryAfter = Number(body?.retryAfter ?? res.headers.get("retry-after") ?? 0) || 0;
    throw e;
  }
  return body as T;
}
