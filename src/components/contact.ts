import { prettyPhone, waLink } from "../data/model.js";
import { chapters } from "../data/site.js";
import { D, socialLinks } from "../data/store.js";
import { esc, EXT, html, slugify } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { chapterAttr, label, waCta } from "./ui.js";

const req = (r?: boolean) =>
  r ? `<span class="f__req" aria-hidden="true">*</span>` : `<span class="f__opt">Optional</span>`;

const field = (o: { id: string; label: string; type?: string; required?: boolean; autocomplete?: string; placeholder?: string; inputmode?: string; max?: number; help?: string }) => html`<div class="f">
  <label class="f__label" for="f-${o.id}">${esc(o.label)}${req(o.required)}</label>
  <input class="f__input" id="f-${o.id}" name="${o.id}" type="${o.type ?? "text"}" ${o.required ? 'required aria-required="true"' : ""}
    ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : ""} ${o.inputmode ? `inputmode="${o.inputmode}"` : ""}
    maxlength="${o.max ?? 120}" placeholder="${esc(o.placeholder ?? "")}" aria-describedby="${o.help ? `f-${o.id}-help ` : ""}f-${o.id}-err">
  ${o.help ? html`<p class="f__help" id="f-${o.id}-help">${esc(o.help)}</p>` : ""}
  <p class="f__err" id="f-${o.id}-err" data-error-for="${o.id}"></p>
</div>`;

/** Single-choice chips (native radios: arrow keys move, one value is submitted). */
const choices = (name: string, legend: string, options: string[], required: boolean, help = "") => html`<fieldset class="f f--full f--choices" ${required ? 'data-required="true"' : ""} aria-describedby="${help ? `f-${name}-help ` : ""}f-${name}-err">
  <legend class="f__label">${esc(legend)}${req(required)}</legend>
  ${help ? html`<p class="f__help" id="f-${name}-help">${esc(help)}</p>` : ""}
  <div class="sel">
    ${options.map(
      (o, i) => html`<label class="sel__o"><input type="radio" name="${name}" value="${esc(o)}" id="f-${name}-${slugify(o) || i}" ${required ? "required" : ""}><span>${esc(o)}</span></label>`
    )}
  </div>
  <p class="f__err" id="f-${name}-err" data-error-for="${name}"></p>
</fieldset>`;

