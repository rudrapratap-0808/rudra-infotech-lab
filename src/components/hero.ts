import { site } from "../data/site.js";
import { chars, esc, html } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { chapterAttr, cta, gridLines, tlink } from "./ui.js";

/**
 * Five interface planes — DESIGN · CODE · MOTION · SYSTEM · LAUNCH.
 * Exploded in 3D by default; scrolling (or pressing) compresses them into
 * one finished browser window: many disciplines → one website.
 */
const planes = () => html`<button class="planes" type="button" data-planes data-cursor="build" aria-pressed="false"
  aria-label="Assemble the five disciplines into one website">
  <span class="planes__stack" data-planes-stack>
    <span class="plane plane--design" style="--i:0">
      <span class="plane__tag mono">01 — Design</span>
      <span class="pd pd--logo"></span><span class="pd pd--img"></span><span class="pd pd--sq"></span>
      <span class="pd pd--cta"></span><span class="pd pd--card"></span><span class="pd pd--card"></span><span class="pd pd--card"></span>
    </span>
    <span class="plane plane--code" style="--i:1">
      <span class="plane__tag mono">02 — Code</span>
      <span class="pc pc--nav"></span><span class="pc pc--h1"></span><span class="pc pc--h1b"></span>
      <span class="pc pc--p"></span><span class="pc pc--p2"></span>
      <span class="pc__tag pc__tag--a mono">&lt;h1&gt;</span><span class="pc__tag pc__tag--b mono">&lt;/&gt;</span>
    </span>
    <span class="plane plane--motion" style="--i:2">
      <span class="plane__tag mono">03 — Motion</span>
      <svg class="pm" viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path class="pm__path" d="M22 66C44 30 78 86 104 44" vector-effect="non-scaling-stroke"/>
        <path class="pm__head" d="M98 41l7 2 1-7" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="pm__dot"></span>
      <svg class="pm__cursor" viewBox="0 0 12 16" aria-hidden="true" focusable="false"><path d="M1 1v12l3.2-3 2.3 5 2-1-2.2-4.8H11Z"/></svg>
    </span>
    <span class="plane plane--system" style="--i:3">
      <span class="plane__tag mono">04 — System</span>
      <span class="ps">${"<i></i>".repeat(12)}</span>
      <span class="ps__lbl mono">12 col / 20 gap</span>
    </span>
    <span class="plane plane--launch" style="--i:4">
      <span class="plane__tag mono">05 — Launch</span>
      <span class="plb mono"><span class="plb__dots"><i></i><i></i><i></i></span><span class="plb__url">your-business.com</span><span class="plb__live"><i></i>Live</span></span>
    </span>
  </span>
</button>`;

export const hero = () => html`<section class="hero" id="top" data-theme="paper" ${chapterAttr("home")} aria-labelledby="hero-title">
  <div class="hero__stage" data-hero>
    ${gridLines("gridlines hero__grid")}
    <span class="hero__rect" aria-hidden="true" data-hero-rect></span>

    <ul class="hero__meta mono" role="list" aria-label="Studio details">
      ${site.heroMeta.map((m) => html`<li class="hero__meta-i" data-hero-meta><span>${esc(m)}</span></li>`)}
      <li class="hero__xy" aria-hidden="true" data-hero-meta><span data-hero-xy>X: 0000 Y: 0000</span></li>
    </ul>

    <h1 class="hero__title" id="hero-title">
      <span class="sr-only">Rudra InfoTech Lab — we build websites that make businesses impossible to ignore.</span>
      <span class="hero__w hero__w--rudra display" aria-hidden="true" data-hero-word="rudra">${chars("RUDRA")}</span>
      <span class="hero__serif serif" aria-hidden="true" data-hero-serif><span class="ln"><span class="ln__i">Impossible to ignore.</span></span></span>
      <span class="hero__w hero__w--infotech display" aria-hidden="true" data-hero-word="infotech">${chars("INFOTECH")}</span>
      <span class="hero__w hero__w--lab display" aria-hidden="true" data-hero-word="lab">${chars("LAB")}</span>
    </h1>

    <div class="hero__copy" data-hero-copy>
      <p class="hero__claim">We build websites that make businesses impossible to ignore.</p>
      <p class="hero__lede">Modern, fast, responsive digital experiences — designed and developed for businesses, brands, startups and entrepreneurs.</p>
      <div class="hero__ctas">
        ${cta("Start a project", "#contact", "ink", "ne")}
        ${tlink("View our work", "#work", "s")}
      </div>
    </div>

    ${planes()}

    <p class="hero__foot mono" aria-hidden="true" data-hero-foot>
      <span>Scroll</span>${arrow("s", "hero__foot-a")}<span>Build sequence</span><span class="hero__foot-f">Frame / 001</span>
    </p>
  </div>
</section>`;
