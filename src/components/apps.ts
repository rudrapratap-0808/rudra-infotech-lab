import { PLATFORM_TEXT, type ProjectRec } from "../data/model.js";
import { chapters } from "../data/site.js";
import { apps, D, img, projectPath } from "../data/store.js";
import { esc, EXT, html, safeUrl } from "../lib/html.js";
import { playBadge } from "./symbols.js";
import { chapterAttr, cta, label } from "./ui.js";
import { accentOf, fgOn, picture, splitName, typeLabel } from "./work.js";

interface Screen {
  html: string;
  label: string;
}

/** Brand splash: the app icon + name on the project's accent. */
const splash = (p: ProjectRec): string => {
  const logo = img(p.project_logo);
  const bg = "#0c0c0c";
  return html`<span class="splash" style="--sbg:${bg};--sfg:${fgOn(bg)};--accent:${esc(accentOf(p))}">
    ${logo ? html`<img class="splash__logo" src="${esc(logo.src)}" width="${logo.width}" height="${logo.height}" alt="" loading="lazy" decoding="async">` : ""}
    <span class="splash__name display">${esc(splitName(p.name).base)}</span>
    <span class="splash__os mono">${esc(PLATFORM_TEXT[p.platform])} / ${p.play_store_url ? "Google Play" : "App"}</span>
  </span>`;
};

/**
 * Up to three phone screens. Real screenshots win (the first one takes the centre);
 * otherwise the brand splash sits in the centre, flanked by brand imagery — each
 * labelled for what it is, never passed off as a screenshot.
 */
export const phoneScreens = (p: ProjectRec): Screen[] => {
  const seen = new Set<string>();
  const shot = (url: string | null | undefined, lbl: string, alt: string): Screen | null => {
    const m = img(url);
    if (!m || seen.has(m.src)) return null;
    seen.add(m.src);
    return { html: picture(m, alt, "(min-width: 1025px) 22vw, 60vw"), label: lbl };
  };
  const S = [
    shot(p.mobile_screenshot, "Screenshot", `Screenshot of the ${p.name} app`),
    ...p.images.filter((i) => i.kind === "screenshot" || i.kind === "mobile_mockup").map((i) => shot(i.url, "Screenshot", i.alt || `Screenshot of the ${p.name} app`)),
  ].filter(Boolean) as Screen[];
  const B = p.images.filter((i) => i.kind === "gallery").map((i) => shot(i.url, "Brand image", i.alt || `${p.name} brand image`)).filter(Boolean) as Screen[];
  const SPLASH: Screen = { html: splash(p), label: img(p.project_logo) ? "App icon" : "Cover" };
  const center = S[0] ?? SPLASH;
  const rest = [...S.slice(1), ...(S.length ? [SPLASH] : []), ...B];
  return [rest[0], center, rest[1]].filter(Boolean) as Screen[];
};

export const phone = (s: Screen, i: number, cls = "") => html`<span class="phone ${cls}" style="--pi:${i}" data-phone>
  <span class="phone__body">
    <span class="phone__screen">${s.html}</span>
    <span class="phone__cam" aria-hidden="true"></span>
  </span>
  <span class="phone__lbl mono">${esc(s.label)} / 9:19.5</span>
</span>`;

export const phones = (p: ProjectRec, cls = "") => {
  const screens = phoneScreens(p);
  return html`<span class="phones ${cls}" data-count="${screens.length}" aria-hidden="true" data-app-phones>${screens.map((s, i) => phone(s, i))}</span>`;
};

/** "GET IT ON Google Play" link. */
export const playLink = (p: ProjectRec, cls = "") => {
  const url = safeUrl(p.play_store_url);
  if (!url) return "";
  return html`<a class="play ${cls}" href="${esc(url)}" ${EXT} data-cursor="visit">${playBadge()}<span class="sr-only">Download ${esc(p.name)} on Google Play (opens in a new tab)</span></a>`;
};

/** One app, editorial block (home chapter + /apps/). */
export const appBlock = (p: ProjectRec, level: "h2" | "h3" = "h3") => {
  const logo = img(p.project_logo);
  const live = !!(p.play_store_url || p.app_url);
  const rows: [string, string][] = [
    ["Platform", PLATFORM_TEXT[p.platform]],
    ["Status", live ? "Live" : "In development"],
    ...(p.play_store_url ? ([["Store", "Google Play"]] as [string, string][]) : []),
    ["Category", typeLabel(p)],
  ];
  return html`<article class="app" style="--accent:${esc(accentOf(p))}" aria-labelledby="app-${esc(p.slug)}">
  ${phones(p, "app__phones")}
  <div class="app__info">
    <p class="app__brand mono">
      ${logo ? html`<img class="app__icon" src="${esc(logo.src)}" width="${logo.width}" height="${logo.height}" alt="${esc(p.name)} app icon" loading="lazy" decoding="async">` : ""}
      <span>${esc(PLATFORM_TEXT[p.platform])} app</span>${live ? html`<span class="app__live"><i aria-hidden="true"></i>Live</span>` : ""}
    </p>
    <${level} class="app__name display" id="app-${esc(p.slug)}">${esc(p.name)}</${level}>
    <dl class="app__spec mono">${rows.map(([k, v]) => html`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)}</dl>
    <p class="app__desc">${esc(p.short_description)}</p>
    ${p.play_store_url ? html`<p class="app__avail mono">Available on Google Play</p>` : ""}
    <div class="app__ctas">
      ${cta("View app", projectPath(p), "ink", "e")}
      ${playLink(p)}
    </div>
  </div>
</article>`;
};

/* ── 03 APPS — PAPER · APP / ANDROID ──────────────────────── */
export const appsSection = () => {
  const list = apps();
  if (!list.length) return "";
  const platforms = [...new Set(list.map((p) => PLATFORM_TEXT[p.platform]))];
  return html`<section class="apps" id="apps" data-theme="paper" ${chapterAttr("apps")} aria-labelledby="apps-title">
  <header class="apps__head grid">
    ${label(chapters.apps.n, "Mobile apps", "apps__label")}
    <p class="apps__meta mono" aria-hidden="true"><span>Platform / ${esc(platforms.join(" + "))}</span><span>Status / Live</span></p>
    <h2 class="apps__title" id="apps-title"><span class="sr-only">Mobile apps</span>
      <span class="apps__w apps__w--app display" aria-hidden="true" data-apps-w>App</span>
      <span class="apps__w apps__w--os display" aria-hidden="true" data-apps-w>${esc(platforms[0] ?? "Android")}</span>
    </h2>
    <p class="apps__text">${esc(D().content.apps.description)}</p>
  </header>
  <div class="apps__list">${list.map((p) => appBlock(p))}</div>
</section>`;
};
