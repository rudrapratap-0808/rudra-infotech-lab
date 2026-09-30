/**
 * Floating WhatsApp button: steps aside while the contact form, another WhatsApp CTA
 * or the footer is on screen (so it never covers the content it duplicates).
 */
import { $, $$ } from "./core.js";

export function initWhatsApp(): void {
  const btn = $("[data-wa-float]");
  if (!btn || !("IntersectionObserver" in window)) return;
  const targets = [$("#contact"), $(".foot__bar"), ...$$("[data-wa]")].filter(Boolean) as HTMLElement[];
  const visible = new Set<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
      const hide = visible.size > 0;
      btn.classList.toggle("is-hidden", hide);
      btn.inert = hide;
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 }
  );
  targets.forEach((t) => io.observe(t));
}

/** /projects/ type filter chips (the full list stays visible without JS). */
export function initFilters(): void {
  const bar = $("[data-filters]");
  const list = $("[data-filter-list]");
  if (!bar || !list) return;
  bar.hidden = false;
  const chips = Array.from(bar.querySelectorAll<HTMLButtonElement>("[data-filter]"));
  const items = Array.from(list.children) as HTMLElement[];
  bar.addEventListener("click", (e) => {
    const chip = (e.target as Element).closest<HTMLButtonElement>("[data-filter]");
    if (!chip) return;
    const f = chip.dataset.filter || "";
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    items.forEach((li) => (li.hidden = !!f && li.dataset.type !== f));
  });
}
