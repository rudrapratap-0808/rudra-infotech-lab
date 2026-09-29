# Rudra InfoTech Lab — Website

A custom agency website for **Rudra InfoTech Lab (RITL)**. It's a static site built with TypeScript and has no runtime dependencies.

```bash
npm run build     # → dist/  (static HTML, inlined CSS, ~13 KB gzipped JS)
npm run serve     # preview at http://localhost:4321
npm run qa        # headless-Chrome audit + screenshots (.build/qa)
npm run og        # regenerate public/og.png + app icons
npm run screenshots  # capture real portfolio screenshots (needs internet)
```

## Deploy to Vercel

`vercel.json` already sets the build command, output directory, trailing-slash URLs, long-term caching for hashed assets, and security headers. No settings need changing on Vercel.

**Git (recommended). Every push to `main` deploys to production, and every PR gets a preview URL.**
1. Push this folder to a GitHub, GitLab or Bitbucket repository.
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** the repo → **Deploy**. Leave the framework preset as **Other**; `vercel.json` handles everything else.

**CLI.** From this folder, run `npx vercel` for a preview, then `npx vercel --prod`.

On Vercel, the canonical URL, sitemap and OG image URLs are generated from your production domain automatically. The build reads it from `VERCEL_PROJECT_PRODUCTION_URL`: your custom domain once you add one, otherwise `*.vercel.app`. To override it, set `SITE_URL`.

Optional **Project → Settings → Environment Variables**:

