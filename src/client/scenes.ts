/**
 * Scroll choreography — a deliberately small vocabulary:
 *   · modest translation of display type (never far enough to crop essential words)
 *   · one-shot line masks for statements (content is fully readable once revealed)
 *   · controlled image movement inside fixed frames
 *   · one pinned stage (the process line) with a short, readable scroll distance
 * Every chapter is a complete static layout without this file (no JS / reduced motion).
 * gsap.matchMedia reverts everything on breakpoint change.
 */
import { $, $$, pad, root } from "./core.js";

type El = HTMLElement;
/** Tween only when there is something to animate (avoids GSAP "target not found" noise). */
const has = (t: El[] | El | null | undefined): t is El[] | El => !!t && (!Array.isArray(t) || t.length > 0);
const once = (trigger: El | string, start = "top 85%") => ({ trigger, start, once: true });

/* ── 01 Hero: the planes assemble as the hero scrolls away (no pin, copy untouched) ── */
function heroScene() {
  const stage = $("[data-hero]");
  const planes = $("[data-planes]");
  if (!stage || !planes) return;
  gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: stage, start: "top top", end: "bottom top", scrub: true } })
    .to(planes, { "--tilt": 0, "--spread": 0 }, 0)
    .to($("[data-hero-visual]", stage), { yPercent: -8 }, 0);
}

/* ── 02 Philosophy ────────────────────────────────────────── */
function philosophy() {
  if (has($$(".phil__statement .ln__i")))
    gsap.from(".phil__statement .ln__i", { yPercent: 108, duration: 1, ease: "power4.out", stagger: 0.1, scrollTrigger: once(".phil__statement", "top 85%") });
  for (const pw of $$("[data-pw]")) {
    ScrollTrigger.create({ trigger: pw, start: "top 70%", end: "bottom 30%", toggleClass: "is-on" });
    const chars = $$(".pw__chars .ch", pw);
    const mid = (chars.length - 1) / 2;
    if (has(chars))
      gsap.fromTo(chars, { xPercent: (i: number) => (i - mid) * 10 }, {
        xPercent: 0, ease: "none", scrollTrigger: { trigger: pw, start: "top bottom", end: "top 35%", scrub: true },
      });
  }
}

/* ── 03 Work intro ────────────────────────────────────────── */
function workIntro() {
  const letters = $$(".wi__word .ch");
  if (has(letters))
    gsap.fromTo(letters, { xPercent: (i: number) => (i - 1.5) * 14 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: ".wi", start: "top bottom", end: "top 25%", scrub: true } });
}

/* ── 04 Work reel: each project is a stable, readable block; only the image moves ── */
function reel(desk: boolean) {
  for (const p of $$("[data-proj]")) {
    const frame = $(".frame", p);
    const img = $("[data-proj-img]", p);
    const media = $("[data-proj-media]", p);
    if (frame)
      gsap.fromTo(frame, { scale: 0.94 }, { scale: 1, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "top 30%", scrub: true } });
    if (img)
      gsap.fromTo(img, { yPercent: -2.5 }, { yPercent: 2.5, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "bottom top", scrub: true } });
    if (!desk || !media || !img) continue;
    // Pointer: the image drifts a few px with the cursor (desktop only)
    const x = gsap.quickTo(img, "x", { duration: 0.6, ease: "power3.out" });
    const y = gsap.quickTo(img, "y", { duration: 0.6, ease: "power3.out" });
    media.addEventListener("pointermove", (e) => {
      const r = media.getBoundingClientRect();
      x(((e.clientX - r.left) / r.width - 0.5) * -16);
      y(((e.clientY - r.top) / r.height - 0.5) * -10);
    });
    media.addEventListener("pointerleave", () => { x(0); y(0); });
  }
}

/* ── 05 Services: symbols draw themselves once; names and copy are never transformed ── */
function services() {
  for (const el of $$("[data-svc-item]")) {
    const d = $$(".si__sym .d:not(.dash)", el);
    if (has(d)) gsap.fromTo(d, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power3.out", stagger: 0.05, scrollTrigger: once(el, "top 88%") });
  }
}

/* ── 06 Why ───────────────────────────────────────────────── */
function whyScene() {
  $$(".why__i").forEach((w, i) =>
    gsap.fromTo(w, { xPercent: i % 2 ? 8 : 4 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "top 45%", scrub: true } })
  );
}

