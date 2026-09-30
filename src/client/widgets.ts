/** Interactive pieces that work with or without the scroll choreography. */
import { $, $$, finePointer, hasGsap, lenis, reduced } from "./core.js";

/* Hero planes: pointer tilt (±4°) + press to assemble / explode */
export function initPlanes(): void {
  const planes = $<HTMLButtonElement>("[data-planes]");
  const stack = $("[data-planes-stack]");
  const hero = $("[data-hero]");
  if (!planes || !stack || !hero || !hasGsap() || reduced()) return;
  if (finePointer()) {
    const rx = gsap.quickTo(stack, "--rx", { duration: 0.8, ease: "power3.out" });
    const ry = gsap.quickTo(stack, "--ry", { duration: 0.8, ease: "power3.out" });
    const xy = $("[data-hero-xy]");
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      rx(((e.clientY - r.top) / r.height - 0.5) * -8);
      ry(((e.clientX - r.left) / r.width - 0.5) * 8);
      if (xy) xy.textContent = `X: ${String(Math.round(e.clientX)).padStart(4, "0")} Y: ${String(Math.round(e.clientY)).padStart(4, "0")}`;
    });
    hero.addEventListener("pointerleave", () => { rx(0); ry(0); });
  }
  planes.addEventListener("click", () => {
    const on = planes.getAttribute("aria-pressed") !== "true";
    planes.setAttribute("aria-pressed", String(on));
    planes.setAttribute("aria-label", on ? "Explode the website back into its five disciplines" : "Assemble the five disciplines into one website");
    gsap.to(planes, { "--k": on ? 0 : 1, duration: 1.1, ease: "power3.inOut" });
  });
}

/* Why: disclosure rows — hover previews on desktop, click/tap/Enter toggles */
export function initWhy(): void {
  const rows = $$("[data-why]");
  const hover = finePointer();
  for (const row of rows) {
    const btn = $<HTMLButtonElement>("[data-why-btn]", row);
    if (!btn) continue;
    let locked = false;
    const set = (open: boolean) => { row.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => { locked = !row.classList.contains("is-open") || !locked; set(locked); });
    if (hover) {
      row.addEventListener("pointerenter", () => { if (!locked) set(true); });
      row.addEventListener("pointerleave", () => { if (!locked) set(false); });
    }
  }
}

/* Toolkit lanes: continuous, direction follows scroll, draggable, hover highlight */
export function initLanes(): void {
  const kit = $("[data-kit]");
  if (!kit) return;
  const items = $$("[data-kt]", kit);
  items.forEach((it, i) => {
    it.addEventListener("pointerenter", () => { kit.classList.add("is-hover"); it.classList.add("is-hot"); it.classList.toggle("is-blue", i % 2 === 1); });
    it.addEventListener("pointerleave", () => { kit.classList.remove("is-hover"); it.classList.remove("is-hot"); });
  });
  if (reduced()) return;
  const lanes = $$("[data-lane]", kit).map((el) => ({
    el,
    track: $("[data-lane-track]", el)!,
    dir: Number(el.dataset.dir) || 1,
    x: 0,
    w: 0,
    drag: 0,
  }));
  const measure = () => lanes.forEach((l) => (l.w = (l.track.firstElementChild as HTMLElement).offsetWidth));
  measure();
  document.fonts?.ready.then(measure);
  addEventListener("resize", measure);

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(kit);
  let dirSign = 1;
  let dragging: (typeof lanes)[number] | null = null;
  let lastX = 0;
  const speed = matchMedia("(max-width: 600px)").matches ? 26 : 48;

  const step = (dt: number) => {
    if (!visible) return;
    const v = lenis ? lenis.velocity : 0;
    if (lenis && Math.abs(v) > 0.2) dirSign = v > 0 ? 1 : -1;
    const boost = 1 + Math.min(6, Math.abs(v) * 0.12);
    for (const l of lanes) {
      if (!l.w) continue;
      if (l !== dragging) l.x -= l.dir * dirSign * speed * boost * dt;
      l.x += l.drag;
      l.drag *= 0.9;
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

  kit.addEventListener("pointerdown", (e) => {
    const lane = lanes.find((l) => l.el.contains(e.target as Node));
    if (!lane) return;
    dragging = lane;
    lastX = e.clientX;
    kit.setPointerCapture(e.pointerId);
  });
  kit.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dragging.x += e.clientX - lastX;
    dragging.drag = (e.clientX - lastX) * 0.6;
    lastX = e.clientX;
  });
  const end = () => (dragging = null);
  kit.addEventListener("pointerup", end);
  kit.addEventListener("pointercancel", end);
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
