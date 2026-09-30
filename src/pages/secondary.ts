import { site } from "../data/site.js";
import { D } from "../data/store.js";
import { chars, esc, html } from "../lib/html.js";
import { contactSection } from "../components/contact.js";
import { gridLines, cta, tlink } from "../components/ui.js";
import { pageLd } from "./seo.js";

/* ── Contact ──────────────────────────────────────────────── */
export const contactMeta = () => ({
  title: `Contact — Start a Project | ${site.name}`,
  description: `Tell ${site.name} about your website or app project — send a brief or chat on WhatsApp. We reply with honest next steps.`,
});
export const contactLd = () => {
  const m = contactMeta();
  return pageLd({ path: "/contact/", title: m.title, description: m.description, type: "ContactPage", breadcrumb: [["Home", "/"], ["Contact", "/contact/"]] });
};
export const contactPage = () => contactSection({ level: "h1", id: "contact" });

/* ── Privacy ──────────────────────────────────────────────── */
export const privacyMeta = () => ({
  title: `Privacy Note | ${site.name}`,
  description: `How ${site.name} handles the information you share through our website, project enquiry form and WhatsApp.`,
});

const SECTIONS: [string, string][] = [
  ["What we collect", "When you send a project enquiry, we receive the details you type into the form: your name, email address, and — if you choose to share them — your phone or WhatsApp number, business name, the service you need, your budget range and project details. We also store the page you sent it from and a one-way hash of your IP address, used only to stop spam."],
  ["Why we collect it", "Only to reply to your enquiry and discuss your project. We don't sell your information, and we don't add you to marketing lists without asking."],
  ["How it's handled", "Enquiries are stored in our private project database (hosted by Supabase) and may also reach us as an email notification. Only our team can read them. If you message us on WhatsApp, that conversation is handled by WhatsApp under its own terms."],
  ["How long we keep it", "We keep enquiry details for as long as needed to respond and, if we work together, to deliver your project."],
  ["Your choices", "__CHOICES__"],
  ["Cookies", "This website doesn't use advertising or tracking cookies."],
];

export const privacy = () => {
  const updated = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const email = D().contact.email;
  const choices = `You can ask us at any time to see, correct or delete the information you've shared${
    email ? ` by writing to <a class="ulink" href="mailto:${esc(email)}">${esc(email)}</a>` : ` through the <a class="ulink" href="/contact/">contact page</a>`
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
export const notFoundMeta = () => ({
  title: `Page Not Found | ${site.name}`,
  description: `This page doesn't exist. Head back to ${site.name} to see our work or start a project.`,
});

export const notFound = () => html`<section class="nf" id="top" data-theme="orange" data-chapter="/ 404 Not found" aria-labelledby="nf-title">
  ${gridLines("gridlines nf__grid")}
  <p class="nf__meta mono"><span>ERR / 404</span><span>Route not found</span><span>X: 0404 Y: 0404</span></p>
  <p class="nf__code display" aria-hidden="true">404</p>
  <h1 class="nf__title display" id="nf-title">Off the grid.</h1>
  <p class="nf__serif serif"><em class="serif">This page wandered off.</em></p>
  <div class="nf__ctas">
    ${cta("Back to home", "/", "ink", "e")}
    ${tlink("View our work", "/projects/", "e")}
  </div>
</section>`;
