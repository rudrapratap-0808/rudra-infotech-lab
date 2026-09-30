import { paragraphs, type ServiceRec } from "../data/model.js";
import { chapters, site } from "../data/site.js";
import { abs, D, processSteps, servicePath, services } from "../data/store.js";
import { chars, esc, html, nn } from "../lib/html.js";
import { arrow } from "../components/symbols.js";
import { displayLines, symbolFor } from "../components/services.js";
import { chapterRaw, gridLines, waCta } from "../components/ui.js";
import { clip, contactFor, ctaBand } from "./projects.js";
import { itemListLd, pageLd, serviceLd } from "./seo.js";

const SVC = `/ ${chapters.services.n} ${chapters.services.label}`;

/** The contact-form service option that best matches a service (shared word stems). */
export const formServiceFor = (s: ServiceRec): string | undefined => {
  const stems = (t: string) => t.toLowerCase().replace(/&/g, " ").split(/[^a-z0-9-]+/).filter((w) => w.length > 2).map((w) => w.replace(/(ions?|s)$/, ""));
  const mine = new Set(stems(s.title));
  let best: string | undefined;
  let score = 0;
  for (const o of D().form.services) {
    const sc = stems(o).filter((w) => mine.has(w)).length;
    if (sc > score) [best, score] = [o, sc];
  }
  return best;
};

const serviceMessage = (s: ServiceRec) => `Hi Rudra InfoTech Lab, I’m interested in your ${s.title} service.`;

/* ── /services/ ───────────────────────────────────────────── */
export const servicesIndexMeta = () => ({
  title: `Services — Web Design, Development & Apps | ${site.name}`,
  description: clip(`${services().map((s) => s.title).join(", ")} — ${D().content.services.description}`, 160),
});

export const servicesIndex = () => {
  const list = services();
  const c = D().content.services;
  return html`<section class="sx" id="top" data-theme="blue" ${chapterRaw(SVC)} aria-labelledby="sx-title">
  ${gridLines("gridlines sx__grid")}
  <p class="sx__meta mono"><span>${esc(SVC)}</span><span>${nn(list.length)} disciplines</span><span>One lab / one standard</span></p>
  <h1 class="sx__title" id="sx-title"><span class="sr-only">Services</span><span class="sx__word display" aria-hidden="true">${chars("SERVICES")}</span></h1>
  <p class="sx__lede">${esc(c.heading)} <em class="serif">${esc(c.highlight)}</em></p>
  <p class="sx__aside">${esc(c.description)}</p>
</section>
<section class="slist" data-theme="paper" ${chapterRaw(SVC)} aria-label="All services">
  <ol class="slist__list" role="list">
    ${list.map(
      (s, i) => html`<li class="sr">
      <a class="sr__link" href="${servicePath(s)}" data-cursor="go">
        <span class="sr__n mono">S / ${nn(i + 1)}</span>
        <span class="sr__name display">${esc(s.title)}</span>
        <span class="sr__line">${esc(s.short_description)}</span>
        <span class="sr__points mono">${s.points.map((p) => html`<span>${esc(p)}</span>`)}</span>
        <span class="sr__sym" aria-hidden="true">${symbolFor(s)}</span>
        ${arrow("e", "sr__a")}
      </a>
    </li>`
    )}
  </ol>
</section>
${ctaBand("Not sure what you need?", "Tell us the goal.", "Hi Rudra InfoTech Lab, I’m interested in discussing a website/app project.", "/contact/")}`;
};

export const servicesIndexLd = () => {
  const m = servicesIndexMeta();
  return [
    ...pageLd({ path: "/services/", title: m.title, description: m.description, type: "CollectionPage", breadcrumb: [["Home", "/"], ["Services", "/services/"]] }),
    itemListLd("Services", services().map((s) => ({ url: abs(servicePath(s)), name: s.title }))),
    ...services().map(serviceLd),
  ];
};

/* ── /services/<slug>/ ────────────────────────────────────── */
export const serviceMeta = (s: ServiceRec) => ({
  title: s.seo_title || `${s.title} | ${site.name}`,
  description: s.seo_description || clip(`${s.short_description} ${paragraphs(s.full_description)[0] ?? ""}`.trim(), 160),
});

export const serviceLdAll = (s: ServiceRec) => {
  const m = serviceMeta(s);
  return [
    ...pageLd({ path: servicePath(s), title: m.title, description: m.description, breadcrumb: [["Home", "/"], ["Services", "/services/"], [s.title, servicePath(s)]] }),
    serviceLd(s),
  ];
};

export const servicePage = (s: ServiceRec) => {
  const list = services();
  const i = list.findIndex((x) => x.slug === s.slug);
  const others = list.filter((x) => x.slug !== s.slug);
  const steps = processSteps();
  const contact = contactFor(formServiceFor(s));
  return html`<header class="sd" id="top" data-theme="blue" ${chapterRaw(SVC)}>
  ${gridLines("gridlines sd__grid")}
  <nav class="sd__crumbs mono" aria-label="Breadcrumb"><ol role="list"><li><a class="ulink" href="/">Home</a></li><li><a class="ulink" href="/services/">Services</a></li><li aria-current="page">${esc(s.title)}</li></ol></nav>
  <p class="sd__n mono"><span>S / ${nn(i + 1)}</span><span>${nn(list.length)}</span></p>
  <span class="sd__sym" aria-hidden="true">${symbolFor(s)}</span>
  <h1 class="sd__name display">${displayLines(s).map((l) => html`<span class="ln"><span class="ln__i">${esc(l)}</span></span>`).join(" ")}</h1>
  <p class="sd__line">${esc(s.short_description)}</p>
  <div class="sd__ctas">
    ${waCta("Chat about this service", serviceMessage(s), "paper")}
    <a class="cta cta--line" href="${esc(contact)}" data-cursor="go"><span class="cta__t">Start a project</span>${arrow("ne", "cta__a")}</a>
  </div>
</header>
<section class="sb grid" data-theme="paper" ${chapterRaw(SVC)} aria-labelledby="sb-h">
  <h2 class="sb__h mono" id="sb-h">/ What it is</h2>
  <div class="sb__text">${paragraphs(s.full_description).map((p) => html`<p>${esc(p)}</p>`)}</div>
  ${s.points.length
    ? html`<div class="sb__inc">
    <h2 class="sb__h mono">/ What's included</h2>
    <ul class="sb__points" role="list">${s.points.map((p, k) => html`<li><span class="mono">${nn(k + 1)}</span>${esc(p)}</li>`)}</ul>
  </div>`
    : ""}
  ${steps.length
    ? html`<div class="sb__how">
    <h2 class="sb__h mono">/ How we work</h2>
    <ol class="sb__steps mono" role="list">${steps.map((st, k) => html`<li><span>${nn(k + 1)}</span><span>${esc(st.name)}</span></li>`)}</ol>
    <a class="tlink mono" href="/#process"><span>See the full process</span>${arrow("e", "tlink__a")}</a>
  </div>`
    : ""}
</section>
${others.length
  ? html`<nav class="so" data-theme="paper" ${chapterRaw(SVC)} aria-labelledby="so-h">
  <h2 class="so__h mono" id="so-h">/ Other services</h2>
  <ul class="so__list" role="list">${others.map((o) => html`<li><a class="so__link" href="${servicePath(o)}"><span class="display">${esc(o.title)}</span>${arrow("e")}</a></li>`)}</ul>
</nav>`
  : ""}
${ctaBand(`Need ${s.title.toLowerCase()}?`, "Let's talk it through.", serviceMessage(s), contact, "Chat about this service")}`;
};
