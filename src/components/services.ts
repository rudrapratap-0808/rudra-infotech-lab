import type { ServiceRec } from "../data/model.js";
import { chapters } from "../data/site.js";
import { D, servicePath, services } from "../data/store.js";
import { esc, html, nn } from "../lib/html.js";
import { arrow, serviceSymbol } from "./symbols.js";
import { chapterAttr, label } from "./ui.js";

export const displayLines = (s: Pick<ServiceRec, "display" | "title">): string[] => {
  const parts = (s.display || s.title).split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) return parts.slice(0, 2);
  const words = s.title.split(" ");
  return words.length > 1 ? [words[0], words.slice(1).join(" ")] : [s.title];
};

export const symbolFor = (s: Pick<ServiceRec, "symbol">): string => serviceSymbol[s.symbol] ?? serviceSymbol.development;

/**
 * Services on ELECTRIC BLUE — a compact editorial index. Every name, line,
 * description and link is visible at once; only the symbols draw themselves in.
 */
export const servicesSection = () => {
  const list = services();
  if (!list.length) return "";
  const c = D().content.services;
  return html`<section class="svc" id="services" data-theme="blue" ${chapterAttr("services")} aria-labelledby="svc-title">
  <header class="svc__head grid">
    ${label(chapters.services.n, chapters.services.label, "svc__label")}
    <p class="svc__count mono">${nn(list.length)} services</p>
    <h2 class="svc__title h2" id="svc-title">${esc(c.heading)} <em class="serif">${esc(c.highlight)}</em></h2>
    <p class="svc__aside">${esc(c.description)}</p>
  </header>
  <ol class="svc__list" role="list" data-svc>
    ${list.map(
      (s, i) => html`<li class="si si--${esc(s.symbol)}" data-svc-item>
        <p class="si__n mono">${nn(i + 1)}</p>
        <h3 class="si__name display"><a class="si__link" href="${servicePath(s)}">${esc(s.title)}</a></h3>
        <div class="si__copy">
          <p class="si__line">${esc(s.short_description)}</p>
          <p class="si__body">${esc((s.full_description.split(/\n\s*\n/)[0] || "").trim())}</p>
          ${s.points.length ? html`<ul class="si__points mono" role="list" aria-label="Includes">${s.points.map((p) => html`<li>${esc(p)}</li>`)}</ul>` : ""}
        </div>
        <span class="si__sym" aria-hidden="true">${symbolFor(s)}</span>
        <span class="si__go" aria-hidden="true">${arrow("e")}</span>
      </li>`
    )}
  </ol>
</section>`;
};
