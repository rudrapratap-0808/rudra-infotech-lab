/**
 * Captures real screenshots of the portfolio sites into public/work/<slug>.png
 * using headless Chrome. Run on a machine with internet access:
 *   npm run screenshots && npm run build
 * The build uses public/work/<slug>.(webp|jpg|png) as a project's desktop screenshot
 * when none is set. With Supabase connected, upload screenshots in the admin instead.
 * Tip: convert to WebP afterwards for smaller files (e.g. `cwebp -q 82 in.png -o out.webp`).
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PUBLIC } from "./paths.js";
import { findChrome, screenshot } from "./chrome.js";
import { seedProjects } from "../src/data/seed.js";

const projects = seedProjects.filter((p) => p.live_url).map((p) => ({ slug: p.slug, name: p.name, url: p.live_url! }));

async function main() {
  const chrome = await findChrome();
  const dir = join(PUBLIC, "work");
  await mkdir(dir, { recursive: true });
  let ok = 0;
  for (const p of projects) {
    const out = join(dir, `${p.slug}.png`);
    try {
      // Chrome happily screenshots error pages, so confirm the site responds first.
      const res = await fetch(p.url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      screenshot(chrome, p.url, out, 1440, 900, ["--virtual-time-budget=8000"]);
      console.log(`  ✓ ${p.name} → public/work/${p.slug}.png`);
      ok++;
    } catch (e) {
      console.warn(`  ✗ ${p.name}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`\n  ${ok}/${projects.length} captured. Re-run \`npm run build\` to use them.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
