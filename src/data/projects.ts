/**
 * ─────────────────────────────────────────────────────────────
 *  SELECTED WORK
 *
 *  NOTE: These sites could not be reached from the build environment,
 *  so no details were verified. Descriptions are intentionally factual
 *  and minimal — replace `summary` and add `tags` with real details.
 *
 *  Screenshots: run `npm run screenshots` on a machine with internet
 *  access (captures public/work/<slug>.jpg with headless Chrome), or drop
 *  your own image at public/work/<slug>.(webp|jpg|png). The build picks
 *  it up automatically; otherwise a generated browser-frame preview is shown.
 * ─────────────────────────────────────────────────────────────
 */

export interface Project {
  slug: string;
  name: string;
  url: string;
  summary: string;
  /** Verified technology/category tags only. Empty = hidden. */
  tags: string[];
  /** Hue (0-360) for the generated preview artwork. */
  hue: number;
  /** Layout variant for the generated preview artwork (purely decorative). */
  variant: 1 | 2 | 3 | 4 | 5;
}

export const projects: Project[] = [
  {
    slug: "dotaanke-store",
    name: "Dotaanke.store",
    url: "https://dotaanke.store",
    summary: "A live website designed and built by the lab. Visit the site to see it in action.",
    tags: [],
    hue: 22,
    variant: 1,
  },
  {
    slug: "rojgarlelo-site",
    name: "RojgarLelo.site",
    url: "https://rojgarlelo.site",
    summary: "A live website designed and built by the lab. Visit the site to see it in action.",
    tags: [],
    hue: 158,
    variant: 2,
  },
  {
    slug: "mightymindz-in",
    name: "MightyMindz.in",
    url: "https://mightymindz.in",
    summary: "A live website designed and built by the lab. Visit the site to see it in action.",
    tags: [],
    hue: 262,
    variant: 3,
  },
  {
    slug: "sarkar2-0-pw",
    name: "Sarkar2-0.pw",
    url: "https://sarkar2-0.pw",
    summary: "A live website designed and built by the lab. Visit the site to see it in action.",
    tags: [],
    hue: 4,
    variant: 4,
  },
  {
    slug: "rahulconstructionwork-site",
    name: "RahulConstructionWork.site",
    url: "https://rahulconstructionwork.site",
    summary: "A live website designed and built by the lab. Visit the site to see it in action.",
    tags: [],
    hue: 42,
    variant: 5,
  },
];

export const hostOf = (url: string): string => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
