/**
 * Generates the Open Graph image and PNG app icons into /public using headless Chrome.
 *   npm run og
 * (With internet access the brand fonts load from Google Fonts; offline it falls back to system fonts.)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PUBLIC, ROOT } from "./paths.js";
import { findChrome, screenshot } from "./chrome.js";

const TMP = join(ROOT, ".build/og");

const ogHtml = (mark: string) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&family=Instrument+Serif:ital@1&display=block">
<style>
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;background:#07070a;color:#efebe4;font-family:Geist,"Noto Sans",system-ui,sans-serif;overflow:hidden}
body{position:relative;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.grid{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(239,235,228,.16) 1.2px,transparent 1.8px);background-size:30px 30px;-webkit-mask-image:radial-gradient(70% 90% at 75% 40%,#000,transparent 80%)}
.glow{position:absolute;right:-180px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,107,44,.3),transparent)}
.top,.bottom{position:relative;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:16px;font-size:26px;letter-spacing:-.02em;font-weight:500}
.brand span{color:#8e8c93}
.brand svg{width:48px;height:48px}
.mono{font-family:"Geist Mono",ui-monospace,monospace;font-size:17px;letter-spacing:.08em;text-transform:uppercase;color:#8e8c93}
h1{position:relative;font-size:92px;line-height:.92;letter-spacing:-.055em;font-weight:500;max-width:1000px}
em{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-weight:400;letter-spacing:-.02em;color:#ff7a3d}
.pill{display:flex;align-items:center;gap:12px;padding:14px 26px;border-radius:999px;background:#ff6b2c;color:#160903;font-size:22px;font-weight:500}
</style></head><body>
<div class="glow"></div><div class="grid"></div>
<div class="top"><div class="brand">${mark}<div>Rudra <span>InfoTech</span> Lab</div></div><div class="mono">Web design &amp; development</div></div>
<h1>We build websites that make businesses <em>impossible</em> to ignore.</h1>
<div class="bottom"><div class="mono">Business sites · E-commerce · Landing pages · Redesigns</div><div class="pill">Start a Project <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></svg></div></div>
</body></html>`;

const iconHtml = (svg: string, size: number) => `<!doctype html><html><head><style>
*{margin:0}html,body{width:${size}px;height:${size}px;background:#07070a;overflow:hidden}
img{width:${size}px;height:${size}px;display:block}
</style></head><body><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`;

async function main() {
  const chrome = await findChrome();
  await mkdir(TMP, { recursive: true });
  const favicon: string = await readFile(join(PUBLIC, "favicon.svg"), "utf8");
  const mark = favicon.replace(/<svg[^>]*>/, '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">');

  const ogFile = join(TMP, "og.html");
  await writeFile(ogFile, ogHtml(mark));
  screenshot(chrome, pathToFileURL(ogFile).href, join(PUBLIC, "og.png"), 1200, 630, ["--virtual-time-budget=4000"]);
  console.log("  ✓ public/og.png");

  for (const [name, size] of [
    ["favicon-32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
  ] as const) {
    const f = join(TMP, `${name}.html`);
    await writeFile(f, iconHtml(favicon, size));
    screenshot(chrome, pathToFileURL(f).href, join(PUBLIC, name), size, size);
    console.log(`  ✓ public/${name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
