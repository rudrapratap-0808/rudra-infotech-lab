import { services } from "../data/content.js";
import { chapters } from "../data/site.js";
import { esc, html, nn } from "../lib/html.js";
import { serviceSymbol } from "./symbols.js";
import { chapterAttr, label } from "./ui.js";

/**
 * One giant vertical service index on ELECTRIC BLUE.
 * Static: eight full-height slides. Desktop motion: a pinned stage where each
 * name compresses upward and the next expands into frame.
 */
export const servicesSection = () => html`<section class="svc" id="services" data-theme="blue" ${chapterAttr("services")} aria-labelledby="svc-title">
  <header class="svc__head grid">
    ${label(chapters.services.n, chapters.services.label, "svc__label")}
    <h2 class="svc__title" id="svc-title">Everything your website needs. <em class="serif">Nothing it doesn't.</em></h2>
    <p class="svc__aside">From the first sketch to ongoing support — one lab, one standard, end to end.</p>
    <p class="svc__count mono" aria-hidden="true">${nn(services.length)} disciplines</p>
  </header>
  <div class="svc__stage" data-svc>
    <ol class="svc__list" role="list">
      ${services.map(
        (s, i) => html`<li class="si si--${s.id}" data-svc-item style="--i:${i}">
          <p class="si__n mono"><span>S / ${nn(i + 1)}</span><span class="si__of">${nn(services.length)}</span></p>
          <span class="si__sym" aria-hidden="true">${serviceSymbol[s.id] ?? ""}</span>
          <h3 class="si__name display">${s.display.map((l) => html`<span class="ln"><span class="ln__i">${esc(l)}</span></span>`).join(" ")}</h3>
          <div class="si__copy">
            <p class="si__line">${esc(s.line)}</p>
            <p class="si__body">${esc(s.body)}</p>
            <ul class="si__points mono" role="list">${s.points.map((p) => html`<li>${esc(p)}</li>`)}</ul>
          </div>
        </li>`
      )}
    </ol>
    <span class="svc__bar" aria-hidden="true">${services.map(() => "<i></i>").join("")}</span>
    <span class="svc__wipe" data-theme="paper" aria-hidden="true" data-svc-wipe></span>
  </div>
</section>`;
