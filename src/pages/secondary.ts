import { site } from "../data/site.js";
import { chars, esc, html } from "../lib/html.js";
import { gridLines, cta, tlink } from "../components/ui.js";

/* ── Privacy ──────────────────────────────────────────────── */
export const privacyMeta = {
  title: "Privacy Note — Rudra InfoTech Lab",
  description: "How Rudra InfoTech Lab handles the information you share through our website and project enquiry form.",
};

const SECTIONS: [string, string][] = [
  ["What we collect", "When you send a project enquiry, we receive the details you type into the form: your name, email address, and — if you choose to share them — your phone or WhatsApp number, business name, website type, budget range and project details."],
  ["Why we collect it", "Only to reply to your enquiry and discuss your project. We don't sell your information, and we don't add you to marketing lists without asking."],
  ["How it's handled", "Form submissions may be delivered through a third-party form service or messaging app so that they reach our inbox. Those providers process the data solely to deliver your message."],
  ["How long we keep it", "We keep enquiry details for as long as needed to respond and, if we work together, to deliver your project."],
  ["Your choices", "__CHOICES__"],
  ["Cookies", "This website doesn't use advertising or tracking cookies."],
];

export const privacy = () => {
  const updated = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const email = site.contact.email;
  const choices = `You can ask us at any time to see, correct or delete the information you've shared${
    email ? ` by writing to <a class="ulink" href="mailto:${esc(email)}">${esc(email)}</a>` : " through the contact form"
  }.`;
  return html`<section class="pp" id="top" data-theme="paper" data-chapter="/ — Privacy" aria-labelledby="privacy-title">
  ${gridLines("gridlines pp__grid")}
  <p class="pp__meta mono"><span>/ Legal</span><span>Last updated ${esc(updated)}</span></p>
  <h1 class="pp__title" id="privacy-title"><span class="sr-only">Privacy note</span><span class="pp__word display" aria-hidden="true">${chars("PRIVACY")}</span></h1>
  <p class="pp__serif serif"><em class="serif">In plain English.</em></p>
</section>
<section class="legal grid" data-theme="paper" aria-label="Privacy details">
  ${SECTIONS.map(
    ([h, p], i) => html`<div class="legal__row">
      <h2 class="legal__h mono"><span>${String(i + 1).padStart(2, "0")} /</span> ${esc(h)}</h2>
      <p class="legal__p">${p === "__CHOICES__" ? choices : esc(p)}</p>
    </div>`
  )}
  <div class="legal__cta">${cta("Back to home", "/", "ink", "e")}</div>
</section>`;
};

/* ── 404 ──────────────────────────────────────────────────── */
export const notFoundMeta = {
  title: "Page Not Found — Rudra InfoTech Lab",
  description: "This page doesn't exist. Head back to Rudra InfoTech Lab to see our work or start a project.",
};

export const notFound = () => html`<section class="nf" id="top" data-theme="orange" data-chapter="/ 404 Not found" aria-labelledby="nf-title">
  ${gridLines("gridlines nf__grid")}
  <p class="nf__meta mono"><span>ERR / 404</span><span>Route not found</span><span>X: 0404 Y: 0404</span></p>
  <p class="nf__code display" aria-hidden="true">404</p>
  <h1 class="nf__title display" id="nf-title">Off the grid.</h1>
  <p class="nf__serif serif"><em class="serif">This page wandered off.</em></p>
  <div class="nf__ctas">
    ${cta("Back to home", "/", "ink", "e")}
    ${tlink("View our work", "/#work", "e")}
  </div>
</section>`;
