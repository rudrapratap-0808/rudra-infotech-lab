/** Interactive pieces that work with or without the scroll choreography. */
import { $, $$, finePointer, hasGsap, reduced } from "./core.js";

/* Hero planes: pointer tilt (±4°) + press to assemble / explode */
export function initPlanes(): void {
  const planes = $<HTMLButtonElement>("[data-planes]");
  const stack = $("[data-planes-stack]");
  const hero = $("[data-hero]");
  if (!planes || !stack || !hero || !hasGsap() || reduced()) return;
  if (finePointer()) {
    const rx = gsap.quickTo(stack, "--rx", { duration: 0.8, ease: "power3.out" });
    const ry = gsap.quickTo(stack, "--ry", { duration: 0.8, ease: "power3.out" });
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      rx(((e.clientY - r.top) / r.height - 0.5) * -8);
      ry(((e.clientX - r.left) / r.width - 0.5) * 8);
    });
    hero.addEventListener("pointerleave", () => { rx(0); ry(0); });
  }
  planes.addEventListener("click", () => {
    const on = planes.getAttribute("aria-pressed") !== "true";
    planes.setAttribute("aria-pressed", String(on));
    planes.setAttribute("aria-label", on ? "Separate the website back into design, code and launch layers" : "Assemble the design, code and launch layers into one website");
    gsap.to(planes, { "--k": on ? 0 : 1, duration: 1.1, ease: "power3.inOut" });
  });
}

/* Why: disclosure rows — click / tap / Enter / Space toggles (no hover-open: rows don't shift under the pointer) */
export function initWhy(): void {
  for (const row of $$("[data-why]")) {
    const btn = $<HTMLButtonElement>("[data-why-btn]", row);
    if (!btn) continue;
    btn.addEventListener("click", () => {
      const open = !row.classList.contains("is-open");
      row.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  }
}

/* Toolkit lanes: decorative, slow and constant. The readable list is .kit__index;
   nothing needs dragging or hovering to be discovered. Paused off-screen and for reduced motion. */
export function initLanes(): void {
  const kit = $("[data-kit]");
  if (!kit || reduced()) return;
  const lanes = $$("[data-lane]", kit).map((el) => ({
    track: $("[data-lane-track]", el)!,
    dir: Number(el.dataset.dir) || 1,
    x: 0,
    w: 0,
  }));
  const measure = () => lanes.forEach((l) => (l.w = (l.track.firstElementChild as HTMLElement).offsetWidth));
  measure();
  document.fonts?.ready.then(measure);
  addEventListener("resize", measure);

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(kit);
  const speed = matchMedia("(max-width: 600px)").matches ? 18 : 30;

  const step = (dt: number) => {
    if (!visible) return;
    for (const l of lanes) {
      if (!l.w) continue;
      l.x -= l.dir * speed * dt;
      l.x = ((l.x % l.w) - l.w) % l.w;
      l.track.style.transform = `translate3d(${l.x.toFixed(2)}px,0,0)`;
    }
  };
  if (hasGsap()) gsap.ticker.add((_t: number, dtMs: number) => step(Math.min(0.05, dtMs / 1000)));
  else {
    let prev = performance.now();
    const loop = (now: number) => { step(Math.min(0.05, (now - prev) / 1000)); prev = now; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}

/* Process visual on small screens: cycles through the six stages while in view */
export function initViz(): void {
  const viz = $("[data-viz]");
  if (!viz || reduced()) return;
  let timer = 0;
  let i = 0;
  new IntersectionObserver(([e]) => {
    if (document.documentElement.classList.contains("stage")) return;
    clearInterval(timer);
    if (e.isIntersecting) timer = window.setInterval(() => { i = (i + 1) % 6; viz.dataset.stage = String(i); }, 1400);
  }).observe(viz);
}
