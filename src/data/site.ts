/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONFIG — edit this file to update brand + contact info.
 *  Anything left as an empty string is hidden from the website.
 * ─────────────────────────────────────────────────────────────
 */

export interface SocialLink {
  label: string;
  href: string; // leave "" to hide
}

export const PLACEHOLDER_URL = "https://www.your-domain.com";

/**
 * Production URL (no trailing slash) — used for canonical URLs, sitemap, Open Graph and schema.
 * Resolution order:
 *   1. SITE_URL env var            e.g. SITE_URL=https://rudrainfotechlab.com
 *   2. Vercel (automatic)          VERCEL_PROJECT_PRODUCTION_URL — your shortest custom
 *                                  production domain, or the *.vercel.app domain
 *   3. Placeholder                 replace before deploying to any other host
 */
const resolveUrl = (): { url: string; source: string } => {
  const explicit = process.env.SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const [raw, source] = explicit
    ? [explicit, "SITE_URL"]
    : vercel
      ? [vercel, "Vercel production domain"]
      : [PLACEHOLDER_URL, "placeholder"];
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
  themeColor: "#07070a",

  tagline: "Websites that make businesses impossible to ignore.",
  description:
    "Rudra InfoTech Lab is a web development agency that designs and builds fast, responsive, business-focused websites — from business sites and landing pages to e-commerce and custom web development.",

  /** Small status pill in the hero. Set to "" to hide. */
  availability: "Taking on new projects",

  contact: {
    /** TODO: add your real details. Empty values are hidden everywhere. */
    email: "",
    phone: "", // e.g. "+91 90000 00000"
    whatsapp: "", // digits only, with country code, e.g. "919000000000"
    location: "", // e.g. "India"
  },

  /**
   * Form handling. Point `endpoint` at any service that accepts a JSON POST
   * (Formspree, Web3Forms, Getform, your own API route…).
   * If empty, the form falls back to WhatsApp → email (mailto) → shows an error.
   */
  form: {
    endpoint: process.env.FORM_ENDPOINT || "",
    /** Extra static fields sent with every submission (e.g. Web3Forms access_key). */
    extra: {} as Record<string, string>,
  },

  social: [
    { label: "Instagram", href: "" },
    { label: "LinkedIn", href: "" },
    { label: "GitHub", href: "" },
    { label: "X / Twitter", href: "" },
  ] as SocialLink[],
};

export const nav = [
  { label: "Home", href: "/#top" },
  { label: "Work", href: "/#work" },
  { label: "Services", href: "/#services" },
  { label: "Process", href: "/#process" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export const socialLinks = (): SocialLink[] => site.social.filter((s) => s.href);
