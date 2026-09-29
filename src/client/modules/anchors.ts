import { reducedMotion } from "../lib/dom.js";

const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

let raf = 0;
const cancel = () => cancelAnimationFrame(raf);

/** Eased scroll to a Y position; the user can interrupt with wheel/touch/keys. */
export function scrollToY(target: number, onDone?: () => void): void {
  cancel();
  const start = scrollY;
  const dist = target - start;
  if (reducedMotion() || Math.abs(dist) < 2) {
    window.scrollTo(0, target);
    onDone?.();
    return;
  }
  const duration = Math.min(1500, Math.max(650, Math.abs(dist) * 0.45));
  const t0 = performance.now();
  const stop = () => {
    cancel();
    removeEventListener("wheel", stop);
    removeEventListener("touchstart", stop);
    removeEventListener("keydown", stop);
  };
  addEventListener("wheel", stop, { passive: true, once: true });
  addEventListener("touchstart", stop, { passive: true, once: true });
  addEventListener("keydown", stop, { once: true });
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, start + dist * easeInOutQuart(p));
    if (p < 1) raf = requestAnimationFrame(step);
    else {
      stop();
      onDone?.();
    }
  };
  raf = requestAnimationFrame(step);
}

/** Smooth in-page anchor navigation that keeps URL + focus in sync. */
export function initAnchors(): void {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.("a[href*='#']") as HTMLAnchorElement | null;
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || url.origin !== location.origin || !url.hash) return;
    const id = decodeURIComponent(url.hash.slice(1));
    const el = id === "top" ? document.body : document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const offset = id === "top" ? 0 : parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const y = id === "top" ? 0 : el.getBoundingClientRect().top + scrollY - offset;
    history.pushState(null, "", url.hash);
    scrollToY(Math.max(0, y), () => {
      const focusTarget = id === "top" ? document.getElementById("main") : el;
      if (!focusTarget) return;
      if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
    });
  });
}
