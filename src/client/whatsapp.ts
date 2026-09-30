import { $ } from "./core.js";

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
