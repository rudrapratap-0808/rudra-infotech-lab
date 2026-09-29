import { services } from "../data/content.js";
import { esc, html } from "../lib/html.js";
import { icon, serviceArt } from "./icons.js";
import { eyebrow, heading } from "./ui.js";

const n = (i: number) => String(i + 1).padStart(2, "0");

/**
 * Desktop: vertical tabs + sticky detail panel (hover / focus / arrow keys).
 * Mobile: a plain, fully expanded editorial list — no hidden content.
 */
export const servicesSection = () => html`<section class="services section" id="services" aria-labelledby="services-title">
  <div class="container">
    <header class="section-head">
      ${eyebrow("03", "Services")}
      ${heading("Everything your website needs. *Nothing it doesn't.*", "h2", "h2", "services-title")}
      <p class="section-head__aside" data-reveal>
        From the first sketch to ongoing support — one lab, one standard, end to end.
      </p>
    </header>

    <div class="svc" data-services>
      <div class="svc__tabs" role="tablist" aria-orientation="vertical" aria-label="Our services">
        ${services.map(
          (s, i) => html`<button class="svc__tab" role="tab" type="button" id="svc-tab-${s.id}" aria-controls="svc-panel-${s.id}" aria-selected="${i === 0 ? "true" : "false"}" tabindex="${i === 0 ? 0 : -1}" data-reveal>
            <span class="svc__n mono">${n(i)}</span>
            <span class="svc__name">${esc(s.name)}</span>
            <span class="svc__arrow">${icon.arrowRight}</span>
          </button>`
        )}
      </div>

      <div class="svc__stage" data-reveal>
        ${services.map(
          (s, i) => html`<div class="svc__panel" role="tabpanel" id="svc-panel-${s.id}" aria-labelledby="svc-tab-${s.id}" tabindex="0" ${i === 0 ? "" : "hidden"}>
            <div class="svc__art">${serviceArt[s.id] ?? ""}</div>
            <p class="svc__big mono" aria-hidden="true">${n(i)}<span>/${n(services.length - 1)}</span></p>
            <h3 class="svc__title">${esc(s.name)}</h3>
            <p class="svc__line">${esc(s.line)}</p>
            <p class="svc__body">${esc(s.body)}</p>
            <ul class="svc__points mono" role="list">${s.points.map((p) => html`<li>${esc(p)}</li>`)}</ul>
          </div>`
        )}
      </div>
    </div>

    <ol class="svc-list" role="list">
      ${services.map(
        (s, i) => html`<li class="svc-list__item" data-reveal>
          <span class="svc__n mono">${n(i)}</span>
          <div>
            <h3 class="svc-list__name">${esc(s.name)}</h3>
            <p class="svc-list__line">${esc(s.line)}</p>
            <p class="svc-list__body">${esc(s.body)}</p>
          </div>
        </li>`
      )}
    </ol>
  </div>
</section>`;
