/**
 * Static site build.
 *   1. bundle + minify CSS (inlined into every page)
 *   2. copy compiled client modules into a content-hashed folder
 *   3. render pages from components + data
 *   4. copy /public, write sitemap.xml, robots.txt, site.webmanifest
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { CLIENT_OUT, DIST, PUBLIC, ROOT, STYLES } from "./paths.js";
import { imageSize } from "./image-size.js";
import { PLACEHOLDER_URL, site } from "../src/data/site.js";
import { projects } from "../src/data/projects.js";
import { layout } from "../src/components/layout.js";
import { home, homeJsonLd, homeMeta } from "../src/pages/index.js";
import { notFound, notFoundMeta, privacy, privacyMeta } from "../src/pages/secondary.js";
import type { Media } from "../src/components/work.js";

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

async function buildCss() {
  const files = (await readdir(STYLES)).filter((f: string) => f.endsWith(".css")).sort();
  const src = (await Promise.all(files.map((f: string) => readFile(join(STYLES, f), "utf8")))).join("\n");
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

async function buildJs() {
  const files = (await walk(CLIENT_OUT)).filter((f) => f.endsWith(".js"));
  const hash = createHash("sha256");
  const contents: [string, string][] = [];
  for (const f of files.sort()) {
    const code = minifyJs(await readFile(f, "utf8"));
    hash.update(f + code);
    contents.push([relative(CLIENT_OUT, f), code]);
  }
  for (const v of VENDOR) {
    const code = await readFile(join(ROOT, "vendor/gsap", v), "utf8");
    hash.update(v + code);
    contents.push([`vendor/${v}`, code]);
  }
  const id = hash.digest("hex").slice(0, 10);
  const base = `/assets/${id}`;
  for (const [rel, code] of contents) {
    const out = join(DIST, "assets", id, rel);
    await mkdir(join(out, ".."), { recursive: true });
    await writeFile(out, code);
  }
  // Preload the whole *static* import graph of main.js (dynamic imports stay lazy)
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
  visit("main.js");
  seen.delete("main.js");
  const preload = [...seen].sort().map((r) => `${base}/${r}`);
  const vendor = VENDOR.map((v) => `${base}/vendor/${v}`);
  return { base, entry: `${base}/main.js`, preload, vendor, count: contents.length };
}

/* ── Project media: screenshot > hero imagery > (none → cover) ─ */
async function findMedia(): Promise<Record<string, Media>> {
  const media: Record<string, Media> = {};
  const size = async (rel: string) => imageSize(await readFile(join(PUBLIC, rel)));
  for (const p of projects) {
    for (const ext of ["webp", "jpg", "jpeg", "png"]) {
      const rel = `work/${p.slug}.${ext}`;
      if (await exists(join(PUBLIC, rel))) {
        const s = await size(rel);
        if (s) media[p.slug] = { kind: "shot", src: `/${rel}`, ...s };
        break;
      }
    }
    if (media[p.slug]) continue;
    const rel = `work/${p.slug}-hero.webp`;
    if (await exists(join(PUBLIC, rel))) {
      const s = await size(rel);
      const smallRel = `work/${p.slug}-hero-800w.webp`;
      const ss = (await exists(join(PUBLIC, smallRel))) ? await size(smallRel) : null;
      if (s) media[p.slug] = { kind: "hero", src: `/${rel}`, ...s, ...(ss ? { small: { src: `/${smallRel}`, ...ss } } : {}) };
    }
  }
  return media;
}

/* ── Main ─────────────────────────────────────────────────── */
async function main() {
  const t0 = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  if (await exists(PUBLIC)) await cp(PUBLIC, DIST, { recursive: true });

  const [css, js, media] = await Promise.all([buildCss(), buildJs(), findMedia()]);
  const assets = { css, vendor: js.vendor, entry: js.entry, preload: js.preload };

  const pages: { path: string; file: string; html: string; sitemap: boolean }[] = [
    {
      path: "/",
      file: "index.html",
      sitemap: true,
      html: layout({ assets, ...homeMeta, path: "/", body: home(media), jsonLd: homeJsonLd(), chapter: "home", intro: true }),
    },
    {
      path: "/privacy/",
      file: "privacy/index.html",
      sitemap: true,
      html: layout({ assets, ...privacyMeta, path: "/privacy/", body: privacy(), chapter: "home" }),
    },
    {
      path: "/404",
      file: "404.html",
      sitemap: false,
      html: layout({ assets, ...notFoundMeta, path: "/404", body: notFound(), noindex: true, chapter: "home" }),
    },
  ];

  for (const p of pages) {
    const out = join(DIST, p.file);
    await mkdir(join(out, ".."), { recursive: true });
    await writeFile(out, p.html);
  }

  const today = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .filter((p) => p.sitemap)
      .map((p) => `  <url><loc>${site.url}${p.path}</loc><lastmod>${today}</lastmod></url>`)
      .join("\n")}\n</urlset>\n`
  );
  await writeFile(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
  await writeFile(
    join(DIST, "site.webmanifest"),
    JSON.stringify(
      {
        name: site.name,
        short_name: site.short,
        description: site.description,
        start_url: "/",
        display: "standalone",
        background_color: site.themeColor,
        theme_color: site.themeColor,
        icons: [
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
  console.log(`\n  Rudra InfoTech Lab — build complete in ${Date.now() - t0} ms\n`);
  for (const p of pages) {
    console.log(`  ${p.file.padEnd(20)} ${kb(Buffer.byteLength(p.html)).padStart(9)}  (gzip ${kb(gzipSync(p.html).length)})`);
  }
  let jsTotal = 0;
  let jsGz = 0;
  for (const f of await walk(join(DIST, "assets"))) {
    if (f.endsWith(".map")) continue;
    const c = await readFile(f);
    jsTotal += c.length;
    jsGz += gzipSync(c).length;
  }
  console.log(`  ${`js (${js.count} modules)`.padEnd(20)} ${kb(jsTotal).padStart(9)}  (gzip ${kb(jsGz)})`);
  console.log(`  ${"css (inlined)".padEnd(20)} ${kb(css.length).padStart(9)}  (gzip ${kb(gzipSync(css).length)})`);
  const kinds = Object.values(media).map((m) => m.kind);
  console.log(`  project media: ${kinds.filter((k) => k === "shot").length} screenshots, ${kinds.filter((k) => k === "hero").length} hero images, ${projects.length - kinds.length} covers`);
  console.log(`  site url: ${site.url}  (from ${site.urlSource})`);
  if (site.url === PLACEHOLDER_URL) {
    console.warn(`\n  ⚠  site.url is still a placeholder (${site.url}).\n     On Vercel this is detected automatically; elsewhere set SITE_URL=https://yourdomain.com.`);
  }
  if (!site.form.endpoint && !site.contact.whatsapp && !site.contact.email) {
    console.warn(`  ⚠  No form endpoint, WhatsApp or email configured — enquiries can't be delivered yet.`);
  }
  console.log(`\n  Output: ${relative(ROOT, DIST)}/\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
