import { hostOf, projects, type Project } from "../data/projects.js";
import { chapters } from "../data/site.js";
import { chars, esc, html, nn } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { chapterAttr } from "./ui.js";

export interface Media {
  kind: "shot" | "hero";
  src: string;
  width: number;
  height: number;
  /** Optional 800w variant for small screens. */
  small?: { src: string; width: number; height: number };
}

/** Measured Archivo Black widths (em) of the project name bases — used to fit the name line. */
const NAME_EM: Record<string, number> = {
  Dotaanke: 5.19,
  RojgarLelo: 5.864,
  MightyMindz: 6.833,
  "Sarkar2-0": 5.311,
  RahulConstructionWork: 12.986,
};

const split = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > 0 ? { base: name.slice(0, i), tld: name.slice(i) } : { base: name, tld: "" };
};

/** Total name width in em (Archivo base with −0.04em tracking + Inter Tight TLD). */
const nameEm = (name: string) => {
  const { base, tld } = split(name);
  const b = (NAME_EM[base] ?? base.length * 0.64) - base.length * 0.04;
  return +(b + (tld ? 0.25 + (tld.length - 1) * 0.5 : 0)).toFixed(2);
};

const cover = (p: Project) => {
  const { base } = split(p.name);
  const c = p.cover ?? { bg: "#f1eee6", fg: "#0c0c0c" };
  return html`<span class="cover" style="--cbg:${c.bg};--cfg:${c.fg}">
    <span class="cover__top mono"><span>${esc(base)}</span><span>${esc(hostOf(p.url))}</span></span>
    <span class="cover__h display">${esc(p.headline ?? base)}</span>
    <span class="cover__foot mono"><span>${esc(p.category)}</span><span>Cover / 16:10</span></span>
  </span>`;
};

const img = (p: Project, m: Media) => {
  const srcset = m.small ? `${m.small.src} ${m.small.width}w, ${m.src} ${m.width}w` : "";
  const alt = m.kind === "shot" ? `Screenshot of the ${p.name} website` : (p.imageAlt ?? `${p.name}`);
  return html`<img src="${esc(m.src)}" ${srcset ? `srcset="${esc(srcset)}" sizes="(min-width: 1025px) 66vw, 100vw"` : ""}
    width="${m.width}" height="${m.height}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
};

const frameLabel = (m?: Media) =>
  !m ? "Cover / 16:10" : m.kind === "shot" ? `Live build / ${m.width} × ${m.height}` : "Hero image / 16:10";

const project = (p: Project, i: number, total: number, m?: Media) => {
  const host = hostOf(p.url);
  const { base, tld } = split(p.name);
  return html`<li class="proj" style="--accent:${esc(p.accent)};--nw:${nameEm(p.name)}" data-proj>
  <article class="proj__in" aria-labelledby="p-${p.slug}">
    <p class="proj__top mono">
      <span class="proj__cat">${esc(p.category)}</span>
      <span class="proj__live"><i aria-hidden="true"></i>Live / Production</span>
      <span class="proj__fr" aria-hidden="true">Frame / ${String(i + 3).padStart(3, "0")}</span>
      <span class="proj__of">${nn(i + 1)} / ${nn(total)}</span>
    </p>
    <p class="proj__index display" aria-hidden="true"><span class="proj__index-i">${nn(i + 1)}</span></p>
    <div class="proj__info">
      <dl class="proj__spec mono">
        <div><dt>Type</dt><dd>${esc(p.category)}</dd></div>
        ${p.tags.length ? html`<div><dt>Built with</dt><dd>${p.tags.map(esc).join(" · ")}</dd></div>` : ""}
        <div><dt>Domain</dt><dd>${esc(host)}</dd></div>
      </dl>
      <p class="proj__summary">${esc(p.summary)}</p>
      ${p.headline ? html`<p class="proj__quote"><span class="mono">Site headline</span><q class="serif">${esc(p.headline)}</q></p>` : ""}
    </div>
    <a class="proj__media" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true" data-cursor="visit" data-proj-media>
      <span class="frame">
        <span class="frame__bar mono"><span class="frame__url">${esc(host)}</span><span class="frame__lbl">${esc(frameLabel(m))}</span></span>
        <span class="frame__view"><span class="frame__img" data-proj-img>${m ? img(p, m) : cover(p)}</span></span>
      </span>
    </a>
    <h3 class="proj__name" id="p-${p.slug}"><span class="proj__base">${esc(base)}</span><span class="proj__tld">${esc(tld)}</span></h3>
    <a class="proj__visit" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-cursor="go" data-proj-link>
      <span class="proj__visit-t">Visit live site</span>${arrow("ne", "proj__visit-a")}<span class="sr-only"> — ${esc(host)} (opens in a new tab)</span>
    </a>
  </article>
</li>`;
};

export const work = (media: Record<string, Media>) => html`<section class="work" id="work" aria-labelledby="work-title">
  <header class="wi" data-theme="paper" ${chapterAttr("work")}>
    <ul class="wi__meta mono" role="list">
      <li>/ ${chapters.work.n}</li><li>Selected work</li><li>Real projects</li><li>Real domains</li>
    </ul>
    <h2 class="wi__title display" id="work-title"><span class="sr-only">Selected work</span><span class="wi__word" aria-hidden="true">${chars("WORK")}</span></h2>
    <div class="wi__row grid">
      <p class="wi__text">Real projects on real domains. Don't take our word for it — click through and judge for yourself.</p>
      <dl class="wi__spec mono">
        <div><dt>Count</dt><dd>${nn(projects.length)}</dd></div>
        <div><dt>Status</dt><dd>Live</dd></div>
        <div><dt>Format</dt><dd>16:10</dd></div>
      </dl>
      <p class="wi__count display" aria-hidden="true">${nn(projects.length)}</p>
    </div>
    <span class="wi__cover" data-theme="ink" aria-hidden="true" data-wi-cover></span>
  </header>
  <div class="reel" data-theme="ink" ${chapterAttr("work")} data-reel>
    <span class="reel__rules" aria-hidden="true" data-reel-rules></span>
    <ol class="reel__list" role="list">
      ${projects.map((p, i) => project(p, i, projects.length, media[p.slug]))}
    </ol>
    <span class="reel__sep" aria-hidden="true" data-reel-sep></span>
  </div>
</section>`;
