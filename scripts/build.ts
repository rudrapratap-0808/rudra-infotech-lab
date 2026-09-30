/**
 * Static site build.
 *   1. load content (Supabase when configured, seed otherwise) + measure images
 *   2. bundle + minify CSS (inlined into every page)
 *   3. copy compiled client modules into a content-hashed folder
 *   4. render every page from components + data
 *   5. copy /public, write sitemap.xml, robots.txt, site.webmanifest
 *   6. build the admin panel into /admin
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { ADMIN_OUT, ADMIN_STYLES, CLIENT_OUT, DIST, PUBLIC, ROOT, STYLES } from "./paths.js";
import { loadSiteData, supabaseEnv } from "./content.js";
import { measureAll } from "./media.js";
import { PLACEHOLDER_URL, chapterText, site } from "../src/data/site.js";
import { abs, allProjects, apps, baseUrl, D, projectPath, servicePath, services, setMedia, setSiteData } from "../src/data/store.js";
import { layout, type Assets, type PageOptions } from "../src/components/layout.js";
import { home, homeJsonLd, homeMeta } from "../src/pages/index.js";
import { projectLdAll, projectMeta, projectPage, projectsIndex, projectsIndexLd, projectsIndexMeta } from "../src/pages/projects.js";
import { appsLd, appsMeta, appsPage } from "../src/pages/apps.js";
import { serviceLdAll, serviceMeta, servicePage, servicesIndex, servicesIndexLd, servicesIndexMeta } from "../src/pages/services.js";
import { contactLd, contactMeta, contactPage, notFound, notFoundMeta, privacy, privacyMeta } from "../src/pages/secondary.js";
import { chapters } from "../src/data/site.js";

const exists = (p: string) => stat(p).then(() => true, () => false);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

/* ── CSS ──────────────────────────────────────────────────── */
const minifyCss = (css: string) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/:\s+/g, ":")
    .replace(/;}/g, "}")
    .trim();

async function buildCss(dir: string) {
  const files = (await readdir(dir)).filter((f: string) => f.endsWith(".css")).sort();
  const src = (await Promise.all(files.map((f: string) => readFile(join(dir, f), "utf8")))).join("\n");
  return minifyCss(src);
}

/* ── JS ───────────────────────────────────────────────────── */
const minifyJs = (js: string) =>
  js
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

const VENDOR = ["gsap.min.js", "ScrollTrigger.min.js"];

