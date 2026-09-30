/**
 * The content the build renders from — seed data by default, replaced by
 * scripts/content.ts with the published content from Supabase.
 */
import { AVAILABILITY_TEXT, isApp, type ProjectRec, type SiteData } from "./model.js";
import { seed } from "./seed.js";
import { site, type SocialLink } from "./site.js";

let current: SiteData = seed();

export const setSiteData = (d: SiteData): void => {
  current = d;
};
export const D = (): SiteData => current;

/** A measured image (see scripts/media.ts). */
export interface Img {
  src: string;
  width: number;
  height: number;
  /** Optional 800w variant for small screens. */
  small?: { src: string; width: number; height: number };
}
let media = new Map<string, Img>();
export const setMedia = (m: Map<string, Img>): void => {
  media = m;
};
/** Measured image for a URL (undefined when missing / unmeasurable). */
export const img = (url: string | null | undefined): Img | undefined => (url ? media.get(url) : undefined);

/** Canonical origin (no trailing slash): admin setting → SITE_URL → Vercel domain. */
export const baseUrl = (): string => (current.seo.canonical_base_url.trim() || site.url).replace(/\/+$/, "");
/** Absolute URL for a site path or an already-absolute URL. */
export const abs = (u: string): string => (/^https?:\/\//.test(u) ? u : baseUrl() + (u.startsWith("/") ? u : `/${u}`));

export const availabilityText = (): string => AVAILABILITY_TEXT[current.contact.availability] ?? "";

export const socialLinks = (): SocialLink[] =>
  [
    { label: "Instagram", href: current.contact.instagram },
    { label: "LinkedIn", href: current.contact.linkedin },
    { label: "GitHub", href: current.contact.github },
  ].filter((s) => /^https?:\/\//.test(s.href || ""));

const byOrder = <T extends { display_order: number }>(a: T, b: T) => a.display_order - b.display_order;

/** Published projects (websites + apps), in admin order. */
export const allProjects = (): ProjectRec[] => current.projects.filter((p) => p.status === "published").sort(byOrder);
/** Websites shown in the home reel: featured first; all published when none are featured. */
export const reelProjects = (): ProjectRec[] => {
  const web = allProjects().filter((p) => !isApp(p));
  const featured = web.filter((p) => p.featured);
  return featured.length ? featured : web;
};
export const apps = (): ProjectRec[] => allProjects().filter(isApp);
export const services = () => current.services.filter((s) => s.published).sort(byOrder);
export const processSteps = () => current.process.filter((s) => s.published).sort(byOrder);
export const toolkit = () => current.tech.filter((t) => t.in_toolkit).sort(byOrder);

/** Project page path. */
export const projectPath = (p: Pick<ProjectRec, "slug">): string => `/projects/${p.slug}/`;
export const servicePath = (s: { slug: string }): string => `/services/${s.slug}/`;
