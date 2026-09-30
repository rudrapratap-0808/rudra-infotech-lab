/**
 * Tiny server-side templating helpers.
 * `html` concatenates template parts (flattening arrays, dropping null/false).
 * Anything coming from content/data must be passed through `esc()`.
 */
export type Chunk = string | number | null | undefined | false | Chunk[];

const flatten = (v: Chunk): string => {
  if (v === null || v === undefined || v === false) return "";
  if (Array.isArray(v)) return v.map(flatten).join("");
  return String(v);
};

export const html = (strings: TemplateStringsArray, ...values: Chunk[]): string =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? flatten(values[i]) : ""), "");

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v: string | number): string => String(v).replace(/[&<>"']/g, (c) => ESC[c]);

/** Attribute helper: attrs({ href: "/", hidden: true, rel: undefined }) */
export const attrs = (o: Record<string, string | number | boolean | undefined | null>): string =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v as string)}"`))
    .join(" ");

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Visually hidden text for screen readers. */
export const sr = (text: string): string => `<span class="sr-only">${esc(text)}</span>`;

/**
 * One span per character (for letter-level motion). Spaces become fixed-width gaps.
 * Always use inside an aria-hidden wrapper next to an `sr()` copy of the text.
 */
export const chars = (text: string, cls = "ch"): string =>
  [...text]
    .map((c, i) =>
      c === " "
        ? `<span class="${cls} ${cls}--sp" style="--i:${i}"> </span>`
        : `<span class="${cls}" style="--i:${i}">${esc(c)}</span>`
    )
    .join("");

/** A masked line: outer clips, inner moves. */
export const line = (inner: string, cls = "ln"): string =>
  `<span class="${cls}"><span class="${cls}__i">${inner}</span></span>`;

/** Zero-padded index: 1 → "01". */
export const nn = (n: number): string => String(n).padStart(2, "0");

/** Only http(s), protocol-relative-free site paths, mailto: and tel: survive — never javascript: etc. */
export const safeUrl = (u: string | null | undefined): string => {
  const v = (u || "").trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(v)) return v;
  if (/^\/(?!\/)[^\s"'<>]*$/.test(v)) return v;
  if (/^(mailto|tel):[^\s"'<>]+$/i.test(v)) return v;
  return "";
};

/** Attributes for links that leave the site. */
export const EXT = 'target="_blank" rel="noopener noreferrer"';