/** Copies a compiled module tree into /assets/<hash>/ and returns its static import graph. */
async function bundle(srcDir: string, entry: string, vendor: string[], prefix = "") {
  const files = (await walk(srcDir)).filter((f) => f.endsWith(".js"));
  const hash = createHash("sha256");
  const contents: [string, string][] = [];
  for (const f of files.sort()) {
    const code = minifyJs(await readFile(f, "utf8"));
    hash.update(f.slice(srcDir.length) + code);
    contents.push([relative(srcDir, f), code]);
  }
  for (const v of vendor) {
    const code = await readFile(join(ROOT, "vendor/gsap", v), "utf8");
    hash.update(v + code);
    contents.push([`vendor/${v}`, code]);
  }
  const id = prefix + hash.digest("hex").slice(0, 10);
  const base = `/assets/${id}`;
  for (const [rel, code] of contents) {
    const out = join(DIST, "assets", id, rel);
    await mkdir(join(out, ".."), { recursive: true });
    await writeFile(out, code);
  }
  // Preload the whole *static* import graph of the entry (dynamic imports stay lazy)
  // so the browser fetches every module in parallel instead of in a waterfall.
  const byPath = new Map(contents);
  const seen = new Set<string>();
  const visit = (rel: string) => {
    const code = byPath.get(rel);
    if (code === undefined || seen.has(rel)) return;
    seen.add(rel);
    const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/") + 1) : "";
    for (const m of code.matchAll(/^import\s[^"'()]*["'](\.{1,2}\/[^"']+)["']/gm)) {
      const parts = (dir + m[1]).split("/");
      const out: string[] = [];
      for (const p of parts) p === ".." ? out.pop() : p !== "." && out.push(p);
      visit(out.join("/"));
    }
  };
  visit(entry);
  seen.delete(entry);
  return {
    base,
    entry: `${base}/${entry}`,
    preload: [...seen].sort().map((r) => `${base}/${r}`),
    vendor: vendor.map((v) => `${base}/vendor/${v}`),
    count: contents.length,
  };
}

/* ── Pages ────────────────────────────────────────────────── */
interface Page {
  path: string;
  file: string;
  html: string;
  sitemap: boolean;
  lastmod?: string;
}

function renderPages(assets: Assets): Page[] {
  const pages: Page[] = [];
  const add = (o: Omit<PageOptions, "assets">, sitemap = true, lastmod?: string) => {
    const file = o.path === "/404" ? "404.html" : `${o.path.replace(/^\//, "")}index.html`;
    pages.push({ path: o.path, file, html: layout({ ...o, assets }), sitemap, lastmod });
  };
  const hm = homeMeta();
  add({ ...hm, path: "/", body: home(), jsonLd: homeJsonLd(), chapter: chapterText("home"), intro: true });

  const work = `/ ${chapters.work.n} ${chapters.work.label}`;
  add({ ...projectsIndexMeta(), path: "/projects/", body: projectsIndex(), jsonLd: projectsIndexLd(), chapter: work });
  for (const p of allProjects()) {
    const m = projectMeta(p);
    add(
      {
        title: m.title,
        description: m.description,
        image: m.image,
        imageAlt: p.image_alt ?? `${p.name} — ${site.name}`,
        canonical: m.canonical,
        ogType: "article",
        path: projectPath(p),
        body: projectPage(p),
        jsonLd: projectLdAll(p),
        chapter: work,
        wa: `Hi Rudra InfoTech Lab, I saw the ${p.name} project and I’m interested in discussing something similar.`,
      },
      !m.canonical || m.canonical === abs(projectPath(p)),
      p.updated_at?.slice(0, 10)
    );
  }
  if (apps().length) add({ ...appsMeta(), path: "/apps/", body: appsPage(), jsonLd: appsLd(), chapter: `/ ${chapters.apps.n} ${chapters.apps.label}` });
  const svc = `/ ${chapters.services.n} ${chapters.services.label}`;
  if (services().length) add({ ...servicesIndexMeta(), path: "/services/", body: servicesIndex(), jsonLd: servicesIndexLd(), chapter: svc });
  for (const s of services()) {
    add({ ...serviceMeta(s), path: servicePath(s), body: servicePage(s), jsonLd: serviceLdAll(s), chapter: svc, wa: `Hi Rudra InfoTech Lab, I’m interested in your ${s.title} service.` });
  }
  add({ ...contactMeta(), path: "/contact/", body: contactPage(), jsonLd: contactLd(), chapter: chapterText("contact"), wa: false });
  add({ ...privacyMeta(), path: "/privacy/", body: privacy(), chapter: "/ — Privacy" });
  add({ ...notFoundMeta(), path: "/404", body: notFound(), noindex: true, chapter: "/ 404 Not found" }, false);
  return pages;
}

/* ── Admin panel ──────────────────────────────────────────── */
async function buildAdmin(): Promise<{ bytes: number; count: number } | null> {
  if (!(await exists(join(ADMIN_OUT, "admin/main.js")))) return null;
  const js = await bundle(ADMIN_OUT, "admin/main.js", [], "admin-");
  const fonts = await readFile(join(STYLES, "00-fonts.css"), "utf8");
  const css = minifyCss(fonts) + (await buildCss(ADMIN_STYLES));
  const env = supabaseEnv();
  const config = {
    supabaseUrl: env?.url ?? "",
    supabaseKey: env?.key ?? "",
    siteUrl: baseUrl(),
    siteName: site.name,
  };
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Admin — ${site.name}</title>
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#111111">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/inter-tight-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
${js.preload.map((m) => `<link rel="modulepreload" href="${m}">`).join("\n")}
<style>${css}</style>
<script>window.__RITL_ADMIN__=${JSON.stringify(config).replace(/</g, "\\u003c")}</script>
</head>
<body>
<div id="app" class="boot"><p class="boot__t">Loading admin…</p></div>
<noscript><p style="padding:24px;font-family:sans-serif">The admin panel needs JavaScript.</p></noscript>
<script type="module" src="${js.entry}"></script>
</body>
</html>
`;
  await mkdir(join(DIST, "admin"), { recursive: true });
  await writeFile(join(DIST, "admin/index.html"), page);
  return { bytes: page.length, count: js.count };
}

/* ── Main ─────────────────────────────────────────────────── */
async function main() {
  const t0 = Date.now();
  const warnings: string[] = [];
  const data = await loadSiteData();
  // A live screenshot saved by `npm run screenshots` (public/work/<slug>.*) fills an empty desktop screenshot.
  for (const p of data.projects) {
    if (p.desktop_screenshot) continue;
    for (const ext of ["webp", "jpg", "png"]) {
      if (await exists(join(PUBLIC, "work", `${p.slug}.${ext}`))) {
        p.desktop_screenshot = `/work/${p.slug}.${ext}`;
        break;
      }
    }
  }
  setSiteData(data);

  const urls: string[] = [D().seo.og_image, D().seo.twitter_image];
  for (const p of data.projects) urls.push(p.project_logo ?? "", p.featured_image ?? "", p.desktop_screenshot ?? "", p.mobile_screenshot ?? "", p.social_image ?? "", ...p.images.map((i) => i.url));
  setMedia(await measureAll(urls, (m) => warnings.push(m)));

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  if (await exists(PUBLIC)) await cp(PUBLIC, DIST, { recursive: true });

  const [css, js] = await Promise.all([buildCss(STYLES), bundle(CLIENT_OUT, "main.js", VENDOR)]);
  const assets: Assets = { css, vendor: js.vendor, entry: js.entry, preload: js.preload };
  const pages = renderPages(assets);

  for (const p of pages) {
    const out = join(DIST, p.file);
    await mkdir(join(out, ".."), { recursive: true });
    await writeFile(out, p.html);
  }
  const admin = await buildAdmin();

  const indexable = D().seo.robots_index;
  const today = new Date().toISOString().slice(0, 10);
  const base = baseUrl();
  await writeFile(
    join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${(indexable ? pages.filter((p) => p.sitemap) : [])
      .map((p) => `  <url><loc>${base}${p.path}</loc><lastmod>${p.lastmod || today}</lastmod></url>`)
      .join("\n")}\n</urlset>\n`
  );
  await writeFile(
    join(DIST, "robots.txt"),
    indexable
      ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`
      : `User-agent: *\nDisallow: /\n`
  );
  const appIcon = D().seo.app_icon;
  await writeFile(
    join(DIST, "site.webmanifest"),
    JSON.stringify(
      {
        name: site.name,
        short_name: site.short,
        description: D().seo.meta_description,
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: site.themeColor,
        theme_color: site.themeColor,
        icons: [
          ...(appIcon ? [{ src: appIcon, sizes: "512x512", purpose: "any" }] : []),
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      null,
      2
    )
  );

  // Report
  const kb = (n: number) => (n / 1024).toFixed(1) + " KB";
  console.log(`\n  Rudra InfoTech Lab — build complete in ${Date.now() - t0} ms`);
  console.log(`  content: ${data.source === "supabase" ? `Supabase (${supabaseEnv()!.url})` : "seed data (Supabase not configured)"}\n`);
  for (const p of pages) {
    console.log(`  ${p.file.padEnd(46)} ${kb(Buffer.byteLength(p.html)).padStart(9)}  (gzip ${kb(gzipSync(p.html).length)})`);
  }
  let jsTotal = 0;
  let jsGz = 0;
  for (const f of await walk(join(DIST, "assets"))) {
    if (f.includes("/admin-")) continue;
    const c = await readFile(f);
    jsTotal += c.length;
    jsGz += gzipSync(c).length;
  }
  console.log(`  ${`js (${js.count} modules)`.padEnd(46)} ${kb(jsTotal).padStart(9)}  (gzip ${kb(jsGz)})`);
  console.log(`  ${"css (inlined)".padEnd(46)} ${kb(css.length).padStart(9)}  (gzip ${kb(gzipSync(css).length)})`);
  console.log(admin ? `  admin/index.html (${admin.count} modules)` : "  admin: not compiled (run tsc -p tsconfig.admin.json)");
  if (admin && !supabaseEnv()) console.log("  admin: Supabase not configured — /admin/ shows setup instructions");
  console.log(`  projects: ${allProjects().length} published (${apps().length} apps) · services: ${services().length}`);
  console.log(`  site url: ${base}  (from ${D().seo.canonical_base_url ? "admin SEO setting" : site.urlSource})`);
  for (const w of warnings) console.warn(`  ⚠  ${w}`);
  if (base === PLACEHOLDER_URL) console.warn(`  ⚠  canonical URLs point at ${base}. On Vercel this is detected automatically; elsewhere set SITE_URL.`);
  if (!D().contact.whatsapp && !D().contact.email && !supabaseEnv()) console.warn(`  ⚠  No Supabase, WhatsApp or email configured — enquiries can't be delivered yet.`);
  console.log(`\n  Output: ${relative(ROOT, DIST)}/\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
