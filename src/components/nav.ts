import { chapterText, nav, navPrimary, site, socialLinks, type ChapterKey } from "../data/site.js";
import { esc, html, nn } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { cta, gridLines, status } from "./ui.js";

/** Fixed navigation — colour follows the section underneath (see client/modules/nav.ts). */
export const navbar = (chapter: ChapterKey) => html`<header class="nav" data-nav data-tone="ink">
  <a class="nav__brand mono" href="/#top" aria-label="${esc(site.name)} — home" data-cursor="go">
    <span>Rudra</span><span>InfoTech Lab</span>
  </a>
  ${status(site.availability, "nav__status")}
  <p class="nav__chapter mono" aria-hidden="true"><span class="nav__chapter-i" data-nav-chapter>${esc(chapterText(chapter))}</span></p>
  <nav class="nav__links" aria-label="Primary">
    <ul role="list">
      ${navPrimary.map((n) => html`<li><a class="nav__link mono" href="${n.href}">${esc(n.label)}</a></li>`)}
    </ul>
  </nav>
  <button class="nav__menu mono" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle>
    <span data-menu-label>Menu</span><span class="nav__menu-ico" aria-hidden="true"><i></i><i></i></span>
  </button>
</header>`;

export const menu = () => {
  const socials = socialLinks();
  const { email, phone } = site.contact;
  return html`<div class="menu" id="menu" data-menu data-theme="ink" inert>
  ${gridLines("gridlines menu__grid")}
  <nav class="menu__nav" aria-label="Menu">
    <ol class="menu__list" role="list">
      ${nav.map(
        (n, i) => html`<li class="menu__item" style="--i:${i}">
          <a class="menu__link" href="${n.href}" data-menu-link>
            <span class="menu__n mono">${nn(i + 1)}</span>
            <span class="menu__t display"><span class="menu__t-i">${esc(n.label)}</span></span>
            ${arrow("ne", "menu__a")}
          </a>
        </li>`
      )}
    </ol>
  </nav>
  <div class="menu__foot">
    ${status(site.availability)}
    <div class="menu__meta mono">
      ${email ? html`<a href="mailto:${esc(email)}">${esc(email)}</a>` : ""}
      ${phone ? html`<a href="tel:${esc(phone.replace(/\s/g, ""))}">${esc(phone)}</a>` : ""}
      ${socials.map((s) => html`<a href="${esc(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`)}
      <span>Design / Development</span>
    </div>
    ${cta("Start a project", "/#contact", "orange", "ne", "data-menu-link")}
  </div>
</div>`;
};

export const cursor = () => `<div class="cursor" data-cursor-root aria-hidden="true">
  <span class="cursor__ring"><span class="cursor__label" data-cursor-label></span></span>
  <span class="cursor__dot"></span>
</div>`;

/**
 * 00 — Preloader. PAPER, a constructed R, lines that extend into the site grid.
 * Only shown when <html> has .intro (set before first paint; never for reduced motion).
 */
export const preloader = () => `<div class="pre" data-preloader aria-hidden="true">
  <span class="pre__bg" data-pre-bg></span>
  ${gridLines("gridlines pre__grid")}
  <div class="pre__box" data-pre-box>
    <span class="pre__r display" data-pre-r>R</span>
    <i class="pre__h pre__h--cap"></i><i class="pre__h pre__h--mid"></i><i class="pre__h pre__h--base"></i>
    <i class="pre__v pre__v--l"></i><i class="pre__v pre__v--stem"></i><i class="pre__v pre__v--r"></i>
    <i class="pre__ring"></i>
  </div>
  <p class="pre__tag pre__tag--tl mono">Rudra InfoTech Lab</p>
  <p class="pre__tag pre__tag--tr mono">Building interface</p>
  <p class="pre__tag pre__tag--bl mono" data-pre-xy>X: 0000 Y: 0000</p>
  <p class="pre__count mono"><span data-pre-count>00</span>%</p>
</div>`;
