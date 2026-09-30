# Rudra Platform — One-Time Setup

The code is complete, but the private admin needs a Supabase project and Vercel environment variables before it can persist real changes. Until then:

- the public site builds from `src/data/seed.ts`;
- WhatsApp still works at **+351 930 656 040**;
- `/admin/` shows a setup notice instead of a fake dashboard;
- the enquiry form falls back to WhatsApp instead of losing the brief.

This guide takes about 10–15 minutes.

## 1. Create the Supabase project

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor → New query**.
3. Copy all of [`supabase/setup.sql`](supabase/setup.sql), paste it, and click **Run**.
4. Open another query, copy all of [`supabase/seed.sql`](supabase/seed.sql), paste it, and click **Run**.

`setup.sql` creates the tables, validation, triggers, RLS policies, roles, activity logging, RPC functions, and the public `media` Storage bucket. `seed.sql` adds the current projects, THE LORD CAFE app, services, process, toolkit, form options, WhatsApp settings, content, and SEO defaults. Both files are safe to run again.

Do not run `supabase/local/bootstrap.sql` in Supabase—it exists only for local automated tests.

## 2. Configure authentication

In **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://rudra-infotech-lab.vercel.app`
- **Redirect URLs:** add:
  - `https://rudra-infotech-lab.vercel.app/admin/reset/`
  - your custom-domain equivalent later, if you add a domain;
  - `http://localhost:4321/admin/reset/` only if you develop locally.

In **Authentication → Sign In / Providers → Email**:

- keep email/password enabled;
- disable public/self-service sign-ups (team members should join through **Admin → Users → Invite user**).

Supabase's [redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls) explains the URL allow-list. The public API key is safe to use in the browser only because the database enforces RLS; the secret/service key must remain server-only. See [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

## 3. Create the first Owner

1. In **Supabase → Authentication → Users**, click **Add user → Create new user**.
2. Enter your email and a strong password; mark the email confirmed.
3. Return to **SQL Editor** and run this, replacing the placeholder:

```sql
update public.profiles
set role = 'owner'
where email = 'YOUR_EMAIL@example.com';
```

4. Confirm one row was updated:

```sql
select email, full_name, role
from public.profiles
order by created_at;
```

Never auto-promote the first public sign-up. The explicit SQL step prevents someone else from claiming the site.

## 4. Add Vercel environment variables

Open **Vercel → rudra-infotech-lab → Settings → Environment Variables**. Add each variable to **Production, Preview, and Development** unless noted otherwise.

| Variable | Required | Value / purpose |
|---|---:|---|
| `SUPABASE_URL` | Yes | Project URL from Supabase **Settings → API** |
| `SUPABASE_ANON_KEY` | Yes | Legacy public `anon` key, or put the new `sb_publishable_…` value here |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Legacy `service_role` key, or put the new server-only `sb_secret_…` value here |
| `DEPLOY_HOOK_URL` | Yes | Created in step 5; lets **Publish website** rebuild the static site |
| `IP_SALT` | Yes | A random private string, 32+ characters; used for one-way anti-spam IP hashes |
| `SITE_URL` | Optional | Canonical origin, e.g. `https://rudrainfotechlab.com`; Vercel's production URL is used automatically when empty |
| `RESEND_API_KEY` | Optional | Enables an email notification after an enquiry is safely stored |
| `NOTIFY_EMAIL` | Optional | Destination for enquiry notifications; comma-separated addresses are supported |
| `NOTIFY_FROM` | Optional | Verified sender, e.g. `Rudra InfoTech Lab <hello@yourdomain.com>` |

You may instead use the aliases `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`; the code supports both. Do not prefix or quote values in Vercel.

### Generate `IP_SALT`

Run locally:

```bash
openssl rand -hex 32
```

Store the result only in Vercel. It is not used to identify visitors; `/api/enquiry` creates a salted, daily-rotating one-way hash solely for rate limiting.

## 5. Create the deploy hook

1. Open **Vercel → Settings → Git → Deploy Hooks**.
2. Create a hook named `Rudra Admin Publish` for branch `main`.
3. Copy its URL into the `DEPLOY_HOOK_URL` environment variable.

