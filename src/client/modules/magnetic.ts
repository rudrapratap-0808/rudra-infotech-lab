import { $$, finePointer, lerp, reducedMotion } from "../lib/dom.js";

/** Buttons that lean toward the pointer, with the label following a little further. */
export function initMagnetic(): void {
  if (!finePointer() || reducedMotion()) return;

  for (const el of $$("[data-magnetic]")) {
    const strength = parseFloat(el.dataset.magneticStrength || "0.28");
    const label = el.querySelector<HTMLElement>(".btn__label, .cta__btn-label");
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let running = false;

    const tick = () => {
      cx = lerp(cx, tx, 0.18);
      cy = lerp(cy, ty, 0.18);
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (label) label.style.transform = `translate3d(${(cx * 0.35).toFixed(2)}px, ${(cy * 0.35).toFixed(2)}px, 0)`;
      if (Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05) requestAnimationFrame(tick);
      else {
        running = false;
        if (tx === 0 && ty === 0) {
          el.style.transform = "";
          if (label) label.style.transform = "";
        }
      }
    };
    const start = () => {
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    };

    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      start();
    });
    el.addEventListener("pointerleave", () => {
      tx = 0;
      ty = 0;
      start();
    });
  }
}
