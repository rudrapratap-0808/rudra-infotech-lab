/**
 * Services, principles, process and technology content.
 * Edit freely — the layout adapts to the number of items.
 */

export interface Service {
  id: string;
  name: string;
  line: string; // one-liner (shown in list)
  body: string; // longer copy (shown in detail panel)
  points: string[];
}

export const services: Service[] = [
  {
    id: "design",
    name: "Website Design",
    line: "Interfaces shaped around your business.",
    body: "Modern UI/UX and visual systems designed around your brand, your audience and the one action you need visitors to take.",
    points: ["UI / UX design", "Visual direction", "Design systems"],
  },
  {
    id: "development",
    name: "Web Development",
    line: "Production-ready, from the first commit.",
    body: "Responsive, scalable websites built with clean, maintainable code — engineered to load fast and hold up as you grow.",
    points: ["Responsive builds", "Clean code", "Deployment"],
  },
  {
    id: "business",
    name: "Business Websites",
    line: "Credibility, on every screen.",
    body: "Professional websites that tell your story clearly, earn trust in seconds and turn visitors into enquiries.",
    points: ["Clear messaging", "Enquiry flows", "Local presence"],
  },
  {
    id: "ecommerce",
    name: "E-commerce Development",
    line: "Storefronts built to sell.",
    body: "Modern online stores designed around your products — clean browsing, confident checkout, fewer abandoned carts.",
    points: ["Product catalogues", "Checkout UX", "Mobile-first"],
  },
  {
    id: "landing",
    name: "Landing Pages",
    line: "One page. One job. Done well.",
    body: "Focused pages for launches, campaigns, products and lead generation — built to convert, measured to improve.",
    points: ["Campaign pages", "Lead capture", "A/B-ready"],
  },
  {
    id: "redesign",
    name: "Website Redesign",
    line: "Old site, new standard.",
    body: "We take outdated websites and rebuild them into modern experiences — keeping what works, fixing what doesn't.",
    points: ["UX audit", "Visual refresh", "Rebuild"],
  },
  {
    id: "performance",
    name: "Performance Optimization",
    line: "Every millisecond counts.",
    body: "We tune speed, responsiveness and Core Web Vitals so your site feels instant — for users and for search engines.",
    points: ["Core Web Vitals", "Asset optimisation", "Technical SEO"],
  },
  {
    id: "support",
    name: "Maintenance & Support",
    line: "We don't disappear after launch.",
    body: "Ongoing updates, fixes, improvements and technical support — so your website keeps working as hard as you do.",
    points: ["Updates & fixes", "Improvements", "Technical support"],
  },
];

export const principles = [
  { title: "Modern Design", body: "Contemporary, considered interfaces — never a recycled template." },
  { title: "Responsive Development", body: "Designed for the phone in your customer's hand first, then scaled up." },
  { title: "Performance", body: "Lean pages, optimised assets, fast first paint. Speed is a feature." },
  { title: "User Experience", body: "Clear paths, obvious actions, zero guesswork for your visitors." },
  { title: "Maintainable Code", body: "Structured, readable code that's easy to extend long after launch." },
  { title: "Business-Focused", body: "Every section earns its place by moving visitors toward a goal." },
  { title: "Attention to Detail", body: "Spacing, states, edge cases, microcopy. The small things add up." },
];

export const process = [
  { n: "01", title: "Discover", body: "We learn your business, audience, objectives and requirements — before a single pixel is placed." },
  { n: "02", title: "Design", body: "We establish the visual direction and user experience, and refine it with you until it's right." },
  { n: "03", title: "Develop", body: "We turn the approved design into a fast, responsive, production-ready website." },
  { n: "04", title: "Test", body: "We check responsiveness, usability, functionality and performance across devices and browsers." },
  { n: "05", title: "Launch", body: "We prepare, configure and deploy the production website — then watch it go live." },
  { n: "06", title: "Improve", body: "We keep refining the site when you need it: new features, updates and optimisations." },
];

/**
 * Technology toolkit. Edit this list to match the stack you actually use.
 */
export const tech = [
  "HTML5",
  "CSS3",
  "JavaScript",
  "TypeScript",
  "Angular",
  "React",
  "Next.js",
  "Node.js",
  "Tailwind CSS",
  "Git",
  "REST APIs",
];

export const websiteTypes = [
  "Business Website",
  "E-commerce",
  "Landing Page",
  "Portfolio",
  "Web Application",
  "Website Redesign",
  "Other",
];

/** Budget ranges shown in the contact form — edit to suit your pricing. */
export const budgets = ["Under ₹25k", "₹25k – ₹75k", "₹75k – ₹2L", "₹2L +", "Not sure yet"];
