import { waLink } from "../data/model.js";
import { OG_IMAGE } from "../data/seed.js";
import { site } from "../data/site.js";
import { abs, D, img } from "../data/store.js";
import { esc, EXT, html, safeUrl } from "../lib/html.js";
import { footer } from "./footer.js";
import { cursor, menu, navbar, preloader } from "./nav.js";
import { whatsappIcon } from "./symbols.js";

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
  /** Full document title. */
  title: string;
  description: string;
  /** Path beginning with "/", e.g. "/" or "/privacy/". */
  path: string;
  body: string;
  assets: Assets;
  /** Text shown in the nav's chapter slot at load, e.g. "/ 01 Home". */
  chapter: string;
  jsonLd?: object[];
  noindex?: boolean;
  /** Play the preloader → hero intro (home page only). */
  intro?: boolean;
  /** Absolute canonical URL override (per-project setting). */
  canonical?: string | null;
  /** Social image (site path or absolute URL). */
  image?: string | null;
  imageAlt?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "article";
  /** Floating WhatsApp button message; `false` hides the button. */
  wa?: string | false;
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

const iconType = (u: string) => (/\.svg(\?|$)/i.test(u) ? "image/svg+xml" : /\.png(\?|$)/i.test(u) ? "image/png" : /\.ico(\?|$)/i.test(u) ? "image/x-icon" : "");

/** Floating WhatsApp button (hidden by client/whatsapp.ts while the contact form is on screen). */
const waFloat = (message: string) => {
  const n = D().contact.whatsapp;
  if (!n) return "";
  return html`<a class="wa-float" href="${esc(waLink(n, message))}" ${EXT} data-wa-float data-cursor="go" aria-label="Chat with Rudra InfoTech Lab on WhatsApp (opens WhatsApp)">
  ${whatsappIcon("wa-float__i")}<span class="wa-float__t mono" aria-hidden="true">Chat</span>
</a>`;
};

export const layout = (o: PageOptions): string => {
  const { seo, contact } = D();
  const home = o.path === "/";
  const canonical = safeUrl(o.canonical) || abs(o.path);
  const imgPath = safeUrl(o.image) || safeUrl(seo.og_image) || OG_IMAGE;
  const og = abs(imgPath);
  const tw = abs(safeUrl(o.image) || safeUrl(seo.twitter_image) || imgPath);
  const m = img(imgPath);
  const [ow, oh] = m ? [m.width, m.height] : imgPath === OG_IMAGE ? [1200, 630] : [0, 0];
  const ogTitle = o.ogTitle ?? o.title;
  const ogDesc = o.ogDescription ?? o.description;
  const index = seo.robots_index && !o.noindex;
  const favicon = safeUrl(seo.favicon);
  const appIcon = safeUrl(seo.app_icon);
  return html`<!doctype html>
<html lang="${site.lang}" class="no-js"${o.intro ? " data-intro" : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
${index ? `<link rel="canonical" href="${esc(canonical)}">\n<meta name="robots" content="index, follow, max-image-preview:large">` : `<meta name="robots" content="noindex, ${o.noindex ? "follow" : "nofollow"}">`}
<meta name="theme-color" content="${site.themeColor}">
<meta name="author" content="${esc(site.name)}">

<meta property="og:type" content="${o.ogType ?? "website"}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${site.locale}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(ogDesc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(og)}">
${og.startsWith("https://") ? `<meta property="og:image:secure_url" content="${esc(og)}">` : ""}
${ow ? `<meta property="og:image:width" content="${ow}">\n<meta property="og:image:height" content="${oh}">` : ""}
<meta property="og:image:alt" content="${esc(o.imageAlt ?? `${site.name} — ${site.tagline}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(ogDesc)}">
<meta name="twitter:image" content="${esc(tw)}">
<meta name="twitter:image:alt" content="${esc(o.imageAlt ?? `${site.name} — ${site.tagline}`)}">

${favicon
  ? `<link rel="icon" href="${esc(favicon)}"${iconType(favicon) ? ` type="${iconType(favicon)}"` : ""}>`
  : `<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">`}
<link rel="apple-touch-icon" href="${esc(appIcon || "/apple-touch-icon.png")}">
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
${navbar(o.chapter, o.path)}
${menu(home, o.path)}
<main id="main" tabindex="-1">
${o.body}
</main>
${footer(home)}
${o.wa === false ? "" : waFloat(o.wa || contact.whatsapp_message)}
${cursor()}
<div class="grain" aria-hidden="true"></div>
${o.assets.vendor.map((s) => `<script defer src="${s}"></script>`)}
<script type="module" src="${o.assets.entry}"></script>
</body>
</html>
`;
};
