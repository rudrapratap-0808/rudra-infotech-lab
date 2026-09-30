import { budgets, websiteTypes } from "../data/content.js";
import { chapters, site } from "../data/site.js";
import { esc, html, nn, slugify } from "../lib/html.js";
import { arrow } from "./symbols.js";
import { chapterAttr, label } from "./ui.js";

const req = (r?: boolean) =>
  r ? `<span class="f__req" aria-hidden="true">*</span>` : `<span class="f__opt">Optional</span>`;

const field = (n: number, o: { id: string; label: string; type?: string; required?: boolean; autocomplete?: string; placeholder?: string; inputmode?: string; max?: number }) => html`<div class="f">
  <label class="f__label mono" for="f-${o.id}"><span class="f__n">${nn(n)} /</span>${esc(o.label)}${req(o.required)}</label>
  <input class="f__input" id="f-${o.id}" name="${o.id}" type="${o.type ?? "text"}" ${o.required ? "required" : ""}
    ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : ""} ${o.inputmode ? `inputmode="${o.inputmode}"` : ""}
    maxlength="${o.max ?? 120}" placeholder="${esc(o.placeholder ?? "")}" aria-describedby="f-${o.id}-err">
  <span class="f__rule" aria-hidden="true"></span>
  <p class="f__err mono" id="f-${o.id}-err" data-error-for="${o.id}"></p>
</div>`;

const choices = (n: number, name: string, legend: string, options: string[], required: boolean) => html`<fieldset class="f f--full f--choices" ${required ? 'data-required="true"' : ""} aria-describedby="f-${name}-err">
  <legend class="f__label mono"><span class="f__n">${nn(n)} /</span>${esc(legend)}${req(required)}</legend>
  <div class="sel">
    ${options.map(
      (o) => html`<label class="sel__o"><input type="radio" name="${name}" value="${esc(o)}" id="f-${name}-${slugify(o)}" ${required ? "required" : ""}><span>${esc(o)}</span></label>`
    )}
  </div>
  <p class="f__err mono" id="f-${name}-err" data-error-for="${name}"></p>
</fieldset>`;

const details = () => {
  const { email, phone, whatsapp, location } = site.contact;
  const rows = [
    email && { k: "Email", v: email, href: `mailto:${email}` },
    phone && { k: "Phone", v: phone, href: `tel:${phone.replace(/\s/g, "")}` },
    whatsapp && { k: "WhatsApp", v: "Message us", href: `https://wa.me/${whatsapp}`, ext: true },
    location && { k: "Based in", v: location },
  ].filter(Boolean) as { k: string; v: string; href?: string; ext?: boolean }[];
  if (!rows.length) return "";
  return html`<dl class="contact__details mono">${rows.map(
    (r) => html`<div><dt>${esc(r.k)}</dt><dd>${r.href ? html`<a href="${esc(r.href)}" ${r.ext ? 'target="_blank" rel="noopener noreferrer"' : ""}>${esc(r.v)}</a>` : esc(r.v)}</dd></div>`
  )}</dl>`;
};

/* ── 11 CONTACT — ORANGE ──────────────────────────────────── */
export const contactSection = () => html`<section class="contact" id="contact" data-theme="orange" ${chapterAttr("contact")} aria-labelledby="contact-title">
  <div class="contact__head grid">
    ${label(chapters.contact.n, chapters.contact.label, "contact__label")}
    <p class="contact__st mono" aria-hidden="true">Status / Accepting briefs</p>
    <h2 class="contact__title display" id="contact-title"><span class="ln"><span class="ln__i">Have</span></span> <span class="ln"><span class="ln__i">an idea?</span></span></h2>
    <p class="contact__serif serif"><em class="serif">Let's build it.</em></p>
  </div>

  <div class="contact__body grid">
    <aside class="contact__side">
      <p class="contact__lede">A few details are all we need. We'll read every word, then reply with honest next steps — no jargon, no pressure.</p>
      <ol class="contact__steps mono" role="list" aria-label="What happens next">
        <li data-cstep="1"><span>01 /</span><span>You share the brief</span><b data-cstep-status>Waiting</b></li>
        <li data-cstep="2"><span>02 /</span><span>We reply with questions &amp; next steps</span><b>Queued</b></li>
        <li data-cstep="3"><span>03 /</span><span>We agree scope, timeline &amp; quote</span><b>Queued</b></li>
      </ol>
      ${details()}
    </aside>

    <div class="contact__formwrap">
      <form class="form" data-form novalidate
        data-endpoint="${esc(site.form.endpoint)}"
        data-extra="${esc(JSON.stringify(site.form.extra))}"
        data-email="${esc(site.contact.email)}"
        data-whatsapp="${esc(site.contact.whatsapp)}"
        aria-describedby="form-note">
        <div class="form__grid">
          ${field(1, { id: "name", label: "Your name", required: true, autocomplete: "name", placeholder: "Full name", max: 80 })}
          ${field(2, { id: "email", label: "Email", type: "email", required: true, autocomplete: "email", placeholder: "you@business.com", max: 120 })}
          ${field(3, { id: "phone", label: "Phone / WhatsApp", type: "tel", autocomplete: "tel", inputmode: "tel", placeholder: "+91 …", max: 20 })}
          ${field(4, { id: "company", label: "Company / Business", autocomplete: "organization", placeholder: "Business name", max: 100 })}
          ${choices(5, "type", "Type of website", websiteTypes, true)}
          ${choices(6, "budget", "Estimated budget", budgets, false)}
          <div class="f f--full f--details">
            <label class="f__label mono" for="f-details"><span class="f__n">07 /</span>Project details${req(true)}</label>
            <textarea class="f__input f__area" id="f-details" name="details" rows="6" required minlength="20" maxlength="2000"
              placeholder="What are you building, who is it for, and when do you need it?" aria-describedby="f-details-err f-details-count"></textarea>
            <span class="f__rule" aria-hidden="true"></span>
            <div class="f__row">
              <p class="f__err mono" id="f-details-err" data-error-for="details"></p>
              <p class="f__count mono" id="f-details-count" data-count>0000 / 2000</p>
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
            <span class="btn__label">Send the brief</span>
            <span class="btn__spinner" aria-hidden="true"></span>
            ${arrow("ne", "form__arw")}
          </button>
        </div>
        <p class="form__status" role="status" aria-live="polite" data-status></p>
      </form>

      <div class="form__success" data-success hidden tabindex="-1">
        <p class="mono">Status / Received</p>
        <h3 class="form__done display">Brief received.</h3>
        <p class="form__thanks">Thanks — your project is in the lab. We'll get back to you shortly with next steps.</p>
        <button class="cta cta--ink" type="button" data-reset data-cursor="go"><span class="cta__t">Send another</span>${arrow("e", "cta__a")}</button>
      </div>
    </div>
  </div>
</section>`;
