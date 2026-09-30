/** Structured data (schema.org JSON-LD) — factual fields only: no ratings, reviews or download counts. */
import { isApp, PLATFORM_TEXT, type ProjectRec, type ServiceRec } from "../data/model.js";
import { OG_IMAGE } from "../data/seed.js";
import { site } from "../data/site.js";
import { abs, baseUrl, D, projectPath, servicePath, services, socialLinks } from "../data/store.js";
import { safeUrl } from "../lib/html.js";

const CTX = "https://schema.org";
export const orgId = () => `${baseUrl()}/#organization`;
export const websiteId = () => `${baseUrl()}/#website`;

export const orgLd = () => {
  const { contact, seo } = D();
  const socials = socialLinks().map((s) => s.href);
  return {
    "@context": CTX,
    "@type": ["Organization", "ProfessionalService"],
    "@id": orgId(),
    name: site.name,
    alternateName: site.short,
    url: `${baseUrl()}/`,
    logo: abs("/icon-512.png"),
    image: abs(safeUrl(seo.og_image) || OG_IMAGE),
    description: seo.meta_description,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.whatsapp
      ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: `+${contact.whatsapp}`, url: `https://wa.me/${contact.whatsapp}` } }
      : {}),
    ...(contact.location ? { areaServed: contact.location } : {}),
    ...(socials.length ? { sameAs: socials } : {}),
    knowsAbout: ["Web development", "Website design", "E-commerce development", "Landing pages", "Android app development", "Performance optimization"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services().map((s) => ({ "@type": "Offer", itemOffered: { "@id": `${abs(servicePath(s))}#service` } })),
    },
  };
};

export const websiteLd = () => ({
  "@context": CTX,
  "@type": "WebSite",
  "@id": websiteId(),
  url: `${baseUrl()}/`,
  name: site.name,
  publisher: { "@id": orgId() },
  inLanguage: site.lang,
});

export const pageLd = (o: { path: string; title: string; description: string; type?: string; image?: string | null; breadcrumb?: [string, string][] }) => {
  const url = abs(o.path);
  return [
    {
      "@context": CTX,
      "@type": o.type ?? "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: o.title,
      description: o.description,
      isPartOf: { "@id": websiteId() },
      about: { "@id": orgId() },
      inLanguage: site.lang,
      ...(o.image ? { primaryImageOfPage: { "@type": "ImageObject", url: abs(o.image) } } : {}),
      ...(o.breadcrumb ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
    },
    ...(o.breadcrumb
      ? [
          {
            "@context": CTX,
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumb`,
            itemListElement: o.breadcrumb.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
          },
        ]
      : []),
  ];
};

const projectImage = (p: ProjectRec) => safeUrl(p.social_image) || safeUrl(p.featured_image) || safeUrl(p.desktop_screenshot) || safeUrl(p.mobile_screenshot);

/** CreativeWork for a website project, SoftwareApplication for an app. */
export const projectLd = (p: ProjectRec, full = true) => {
  const page = abs(projectPath(p));
  const image = projectImage(p);
  const common = {
    name: p.name,
    description: p.short_description,
    ...(image ? { image: abs(image) } : {}),
    creator: { "@id": orgId() },
    ...(p.completion_year ? { dateCreated: String(p.completion_year) } : {}),
    ...(full ? { mainEntityOfPage: `${page}#webpage` } : {}),
  };
  if (isApp(p)) {
    const store = safeUrl(p.play_store_url);
    return {
      "@context": CTX,
      "@type": "SoftwareApplication",
      "@id": `${page}#app`,
      ...common,
      url: page,
      operatingSystem: PLATFORM_TEXT[p.platform],
      ...(p.app_category ? { applicationCategory: p.app_category } : {}),
      ...(store ? { installUrl: store, downloadUrl: store } : {}),
      ...(p.project_logo ? { thumbnailUrl: abs(p.project_logo) } : {}),
    };
  }
  const live = safeUrl(p.live_url);
  return {
    "@context": CTX,
    "@type": "CreativeWork",
    "@id": `${page}#work`,
    ...common,
    url: live || page,
    ...(p.project_type ? { genre: p.project_type.toLowerCase() } : {}),
    ...(p.technologies.length ? { keywords: p.technologies.join(", ") } : {}),
  };
};

export const serviceLd = (s: ServiceRec) => ({
  "@context": CTX,
  "@type": "Service",
  "@id": `${abs(servicePath(s))}#service`,
  name: s.title,
  serviceType: s.title,
  description: s.short_description,
  url: abs(servicePath(s)),
  provider: { "@id": orgId() },
});

export const itemListLd = (name: string, items: { url: string; name: string }[]) => ({
  "@context": CTX,
  "@type": "ItemList",
  name,
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: it.url, name: it.name })),
});
