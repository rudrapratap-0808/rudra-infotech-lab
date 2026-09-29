export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

const root = document.documentElement;
const rmQuery = matchMedia("(prefers-reduced-motion: reduce)");
rmQuery.addEventListener?.("change", (e) => root.classList.toggle("rm", e.matches));

/** True when the visitor prefers reduced motion (live). */
export const reducedMotion = (): boolean => root.classList.contains("rm");

/** Mouse / trackpad (not touch). */
export const finePointer = (): boolean => matchMedia("(hover: hover) and (pointer: fine)").matches;

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const onIdle = (fn: () => void, timeout = 1200): void => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout });
  else setTimeout(fn, 200);
};
