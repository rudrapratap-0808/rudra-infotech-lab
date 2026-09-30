/**
 * Loads the content the build renders.
 *   • SUPABASE_URL + SUPABASE_ANON_KEY set → published content from Supabase (anon key, RLS)
 *   • not set                               → seed data from src/data/seed.ts
 * If Supabase is configured but unreachable the build FAILS on purpose: Vercel then keeps
 * the last good deployment live instead of silently publishing the seed content.
 */
import type { Content, ContactSettings, FormSettings, ImageKind, ProcessRec, ProjectRec, SeoSettings, ServiceRec, SiteData, TechRec } from "../src/data/model.js";
import { seed } from "../src/data/seed.js";

type Row = Record<string, any>;

export interface SupabaseEnv {
  url: string;
  key: string;
}

/** Public connection details (never the service-role/secret key). */
export const supabaseEnv = (): SupabaseEnv | null => {
  const e = process.env;
  const url = (e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (
    e.SUPABASE_ANON_KEY ||
    e.SUPABASE_PUBLISHABLE_KEY ||
    e.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  if (!url || !key) return null;
  if (key.startsWith("sb_secret_")) throw new Error("SUPABASE_ANON_KEY must be the public anon/publishable key, not a secret key.");
  return { url, key };
};

/** Legacy anon keys are JWTs (sent as Bearer too); new publishable keys go on `apikey` only. */
export const keyHeaders = (key: string): Record<string, string> => ({
  apikey: key,
  ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
});

async function get<T = Row[]>(env: SupabaseEnv, path: string): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${env.url}/rest/v1/${path}`, {
        headers: { ...keyHeaders(env.key), Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) return (await res.json()) as T;
      const body = await res.text();
      // 4xx won't fix itself — fail fast with the server's explanation.
      if (res.status < 500) throw Object.assign(new Error(`Supabase GET ${path.split("?")[0]} → HTTP ${res.status}: ${body.slice(0, 300)}`), { fatal: true });
      last = new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    } catch (err) {
      if ((err as { fatal?: boolean }).fatal) throw err;
      last = err;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`Supabase GET ${path.split("?")[0]} failed: ${(last as Error)?.message ?? last}`);
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : v === null || v === undefined ? fallback : String(v));
const opt = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const merge = <T extends object>(base: T, over: unknown): T => {
  const out = { ...base } as Record<string, unknown>;
  if (over && typeof over === "object") {
    for (const [k, v] of Object.entries(over as Row)) {
      if (k in out && typeof v === typeof out[k] && v !== null) out[k] = v;
    }
  }
  return out as T;
};

export async function loadSiteData(): Promise<SiteData> {
  const env = supabaseEnv();
  const base = seed();
  if (!env) return base;

  const [projects, images, techs, links, categories, services, steps, sections, settings, seoRows] = await Promise.all([
    get(env, "projects?select=*&status=eq.published&order=display_order.asc,created_at.asc"),
    get(env, "project_images?select=project_id,url,kind,alt,display_order&order=display_order.asc"),
    get(env, "technologies?select=*&order=display_order.asc,name.asc"),
    get(env, "project_technologies?select=project_id,technology_id,display_order&order=display_order.asc"),
    get(env, "project_categories?select=id,name&order=display_order.asc,name.asc"),
    get(env, "services?select=*&published=eq.true&order=display_order.asc"),
    get(env, "process_steps?select=*&published=eq.true&order=display_order.asc"),
    get(env, "content_sections?select=key,data"),
    get(env, "site_settings?select=key,value"),
    get(env, "seo_settings?select=*&id=eq.1"),
  ]);

  const techById = new Map<string, Row>(techs.map((t) => [t.id, t]));
  const catById = new Map<string, string>(categories.map((c) => [c.id, c.name]));

  const projectRecs: ProjectRec[] = projects.map((p) => ({
    id: p.id,
    slug: str(p.slug),
    name: str(p.name),
    short_description: str(p.short_description),
    full_description: opt(p.full_description),
    project_type: opt(p.project_type) as ProjectRec["project_type"],
    category: p.category_id ? (catById.get(p.category_id) ?? null) : null,
    platform: (["web", "android", "ios", "cross-platform"].includes(p.platform) ? p.platform : "web") as ProjectRec["platform"],
    client_name: opt(p.client_name),
    live_url: opt(p.live_url),
    app_url: opt(p.app_url),
    play_store_url: opt(p.play_store_url),
    github_url: opt(p.github_url),
    completion_year: typeof p.completion_year === "number" ? p.completion_year : null,
    project_logo: opt(p.project_logo),
    featured_image: opt(p.featured_image),
    desktop_screenshot: opt(p.desktop_screenshot),
    mobile_screenshot: opt(p.mobile_screenshot),
    accent: opt(p.accent),
    headline: opt(p.headline),
    image_alt: opt(p.image_alt),
    app_category: opt(p.app_category),
    status: "published",
    featured: !!p.featured,
    display_order: Number(p.display_order) || 0,
    seo_title: opt(p.seo_title),
    seo_description: opt(p.seo_description),
    social_image: opt(p.social_image),
    canonical_url: opt(p.canonical_url),
    updated_at: opt(p.updated_at),
    technologies: links
      .filter((l) => l.project_id === p.id && techById.has(l.technology_id))
      .map((l) => str(techById.get(l.technology_id)!.name)),
    images: images
      .filter((i) => i.project_id === p.id && opt(i.url))
      .map((i) => ({ url: str(i.url), kind: str(i.kind, "gallery") as ImageKind, alt: opt(i.alt), display_order: Number(i.display_order) || 0 })),
  }));

  const serviceRecs: ServiceRec[] = services.map((s) => ({
    id: s.id,
    slug: str(s.slug),
    title: str(s.title),
    display: str(s.display) || str(s.title),
    short_description: str(s.short_description),
    full_description: str(s.full_description),
    points: Array.isArray(s.points) ? s.points.map((x: unknown) => str(x)).filter(Boolean) : [],
    symbol: str(s.symbol),
    display_order: Number(s.display_order) || 0,
    published: true,
    seo_title: opt(s.seo_title),
    seo_description: opt(s.seo_description),
  }));

  const processRecs: ProcessRec[] = steps.map((s) => ({
    id: s.id,
    name: str(s.name),
    description: str(s.description),
    display_order: Number(s.display_order) || 0,
    published: true,
  }));

  const techRecs: TechRec[] = techs.map((t) => ({
    id: t.id,
    name: str(t.name),
    kind: str(t.kind),
    category: str(t.category),
    official_url: opt(t.official_url),
    display_order: Number(t.display_order) || 0,
    in_toolkit: !!t.in_toolkit,
  }));

  const content = { ...base.content } as Content;
  for (const row of sections) {
    const k = row.key as keyof Content;
    if (k in content) (content as unknown as Record<string, unknown>)[k] = merge(content[k] as object, row.data);
  }
  const setting = (k: string) => settings.find((s) => s.key === k)?.value;
  const contact = merge<ContactSettings>(base.contact, setting("contact"));
  const formRaw = setting("form") as Partial<FormSettings> | undefined;
  const form: FormSettings = {
    services: Array.isArray(formRaw?.services) && formRaw.services.length ? formRaw.services.map((x) => str(x)).filter(Boolean) : base.form.services,
    budgets: Array.isArray(formRaw?.budgets) && formRaw.budgets.length ? formRaw.budgets.map((x) => str(x)).filter(Boolean) : base.form.budgets,
  };
  const seo = merge<SeoSettings>(base.seo, seoRows[0]);

  return {
    source: "supabase",
    projects: projectRecs,
    services: serviceRecs,
    process: processRecs,
    tech: techRecs,
    categories: categories.map((c) => str(c.name)),
    form,
    contact,
    seo,
    content,
  };
}
