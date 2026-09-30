/** Batch list editors: Process steps and the Toolkit (technologies). */
import { db } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { setLeaveGuard } from "../lib/router.js";
import { markChanged } from "../lib/state.js";
import { btn, busy, confirmDialog, empty, errorState, input, isUrl, nul, setError, skeleton, textarea, toast, toastError, toggle } from "../lib/ui.js";
import { pageHead } from "./shell.js";

interface Col {
  key: string;
  label: string;
  kind: "line" | "text" | "toggle" | "url";
  max?: number;
  required?: boolean;
  placeholder?: string;
}
interface Spec {
  table: "process_steps" | "technologies";
  title: string;
  sub: string;
  noun: string;
  cols: Col[];
  select: string;
  blank: () => Record<string, unknown>;
  deleteWarning?: (row: Record<string, any>) => Promise<string | null>;
}
type RowState = { data: Record<string, any>; orig: string; el?: HTMLElement; controls: Map<string, HTMLInputElement | HTMLTextAreaElement> };

function listEditor(spec: Spec) {
  return async (): Promise<HTMLElement> => {
    const root = h("div", { class: "page" });
    const listEl = h("ol", { class: "ledit" }, skeleton(6));
    const status = h("span", { class: "savebar__state" });
    const saveBtn = btn("Save changes", { kind: "primary" });
    const addBtn = btn(`Add ${spec.noun}`, { icon: "plus" });
    root.append(pageHead(spec.title, spec.sub, addBtn), listEl, h("div", { class: "savebar" }, status, h("div", { class: "row" }, saveBtn)));
    let rows: RowState[] = [];
    const removed: Record<string, any>[] = [];
    const setDirty = (v: boolean) => {
      status.textContent = v ? "Unsaved changes" : "All changes saved";
      setLeaveGuard(v ? () => confirmDialog({ title: "Discard unsaved changes?", message: "Your edits to this list haven't been saved.", confirm: "Discard", danger: true }) : null);
    };
    const draw = () => {
      if (!rows.length) return listEl.replaceChildren(empty(`No ${spec.noun}s`, `Add a ${spec.noun} to get started.`));
      listEl.replaceChildren(
        ...rows.map((r, i) => {
          r.controls = new Map();
          const cells = spec.cols.map((c) => {
            if (c.kind === "toggle") {
              const t = toggle(!!r.data[c.key], c.label);
              t.input.addEventListener("change", () => ((r.data[c.key] = t.input.checked), setDirty(true)));
              return h("div", { class: "ledit__cell ledit__cell--toggle" }, t.el);
            }
            const ctl = c.kind === "text" ? textarea(r.data[c.key], { rows: 2, max: c.max }) : input(r.data[c.key], { max: c.max, type: c.kind === "url" ? "url" : "text", placeholder: c.placeholder });
            ctl.setAttribute("aria-label", `${c.label} (${spec.noun} ${i + 1})`);
            ctl.addEventListener("input", () => ((r.data[c.key] = ctl.value), setDirty(true)));
            r.controls.set(c.key, ctl);
            return h("label", { class: `ledit__cell ledit__cell--${c.kind}` }, h("span", { class: "ledit__label mono" }, c.label), ctl, h("span", { class: "field__err", "data-err": "" }));
          });
          return h(
            "li",
            { class: "ledit__row" },
            h("span", { class: "ledit__n mono" }, String(i + 1).padStart(2, "0")),
            h("div", { class: "ledit__cells" }, cells),
            h(
              "div",
              { class: "ledit__btns" },
              h("button", { class: "icon-btn", type: "button", "aria-label": "Move up", disabled: i === 0, onclick: () => (rows.splice(i - 1, 0, ...rows.splice(i, 1)), setDirty(true), draw()) }, icon("up")),
              h("button", { class: "icon-btn", type: "button", "aria-label": "Move down", disabled: i === rows.length - 1, onclick: () => (rows.splice(i + 1, 0, ...rows.splice(i, 1)), setDirty(true), draw()) }, icon("down")),
              h(
                "button",
                {
                  class: "icon-btn",
                  type: "button",
                  "aria-label": `Delete ${spec.noun}`,
                  onclick: async () => {
                    const warn = r.data.id && spec.deleteWarning ? await spec.deleteWarning(r.data) : null;
                    if (!(await confirmDialog({ title: `Delete this ${spec.noun}?`, message: warn ?? "It will be removed when you save.", confirm: "Delete", danger: true }))) return;
                    if (r.data.id) removed.push(r.data);
                    rows.splice(i, 1);
                    setDirty(true);
                    draw();
                  },
                },
                icon("trash")
              )
            )
          );
        })
      );
    };
    const load = async () => {
      try {
        const { data } = await db.select(spec.table, `select=${spec.select}&order=display_order.asc,created_at.asc`);
        rows = data.map((d: any) => ({ data: d, orig: JSON.stringify(d), controls: new Map() }));
        removed.length = 0;
        draw();
        setDirty(false);
      } catch (err) {
        listEl.replaceChildren(errorState(err, load));
      }
    };
    addBtn.addEventListener("click", () => {
      rows.push({ data: spec.blank(), orig: "", controls: new Map() });
      setDirty(true);
      draw();
      [...(rows[rows.length - 1].controls.values())][0]?.focus();
    });
    saveBtn.addEventListener("click", () =>
      busy(saveBtn, async () => {
        // validate
        let bad: HTMLElement | null = null;
        for (const r of rows)
          for (const c of spec.cols) {
            const ctl = r.controls.get(c.key);
            if (!ctl) continue;
            const v = String(r.data[c.key] ?? "").trim();
            const msg = c.required && !v ? `${c.label} is required.` : c.kind === "url" && v && !isUrl(v) ? "Use a full https:// URL." : null;
            setError(ctl, msg);
            if (msg && !bad) bad = ctl;
          }
        if (bad) return (toast("Please fix the highlighted fields.", "error"), bad.focus());
        try {
          for (const d of removed) await db.remove(spec.table, `id=eq.${d.id}`);
          removed.length = 0;
          for (const r of rows) {
            const clean: Record<string, unknown> = {};
            for (const c of spec.cols) clean[c.key] = c.kind === "toggle" ? !!r.data[c.key] : c.kind === "url" ? nul(r.data[c.key]) : String(r.data[c.key] ?? "").trim();
            if (!r.data.id) {
              const created = await db.insert(spec.table, { ...clean, display_order: rows.indexOf(r) + 1 });
              r.data = created;
            } else if (JSON.stringify({ ...JSON.parse(r.orig), ...clean }) !== r.orig) {
              [r.data] = await db.update(spec.table, `id=eq.${r.data.id}`, clean);
            }
            r.orig = JSON.stringify(r.data);
          }
          await db.rpc("reorder", { p_table: spec.table, p_ids: rows.map((r) => r.data.id) });
          toast(`${spec.title} saved.`);
          markChanged();
          await load();
        } catch (err) {
          toastError(err);
        }
      })
    );
    await load();
    return root;
  };
}

