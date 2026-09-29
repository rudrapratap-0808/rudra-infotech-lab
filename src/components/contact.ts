import { budgets, websiteTypes } from "../data/content.js";
import { site } from "../data/site.js";
import { esc, html, slugify } from "../lib/html.js";
import { icon } from "./icons.js";
import { eyebrow, heading } from "./ui.js";

const field = (o: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  autocomplete?: string;
  placeholder?: string;
  inputmode?: string;
  hint?: string;
  max?: number;
}) => html`<div class="field">
  <label class="field__label" for="f-${o.id}">${esc(o.label)}${o.required ? html`<span class="field__req" aria-hidden="true">*</span>` : html`<span class="field__opt">Optional</span>`}</label>
  <input class="field__input" id="f-${o.id}" name="${o.id}" type="${o.type ?? "text"}"
    ${o.required ? "required" : ""} ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : ""}
    ${o.inputmode ? `inputmode="${o.inputmode}"` : ""} maxlength="${o.max ?? 120}"
    placeholder="${esc(o.placeholder ?? "")}" aria-describedby="f-${o.id}-err">
  <p class="field__err" id="f-${o.id}-err" data-error-for="${o.id}"></p>
</div>`;

const chips = (name: string, legend: string, options: string[], required: boolean) => html`<fieldset class="field field--full chips" ${required ? 'data-required="true"' : ""} aria-describedby="f-${name}-err">
  <legend class="field__label">${esc(legend)}${required ? html`<span class="field__req" aria-hidden="true">*</span>` : html`<span class="field__opt">Optional</span>`}</legend>
  <div class="chips__row">
    ${options.map(
      (o) => html`<label class="chip"><input type="radio" name="${name}" value="${esc(o)}" id="f-${name}-${slugify(o)}" ${required ? "required" : ""}><span>${esc(o)}</span></label>`
    )}
  </div>
  <p class="field__err" id="f-${name}-err" data-error-for="${name}"></p>
</fieldset>`;

const details = () => {
  const { email, phone, whatsapp, location } = site.contact;
  const rows = [
    email && { k: "Email", v: email, href: `mailto:${email}`, i: icon.mail },
    phone && { k: "Phone", v: phone, href: `tel:${phone.replace(/\s/g, "")}`, i: icon.phone },
    whatsapp && { k: "WhatsApp", v: "Message us", href: `https://wa.me/${whatsapp}`, i: icon.chat, ext: true },
    location && { k: "Based in", v: location, i: icon.pin },
  ].filter(Boolean) as { k: string; v: string; href?: string; i: string; ext?: boolean }[];
  if (!rows.length) return "";
  return html`<ul class="contact__details" role="list" data-reveal>
    ${rows.map(
      (r) => html`<li>${r.i}<span class="mono">${esc(r.k)}</span>${
        r.href
          ? html`<a class="ulink" href="${esc(r.href)}" ${r.ext ? 'target="_blank" rel="noopener noreferrer"' : ""}>${esc(r.v)}</a>`
          : html`<span>${esc(r.v)}</span>`
      }</li>`
    )}
  </ul>`;
};

export const contactSection = () => html`<section class="contact section" id="contact" aria-labelledby="contact-title">
  <div class="container contact__grid">
    <div class="contact__intro">
      ${eyebrow("08", "Contact")}
      ${heading("Tell us about your *idea.*", "h2", "h2", "contact-title")}
      <p class="contact__lede" data-reveal>
        A few details are all we need. We'll read every word, then reply with honest next steps — no jargon, no pressure.
      </p>
      <ol class="contact__steps mono" role="list" data-reveal>
        <li><span>01</span>You share the brief</li>
        <li><span>02</span>We reply with questions &amp; next steps</li>
        <li><span>03</span>We agree scope, timeline &amp; quote</li>
      </ol>
      ${details()}
    </div>

    <div class="contact__card" data-reveal>
      <form class="form" data-form novalidate
        data-endpoint="${esc(site.form.endpoint)}"
        data-extra="${esc(JSON.stringify(site.form.extra))}"
        data-email="${esc(site.contact.email)}"
        data-whatsapp="${esc(site.contact.whatsapp)}"
        aria-describedby="form-note">
        <div class="form__grid">
          ${field({ id: "name", label: "Name", required: true, autocomplete: "name", placeholder: "Your full name", max: 80 })}
          ${field({ id: "email", label: "Email", type: "email", required: true, autocomplete: "email", placeholder: "you@business.com", max: 120 })}
          ${field({ id: "phone", label: "Phone / WhatsApp", type: "tel", autocomplete: "tel", inputmode: "tel", placeholder: "+91 …", max: 20 })}
          ${field({ id: "company", label: "Company / Business", autocomplete: "organization", placeholder: "Business name", max: 100 })}
          ${chips("type", "Type of website", websiteTypes, true)}
          ${chips("budget", "Estimated budget", budgets, false)}
          <div class="field field--full">
            <label class="field__label" for="f-details">Project details<span class="field__req" aria-hidden="true">*</span></label>
            <textarea class="field__input field__area" id="f-details" name="details" rows="5" required minlength="20" maxlength="2000"
              placeholder="What are you building, who is it for, and when do you need it?" aria-describedby="f-details-err f-details-count"></textarea>
            <div class="field__row">
              <p class="field__err" id="f-details-err" data-error-for="details"></p>
              <p class="field__count mono" id="f-details-count" data-count>0 / 2000</p>
            </div>
          </div>

          <div class="hp" aria-hidden="true">
            <label for="f-website">Leave this field empty</label>
            <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
          </div>
        </div>

        <div class="form__foot">
          <p class="form__note" id="form-note">Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required. We only use your details to reply — see our <a class="ulink" href="/privacy/">privacy note</a>.</p>
          <button class="btn btn--ember btn--lg form__submit" type="submit" data-magnetic>
            <span class="btn__label">Send Project Brief</span>
            <span class="btn__spinner" aria-hidden="true"></span>
            ${icon.arrowRight}
          </button>
        </div>
        <p class="form__status" role="status" aria-live="polite" data-status></p>
      </form>

      <div class="form__success" data-success hidden tabindex="-1">
        <span class="form__success-icon">${icon.check}</span>
        <h3>Brief received.</h3>
        <p>Thanks — your project is in the lab. We'll get back to you shortly with next steps.</p>
        <button class="btn btn--ghost btn--md" type="button" data-reset><span class="btn__label">Send another</span>${icon.arrowRight}</button>
      </div>
    </div>
  </div>
</section>`;
