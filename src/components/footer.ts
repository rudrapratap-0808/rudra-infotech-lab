import { hostOf, projects } from "../data/projects.js";
import { nav, site, socialLinks } from "../data/site.js";
import { esc, html } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { chapterAttr, cta, status } from "./ui.js";

/* ── 12 FOOTER — INK ──────────────────────────────────────── */
export const footer = () => {
  const socials = socialLinks();
  const year = new Date().getFullYear();
  return html`<footer class="foot" data-theme="ink" ${chapterAttr("end")}>
  <div class="foot__top grid">
    <p class="foot__serif serif"><em class="serif">Make something worth visiting.</em></p>
    <div class="foot__cta">${cta("Start a project", "/#contact", "orange", "ne")}</div>
  </div>

  <div class="foot__giant" data-foot aria-hidden="true">
    <span class="foot__rudra display">Rudra</span>
    <span class="foot__hl display" data-foot-hl>Rudra</span>
  </div>
  <p class="foot__sub" aria-hidden="true"><span class="display">InfoTech Lab</span><span class="mono">Web design &amp; development studio</span></p>

  <div class="foot__bar grid">
    <nav class="foot__nav" aria-label="Footer">
      <div>
        <h2 class="foot__h mono">Navigate</h2>
        <ul role="list">${nav.map((n) => html`<li><a class="ulink" href="${n.href}">${esc(n.label)}</a></li>`)}</ul>
      </div>
      <div>
        <h2 class="foot__h mono">Selected work</h2>
        <ul role="list">${projects.map(
          (p) => html`<li><a class="ulink" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-cursor="view">${esc(hostOf(p.url))}<span class="sr-only"> (opens in a new tab)</span></a></li>`
        )}</ul>
      </div>
      ${socials.length
        ? html`<div><h2 class="foot__h mono">Connect</h2><ul role="list">${socials.map(
            (s) => html`<li><a class="ulink" href="${esc(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`
          )}</ul></div>`
        : ""}
    </nav>
    <div class="foot__mid">${status(site.availability, "foot__status")}</div>
    <div class="foot__legal mono">
      <p>© <span data-year>${year}</span> ${esc(site.name)}</p>
      <a class="ulink" href="/privacy/">Privacy</a>
      <a class="ulink foot__top-link" href="#top" data-to-top>Back to top${arrow("n")}</a>
    </div>
  </div>
</footer>`;
};
