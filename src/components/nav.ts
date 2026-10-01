import { waLink, prettyPhone } from "../data/model.js";
import { nav, navPrimary, site } from "../data/site.js";
import { availabilityText, D, socialLinks } from "../data/store.js";
import { esc, EXT, html, nn } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { cta, gridLines, status } from "./ui.js";

/** Where "Start a project" goes: the in-page form on the home page, the contact page elsewhere. */
export const contactHref = (home: boolean): string => (home ? "#contact" : "/contact/");

const isCurrent = (href: string, path: string) => !href.includes("#") && href !== "/" && path.startsWith(href);

/** Fixed navigation — colour follows the section underneath (see client/chrome.ts). */
export const navbar = (chapterLabel: string, path: string) => html`<header class="nav" data-nav data-surface="paper">
  <a class="nav__brand mono" href="/#top" aria-label="${esc(site.name)} — home" data-cursor="go">
    <span>Rudra</span><span>InfoTech Lab</span>
  </a>
  ${status(availabilityText(), "nav__status")}
  <p class="nav__chapter mono" aria-hidden="true"><span class="nav__chapter-i" data-nav-chapter>${esc(chapterLabel)}</span></p>
  <nav class="nav__links" aria-label="Primary">
    <ul role="list">
      ${navPrimary.map((n) => html`<li><a class="nav__link mono" href="${n.href}" ${isCurrent(n.href, path) ? 'aria-current="page"' : ""}>${esc(n.label)}</a></li>`)}
    </ul>
  </nav>
  <button class="nav__menu mono" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle>
    <span data-menu-label>Menu</span><span class="nav__menu-ico" aria-hidden="true"><i></i><i></i></span>
  </button>
</header>`;

export const menu = (home: boolean, path: string) => {
  const socials = socialLinks();
  const { email, phone, whatsapp, whatsapp_message } = D().contact;
  return html`<div class="menu" id="menu" data-menu data-theme="ink" inert>
  ${gridLines("gridlines menu__grid")}
  <nav class="menu__nav" aria-label="Menu">
    <ol class="menu__list" role="list">
      ${nav.map(
        (n, i) => html`<li class="menu__item" style="--i:${i}">
          <a class="menu__link" href="${n.href}" data-menu-link ${isCurrent(n.href, path) ? 'aria-current="page"' : ""}>
            <span class="menu__n mono">${nn(i + 1)}</span>
            <span class="menu__t display"><span class="menu__t-i">${esc(n.label)}</span></span>
            ${arrow("ne", "menu__a")}
          </a>
        </li>`
      )}
    </ol>
  </nav>
  <div class="menu__foot">
    ${status(availabilityText())}
    <div class="menu__meta mono">
      ${email ? html`<a href="mailto:${esc(email)}">${esc(email)}</a>` : ""}
      ${phone ? html`<a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a>` : ""}
      ${whatsapp ? html`<a href="${esc(waLink(whatsapp, whatsapp_message))}" ${EXT}>WhatsApp ${esc(prettyPhone(whatsapp))}</a>` : ""}
      ${socials.map((s) => html`<a href="${esc(s.href)}" ${EXT}>${esc(s.label)}</a>`)}
      <span>Design / Development</span>
    </div>
    ${cta("Start a project", contactHref(home), "orange", "ne", "data-menu-link")}
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
