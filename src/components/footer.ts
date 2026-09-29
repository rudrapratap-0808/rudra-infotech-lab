import { hostOf, projects } from "../data/projects.js";
import { nav, site, socialLinks } from "../data/site.js";
import { esc, html } from "../lib/html.js";
import { brand } from "./nav.js";
import { icon } from "./icons.js";

export const footer = () => {
  const socials = socialLinks();
  const { email, phone, whatsapp } = site.contact;
  const year = new Date().getFullYear();
  const giant = "Rudra".split("");

  return html`<footer class="footer" data-footer>
  <div class="container">
    <div class="footer__top">
      <p class="footer__ask">Ready when <em>you</em> are.</p>
      <a class="btn btn--ember btn--lg" href="/#contact" data-magnetic><span class="btn__label">Start a Project</span>${icon.arrowRight}</a>
    </div>

    <div class="footer__cols">
      <div class="footer__brand">
        ${brand()}
        <p>A web design &amp; development lab building fast, modern, business-focused websites.</p>
      </div>
      <nav class="footer__col" aria-label="Footer">
        <h2 class="footer__h mono">Navigate</h2>
        <ul role="list">${nav.map((n) => html`<li><a class="ulink" href="${n.href}">${esc(n.label)}</a></li>`)}</ul>
      </nav>
      <div class="footer__col">
        <h2 class="footer__h mono">Selected work</h2>
        <ul role="list">${projects.map(
          (p) => html`<li><a class="ulink" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(p.url))}<span class="sr-only"> (opens in a new tab)</span></a></li>`
        )}</ul>
      </div>
      <div class="footer__col">
        <h2 class="footer__h mono">Connect</h2>
        <ul role="list">
          <li><a class="ulink" href="/#contact">Start a Project</a></li>
          ${email ? html`<li><a class="ulink" href="mailto:${esc(email)}">${esc(email)}</a></li>` : ""}
          ${phone ? html`<li><a class="ulink" href="tel:${esc(phone.replace(/\s/g, ""))}">${esc(phone)}</a></li>` : ""}
          ${whatsapp ? html`<li><a class="ulink" href="https://wa.me/${esc(whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>` : ""}
          ${socials.map((s) => html`<li><a class="ulink" href="${esc(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`)}
        </ul>
      </div>
    </div>
  </div>

  <div class="footer__giant" data-giant aria-hidden="true">
    <span class="footer__letters">${giant.map((l, i) => `<span style="--i:${i}">${l}</span>`)}</span>
    <span class="footer__sub">InfoTech <em>Lab</em></span>
  </div>

  <div class="container footer__bar mono">
    <p>© <span data-year>${year}</span> ${esc(site.name)}. All rights reserved.</p>
    <p class="footer__links"><a class="ulink" href="/privacy/">Privacy</a><span aria-hidden="true">·</span><span>Hand-built. No templates.</span></p>
    <a class="footer__top-btn" href="#top" data-to-top>Back to top ${icon.arrowUp}</a>
  </div>
</footer>`;
};
