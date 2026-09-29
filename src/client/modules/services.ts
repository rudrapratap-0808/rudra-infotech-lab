import { $, $$, finePointer } from "../lib/dom.js";

/**
 * Vertical tabs (WAI-ARIA pattern, automatic activation).
 * Hover also previews a service on mouse devices.
 */
export function initServices(): void {
  const root = $("[data-services]");
  if (!root) return;
  const tabs = $$<HTMLButtonElement>("[role='tab']", root);
  const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls") || ""));
  let current = 0;
  let hoverTimer = 0;

  const select = (i: number, focus = false) => {
    if (i === current) {
      if (focus) tabs[i].focus();
      return;
    }
    tabs[current].setAttribute("aria-selected", "false");
    tabs[current].tabIndex = -1;
    panels[current]?.setAttribute("hidden", "");
    panels[current]?.classList.remove("is-entering");

    current = i;
    const tab = tabs[i];
    const panel = panels[i];
    tab.setAttribute("aria-selected", "true");
    tab.tabIndex = 0;
    if (panel) {
      panel.removeAttribute("hidden");
      panel.classList.remove("is-entering");
      void panel.offsetWidth; // restart the entrance animation
      panel.classList.add("is-entering");
    }
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
    if (finePointer()) {
      tab.addEventListener("pointerenter", () => {
        clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(() => select(i), 90);
      });
      tab.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
    }
    tab.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      const map: Record<string, number> = {
        ArrowDown: i === last ? 0 : i + 1,
        ArrowRight: i === last ? 0 : i + 1,
        ArrowUp: i === 0 ? last : i - 1,
        ArrowLeft: i === 0 ? last : i - 1,
        Home: 0,
        End: last,
      };
      if (e.key in map) {
        e.preventDefault();
        select(map[e.key], true);
      }
    });
  });
}
