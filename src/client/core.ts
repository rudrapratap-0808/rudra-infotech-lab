import { Lenis } from "./vendor/lenis/lenis.js";

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T | null => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T[] => Array.from(r.querySelectorAll<T>(s));

export const root = document.documentElement;
export const reduced = (): boolean => root.classList.contains("rm");
export const finePointer = (): boolean => matchMedia("(hover: hover) and (pointer: fine)").matches;
export const hasGsap = (): boolean =>
  typeof (window as unknown as { gsap?: unknown }).gsap !== "undefined" &&
  typeof (window as unknown as { ScrollTrigger?: unknown }).ScrollTrigger !== "undefined";
export const pad = (n: number, l = 2): string => String(Math.max(0, Math.round(n))).padStart(l, "0");

/** One smooth-scroll system for the whole site: Lenis driven by GSAP's ticker. */
export let lenis: Lenis | null = null;

export function initScroll(): void {
  if (reduced() || !hasGsap()) return;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Scroll to a Y position or element — eased with Lenis, instant for reduced motion. */
export function scrollTo(target: number | HTMLElement, opts: { immediate?: boolean; onDone?: () => void } = {}): void {
  // Elements honour their CSS scroll-margin-top so destinations never land under the fixed bar.
  const y = typeof target === "number"
    ? target
    : Math.max(0, target.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0));
  if (lenis && !opts.immediate) {
    const dist = Math.abs(y - scrollY) / innerHeight;
    lenis.scrollTo(y, { duration: Math.min(2.4, Math.max(0.9, 0.7 + dist * 0.06)), easing: easeIO, onComplete: () => opts.onDone?.() });
  } else {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    opts.onDone?.();
  }
}

export const onScroll = (fn: () => void): void => {
  if (lenis) lenis.on("scroll", fn);
  else addEventListener("scroll", fn, { passive: true });
};
