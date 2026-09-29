import { $, finePointer, lerp, reducedMotion } from "../lib/dom.js";

/** Dot + trailing ring cursor. The native cursor stays visible (usability first). */
export function initCursor(): void {
  const root = $("[data-cursor]");
  if (!root || !finePointer() || reducedMotion()) return;
  const dot = $(".cursor__dot", root)!;
  const ring = $(".cursor__ring", root)!;
  const label = $("[data-cursor-label]", root)!;
  document.documentElement.classList.add("has-cursor");
  root.classList.add("is-out");

  let x = -100;
  let y = -100;
  let rx = x;
  let ry = y;
  let running = false;

  const tick = () => {
    rx = lerp(rx, x, 0.2);
    ry = lerp(ry, y, 0.2);
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    if (Math.abs(rx - x) > 0.1 || Math.abs(ry - y) > 0.1) requestAnimationFrame(tick);
    else running = false;
  };

  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      root.classList.remove("is-out");
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    },
    { passive: true }
  );

  const INTERACTIVE = "a, button, [role='tab'], input, textarea, select, label, [data-cursor-text]";
  document.addEventListener("pointerover", (e) => {
    const t = e.target as Element;
    const withText = t.closest?.("[data-cursor-text]") as HTMLElement | null;
    const interactive = t.closest?.(INTERACTIVE);
    root.classList.toggle("is-label", !!withText);
    root.classList.toggle("is-hover", !!interactive && !withText);
    if (withText) label.textContent = withText.dataset.cursorText || "";
  });
  document.addEventListener("pointerdown", () => root.classList.add("is-down"));
  document.addEventListener("pointerup", () => root.classList.remove("is-down"));
  document.documentElement.addEventListener("pointerleave", () => root.classList.add("is-out"));
}
