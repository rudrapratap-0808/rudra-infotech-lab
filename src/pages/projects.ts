import { hostOf, isApp, paragraphs, PLATFORM_TEXT, type ProjectRec } from "../data/model.js";
import { chapters, site } from "../data/site.js";
import { abs, allProjects, D, img, projectPath } from "../data/store.js";
import { chars, esc, EXT, html, nn, safeUrl } from "../lib/html.js";
import { phones, playLink } from "../components/apps.js";
import { arrow } from "../components/symbols.js";
import { chapterRaw, cta, extCta, gridLines, waCta } from "../components/ui.js";
import { accentOf, altFor, cover, frameLabel, frameMedia, nameEm, picture, splitName, typeLabel } from "../components/work.js";
import { itemListLd, pageLd, projectLd } from "./seo.js";

const WORK = `/ ${chapters.work.n} ${chapters.work.label}`;
export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

/** Contact-form service option that best matches a project type. */
const TYPE_TO_SERVICE: Record<string, string> = {
  "BUSINESS WEBSITE": "Web Development",
  "E-COMMERCE": "E-commerce",
  "LANDING PAGE": "Landing Page",
  PORTFOLIO: "Website Design",
  "WEB APPLICATION": "Web Application",
  "WEBSITE REDESIGN": "Website Redesign",
  "ANDROID APPLICATION": "Android Application",
  "CUSTOM DEVELOPMENT": "Custom Development",
};
export const contactFor = (serviceOption: string | undefined): string => {
  const opts = D().form.services;
  return serviceOption && opts.includes(serviceOption) ? `/contact/?service=${encodeURIComponent(serviceOption)}` : "/contact/";
};

const similarMessage = (p: ProjectRec) => `Hi Rudra InfoTech Lab, I saw the ${p.name} project and I’m interested in discussing something similar.`;

/* ── /projects/ ───────────────────────────────────────────── */
export const projectsIndexMeta = () => ({
  title: `Work — Websites & Apps | ${site.name}`,
  description: clip(`Selected websites and Android apps designed and built by ${site.name}: ${allProjects().map((p) => p.name).join(", ")}.`, 160),
});

const thumb = (p: ProjectRec) => {
  const fm = frameMedia(p);
  if (fm) return picture(fm.m, altFor(p, fm), "(min-width: 1025px) 24vw, 40vw");
  const shot = img(p.mobile_screenshot) ?? img(p.images[0]?.url);
  return shot ? picture(shot, p.image_alt ?? p.name, "(min-width: 1025px) 24vw, 40vw") : cover(p);
};

export const projectsIndex = () => {
  const list = allProjects();
  const types = [...new Set(list.map((p) => p.project_type).filter(Boolean))] as string[];
  const web = list.filter((p) => !isApp(p)).length;
  return html`<section class="pi" id="top" data-theme="paper" ${chapterRaw(WORK)} aria-labelledby="pi-title">
  ${gridLines("gridlines pi__grid")}
  <p class="pi__meta mono"><span>${esc(WORK)}</span><span>Index / ${nn(list.length)} projects</span><span>Websites ${nn(web)} · Apps ${nn(list.length - web)}</span></p>
  <h1 class="pi__title" id="pi-title"><span class="sr-only">Work — all projects</span><span class="pi__word display" aria-hidden="true">${chars("WORK")}</span></h1>
  <div class="pi__row">
    <p class="pi__text">${esc(D().content.work.description)}</p>
    <p class="pi__count display" aria-hidden="true">${nn(list.length)}</p>
  </div>
</section>
<section class="plist" data-theme="paper" ${chapterRaw(WORK)} aria-label="All projects">
  ${types.length > 1
    ? html`<div class="plist__filters mono" role="group" aria-label="Filter projects by type" data-filters hidden>
    <button type="button" class="chip" aria-pressed="true" data-filter="">All <span>${nn(list.length)}</span></button>
    ${types.map((t) => html`<button type="button" class="chip" aria-pressed="false" data-filter="${esc(t)}">${esc(t)} <span>${nn(list.filter((p) => p.project_type === t).length)}</span></button>`)}
  </div>`
    : ""}
  ${list.length
    ? html`<ol class="plist__list" role="list" data-filter-list>
    ${list.map(
      (p, i) => html`<li class="pr" data-type="${esc(p.project_type ?? "")}" style="--accent:${esc(accentOf(p))};--nw:${nameEm(p.name)}">
      <a class="pr__link" href="${projectPath(p)}" data-cursor="view">
        <span class="pr__n mono">${nn(i + 1)}</span>
        <span class="pr__name">${esc(p.name)}</span>
        <span class="pr__meta mono"><span>${esc(p.project_type ?? typeLabel(p))}</span><span>${esc(PLATFORM_TEXT[p.platform])}</span>${p.completion_year ? html`<span>${p.completion_year}</span>` : ""}</span>
        <span class="pr__desc">${esc(p.short_description)}</span>
        <span class="pr__thumb" aria-hidden="true">${thumb(p)}</span>
        ${arrow("e", "pr__a")}
      </a>
    </li>`
    )}
  </ol>`
    : html`<p class="plist__empty">New projects are on the way — check back soon.</p>`}
</section>
${ctaBand("Have a project like these?", "Let's talk.", "Hi Rudra InfoTech Lab, I’m interested in discussing a website/app project.", "/contact/")}`;
};

