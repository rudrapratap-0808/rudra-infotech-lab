import { principles, tech } from "../data/content.js";
import { esc, html } from "../lib/html.js";
import { icon, mark } from "./icons.js";
import { eyebrow, heading } from "./ui.js";

/* ── 01 Statement ─────────────────────────────────────────── */
const STATEMENT = "Your website isn't just a page on the internet. It's your *digital first impression.*";

const pillars = [
  { k: "Design", v: "Interfaces with a point of view — clear, considered, unmistakably yours." },
  { k: "Development", v: "Clean, responsive builds that behave on every screen size." },
  { k: "Performance", v: "Lightweight pages that load fast and stay fast." },
  { k: "Usability", v: "Obvious paths to the one thing you want visitors to do." },
];

export const statement = () => {
  let open = false;
  const words = STATEMENT.split(" ").map((raw) => {
    if (raw.startsWith("*")) open = true;
    const isAccent = open;
    if (raw.replace(/^\*/, "").includes("*")) open = false;
    const w = esc(raw.replace(/\*/g, ""));
    return `<span class="sw">${isAccent ? `<em>${w}</em>` : w}</span>`;
  });
  return html`<section class="statement section" id="philosophy" aria-labelledby="statement-title">
  <div class="container">
    ${eyebrow("01", "Philosophy")}
    <h2 class="statement__text" id="statement-title" data-scrub>${words.join(" ")}</h2>
    <div class="statement__foot">
      <p class="statement__lede" data-reveal>
        Visitors decide in seconds whether to trust you. We make those seconds count — by treating design, development, performance and usability as one discipline, not four separate jobs.
      </p>
      <dl class="pillars">
        ${pillars.map(
          (p, i) => html`<div class="pillar" data-reveal style="--d:${i}">
            <dt><span class="mono">0${i + 1}</span>${esc(p.k)}</dt>
            <dd>${esc(p.v)}</dd>
          </div>`
        )}
      </dl>
    </div>
  </div>
</section>`;
};

/* ── 04 Why ───────────────────────────────────────────────── */
export const why = () => html`<section class="why section" id="why" aria-labelledby="why-title">
  <div class="container">
    <header class="section-head">
      ${eyebrow("04", "Why Rudra InfoTech Lab")}
      ${heading("Built with intent. *Down to the pixel.*", "h2", "h2", "why-title")}
      <p class="section-head__aside" data-reveal>
        We're not here to ship pages that merely exist. Every decision — from a font weight to a database query — is made to help your business look sharp and work hard.
      </p>
    </header>
    <ul class="why__grid" role="list" data-spotlight>
      ${principles.map(
        (p, i) => html`<li class="why__cell" data-reveal style="--d:${i % 4}">
          <span class="why__n mono">${String(i + 1).padStart(2, "0")}</span>
          <h3 class="why__title">${esc(p.title)}</h3>
          <p class="why__body">${esc(p.body)}</p>
        </li>`
      )}
      <li class="why__cell why__cell--cta" data-reveal style="--d:3">
        <a href="#contact" class="why__cta">
          <span class="why__n mono">08</span>
          <span class="why__title">Your project<em>, next.</em></span>
          <span class="why__go">Start a Project ${icon.arrowRight}</span>
        </a>
      </li>
    </ul>
  </div>
</section>`;

/* ── 06 Technology ────────────────────────────────────────── */
const row = (items: string[], reverse = false) => html`<div class="marquee${reverse ? " marquee--rev" : ""}" aria-hidden="true">
  <div class="marquee__track">
    ${[0, 1].map(
      () => html`<div class="marquee__group">${items.map(
        (t, i) => html`<span class="marquee__item${i % 3 === 1 ? " is-outline" : ""}">${esc(t)}</span><span class="marquee__sep">${mark("marquee__mark")}</span>`
      )}</div>`
    )}
  </div>
</div>`;

export const techSection = () => {
  const half = Math.ceil(tech.length / 2);
  return html`<section class="tech section" id="stack" aria-labelledby="tech-title">
  <div class="container">
    <header class="section-head">
      ${eyebrow("06", "Toolkit")}
      ${heading("Tools of *the lab.*", "h2", "h2", "tech-title")}
      <p class="section-head__aside" data-reveal>
        Modern, proven web technology — picked to fit each project, not out of habit.
      </p>
    </header>
  </div>
  <div class="tech__marquees">
    ${row(tech.slice(0, half))}
    ${row([...tech.slice(half), ...tech.slice(0, 2)], true)}
  </div>
  <div class="container">
    <ul class="tech__list mono" role="list" data-reveal>
      ${tech.map((t) => html`<li>${esc(t)}</li>`)}
    </ul>
  </div>
</section>`;
};

/* ── 07 About ─────────────────────────────────────────────── */
const RING = "Rudra · InfoTech · Lab · Web Design · Development · ";

export const about = () => html`<section class="about section" id="about" aria-labelledby="about-title">
  <div class="container about__grid">
    <div class="about__badge" data-reveal aria-hidden="true">
      <svg class="about__ring" viewBox="0 0 200 200">
        <defs><path id="ring-path" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
        <text><textPath href="#ring-path" textLength="486">${esc(RING.toUpperCase())}</textPath></text>
      </svg>
      <div class="about__core">${mark("about__mark")}</div>
    </div>

    <div class="about__copy">
      ${eyebrow("07", "About")}
      ${heading("A small lab with a *serious standard.*", "h2", "h2", "about-title")}
      <div class="about__text">
        <p data-reveal>Rudra InfoTech Lab is a web design and development studio. We build websites for businesses, brands, startups and entrepreneurs who want more from the web than a page that simply exists.</p>
        <p data-reveal>We work like a lab: curious, hands-on and a little obsessive about the details. You talk directly to the people designing your pages and writing your code — so ideas don't get lost in translation.</p>
        <p data-reveal>Small enough to care about your project personally. Technical enough to build it properly.</p>
      </div>
      <dl class="about__facts" data-reveal>
        <div><dt class="mono">What we do</dt><dd>Website design &amp; development</dd></div>
        <div><dt class="mono">Who it's for</dt><dd>Businesses, brands, startups &amp; entrepreneurs</dd></div>
        <div><dt class="mono">How we work</dt><dd>Directly, transparently, end to end</dd></div>
      </dl>
    </div>
  </div>
</section>`;

/* ── 09 CTA ───────────────────────────────────────────────── */
export const cta = () => html`<section class="cta" aria-labelledby="cta-title" data-cta>
  <div class="cta__bg" aria-hidden="true"><span class="cta__orb"></span></div>
  <div class="container cta__inner">
    <p class="eyebrow mono" data-reveal><span class="eyebrow__bar" aria-hidden="true"></span>Next step</p>
    ${heading("Have an idea? Let's put it *on the web.*", "h2", "cta__title", "cta-title")}
    <a class="cta__btn" href="#contact" data-magnetic data-magnetic-strength="0.4">
      <span class="cta__btn-fill" aria-hidden="true"></span>
      <span class="cta__btn-label">Start a Project</span>
      ${icon.arrowRight}
    </a>
  </div>
</section>`;
