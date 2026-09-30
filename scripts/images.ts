/**
 * Crops + encodes project imagery to 16:10 WebP (full + 800w) with headless Chrome.
 *   npm run images
 * Source files live in .imagery/ (not committed — they come from each project's own repo).
 * Output: public/work/<slug>-hero.webp and public/work/<slug>-hero-800w.webp
 */
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PUBLIC, ROOT } from "./paths.js";
import { launch, sleep } from "./cdp.js";

interface Job {
  slug: string;
  src: string;
  /** Focus point for the crop, 0..1 on each axis. */
  fx: number;
  fy: number;
  maxW: number;
}

const JOBS: Job[] = [
  { slug: "dotaanke-store", src: "dotaanke-craft.jpg", fx: 0.5, fy: 0.45, maxW: 1400 },
  { slug: "sarkar2-0-pw", src: "sarkar-hero.jpg", fx: 0.55, fy: 0.5, maxW: 1600 },
  { slug: "rahulconstructionwork-site", src: "rahul-p1.jpg", fx: 0.5, fy: 0.35, maxW: 1200 },
];

const RATIO = 16 / 10;

async function main() {
  const dir = join(ROOT, ".imagery");
  const out = join(PUBLIC, "work");
  await mkdir(out, { recursive: true });
  const { page, close } = await launch(9446);
  await sleep(300);
  for (const job of JOBS) {
    const file = join(dir, job.src);
    if (!(await stat(file).then(() => true, () => false))) {
      console.warn(`  ✗ ${job.slug}: missing .imagery/${job.src}`);
      continue;
    }
    const b64 = (await readFile(file)).toString("base64");
    const res = await page.eval<Record<string, string>>(`(async () => {
      const img = new Image();
      img.src = "data:image/jpeg;base64,${b64}";
      await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight;
      let cw = W, ch = Math.round(W / ${RATIO});
      if (ch > H) { ch = H; cw = Math.round(H * ${RATIO}); }
      const sx = Math.round((W - cw) * ${job.fx}), sy = Math.round((H - ch) * ${job.fy});
      const enc = (w, q) => {
        const h = Math.round(w / ${RATIO});
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
        x.drawImage(img, sx, sy, cw, ch, 0, 0, w, h);
        return c.toDataURL("image/webp", q).split(",")[1];
      };
      const full = Math.min(${job.maxW}, cw);
      return { full: enc(full, 0.8), small: enc(800, 0.78), size: full + "x" + Math.round(full / ${RATIO}) };
    })()`);
    await writeFile(join(out, `${job.slug}-hero.webp`), Buffer.from(res.full, "base64"));
    await writeFile(join(out, `${job.slug}-hero-800w.webp`), Buffer.from(res.small, "base64"));
    const kb = (s: string) => ((s.length * 3) / 4 / 1024).toFixed(0);
    console.log(`  ✓ ${job.slug}-hero.webp ${res.size} (${kb(res.full)} KB) + 800w (${kb(res.small)} KB)`);
  }
  close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
