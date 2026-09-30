/** Services: ordered list with publish toggles + editor (admin only). */
import { serviceSymbol, SYMBOL_IDS } from "../../components/symbols.js";
import { CFG, db } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { navigate, setLeaveGuard, type Ctx } from "../lib/router.js";
import { markChanged } from "../lib/state.js";
import { badge, btn, busy, card, confirmDialog, empty, errorState, field, input, nul, select, setError, skeleton, slugify, textarea, toast, toastError, toggle } from "../lib/ui.js";
import { pageHead } from "./shell.js";

interface Service {
  id: string;
  slug: string;
  title: string;
  display: string;
  short_description: string;
  full_description: string;
  points: string[];
  symbol: string;
  published: boolean;
  display_order: number;
  seo_title: string | null;
  seo_description: string | null;
}

const symbolPreview = (id: string) => h("span", { class: "sym-prev", "aria-hidden": "true", html: serviceSymbol[id] ?? "" });

export async function servicesView(): Promise<HTMLElement> {
  const root = h("div", { class: "page" });
  const listEl = h("ol", { class: "plist" }, skeleton(6));
  root.append(pageHead("Services", "The service index on the home page and /services/ — drag or use the arrows to reorder.", h("a", { class: "btn btn--primary", href: "/admin/services/new/" }, icon("plus"), "New service")), listEl);
  let rows: Service[] = [];
  const save = async (ordered: Service[]) => {
    try {
      await db.rpc("reorder", { p_table: "services", p_ids: ordered.map((s) => s.id) });
      rows = ordered;
      toast("Order saved.");
      markChanged();
    } catch (err) {
      toastError(err);
    }
    draw();
  };
  const draw = () => {
    if (!rows.length) return listEl.replaceChildren(empty("No services yet", "Add the services you offer — they appear on the home page and get their own page.", h("a", { class: "btn btn--primary", href: "/admin/services/new/" }, "New service")));
    listEl.replaceChildren(
      ...rows.map((s, i) => {
        const t = toggle(s.published, "Published");
        t.input.addEventListener("change", async () => {
          try {
            await db.update("services", `id=eq.${s.id}`, { published: t.input.checked });
            s.published = t.input.checked;
            toast(s.published ? `“${s.title}” is live on the next publish.` : `“${s.title}” hidden from the website.`);
            markChanged();
            draw();
          } catch (err) {
            toastError(err);
            t.input.checked = s.published;
          }
        });
        return h(
          "li",
          { class: `plist__row${s.published ? "" : " is-muted"}` },
          h("span", { class: "plist__thumb plist__thumb--sym" }, symbolPreview(s.symbol)),
          h("div", { class: "plist__main" }, h("a", { class: "plist__name", href: `/admin/services/${s.id}/` }, s.title), h("span", { class: "plist__meta mono" }, `/services/${s.slug}/ · ${s.short_description}`)),
          s.published ? badge("PUBLISHED", "green") : badge("HIDDEN", "grey"),
          t.el,
          h(
            "span",
            { class: "plist__move" },
            h("button", { class: "icon-btn", type: "button", "aria-label": `Move ${s.title} up`, disabled: i === 0, onclick: () => save(swap(rows, i, i - 1)) }, icon("up")),
            h("button", { class: "icon-btn", type: "button", "aria-label": `Move ${s.title} down`, disabled: i === rows.length - 1, onclick: () => save(swap(rows, i, i + 1)) }, icon("down"))
          ),
          h("a", { class: "icon-btn", href: `/admin/services/${s.id}/`, "aria-label": `Edit ${s.title}` }, icon("edit"))
        );
      })
    );
  };
  try {
    rows = (await db.select<Service>("services", "select=*&order=display_order.asc")).data;
    draw();
  } catch (err) {
    listEl.replaceChildren(errorState(err));
  }
  return root;
}

const swap = <T,>(arr: T[], a: number, b: number): T[] => {
  const c = [...arr];
  [c[a], c[b]] = [c[b], c[a]];
  return c;
};

