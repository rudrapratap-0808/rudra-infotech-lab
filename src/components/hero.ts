import { site } from "../data/site.js";
import { esc, html, splitWords } from "../lib/html.js";
import { icon } from "./icons.js";
import { button } from "./ui.js";

const TITLE = "We build websites that make businesses *impossible* to ignore.";

/** Lines shown in the decorative "build console". Purely illustrative. */
const consoleLines: [string, string, string?][] = [
  ["$", "ritl new your-business"],
  ["ok", "brief.discovered"],
  ["ok", "design.system", "tokens, type, grid"],
  ["ok", "layout.responsive", "360px … 2560px"],
  ["ok", "assets.optimised", "images, fonts"],
  ["ok", "a11y.checked", "focus, contrast, motion"],
  [">", "deploy --production"],
];

const sym = (s: string) =>
  s === "ok"
    ? `<span class="console__sym is-ok">${icon.check}</span>`
    : s === ">"
      ? `<span class="console__sym is-go">${icon.arrowRight}</span>`
      : `<span class="console__sym">${esc(s)}</span>`;

export const hero = () => html`<section class="hero" id="top" aria-labelledby="hero-title" data-hero>
  <canvas class="hero__canvas" data-hero-canvas aria-hidden="true"></canvas>
  <div class="hero__glow" aria-hidden="true"></div>
  <div class="hero__vignette" aria-hidden="true"></div>

  <div class="container hero__inner">
    ${site.availability ? html`<p class="hero__kicker mono" data-intro style="--d:0"><span class="pulse" aria-hidden="true"></span>${esc(site.availability)}<span class="hero__kicker-sep" aria-hidden="true">/</span><span class="hero__kicker-alt">Web design &amp; development lab</span></p>` : ""}

    <h1 class="hero__title" id="hero-title" data-split data-intro-split aria-label="${esc(TITLE.replace(/\*/g, ""))}">
      <span aria-hidden="true">${splitWords(TITLE)}</span>
    </h1>

    <div class="hero__foot">
      <div class="hero__copy">
        <p class="hero__lede" data-intro style="--d:5">
          Rudra InfoTech Lab designs and develops modern digital experiences for businesses, brands, startups and entrepreneurs — fast, responsive and built to bring in business.
        </p>
        <div class="hero__ctas" data-intro style="--d:6">
          ${button("Start a Project", "#contact", "ember", "lg")}
          ${button("View Our Work", "#work", "ghost", "lg")}
        </div>
      </div>

      <div class="console" aria-hidden="true" data-intro style="--d:8">
        <div class="console__bar"><i></i><i></i><i></i><span class="mono">ritl — build</span></div>
        <ol class="console__body mono">
          ${consoleLines.map(
            ([s, t, note], i) =>
              html`<li style="--l:${i}">${sym(s)}<span>${esc(t)}</span>${note ? html`<span class="console__note">${esc(note)}</span>` : ""}</li>`
          )}
          <li class="console__caret" style="--l:${consoleLines.length}"><span class="console__sym">$</span><i></i></li>
        </ol>
      </div>
    </div>
  </div>

  <div class="container hero__meta mono" data-intro style="--d:9">
    <span>RITL / Web Lab</span>
    <a href="#philosophy" class="hero__scroll">Scroll ${icon.arrowDown}</a>
    <span class="hero__meta-end">Design · Develop · Launch</span>
  </div>
</section>`;
