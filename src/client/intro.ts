/**
 * 00 → 01: the constructed R counts up, its construction lines extend across the
 * viewport and settle into the 12-column grid, then the R flies into the R of
 * RUDRA while the rest of the word unfolds out of it.
 */
import { $, $$, lenis, pad, root } from "./core.js";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const loaded = () => new Promise<void>((r) => (document.readyState === "complete" ? r() : addEventListener("load", () => r(), { once: true })));

export async function intro(): Promise<void> {
  const pre = $("[data-preloader]");
  if (!root.classList.contains("intro") || !pre) {
    root.classList.remove("intro");
    pre?.remove();
    return;
  }
  lenis?.stop();
  window.scrollTo(0, 0);

  const R = $("[data-pre-r]", pre)!;
  const bg = $("[data-pre-bg]", pre)!;
  const count = $("[data-pre-count]", pre)!;
  const xy = $("[data-pre-xy]", pre);
  const H = $$(".pre__h", pre);
  const V = $$(".pre__v", pre);
  const ring = $(".pre__ring", pre);
  const cols = $$(".pre__grid i", pre);
  const tags = $$(".pre__tag, .pre__count", pre);
  const box = $("[data-pre-box]", pre)!;

  const bw = box.offsetWidth / innerWidth;
  const bh = box.offsetHeight / innerHeight;
  gsap.set(H, { scaleX: bw });
  gsap.set(V, { scaleY: bh });
  gsap.set(cols, { scaleY: 0 });
  gsap.set(R, { clipPath: "inset(100% 0% 0% 0%)" });

  // Hero targets start hidden (they are covered by the preloader until now).
  const heroChars = $$(".hero__w--rudra .ch").slice(1);
  const firstR = $(".hero__w--rudra .ch");
  const infotech = $$(".hero__w--infotech .ch");
  const lab = $$(".hero__w--lab .ch");
  const serif = $$("[data-hero-serif] .ln__i");
  const metas = $$("[data-hero-meta] > span");
  const copy = $$("[data-hero-copy] > *");
  const rect = $("[data-hero-rect]");
  const planes = $("[data-planes]");
  const foot = $("[data-hero-foot]");
  gsap.set(firstR, { opacity: 0 });
  gsap.set(heroChars, { clipPath: "inset(0% 100% 0% 0%)" });
  gsap.set([...infotech, ...lab], { yPercent: 105, clipPath: "inset(0% 0% 0% 0%)" });
  gsap.set(serif, { yPercent: 110 });
  gsap.set(metas, { yPercent: 110 });
  gsap.set(copy, { clipPath: "inset(0% 0% 100% 0%)" });
  if (rect) gsap.set(rect, { clipPath: "inset(100% 0% 0% 0%)" });
  if (planes) gsap.set(planes, { opacity: 0, yPercent: 12 });
  if (foot) gsap.set(foot, { opacity: 0 });

  const ready = Promise.race([Promise.all([document.fonts.ready, loaded()]), wait(2800)]);
  const p = { v: 0 };
  const onMove = (e: PointerEvent) => { if (xy) xy.textContent = `X: ${pad(e.clientX, 4)} Y: ${pad(e.clientY, 4)}`; };
  addEventListener("pointermove", onMove, { passive: true });

  const build = gsap.timeline({ defaults: { ease: "power3.inOut" } })
    .to(R, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power4.out" }, 0)
    .to(p, { v: 100, duration: 1.2, ease: "power2.inOut", onUpdate: () => { count.textContent = pad(p.v); } }, 0.1)
    .to(H, { scaleX: 1, duration: 1.1, stagger: 0.07 }, 0.15)
    .to(V, { scaleY: 1, duration: 1.1, stagger: 0.07 }, 0.25);
  await Promise.all([build.then(), ready]);
  removeEventListener("pointermove", onMove);

  // Lines settle into the website grid
  await gsap.timeline()
    .to(cols, { scaleY: 1, duration: 0.45, ease: "power3.out", stagger: { each: 0.02, from: "center" } }, 0)
    .to([...H, ...V, ring], { opacity: 0, duration: 0.35, ease: "power2.out" }, 0.2)
    .to(tags, { yPercent: -120, opacity: 0, duration: 0.35, ease: "power2.in" }, 0.1)
    .then();

  // FLIP: preloader R → the R of RUDRA
  const from = R.getBoundingClientRect();
  const to = firstR!.getBoundingClientRect();
  const s = parseFloat(getComputedStyle(firstR!).fontSize) / parseFloat(getComputedStyle(R).fontSize);
  const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
  tl.to(bg, { opacity: 0, duration: 0.35, ease: "power1.out" }, 0.45)
    .to(R, { x: to.left - from.left, y: to.top - from.top, scale: s, duration: 1.0 }, 0)
    .to(cols, { opacity: 0, duration: 0.6, ease: "power1.out" }, 0.9)
    .to(heroChars, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, stagger: 0.06, ease: "power4.out" }, 0.82)
    .to(infotech, { yPercent: 0, duration: 0.8, stagger: 0.03, ease: "power4.out" }, 0.85)
    .to(lab, { yPercent: 0, duration: 0.9, stagger: 0.05, ease: "power4.out" }, 0.9)
    .to(serif, { yPercent: 0, duration: 0.8, ease: "power4.out" }, 1.05)
    .to(metas, { yPercent: 0, duration: 0.6, stagger: 0.04, ease: "power3.out" }, 1.0);
  if (rect) tl.to(rect, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.inOut" }, 0.8);
  if (planes) tl.to(planes, { opacity: 1, yPercent: 0, duration: 1.0, ease: "power3.out" }, 1.05);
  tl.to(copy, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, stagger: 0.07, ease: "power3.out" }, 1.15);
  if (foot) tl.to(foot, { opacity: 1, duration: 0.5 }, 1.4);
  tl.add(() => {
    gsap.set(firstR, { opacity: 1 });
    pre.remove();
  }, 1.01);
  await tl.then();

  gsap.set([...heroChars, ...infotech, ...lab, ...copy], { clearProps: "clipPath" });
  if (rect) gsap.set(rect, { clearProps: "clipPath" });
  root.classList.remove("intro");
  lenis?.start();
  ScrollTrigger.refresh();
}
