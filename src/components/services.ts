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
 * One giant vertical service index on ELECTRIC BLUE.
 * Static: full-height slides. Desktop motion: a pinned stage where each
 * name compresses upward and the next expands into frame.
 */
export const servicesSection = () => {
  const list = services();
  if (!list.length) return "";
  const c = D().content.services;
  return html`<section class="svc" id="services" data-theme="blue" ${chapterAttr("services")} aria-labelledby="svc-title">
  <header class="svc__head grid">
    ${label(chapters.services.n, chapters.services.label, "svc__label")}
    <h2 class="svc__title" id="svc-title">${esc(c.heading)} <em class="serif">${esc(c.highlight)}</em></h2>
    <p class="svc__aside">${esc(c.description)}</p>
    <p class="svc__count mono" aria-hidden="true">${nn(list.length)} disciplines</p>
  </header>
  <div class="svc__stage" data-svc style="--n:${list.length}">
    <ol class="svc__list" role="list">
      ${list.map(
        (s, i) => html`<li class="si si--${esc(s.symbol)}" data-svc-item style="--i:${i}">
          <p class="si__n mono"><span>S / ${nn(i + 1)}</span><span class="si__of">${nn(list.length)}</span></p>
          <span class="si__sym" aria-hidden="true">${symbolFor(s)}</span>
          <h3 class="si__name display">${displayLines(s).map((l) => html`<span class="ln"><span class="ln__i">${esc(l)}</span></span>`).join(" ")}</h3>
          <div class="si__copy">
            <p class="si__line">${esc(s.short_description)}</p>
            <p class="si__body">${esc((s.full_description.split(/\n\s*\n/)[0] || "").trim())}</p>
            <ul class="si__points mono" role="list">${s.points.map((p) => html`<li>${esc(p)}</li>`)}</ul>
            <a class="si__more mono" href="${servicePath(s)}"><span>Explore ${esc(s.title)}</span>${arrow("e")}</a>
          </div>
        </li>`
      )}
    </ol>
    <span class="svc__bar" aria-hidden="true">${list.map(() => "<i></i>").join("")}</span>
    <span class="svc__wipe" data-theme="paper" aria-hidden="true" data-svc-wipe></span>
  </div>
</section>`;
};
