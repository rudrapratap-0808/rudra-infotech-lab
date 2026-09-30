/**
 * ─────────────────────────────────────────────────────────────
 *  SELECTED WORK
 *
 *  Facts below were verified from each project's own source repository
 *  (page titles, meta descriptions, routes and package.json). MightyMindz.in
 *  has no repository available, so its entry stays deliberately neutral.
 *
 *  Imagery priority (picked up automatically by the build):
 *    1. public/work/<slug>.(webp|jpg|png)       real screenshot → "LIVE BUILD 1440 × 900"
 *                                                (run `npm run screenshots` with internet access)
 *    2. public/work/<slug>-hero.webp (+ -800w)   the site's own hero imagery → "HERO IMAGE"
 *    3. nothing                                  typographic cover built from `cover`
 * ─────────────────────────────────────────────────────────────
 */

export interface Project {
  slug: string;
  name: string;
  url: string;
  /** Category label (top-left metadata). */
  category: string;
  summary: string;
  /** Verified technology/feature tags only. Empty = hidden. */
  tags: string[];
  /** Accent derived from the project's own brand/imagery (used on INK). */
  accent: string;
  /** The site's own headline, quoted in the case-study frame (optional). */
  headline?: string;
  /** Alt text for hero imagery (when `<slug>-hero.webp` exists). */
  imageAlt?: string;
  /** Typographic cover used when no imagery exists. */
  cover?: { bg: string; fg: string };
}

export const projects: Project[] = [
  {
    slug: "dotaanke-store",
    name: "Dotaanke.store",
    url: "https://dotaanke.store",
    category: "E-commerce",
    summary:
      "An online store for hand-embroidered Indian shirts and kurtis — shop, product pages, wishlist, checkout and order tracking.",
    tags: ["React", "TanStack Start", "Tailwind CSS", "Supabase", "Razorpay"],
    accent: "#e56d7a", // lifted from the brand maroon #6A1E2E
    headline: "Every stitch tells a story.",
    imageAlt: "Gold hand embroidery on ivory fabric — hero image from the Dotaanke.store homepage",
  },
  {
    slug: "rojgarlelo-site",
    name: "RojgarLelo.site",
    url: "https://rojgarlelo.site",
    category: "Job portal",
    summary:
      "Recruitment listings for job seekers across India — searchable openings, detailed job pages and an admin area for publishing new roles.",
    tags: ["React", "TanStack Start", "Tailwind CSS", "Supabase"],
    accent: "#1779e1", // the site's primary blue
    headline: "Find a job that fits your life",
    cover: { bg: "#0055ae", fg: "#ffffff" },
  },
  {
    slug: "mightymindz-in",
    name: "MightyMindz.in",
    url: "https://mightymindz.in",
    category: "Web development",
    summary: "A live website designed and built by the lab. Visit the site to see it in action.",
    tags: [],
    accent: "#dfff36", // no verified brand colour — uses the Rudra system accent
    cover: { bg: "#dfff36", fg: "#0c0c0c" },
  },
  {
    slug: "sarkar2-0-pw",
    name: "Sarkar2-0.pw",
    url: "https://sarkar2-0.pw",
    category: "Services marketplace",
    summary:
      "Connects people across Uttar Pradesh with verified electricians, plumbers, painters and mechanics — plus an electrical & electronics store, in Hindi and English.",
    tags: ["React", "TanStack Start", "Tailwind CSS", "Supabase"],
    accent: "#f52027", // the site's red accent
    headline: "Every mistri, one platform.",
    imageAlt: "Skilled workers in hard hats — hero image from the Sarkar2.0 homepage",
  },
  {
    slug: "rahulconstructionwork-site",
    name: "RahulConstructionWork.site",
    url: "https://rahulconstructionwork.site",
    category: "Business website",
    summary:
      "The website of a Haridwar construction and interiors firm — services, project portfolio, the build process and a quote request form.",
    tags: ["React", "TanStack Start", "Tailwind CSS", "Supabase"],
    accent: "#ddb049", // the site's gold accent
    headline: "Building Dreams, Designing Excellence",
    imageAlt: "A modern villa lit at dusk beside a pool — from the Rahul Construction Works portfolio",
  },
];

export const hostOf = (url: string): string => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
