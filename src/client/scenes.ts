/**
 * Scroll choreography. Desktop (≥1025px) gets the pinned stages; smaller screens
 * get lighter, unpinned motion. gsap.matchMedia reverts everything on breakpoint change.
 */
import { navOverride } from "./chrome.js";
import { $, $$, pad, root, scrollTo } from "./core.js";

type El = HTMLElement;
/** Tween only when there is something to animate (avoids GSAP "target not found" noise). */
const has = (t: El[] | El | null | undefined): t is El[] | El => !!t && (!Array.isArray(t) || t.length > 0);
const px = (n: number) => `${n}px`;

/* ── 01 Hero ──────────────────────────────────────────────── */
function heroPinned() {
  const stage = $("[data-hero]");
  if (!stage) return;
  const foot = $("[data-hero-foot]", stage);
  const rudra = $(".hero__w--rudra", stage), lab = $(".hero__w--lab", stage), info = $(".hero__w--infotech", stage);
  const planes = $("[data-planes]", stage)!, rect = $("[data-hero-rect]", stage)!;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: stage, start: "top top", end: "+=100%", pin: true, scrub: true, invalidateOnRefresh: true, refreshPriority: 10 },
  });
  tl.to(rudra, { xPercent: -44, yPercent: -16 }, 0)
    .to(lab, { xPercent: 66, yPercent: 12 }, 0)
    .to(info, { xPercent: 80 }, 0)
    .to($$("[data-hero-serif] .ln__i", stage), { yPercent: -112 }, 0)
    .to($$("[data-hero-meta] > span", stage), { yPercent: -112 }, 0)
    .fromTo($$("[data-hero-copy] > *", stage), { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)", stagger: 0.04 }, 0)
    .to(foot ?? {}, { yPercent: 200 }, 0)
    .to(planes, {
      x: () => stage.clientWidth / 2 - (planes.offsetLeft + planes.offsetWidth / 2),
      y: () => stage.clientHeight * 0.47 - (planes.offsetTop + planes.offsetHeight / 2),
      scale: 1.5,
    }, 0)
    .to(planes, { "--tilt": 0, "--spread": 0 }, 0)
    .to(rect, { scaleX: () => stage.clientWidth / rect.offsetWidth, scaleY: () => 14 / rect.offsetHeight }, 0);
}

function heroLite() {
  const stage = $("[data-hero]");
  if (!stage) return;
  gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: stage, start: "top top", end: "bottom top", scrub: true } })
    .to($(".hero__w--rudra", stage), { xPercent: -28 }, 0)
    .to($(".hero__w--lab", stage), { xPercent: 26 }, 0)
    .to($("[data-planes]", stage), { "--tilt": 0, "--spread": 0 }, 0);
}

/* ── 02 Philosophy ────────────────────────────────────────── */
function philosophy() {
  gsap.from(".phil__statement .ln__i", { yPercent: 108, duration: 1, ease: "power4.out", stagger: 0.1, scrollTrigger: { trigger: ".phil__statement", start: "top 82%" } });
  gsap.fromTo(".phil__lead", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power3.inOut", scrollTrigger: { trigger: ".phil__lead", start: "top 85%" } });
  for (const pw of $$("[data-pw]")) {
    ScrollTrigger.create({ trigger: pw, start: "top 58%", end: "bottom 42%", toggleClass: "is-on" });
    const chars = $$(".pw__chars .ch", pw);
    const mid = (chars.length - 1) / 2;
    gsap.fromTo(chars, { xPercent: (i: number) => (i - mid) * 34 }, {
      xPercent: 0, ease: "none", scrollTrigger: { trigger: pw, start: "top bottom", end: "top 18%", scrub: true },
    });
    gsap.to($(".pw__word", pw), { yPercent: -14, ease: "none", scrollTrigger: { trigger: pw, start: "center center", end: "bottom top", scrub: true } });
  }
}

/* ── 03 Work intro ────────────────────────────────────────── */
function workIntro() {
  const wi = $(".wi");
  if (!wi) return;
  const letters = $$(".wi__word .ch", wi);
  gsap.fromTo(letters, { xPercent: (i: number) => (i - 1.5) * 55 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: wi, start: "top bottom", end: "top 10%", scrub: true } });
  gsap.from(".wi__count", { yPercent: 45, ease: "none", scrollTrigger: { trigger: wi, start: "top 60%", end: "bottom bottom", scrub: true } });
  gsap.fromTo("[data-wi-cover]", { clipPath: "inset(100% 0% 0% 0%)" }, {
    clipPath: "inset(0% 0% 0% 0%)", ease: "power2.in",
    scrollTrigger: {
      trigger: wi, start: "bottom 88%", end: "bottom top", scrub: true,
      onUpdate: (s: ScrollTrigger) => navOverride(s.progress > 0.9 && s.progress < 1 ? "paper" : null),
      onLeave: () => navOverride(null), onLeaveBack: () => navOverride(null),
    },
  });
}

