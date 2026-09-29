import { process } from "../data/content.js";
import { esc, html } from "../lib/html.js";
import { eyebrow, heading } from "./ui.js";

export const processSection = () => html`<section class="process section" id="process" aria-labelledby="process-title" data-process>
  <div class="container">
    <header class="section-head">
      ${eyebrow("05", "Process")}
      ${heading("From first call to *go-live.*", "h2", "h2", "process-title")}
      <p class="section-head__aside" data-reveal>
        Six clear stages. You always know where your project is, what's next and what we need from you.
      </p>
    </header>

    <div class="process__grid">
      <div class="process__rail" aria-hidden="true">
        <div class="process__counter">
          <span class="process__digits" data-process-digits>
            ${process.map((s) => `<span>${s.n}</span>`)}
          </span>
        </div>
        <p class="process__current mono"><span data-process-name>${esc(process[0].title)}</span><span class="process__total">/ ${String(process.length).padStart(2, "0")}</span></p>
        <div class="process__bar"><span data-process-bar></span></div>
      </div>

      <div class="process__track">
      <span class="process__line" aria-hidden="true"><span data-process-line></span></span>
      <ol class="process__steps" role="list">
        ${process.map(
          (s, i) => html`<li class="step${i === 0 ? " is-active" : ""}" data-step="${i}">
            <span class="step__dot" aria-hidden="true"></span>
            <p class="step__n mono">${s.n} —</p>
            <h3 class="step__title">${esc(s.title)}</h3>
            <p class="step__body">${esc(s.body)}</p>
          </li>`
        )}
      </ol>
      </div>
    </div>
  </div>
</section>`;
