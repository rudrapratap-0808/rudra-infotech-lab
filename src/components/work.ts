import { hostOf, type ProjectRec } from "../data/model.js";
import { chapters } from "../data/site.js";
import { D, img, projectPath, reelProjects, type Img } from "../data/store.js";
import { chars, esc, EXT, html, nn, safeUrl } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { chapterAttr, label } from "./ui.js";

/** Measured Archivo Black widths (em) of known project name bases — used to fit the name line. */
const NAME_EM: Record<string, number> = {
  Dotaanke: 5.19,
  RojgarLelo: 5.864,
  MightyMindz: 6.833,
  "Sarkar2-0": 5.311,
  RahulConstructionWork: 12.986,
};

export const splitName = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 && !name.includes(" ") ? { base: name.slice(0, i), tld: name.slice(i) } : { base: name, tld: "" };
};

/** Rough Archivo Black advance widths (em) for names that haven't been measured. */
const charEm = (c: string) => (/[A-Z0-9]/.test(c) ? 0.74 : /[a-z]/.test(c) ? 0.6 : c === " " ? 0.28 : 0.4);

/** Total name width in em (Archivo base with −0.04em tracking + Inter Tight TLD). */
export const nameEm = (name: string) => {
  const { base, tld } = splitName(name);
  const b = (NAME_EM[base] ?? [...base].reduce((w, c) => w + charEm(c), 0)) - base.length * 0.04;
  return +(b + (tld ? 0.25 + (tld.length - 1) * 0.5 : 0)).toFixed(2);
};

/** Readable text colour on a background colour. */
export const fgOn = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#0c0c0c";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? "#0c0c0c" : "#ffffff";
};

