import { chapters, site } from "../data/site.js";
import { abs, apps, D, projectPath } from "../data/store.js";
import { chars, esc, html, nn } from "../lib/html.js";
import { appBlock } from "../components/apps.js";
import { chapterRaw, gridLines } from "../components/ui.js";
import { clip, contactFor, ctaBand } from "./projects.js";
import { itemListLd, pageLd, projectLd } from "./seo.js";

const APPS = `/ ${chapters.apps.n} ${chapters.apps.label}`;

export const appsMeta = () => ({
  title: `Mobile Apps — Android | ${site.name}`,
  description: clip(`Android apps designed and built by ${site.name}${apps().length ? `, including ${apps().map((a) => a.name).join(", ")}` : ""} — available on Google Play.`, 160),
});

export const appsPage = () => {
  const list = apps();
  return html`<section class="ai" id="top" data-theme="ink" ${chapterRaw(APPS)} aria-labelledby="ai-title">
  ${gridLines("gridlines ai__grid")}
  <p class="ai__meta mono"><span>${esc(APPS)}</span><span>Platform / Android</span><span>Index / ${nn(list.length)} ${list.length === 1 ? "app" : "apps"}</span></p>
  <h1 class="ai__title" id="ai-title"><span class="sr-only">Mobile apps</span><span class="ai__word display" aria-hidden="true">${chars("APPS")}</span></h1>
  <p class="ai__text">${esc(D().content.apps.description)}</p>
</section>
<section class="apps apps--page" data-theme="paper" ${chapterRaw(APPS)} aria-label="Apps">
  ${list.length ? html`<div class="apps__list">${list.map((p) => appBlock(p, "h2"))}</div>` : html`<p class="plist__empty">Our first apps are on the way — check back soon.</p>`}
</section>
${ctaBand("Planning an app?", "Let's build it.", "Hi Rudra InfoTech Lab, I’m interested in discussing an Android app project.", contactFor("Android Application"), "Discuss your app")}`;
};

export const appsLd = () => {
  const m = appsMeta();
  return [
    ...pageLd({ path: "/apps/", title: m.title, description: m.description, type: "CollectionPage", breadcrumb: [["Home", "/"], ["Apps", "/apps/"]] }),
    itemListLd("Apps", apps().map((p) => ({ url: abs(projectPath(p)), name: p.name }))),
    ...apps().map((p) => projectLd(p, false)),
  ];
};
