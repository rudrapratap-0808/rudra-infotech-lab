/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONFIG — brand constants, URL resolution and navigation.
 *  Everything editable (contact details, SEO, copy, projects…) lives in
 *  the admin panel / Supabase, with defaults in src/data/seed.ts.
 * ─────────────────────────────────────────────────────────────
 */

export interface SocialLink {
  label: string;
  href: string;
}

export const PLACEHOLDER_URL = "http://localhost:4321";

/**
 * Production URL (no trailing slash) — used for canonical URLs, sitemap, Open Graph and schema.
 * Resolution order:
 *   1. SEO → "Canonical base URL" in the admin (applied by the store)
 *   2. SITE_URL env var            e.g. SITE_URL=https://rudrainfotechlab.com
 *   3. Vercel (automatic)          VERCEL_PROJECT_PRODUCTION_URL — your shortest custom
 *                                  production domain, or the *.vercel.app domain
 *   4. Local preview               http://localhost:4321
 */
const resolveUrl = (): { url: string; source: string } => {
  const explicit = process.env.SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const [raw, source] = explicit
    ? [explicit, "SITE_URL"]
    : vercel
      ? [vercel, "Vercel production domain"]
      : [PLACEHOLDER_URL, "local preview"];
  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return { url: withProtocol.replace(/\/+$/, ""), source };
};
const resolved = resolveUrl();

export const site = {
  name: "Rudra InfoTech Lab",
  short: "RITL",
  url: resolved.url,
  urlSource: resolved.source,
  locale: "en_IN",
  lang: "en-IN",
  /** Browser UI colour — matches the PAPER hero + preloader. */
  themeColor: "#f1eee6",
  tagline: "Websites that make businesses impossible to ignore.",
};

/** Full navigation (menu overlay + footer). */
export const nav = [
  { label: "Home", href: "/#top" },
  { label: "Work", href: "/projects/" },
  { label: "Apps", href: "/apps/" },
  { label: "Services", href: "/services/" },
  { label: "Process", href: "/#process" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/contact/" },
];

/** The links shown in the fixed bar next to MENU. */
export const navPrimary = [
  { label: "Work", href: "/projects/" },
  { label: "Apps", href: "/apps/" },
  { label: "Services", href: "/services/" },
  { label: "Contact", href: "/contact/" },
];

/**
 * Chapter labels shown in the centre of the nav ("/ 02 WORK") and at the top of each
 * section. Sub-sections share their chapter's number (philosophy belongs to 01).
 */
export const chapters = {
  home: { n: "01", label: "Home" },
  philosophy: { n: "01", label: "Philosophy" },
  work: { n: "02", label: "Work" },
  apps: { n: "03", label: "Apps" },
  services: { n: "04", label: "Services" },
  why: { n: "05", label: "Why Rudra" },
  process: { n: "06", label: "Process" },
  toolkit: { n: "07", label: "Toolkit" },
  lab: { n: "08", label: "The Lab" },
  manifesto: { n: "09", label: "Manifesto" },
  contact: { n: "09", label: "Contact" },
  end: { n: "—", label: "End" },
} as const;

export type ChapterKey = keyof typeof chapters;
export const chapterText = (k: ChapterKey): string => `/ ${chapters[k].n} ${chapters[k].label}`;
