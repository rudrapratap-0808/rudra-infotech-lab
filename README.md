# Rudra InfoTech Lab — Website + Admin

The connected platform for **Rudra InfoTech Lab (RITL)**: a public agency website, portfolio and app case studies, WhatsApp contact, a Supabase-backed CMS/CRM, media library, SEO controls, users/roles, activity log, and Vercel publishing.

- Public design: Swiss editorial × digital foundry
- Public rendering: static HTML with metadata and JSON-LD in the initial document
- Backend: Supabase Postgres, Auth, Storage, PostgREST, and row-level security
- Hosting/functions: Vercel
- Admin: zero-dependency vanilla TypeScript SPA at `/admin/`
- Motion: vendored GSAP + ScrollTrigger + Lenis; no package/CDN runtime dependency

## Production routes

Public:

- `/`
- `/projects/`
- `/projects/<slug>/`
- `/apps/`
- `/services/`
- `/services/<slug>/`
- `/contact/`
- `/privacy/`

Admin:

- `/admin/login/`
- `/admin/`
- `/admin/enquiries/`
- `/admin/projects/`
- `/admin/apps/`
- `/admin/services/`
- `/admin/content/`
- `/admin/process/`
- `/admin/toolkit/`
- `/admin/media/`
- `/admin/seo/`
- `/admin/contact/`
- `/admin/form-settings/`
- `/admin/users/`
- `/admin/activity/`
- `/admin/settings/`

## One-time production setup

Follow **[SETUP.md](SETUP.md)** to:

1. create the Supabase project;
2. run `supabase/setup.sql` and `supabase/seed.sql`;
3. create/promote the first Owner;
4. configure Auth redirect URLs and disable public sign-ups;
5. add Vercel environment variables;
6. create the Vercel deploy hook;
7. verify the live connected workflow.

Without Supabase variables, the public site deliberately builds from `src/data/seed.ts`; `/admin/` displays a setup notice, and project briefs fall back to WhatsApp at **+351 930 656 040**. There is no fake in-memory admin mode.

## Commands

```bash
npm run build       # Typecheck + build public pages, hashed JS and /admin/ → dist/
npm run typecheck   # Public build, browser client and admin TypeScript
npm run serve       # Static preview at http://localhost:4321 (also emulates /admin/* + /api/*)
npm run qa          # Public headless-browser audit/screenshots
npm run qa:admin    # Full connected admin E2E against local Postgres + PostgREST
npm run images      # Regenerate optimized project/app WebP assets from .imagery/
npm run og          # Regenerate versioned 1200×630 OG image + app icons
npm run sql         # Regenerate supabase/seed.sql from src/data/seed.ts
npm run screenshots # Capture live portfolio screenshots (internet required)
```

The project only declares TypeScript as a development dependency. Runtime libraries and fonts are stored in the repository.

## Environment variables

| Variable | Visibility | Purpose |
|---|---|---|
| `SUPABASE_URL` | Server + build | Supabase project URL |
| `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Public API key; access is limited by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | **Server only** | API functions, Auth admin operations, enquiry insertion |
| `DEPLOY_HOOK_URL` | **Server only** | Vercel rebuild from Admin → Publish website |
| `IP_SALT` | **Server only** | Salt for daily anti-spam IP hashes |
| `SITE_URL` | Build | Optional canonical domain override |
| `RESEND_API_KEY` | **Server only, optional** | Enquiry email notifications |
| `NOTIFY_EMAIL` | Server, optional | Notification recipients |
| `NOTIFY_FROM` | Server, optional | Verified notification sender |

See [SETUP.md](SETUP.md) for exact values and locations.

## Architecture

```text
api/
  _lib/supabase.js       server-side Supabase/auth/HTTP helpers
  enquiry.js             validated, rate-limited, store-first public form endpoint
  rebuild.js             authenticated Vercel deploy-hook endpoint
  admin-users.js         authenticated invite/reset/delete user endpoint

supabase/
  setup.sql               schema, constraints, triggers, RLS, RPCs, Storage policies
  seed.sql                generated initial content (idempotent)
  local/bootstrap.sql     local emulator support only — never run in Supabase

