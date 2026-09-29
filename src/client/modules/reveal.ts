import { $$, reducedMotion } from "../lib/dom.js";

/** Adds `.is-in` to reveal targets as they enter the viewport (once). */
export function initReveal(): void {
  const targets = $$("[data-reveal], [data-split]:not([data-intro-split]), [data-giant]");
  if (reducedMotion() || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  targets.forEach((el) => io.observe(el));
}
