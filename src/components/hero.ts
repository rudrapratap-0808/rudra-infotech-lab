import { D, reelProjects } from "../data/store.js";
import { chars, esc, html } from "../lib/html.js";
import { chapterAttr, cta, gridLines, tlink } from "./ui.js";

/**
 * Three interface planes — DESIGN · CODE · LAUNCH — in their own frame beside the
 * proposition. Exploded in 3D by default; scrolling past (or pressing) assembles
 * them into one finished browser window: several disciplines → one website.
 */
const planes = () => html`<button class="planes" type="button" data-planes data-cursor="build" aria-pressed="false"
  aria-label="Assemble the design, code and launch layers into one website">
  <span class="planes__stack" data-planes-stack>
    <span class="plane plane--design" style="--i:0">
      <span class="plane__tag mono">Design</span>
      <span class="pd pd--logo"></span><span class="pd pd--img"></span><span class="pd pd--sq"></span>
      <span class="pd pd--cta"></span><span class="pd pd--card"></span><span class="pd pd--card"></span><span class="pd pd--card"></span>
    </span>
    <span class="plane plane--code" style="--i:1">
      <span class="plane__tag mono">Code</span>
      <span class="pc pc--nav"></span><span class="pc pc--h1"></span><span class="pc pc--h1b"></span>
      <span class="pc pc--p"></span><span class="pc pc--p2"></span>
      <span class="pc__tag pc__tag--a mono">&lt;h1&gt;</span>
    </span>
    <span class="plane plane--launch" style="--i:2">
      <span class="plane__tag mono">Launch</span>
      <span class="plb mono"><span class="plb__dots"><i></i><i></i><i></i></span><span class="plb__url">your-business.com</span><span class="plb__live"><i></i>Live</span></span>
    </span>
  </span>
</button>`;

/**
 * 01 HERO — reading order: brand (RUDRA + InfoTech Lab lockup) → proposition →
 * primary action → supporting visual. A static composition first; motion is optional.
 */
export const hero = () => {
  const { content } = D();
  const h = content.hero;
  const meta = [h.meta_1, h.meta_2].filter(Boolean);
  return html`<section class="hero" id="top" data-theme="paper" ${chapterAttr("home")} aria-labelledby="hero-title">
  <div class="hero__stage" data-hero>
    ${gridLines("gridlines hero__grid")}

    <h1 class="hero__brand" id="hero-title">
      <span class="sr-only">Rudra InfoTech Lab — ${esc(h.heading)}</span>
      <span class="hero__rudra display" aria-hidden="true" data-hero-word="rudra">${chars("RUDRA")}</span>
      <span class="hero__row" aria-hidden="true">
        <span class="hero__lockup display ln" data-hero-lockup><span class="ln__i">InfoTech Lab</span></span>
        ${h.serif ? html`<span class="hero__serif serif ln" data-hero-serif><span class="ln__i">${esc(h.serif)}</span></span>` : ""}
      </span>
    </h1>

    <div class="hero__panel" data-theme="orange" data-hero-panel>
      <div class="hero__copy" data-hero-copy>
        <p class="hero__claim">${esc(h.heading)}</p>
        ${h.description ? html`<p class="hero__lede">${esc(h.description)}</p>` : ""}
        <div class="hero__ctas">
          ${cta(h.primary_cta, "#contact", "ink", "ne")}
          ${tlink(h.secondary_cta, reelProjects().length ? "#work" : "/projects/", "s", 'data-hero-secondary')}
        </div>
      </div>
      ${meta.length ? html`<ul class="hero__meta mono" role="list" aria-label="Studio details">${meta.map((m) => html`<li>${esc(m.replace(/^\/\s*/, ""))}</li>`)}</ul>` : ""}
    </div>

    <div class="hero__visual" data-hero-visual>${planes()}</div>
  </div>
</section>`;
};