| Variable | Purpose |
|---|---|
| `FORM_ENDPOINT` | Contact form endpoint (see [Contact form](#contact-form)). Redeploy after setting it |
| `SITE_URL` | Force a specific canonical domain |

**Other static hosts:** build command `npm run build`, output directory `dist`, and set `SITE_URL`.

---

## Before you deploy (checklist)

| What | Where |
|---|---|
| Real domain | Automatic on Vercel. Elsewhere, set `SITE_URL=https://yourdomain.com`. It's used for the canonical URL, sitemap, robots, OG and schema tags |
| Contact details | `site.contact` (email, phone, WhatsApp, location). Empty values are hidden everywhere |
| Form delivery | `site.form.endpoint` or the `FORM_ENDPOINT` env var. See [Contact form](#contact-form) |
| Social links | `site.social`. Only links that have an `href` are shown |
| Portfolio copy | `src/data/projects.ts`. See the note below |
| Budget ranges / tech stack | `src/data/content.ts` |

The build prints warnings while the domain or form delivery is still unset.

### About the portfolio entries
The five project sites **couldn't be reached from the build environment**, so none of their details could be checked. Their descriptions are neutral on purpose and `tags` is left empty. Please replace them with real details.

Until real screenshots exist, each project shows a generated browser-frame preview. To use real ones:

- run `npm run screenshots` on a machine with internet access. It checks each site responds, then saves `public/work/<slug>.png`. Or:
- drop your own image into `public/work/<slug>.(webp|jpg|png)`.

The build finds these images automatically, reads their dimensions (so the layout doesn't shift) and lazy-loads them.

---

## 1. Creative direction

**"The digital lab."** The site should feel like a precise, experimental studio, not an agency template.

- **Near-black surfaces with warm off-white ink.** One accent colour, *Ember* `#ff6b2c`, is a nod to Rudra: fire, storm, energy. There's no generic SaaS blue and no neon.
- **Editorial type.** Big, tightly tracked Geist headlines are paired with *Instrument Serif italics* for the emphasised words. Geist Mono labels such as `[02] — Selected Work` give it a lab-notebook feel.
- **The mark.** The trident is abstracted into a signal glyph, with an ember "live" dot on top.
- **Signature moments:**
  - an interactive dot grid in the hero that bends into a wire mesh around the cursor
  - a "build console" in the hero
  - statement words that light up as you scroll
  - a process counter that ticks through the stages
  - a giant footer wordmark whose letters lift and glow under the cursor
- **Restraint.** The page has hairlines instead of boxes and very few cards. The grain overlay is subtle, and every animation reinforces the page hierarchy.

## 2. Information architecture

```
/            Home
  #top         Hero — headline, Start a Project / View Our Work
  #philosophy  01 Statement — "digital first impression" + 4 pillars
  #work        02 Selected Work — 5 large showcases
  #services    03 Services — interactive tabs (desktop) / editorial list (mobile)
  #why         04 Why RITL — 7 principles + CTA cell
  #process     05 Process — 6 scroll-driven stages
  #stack       06 Toolkit — marquee + accessible list
  #about       07 About — studio story
  (cta)        Pre-footer CTA — "Have an idea? Let's put it on the web."
  #contact     08 Contact — lead form
/privacy/    Privacy note (linked from the form)
/404         Not-found page
```

## 3. Design system

All tokens live in `src/styles/01-tokens.css`.

- **Colour:** `--bg #07070a` → `--bg-3`, ink `--ink #efebe4` / `--ink-2` / `--muted` / `--faint`, hairlines `--line` (9%) / `--line-2` (16%) / `--line-3` (30%), and one accent, `--ember`.
- **Type:** Geist (sans), Instrument Serif (italic accents) and Geist Mono (labels).
  - Sizes are fluid with `clamp()`: `--t-hero`, `--t-h1`, `--t-h2`, `--t-h3`, `--t-lg`.
  - To use a serif accent, wrap words in `*asterisks*` inside any heading string.
- **Space:** fluid `--gutter`, `--section` rhythm, a 12-column grid, and a max width of 1440px.
- **Motion:**
  - one easing curve, `--ease` (expo-out)
  - masked word reveals, a 28px fade-up for reveals, magnetic buttons, and a fill that rises through buttons
  - in-page links scroll smoothly, and page-to-page navigation uses View Transitions (in browsers that support them)
- **Accessibility:** visible ember focus rings and a skip link. Semantic landmarks, with one `h1` per page and no skipped heading levels. The services section follows the ARIA tabs pattern. The mobile menu traps focus. Form errors are announced through ARIA. The site works without JS. Reduced-motion users get every piece of content with no motion, and the setting is tracked live.

## 4. Architecture

```
src/
  data/          ← content + config (edit these, not the components)
    site.ts        brand, URL, contact, form, socials, nav
    projects.ts    portfolio
    content.ts     services, principles, process, tech, form options
  components/    ← server-rendered HTML components (typed functions → strings)
    layout.ts      <head>: SEO, OG/Twitter, JSON-LD, fonts, inlined CSS
    nav.ts footer.ts hero.ts work.ts services.ts process.ts contact.ts sections.ts ui.ts icons.ts
  pages/         ← page compositions + per-page meta/schema
  styles/        ← CSS, concatenated in filename order and minified
  client/        ← progressive-enhancement TypeScript (ES modules)
    lib/loop.ts    one rAF-batched scroll/resize scheduler shared by all modules
    modules/       nav, menu, anchors, reveal, cursor, magnetic, hero-canvas (lazy),
                   scroll-effects, services, form, footer
scripts/         ← build, serve, qa, og, screenshots (Node, zero deps)
public/          ← copied as-is (favicons, og.png, work/ screenshots)
```

**Why not Next.js?** Next.js + Tailwind was the preferred stack, but this build environment had no access to the npm registry, so no frameworks could be installed. The site is a single marketing page with no server-side data, so a static TypeScript generator is actually a good fit:

- 0 KB framework runtime and about 13 KB of gzipped JS
- inlined critical CSS
- no hydration cost

The components are plain typed functions with content kept separate, so porting to Next.js later is simple: each `components/*.ts` maps to a React component, `src/data` imports unchanged, and `src/client/modules` become `useEffect` hooks.

## Contact form

Validation covers required fields, email and phone formats, and a minimum length for project details. Errors appear inline and are also announced to screen readers. The form also has loading, success and error states.

Spam protection has three layers:

- a hidden honeypot field
- a minimum fill time (anything faster than 3 s is silently dropped)
- a 60-second client-side cooldown

For stronger protection, add Cloudflare Turnstile or hCaptcha on your endpoint.

The form tries delivery methods in this order:

1. **`form.endpoint`**: a JSON `POST` with `{ name, email, phone, company, type, budget, details, subject, page, ...form.extra }`.
   - Formspree: `endpoint: "https://formspree.io/f/xxxx"`
   - Web3Forms: `endpoint: "https://api.web3forms.com/submit"` with `extra: { access_key: "…" }`
2. **`contact.whatsapp`**: opens WhatsApp with the brief already written.
3. **`contact.email`**: opens the visitor's mail app with the brief already written.
4. If none of these are set, the visitor sees a friendly error.

## SEO & performance

- Every page has its own title and meta description, plus canonical, Open Graph and Twitter tags, `sitemap.xml`, `robots.txt` and a web manifest. The 404 page is `noindex`.
- The home page includes `ProfessionalService`, `WebSite` and `ItemList` (portfolio) JSON-LD.
- Measured in headless Chrome (local): LCP about 70–150 ms, CLS 0.
- The hero canvas loads lazily after idle and pauses when it's off-screen or the tab is hidden.
- JS module paths are content-hashed, so they can be cached with `immutable`, and the whole static import graph is `modulepreload`ed.
- Fonts come from Google Fonts with `display=swap` and don't block rendering. For the best privacy and performance you could self-host them (Geist, Geist Mono, Instrument Serif).