/* ── 04 Work reel (desktop) ───────────────────────────────── */
function reelPinned() {
  const reel = $("[data-reel]");
  if (!reel) return;
  const items = $$("[data-proj]", reel);
  const N = items.length;
  if (!N) return;
  const rules = $("[data-reel-rules]", reel)!;
  const sep = $("[data-reel-sep]", reel)!;
  rules.innerHTML = "<i></i>".repeat(Math.max(0, N - 1));
  const R = $$("i", rules);
  const P = items.map((el) => ({
    el,
    media: $(".proj__media", el)!,
    frame: $(".frame", el)!,
    idx: $(".proj__index-i", el)!,
    texts: $$(".proj__top, .proj__info, .proj__name, .proj__acts", el),
    link: $("[data-proj-link]", el),
    img: $("[data-proj-img]", el),
  }));
  const rel = (m: El) => {
    const r = m.getBoundingClientRect(), s = reel.getBoundingClientRect();
    return { left: r.left - s.left, top: r.top - s.top, w: r.width, h: r.height, H: s.height };
  };

  gsap.set(R, { opacity: 0 });
  P.forEach((p, i) => {
    gsap.set(p.el, { zIndex: N - i });
    gsap.set(p.texts, { clipPath: i ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 0%)" });
    if (i) {
      gsap.set(p.frame, { xPercent: 78, rotateX: 3, scale: 0.86, opacity: 0 });
      gsap.set(p.idx, { yPercent: 100 });
    }
  });

  gsap.fromTo(P[0].frame, { rotateX: 3, scale: 0.86 }, { rotateX: 0, scale: 1, ease: "none", scrollTrigger: { trigger: reel, start: "top bottom", end: "top top", scrub: true } });

  const tl = gsap.timeline({
    defaults: { ease: "power3.inOut" },
    scrollTrigger: {
      trigger: reel, start: "top top", end: () => `+=${innerHeight * N * 1.3}`, pin: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: (st: ScrollTrigger) => {
        const cur = Math.min(N - 1, Math.floor((st.progress * tl.duration() + 0.5) / 2));
        P.forEach((p, i) => p.el.classList.toggle("is-current", i === cur));
      },
    },
  });
  P[0].el.classList.add("is-current");
  let t = 0;
  P.forEach((p, i) => {
    t += 1;
    if (i === N - 1) return;
    const q = P[i + 1], rule = R[i];
    tl.to(p.texts, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.4, stagger: 0.03 }, t)
      .to(p.idx, { yPercent: -100, duration: 0.45 }, t + 0.05)
      .to(p.frame, { scale: 0.9, rotateX: -3, duration: 0.35 }, t)
      .to(p.frame, { scaleX: 0.003, transformOrigin: "0% 50%", duration: 0.4 }, t + 0.3)
      .set(p.frame, { opacity: 0 }, t + 0.7)
      .fromTo(rule, {
        opacity: 1,
        x: () => rel(p.media).left,
        y: () => { const m = rel(p.media); return m.top + m.h / 2 - m.H / 2; },
        scaleY: () => { const m = rel(p.media); return (m.h * 0.9) / m.H; },
      }, { x: 14 + i * 7, y: 0, scaleY: 1, duration: 0.32, immediateRender: false }, t + 0.7)
      .to(q.frame, { xPercent: 0, rotateX: 0, scale: 1, opacity: 1, duration: 0.7 }, t + 0.32)
      .to(q.idx, { yPercent: 0, duration: 0.5 }, t + 0.45)
      .to(q.texts, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.45, stagger: 0.04 }, t + 0.5);
    t += 1;
  });
  const last = P[N - 1];
  tl.to(last.texts, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.4, stagger: 0.03 }, t)
    .to(last.idx, { yPercent: -100, duration: 0.4 }, t)
    .to(last.frame, { scaleY: 0.004, rotateX: 4, transformOrigin: "50% 100%", duration: 0.5 }, t + 0.05)
    .to(R, { scaleY: 0, duration: 0.3, stagger: 0.02 }, t + 0.3)
    .to(sep, { scaleX: 1, duration: 0.4 }, t + 0.45);

  // Keyboard: focusing a project's link jumps to that project's frame
  P.forEach((p, i) => p.link?.addEventListener("focus", () => {
    const st = tl.scrollTrigger;
    if (!st) return;
    scrollTo(st.start + (st.end - st.start) * ((i * 2 + 0.6) / tl.duration()), { immediate: true });
  }));

  // Pointer: the image drifts 8–12px with the cursor
  P.forEach((p) => {
    if (!p.img) return;
    const x = gsap.quickTo(p.img, "x", { duration: 0.6, ease: "power3.out" });
    const y = gsap.quickTo(p.img, "y", { duration: 0.6, ease: "power3.out" });
    p.media.addEventListener("pointermove", (e) => {
      const r = p.media.getBoundingClientRect();
      x(((e.clientX - r.left) / r.width - 0.5) * -20);
      y(((e.clientY - r.top) / r.height - 0.5) * -16);
    });
    p.media.addEventListener("pointerleave", () => { x(0); y(0); });
  });
}

