import { hostOf, type ProjectRec } from "../data/model.js";
import { chapters } from "../data/site.js";
import { D, img, projectPath, reelProjects, type Img } from "../data/store.js";
import { chars, esc, EXT, html, nn, safeUrl } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { chapterAttr } from "./ui.js";

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

export const frameLabel = (fm: ReturnType<typeof frameMedia>) =>
  !fm ? "Cover / 16:10" : fm.kind === "shot" ? `Live build / ${fm.m.width} × ${fm.m.height}` : "Featured image / 16:10";

export const altFor = (p: ProjectRec, fm: NonNullable<ReturnType<typeof frameMedia>>) =>
  fm.kind === "shot" ? `Screenshot of the ${p.name} website` : (p.image_alt ?? p.name);

const project = (p: ProjectRec, i: number, total: number) => {
  const url = safeUrl(p.live_url);
  const host = url ? hostOf(url) : "";
  const { base, tld } = splitName(p.name);
  const fm = frameMedia(p);
  const path = projectPath(p);
  return html`<li class="proj" style="--accent:${esc(accentOf(p))};--nw:${nameEm(p.name)}" data-proj>
  <article class="proj__in" aria-labelledby="p-${esc(p.slug)}">
    <p class="proj__top mono">
      <span class="proj__cat">${esc(typeLabel(p))}</span>
      ${url ? html`<span class="proj__live"><i aria-hidden="true"></i>Live / Production</span>` : ""}
      <span class="proj__fr" aria-hidden="true">Frame / ${String(i + 3).padStart(3, "0")}</span>
      <span class="proj__of">${nn(i + 1)} / ${nn(total)}</span>
    </p>
    <p class="proj__index display" aria-hidden="true"><span class="proj__index-i">${nn(i + 1)}</span></p>
    <div class="proj__info">
      <dl class="proj__spec mono">
        <div><dt>Type</dt><dd>${esc(p.project_type ? p.project_type : typeLabel(p))}</dd></div>
        ${p.technologies.length ? html`<div><dt>Built with</dt><dd>${p.technologies.map(esc).join(" · ")}</dd></div>` : ""}
        ${host ? html`<div><dt>Domain</dt><dd>${esc(host)}</dd></div>` : ""}
      </dl>
      <p class="proj__summary">${esc(p.short_description)}</p>
      ${p.headline ? html`<p class="proj__quote"><span class="mono">Site headline</span><q class="serif">${esc(p.headline)}</q></p>` : ""}
    </div>
    <a class="proj__media" href="${path}" tabindex="-1" aria-hidden="true" data-cursor="view" data-proj-media>
      <span class="frame">
        <span class="frame__bar mono"><span class="frame__url">${esc(host || p.slug)}</span><span class="frame__lbl">${esc(frameLabel(fm))}</span></span>
        <span class="frame__view"><span class="frame__img" data-proj-img>${fm ? picture(fm.m, altFor(p, fm)) : cover(p)}</span></span>
      </span>
    </a>
    <h3 class="proj__name" id="p-${esc(p.slug)}"><span class="proj__base">${esc(base)}</span><span class="proj__tld">${esc(tld)}</span></h3>
    <div class="proj__acts">
      <a class="proj__case mono" href="${path}" data-cursor="go" data-proj-link><span>Case study</span>${arrow("e")}<span class="sr-only"> — ${esc(p.name)}</span></a>
      ${url
        ? html`<a class="proj__visit" href="${esc(url)}" ${EXT} data-cursor="visit">
        <span class="proj__visit-t">Visit live site</span>${arrow("ne", "proj__visit-a")}<span class="sr-only"> — ${esc(host)} (opens in a new tab)</span>
      </a>`
        : ""}
    </div>
  </article>
</li>`;
};

export const work = () => {
  const list = reelProjects();
  if (!list.length) return "";
  return html`<section class="work" id="work" aria-labelledby="work-title">
  <header class="wi" data-theme="paper" ${chapterAttr("work")}>
    <ul class="wi__meta mono" role="list">
      <li>/ ${chapters.work.n}</li><li>Selected work</li><li>Real projects</li><li>Real domains</li>
    </ul>
    <h2 class="wi__title display" id="work-title"><span class="sr-only">Selected work</span><span class="wi__word" aria-hidden="true">${chars("WORK")}</span></h2>
    <div class="wi__row grid">
      <p class="wi__text">${esc(D().content.work.description)}</p>
      <dl class="wi__spec mono">
        <div><dt>Count</dt><dd>${nn(list.length)}</dd></div>
        <div><dt>Status</dt><dd>Live</dd></div>
        <div><dt>Index</dt><dd><a class="ulink" href="/projects/">All projects</a></dd></div>
      </dl>
      <p class="wi__count display" aria-hidden="true">${nn(list.length)}</p>
    </div>
    <span class="wi__cover" data-theme="ink" aria-hidden="true" data-wi-cover></span>
  </header>
  <div class="reel" data-theme="ink" ${chapterAttr("work")} data-reel>
    <span class="reel__rules" aria-hidden="true" data-reel-rules></span>
    <ol class="reel__list" role="list">
      ${list.map((p, i) => project(p, i, list.length))}
    </ol>
    <span class="reel__sep" aria-hidden="true" data-reel-sep></span>
  </div>
</section>`;
};
