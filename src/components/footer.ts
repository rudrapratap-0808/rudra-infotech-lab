import { prettyPhone, waLink } from "../data/model.js";
import { nav, site } from "../data/site.js";
import { allProjects, availabilityText, D, projectPath, socialLinks } from "../data/store.js";
import { esc, EXT, html } from "../lib/html.js";
import { contactHref } from "./nav.js";
import { arrow } from "./symbols.js";
import { chapterAttr, cta, status } from "./ui.js";

/* ── FOOTER — INK ─────────────────────────────────────────── */
export const footer = (home: boolean) => {
  const socials = socialLinks();
  const { content, contact } = D();
  const work = allProjects();
  const year = new Date().getFullYear();
  const reach = [
    contact.email && { label: contact.email, href: `mailto:${contact.email}`, ext: false },
    contact.whatsapp && { label: `WhatsApp ${prettyPhone(contact.whatsapp)}`, href: waLink(contact.whatsapp, contact.whatsapp_message), ext: true },
    contact.phone && { label: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`, ext: false },
    ...socials.map((s) => ({ label: s.label, href: s.href, ext: true })),
  ].filter(Boolean) as { label: string; href: string; ext: boolean }[];
  return html`<footer class="foot" data-theme="ink" ${chapterAttr("end")}>
  <div class="foot__top grid">
    <p class="foot__serif serif"><em class="serif">${esc(content.footer.statement)}</em></p>
    <div class="foot__cta">${cta("Start a project", contactHref(home), "orange", "ne")}</div>
  </div>

  <div class="foot__giant" data-foot aria-hidden="true">
    <span class="foot__rudra display">Rudra</span>
    <span class="foot__hl display" data-foot-hl>Rudra</span>
  </div>
  <p class="foot__sub" aria-hidden="true"><span class="display">InfoTech Lab</span><span class="mono">${esc(content.footer.tagline)}</span></p>

  <div class="foot__bar grid">
    <nav class="foot__nav" aria-label="Footer">
      <div>
        <h2 class="foot__h mono">Navigate</h2>
        <ul role="list">${nav.map((n) => html`<li><a class="ulink" href="${n.href}">${esc(n.label)}</a></li>`)}</ul>
      </div>
      ${work.length
        ? html`<div>
        <h2 class="foot__h mono">Selected work</h2>
        <ul role="list">${work.map((p) => html`<li><a class="ulink" href="${projectPath(p)}">${esc(p.name)}</a></li>`)}</ul>
      </div>`
        : ""}
      ${reach.length
        ? html`<div><h2 class="foot__h mono">Connect</h2><ul role="list">${reach.map(
            (r) => html`<li><a class="ulink" href="${esc(r.href)}" ${r.ext ? EXT : ""}>${esc(r.label)}${r.ext ? html`<span class="sr-only"> (opens in a new tab)</span>` : ""}</a></li>`
          )}</ul></div>`
        : ""}
    </nav>
    <div class="foot__mid">${status(availabilityText(), "foot__status")}</div>
    <div class="foot__legal mono">
      <p>© <span data-year>${year}</span> ${esc(site.name)}</p>
      <a class="ulink" href="/privacy/">Privacy</a>
      <a class="ulink foot__top-link" href="#top" data-to-top>Back to top${arrow("n")}</a>
    </div>
  </div>
</footer>`;
};