The URL stays server-only. An admin save writes to Supabase immediately; **Publish website** then asks Vercel to rebuild. Public changes normally appear in about a minute. Auto-publish waits about 20 seconds so several quick edits trigger one deployment.

## 6. Deploy

Redeploy the latest `main` commit after adding the environment variables. Then check:

- Public site: `https://rudra-infotech-lab.vercel.app/`
- Admin login: `https://rudra-infotech-lab.vercel.app/admin/login/`
- Projects: `/projects/`
- Apps: `/apps/`
- Services: `/services/`
- Contact: `/contact/`

Sign in with the Owner account from step 3.

## 7. Verify the connected system

Perform this short production check:

1. Open the public contact form and send a test enquiry.
2. In Admin, confirm the unread badge is `1` and the enquiry is `NEW`.
3. Open it and test **Open WhatsApp**, **Email client**, and **Call**.
4. Add a private note and set a follow-up date.
5. In **Projects**, create a draft with an image, then publish it.
6. Click **Publish website** and wait for Vercel to finish.
7. Confirm the new project appears publicly and in `sitemap.xml`.
8. In **Users**, invite an Editor and verify the invite opens `/admin/reset/`.

## Roles

| Role | Access |
|---|---|
| **Owner** | Full access, including roles and other owners |
| **Admin** | Enquiries, projects, apps, services, content, process/toolkit, media, SEO, contact/form settings, users, activity; cannot grant/remove Owner or remove an Owner |
| **Editor** | Projects, apps, website content, process, toolkit, and media only |
| **Pending / Disabled** | No admin access |

The database enforces these rules with RLS and triggers. Hiding navigation items is only a usability layer.

## Security and operational notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `DEPLOY_HOOK_URL`, `RESEND_API_KEY`, or `IP_SALT` in browser code.
- Public enquiry insertion is allowed only through `/api/enquiry`; the anonymous database role has no write policy.
- The API validates input, uses a honeypot/minimum-fill check, checks the request origin, rate-limits by daily IP hash, and stores first. Email notification failures do not lose enquiries.
- `/admin/` and `/api/` receive `X-Robots-Tag: noindex`; `robots.txt` blocks both.
- Storage accepts JPG/JPEG, PNG, WebP, and AVIF up to 10 MB. The admin converts JPG/PNG to WebP and generates an 800px responsive variant for wide images.
- The public site contains no analytics or advertising cookies.
- Export/backup the Supabase database and Storage on a schedule appropriate for your business.

## Updating seed content later

The admin becomes the source of truth once Supabase is connected. `src/data/seed.ts` is only the fallback and fresh-project seed.

If you intentionally update `src/data/seed.ts`, regenerate the SQL:

```bash
npm run sql
```

The generated `supabase/seed.sql` does not overwrite rows that already exist.

## Troubleshooting

### `/admin/` says “Connect Supabase”

`SUPABASE_URL` and the public key are missing from the build environment. Add them in Vercel and redeploy.

### Login works but says “Waiting for access”

The profile role is `pending`. Promote the first account with the Owner SQL above, or have an Owner/Admin assign Admin or Editor in **Users**.

### Password/invite link says it is not allowed

Add the exact `/admin/reset/` URL to **Supabase → Authentication → URL Configuration → Redirect URLs**.

### “Saved” but public site did not change

Database saves are immediate, but the public site is statically generated. Check `DEPLOY_HOOK_URL`, then click **Publish website**. Also inspect the Vercel deployment; if a Supabase-backed build cannot fetch content, it fails deliberately and Vercel keeps the previous good deployment.

### Form opens WhatsApp instead of creating an enquiry

The server-side Supabase variables are missing or the API cannot reach Supabase. This fallback is deliberate so a potential client is not lost.

### Image upload is rejected

Use JPG/JPEG, PNG, WebP, or AVIF under 10 MB. SVG/GIF uploads are intentionally blocked. The current bundled portfolio image payload is about **560 KB** after WebP optimization (down from 728 KB).

Content in the linked Supabase documentation is referenced and summarized, not reproduced.
