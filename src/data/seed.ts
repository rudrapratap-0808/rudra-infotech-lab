/**
 * ─────────────────────────────────────────────────────────────
 *  SEED CONTENT
 *
 *  Used when the build has no Supabase connection, and turned into
 *  supabase/seed.sql (`npm run sql`) so a fresh database starts with
 *  exactly what the site shows today. Once Supabase is connected, edit
 *  content in the admin panel instead of here.
 *
 *  Project facts were verified from each project's own source repository
 *  (page titles, meta descriptions, routes, package.json). MightyMindz.in
 *  has no repository available, so its entry stays deliberately neutral.
 *  THE LORD CAFE imagery is the brand's own photography and logo — not
 *  app screenshots (upload real screenshots in the admin to replace them).
 * ─────────────────────────────────────────────────────────────
 */
import type { Content, ContactSettings, FormSettings, ProcessRec, ProjectRec, SeoSettings, ServiceRec, SiteData, TechRec } from "./model.js";

const project = (p: Omit<ProjectRec, "status" | "images" | "technologies"> & Partial<Pick<ProjectRec, "status" | "images" | "technologies">>): ProjectRec => ({
  status: "published",
  images: [],
  technologies: [],
  ...p,
});

export const seedProjects: ProjectRec[] = [
  project({
    slug: "dotaanke-store",
    name: "Dotaanke.store",
    short_description:
      "An online store for hand-embroidered Indian shirts and kurtis — shop, product pages, wishlist, checkout and order tracking.",
    full_description:
      "Dotaanke sells hand-embroidered Indian shirts and kurtis. The store covers the full path from browsing to delivery: a shop with product pages, a wishlist, checkout and order tracking.",
    project_type: "E-COMMERCE",
    category: "E-commerce",
    platform: "web",
    live_url: "https://dotaanke.store",
    featured_image: "/work/dotaanke-store-hero.webp",
    accent: "#e56d7a",
    headline: "Every stitch tells a story.",
    image_alt: "Gold hand embroidery on ivory fabric — hero image from the Dotaanke.store homepage",
    featured: true,
    display_order: 1,
    technologies: ["React", "TanStack Start", "Tailwind CSS", "Supabase", "Razorpay"],
  }),
  project({
    slug: "rojgarlelo-site",
    name: "RojgarLelo.site",
    short_description:
      "Recruitment listings for job seekers across India — searchable openings, detailed job pages and an admin area for publishing new roles.",
    full_description:
      "RojgarLelo lists job openings for job seekers across India. Visitors can search openings and read detailed job pages; the team publishes new roles from an admin area.",
    project_type: "WEB APPLICATION",
    category: "Job portal",
    platform: "web",
    live_url: "https://rojgarlelo.site",
    accent: "#1779e1",
    headline: "Find a job that fits your life",
    featured: true,
    display_order: 2,
    technologies: ["React", "TanStack Start", "Tailwind CSS", "Supabase"],
  }),
  project({
    slug: "mightymindz-in",
    name: "MightyMindz.in",
    short_description: "A live website designed and built by the lab. Visit the site to see it in action.",
    project_type: null,
    category: "Web development",
    platform: "web",
    live_url: "https://mightymindz.in",
    accent: "#dfff36",
    featured: true,
    display_order: 3,
  }),
  project({
    slug: "sarkar2-0-pw",
    name: "Sarkar2-0.pw",
    short_description:
      "Connects people across Uttar Pradesh with verified electricians, plumbers, painters and mechanics — plus an electrical & electronics store, in Hindi and English.",
    full_description:
      "Sarkar2.0 connects people across Uttar Pradesh with verified electricians, plumbers, painters and mechanics. It also runs an electrical and electronics store.\n\nThe whole platform works in Hindi and English.",
    project_type: "WEB APPLICATION",
    category: "Services marketplace",
    platform: "web",
    live_url: "https://sarkar2-0.pw",
    featured_image: "/work/sarkar2-0-pw-hero.webp",
    accent: "#f52027",
    headline: "Every mistri, one platform.",
    image_alt: "Skilled workers in hard hats — hero image from the Sarkar2.0 homepage",
    featured: true,
    display_order: 4,
    technologies: ["React", "TanStack Start", "Tailwind CSS", "Supabase"],
  }),
  project({
    slug: "rahulconstructionwork-site",
    name: "RahulConstructionWork.site",
    short_description:
      "The website of a Haridwar construction and interiors firm — services, project portfolio, the build process and a quote request form.",
    full_description:
      "The website of a construction and interiors firm in Haridwar. It presents the firm's services, a portfolio of completed projects and its build process, and collects quote requests through a form.",
    project_type: "BUSINESS WEBSITE",
    category: "Business website",
    platform: "web",
    live_url: "https://rahulconstructionwork.site",
    featured_image: "/work/rahulconstructionwork-site-hero.webp",
    accent: "#ddb049",
    headline: "Building Dreams, Designing Excellence",
    image_alt: "A modern villa lit at dusk beside a pool — from the Rahul Construction Works portfolio",
    featured: true,
    display_order: 5,
    technologies: ["React", "TanStack Start", "Tailwind CSS", "Supabase"],
  }),
  project({
    slug: "the-lord-cafe",
    name: "THE LORD CAFE",
    short_description: "The Android app of THE LORD CAFE, a wood-fired pizza brand — live on Google Play.",
    full_description:
      "THE LORD CAFE is a wood-fired pizza brand. Its Android app is published on Google Play.\n\nThe imagery here is the brand's own photography and logo.",
    project_type: "ANDROID APPLICATION",
    category: "Food & drink",
    platform: "android",
    client_name: "THE LORD CAFE",
    play_store_url: "https://play.google.com/store/apps/details?id=com.thelordcafe.pizza&pli=1",
    project_logo: "/work/the-lord-cafe-icon.png",
    featured_image: "/work/the-lord-cafe-hero.webp",
    accent: "#f0f0d8", // the cream of the brand's logo
    headline: "Wood-Fired Pizza Delivered in 30 Minutes",
    image_alt: "A wood-fired margherita pizza on a wooden peel — brand photography from THE LORD CAFE",
    featured: true,
    display_order: 6,
    images: [
      { url: "/work/the-lord-cafe-margherita-phone.webp", kind: "gallery", alt: "Wood-fired margherita pizza — brand photography from THE LORD CAFE", display_order: 1 },
      { url: "/work/the-lord-cafe-pepperoni-phone.webp", kind: "gallery", alt: "Pepperoni pizza — brand photography from THE LORD CAFE", display_order: 2 },
      { url: "/work/the-lord-cafe-burger-phone.webp", kind: "gallery", alt: "A burger — brand photography from THE LORD CAFE", display_order: 3 },
    ],
  }),
];