export const processView = listEditor({
  table: "process_steps",
  title: "Process",
  sub: "The stages shown in the orange process chapter. Order here = order on the site.",
  noun: "step",
  select: "id,name,description,published,display_order",
  cols: [
    { key: "name", label: "Stage", kind: "line", max: 40, required: true },
    { key: "description", label: "Description", kind: "text", max: 400, required: true },
    { key: "published", label: "Shown", kind: "toggle" },
  ],
  blank: () => ({ name: "", description: "", published: true }),
});

export const toolkitView = listEditor({
  table: "technologies",
  title: "Toolkit",
  sub: "Technologies. “In toolkit” ones appear in the acid Toolkit chapter; all of them can be tagged on projects.",
  noun: "technology",
  select: "id,name,kind,category,official_url,in_toolkit,display_order",
  cols: [
    { key: "name", label: "Name", kind: "line", max: 60, required: true },
    { key: "kind", label: "What it is", kind: "line", max: 60, placeholder: "e.g. UI library" },
    { key: "category", label: "Category", kind: "line", max: 60, placeholder: "Frontend / Backend / Tooling" },
    { key: "official_url", label: "Official URL", kind: "url", max: 300, placeholder: "https://…" },
    { key: "in_toolkit", label: "In toolkit", kind: "toggle" },
  ],
  blank: () => ({ name: "", kind: "", category: "", official_url: "", in_toolkit: true }),
  deleteWarning: async (row) => {
    const { count } = await db.select("project_technologies", `select=project_id&technology_id=eq.${row.id}&limit=1`, true);
    return count ? `“${row.name}” is tagged on ${count} project${count === 1 ? "" : "s"} — it will be removed from them too.` : null;
  },
});