const details = () => {
  const { email, phone, whatsapp, whatsapp_message, location } = D().contact;
  const rows = [
    email && { k: "Email", v: email, href: `mailto:${email}` },
    whatsapp && { k: "WhatsApp", v: prettyPhone(whatsapp), href: waLink(whatsapp, whatsapp_message), ext: true },
    phone && { k: "Phone", v: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` },
    location && { k: "Based in", v: location },
    ...socialLinks().map((s) => ({ k: s.label, v: s.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: s.href, ext: true })),
  ].filter(Boolean) as { k: string; v: string; href?: string; ext?: boolean }[];
  if (!rows.length) return "";
  return html`<dl class="contact__details mono">${rows.map(
    (r) => html`<div><dt>${esc(r.k)}</dt><dd>${r.href ? html`<a class="ulink" href="${esc(r.href)}" ${r.ext ? EXT : ""}>${esc(r.v)}</a>` : esc(r.v)}</dd></div>`
  )}</dl>`;
};

const STATUS = { available: "Accepting new projects", limited: "Limited availability", closed: "Not taking new projects" } as const;

/* ── 09 CONTACT — ORANGE ──────────────────────────────────── */
export const contactSection = (o: { level?: "h1" | "h2"; id?: string } = {}) => {
  const { content, contact, form } = D();
  const c = content.contact;
  const H = o.level ?? "h2";
  const H2 = H === "h1" ? "h2" : "h3";
  return html`<section class="contact" id="${o.id ?? "contact"}" data-theme="orange" ${chapterAttr("contact")} aria-labelledby="contact-title">
  <div class="contact__head grid">
    ${label(chapters.contact.n, chapters.contact.label, "contact__label")}
    <p class="contact__st mono">${esc(STATUS[contact.availability] ?? STATUS.available)}</p>
    <${H} class="contact__title" id="contact-title"><span class="ln display"><span class="ln__i">${esc(c.heading_1)} ${esc(c.heading_2)}</span></span>${c.serif ? html` <span class="contact__serif serif ln"><em class="serif ln__i">${esc(c.serif)}</em></span>` : ""}</${H}>
  </div>

  <div class="contact__body grid">
    <aside class="contact__side">
      <p class="contact__lede lead">${esc(c.description)}</p>
      ${waCta(c.whatsapp_cta, contact.whatsapp_message, "ink", 'data-wa-contact')}
      <div class="contact__next">
        <${H2} class="contact__h mono">What happens next</${H2}>
        <ol class="contact__steps" role="list">
          <li><span class="mono">01</span><span>You send the brief — a few lines is enough.</span></li>
          <li><span class="mono">02</span><span>We reply with questions and suggested next steps.</span></li>
          <li><span class="mono">03</span><span>We agree the scope, timeline and quote before any work starts.</span></li>
        </ol>
      </div>
      ${details()}
    </aside>

    <div class="contact__formwrap">
      <form class="form" data-form novalidate
        data-endpoint="/api/enquiry"
        data-email="${esc(contact.email)}"
        data-whatsapp="${esc(contact.whatsapp)}"
        data-button="${esc(c.button)}"
        aria-describedby="form-note">
        <div class="form__grid">
          ${field({ id: "name", label: "Your name", required: true, autocomplete: "name", placeholder: "Full name", max: 80 })}
          ${field({ id: "email", label: "Email", type: "email", required: true, autocomplete: "email", placeholder: "you@business.com", max: 120 })}
          ${field({ id: "phone", label: "Phone or WhatsApp", type: "tel", autocomplete: "tel", inputmode: "tel", placeholder: `+${contact.default_country_code || "91"} …`, max: 24, help: "Include your country code, e.g. +91 or +351." })}
          ${field({ id: "company", label: "Company or business", autocomplete: "organization", placeholder: "Business name", max: 100 })}
          ${choices("service", "Service needed", form.services, true, "Choose the closest match.")}
          ${form.budgets.length ? choices("budget", "Estimated budget", form.budgets, false, form.budgets.some((b) => b.includes("₹")) ? "Amounts in Indian rupees (₹)." : "") : ""}
          <div class="f f--full f--details">
            <label class="f__label" for="f-details">Project details${req(true)}</label>
            <p class="f__help" id="f-details-help">What are you building, who is it for, and when do you need it? At least 20 characters.</p>
            <textarea class="f__input f__area" id="f-details" name="details" rows="5" required aria-required="true" minlength="20" maxlength="2000"
              placeholder="e.g. A website for our bakery with a menu, photos and an order enquiry form, live by March." aria-describedby="f-details-help f-details-err f-details-count"></textarea>
            <div class="f__row">
              <p class="f__err" id="f-details-err" data-error-for="details"></p>
              <p class="f__count mono" id="f-details-count" data-count>0 / 2000</p>
            </div>
          </div>
          <div class="hp" aria-hidden="true">
            <label for="f-website">Leave this field empty</label>
            <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
          </div>
        </div>

        <div class="form__foot">
          <p class="form__note" id="form-note">Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required. We only use your details to reply — see our <a class="ulink" href="/privacy/">privacy note</a>.</p>
          <button class="form__submit" type="submit" data-cursor="go">
            <span class="btn__label">${esc(c.button)}</span>
            <span class="btn__spinner" aria-hidden="true"></span>
            ${arrow("ne", "form__arw")}
          </button>
        </div>
        <p class="form__status" role="status" aria-live="polite" data-status></p>
      </form>

      <div class="form__success" data-success hidden tabindex="-1">
        <${H2} class="form__done display" data-success-title>${esc(c.success_title)}</${H2}>
        <p class="form__thanks" data-success-text>${esc(c.success_text)}</p>
        <div class="form__again">
          <button class="cta cta--ink" type="button" data-reset data-cursor="go"><span class="cta__t">Send another</span>${arrow("e", "cta__a")}</button>
          ${waCta(c.whatsapp_cta, contact.whatsapp_message, "line")}
        </div>
      </div>
    </div>
  </div>
</section>`;
};
