import { services } from "../data/content.js";
import { projects } from "../data/projects.js";
import { site, socialLinks } from "../data/site.js";
import { html } from "../lib/html.js";
import { contactSection } from "../components/contact.js";
import { hero } from "../components/hero.js";
import { philosophySection } from "../components/philosophy.js";
import { lab, manifesto, processSection, toolkit, why } from "../components/sections.js";
import { servicesSection } from "../components/services.js";
import { work, type Media } from "../components/work.js";

export const homeMeta = {
  title: "Rudra InfoTech Lab — Web Design & Development Agency",
  description:
    "Web development agency building fast, responsive, business-focused websites: business sites, e-commerce, landing pages, redesigns and custom builds.",
};

export const homeJsonLd = () => {
  const org = `${site.url}/#organization`;
  const c = site.contact;
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
      ...(c.email ? { email: c.email } : {}),
      ...(c.phone ? { telephone: c.phone } : {}),
      ...(c.location ? { areaServed: c.location } : {}),
      ...(socialLinks().length ? { sameAs: socialLinks().map((s) => s.href) } : {}),
      knowsAbout: ["Web development", "Website design", "E-commerce development", "Landing pages", "Performance optimization"],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Web development services",
        itemListElement: services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name, description: s.body } })),
      },
    },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: site.name, publisher: { "@id": org }, inLanguage: site.lang },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Selected work",
      itemListElement: projects.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "CreativeWork", name: p.name, url: p.url, description: p.summary, creator: { "@id": org } },
      })),
    },
  ];
};

export const home = (media: Record<string, Media>) => html`
${hero()}
${philosophySection()}
${work(media)}
${servicesSection()}
${why()}
${processSection()}
${toolkit()}
${lab()}
${manifesto()}
${contactSection()}
`;
