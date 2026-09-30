/** Global chrome: nav colour + chapter, menu, cursor, anchors, footer. */
import { $, $$, finePointer, hasGsap, lenis, onScroll, reduced, root, scrollTo } from "./core.js";

/* ── Nav: tone + chapter follow whatever is under the bar ─── */
let override: "ink" | "paper" | null = null;
let menuOpen = false;
let probeNow: () => void = () => {};

export const navOverride = (tone: "ink" | "paper" | null): void => {
  if (override === tone) return;
  override = tone;
  probeNow();
};

export function initNav(): void {
  const nav = $("[data-nav]");
  const label = $("[data-nav-chapter]");
  if (!nav || !label) return;
  let chapter = label.textContent || "";
  let queued = false;

  const swap = (text: string) => {
    if (hasGsap() && !reduced()) {
      gsap.timeline()
        .to(label, { yPercent: -100, duration: 0.25, ease: "power2.in" })
        .add(() => { label.textContent = text; })
        .fromTo(label, { yPercent: 100 }, { yPercent: 0, duration: 0.4, ease: "power3.out" });
    } else label.textContent = text;
  };

  const probe = () => {
    queued = false;
    if (menuOpen) { nav.dataset.tone = "paper"; return; }
    for (const el of document.elementsFromPoint(innerWidth / 2, Math.min(34, innerHeight / 2))) {
      if (nav.contains(el) || el.closest(".pre")) continue;
      const themed = el.closest<HTMLElement>("[data-theme]");
      if (!themed) continue;
      const theme = themed.dataset.theme;
      nav.dataset.tone = override ?? (theme === "ink" || theme === "blue" ? "paper" : "ink");
      const c = el.closest<HTMLElement>("[data-chapter]")?.dataset.chapter;
      if (c && c !== chapter) { chapter = c; swap(c); }
      return;
    }
  };
  probeNow = probe;
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(probe); } };
  onScroll(request);
  addEventListener("resize", request);
  probe();
}

/* ── Menu ─────────────────────────────────────────────────── */
export function initMenu(): void {
  const menu = $("[data-menu]");
  const toggle = $<HTMLButtonElement>("[data-menu-toggle]");
  const label = $("[data-menu-label]");
  const nav = $("[data-nav]");
  if (!menu || !toggle) return;
  const focusables = () => [toggle, ...$$<HTMLElement>("a[href], button:not([disabled])", menu)];

  const set = (open: boolean, restoreFocus = true) => {
    if (open === menuOpen) return;
    menuOpen = open;
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close" : "Menu";
    if (open) {
      menu.removeAttribute("inert");
      lenis?.stop();
      if (nav) nav.dataset.tone = "paper";
      setTimeout(() => $<HTMLElement>("[data-menu-link]", menu)?.focus({ preventScroll: true }), 300);
    } else {
      menu.setAttribute("inert", "");
      lenis?.start();
      probeNow();
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener("click", () => set(!menuOpen));
  $$("[data-menu-link]", menu).forEach((a) => a.addEventListener("click", () => set(false, false)));
  document.addEventListener("keydown", (e) => {
    if (!menuOpen) return;
    if (e.key === "Escape") { e.preventDefault(); set(false); }
    else if (e.key === "Tab") {
      const f = focusables();
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
}

/* ── Anchors: eased Lenis jumps, focus follows ────────────── */
export function initAnchors(): void {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.("a[href*='#']") as HTMLAnchorElement | null;
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    const id = decodeURIComponent(url.hash.slice(1));
    const el = id === "top" ? null : document.getElementById(id);
    if (id !== "top" && !el) return;
    e.preventDefault();
    history.pushState(null, "", url.hash);
    scrollTo(el ?? 0, {
      immediate: reduced(),
      onDone: () => {
        const f = el ?? document.getElementById("main");
        if (!f) return;
        if (!f.hasAttribute("tabindex")) f.setAttribute("tabindex", "-1");
        f.focus({ preventScroll: true });
      },
    });
  });
}

/* ── Cursor: 7px dot · 64px labelled ring ─────────────────── */
const ARROW = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6"/></svg>`;
const LABELS: Record<string, string> = { view: "View", visit: `Visit${ARROW}`, go: "Go", drag: "Drag", build: "Build" };

export function initCursor(): void {
  const el = $("[data-cursor-root]");
  if (!el || !finePointer() || reduced() || !hasGsap()) return;
  const ring = $(".cursor__ring", el)!;
  const dot = $(".cursor__dot", el)!;
  const label = $("[data-cursor-label]", el)!;
  root.classList.add("has-cursor");
  el.classList.add("is-out");
  const rx = gsap.quickTo(ring, "x", { duration: 0.2, ease: "power3.out" });
  const ry = gsap.quickTo(ring, "y", { duration: 0.2, ease: "power3.out" });
  const dx = gsap.quickSetter(dot, "x", "px") as (v: number) => void;
  const dy = gsap.quickSetter(dot, "y", "px") as (v: number) => void;
  let state = "";

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    el.classList.remove("is-out");
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
  }, { passive: true });

  document.addEventListener("pointerover", (e) => {
    const t = e.target as Element;
    const themed = t.closest?.<HTMLElement>("[data-theme]");
    const theme = themed?.dataset.theme;
    el.dataset.tone = theme === "ink" || theme === "blue" ? "paper" : "ink";
    const target = t.closest?.<HTMLElement>("[data-cursor]");
    const next = target?.dataset.cursor || "";
    if (next !== state) {
      state = next;
      if (next) { el.dataset.state = next; label.innerHTML = LABELS[next] ?? next; }
      else el.removeAttribute("data-state");
    }
    el.classList.toggle("is-hover", !!t.closest?.("a, button, label, input, textarea"));
    el.classList.toggle("is-text", !!t.closest?.("input, textarea"));
  });
  document.addEventListener("pointerdown", () => el.classList.add("is-down"));
  document.addEventListener("pointerup", () => el.classList.remove("is-down"));
  document.documentElement.addEventListener("pointerleave", () => el.classList.add("is-out"));
}

/* ── Footer: year + orange band tracing RUDRA ─────────────── */
export function initFooter(): void {
  $$("[data-year]").forEach((y) => (y.textContent = String(new Date().getFullYear())));
  const giant = $("[data-foot]");
  const hl = $("[data-foot-hl]");
  if (!giant || !hl || !finePointer() || reduced() || !hasGsap()) return;
  const p = { x: -999 };
  const q = gsap.quickTo(p, "x", { duration: 0.35, ease: "power3.out", onUpdate: () => hl.style.setProperty("--hx", `${p.x}px`) });
  giant.addEventListener("pointerenter", (e) => {
    const r = hl.getBoundingClientRect();
    p.x = e.clientX - r.left;
    hl.style.setProperty("--hx", `${p.x}px`);
  });
  giant.addEventListener("pointermove", (e) => q(e.clientX - hl.getBoundingClientRect().left));
  giant.addEventListener("pointerleave", () => { gsap.killTweensOf(p); p.x = -999; hl.style.setProperty("--hx", "-999px"); });
}
