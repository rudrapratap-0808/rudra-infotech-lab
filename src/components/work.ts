import { hostOf, projects, type Project } from "../data/projects.js";
import { esc, html } from "../lib/html.js";
import { icon, mark } from "./icons.js";
import { eyebrow, heading } from "./ui.js";

export interface Shot {
  src: string;
  width: number;
  height: number;
}

/** Name without the TLD: "RahulConstructionWork.site" → "RahulConstructionWork" */
const base = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
};

/** Camel-case boundaries: "RahulConstructionWork" → ["Rahul", "Construction", "Work"] */
const words = (s: string) => s.split(/(?<=[a-z0-9])(?=[A-Z])/);

/** "RahulConstructionWork.site" → Rahul<wbr>Construction<wbr>Work<span>.site</span> (wraps gracefully) */
const splitName = (name: string) => {
  const i = name.lastIndexOf(".");
  const head = words(base(name)).map(esc).join("<wbr>");
  return i > 0 ? html`${head}<span class="project__tld">${esc(name.slice(i))}</span>` : head;
};

/** Generated, decorative browser-page artwork (used until a real screenshot exists). */
const art = (p: Project) => html`<div class="art art--v${p.variant}" aria-hidden="true">
  <div class="art__nav"><i class="art__logo"></i><i></i><i></i><i></i><b></b></div>
  <div class="art__hero"><span class="art__title">${esc(words(base(p.name)).join(" "))}</span><i></i><b></b></div>
  <div class="art__block">${Array.from({ length: 6 }, () => "<i></i>")}</div>
  <span class="art__glyph">${esc(p.name.charAt(0))}</span>
</div>`;

const media = (p: Project, shot?: Shot) =>
  shot
    ? html`<img src="${esc(shot.src)}" width="${shot.width}" height="${shot.height}" alt="Screenshot of the ${esc(p.name)} website" loading="lazy" decoding="async">`
    : art(p);

const project = (p: Project, i: number, total: number, shot?: Shot) => {
  const host = hostOf(p.url);
  return html`<li class="project" style="--h:${p.hue}" data-project>
  <article class="project__grid" aria-labelledby="p-${p.slug}">
    <div class="project__meta">
      <p class="project__index mono" data-reveal>
        <span>${String(i + 1).padStart(2, "0")}</span><span class="project__of">/ ${String(total).padStart(2, "0")}</span>
        <span class="project__status">Web development</span>
      </p>
      <h3 class="project__name" id="p-${p.slug}" data-reveal>${splitName(p.name)}</h3>
      <p class="project__summary" data-reveal>${esc(p.summary)}</p>
      ${p.tags.length ? html`<ul class="tags" role="list" data-reveal>${p.tags.map((t) => html`<li>${esc(t)}</li>`)}</ul>` : ""}
      <div class="project__actions" data-reveal>
        <a class="btn btn--ghost btn--md" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-magnetic>
          <span class="btn__label">Visit Website</span>${icon.arrowUpRight}<span class="sr-only"> ${esc(host)} (opens in a new tab)</span>
        </a>
        <span class="project__host mono">${esc(host)}</span>
      </div>
    </div>

    <a class="project__media" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true" data-cursor-text="Visit site" data-tilt>
      <div class="frame">
        <div class="frame__bar">
          <span class="frame__dots"><i></i><i></i><i></i></span>
          <span class="frame__url mono">${icon.lock}${esc(host)}</span>
          <span class="frame__mark">${mark()}</span>
        </div>
        <div class="frame__view"><div class="frame__inner" data-parallax>${media(p, shot)}</div></div>
      </div>
    </a>
  </article>
</li>`;
};

export const work = (shots: Record<string, Shot>) => html`<section class="work section" id="work" aria-labelledby="work-title">
  <div class="container">
    <header class="section-head">
      ${eyebrow("02", "Selected Work")}
      ${heading("Work that lives *on the web.*", "h2", "h2", "work-title")}
      <p class="section-head__aside" data-reveal>
        Real projects on real domains. Don't take our word for it — click through and judge for yourself.
      </p>
    </header>
    <ol class="work__list" role="list">
      ${projects.map((p, i) => project(p, i, projects.length, shots[p.slug]))}
    </ol>
  </div>
</section>`;
