/**
 * One passive scroll listener + one resize listener for the whole site,
 * batched into requestAnimationFrame. Modules subscribe instead of
 * attaching their own listeners.
 */
type Fn = () => void;

export const viewport = { w: innerWidth, h: innerHeight, y: scrollY };

const scrollSubs = new Set<Fn>();
const resizeSubs = new Set<Fn>();
let queued = false;

const flush = () => {
  queued = false;
  viewport.y = scrollY;
  scrollSubs.forEach((f) => f());
};
const request = () => {
  if (!queued) {
    queued = true;
    requestAnimationFrame(flush);
  }
};

addEventListener("scroll", request, { passive: true });

let resizeTimer = 0;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    viewport.w = innerWidth;
    viewport.h = innerHeight;
    resizeSubs.forEach((f) => f());
    request();
  }, 120);
});

export const onScroll = (fn: Fn): void => {
  scrollSubs.add(fn);
  fn();
};
export const onResize = (fn: Fn): void => {
  resizeSubs.add(fn);
};