export async function serviceEditView(ctx: Ctx): Promise<HTMLElement> {
  const isNew = !ctx.params.id;
  let s: Partial<Service> = { published: true, points: [], symbol: "development" };
  if (!isNew) {
    try {
      const row = await db.one<Service>("services", `select=*&id=eq.${encodeURIComponent(ctx.params.id)}`);
      if (!row) return h("div", { class: "page" }, empty("Service not found", "It may have been deleted.", h("a", { class: "btn", href: "/admin/services/" }, "Back")));
      s = row;
    } catch (err) {
      return h("div", { class: "page" }, errorState(err));
    }
  }
  let dirty = false;
  const markDirty = () => {
    if (dirty) return;
    dirty = true;
    setLeaveGuard(() => confirmDialog({ title: "Discard unsaved changes?", message: "You have changes that haven't been saved.", confirm: "Discard", danger: true }));
  };
  const title = input(s.title, { max: 80, required: true });
  const slug = input(s.slug, { max: 80, required: true });
  let slugTouched = !isNew;
  title.addEventListener("input", () => !slugTouched && (slug.value = slugify(title.value)));
  slug.addEventListener("input", () => ((slugTouched = true), (slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))));
  const [d1, d2] = (s.display || "").split("|");
  const line1 = input(d1 ?? "", { max: 40, placeholder: "e.g. Website" });
  const line2 = input(d2 ?? "", { max: 40, placeholder: "e.g. Design" });
  const short = input(s.short_description, { max: 200 });
  const full = textarea(s.full_description, { rows: 7, max: 6000 });
  const points = [...(s.points ?? [])];
  const pointsEl = h("ul", { class: "listed" });
  const drawPoints = () =>
    pointsEl.replaceChildren(
      ...points.map((pt, i) => {
        const inp = input(pt, { max: 60 });
        inp.setAttribute("aria-label", `Point ${i + 1}`);
        inp.addEventListener("input", () => ((points[i] = inp.value), markDirty()));
        return h(
          "li",
          { class: "listed__row" },
          inp,
          h("button", { class: "icon-btn", type: "button", "aria-label": "Move up", disabled: i === 0, onclick: () => (points.splice(i - 1, 0, ...points.splice(i, 1)), markDirty(), drawPoints()) }, icon("up")),
          h("button", { class: "icon-btn", type: "button", "aria-label": "Remove", onclick: () => (points.splice(i, 1), markDirty(), drawPoints()) }, icon("trash"))
        );
      }),
      ...(points.length < 12 ? [h("li", null, btn("Add point", { small: true, icon: "plus", onclick: () => (points.push(""), markDirty(), drawPoints()) }))] : [])
    );
  drawPoints();
  const symbol = select(s.symbol, SYMBOL_IDS);
  const symPrev = h("span", { class: "sym-big" }, symbolPreview(s.symbol ?? "development"));
  symbol.addEventListener("change", () => symPrev.replaceChildren(symbolPreview(symbol.value)));
  const pub = toggle(!!s.published, "Published on the website");
  const seoTitle = input(s.seo_title, { max: 120 });
  const seoDesc = textarea(s.seo_description, { rows: 3, max: 320 });

  const form = h(
    "form",
    { class: "editor", novalidate: true },
    card("Service", h("div", { class: "grid2" }, field("Title", title, { required: true }), field("URL slug", slug, { required: true, hint: "Page address: /services/<slug>/" }), field("Giant index — line 1", line1), field("Giant index — line 2", line2), h("div", { class: "span2" }, field("One-liner", short, { max: 200, counter: true })), h("div", { class: "span2" }, field("Full description", full, { max: 6000, counter: true, hint: "Blank line between paragraphs." })))),
    card("What's included", pointsEl),
    card("Symbol", h("div", { class: "row row--top" }, field("Symbol", symbol), symPrev)),
    card("Publishing", pub.el),
    card("SEO", h("div", { class: "grid2" }, field("SEO title", seoTitle, { max: 60, counter: true }), h("div", { class: "span2" }, field("SEO description", seoDesc, { max: 160, counter: true }))))
  );
  form.addEventListener("input", markDirty);
  form.addEventListener("change", markDirty);

  const save = async () => {
    setError(title, title.value.trim() ? null : "Add a title.");
    setError(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.value) ? null : "Lowercase letters, numbers and dashes only.");
    if (!title.value.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.value)) return toast("Please fix the highlighted fields.", "error");
    const payload = {
      title: title.value.trim(),
      slug: slug.value,
      display: [line1.value.trim(), line2.value.trim()].filter(Boolean).join("|"),
      short_description: short.value.trim(),
      full_description: full.value.trim(),
      points: points.map((x) => x.trim()).filter(Boolean),
      symbol: symbol.value,
      published: pub.input.checked,
      seo_title: nul(seoTitle.value),
      seo_description: nul(seoDesc.value),
    };
    try {
      let row: Service;
      if (isNew) {
        const { data: last } = await db.select("services", "select=display_order&order=display_order.desc&limit=1");
        row = await db.insert<Service>("services", { ...payload, display_order: (last[0]?.display_order ?? 0) + 1 });
      } else [row] = await db.update<Service>("services", `id=eq.${s.id}`, payload);
      dirty = false;
      setLeaveGuard(null);
      toast(`“${row.title}” saved.`);
      markChanged();
      if (isNew) navigate(`/admin/services/${row.id}/`, { replace: true, force: true });
    } catch (err) {
      if ((err as { code?: string }).code === "23505") setError(slug, "Another service already uses this slug.");
      toastError(err);
    }
  };
  const saveBtn = btn("Save", { kind: "primary", onclick: () => busy(saveBtn, save) });
  form.addEventListener("submit", (e) => (e.preventDefault(), busy(saveBtn, save)));
  const del = !isNew
    ? btn("Delete", {
        kind: "danger",
        icon: "trash",
        onclick: async () => {
          if (!(await confirmDialog({ title: `Delete “${s.title}”?`, message: "The service and its page will be removed from the website on the next publish. Hiding it (unpublish) is reversible.", confirm: "Delete", danger: true }))) return;
          try {
            await db.remove("services", `id=eq.${s.id}`);
            setLeaveGuard(null);
            toast("Service deleted.");
            markChanged();
            navigate("/admin/services/", { replace: true, force: true });
          } catch (err) {
            toastError(err);
          }
        },
      })
    : null;
  return h(
    "div",
    { class: "page page--editor" },
    h("a", { class: "back", href: "/admin/services/" }, icon("back"), "All services"),
    pageHead(isNew ? "New service" : s.title!, null, !isNew && s.published ? h("a", { class: "btn", href: `${CFG.siteUrl}/services/${s.slug}/`, target: "_blank", rel: "noopener" }, icon("external"), "View live") : null, del),
    form,
    h("div", { class: "savebar" }, h("span", { class: "savebar__state" }, isNew ? "New — not saved yet" : ""), h("div", { class: "row" }, h("a", { class: "btn btn--ghost", href: "/admin/services/" }, "Cancel"), saveBtn))
  );
}