export const projectsIndexLd = () => {
  const m = projectsIndexMeta();
  const list = allProjects();
  return [
    ...pageLd({ path: "/projects/", title: m.title, description: m.description, type: "CollectionPage", breadcrumb: [["Home", "/"], ["Work", "/projects/"]] }),
    itemListLd("Work", list.map((p) => ({ url: abs(projectPath(p)), name: p.name }))),
  ];
};

/* ── Orange closing band (shared) ─────────────────────────── */
export const ctaBand = (title: string, serif: string, waMessage: string, contactHref: string, waText = "Chat on WhatsApp") => html`<section class="band" data-theme="orange" ${chapterRaw(`/ ${chapters.contact.n} ${chapters.contact.label}`)} aria-label="${esc(title)}">
  <p class="band__title display">${esc(title)}</p>
  <p class="band__serif serif"><em class="serif">${esc(serif)}</em></p>
  <div class="band__ctas">
    ${cta("Start a project", contactHref, "ink", "ne")}
    ${waCta(waText, waMessage, "line")}
  </div>
</section>`;

/* ── /projects/<slug>/ ────────────────────────────────────── */
export const projectMeta = (p: ProjectRec) => ({
  title: p.seo_title || `${p.name} — ${isApp(p) ? `${PLATFORM_TEXT[p.platform]} app` : typeLabel(p)} | ${site.name}`,
  description: p.seo_description || clip(p.short_description, 160),
  image: safeUrl(p.social_image) || safeUrl(p.featured_image) || safeUrl(p.desktop_screenshot) || null,
  canonical: safeUrl(p.canonical_url) || null,
});

export const projectLdAll = (p: ProjectRec) => {
  const m = projectMeta(p);
  return [
    ...pageLd({ path: projectPath(p), title: m.title, description: m.description, image: m.image, breadcrumb: [["Home", "/"], ["Work", "/projects/"], [p.name, projectPath(p)]] }),
    projectLd(p),
  ];
};

const specRows = (p: ProjectRec): [string, string, string?][] => {
  const live = safeUrl(p.live_url);
  const app = safeUrl(p.app_url);
  const gh = safeUrl(p.github_url);
  const rows: [string, string, string?][] = [];
  if (p.project_type) rows.push(["Type", p.project_type]);
  if (p.category) rows.push(["Category", p.category]);
  rows.push(["Platform", PLATFORM_TEXT[p.platform]]);
  if (p.client_name) rows.push(["Client", p.client_name]);
  if (p.completion_year) rows.push(["Year", String(p.completion_year)]);
  if (p.technologies.length) rows.push(["Built with", p.technologies.join(" · ")]);
  if (live) rows.push(["Live site", hostOf(live), live]);
  if (app) rows.push(["Web app", hostOf(app), app]);
  if (p.play_store_url) rows.push(["Store", "Google Play", safeUrl(p.play_store_url)]);
  if (gh) rows.push(["Source", hostOf(gh), gh]);
  return rows;
};

const gallery = (p: ProjectRec) => {
  const used = new Set([p.featured_image, p.desktop_screenshot, p.mobile_screenshot].filter(Boolean));
  const shots = [
    ...(isApp(p) ? [] : [p.mobile_screenshot && { url: p.mobile_screenshot, alt: `Mobile screenshot of ${p.name}`, kind: "mobile" }]),
    ...p.images.filter((i) => !used.has(i.url) && (!isApp(p) || i.kind !== "gallery")).map((i) => ({ url: i.url, alt: i.alt || p.name, kind: i.kind })),
  ].filter(Boolean) as { url: string; alt: string; kind: string }[];
  const items = shots.map((s) => ({ ...s, m: img(s.url) })).filter((s) => s.m);
  if (!items.length) return "";
  const LBL: Record<string, string> = { gallery: "Image", screenshot: "Screenshot", desktop_mockup: "Desktop mockup", mobile_mockup: "Mobile mockup", mobile: "Mobile screenshot" };
  return html`<section class="cs__gallery" data-theme="paper" ${chapterRaw(WORK)} aria-label="${esc(p.name)} gallery">
  <p class="cs__glabel mono"><span>Gallery</span><span>${nn(items.length)} frames</span></p>
  <ul class="cs__grid" role="list">
    ${items.map(
      (s, i) => html`<li class="cs__g${s.m!.height > s.m!.width ? " cs__g--tall" : ""}">
      <figure>${picture(s.m!, s.alt, "(min-width: 1025px) 45vw, 100vw")}<figcaption class="mono"><span>${nn(i + 1)} / ${esc(LBL[s.kind] ?? "Image")}</span><span>${s.m!.width} × ${s.m!.height}</span></figcaption></figure>
    </li>`
    )}
  </ul>
</section>`;
};

