import { site, type ChapterKey } from "../data/site.js";
import { esc, html } from "../lib/html.js";
import { footer } from "./footer.js";
import { cursor, menu, navbar, preloader } from "./nav.js";

export interface Assets {
  css: string;
  /** Classic (defer) vendor scripts — GSAP + ScrollTrigger. */
  vendor: string[];
  /** ES module entry. */
  entry: string;
  /** Static import graph of the entry (modulepreload). */
  preload: string[];
}

export interface PageOptions {
  title: string;
  description: string;
  /** Path beginning with "/", e.g. "/" or "/privacy/". */
  path: string;
  body: string;
  assets: Assets;
  chapter: ChapterKey;
  jsonLd?: object[];
  noindex?: boolean;
  /** Play the preloader → hero intro (home page only). */
  intro?: boolean;
}

/** Fonts needed for the first screen (the rest load on demand via @font-face). */
const PRELOAD_FONTS = [
  "archivo-black-latin-400.woff2",
  "inter-tight-latin-wght.woff2",
  "ibm-plex-mono-latin-400.woff2",
  "instrument-serif-latin-400-italic.woff2",
];

/**
 * Runs before first paint: flags JS, reduced motion and (home only) the intro.
 * Failsafe: if the app hasn't booted after 6.5 s, the intro state is dropped.
 */
const BOOT = `(function(d,w){var h=d.documentElement,c=h.classList;c.remove('no-js');c.add('js');var rm=false;try{rm=w.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}if(rm)c.add('rm');if(h.hasAttribute('data-intro')&&!rm&&(!location.hash||location.hash==='#top')){c.add('intro');try{history.scrollRestoration='manual'}catch(e){}w.scrollTo(0,0);setTimeout(function(){if(!w.__ritl)c.remove('intro')},6500)}})(document,window)`;

export const layout = (o: PageOptions): string => {
  const url = site.url + o.path;
  const og = site.url + "/og.png";
  return html`<!doctype html>
<html lang="${site.lang}" class="no-js"${o.intro ? " data-intro" : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
${o.noindex ? `<meta name="robots" content="noindex, follow">` : `<link rel="canonical" href="${esc(url)}">\n<meta name="robots" content="index, follow, max-image-preview:large">`}
<meta name="theme-color" content="${site.themeColor}">
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
${PRELOAD_FONTS.map((f) => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`)}
${o.assets.preload.map((m) => `<link rel="modulepreload" href="${m}">`)}

<script>${BOOT}</script>
<style>${o.assets.css}</style>
${(o.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`)}
</head>
<body>
<a class="skip mono" href="#main">Skip to content</a>
${o.intro ? preloader() : ""}
${navbar(o.chapter)}
${menu()}
<main id="main" tabindex="-1">
${o.body}
</main>
${footer()}
${cursor()}
<div class="grain" aria-hidden="true"></div>
${o.assets.vendor.map((s) => `<script defer src="${s}"></script>`)}
<script type="module" src="${o.assets.entry}"></script>
</body>
</html>
`;
};