export const seedServices: ServiceRec[] = [
  {
    slug: "website-design",
    title: "Website Design",
    display: "Website|Design",
    short_description: "Interfaces shaped around your business.",
    full_description:
      "Modern UI/UX and visual systems designed around your brand, your audience and the one action you need visitors to take.\n\nWe start from how your customers decide, then shape the layout, typography and visual direction around that decision — so the site looks like you and works for you.",
    points: ["UI / UX design", "Visual direction", "Design systems"],
    symbol: "design",
    display_order: 1,
    published: true,
  },
  {
    slug: "web-development",
    title: "Web Development",
    display: "Web|Development",
    short_description: "Production-ready, from the first commit.",
    full_description:
      "Responsive, scalable websites built with clean, maintainable code — engineered to load fast and hold up as you grow.\n\nFrom static marketing sites to custom web applications with logins, dashboards and databases, we build what the project needs and nothing it doesn't.",
    points: ["Responsive builds", "Clean code", "Deployment"],
    symbol: "development",
    display_order: 2,
    published: true,
  },
  {
    slug: "business-websites",
    title: "Business Websites",
    display: "Business|Websites",
    short_description: "Credibility, on every screen.",
    full_description:
      "Professional websites that tell your story clearly, earn trust in seconds and turn visitors into enquiries.\n\nServices, portfolio, contact and quote forms — structured so a visitor always knows what you do and how to reach you.",
    points: ["Clear messaging", "Enquiry flows", "Local presence"],
    symbol: "business",
    display_order: 3,
    published: true,
  },
  {
    slug: "ecommerce-development",
    title: "E-commerce Development",
    display: "E-commerce|Development",
    short_description: "Storefronts built to sell.",
    full_description:
      "Modern online stores designed around your products — clean browsing, confident checkout, fewer abandoned carts.\n\nProduct catalogues, wishlists, payments and order tracking, designed mobile-first because that's where your customers shop.",
    points: ["Product catalogues", "Checkout UX", "Mobile-first"],
    symbol: "ecommerce",
    display_order: 4,
    published: true,
  },
  {
    slug: "landing-pages",
    title: "Landing Pages",
    display: "Landing|Pages",
    short_description: "One page. One job. Done well.",
    full_description:
      "Focused pages for launches, campaigns, products and lead generation — built to convert, measured to improve.\n\nOne message, one action, no distractions.",
    points: ["Campaign pages", "Lead capture", "A/B-ready"],
    symbol: "landing",
    display_order: 5,
    published: true,
  },
  {
    slug: "website-redesign",
    title: "Website Redesign",
    display: "Website|Redesign",
    short_description: "Old site, new standard.",
    full_description:
      "We take outdated websites and rebuild them into modern experiences — keeping what works, fixing what doesn't.\n\nWe review what your current site does well, then rebuild the rest with a modern design and a faster, cleaner codebase.",
    points: ["UX audit", "Visual refresh", "Rebuild"],
    symbol: "redesign",
    display_order: 6,
    published: true,
  },
  {
    slug: "android-apps",
    title: "Android Apps",
    display: "Android|Apps",
    short_description: "Your business, in your customer's pocket.",
    full_description:
      "Android apps for businesses that want to be one tap away — designed around your brand and published on Google Play.\n\nWe can build the app alongside your website so both tell the same story.",
    points: ["Android apps", "Google Play release", "Brand-first UI"],
    symbol: "android",
    display_order: 7,
    published: true,
  },
  {
    slug: "performance-optimization",
    title: "Performance Optimization",
    display: "Performance|Optimization",
    short_description: "Every millisecond counts.",
    full_description:
      "We tune speed, responsiveness and Core Web Vitals so your site feels instant — for users and for search engines.\n\nImages, fonts, scripts and hosting: we find what slows your pages down and fix it.",
    points: ["Core Web Vitals", "Asset optimisation", "Technical SEO"],
    symbol: "performance",
    display_order: 8,
    published: true,
  },
  {
    slug: "maintenance-support",
    title: "Maintenance & Support",
    display: "Maintenance|& Support",
    short_description: "We don't disappear after launch.",
    full_description:
      "Ongoing updates, fixes, improvements and technical support — so your website keeps working as hard as you do.\n\nContent updates, new sections, fixes and technical help when you need it.",
    points: ["Updates & fixes", "Improvements", "Technical support"],
    symbol: "support",
    display_order: 9,
    published: true,
  },
];