/* ── 07 Process (desktop): one pinned line, ~half a screen per stage ── */
function processPinned() {
  const stage = $("[data-proc]");
  if (!stage) return;
  const steps = $$("[data-step]", stage);
  const N = steps.length;
  if (!N) return;
  const last = Math.max(1, N - 1);
  const fill = $("[data-proc-fill]", stage)!;
  const phase = $("[data-proc-phase]", stage);
  const viz = $("[data-viz]", stage);
  let cur = -1;
  const set = (i: number) => {
    if (i === cur) return;
    cur = i;
    steps.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.classList.toggle("is-done", k < i); });
    if (phase) phase.textContent = pad(i + 1);
    if (viz) viz.dataset.stage = String(Math.round((i / last) * 5));
  };
  set(0);
  const node = (v: number) => {
    const W = stage.clientWidth, m = parseFloat(getComputedStyle(root).getPropertyValue("--m")) || 40;
    return (m + 48 + (W - 2 * m - 96) * (v / last)) / W;
  };
  ScrollTrigger.create({
    trigger: stage, start: "top top", end: () => `+=${innerHeight * N * 0.5}`, pin: true, invalidateOnRefresh: true,
    onUpdate: (s: ScrollTrigger) => {
      // The last stage holds for the final ~12% so it can be read before the pin releases.
      const q = Math.min(1, s.progress / 0.88);
      set(Math.min(N - 1, Math.floor(q * N)));
      fill.style.setProperty("--p", node(q * last).toFixed(4));
    },
  });
  // Keyboard / anchor: every step stays reachable — it's a list in the DOM, the pin only stages it.
}

function processLite() {
  for (const s of $$("[data-step]")) {
    ScrollTrigger.create({ trigger: s, start: "top 60%", end: "bottom 40%", toggleClass: "is-active" });
  }
}

/* ── Apps: APP / ANDROID drift a little, phones float at different speeds ── */
function appsScene() {
  for (const w of $$("[data-apps-w]")) {
    gsap.fromTo(w, { xPercent: w.classList.contains("apps__w--app") ? -6 : 6 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "top 40%", scrub: true } });
  }
  for (const set of $$("[data-app-phones]")) {
    $$("[data-phone]", set).forEach((ph, i) =>
      gsap.fromTo(ph, { y: [40, 0, 70][i] ?? 30 }, { y: [-20, 0, -30][i] ?? -15, ease: "none", scrollTrigger: { trigger: set, start: "top bottom", end: "bottom top", scrub: true } })
    );
  }
}

/* ── 08 Lab → 09 Manifesto → 10 Contact → Footer ── */
function closingScenes() {
  const r = $(".mono-r");
  if (r) {
    const guides = $$(".mono-r__guides .d", r);
    gsap.set(guides, { strokeDashoffset: 1 });
    gsap.timeline({ defaults: { ease: "power2.inOut" }, scrollTrigger: { trigger: ".lab__r", start: "top 88%", end: "bottom 60%", scrub: true } })
      .to(guides, { strokeDashoffset: 0, duration: 0.5, stagger: 0.03 }, 0)
      .from(".mono-r__stem", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.3 }, 0.4)
      .from(".mono-r__bowl", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.3 }, 0.55)
      .from(".mono-r__leg", { scale: 0, transformOrigin: "0% 0%", duration: 0.3 }, 0.7)
      .from(".mono-r__labels", { opacity: 0, duration: 0.2 }, 0.8);
  }
  if (has($$(".lab__statement .ln__i")))
    gsap.from(".lab__statement .ln__i", { yPercent: 108, duration: 1, ease: "power4.out", stagger: 0.1, scrollTrigger: once(".lab__statement", "top 85%") });

  const mani = $$(".mani__l");
  if (has(mani)) gsap.from(mani, { y: 36, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, scrollTrigger: once(".mani__text", "top 80%") });
  if ($(".mani__strike"))
    gsap.fromTo(".mani__strike", { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power3.inOut", delay: 0.5, scrollTrigger: once(".mani__text", "top 70%") });

  if (has($$(".contact__title .ln__i")))
    gsap.from(".contact__title .ln__i", { yPercent: 106, duration: 1, ease: "power4.out", stagger: 0.1, scrollTrigger: once(".contact__title", "top 85%") });

  if ($(".foot__giant"))
    gsap.from(".foot__rudra, .foot__hl", { yPercent: 18, ease: "none", scrollTrigger: { trigger: ".foot__giant", start: "top bottom", end: "bottom bottom", scrub: true } });
}

export function initScenes(introDone: Promise<void>): void {
  const mm = gsap.matchMedia();
  mm.add({ desk: "(min-width: 1025px)", small: "(max-width: 1024px)" }, (ctx) => {
    const desk = !!(ctx.conditions as { desk?: boolean }).desk;
    // The hero scene is created after the intro so a refresh can't reset intro states.
    introDone.then(() => ctx.add(() => { heroScene(); ScrollTrigger.sort(); ScrollTrigger.refresh(); }));
    if (desk) {
      root.classList.add("stage");
      processPinned();
    } else processLite();
    reel(desk);
    services();
    if ($("[data-hero]")) {
      philosophy();
      workIntro();
      whyScene();
      closingScenes();
    }
    appsScene();
    return () => root.classList.remove("stage");
  });
}
