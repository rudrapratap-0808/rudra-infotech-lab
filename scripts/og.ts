/**
 * Generates the Open Graph image and PNG app icons into /public using headless Chrome.
 *   npm run og
 * Uses the self-hosted brand fonts in public/fonts.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PUBLIC, ROOT } from "./paths.js";
import { findChrome, screenshot } from "./chrome.js";

const TMP = join(ROOT, ".build/og");

const FONT = (f: string) => pathToFileURL(join(PUBLIC, "fonts", f)).href;
const ogHtml = () => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${FONT("archivo-black-latin-400.woff2")})}
@font-face{font-family:S;font-style:italic;src:url(${FONT("instrument-serif-latin-400-italic.woff2")})}
@font-face{font-family:M;src:url(${FONT("ibm-plex-mono-latin-400.woff2")})}
@font-face{font-family:I;src:url(${FONT("inter-tight-latin-wght.woff2")});font-weight:100 900}
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;background:#f1eee6;color:#0c0c0c;overflow:hidden}
body{position:relative;font-family:I,sans-serif}
.g{position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,1fr);column-gap:16px;padding:0 36px}
.g i{border-inline:1px solid rgba(12,12,12,.07)}
.rect{position:absolute;left:640px;top:352px;right:0;bottom:0;background:#ff4b18}
.m{position:absolute;top:30px;left:36px;right:36px;display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #0c0c0c;font:500 13px M,monospace;letter-spacing:.1em;text-transform:uppercase}
.d{position:absolute;font-family:A,sans-serif;text-transform:uppercase;letter-spacing:-.055em;line-height:.8;white-space:nowrap}
.r{top:78px;left:-20px;font-size:318px}
.i{top:352px;right:34px;font-size:106px}
.l{top:470px;left:-18px;font-size:318px}
.s{position:absolute;top:356px;left:36px;font:italic 64px S,serif;letter-spacing:-.02em}
.c{position:absolute;left:700px;bottom:34px;font:700 26px I,sans-serif;letter-spacing:-.03em;line-height:1.05;max-width:430px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#dfff36;box-shadow:0 0 0 1px #0c0c0c;margin-right:9px;vertical-align:1px}
</style></head><body>
<div class="g">${"<i></i>".repeat(12)}</div><div class="rect"></div>
<div class="m"><span>/ Digital foundry</span><span>India / Worldwide</span><span><i class="dot"></i>Available for projects</span></div>
<div class="d r">Rudra</div><div class="s">Impossible to ignore.</div><div class="d i">InfoTech</div><div class="d l">Lab</div>
<div class="c">We build websites that make businesses impossible to ignore.</div>
</body></html>`;

const iconHtml = (svg: string, size: number) => `<!doctype html><html><head><style>
*{margin:0}html,body{width:${size}px;height:${size}px;background:#f1eee6;overflow:hidden}
img{width:${size}px;height:${size}px;display:block}
</style></head><body><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`;

async function main() {
  const chrome = await findChrome();
  await mkdir(TMP, { recursive: true });
  const favicon: string = await readFile(join(PUBLIC, "favicon.svg"), "utf8");

  const ogFile = join(TMP, "og.html");
  await writeFile(ogFile, ogHtml());
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