function reelLite() {
  for (const f of $$("[data-proj] .frame")) {
    gsap.fromTo(f, { rotateX: 3, scale: 0.92 }, { rotateX: 0, scale: 1, ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "center 60%", scrub: true } });
  }
}

/* ── 05 Services (desktop) ────────────────────────────────── */
function servicesPinned() {
  const stage = $("[data-svc]");
  if (!stage) return;
  const items = $$("[data-svc-item]", stage);
  const bar = $$(".svc__bar i", stage);
  const wipe = $("[data-svc-wipe]", stage)!;
  const S = items.map((el) => ({
    el,
    lines: $$(".si__name .ln__i", el),
    draw: $$(".si__sym .d:not(.dash)", el),
    fills: $$(".si__sym .f, .si__sym .dash, .si__sym text", el),
    sym: $(".si__sym", el)!,
    wipes: $$(".si__n, .si__copy", el),
  }));
  S.forEach((s, i) => {
    if (!i) return;
    gsap.set(s.lines, { scaleY: 0, transformOrigin: "50% 100%" });
    if (has(s.draw)) gsap.set(s.draw, { strokeDashoffset: 1 });
    if (has(s.fills)) gsap.set(s.fills, { scale: 0, transformOrigin: "50% 50%" });
    gsap.set(s.wipes, { clipPath: "inset(0% 100% 0% 0%)" });
  });
  gsap.set(S[0].wipes, { clipPath: "inset(0% 0% 0% 0%)" });
  const circle = () => {
    const last = S[S.length - 1].sym.getBoundingClientRect(), r = stage.getBoundingClientRect();
    return `${((last.left + last.width / 2 - r.left) / r.width) * 100}% ${((last.top + last.height / 2 - r.top) / r.height) * 100}%`;
  };
  const N = S.length;
  if (!N) return;
  const tl = gsap.timeline({
    defaults: { ease: "power3.inOut" },
    scrollTrigger: {
      trigger: stage, start: "top top", end: () => `+=${innerHeight * N * 0.75}`, pin: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: (st: ScrollTrigger) => {
        const k = Math.min(N - 1, Math.round(st.progress * (N + 0.2) - 0.25));
        bar.forEach((b, j) => b.classList.toggle("is-on", j <= k));
        navOverride(st.progress > 0.955 && st.progress < 1 ? "ink" : null);
      },
      onLeave: () => navOverride(null), onLeaveBack: () => navOverride(null),
    },
  });
  let t = 0;
  S.forEach((a, i) => {
    t += 0.5;
    if (i === N - 1) return;
    const b = S[i + 1];
    tl.to(a.lines, { scaleY: 0, yPercent: -18, transformOrigin: "50% 0%", duration: 0.5, stagger: 0.06 }, t)
      .to(a.wipes, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.4 }, t)
      .to(b.lines, { scaleY: 1, duration: 0.55, stagger: 0.07 }, t + 0.38)
      .to(b.wipes, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.45 }, t + 0.5);
    if (has(a.draw)) tl.to(a.draw, { strokeDashoffset: -1, duration: 0.45 }, t);
    if (has(a.fills)) tl.to(a.fills, { scale: 0, duration: 0.3 }, t);
    if (has(b.draw)) tl.to(b.draw, { strokeDashoffset: 0, duration: 0.6, stagger: 0.04 }, t + 0.4);
    if (has(b.fills)) tl.to(b.fills, { scale: 1, duration: 0.45, ease: "power4.out" }, t + 0.62);
    t += 1;
  });
  tl.fromTo(wipe, { clipPath: () => `circle(0% at ${circle()})` }, { clipPath: () => `circle(150% at ${circle()})`, duration: 0.9, ease: "power3.in" }, t + 0.2);
}

