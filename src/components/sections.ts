import { about, principles, process, tech } from "../data/content.js";
import { chapters } from "../data/site.js";
import { esc, html, nn } from "../lib/html.js";
import { arrow, cropMarks, monogram } from "./symbols.js";
import { chapterAttr, label } from "./ui.js";

/* ── 06 WHY RUDRA — PAPER ─────────────────────────────────── */
export const why = () => html`<section class="why" id="why" data-theme="paper" ${chapterAttr("why")} aria-labelledby="why-title">
  <div class="why__head grid">
    ${label(chapters.why.n, "Why Rudra InfoTech Lab", "why__label")}
    <h2 class="why__title" id="why-title">
      <span class="why__w why__w--1 display"><span class="why__i">Built</span></span>
      <span class="why__w why__w--2 display"><span class="why__i">with</span></span>
      <span class="why__w why__w--3 display"><span class="why__i">intent.</span></span>
      <span class="why__serif serif"><em class="serif">Down to the pixel.</em></span>
    </h2>
    <p class="why__aside">We're not here to ship pages that merely exist. Every decision — from a font weight to a database query — is made to help your business look sharp and work hard.</p>
  </div>
  <ol class="why__list" role="list" data-why-list>
    ${principles.map(
      (p, i) => html`<li class="wr" data-why>
        <h3 class="wr__h"><button class="wr__btn" type="button" aria-expanded="false" aria-controls="why-${i}" data-why-btn>
          <span class="wr__n mono">${nn(i + 1)} /</span><span class="wr__t">${esc(p.title)}</span><span class="wr__pm" aria-hidden="true"></span>
        </button></h3>
        <div class="wr__body" id="why-${i}"><div class="wr__inner"><p>${esc(p.body)}</p></div></div>
        ${cropMarks("crop wr__crop")}
        <span class="wr__dim mono" aria-hidden="true">Row / ${nn(i + 1)}</span>
      </li>`
    )}
    <li class="wr wr--cta">
      <a class="wr__cta" href="#contact" data-cursor="go">
        <span class="wr__n mono">${nn(principles.length + 1)} /</span><span class="wr__t">Your project, next.</span>
        <span class="wr__go mono">Start a project${arrow("ne")}</span>
      </a>
    </li>
  </ol>
</section>`;

/* ── 07 PROCESS — ORANGE ──────────────────────────────────── */
const viz = () => `<span class="viz" data-viz data-stage="4" aria-hidden="true">
  <span class="viz__grid">${"<i></i>".repeat(8)}</span>
  <span class="viz__ui">
    <span class="viz__r viz__r--nav"><i></i><i></i></span>
    <span class="viz__r viz__r--hero"><i></i><i></i><i></i></span>
    <span class="viz__r viz__r--img"></span>
    <span class="viz__r viz__r--c1"><i></i></span><span class="viz__r viz__r--c2"><i></i></span><span class="viz__r viz__r--c3"><i></i></span>
  </span>
  <span class="viz__dev viz__dev--t"><i></i><i></i></span>
  <span class="viz__dev viz__dev--m"><i></i><i></i></span>
  <span class="viz__live mono"><i></i>Live</span>
  <svg class="viz__loop" viewBox="0 0 100 100"><path d="M84 38A36 36 0 1 0 86 58"/><path d="M78 30l7 9-11 2"/></svg>
</span>`;

export const processSection = () => html`<section class="proc" id="process" data-theme="orange" ${chapterAttr("process")} aria-labelledby="proc-title">
  <div class="proc__stage" data-proc>
    <header class="proc__head">
      ${label(chapters.process.n, chapters.process.label, "proc__label")}
      <h2 class="proc__title" id="proc-title">From first call to <em class="serif">go-live.</em></h2>
      <p class="proc__aside">Six clear stages. You always know where your project is, what's next and what we need from you.</p>
    </header>
    <p class="proc__status mono" aria-hidden="true"><span>Phase / <b data-proc-phase>01</b></span><span>Status / Active</span></p>
    ${viz()}
    <span class="proc__line" aria-hidden="true"><span class="proc__fill" data-proc-fill></span></span>
    <ol class="proc__steps" role="list">
      ${process.map(
        (s, i) => html`<li class="st${i === 0 ? " is-active" : ""}" data-step style="--i:${i}">
          <span class="st__node" aria-hidden="true"><span>${esc(s.n)}</span></span>
          <p class="st__meta mono">Phase / ${esc(s.n)}</p>
          <h3 class="st__name display"><span class="st__name-i">${esc(s.title)}</span></h3>
          <p class="st__body">${esc(s.body)}</p>
        </li>`
      )}
    </ol>
    <span class="proc__flood" data-theme="acid" aria-hidden="true" data-proc-flood></span>
  </div>
</section>`;

