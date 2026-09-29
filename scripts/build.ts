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
import type { Shot } from "../src/components/work.js";

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

async function buildJs() {
  const files = (await walk(CLIENT_OUT)).filter((f) => f.endsWith(".js"));
  const hash = createHash("sha256");
  const contents: [string, string][] = [];
  for (const f of files.sort()) {
    const code = minifyJs(await readFile(f, "utf8"));
    hash.update(f + code);
    contents.push([relative(CLIENT_OUT, f), code]);
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
  return { base, entry: `${base}/main.js`, preload, count: contents.length };
}

/* ── Screenshots (public/work/<slug>.webp|jpg|png) ────────── */
async function findShots(): Promise<Record<string, Shot>> {
  const shots: Record<string, Shot> = {};
  for (const p of projects) {
    for (const ext of ["webp", "jpg", "jpeg", "png"]) {
      const file = join(PUBLIC, "work", `${p.slug}.${ext}`);
      if (await exists(file)) {
        const size = imageSize(await readFile(file));
        if (size) shots[p.slug] = { src: `/work/${p.slug}.${ext}`, ...size };
        break;
      }
    }
  }
  return shots;
}

/* ── Main ─────────────────────────────────────────────────── */
async function main() {
  const t0 = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  if (await exists(PUBLIC)) await cp(PUBLIC, DIST, { recursive: true });

  const [css, js, shots] = await Promise.all([buildCss(), buildJs(), findShots()]);
  const common = { css, scripts: [js.entry], modulePreload: js.preload };

  const pages: { path: string; file: string; html: string; sitemap: boolean }[] = [
    {
      path: "/",
      file: "index.html",
      sitemap: true,
      html: layout({ ...common, ...homeMeta, path: "/", body: home(shots), jsonLd: homeJsonLd() }),
    },
    {
      path: "/privacy/",
      file: "privacy/index.html",
      sitemap: true,
      html: layout({ ...common, ...privacyMeta, path: "/privacy/", body: privacy() }),
    },
    {
      path: "/404",
      file: "404.html",
      sitemap: false,
      html: layout({ ...common, ...notFoundMeta, path: "/404", body: notFound(), noindex: true }),
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
    const c = await readFile(f);
    jsTotal += c.length;
    jsGz += gzipSync(c).length;
  }
  console.log(`  ${`js (${js.count} modules)`.padEnd(20)} ${kb(jsTotal).padStart(9)}  (gzip ${kb(jsGz)})`);
  console.log(`  ${"css (inlined)".padEnd(20)} ${kb(css.length).padStart(9)}  (gzip ${kb(gzipSync(css).length)})`);
  console.log(`  screenshots found: ${Object.keys(shots).length}/${projects.length}`);
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