export const projectPage = (p: ProjectRec) => {
  const list = allProjects();
  const i = list.findIndex((x) => x.slug === p.slug);
  const next = list.length > 1 ? list[(i + 1) % list.length] : null;
  const live = safeUrl(p.live_url) || safeUrl(p.app_url);
  const { base, tld } = splitName(p.name);
  const fm = frameMedia(p);
  const app = isApp(p);
  const paras = paragraphs(p.full_description);
  const primary = app
    ? p.play_store_url
      ? extCta("Download on Google Play", safeUrl(p.play_store_url), "orange", ` — ${p.name}`)
      : ""
    : live
      ? extCta("Visit live site", live, "orange", ` — ${hostOf(live)}`)
      : "";
  return html`<article class="cs${app ? " cs--app" : ""}" style="--accent:${esc(accentOf(p))};--nw:${nameEm(p.name)}">
<header class="cs__head" id="top" data-theme="ink" ${chapterRaw(WORK)}>
  ${gridLines("gridlines cs__lines")}
  <p class="cs__index display" aria-hidden="true">${nn(i + 1)}</p>
  <nav class="cs__crumbs mono" aria-label="Breadcrumb"><ol role="list"><li><a class="ulink" href="/">Home</a></li><li><a class="ulink" href="/projects/">Work</a></li><li aria-current="page">${esc(p.name)}</li></ol></nav>
  <p class="cs__meta mono"><span>${esc(p.project_type ?? typeLabel(p))}</span><span>${esc(PLATFORM_TEXT[p.platform])}</span>${p.completion_year ? html`<span>${p.completion_year}</span>` : ""}<span class="cs__live">${live || p.play_store_url ? html`<i aria-hidden="true"></i>Live` : "Case study"}</span><span class="cs__of">${nn(i + 1)} / ${nn(list.length)}</span></p>
  <h1 class="cs__name"><span class="cs__base">${esc(base)}</span><span class="cs__tld">${esc(tld)}</span></h1>
  <div class="cs__intro">
    <p class="cs__lede">${esc(p.short_description)}</p>
    <div class="cs__ctas">
      ${primary}
      ${app && p.play_store_url ? playLink(p, "cs__play") : ""}
      ${waCta("Discuss a similar project", similarMessage(p), "line")}
    </div>
  </div>
</header>
<section class="cs__visual" data-theme="${app ? "paper" : "ink"}" ${chapterRaw(WORK)} aria-label="${esc(p.name)} preview">
  ${app
    ? html`<p class="cs__os display" aria-hidden="true"><span>App</span><span>${esc(PLATFORM_TEXT[p.platform])}</span></p>${phones(p, "cs__phones")}${p.play_store_url ? html`<p class="cs__avail mono">Available on Google Play</p>` : ""}`
    : html`<span class="frame cs__frame">
      <span class="frame__bar mono"><span class="frame__url">${esc(live ? hostOf(live) : p.slug)}</span><span class="frame__lbl">${esc(frameLabel(fm))}</span></span>
      <span class="frame__view"><span class="frame__img">${fm ? picture(fm.m, altFor(p, fm), "(min-width: 1025px) 80vw, 100vw", true) : cover(p)}</span></span>
    </span>`}
</section>
<section class="cs__body grid" data-theme="paper" ${chapterRaw(WORK)} aria-labelledby="cs-about">
  <h2 class="cs__h mono" id="cs-about">/ About the project</h2>
  <dl class="cs__spec mono">
    ${specRows(p).map(([k, v, href]) => html`<div><dt>${esc(k)}</dt><dd>${href ? html`<a class="ulink" href="${esc(href)}" ${EXT}>${esc(v)}<span class="sr-only"> (opens in a new tab)</span></a>` : esc(v)}</dd></div>`)}
  </dl>
  <div class="cs__text">
    ${p.headline ? html`<p class="cs__quote"><span class="mono">${app ? "Brand headline" : "Site headline"}</span><q class="serif">${esc(p.headline)}</q></p>` : ""}
    ${(paras.length ? paras : [p.short_description]).map((t) => html`<p>${esc(t)}</p>`)}
  </div>
</section>
${gallery(p)}
${ctaBand("Want something similar?", "Let's build yours.", similarMessage(p), contactFor(TYPE_TO_SERVICE[p.project_type ?? ""]), "Discuss a similar project")}
${next
  ? html`<nav class="cs__next" data-theme="ink" ${chapterRaw(WORK)} aria-label="Next project">
  <a class="cs__nextlink" href="${projectPath(next)}" data-cursor="go" style="--accent:${esc(accentOf(next))};--nw:${nameEm(next.name)}">
    <span class="mono">Next project / ${nn(((i + 1) % list.length) + 1)}</span>
    <span class="cs__nextname">${esc(next.name)}</span>
    ${arrow("e", "cs__nexta")}
  </a>
</nav>`
  : ""}
</article>`;
};
