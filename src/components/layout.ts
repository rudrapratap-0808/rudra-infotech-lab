import { site } from "../data/site.js";
import { esc, html } from "../lib/html.js";
import { cursor, menu, navbar } from "./nav.js";
import { footer } from "./footer.js";

export interface PageOptions {
  /** Full <title>. */
  title: string;
  description: string;
  /** Path beginning with "/", e.g. "/" or "/privacy/". */
  path: string;
  body: string;
  css: string;
  jsonLd?: object[];
  noindex?: boolean;
  /** Absolute URLs of module entry scripts. */
  scripts: string[];
  /** Absolute URLs of modules to preload (static imports of the entry). */
  modulePreload?: string[];
}

const FONTS =
  "https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap";

/** Runs before first paint: flags JS + reduced motion so CSS can gate animations. */
const BOOT = `(function(d){var h=d.documentElement;h.classList.remove('no-js');h.classList.add('js');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)h.classList.add('rm')}catch(e){}})(document)`;

export const layout = (o: PageOptions): string => {
  const url = site.url + o.path;
  const og = site.url + "/og.png";
  return html`<!doctype html>
<html lang="${site.lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
${o.noindex ? `<meta name="robots" content="noindex, follow">` : `<link rel="canonical" href="${esc(url)}">\n<meta name="robots" content="index, follow, max-image-preview:large">`}
<meta name="theme-color" content="${site.themeColor}">
<meta name="color-scheme" content="dark">
<meta name="author" content="${esc(site.name)}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${site.locale}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(site.name)} — ${esc(site.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${esc(og)}">

<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${FONTS}"></noscript>
${(o.modulePreload ?? []).map((m) => `<link rel="modulepreload" href="${m}">`)}

<script>${BOOT}</script>
<style>${o.css}</style>
${(o.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`)}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"></div>
${navbar()}
${menu()}
<main id="main" tabindex="-1">
${o.body}
</main>
${footer()}
${cursor()}
<div class="grain" aria-hidden="true"></div>
${o.scripts.map((s) => `<script type="module" src="${s}"></script>`)}
</body>
</html>
`;
};
