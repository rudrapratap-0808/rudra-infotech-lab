import { abs, allProjects, D, projectPath } from "../data/store.js";
import { html } from "../lib/html.js";
import { appsSection } from "../components/apps.js";
import { contactSection } from "../components/contact.js";
import { hero } from "../components/hero.js";
import { philosophySection } from "../components/philosophy.js";
import { lab, manifesto, processSection, toolkit, why } from "../components/sections.js";
import { servicesSection } from "../components/services.js";
import { work } from "../components/work.js";
import { itemListLd, orgLd, pageLd, projectLd, websiteLd } from "./seo.js";

export const homeMeta = () => {
  const { seo } = D();
  return { title: seo.site_title, description: seo.meta_description, ogTitle: seo.og_title || seo.site_title, ogDescription: seo.og_description || seo.meta_description };
};

export const homeJsonLd = () => {
  const m = homeMeta();
  const work = allProjects();
  return [
    orgLd(),
    websiteLd(),
    ...pageLd({ path: "/", title: m.title, description: m.description }),
    ...(work.length ? [itemListLd("Selected work", work.map((p) => ({ url: abs(projectPath(p)), name: p.name }))), ...work.map((p) => projectLd(p, false))] : []),
  ];
};

export const home = () => html`
${hero()}
${philosophySection()}
${work()}
${appsSection()}
${servicesSection()}
${why()}
${processSection()}
${toolkit()}
${lab()}
${manifesto()}
${contactSection()}
`;
