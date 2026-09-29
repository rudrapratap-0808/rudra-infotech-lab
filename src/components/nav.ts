import { nav, site, socialLinks } from "../data/site.js";
import { esc, html } from "../lib/html.js";
import { icon, mark } from "./icons.js";

export const brand = (cls = "") => html`<a class="brand ${cls}" href="/#top" aria-label="${esc(site.name)} — home">
  ${mark()}
  <span class="brand__word" aria-hidden="true">Rudra <span class="brand__mid">InfoTech</span> Lab</span>
</a>`;

export const navbar = () => html`<header class="nav" data-nav>
  <div class="nav__bar">
    ${brand()}
    <nav class="nav__links" aria-label="Primary">
      <ul role="list">
        ${nav.map(
          (n) => html`<li><a href="${n.href}" data-nav-link="${n.href.split("#")[1]}">${esc(n.label)}</a></li>`
        )}
      </ul>
      <span class="nav__pill" aria-hidden="true"></span>
    </nav>
    <a class="btn btn--ember btn--sm nav__cta" href="/#contact" data-magnetic>
      <span class="btn__label">Start a Project</span>${icon.arrowRight}
    </a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle>
      <span class="sr-only" data-menu-label>Open menu</span>
      <span class="nav__burger" aria-hidden="true"><i></i><i></i></span>
    </button>
  </div>
</header>`;

export const menu = () => {
  const socials = socialLinks();
  const { email, phone } = site.contact;
  return html`<div class="menu" id="menu" data-menu inert>
  <div class="menu__bg" aria-hidden="true"></div>
  <nav class="menu__inner container" aria-label="Mobile">
    <ol class="menu__links" role="list">
      ${nav.map(
        (n, i) => html`<li style="--i:${i}"><a href="${n.href}" data-menu-link>
          <span class="menu__n mono">0${i + 1}</span><span class="menu__label">${esc(n.label)}</span>${icon.arrowUpRight}
        </a></li>`
      )}
    </ol>
    <div class="menu__foot" style="--i:${nav.length}">
      <a class="btn btn--ember btn--lg" href="/#contact" data-menu-link><span class="btn__label">Start a Project</span>${icon.arrowRight}</a>
      <div class="menu__meta mono">
        ${email ? html`<a href="mailto:${esc(email)}">${esc(email)}</a>` : ""}
        ${phone ? html`<a href="tel:${esc(phone.replace(/\s/g, ""))}">${esc(phone)}</a>` : ""}
        ${socials.map((s) => html`<a href="${esc(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`)}
        ${!email && !phone && !socials.length ? html`<span>${esc(site.name)} — Web design &amp; development</span>` : ""}
      </div>
    </div>
  </nav>
</div>`;
};

export const cursor = () => html`<div class="cursor" aria-hidden="true" data-cursor>
  <div class="cursor__ring"><span class="cursor__label" data-cursor-label></span></div>
  <div class="cursor__dot"></div>
</div>`;
