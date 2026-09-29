import { services } from "../data/content.js";
import { projects } from "../data/projects.js";
import { site, socialLinks } from "../data/site.js";
import { html } from "../lib/html.js";
import { contactSection } from "../components/contact.js";
import { hero } from "../components/hero.js";
import { processSection } from "../components/process.js";
import { about, cta, statement, techSection, why } from "../components/sections.js";
import { servicesSection } from "../components/services.js";
import { work, type Shot } from "../components/work.js";

export const homeMeta = {
  title: "Rudra InfoTech Lab — Web Design & Development Agency",
  description:
    "Web development agency building fast, responsive, business-focused websites: business sites, e-commerce, landing pages, redesigns and custom builds.",
};

export const homeJsonLd = () => {
  const org = `${site.url}/#organization`;
  const contact = site.contact;
  return [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": org,
      name: site.name,
      alternateName: site.short,
      url: site.url,
      logo: `${site.url}/icon-512.png`,
      image: `${site.url}/og.png`,
      description: site.description,
      ...(contact.email ? { email: contact.email } : {}),
      ...(contact.phone ? { telephone: contact.phone } : {}),
      ...(contact.location ? { areaServed: contact.location } : {}),
      ...(socialLinks().length ? { sameAs: socialLinks().map((s) => s.href) } : {}),
      knowsAbout: ["Web development", "Website design", "E-commerce development", "Landing pages", "Performance optimization"],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Web development services",
        itemListElement: services.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.name, description: s.body },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      publisher: { "@id": org },
      inLanguage: site.lang,
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Selected work",
      itemListElement: projects.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "CreativeWork", name: p.name, url: p.url, creator: { "@id": org } },
      })),
    },
  ];
};

export const home = (shots: Record<string, Shot>) => html`
${hero()}
${statement()}
${work(shots)}
${servicesSection()}
${why()}
${processSection()}
${techSection()}
${about()}
${cta()}
${contactSection()}
`;