src/
  data/                   shared data model, seed fallback, runtime store, site constants
  components/             server-rendered public HTML components
  pages/                  public pages, metadata and structured data
  styles/                 public design system and responsive layouts
  client/                 public progressive enhancement, motion, forms, WhatsApp
  admin/                  private SPA: auth, API/storage client, shell, CMS/CRM views, CSS

scripts/
  build.ts                Supabase-or-seed static build, assets, sitemap, robots, admin
  content.ts              public PostgREST loader (anon/publishable key + RLS)
  media.ts                image dimensions and responsive source discovery
  local-supabase.ts       real Postgres/PostgREST test gateway for Auth/Storage APIs
  qa.ts                   public visual, interaction, accessibility/link audit
  qa-admin.ts             57-check connected admin E2E suite
  images.ts / og.ts       WebP and Open Graph generation
```

## Content flow

1. Admin actions persist immediately to Supabase.
2. Draft/archived projects stay private; only `published` rows pass public RLS and enter the build.
3. **Publish website** calls authenticated `/api/rebuild`.
4. The server-only deploy hook starts a Vercel build.
5. `scripts/content.ts` fetches published content using the public key and RLS.
6. Vercel atomically replaces the deployment only after a successful build.

If Supabase is configured but unavailable, the build fails on purpose rather than silently replacing live database content with seed data.

## Enquiry flow

1. Browser validation + honeypot + minimum fill time.
2. `/api/enquiry` validates again, checks request origin, and rate-limits a salted daily IP hash.
3. It inserts the enquiry first as `NEW`, unread.
4. It optionally sends a Resend notification afterward; email failure never loses the database record.
5. If the API is not configured/reachable, the browser opens WhatsApp with the complete brief pre-filled.

Anonymous users cannot insert into or read the enquiries table directly.

## Admin roles

- **Owner:** full access, including owner management.
- **Admin:** CRM, portfolio/apps, services, content, process/toolkit, media, SEO, settings, users, activity; cannot grant/remove Owner or remove an Owner.
- **Editor:** projects/apps, website content, process/toolkit, and media only.
- **Pending/Disabled:** no admin access.

These rules are enforced in Postgres with RLS and triggers—not just hidden menu links.

## SEO and media

- Initial HTML contains title, description, canonical, Open Graph, Twitter, and JSON-LD.
- Structured data includes Organization, ProfessionalService, WebSite, WebPage, CreativeWork, SoftwareApplication, Service, ItemList, and BreadcrumbList using factual fields only.
- Project SEO supports title, description, social image, and canonical override.
- `sitemap.xml` contains only published/indexable pages.
- `robots.txt` and Vercel headers block `/admin/` and `/api/`.
- The social image uses versioned `/og-v3.png` to avoid stale crawler cache from older branding.
- Admin uploads accept JPG/JPEG, PNG, WebP, and AVIF up to 10 MB; JPG/PNG are converted to WebP, and wide images get an 800px variant.
- Bundled portfolio/app images total about **560 KB**, reduced from 728 KB (~23%).

## Design system

| Colour | Hex | Role |
|---|---|---|
| Ink | `#0C0C0C` | Dark chapters and footer |
| Paper | `#F1EEE6` | Editorial surfaces |
| Rudra Orange | `#FF4B18` | Calls to action, process, contact |
| Electric Blue | `#3155FF` | Services |
| Acid | `#DFFF36` | Toolkit and live/status accents |
| Soft Grey | `#B7B5AE` | Secondary text on ink |

Fonts: Archivo Black, Inter Tight, Instrument Serif, and IBM Plex Mono (self-hosted). Public desktop motion uses pinned GSAP/ScrollTrigger chapters; mobile, reduced-motion, and no-JavaScript layouts remain complete and readable. Admin intentionally has no custom cursor or heavy motion.

## Verification status

- `npm run typecheck`: passing
- `npm run build`: passing
- Public browser QA: **0 issues** (mobile full-scroll, route/link/accessibility audits, form, menu, reduced motion, and no-JS; desktop/laptop/tablet screenshots also completed)
- Connected admin E2E: **57 checks passed, 0 browser problems**
- Schema/seed: applied twice against real PostgreSQL to verify idempotency
- RLS/roles/storage: verified against real PostgreSQL + PostgREST