export const seedProcess: ProcessRec[] = [
  { name: "Discover", description: "We learn your business, audience, objectives and requirements — before a single pixel is placed." },
  { name: "Design", description: "We establish the visual direction and user experience, and refine it with you until it's right." },
  { name: "Develop", description: "We turn the approved design into a fast, responsive, production-ready website." },
  { name: "Test", description: "We check responsiveness, usability, functionality and performance across devices and browsers." },
  { name: "Launch", description: "We prepare, configure and deploy the production website — then watch it go live." },
  { name: "Improve", description: "We keep refining the site when you need it: new features, updates and optimisations." },
].map((s, i) => ({ ...s, display_order: i + 1, published: true }));

const T = (name: string, kind: string, category: string, official_url: string | null, in_toolkit = true) => ({ name, kind, category, official_url, in_toolkit });
export const seedTech: TechRec[] = [
  T("HTML5", "Markup", "Frontend", "https://developer.mozilla.org/en-US/docs/Web/HTML"),
  T("CSS3", "Styling", "Frontend", "https://developer.mozilla.org/en-US/docs/Web/CSS"),
  T("JavaScript", "Language", "Language", "https://developer.mozilla.org/en-US/docs/Web/JavaScript"),
  T("TypeScript", "Typed language", "Language", "https://www.typescriptlang.org"),
  T("Angular", "Framework", "Frontend", "https://angular.dev"),
  T("React", "UI library", "Frontend", "https://react.dev"),
  T("Next.js", "React framework", "Frontend", "https://nextjs.org"),
  T("Node.js", "Runtime", "Backend", "https://nodejs.org"),
  T("Tailwind CSS", "Utility CSS", "Frontend", "https://tailwindcss.com"),
  T("Git", "Version control", "Tooling", "https://git-scm.com"),
  T("REST APIs", "Integration", "Backend", null),
  T("TanStack Start", "React framework", "Frontend", "https://tanstack.com/start", false),
  T("Supabase", "Backend platform", "Backend", "https://supabase.com", false),
  T("Razorpay", "Payments", "Payments", "https://razorpay.com", false),
].map((t, i) => ({ ...t, display_order: i + 1 }));

export const seedForm: FormSettings = {
  services: ["Website Design", "Web Development", "E-commerce", "Landing Page", "Website Redesign", "Web Application", "Android Application", "Custom Development"],
  budgets: ["Under ₹25k", "₹25k – ₹75k", "₹75k – ₹2L", "₹2L +", "Not sure yet"],
};

export const seedContact: ContactSettings = {
  email: "",
  phone: "",
  whatsapp: "351930656040",
  whatsapp_message: "Hi Rudra InfoTech Lab, I’m interested in discussing a website/app project.",
  instagram: "",
  linkedin: "",
  github: "",
  location: "",
  availability: "available",
  default_country_code: "91",
};

export const OG_IMAGE = "/og-v3.png";

