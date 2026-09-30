import { chapters } from "../data/site.js";
import { D } from "../data/store.js";
import { chars, esc, html, nn } from "../lib/html.js";
import { chapterAttr, label } from "./ui.js";

/** Measured Archivo Black widths (em, uppercase, incl. −0.055em tracking) → fill the viewport. */
const WIDTH: Record<string, number> = { design: 4.225, develop: 4.91, perform: 5.337, convert: 5.175 };

const gfx: Record<string, string> = {
  // DESIGN → orange graphic grid
  design: `<span class="pg pg--grid">${Array.from({ length: 13 }, (_, i) => `<i class="v" style="--i:${i}"></i>`).join("")}${Array.from({ length: 7 }, (_, i) => `<i class="h" style="--i:${i}"></i>`).join("")}<b style="--x:2;--y:1;--w:3;--h:2"></b><b style="--x:8;--y:4;--w:2;--h:1"></b><b style="--x:10;--y:1;--w:1;--h:1"></b></span>`,
  // DEVELOP → blue code-like construction lines
  develop: `<span class="pg pg--code">${[62, 44, 78, 30, 56, 70, 24, 48, 66, 36]
    .map((w, i) => `<i style="--i:${i};--w:${w}%;--x:${[0, 6, 6, 12, 12, 6, 0, 6, 12, 0][i]}%"><em class="mono">${nn(i + 1)}</em></i>`)
    .join("")}</span>`,
  // PERFORM → acid speed indicator
  perform: `<span class="pg pg--speed"><svg viewBox="0 0 400 220" aria-hidden="true" focusable="false"><path class="pg-arc" pathLength="1" d="M30 200a170 170 0 0 1 340 0"/>${Array.from(
    { length: 11 },
    (_, i) => {
      const a = Math.PI - (i / 10) * Math.PI;
      const x1 = 200 + Math.cos(a) * 150, y1 = 200 - Math.sin(a) * 150, x2 = 200 + Math.cos(a) * 128, y2 = 200 - Math.sin(a) * 128;
      return `<line class="pg-tick" style="--i:${i}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
  ).join("")}<line class="pg-needle" x1="200" y1="200" x2="200" y2="62"/><circle class="pg-hub" cx="200" cy="200" r="9"/></svg><span class="pg-read mono">Speed / Full</span>${Array.from({ length: 5 }, (_, i) => `<i class="pg-streak" style="--i:${i}"></i>`).join("")}</span>`,
  // CONVERT → orange target circle
  convert: `<span class="pg pg--target"><svg viewBox="0 0 400 400" aria-hidden="true" focusable="false"><circle pathLength="1" cx="200" cy="200" r="190"/><circle pathLength="1" cx="200" cy="200" r="128"/><circle pathLength="1" cx="200" cy="200" r="66"/><circle class="pg-bull" cx="200" cy="200" r="16"/><path pathLength="1" d="M200 0V400M0 200H400"/></svg></span>`,
};

const WORDS = [
  { id: "design", word: "Design.", label: "Design" },
  { id: "develop", word: "Develop.", label: "Development" },
  { id: "perform", word: "Perform.", label: "Performance" },
  { id: "convert", word: "Convert.", label: "Usability" },
] as const;

export const philosophySection = () => {
  const ph = D().content.philosophy;
  return html`<section class="phil" id="philosophy" data-theme="ink" ${chapterAttr("philosophy")} aria-labelledby="phil-title">
  <span class="phil__bar" aria-hidden="true"></span>
  <div class="phil__intro grid">
    ${label(chapters.philosophy.n, chapters.philosophy.label, "phil__label")}
    <p class="phil__frame mono" aria-hidden="true">Frame / 002</p>
    <p class="phil__lead">${esc(ph.lead)}</p>
    <h2 class="phil__statement serif" id="phil-title" data-split-lines>
      ${[ph.statement_1, ph.statement_2].filter(Boolean).map((l, i) => html`<span class="ln ln--${i + 1}"><span class="ln__i">${esc(l)}</span></span>`)}
    </h2>
    <p class="phil__lede">${esc(ph.description)}</p>
  </div>
  <ol class="phil__words" role="list">
    ${WORDS.map(
      (w, i) => html`<li class="pw pw--${w.id}" data-pw style="--fs:calc(94vw / ${WIDTH[w.id] ?? 5})">
        <span class="pw__gfx" aria-hidden="true">${gfx[w.id] ?? ""}</span>
        <p class="pw__meta mono"><span>${nn(i + 1)} / ${nn(WORDS.length)}</span><span>${esc(w.label)}</span></p>
        <h3 class="pw__word display"><span class="sr-only">${esc(w.word)}</span><span class="pw__chars" aria-hidden="true">${chars(w.word.toUpperCase())}</span></h3>
        <p class="pw__text">${esc(ph[w.id])}</p>
      </li>`
    )}
  </ol>
</section>`;
};
