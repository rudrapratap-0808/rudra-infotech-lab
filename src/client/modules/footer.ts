import { $, $$, finePointer, reducedMotion } from "../lib/dom.js";
import { onResize } from "../lib/loop.js";

/**
 * Footer signature: a giant "Rudra" wordmark sized to fill the width exactly,
 * whose letters lift and ignite as the pointer passes over them.
 */
export function initFooter(): void {
  $$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));

  const giant = $("[data-giant]");
  const word = $(".footer__letters", giant || document);
  if (!giant || !word) return;
  const letters = $$("span", word);

  const fit = () => {
    word.style.setProperty("--giant", "100px");
    const avail = giant.clientWidth - parseFloat(getComputedStyle(giant).paddingLeft) * 2;
    const natural = word.scrollWidth;
    if (natural > 0) word.style.setProperty("--giant", `${Math.floor((avail / natural) * 100 * 0.995)}px`);
  };
  fit();
  document.fonts?.ready.then(fit);
  onResize(fit);

  if (!finePointer() || reducedMotion()) return;
  let raf = 0;
  let px = 0;
  giant.addEventListener("pointermove", (e) => {
    px = e.clientX;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const R = giant.clientWidth * 0.22;
      letters.forEach((l) => {
        const r = l.getBoundingClientRect();
        const d = Math.abs(px - (r.left + r.width / 2));
        const p = Math.max(0, 1 - d / R);
        l.style.setProperty("--ty", `${(-p * 9).toFixed(2)}%`);
        l.classList.toggle("is-hot", px >= r.left && px <= r.right);
      });
    });
  });
  giant.addEventListener("pointerleave", () =>
    letters.forEach((l) => {
      l.style.removeProperty("--ty");
      l.classList.remove("is-hot");
    })
  );
}
