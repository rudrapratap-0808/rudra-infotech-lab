import { $, $$, clamp, finePointer, reducedMotion } from "../lib/dom.js";
import { onResize, onScroll, viewport } from "../lib/loop.js";

/** Statement: words light up one by one as the block scrolls through the viewport. */
export function initScrub(): void {
  const el = $("[data-scrub]");
  if (!el) return;
  const words = $$(".sw", el);
  if (reducedMotion()) {
    words.forEach((w) => w.classList.add("is-lit"));
    return;
  }
  let lit = -1;
  onScroll(() => {
    const r = el.getBoundingClientRect();
    const startY = viewport.h * 0.88;
    const endY = viewport.h * 0.38;
    const p = clamp((startY - r.top) / (startY - endY + r.height * 0.6), 0, 1);
    const n = Math.round(p * words.length);
    if (n === lit) return;
    lit = n;
    words.forEach((w, i) => w.classList.toggle("is-lit", i < n));
  });
}

/** Work: parallax inside browser frames + gentle 3D tilt on hover. */
export function initWork(): void {
  const items = $$("[data-parallax]");
  if (!items.length || reducedMotion()) return;

  const inView = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? inView.add(e.target as HTMLElement) : inView.delete(e.target as HTMLElement);
  });
  items.forEach((el) => io.observe(el));

  onScroll(() => {
    inView.forEach((el) => {
      const r = el.parentElement!.getBoundingClientRect();
      const center = r.top + r.height / 2 - viewport.h / 2;
      const p = clamp(center / viewport.h, -1, 1);
      el.style.setProperty("--py", `${(p * -r.height * 0.06).toFixed(1)}px`);
    });
  });

  if (!finePointer()) return;
  for (const media of $$("[data-tilt]")) {
    const frame = $(".frame", media);
    if (!frame) continue;
    media.addEventListener("pointermove", (e) => {
      const r = media.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
      frame.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
    });
    media.addEventListener("pointerleave", () => {
      frame.style.setProperty("--ry", "0deg");
      frame.style.setProperty("--rx", "0deg");
    });
  }
}

/** Process: active step, sticky counter, progress line. */
export function initProcess(): void {
  const section = $("[data-process]");
  if (!section) return;
  const steps = $$("[data-step]", section);
  const digits = $("[data-process-digits]", section);
  const name = $("[data-process-name]", section);
  const bar = $("[data-process-bar]", section);
  const line = $("[data-process-line]", section);
  const track = $(".process__track", section);
  const titles = steps.map((s) => $(".step__title", s)?.textContent || "");
  let current = -1;

  const update = () => {
    const mark = viewport.h * 0.55;
    let idx = 0;
    steps.forEach((s, i) => {
      if (s.getBoundingClientRect().top <= mark) idx = i;
    });
    if (track && line) {
      const r = track.getBoundingClientRect();
      line.style.setProperty("--p", clamp((mark - r.top) / r.height, 0, 1).toFixed(3));
    }
    if (idx === current) return;
    current = idx;
    steps.forEach((s, i) => {
      s.classList.toggle("is-active", i === idx);
      s.classList.toggle("is-done", i < idx);
    });
    digits?.style.setProperty("--step", String(idx));
    if (name) name.textContent = titles[idx];
    bar?.style.setProperty("--p", ((idx + 1) / steps.length).toFixed(3));
  };
  onScroll(update);
  onResize(update);
}

/** "Why" grid: one soft light that travels across all cells with the pointer. */
export function initSpotlight(): void {
  const grid = $("[data-spotlight]");
  if (!grid || !finePointer()) return;
  const cells = $$(".why__cell", grid);
  let raf = 0;
  let ex = 0;
  let ey = 0;
  grid.addEventListener("pointermove", (e) => {
    ex = e.clientX;
    ey = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      for (const c of cells) {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", `${ex - r.left}px`);
        c.style.setProperty("--my", `${ey - r.top}px`);
      }
    });
  });
  grid.addEventListener("pointerleave", () => {
    for (const c of cells) {
      c.style.setProperty("--mx", "-500px");
      c.style.setProperty("--my", "-500px");
    }
  });
}

/** CTA: the glow orb drifts toward the pointer. */
export function initCtaOrb(): void {
  const cta = $("[data-cta]");
  const orb = $(".cta__orb", cta || document);
  if (!cta || !orb || !finePointer() || reducedMotion()) return;
  cta.addEventListener("pointermove", (e) => {
    const r = cta.getBoundingClientRect();
    orb.style.setProperty("--ox", `${(((e.clientX - r.left) / r.width) * 100 * 0.5 + 25).toFixed(1)}%`);
    orb.style.setProperty("--oy", `${(((e.clientY - r.top) / r.height) * 100 * 0.5 + 30).toFixed(1)}%`);
  });
}