function servicesLite() {
  for (const el of $$("[data-svc-item]")) {
    gsap.from($$(".si__name .ln__i", el), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9, ease: "power4.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 70%" } });
    const d = $$(".si__sym .d:not(.dash)", el);
    if (has(d)) gsap.fromTo(d, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power3.out", stagger: 0.06, scrollTrigger: { trigger: el, start: "top 70%" } });
  }
}

/* ── 06 Why ───────────────────────────────────────────────── */
function whyScene() {
  const words = $$(".why__i");
  words.forEach((w, i) =>
    gsap.fromTo(w, { xPercent: i === 1 ? 40 : -34 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "top 40%", scrub: true } })
  );
  gsap.from(".why__serif", { clipPath: "inset(0% 100% 0% 0%)", duration: 1.1, ease: "power3.inOut", scrollTrigger: { trigger: ".why__serif", start: "top 85%" } });
  gsap.from(".wr", { clipPath: "inset(0% 100% 0% 0%)", duration: 0.9, ease: "power3.inOut", stagger: 0.06, scrollTrigger: { trigger: ".why__list", start: "top 80%" } });
}

/* ── 07 Process ───────────────────────────────────────────── */
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
  const flood = $("[data-proc-flood]", stage)!;
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
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: stage, start: "top top", end: "+=560%", pin: true, scrub: true,
      onUpdate: (s: ScrollTrigger) => {
        const q = Math.min(1, s.progress / 0.86);
        set(Math.min(N - 1, Math.floor(q * N)));
        fill.style.setProperty("--p", node(q * last).toFixed(4));
        navOverride(s.progress > 0.975 && s.progress < 1 ? "ink" : null);
      },
      onLeave: () => navOverride(null), onLeaveBack: () => navOverride(null),
    },
  });
  tl.to({}, { duration: 0.88 }).to(flood, { scaleY: 1, duration: 0.12, ease: "power2.inOut" });
}