/* ── 08 TOOLKIT — ACID ────────────────────────────────────── */
const LANES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 0],
];

const lane = (ids: number[], li: number) => {
  const items = ids
    .map((id, k) => {
      const t = tech[id];
      const outline = (li + k) % 2 === 1;
      return `<span class="kt${outline ? " kt--o" : ""}" data-kt><span class="kt__n mono">/ ${nn(id + 1)} ${esc(t.kind)}</span><span class="kt__t display">${esc(t.name)}</span></span>`;
    })
    .join("");
  const copy = `<span class="lane__copy">${items}${items}</span>`;
  return `<div class="lane" data-lane data-dir="${li % 2 ? -1 : 1}"><div class="lane__track" data-lane-track>${copy}${copy}</div></div>`;
};

export const toolkit = () => html`<section class="kit" id="toolkit" data-theme="acid" ${chapterAttr("toolkit")} aria-labelledby="kit-title">
  <header class="kit__head grid">
    ${label(chapters.toolkit.n, chapters.toolkit.label, "kit__label")}
    <h2 class="kit__title" id="kit-title">Tools of <em class="serif">the lab.</em></h2>
    <p class="kit__aside">Modern, proven web technology — picked to fit each project, not out of habit.</p>
  </header>
  <div class="kit__lanes" aria-hidden="true" data-kit data-cursor="drag">${LANES.map(lane)}</div>
  <ol class="kit__index mono" role="list" aria-label="Technology stack">
    ${tech.map((t, i) => html`<li><span>${nn(i + 1)}</span> ${esc(t.name)} <span class="kit__kind">— ${esc(t.kind)}</span></li>`)}
  </ol>
</section>`;

/* ── 09 THE LAB (About) — PAPER ───────────────────────────── */
export const lab = () => html`<section class="lab" id="about" data-theme="paper" ${chapterAttr("lab")} aria-labelledby="lab-title">
  <div class="lab__grid grid">
    ${label(chapters.lab.n, chapters.lab.label, "lab__label")}
    <p class="lab__fr mono" aria-hidden="true">Frame / 009</p>
    <h2 class="lab__statement serif" id="lab-title">
      ${about.statement.map((l, i) => html`<span class="ln ln--${i + 1}"><span class="ln__i">${esc(l)}</span></span>`)}
    </h2>
    <div class="lab__r" data-lab-r>${monogram()}</div>
    <p class="lab__name display" aria-hidden="true"><span>Rudra</span><span>InfoTech</span><span>Lab</span></p>
    <div class="lab__text">${about.paragraphs.map((p) => html`<p>${esc(p)}</p>`)}</div>
    <dl class="lab__facts mono">${about.facts.map((f) => html`<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`)}</dl>
  </div>
</section>`;

/* ── 10 MANIFESTO — INK ───────────────────────────────────── */
export const manifesto = () => html`<section class="mani" data-theme="ink" ${chapterAttr("manifesto")} aria-labelledby="mani-title">
  <span class="mani__rules" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  <h2 class="mani__text" id="mani-title">
    <span class="sr-only">We don't ship pages. We build presence.</span>
    <span class="mani__l mani__l--1 display" aria-hidden="true"><span class="mani__i">We don't</span></span>
    <span class="mani__l mani__l--2 display" aria-hidden="true"><span class="mani__i">Ship</span></span>
    <span class="mani__l mani__l--3 display" aria-hidden="true"><span class="mani__i">Pages.<i class="mani__strike"></i></span></span>
    <span class="mani__l mani__l--4 display" aria-hidden="true"><span class="mani__i">We build</span></span>
    <span class="mani__l mani__l--5 display" aria-hidden="true"><span class="mani__i">Presence.</span></span>
  </h2>
  <p class="mani__serif serif"><em class="serif">Something worth remembering.</em></p>
  <p class="mani__meta mono" aria-hidden="true"><span>RITL</span><span>Build / ${new Date().getFullYear()}</span></p>
</section>`;
