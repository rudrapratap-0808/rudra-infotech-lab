import { $, $$ } from "../lib/dom.js";
import { onResize, viewport } from "../lib/loop.js";

/** Full-screen mobile menu with focus trap, Esc to close and scroll lock. */
export function initMenu(): void {
  const menu = $("[data-menu]");
  const toggle = $<HTMLButtonElement>("[data-menu-toggle]");
  const label = $("[data-menu-label]");
  if (!menu || !toggle) return;

  let open = false;
  const focusables = () => [toggle, ...$$<HTMLElement>("a[href], button:not([disabled])", menu)];

  const set = (next: boolean, restoreFocus = true) => {
    if (open === next) return;
    open = next;
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close menu" : "Open menu";
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) {
      menu.removeAttribute("inert");
      $("[data-nav]")?.classList.remove("is-hidden");
      window.setTimeout(() => $<HTMLElement>("[data-menu-link]", menu)?.focus({ preventScroll: true }), 250);
    } else {
      menu.setAttribute("inert", "");
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener("click", () => set(!open));
  $$("[data-menu-link]", menu).forEach((a) => a.addEventListener("click", () => set(false, false)));

  document.addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      set(false);
    } else if (e.key === "Tab") {
      const f = focusables();
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  onResize(() => {
    if (open && viewport.w > 1080) set(false, false);
  });
}
