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

/**
 * Splits a string into masked words for the reveal animation.
 * Wrap words in *asterisks* to render them as the serif italic accent.
 */
export const splitWords = (text: string, cls = "w", offset = 0): string => {
  let open = false;
  return text
    .split(" ")
    .map((raw, i) => {
      const starts = raw.startsWith("*");
      if (starts) open = true;
      const isAccent = open;
      if (raw.replace(/^\*/, "").includes("*")) open = false;
      const word = raw.replace(/\*/g, "");
      const inner = isAccent ? `<em>${esc(word)}</em>` : esc(word);
      return `<span class="${cls}"><span style="--i:${i + offset}">${inner}</span></span>`;
    })
    .join(" ");
};

/** Renders *accent* markers as <em> without splitting. */
export const accent = (text: string): string => esc(text).replace(/\*(.+?)\*/g, "<em>$1</em>");

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