export const accentOf = (p: ProjectRec) => (/^#[0-9a-f]{6}$/i.test(p.accent || "") ? p.accent! : "#dfff36");
export const typeLabel = (p: ProjectRec) => p.category || (p.project_type ? p.project_type.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : "Project");

export const cover = (p: ProjectRec, ratio = "16:10") => {
  const { base } = splitName(p.name);
  const bg = accentOf(p);
  const url = safeUrl(p.live_url);
  return html`<span class="cover" style="--cbg:${bg};--cfg:${fgOn(bg)}">
    <span class="cover__top mono"><span>${esc(base)}</span><span>${esc(url ? hostOf(url) : typeLabel(p))}</span></span>
    <span class="cover__h display">${esc(p.headline ?? base)}</span>
    <span class="cover__foot mono"><span>${esc(typeLabel(p))}</span><span>Cover / ${ratio}</span></span>
  </span>`;
};

export const picture = (m: Img, alt: string, sizes = "(min-width: 1025px) 66vw, 100vw", eager = false) => {
  const srcset = m.small ? `${m.small.src} ${m.small.width}w, ${m.src} ${m.width}w` : "";
  return html`<img src="${esc(m.src)}" ${srcset ? `srcset="${esc(srcset)}" sizes="${sizes}"` : ""}
    width="${m.width}" height="${m.height}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
};

/** The best 16:10 visual for a project: live screenshot > featured image > typographic cover. */
export const frameMedia = (p: ProjectRec): { kind: "shot" | "image"; m: Img } | null => {
  const shot = img(p.desktop_screenshot);
  if (shot) return { kind: "shot", m: shot };
  const f = img(p.featured_image);
  return f ? { kind: "image", m: f } : null;
};

/** Honest frame labels: photography and typographic covers are never presented as screenshots. */
export const frameLabel = (fm: ReturnType<typeof frameMedia>) =>
  !fm ? "Typographic cover" : fm.kind === "shot" ? "Screenshot / live site" : "Cover photo";

/**
 * Project name with safe break opportunities at spaces and CamelCase joins.
 * overflow-wrap in CSS remains the fallback for a single long CMS-supplied token.
 */
export const nameHtml = (name: string): string => {
  const { base, tld } = splitName(name);
  const breakable = esc(base)
    .replace(/(\s+)/g, "$1<wbr>")
    .replace(/(?<=[a-z0-9])(?=[A-Z][a-z])/g, "<wbr>");
  return `<span class="proj__base">${breakable}</span>${tld ? `<wbr><span class="proj__tld">${esc(tld)}</span>` : ""}`;
};

export const altFor = (p: ProjectRec, fm: NonNullable<ReturnType<typeof frameMedia>>) =>
  fm.kind === "shot" ? `Screenshot of the ${p.name} website` : (p.image_alt ?? p.name);

const project = (p: ProjectRec, i: number, total: number) => {
  const url = safeUrl(p.live_url);
  const host = url ? hostOf(url) : "";
  const fm = frameMedia(p);
  const path = projectPath(p);
  return html`<li class="proj" style="--accent:${esc(accentOf(p))}" data-proj>
  <article class="proj__in" aria-labelledby="p-${esc(p.slug)}">
    <p class="proj__top mono">
      <span class="proj__of">${nn(i + 1)} / ${nn(total)}</span>
      <span class="proj__cat">${esc(typeLabel(p))}</span>
      ${url ? html`<span class="proj__live"><i aria-hidden="true"></i>Live site</span>` : ""}
    </p>
    <div class="proj__info">
      <h3 class="proj__name" id="p-${esc(p.slug)}">${nameHtml(p.name)}</h3>
      <p class="proj__summary">${esc(p.short_description)}</p>
      <dl class="proj__spec mono">
        <div><dt>Type</dt><dd>${esc(p.project_type ? typeLabel({ ...p, category: null }) : typeLabel(p))}</dd></div>
        ${p.technologies.length ? html`<div><dt>Built with</dt><dd>${p.technologies.map(esc).join(" · ")}</dd></div>` : ""}
        ${host ? html`<div><dt>Domain</dt><dd>${esc(host)}</dd></div>` : ""}
      </dl>
      ${p.headline ? html`<p class="proj__quote"><span class="mono">Site headline</span><q class="serif">${esc(p.headline)}</q></p>` : ""}
      <div class="proj__acts">
        ${url
          ? html`<a class="proj__visit" href="${esc(url)}" ${EXT} data-cursor="visit">
          <span class="proj__visit-t">Visit live site</span>${arrow("ne", "proj__visit-a")}<span class="sr-only"> — ${esc(host)} (opens in a new tab)</span>
        </a>`
          : ""}
        <a class="proj__case tlink" href="${path}" data-cursor="go" data-proj-link><span>Case study</span>${arrow("e", "tlink__a")}<span class="sr-only"> — ${esc(p.name)}</span></a>
      </div>
    </div>
    <a class="proj__media" href="${path}" tabindex="-1" aria-hidden="true" data-cursor="view" data-proj-media>
      <span class="frame">
        <span class="frame__bar mono"><span class="frame__url">${esc(host || p.slug)}</span><span class="frame__lbl">${esc(frameLabel(fm))}</span></span>
        <span class="frame__view"><span class="frame__img" data-proj-img>${fm ? picture(fm.m, altFor(p, fm), "(min-width: 1025px) 60vw, 100vw") : cover(p)}</span></span>
      </span>
    </a>
  </article>
</li>`;
};

export const work = () => {
  const list = reelProjects();
  if (!list.length) return "";
  return html`<section class="work" id="work" aria-labelledby="work-title">
  <header class="wi" data-theme="paper" ${chapterAttr("work")}>
    <div class="wi__meta">
      ${label(chapters.work.n, "Selected work")}
      <p class="mono">${nn(list.length)} live projects</p>
    </div>
    <h2 class="wi__title display" id="work-title"><span class="sr-only">Selected work</span><span class="wi__word" aria-hidden="true">${chars("WORK")}</span></h2>
    <div class="wi__row grid">
      <p class="wi__text lead">${esc(D().content.work.description)}</p>
      <a class="tlink wi__all" href="/projects/"><span>All projects</span>${arrow("e", "tlink__a")}</a>
    </div>
  </header>
  <div class="reel" data-theme="ink" ${chapterAttr("work")} data-reel>
    <ol class="reel__list" role="list">
      ${list.map((p, i) => project(p, i, list.length))}
    </ol>
  </div>
</section>`;
};
