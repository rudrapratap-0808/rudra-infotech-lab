# Rudra InfoTech Lab — Website

The studio website of **Rudra InfoTech Lab (RITL)**, a web design and development lab.

It's a static TypeScript build. Motion uses **GSAP + ScrollTrigger + Lenis**, stored in the repo so builds never depend on a package registry. The fonts are self-hosted, and there's no framework runtime.

```bash
npm run build        # → dist/  (static HTML, inlined CSS, hashed JS)
npm run serve        # preview at http://localhost:4321
npm run qa           # headless-Chrome audit + screenshots at 4 viewports (.build/qa)
npm run og           # regenerate public/og.png + app icons
npm run images       # re-crop project imagery from .imagery/ → public/work/*.webp
npm run screenshots  # capture real screenshots of the live project sites (needs internet)
```

## Deploy (Vercel)

`vercel.json` sets the build command, `dist` output, trailing-slash URLs, caching (hashed JS and fonts are immutable) and security headers.

- **Git:** push to `main` and Vercel deploys. Every PR gets a preview URL.
- **CLI:** `npx vercel --prod`.

Canonical, sitemap and OG URLs come from Vercel's production domain automatically (`VERCEL_PROJECT_PRODUCTION_URL`). Set `SITE_URL` to override.

Optional environment variables:

| Variable | Purpose |
|---|---|
| `FORM_ENDPOINT` | Where the project brief form posts (Formspree, Web3Forms, …). Redeploy after setting |
| `SITE_URL` | Force a canonical domain |

## Before you share the site

| What | Where |
|---|---|
| Form delivery | `FORM_ENDPOINT`, or `site.contact.whatsapp` / `site.contact.email` in `src/data/site.ts`. Until one is set, submissions show an error |
| Contact details, socials | `src/data/site.ts`. Empty values are hidden everywhere |
| MightyMindz.in | No source repository was available, so it has a neutral description and a typographic cover. Add real details in `src/data/projects.ts` |
| Live screenshots | Optional: `npm run screenshots` saves `public/work/<slug>.png`, and the frame label switches to **LIVE BUILD** |

### About the project imagery and facts

The descriptions, tags and accent colours for Dotaanke, RojgarLelo, Sarkar2.0 and Rahul Construction were checked against each project's own repository: page titles, meta descriptions, routes and `package.json`.

The frames show each site's own hero imagery, labelled **HERO IMAGE**, not a screenshot. RojgarLelo and MightyMindz have no imagery in their repos, so they get typographic covers labelled **COVER**.

## Design system — "Digital Foundry"

Bold Swiss editorial × creative development studio.

**Colour.** Each section uses one environment:

| Colour | Hex | Used in |
|---|---|---|
| Paper | `#F1EEE6` | Hero, why, the lab |
| Ink | `#0C0C0C` | Philosophy, work, manifesto, footer |
| Rudra Orange | `#FF4B18` | Process, contact, hero shape |
| Electric Blue | `#3155FF` | Services |
| Acid | `#DFFF36` | Toolkit, work metadata, availability |
| Soft Grey | `#B7B5AE` | Metadata on ink |

Surfaces are flat colour with 1px rules and a 3.5% grain. Gradients are used only to draw hard-edged rules.

**Type** — each font has one job:

- **Archivo Black**: statements (−0.055em tracking, 0.8 line height).
- **Inter Tight** 500–700: communication.
- **Instrument Serif**: emotional statements, used sparingly.
- **IBM Plex Mono**: the lab's technical labels.

The Latin subsets have no ↗ or → glyphs, so all arrows are inline SVG.

**Grid.** 12 columns, with 40 / 24 / 16px outer margins and a 20px gutter. Small text sits on the grid. Giant type is allowed to break out of it and crop at the viewport edges.

**Section themes.** `data-theme="paper|ink|blue|orange|acid"` sets each section's colours, focus-ring colour and hairlines. The fixed nav hit-tests what's under it and switches between paper and ink. It also shows the current chapter.

## Architecture

```
src/data/        content + config (site, projects, services, process, toolkit, about)
src/components/  server-rendered HTML (hero, philosophy, work, services, sections, contact, footer, nav, symbols, ui)
src/pages/       page composition + meta + JSON-LD
src/styles/      00-fonts … 08-motion (concatenated, minified, inlined)
src/client/      core (Lenis + ScrollTrigger), chrome (nav/menu/cursor/anchors), intro,
                 scenes (all scroll choreography), widgets (planes, why, toolkit lanes), form
src/client/vendor/lenis   Lenis 1.3.26 source (MIT)
vendor/gsap      GSAP 3.15.0 dist + types (GSAP standard "no charge" license)
public/fonts     self-hosted WOFF2 + OFL licences
scripts/         build, serve, qa (CDP), og, images, screenshots
```

**Motion.**

- **Scrolling:** one Lenis instance runs on GSAP's ticker and drives ScrollTrigger.
- **Desktop (≥1025px, `html.stage`):** the hero, work reel, services and process get pinned stages, set up with `gsap.matchMedia`.
- **Smaller screens:** unpinned, lighter motion.
- **Reduced motion or no JS:** every chapter is a complete static layout with the same composition and colours, and no movement.
- **Custom cursor (fine pointers only):** 7px dot, with VIEW / VISIT / GO / DRAG / BUILD labels.
