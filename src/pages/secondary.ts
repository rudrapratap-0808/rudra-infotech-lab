import { site } from "../data/site.js";
import { esc, html } from "../lib/html.js";
import { icon } from "../components/icons.js";
import { button, eyebrow, heading } from "../components/ui.js";

/* ── Privacy ──────────────────────────────────────────────── */
export const privacyMeta = {
  title: "Privacy Note — Rudra InfoTech Lab",
  description: "How Rudra InfoTech Lab handles the information you share through our website and project enquiry form.",
};

export const privacy = () => {
  const updated = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const email = site.contact.email;
  return html`<section class="page-hero" id="top" aria-labelledby="privacy-title">
  <div class="container">
    ${eyebrow("—", "Legal")}
    ${heading("Privacy, *in plain English.*", "h1", "h1", "privacy-title")}
    <p class="page-hero__meta mono" data-reveal>Last updated ${esc(updated)}</p>
  </div>
</section>
<section class="legal" aria-label="Privacy details">
  <div class="container legal__grid">
    <div class="legal__body">
      <h2>What we collect</h2>
      <p>When you send a project enquiry, we receive the details you type into the form: your name, email address, and — if you choose to share them — your phone or WhatsApp number, business name, website type, budget range and project details.</p>
      <h2>Why we collect it</h2>
      <p>Only to reply to your enquiry and discuss your project. We don't sell your information, and we don't add you to marketing lists without asking.</p>
      <h2>How it's handled</h2>
      <p>Form submissions may be delivered through a third-party form service or messaging app so that they reach our inbox. Those providers process the data solely to deliver your message.</p>
      <h2>How long we keep it</h2>
      <p>We keep enquiry details for as long as needed to respond and, if we work together, to deliver your project.</p>
      <h2>Your choices</h2>
      <p>You can ask us at any time to see, correct or delete the information you've shared${email ? html` by writing to <a class="ulink" href="mailto:${esc(email)}">${esc(email)}</a>` : " through the contact form"}.</p>
      <h2>Cookies</h2>
      <p>This website doesn't use advertising or tracking cookies.</p>
      <div class="legal__cta">${button("Back to home", "/", "ghost", "md")}</div>
    </div>
  </div>
</section>`;
};

/* ── 404 ──────────────────────────────────────────────────── */
export const notFoundMeta = {
  title: "Page Not Found — Rudra InfoTech Lab",
  description: "This page doesn't exist. Head back to Rudra InfoTech Lab to see our work or start a project.",
};

export const notFound = () => html`<section class="nf" id="top" aria-labelledby="nf-title">
  <div class="nf__grid" aria-hidden="true"></div>
  <div class="container nf__inner">
    <p class="nf__code mono" data-reveal><span>ERR</span> 404 — route not found</p>
    ${heading("This page wandered *off the grid.*", "h1", "h1 nf__title", "nf-title")}
    <p class="nf__lede" data-reveal>The link may be broken, or the page may have moved. Everything worth seeing is one click away.</p>
    <div class="nf__ctas" data-reveal>
      ${button("Back to home", "/", "ember", "lg")}
      <a class="btn btn--ghost btn--lg" href="/#work" data-magnetic><span class="btn__label">View Our Work</span>${icon.arrowRight}</a>
    </div>
  </div>
</section>`;
