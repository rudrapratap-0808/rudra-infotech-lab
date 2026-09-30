/** Website Content: text-only CMS groups (no styling controls). */
import type { Content, ContentKey } from "../../data/model.js";
import { seedContent } from "../../data/seed.js";
import { db } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { setLeaveGuard } from "../lib/router.js";
import { markChanged } from "../lib/state.js";
import { btn, busy, confirmDialog, errorState, field, input, skeleton, textarea, toast, toastError } from "../lib/ui.js";
import { pageHead } from "./shell.js";

type F = [key: string, label: string, kind: "line" | "text" | "long", max: number, hint?: string];
const GROUPS: { key: ContentKey; title: string; where: string; fields: F[] }[] = [
  {
    key: "hero",
    title: "Home hero",
    where: "Top of the home page",
    fields: [
      ["meta_1", "Meta line 1", "line", 40],
      ["meta_2", "Meta line 2", "line", 40],
      ["serif", "Serif statement", "line", 40, "Italic line between RUDRA and INFOTECH."],
      ["heading", "Main statement", "text", 140],
      ["description", "Description", "text", 260],
      ["primary_cta", "Primary button", "line", 30],
      ["secondary_cta", "Secondary link", "line", 30],
    ],
  },
  {
    key: "philosophy",
    title: "Philosophy",
    where: "Chapter 01 — the ink section after the hero",
    fields: [
      ["lead", "Lead-in", "text", 120],
      ["statement_1", "Statement — line 1", "line", 40],
      ["statement_2", "Statement — line 2", "line", 40],
      ["description", "Description", "text", 400],
      ["design", "DESIGN.", "text", 120],
      ["develop", "DEVELOP.", "text", 120],
      ["perform", "PERFORM.", "text", 120],
      ["convert", "CONVERT.", "text", 120],
    ],
  },
  { key: "work", title: "Work intro", where: "Above the project reel and on /projects/", fields: [["description", "Intro text", "text", 200]] },
  { key: "apps", title: "Apps intro", where: "The APP / ANDROID chapter and /apps/", fields: [["description", "Intro text", "text", 200]] },
  {
    key: "services",
    title: "Services intro",
    where: "Top of the blue services chapter and /services/",
    fields: [
      ["heading", "Heading", "line", 60],
      ["highlight", "Serif highlight", "line", 40],
      ["description", "Description", "text", 200],
    ],
  },
  {
    key: "about",
    title: "About",
    where: "Chapter 08 — The Lab",
    fields: [
      ["statement_1", "Statement — line 1", "line", 40],
      ["statement_2", "Statement — line 2", "line", 60],
      ["paragraphs", "About text", "long", 3000, "Blank line between paragraphs. The last paragraph is set in bold."],
      ["what_we_do", "What we do", "line", 80],
      ["who_its_for", "Who it's for", "line", 80],
      ["how_we_work", "How we work", "line", 80],
    ],
  },
  {
    key: "contact",
    title: "Contact",
    where: "The orange contact section and /contact/",
    fields: [
      ["heading_1", "Heading — line 1", "line", 20],
      ["heading_2", "Heading — line 2", "line", 20],
      ["serif", "Serif line", "line", 40],
      ["description", "Description", "text", 300],
      ["button", "Submit button", "line", 30],
      ["whatsapp_cta", "WhatsApp button", "line", 30],
      ["success_title", "Success title", "line", 40],
      ["success_text", "Success message", "text", 200],
    ],
  },
  {
    key: "footer",
    title: "Footer",
    where: "Every page",
    fields: [
      ["statement", "Statement", "line", 60],
      ["tagline", "Tagline", "line", 60],
    ],
  },
];

export async function contentView(): Promise<HTMLElement> {
  const root = h("div", { class: "page" });
  const body = h("div", { class: "stack" }, skeleton(8));
  const nav = h("nav", { class: "toc", "aria-label": "Content groups" }, GROUPS.map((g) => h("a", { href: `#c-${g.key}` }, g.title)));
  root.append(pageHead("Website Content", "Text on the public website. Changes go live when the site is published."), nav, body);
  let rows: Record<string, Record<string, string>> = {};
  try {
    const { data } = await db.select("content_sections", "select=key,data");
    rows = Object.fromEntries(data.map((r: any) => [r.key, r.data]));
  } catch (err) {
    body.replaceChildren(errorState(err));
    return root;
  }
  const dirtyGroups = new Set<string>();
  const guard = () => setLeaveGuard(dirtyGroups.size ? () => confirmDialog({ title: "Discard unsaved changes?", message: `Unsaved changes in: ${[...dirtyGroups].join(", ")}.`, confirm: "Discard", danger: true }) : null);

  body.replaceChildren(
    ...GROUPS.map((g) => {
      const defaults = (seedContent as Content)[g.key] as unknown as Record<string, string>;
      const current = { ...defaults, ...(rows[g.key] ?? {}) };
      const controls = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
      const state = h("span", { class: "muted" });
      const fields = g.fields.map(([k, label, kind, max, hint]) => {
        const c = kind === "line" ? input(current[k], { max }) : textarea(current[k], { rows: kind === "long" ? 9 : 3, max });
        controls.set(k, c);
        const reset = h(
          "button",
          { class: "linkbtn", type: "button", title: "Restore the original text", onclick: () => ((c.value = defaults[k] ?? ""), c.dispatchEvent(new Event("input", { bubbles: true }))) },
          "Reset"
        );
        const f = field(label, c, { max, counter: true, hint });
        f.querySelector(".field__label")?.append(reset);
        return h("div", { class: kind === "line" ? "" : "span2" }, f);
      });
      const save = btn("Save", { kind: "primary", small: true });
      const sec = h(
        "section",
        { class: "card", id: `c-${g.key}` },
        h("div", { class: "card__head" }, h("div", null, h("h2", { class: "card__title" }, g.title), h("p", { class: "muted" }, g.where)), h("div", { class: "row" }, state, save)),
        h("div", { class: "grid2" }, fields)
      );
      sec.addEventListener("input", () => {
        dirtyGroups.add(g.title);
        state.textContent = "Unsaved changes";
        guard();
      });
      save.addEventListener("click", () =>
        busy(save, async () => {
          const data: Record<string, string> = {};
          for (const [k, c] of controls) {
            const v = c.value.trim();
            if (!v && defaults[k]) {
              c.focus();
              return toast(`“${g.fields.find((f) => f[0] === k)?.[1]}” can't be empty — use Reset to restore the original.`, "error");
            }
            data[k] = v;
          }
          try {
            await db.upsert("content_sections", { key: g.key, data }, "key");
            dirtyGroups.delete(g.title);
            guard();
            state.textContent = "Saved";
            toast(`${g.title} saved.`);
            markChanged();
          } catch (err) {
            toastError(err);
          }
        })
      );
      return sec;
    }),
    h("p", { class: "muted" }, icon("activity"), " Brand words (RUDRA / INFOTECH / LAB), layout and colours are part of the design system and can't be changed here.")
  );
  return root;
}
