/**
 * The content model shared by the public build, the Supabase loader, the SQL seed and the admin.
 * Field names match the database columns (snake_case) so rows map 1:1.
 */

export type Platform = "web" | "android" | "ios" | "cross-platform";
export type PublishStatus = "draft" | "published" | "archived";
export type ImageKind = "gallery" | "screenshot" | "desktop_mockup" | "mobile_mockup";

export const PROJECT_TYPES = [
  "BUSINESS WEBSITE",
  "E-COMMERCE",
  "LANDING PAGE",
  "PORTFOLIO",
  "WEB APPLICATION",
  "WEBSITE REDESIGN",
  "ANDROID APPLICATION",
  "CUSTOM DEVELOPMENT",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PLATFORM_TEXT: Record<Platform, string> = {
  web: "Web",
  android: "Android",
  ios: "iOS",
  "cross-platform": "Cross-platform",
};

export interface ProjectImage {
  url: string;
  kind: ImageKind;
  alt?: string | null;
  display_order: number;
}

export interface ProjectRec {
  id?: string;
  slug: string;
  name: string;
  short_description: string;
  /** Paragraphs separated by a blank line. */
  full_description?: string | null;
  project_type?: ProjectType | null;
  /** Category name (resolved from project_categories). */
  category?: string | null;
  platform: Platform;
  client_name?: string | null;
  live_url?: string | null;
  app_url?: string | null;
  play_store_url?: string | null;
  github_url?: string | null;
  completion_year?: number | null;
  project_logo?: string | null;
  featured_image?: string | null;
  desktop_screenshot?: string | null;
  mobile_screenshot?: string | null;
  /** Accent derived from the project's own brand (used on INK). */
  accent?: string | null;
  /** The project's own headline, quoted in case-study frames. */
  headline?: string | null;
  image_alt?: string | null;
  /** Schema.org applicationCategory — only when actually known. */
  app_category?: string | null;
  status: PublishStatus;
  featured: boolean;
  display_order: number;
  seo_title?: string | null;
  seo_description?: string | null;
  social_image?: string | null;
  canonical_url?: string | null;
  updated_at?: string | null;
  /** Technology names, in display order. */
  technologies: string[];
  images: ProjectImage[];
}

export interface ServiceRec {
  id?: string;
  slug: string;
  title: string;
  /** Two-line display split for the giant index, e.g. "Website|Design". */
  display: string;
  short_description: string;
  full_description: string;
  points: string[];
  /** Symbol id (see components/symbols.ts). */
  symbol: string;
  display_order: number;
  published: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
}

export interface ProcessRec {
  id?: string;
  name: string;
  description: string;
  display_order: number;
  published: boolean;
}

export interface TechRec {
  id?: string;
  name: string;
  /** Plain description of what it is ("UI library"). */
  kind: string;
  category: string;
  official_url?: string | null;
  display_order: number;
  in_toolkit: boolean;
}

export interface FormSettings {
  services: string[];
  budgets: string[];
}

export type Availability = "available" | "limited" | "closed";
export const AVAILABILITY_TEXT: Record<Availability, string> = {
  available: "Available for projects",
  limited: "Limited availability",
  closed: "Not accepting projects",
};

export interface ContactSettings {
  email: string;
  phone: string;
  /** Digits only, with country code. */
  whatsapp: string;
  whatsapp_message: string;
  instagram: string;
  linkedin: string;
  github: string;
  location: string;
  availability: Availability;
  /** Used to normalise local phone numbers submitted without a country code. */
  default_country_code: string;
}

export interface SeoSettings {
  site_title: string;
  meta_description: string;
  /** Empty = the deployment's production URL. */
  canonical_base_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  twitter_image: string;
  favicon: string;
  app_icon: string;
  robots_index: boolean;
}

export interface Content {
  hero: { meta_1: string; meta_2: string; serif: string; heading: string; description: string; primary_cta: string; secondary_cta: string };
  philosophy: { lead: string; statement_1: string; statement_2: string; description: string; design: string; develop: string; perform: string; convert: string };
  work: { description: string };
  apps: { description: string };
  services: { heading: string; highlight: string; description: string };
  about: { statement_1: string; statement_2: string; paragraphs: string; what_we_do: string; who_its_for: string; how_we_work: string };
  contact: { heading_1: string; heading_2: string; serif: string; description: string; button: string; whatsapp_cta: string; success_title: string; success_text: string };
  footer: { statement: string; tagline: string };
}
export type ContentKey = keyof Content;

export interface SiteData {
  source: "supabase" | "seed";
  projects: ProjectRec[];
  services: ServiceRec[];
  process: ProcessRec[];
  tech: TechRec[];
  categories: string[];
  form: FormSettings;
  contact: ContactSettings;
  seo: SeoSettings;
  content: Content;
}

/* ── Helpers shared by the site, the API and the admin ───────── */

/** wa.me link with a pre-filled message. */
export const waLink = (number: string, message: string): string =>
  `https://wa.me/${number.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

/** "+351 930 656 040" style display for a digits-only number. */
export const prettyPhone = (digits: string): string => {
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("351") && d.length === 12) return `+351 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  if (d.startsWith("91") && d.length === 12) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return d ? `+${d}` : "";
};

/**
 * Normalise a phone number typed by a visitor into WhatsApp digits (E.164 without "+").
 * Numbers without a country code get `defaultCc`. Returns "" when it can't be a real number.
 */
export const normalizePhone = (raw: string, defaultCc = ""): string => {
  const s = (raw || "").trim();
  if (!s) return "";
  let d = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    /* already international */
  } else if (d.startsWith("00")) d = d.slice(2);
  else if (defaultCc && d.length === 10) d = defaultCc + d;
  else if (defaultCc && d.length === 11 && d.startsWith("0")) d = defaultCc + d.slice(1);
  return d.length >= 8 && d.length <= 15 ? d : "";
};

export const hostOf = (url: string): string => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const isApp = (p: Pick<ProjectRec, "platform">): boolean => p.platform !== "web";

/** Paragraphs from a textarea value (blank-line separated). */
export const paragraphs = (text: string | null | undefined): string[] =>
  (text || "").split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