export const seedSeo: SeoSettings = {
  site_title: "Rudra InfoTech Lab — Web Design & Development Agency",
  meta_description:
    "Web design & development agency building fast, responsive websites and Android apps — business sites, e-commerce, landing pages, redesigns and custom builds.",
  canonical_base_url: "",
  og_title: "Rudra InfoTech Lab — Websites & apps that make businesses impossible to ignore",
  og_description:
    "A web design and development lab building fast, responsive websites and Android apps for businesses, brands, startups and entrepreneurs.",
  og_image: OG_IMAGE,
  twitter_image: OG_IMAGE,
  favicon: "",
  app_icon: "",
  robots_index: true,
};

export const seedContent: Content = {
  hero: {
    meta_1: "/ Digital foundry",
    meta_2: "India / Worldwide",
    serif: "Impossible to ignore.",
    heading: "We build websites that make businesses impossible to ignore.",
    description: "Modern, fast, responsive digital experiences — designed and developed for businesses, brands, startups and entrepreneurs.",
    primary_cta: "Start a project",
    secondary_cta: "View our work",
  },
  philosophy: {
    lead: "Your website isn't just a page on the internet. It's",
    statement_1: "Your digital",
    statement_2: "first impression.",
    description:
      "Visitors decide in seconds whether to trust you. We make those seconds count — by treating design, development, performance and usability as one discipline, not four separate jobs.",
    design: "Interfaces with a point of view — clear, considered, unmistakably yours.",
    develop: "Clean, responsive builds that behave on every screen size.",
    perform: "Lightweight pages that load fast and stay fast.",
    convert: "Obvious paths to the one thing you want visitors to do.",
  },
  work: { description: "Real projects on real domains. Don't take our word for it — click through and judge for yourself." },
  apps: { description: "Not just websites. We build Android apps too — designed around the brand and published on Google Play." },
  services: {
    heading: "Everything your website needs.",
    highlight: "Nothing it doesn't.",
    description: "From the first sketch to ongoing support — one lab, one standard, end to end.",
  },
  about: {
    statement_1: "A small lab",
    statement_2: "with a serious standard.",
    paragraphs:
      "Rudra InfoTech Lab is a web design and development studio. We build websites for businesses, brands, startups and entrepreneurs who want more from the web than a page that simply exists.\n\nWe work like a lab: curious, hands-on and a little obsessive about the details. You talk directly to the people designing your pages and writing your code — so ideas don't get lost in translation.\n\nSmall enough to care about your project personally. Technical enough to build it properly.",
    what_we_do: "Website design & development",
    who_its_for: "Businesses, brands, startups & entrepreneurs",
    how_we_work: "Directly, transparently, end to end",
  },
  contact: {
    heading_1: "Have",
    heading_2: "an idea?",
    serif: "Let's build it.",
    description: "A few details are all we need. We'll read every word, then reply with honest next steps — no jargon, no pressure.",
    button: "Send the brief",
    whatsapp_cta: "Chat on WhatsApp",
    success_title: "Brief received.",
    success_text: "Thanks — your project is in the lab. We'll get back to you shortly with next steps.",
  },
  footer: { statement: "Make something worth visiting.", tagline: "Web design & development studio" },
};

/** Principles for the "Why Rudra" chapter (not managed in the admin). */
export const principles = [
  { title: "Modern Design", body: "Contemporary, considered interfaces — never a recycled template." },
  { title: "Responsive Development", body: "Designed for the phone in your customer's hand first, then scaled up." },
  { title: "Performance", body: "Lean pages, optimised assets, fast first paint. Speed is a feature." },
  { title: "User Experience", body: "Clear paths, obvious actions, zero guesswork for your visitors." },
  { title: "Maintainable Code", body: "Structured, readable code that's easy to extend long after launch." },
  { title: "Business-Focused", body: "Every section earns its place by moving visitors toward a goal." },
  { title: "Attention to Detail", body: "Spacing, states, edge cases, microcopy. The small things add up." },
];

export const seedCategories = ["E-commerce", "Job portal", "Web development", "Services marketplace", "Business website", "Food & drink"];

export const seed = (): SiteData => ({
  source: "seed",
  projects: seedProjects.map((p) => ({ ...p, technologies: [...p.technologies], images: p.images.map((i) => ({ ...i })) })),
  services: seedServices.map((s) => ({ ...s, points: [...s.points] })),
  process: seedProcess.map((s) => ({ ...s })),
  tech: seedTech.map((t) => ({ ...t })),
  categories: [...seedCategories],
  form: { services: [...seedForm.services], budgets: [...seedForm.budgets] },
  contact: { ...seedContact },
  seo: { ...seedSeo },
  content: JSON.parse(JSON.stringify(seedContent)) as Content,
});
