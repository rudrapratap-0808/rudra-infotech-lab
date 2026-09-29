import { $, $$ } from "../lib/dom.js";
import { onResize, onScroll, viewport } from "../lib/loop.js";

/** Floating nav: scrolled state, hide-on-scroll-down, active section + sliding pill. */
export function initNav(): void {
  const nav = $("[data-nav]");
  if (!nav) return;
  const links = $$<HTMLAnchorElement>("[data-nav-link]", nav);
  const pill = $(".nav__pill", nav);
  const list = $(".nav__links", nav);
  const onHome = location.pathname === "/" || location.pathname.endsWith("/index.html");

  // Sections that map to nav items (only on the home page)
  const sections = onHome
    ? links
        .map((a) => ({ a, el: document.getElementById(a.dataset.navLink || "") }))
        .filter((s): s is { a: HTMLAnchorElement; el: HTMLElement } => !!s.el)
    : [];

  let lastY = viewport.y;
  let active: HTMLAnchorElement | null = null;
  let hovering: HTMLAnchorElement | null = null;

  const movePill = (a: HTMLAnchorElement | null) => {
    if (!pill || !list) return;
    if (!a || getComputedStyle(list).display === "none") {
      pill.style.setProperty("--po", "0");
      return;
    }
    const r = a.getBoundingClientRect();
    const pr = list.getBoundingClientRect();
    pill.style.setProperty("--px", `${r.left - pr.left}px`);
    pill.style.setProperty("--pw", `${r.width}px`);
    pill.style.setProperty("--po", "1");
  };

  links.forEach((a) => {
    a.addEventListener("pointerenter", () => {
      hovering = a;
      movePill(a);
    });
    a.addEventListener("focus", () => movePill(a));
    a.addEventListener("blur", () => movePill(active));
  });
  list?.addEventListener("pointerleave", () => {
    hovering = null;
    movePill(active);
  });

  onScroll(() => {
    const y = viewport.y;
    nav.classList.toggle("is-scrolled", y > 24);

    const menuOpen = document.body.classList.contains("menu-open");
    const delta = y - lastY;
    if (!menuOpen && !nav.contains(document.activeElement)) {
      if (y > 480 && delta > 6) nav.classList.add("is-hidden");
      else if (delta < -6 || y < 480) nav.classList.remove("is-hidden");
    }
    lastY = y;

    if (sections.length) {
      const line = viewport.h * 0.4;
      let current: HTMLAnchorElement | null = null;
      for (const s of sections) if (s.el.getBoundingClientRect().top <= line) current = s.a;
      if (current !== active) {
        active?.classList.remove("is-active");
        active?.removeAttribute("aria-current");
        active = current;
        if (active && active.dataset.navLink !== "top") {
          active.classList.add("is-active");
          active.setAttribute("aria-current", "true");
        }
        if (!hovering) movePill(active && active.dataset.navLink !== "top" ? active : null);
      }
    }
  });
  onResize(() => movePill(hovering || active));
}
