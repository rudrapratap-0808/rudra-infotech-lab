/**
 * Crops + encodes seed imagery to WebP with headless Chrome.
 *   npm run images
 * Source files live in .imagery/ (not committed — they come from each project's own repo).
 * Output: public/work/<name>.webp (+ <name>-800w.webp for 16:10 frames)
 */
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PUBLIC, ROOT } from "./paths.js";
import { launch, sleep } from "./cdp.js";

interface Job {
  out: string;
  src: string;
  /** width / height of the crop */
  ratio: number;
  /** Focus point for the crop, 0..1 on each axis. */
  fx: number;
  fy: number;
  maxW: number;
  /** Also write an 800w variant. */
  small?: boolean;
}

const FRAME = 16 / 10;
const PHONE = 9 / 19.5;

const JOBS: Job[] = [
  { out: "dotaanke-store-hero", src: "dotaanke-craft.jpg", ratio: FRAME, fx: 0.5, fy: 0.45, maxW: 1280, small: true },
  { out: "sarkar2-0-pw-hero", src: "sarkar-hero.jpg", ratio: FRAME, fx: 0.55, fy: 0.5, maxW: 1440, small: true },
  { out: "rahulconstructionwork-site-hero", src: "rahul-p1.jpg", ratio: FRAME, fx: 0.5, fy: 0.35, maxW: 1200, small: true },
  { out: "the-lord-cafe-hero", src: "lordcafe-margherita.jpg", ratio: FRAME, fx: 0.5, fy: 0.5, maxW: 960, small: true },
  { out: "the-lord-cafe-margherita-phone", src: "lordcafe-margherita.jpg", ratio: PHONE, fx: 0.46, fy: 0.5, maxW: 520 },
  { out: "the-lord-cafe-pepperoni-phone", src: "lordcafe-pepperoni.jpg", ratio: PHONE, fx: 0.5, fy: 0.5, maxW: 520 },
  { out: "the-lord-cafe-burger-phone", src: "lordcafe-burger.jpg", ratio: PHONE, fx: 0.5, fy: 0.5, maxW: 440 },
];

/** Copied as-is (already the right format). */
const COPIES = [{ src: "lordcafe-favicon.png", out: "the-lord-cafe-icon.png" }];

async function main() {
  const dir = join(ROOT, ".imagery");
  const out = join(PUBLIC, "work");
  await mkdir(out, { recursive: true });
  const has = (f: string) => stat(f).then(() => true, () => false);
  for (const c of COPIES) {
    if (await has(join(dir, c.src))) {
      await copyFile(join(dir, c.src), join(out, c.out));
      console.log(`  ✓ ${c.out} (copied)`);
    } else console.warn(`  ✗ ${c.out}: missing .imagery/${c.src}`);
  }
  const { page, close } = await launch(9446);
  await sleep(300);
  for (const job of JOBS) {
    const file = join(dir, job.src);
    if (!(await has(file))) {
      console.warn(`  ✗ ${job.out}: missing .imagery/${job.src}`);
      continue;
    }
    const b64 = (await readFile(file)).toString("base64");
    const res = await page.eval<Record<string, string>>(`(async () => {
      const img = new Image();
      img.src = "data:image/jpeg;base64,${b64}";
      await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight, R = ${job.ratio};
      let cw = W, ch = Math.round(W / R);
      if (ch > H) { ch = H; cw = Math.round(H * R); }
      const sx = Math.round((W - cw) * ${job.fx}), sy = Math.round((H - ch) * ${job.fy});
      const enc = (w, q) => {
        const h = Math.round(w / R);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
        x.drawImage(img, sx, sy, cw, ch, 0, 0, w, h);
        return c.toDataURL("image/webp", q).split(",")[1];
      };
      const full = Math.min(${job.maxW}, cw);
      return { full: enc(full, 0.72), small: ${job.small ? "enc(800, 0.68)" : "''"}, size: full + "x" + Math.round(full / R) };
    })()`);
    await writeFile(join(out, `${job.out}.webp`), Buffer.from(res.full, "base64"));
    if (res.small) await writeFile(join(out, `${job.out}-800w.webp`), Buffer.from(res.small, "base64"));
    const kb = (s: string) => ((s.length * 3) / 4 / 1024).toFixed(0);
    console.log(`  ✓ ${job.out}.webp ${res.size} (${kb(res.full)} KB)${res.small ? ` + 800w (${kb(res.small)} KB)` : ""}`);
  }
  close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