function processLite() {
  for (const s of $$("[data-step]")) {
    ScrollTrigger.create({ trigger: s, start: "top 60%", end: "bottom 40%", toggleClass: "is-active" });
    gsap.from($(".st__name-i", s), { yPercent: 100, duration: 0.9, ease: "power4.out", scrollTrigger: { trigger: s, start: "top 80%" } });
  }
}

/* ── Apps: APP / ANDROID slide in, phones drift at different speeds ── */
function appsScene() {
  for (const w of $$("[data-apps-w]")) {
    gsap.fromTo(w, { xPercent: w.classList.contains("apps__w--app") ? -18 : 22 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "top 35%", scrub: true } });
  }
  for (const set of $$("[data-app-phones]")) {
    $$("[data-phone]", set).forEach((ph, i) =>
      gsap.fromTo(ph, { y: [60, 0, 110][i] ?? 40 }, { y: [-30, 0, -50][i] ?? -20, ease: "none", scrollTrigger: { trigger: set, start: "top bottom", end: "bottom top", scrub: true } })
    );
  }
}

/* ── 08 Toolkit → 09 Lab → 10 Manifesto → 11 Contact → 12 Footer ── */
function closingScenes() {
  gsap.to(".lane", { scaleY: 0.1, ease: "none", scrollTrigger: { trigger: ".kit__lanes", start: "bottom 55%", end: "bottom 5%", scrub: true } });

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
  gsap.from(".lab__statement .ln__i", { yPercent: 108, duration: 1, ease: "power4.out", stagger: 0.1, scrollTrigger: { trigger: ".lab__statement", start: "top 82%" } });
  $$(".lab__name span").forEach((s, i) =>
    gsap.fromTo(s, { xPercent: i % 2 ? 14 : -14 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: s, start: "top bottom", end: "top 50%", scrub: true } })
  );

  $$(".mani__i").forEach((line, i) =>
    gsap.fromTo(line, { xPercent: i % 2 ? 100 : -100 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: line.parentElement!, start: "top 96%", end: "top 55%", scrub: true } })
  );
  gsap.fromTo(".mani__strike", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".mani__l--3", start: "top 60%", end: "top 35%", scrub: true } });
  gsap.from(".mani__serif", { clipPath: "inset(0% 0% 0% 100%)", duration: 1.2, ease: "power3.inOut", scrollTrigger: { trigger: ".mani__serif", start: "top 85%" } });

  gsap.from(".contact__title .ln__i", { yPercent: 106, duration: 1, ease: "power4.out", stagger: 0.1, scrollTrigger: { trigger: ".contact__title", start: "top 80%" } });
  gsap.from(".contact__serif", { clipPath: "inset(0% 100% 0% 0%)", duration: 1.2, ease: "power3.inOut", scrollTrigger: { trigger: ".contact__serif", start: "top 85%" } });
  gsap.from(".f__rule", { scaleX: 0, duration: 0.9, ease: "power3.inOut", stagger: 0.07, scrollTrigger: { trigger: ".form", start: "top 80%" } });

  gsap.from(".foot__rudra, .foot__hl", { yPercent: 38, ease: "none", scrollTrigger: { trigger: ".foot__giant", start: "top bottom", end: "bottom bottom", scrub: true } });
}

export function initScenes(introDone: Promise<void>): void {
  const mm = gsap.matchMedia();
  mm.add({ desk: "(min-width: 1025px)", small: "(max-width: 1024px)" }, (ctx) => {
    const desk = !!(ctx.conditions as { desk?: boolean }).desk;
    // The hero scene is created after the intro so a refresh can't reset intro states.
    introDone.then(() => ctx.add(() => { (desk ? heroPinned : heroLite)(); ScrollTrigger.sort(); ScrollTrigger.refresh(); }));
    if (desk) {
      root.classList.add("stage");
      reelPinned();
      servicesPinned();
      processPinned();
    } else {
      reelLite();
      servicesLite();
      processLite();
    }
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

export { px };
