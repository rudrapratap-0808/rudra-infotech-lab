/** Projects & apps: sortable list with quick actions, and the full editor. */
import { paragraphs, PROJECT_TYPES, type ImageKind } from "../../data/model.js";
import { CFG, db } from "../lib/api.js";
import { $$, h, icon } from "../lib/dom.js";
import { chooseFiles, imageField, pickImages, uploadMany } from "../lib/media.js";
import { navigate, setLeaveGuard, type Ctx } from "../lib/router.js";
import { markChanged } from "../lib/state.js";
import {
  badge, btn, busy, card, confirmDialog, empty, errorState, field, fmtDate, input, isUrl, modal, nul, promptDialog, PUB_STATUS, select, setError,
  skeleton, slugify, textarea, toast, toastError, toggle,
} from "../lib/ui.js";
import { pageHead } from "./shell.js";

type Kind = "web" | "apps";
interface Row {
  id: string;
  slug: string;
  name: string;
  project_type: string | null;
  platform: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  display_order: number;
  featured_image: string | null;
  desktop_screenshot: string | null;
  mobile_screenshot: string | null;
  project_logo: string | null;
  updated_at: string;
}
const LIST_COLS = "id,slug,name,project_type,platform,status,featured,display_order,featured_image,desktop_screenshot,mobile_screenshot,project_logo,updated_at";
const base = (k: Kind) => (k === "web" ? "/admin/projects/" : "/admin/apps/");
const siteLink = (slug: string) => `${CFG.siteUrl || ""}/projects/${slug}/`;

/* ── List ─────────────────────────────────────────────────── */
export const projectsView = (kind: Kind) => async (ctx: Ctx): Promise<HTMLElement> => {
  const root = h("div", { class: "page" });
  const noun = kind === "web" ? "project" : "app";
  let all: Row[] = [];
  let filter = ctx.query.get("status") ?? "";
  const search = input("", { type: "search", placeholder: `Search ${noun}s` });
  search.setAttribute("aria-label", `Search ${noun}s`);
  const tabs = h("div", { class: "tabs", role: "group", "aria-label": "Filter by status" });
  const listEl = h("ol", { class: "plist", "aria-label": `${noun}s` }, skeleton(6));
  const hint = h("p", { class: "muted plist__hint" });
  root.append(
    pageHead(kind === "web" ? "Projects" : "Apps", kind === "web" ? "Websites in the portfolio. Only PUBLISHED projects appear on the site." : "Mobile apps (Android). Only PUBLISHED apps appear on the site.", h("a", { class: "btn btn--primary", href: `${base(kind)}new/` }, icon("plus"), `New ${noun}`)),
    h("div", { class: "filters card" }, h("div", { class: "filters__q" }, icon("search"), search), tabs),
    hint,
    listEl
  );

  const mine = () => all.filter((p) => (kind === "web" ? p.platform === "web" : p.platform !== "web"));
  const visible = () => {
    const q = search.value.trim().toLowerCase();
    return mine().filter((p) => (!filter || p.status === filter) && (!q || `${p.name} ${p.slug} ${p.project_type ?? ""}`.toLowerCase().includes(q)));
  };
  const canSort = () => !filter && !search.value.trim();

  const saveOrder = async (ordered: Row[]) => {
    // Keep one global order: websites first, then apps.
    const web = kind === "web" ? ordered : all.filter((p) => p.platform === "web");
    const apps = kind === "apps" ? ordered : all.filter((p) => p.platform !== "web");
    try {
      await db.rpc("reorder", { p_table: "projects", p_ids: [...web, ...apps].map((p) => p.id) });
      [...web, ...apps].forEach((p, i) => (p.display_order = i + 1));
      all.sort((a, b) => a.display_order - b.display_order);
      toast("Order saved.");
      if (ordered.some((p) => p.status === "published")) markChanged();
    } catch (err) {
      toastError(err);
      await load();
    }
    draw();
  };

  const thumb = (p: Row) => {
    const src = p.featured_image || p.desktop_screenshot || p.mobile_screenshot || p.project_logo;
    return h("span", { class: "plist__thumb" }, src ? h("img", { src, alt: "", loading: "lazy" }) : icon(kind === "web" ? "projects" : "apps"));
  };

  const setStatus = async (p: Row, status: Row["status"]) => {
    const was = p.status;
    try {
      await db.update("projects", `id=eq.${p.id}`, { status });
      p.status = status;
      toast(status === "published" ? `“${p.name}” published.` : status === "archived" ? `“${p.name}” archived.` : `“${p.name}” unpublished (draft).`);
      if (was === "published" || status === "published") markChanged();
      draw();
    } catch (err) {
      toastError(err);
    }
  };

  const duplicate = async (p: Row) => {
    try {
      const src = await db.one<Record<string, unknown>>("projects", `select=*&id=eq.${p.id}`);
      if (!src) return;
      const [imgs, techs] = await Promise.all([
        db.select("project_images", `select=url,kind,alt&project_id=eq.${p.id}&order=display_order.asc`),
        db.select("project_technologies", `select=technology_id&project_id=eq.${p.id}&order=display_order.asc`),
      ]);
      const taken = new Set(all.map((x) => x.slug));
      let slug = `${p.slug}-copy`.slice(0, 74);
      for (let i = 2; taken.has(slug); i++) slug = `${p.slug}-copy-${i}`.slice(0, 80);
      const { id: _id, created_at: _c, updated_at: _u, published_at: _p, created_by: _b, ...rest } = src;
      const copy = await db.insert<Row>("projects", { ...rest, slug, name: `${p.name} (copy)`.slice(0, 120), status: "draft", featured: false, display_order: all.length + 1 });
      await db.rpc("set_project_media", { p_project: copy.id, p_images: imgs.data, p_technologies: techs.data.map((t: any) => t.technology_id) });
      toast(`Duplicated as a draft: “${copy.name}”.`);
      navigate(`${base(kind)}${copy.id}/`);
    } catch (err) {
      toastError(err);
    }
  };

  const remove = async (p: Row) => {
    const ok = await confirmDialog({
      title: `Delete “${p.name}”?`,
      message: h("div", null, h("p", null, `The ${noun}, its gallery and technology links will be deleted permanently.`), p.status === "published" ? h("p", null, "It's live now — it will disappear from the website on the next publish.") : null, h("p", { class: "muted" }, "Prefer “Archive” if you might want it back.")),
      confirm: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    try {
      await db.remove("projects", `id=eq.${p.id}`);
      all = all.filter((x) => x.id !== p.id);
      toast(`“${p.name}” deleted.`);
      if (p.status === "published") markChanged();
      draw();
    } catch (err) {
      toastError(err);
    }
  };

  const menu = (p: Row) => {
    const items: [string, string, () => void, boolean?][] = [
      ["Edit", "edit", () => navigate(`${base(kind)}${p.id}/`)],
      ["Duplicate", "copy", () => duplicate(p)],
      ["Preview", "eye", () => (p.status === "published" ? window.open(siteLink(p.slug), "_blank", "noopener") : previewDraft(p.id))],
      p.status === "published" ? ["Unpublish", "archive", () => setStatus(p, "draft")] : ["Publish", "publish", () => setStatus(p, "published")],
      p.status === "archived" ? ["Restore to draft", "archive", () => setStatus(p, "draft")] : ["Archive", "archive", () => setStatus(p, "archived")],
      ["Delete", "trash", () => remove(p), true],
    ];
    const pop = h("div", { class: "menu", role: "menu", hidden: true });
    const trigger = h("button", { class: "icon-btn", type: "button", "aria-haspopup": "menu", "aria-expanded": "false", "aria-label": `Actions for ${p.name}` }, icon("more"));
    for (const [label, ic, act, danger] of items)
      pop.append(
        h(
          "button",
          {
            class: `menu__item${danger ? " is-danger" : ""}`,
            type: "button",
            role: "menuitem",
            onclick: () => {
              close();
              act();
            },
          },
          icon(ic),
          label
        )
      );
    const close = () => {
      pop.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", outside, true);
    };
    const outside = (e: Event) => !pop.contains(e.target as Node) && e.target !== trigger && close();
    trigger.addEventListener("click", () => {
      const open = pop.hidden;
      $$(".menu").forEach((m) => (m.hidden = true));
      pop.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        document.addEventListener("click", outside, true);
        pop.querySelector<HTMLElement>("button")?.focus();
      }
    });
    pop.addEventListener("keydown", (e) => {
      const btns = Array.from(pop.querySelectorAll<HTMLElement>("button"));
      const i = btns.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") (close(), trigger.focus());
      if (e.key === "ArrowDown") (e.preventDefault(), btns[(i + 1) % btns.length].focus());
      if (e.key === "ArrowUp") (e.preventDefault(), btns[(i - 1 + btns.length) % btns.length].focus());
    });
    return h("div", { class: "menuwrap" }, trigger, pop);
  };

  let dragId = "";
  const draw = () => {
    const counts = { "": mine().length, published: 0, draft: 0, archived: 0 } as Record<string, number>;
    mine().forEach((p) => counts[p.status]++);
    tabs.replaceChildren(
      ...(["", "published", "draft", "archived"] as const).map((s) =>
        h("button", { class: "tab", type: "button", "aria-pressed": String(filter === s), onclick: () => ((filter = s), draw()) }, s ? PUB_STATUS[s].label : "ALL", h("span", { class: "tab__n" }, String(counts[s])))
      )
    );
    const list = visible();
    hint.textContent = canSort() && list.length > 1 ? "Drag rows (or use the arrows) to set the order used on the website." : list.length > 1 ? "Clear the search and filters to reorder." : "";
    if (!list.length) {
      listEl.replaceChildren(
        empty(mine().length ? `No ${noun}s match` : `No ${noun}s yet`, mine().length ? "Try another filter or search." : `Create your first ${noun} — it stays a draft until you publish it.`, mine().length ? null : h("a", { class: "btn btn--primary", href: `${base(kind)}new/` }, icon("plus"), `New ${noun}`))
      );
      return;
    }
    const sortable = canSort();
    listEl.replaceChildren(
      ...list.map((p, i) => {
        const li = h(
          "li",
          { class: `plist__row${p.status !== "published" ? " is-muted" : ""}`, draggable: sortable ? "true" : undefined, dataset: { id: p.id } },
          sortable ? h("span", { class: "plist__grip", "aria-hidden": "true", title: "Drag to reorder" }, icon("grip")) : h("span", { class: "plist__grip is-off", "aria-hidden": "true" }),
          thumb(p),
          h("div", { class: "plist__main" }, h("a", { class: "plist__name", href: `${base(kind)}${p.id}/` }, p.name), h("span", { class: "plist__meta mono" }, `/${p.slug}/ · ${p.project_type ?? "—"} · updated ${fmtDate(p.updated_at)}`)),
          badge(PUB_STATUS[p.status].label, PUB_STATUS[p.status].tone),
          h(
            "button",
            {
              class: `icon-btn star${p.featured ? " is-on" : ""}`,
              type: "button",
              "aria-pressed": String(p.featured),
              "aria-label": p.featured ? `Featured — remove ${p.name} from the home page` : `Feature ${p.name} on the home page`,
              title: p.featured ? "Featured on the home page" : "Not featured",
              onclick: async () => {
                try {
                  await db.update("projects", `id=eq.${p.id}`, { featured: !p.featured });
                  p.featured = !p.featured;
                  toast(p.featured ? `“${p.name}” is featured.` : `“${p.name}” is no longer featured.`);
                  if (p.status === "published") markChanged();
                  draw();
                } catch (err) {
                  toastError(err);
                }
              },
            },
            icon("star")
          ),
          sortable
            ? h(
                "span",
                { class: "plist__move" },
                h("button", { class: "icon-btn", type: "button", "aria-label": `Move ${p.name} up`, disabled: i === 0, onclick: () => move(i, -1) }, icon("up")),
                h("button", { class: "icon-btn", type: "button", "aria-label": `Move ${p.name} down`, disabled: i === list.length - 1, onclick: () => move(i, 1) }, icon("down"))
              )
            : null,
          menu(p)
        );
        if (sortable) {
          li.addEventListener("dragstart", (e) => {
            dragId = p.id;
            li.classList.add("is-dragging");
            e.dataTransfer!.effectAllowed = "move";
            e.dataTransfer!.setData("text/plain", p.id);
          });
          li.addEventListener("dragend", () => li.classList.remove("is-dragging"));
          li.addEventListener("dragover", (e) => {
            e.preventDefault();
            const over = li.getBoundingClientRect();
            li.classList.toggle("drop-above", e.clientY < over.top + over.height / 2);
            li.classList.toggle("drop-below", e.clientY >= over.top + over.height / 2);
          });
          li.addEventListener("dragleave", () => li.classList.remove("drop-above", "drop-below"));
          li.addEventListener("drop", (e) => {
            e.preventDefault();
            const below = li.classList.contains("drop-below");
            li.classList.remove("drop-above", "drop-below");
            if (!dragId || dragId === p.id) return;
            const arr = mine();
            const from = arr.findIndex((x) => x.id === dragId);
            const [moved] = arr.splice(from, 1);
            const to = arr.findIndex((x) => x.id === p.id) + (below ? 1 : 0);
            arr.splice(to, 0, moved);
            dragId = "";
            saveOrder(arr);
          });
        }
        return li;
      })
    );
  };
  const move = (i: number, d: number) => {
    const arr = mine();
    const [m] = arr.splice(i, 1);
    arr.splice(i + d, 0, m);
    saveOrder(arr);
  };
  const load = async () => {
    try {
      all = (await db.select<Row>("projects", `select=${LIST_COLS}&order=display_order.asc,created_at.asc`)).data;
      draw();
    } catch (err) {
      listEl.replaceChildren(errorState(err, load));
    }
  };
  search.addEventListener("input", draw);
  await load();
  return root;
};

/** Draft preview (drafts aren't on the static site yet). */
async function previewDraft(id: string) {
  try {
    const p = await db.one<any>("projects", `select=*&id=eq.${id}`);
    if (!p) return;
    const img = p.featured_image || p.desktop_screenshot || p.mobile_screenshot;
    modal(
      `Preview — ${p.name}`,
      h(
        "article",
        { class: "preview" },
        h("p", { class: "mono muted" }, [p.project_type, p.platform, p.completion_year].filter(Boolean).join(" · ") || "Draft"),
        h("h3", { class: "preview__name" }, p.name),
        img ? h("img", { class: "preview__img", src: img, alt: p.image_alt ?? "" }) : null,
        h("p", { class: "preview__lede" }, p.short_description || "No short description yet."),
        paragraphs(p.full_description).map((t) => h("p", null, t)),
        h("p", { class: "muted" }, p.status === "published" ? "Published — the live page shows the last published build." : "This is a draft: it isn't on the website until you publish it.")
      ),
      { wide: true }
    );
  } catch (err) {
    toastError(err);
  }
}

/* ── Editor ───────────────────────────────────────────────── */
interface Img {
  url: string;
  kind: ImageKind;
  alt: string;
}
const KINDS: [ImageKind, string][] = [
  ["gallery", "Gallery image"],
  ["screenshot", "Screenshot"],
  ["desktop_mockup", "Desktop mockup"],
  ["mobile_mockup", "Mobile mockup"],
];

export const projectEditView = (kind: Kind) => async (ctx: Ctx): Promise<HTMLElement> => {
  const isNew = !ctx.params.id;
  const noun = kind === "web" ? "project" : "app";
  let p: Record<string, any> = {};
  let images: Img[] = [];
  let techIds: string[] = [];
  let techs: { id: string; name: string; kind: string }[] = [];
  let cats: { id: string; name: string }[] = [];
  try {
    const [t, c] = await Promise.all([db.select("technologies", "select=id,name,kind&order=name.asc"), db.select("project_categories", "select=id,name&order=display_order.asc,name.asc")]);
    techs = t.data;
    cats = c.data;
    if (!isNew) {
      const row = await db.one("projects", `select=*&id=eq.${encodeURIComponent(ctx.params.id)}`);
      if (!row) return h("div", { class: "page" }, empty(`This ${noun} doesn't exist`, "It may have been deleted.", h("a", { class: "btn", href: base(kind) }, "Back")));
      p = row;
      const [im, tl] = await Promise.all([
        db.select<Img>("project_images", `select=url,kind,alt&project_id=eq.${p.id}&order=display_order.asc`),
        db.select("project_technologies", `select=technology_id&project_id=eq.${p.id}&order=display_order.asc`),
      ]);
      images = im.data.map((i) => ({ ...i, alt: i.alt ?? "" }));
      techIds = tl.data.map((x: any) => x.technology_id);
    } else {
      p = { status: "draft", platform: kind === "web" ? "web" : "android", project_type: kind === "web" ? "BUSINESS WEBSITE" : "ANDROID APPLICATION", featured: false };
    }
  } catch (err) {
    return h("div", { class: "page" }, errorState(err, () => navigate(ctx.path, { force: true, replace: true })));
  }

  let dirty = false;
  const markDirty = () => {
    if (!dirty) {
      dirty = true;
      setLeaveGuard(() => confirmDialog({ title: "Discard unsaved changes?", message: "You have changes that haven't been saved.", confirm: "Discard", danger: true }));
      saveState.textContent = "Unsaved changes";
    }
  };

  // Basics
  const name = input(p.name, { max: 120, required: true });
  const slug = input(p.slug, { max: 80, required: true, pattern: "[a-z0-9]+(-[a-z0-9]+)*" });
  let slugTouched = !isNew;
  name.addEventListener("input", () => !slugTouched && (slug.value = slugify(name.value)));
  slug.addEventListener("input", () => {
    slugTouched = true;
    slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-");
  });
  const short = textarea(p.short_description, { rows: 3, max: 300 });
  const full = textarea(p.full_description, { rows: 8, max: 8000 });
  const type = select(p.project_type ?? "", [["", "— Not set —"], ...PROJECT_TYPES]);
  const category = select(p.category_id ?? "", [["", "— None —"], ...cats.map((c) => [c.id, c.name] as [string, string]), ["__new", "+ New category…"]]);
  category.addEventListener("change", async () => {
    if (category.value !== "__new") return;
    const nm = await promptDialog("New category", "Category name", "", { max: 60, placeholder: "e.g. Restaurant" });
    if (!nm) return (category.value = p.category_id ?? "");
    try {
      const c = await db.insert<{ id: string; name: string }>("project_categories", { name: nm, display_order: cats.length + 1 });
      cats.push(c);
      category.insertBefore(h("option", { value: c.id }, c.name), category.lastElementChild);
      category.value = c.id;
      toast(`Category “${c.name}” added.`);
    } catch (err) {
      toastError(err);
      category.value = p.category_id ?? "";
    }
  });
  const platform = select(p.platform, [["web", "Web"], ["android", "Android"], ["ios", "iOS"], ["cross-platform", "Cross-platform"]]);
  const client = input(p.client_name, { max: 120 });
  const year = input(p.completion_year, { type: "number", min: 1990, step: "1", inputmode: "numeric" });

  // Links
  const live = input(p.live_url, { type: "url", max: 300, placeholder: "https://…" });
  const appUrl = input(p.app_url, { type: "url", max: 300, placeholder: "https://…" });
  const play = input(p.play_store_url, { type: "url", max: 300, placeholder: "https://play.google.com/store/apps/details?id=…" });
  const github = input(p.github_url, { type: "url", max: 300, placeholder: "https://github.com/…" });

  // Media
  const logo = imageField("Project logo / app icon", p.project_logo, { onChange: markDirty, hint: "Square PNG or WebP works best." });
  const featured = imageField("Featured image (thumbnail)", p.featured_image, { onChange: markDirty, hint: "Used for cards, the case-study frame and link previews. 16:10 works best." });
  const desktop = imageField("Desktop screenshot", p.desktop_screenshot, { onChange: markDirty, hint: "A real screenshot of the live site (replaces the featured image in frames)." });
  const mobile = imageField("Mobile screenshot", p.mobile_screenshot, { onChange: markDirty, tall: true, hint: "For apps this fills the centre phone." });
  const alt = input(p.image_alt, { max: 300, placeholder: "Describe the featured image for screen readers" });
  const gallery = h("ul", { class: "gal" });
  const drawGallery = () => {
    gallery.replaceChildren(
      ...(images.length
        ? images.map((im, i) => {
            const kindSel = select(im.kind, KINDS);
            kindSel.setAttribute("aria-label", "Image type");
            kindSel.addEventListener("change", () => ((im.kind = kindSel.value as ImageKind), markDirty()));
            const altIn = input(im.alt, { max: 300, placeholder: "Alt text" });
            altIn.setAttribute("aria-label", "Alt text");
            altIn.addEventListener("input", () => ((im.alt = altIn.value), markDirty()));
            return h(
              "li",
              { class: "gal__item" },
              h("img", { src: im.url, alt: "", loading: "lazy" }),
              h("div", { class: "gal__fields" }, kindSel, altIn),
              h(
                "div",
                { class: "gal__btns" },
                h("button", { class: "icon-btn", type: "button", "aria-label": "Move up", disabled: i === 0, onclick: () => (images.splice(i - 1, 0, ...images.splice(i, 1)), markDirty(), drawGallery()) }, icon("up")),
                h("button", { class: "icon-btn", type: "button", "aria-label": "Move down", disabled: i === images.length - 1, onclick: () => (images.splice(i + 1, 0, ...images.splice(i, 1)), markDirty(), drawGallery()) }, icon("down")),
                h("button", { class: "icon-btn", type: "button", "aria-label": "Remove image", onclick: () => (images.splice(i, 1), markDirty(), drawGallery()) }, icon("trash"))
              )
            );
          })
        : [h("li", { class: "muted" }, "No gallery images. Add screenshots, mockups or brand images.")])
    );
  };
  drawGallery();
  const addFromLib = btn("Add from library", {
    icon: "media",
    small: true,
    onclick: async () => {
      const picked = await pickImages({ multiple: true, title: "Add gallery images" });
      for (const x of picked) if (!images.some((i) => i.url === x.url)) images.push({ url: x.url, alt: x.alt, kind: "gallery" });
      if (picked.length) (markDirty(), drawGallery());
    },
  });
  const addUpload = btn("Upload images", {
    icon: "upload",
    small: true,
    onclick: async () => {
      const files = await chooseFiles(true);
      if (!files.length) return;
      addUpload.disabled = true;
      await uploadMany(files, (r) => images.push({ url: r.url, alt: "", kind: "gallery" }));
      addUpload.disabled = false;
      markDirty();
      drawGallery();
    },
  });

  // Technologies
  const chips = h("ul", { class: "chips" });
  const techSel = h("select", { class: "input select", "aria-label": "Add a technology" });
  const drawTechs = () => {
    chips.replaceChildren(
      ...techIds.map((id, i) => {
        const t = techs.find((x) => x.id === id);
        return h("li", { class: "chip" }, t?.name ?? "?", h("button", { type: "button", class: "chip__x", "aria-label": `Remove ${t?.name}`, onclick: () => (techIds.splice(i, 1), markDirty(), drawTechs()) }, icon("close")));
      })
    );
    techSel.replaceChildren(h("option", { value: "" }, "Add a technology…"), ...techs.filter((t) => !techIds.includes(t.id)).map((t) => h("option", { value: t.id }, `${t.name}${t.kind ? ` — ${t.kind}` : ""}`)), h("option", { value: "__new" }, "+ New technology…"));
  };
  techSel.addEventListener("change", async () => {
    const v = techSel.value;
    if (!v) return;
    if (v === "__new") {
      const nm = await promptDialog("New technology", "Name (e.g. Flutter)", "", { max: 60 });
      if (nm) {
        try {
          const t = await db.insert<{ id: string; name: string; kind: string }>("technologies", { name: nm, in_toolkit: false, display_order: techs.length + 1 });
          techs.push(t);
          techIds.push(t.id);
          toast(`“${t.name}” added. Show it in the toolkit from the Toolkit page.`);
        } catch (err) {
          toastError(err);
        }
      }
    } else techIds.push(v);
    markDirty();
    drawTechs();
  });
  drawTechs();

  // Presentation + publishing
  const accent = input(p.accent ?? "#dfff36", { max: 7, pattern: "#[0-9a-fA-F]{6}" });
  const accentPick = h("input", { type: "color", class: "color", value: /^#[0-9a-f]{6}$/i.test(p.accent ?? "") ? p.accent : "#dfff36", "aria-label": "Pick accent colour" });
  accentPick.addEventListener("input", () => ((accent.value = accentPick.value), markDirty()));
  accent.addEventListener("input", () => /^#[0-9a-f]{6}$/i.test(accent.value) && (accentPick.value = accent.value));
  const headline = input(p.headline, { max: 160 });
  const appCat = input(p.app_category, { max: 60, placeholder: "e.g. FoodApplication (only if known)" });
  const feat = toggle(!!p.featured, "Featured on the home page");
  const status = select(p.status, [["draft", "Draft — not on the website"], ["published", "Published — live on the website"], ["archived", "Archived — hidden"]]);

  // SEO
  const seoTitle = input(p.seo_title, { max: 120 });
  const seoDesc = textarea(p.seo_description, { rows: 3, max: 320 });
  const social = imageField("Social share image", p.social_image, { onChange: markDirty, hint: "1200 × 630. Falls back to the featured image." });
  const canonical = input(p.canonical_url, { type: "url", max: 300, placeholder: "Leave empty to use this page's own URL" });
  const snippet = h("div", { class: "serp" });
  const drawSnippet = () =>
    snippet.replaceChildren(
      h("p", { class: "serp__url" }, `${(CFG.siteUrl || "").replace(/^https?:\/\//, "")} › projects › ${slug.value || "…"}`),
      h("p", { class: "serp__title" }, seoTitle.value || `${name.value || "Project"} — ${kind === "web" ? "Website" : "Android app"} | Rudra InfoTech Lab`),
      h("p", { class: "serp__desc" }, seoDesc.value || short.value || "Add a short description…")
    );
  for (const el of [name, slug, seoTitle, seoDesc, short]) el.addEventListener("input", drawSnippet);
  drawSnippet();

  const saveState = h("span", { class: "savebar__state" }, isNew ? "New — not saved yet" : `Last saved ${fmtDate(p.updated_at, true)}`);
  const form = h(
    "form",
    { class: "editor", novalidate: true },
    card("Basics", h("div", { class: "grid2" }, field("Name", name, { required: true }), field("URL slug", slug, { required: true, hint: `Page address: /projects/${p.slug ?? "your-slug"}/` }), h("div", { class: "span2" }, field("Short description", short, { max: 300, counter: true, hint: "One or two sentences — used in lists, cards and search results." })), h("div", { class: "span2" }, field("Full description", full, { max: 8000, counter: true, hint: "Leave a blank line between paragraphs. Stick to verified facts." })), field("Project type", type), field("Category", category), field("Platform", platform), field("Client name", client), field("Completion year", year))),
    card("Links", h("div", { class: "grid2" }, field("Live website URL", live), field("Web app URL", appUrl), field("Google Play URL", play, { hint: "Shows the Google Play badge and download buttons." }), field("GitHub URL", github))),
    card("Images", h("div", { class: "grid2" }, logo.el, featured.el, desktop.el, mobile.el, h("div", { class: "span2" }, field("Featured image alt text", alt))), h("h3", { class: "card__sub" }, "Gallery"), gallery, h("div", { class: "row" }, addUpload, addFromLib)),
    card("Technologies used", chips, techSel, h("p", { class: "field__hint" }, "Only list technologies that were actually used.")),
    card("Presentation", h("div", { class: "grid2" }, field("Accent colour", h("div", { class: "row" }, accentPick, accent)), field("Project headline", headline, { hint: "The project's own headline, quoted on the case study." }), kind === "apps" ? field("App category (schema.org)", appCat) : null, h("div", { class: "span2" }, feat.el))),
    card("Publishing", field("Status", status, { hint: "Only published items appear on the website." })),
    card("SEO", h("div", { class: "grid2" }, field("SEO title", seoTitle, { max: 60, counter: true, hint: "Leave empty for an automatic title." }), field("Canonical URL", canonical), h("div", { class: "span2" }, field("SEO description", seoDesc, { max: 160, counter: true })), h("div", { class: "span2" }, social.el)), h("h3", { class: "card__sub" }, "Search preview"), snippet)
  );
  form.addEventListener("input", markDirty);
  form.addEventListener("change", markDirty);
  feat.input.addEventListener("change", markDirty);

  const validate = (): boolean => {
    const bad: HTMLElement[] = [];
    const chk = (el: HTMLElement, msg: string | null) => (setError(el, msg), msg && bad.push(el));
    chk(name, name.value.trim() ? null : "Give it a name.");
    chk(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.value) ? null : "Use lowercase letters, numbers and single dashes.");
    chk(live, !live.value || isUrl(live.value) ? null : "Enter a full URL starting with https://");
    chk(appUrl, !appUrl.value || isUrl(appUrl.value) ? null : "Enter a full URL starting with https://");
    chk(play, !play.value || /^https:\/\/play\.google\.com\/\S+$/.test(play.value) ? null : "Use the https://play.google.com/… link from the Play Store.");
    chk(github, !github.value || /^https:\/\/\S+\.\S+$/.test(github.value) ? null : "Enter a full https:// URL.");
    chk(canonical, !canonical.value || isUrl(canonical.value) ? null : "Enter a full URL.");
    chk(year, !year.value || (Number(year.value) >= 1990 && Number(year.value) <= 2100) ? null : "Use a year between 1990 and 2100.");
    chk(accent, !accent.value || /^#[0-9a-f]{6}$/i.test(accent.value) ? null : "Use a hex colour like #FF4B18.");
    if (bad.length) {
      toast("Please fix the highlighted fields.", "error");
      bad[0].focus();
      return false;
    }
    return true;
  };

  const save = async (publishToo = false) => {
    if (!validate()) return;
    if (publishToo) status.value = "published";
    const payload = {
      name: name.value.trim(),
      slug: slug.value,
      short_description: short.value.trim(),
      full_description: nul(full.value),
      project_type: nul(type.value),
      category_id: category.value && category.value !== "__new" ? category.value : null,
      platform: platform.value,
      client_name: nul(client.value),
      completion_year: year.value ? Number(year.value) : null,
      live_url: nul(live.value),
      app_url: nul(appUrl.value),
      play_store_url: nul(play.value),
      github_url: nul(github.value),
      project_logo: logo.value,
      featured_image: featured.value,
      desktop_screenshot: desktop.value,
      mobile_screenshot: mobile.value,
      image_alt: nul(alt.value),
      accent: nul(accent.value)?.toLowerCase() ?? null,
      headline: nul(headline.value),
      app_category: nul(appCat.value),
      featured: feat.input.checked,
      status: status.value,
      seo_title: nul(seoTitle.value),
      seo_description: nul(seoDesc.value),
      social_image: social.value,
      canonical_url: nul(canonical.value),
    };
    const wasPublished = p.status === "published";
    try {
      let row: Record<string, any>;
      if (isNew) {
        const { data: last } = await db.select("projects", "select=display_order&order=display_order.desc&limit=1");
        row = await db.insert("projects", { ...payload, display_order: (last[0]?.display_order ?? 0) + 1 });
      } else {
        [row] = await db.update("projects", `id=eq.${p.id}`, payload);
      }
      await db.rpc("set_project_media", { p_project: row.id, p_images: images.map((i) => ({ url: i.url, kind: i.kind, alt: i.alt.trim() })), p_technologies: techIds });
      p = row;
      dirty = false;
      setLeaveGuard(null);
      saveState.textContent = `Saved ${fmtDate(row.updated_at, true)}`;
      toast(row.status === "published" ? `“${row.name}” saved and live on the next publish.` : `“${row.name}” saved as ${row.status}.`);
      if (row.status === "published" || wasPublished) markChanged();
      const home = row.platform === "web" ? "/admin/projects/" : "/admin/apps/";
      if (isNew || !location.pathname.startsWith(home)) navigate(`${home}${row.id}/`, { replace: true, force: true });
    } catch (err) {
      const e = err as { code?: string; message: string };
      if (e.code === "23505") {
        setError(slug, "Another project already uses this slug.");
        slug.focus();
      }
      toastError(err);
    }
  };
  const saveBtn = btn("Save", { kind: "primary", onclick: () => busy(saveBtn, () => save()) });
  const pubBtn = btn("Save & publish", { icon: "publish" });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    busy(saveBtn, () => save());
  });
  pubBtn.addEventListener("click", () => busy(pubBtn, () => save(true)));
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && document.body.contains(form)) {
      e.preventDefault();
      busy(saveBtn, () => save());
    }
  };
  document.addEventListener("keydown", onKey);
  new MutationObserver((_, obs) => !document.body.contains(form) && (document.removeEventListener("keydown", onKey), obs.disconnect())).observe(document.body, { childList: true, subtree: true });

  const viewLive = !isNew && p.status === "published" ? h("a", { class: "btn", href: siteLink(p.slug), target: "_blank", rel: "noopener" }, icon("external"), "View live") : null;
  return h(
    "div",
    { class: "page page--editor" },
    h("a", { class: "back", href: base(kind) }, icon("back"), kind === "web" ? "All projects" : "All apps"),
    pageHead(isNew ? `New ${noun}` : p.name, isNew ? "Fill in what you know — you can save a draft and come back." : `/projects/${p.slug}/`, viewLive, !isNew ? btn("Preview", { icon: "eye", onclick: () => previewDraft(p.id) }) : null),
    form,
    h("div", { class: "savebar" }, saveState, h("div", { class: "row" }, h("a", { class: "btn btn--ghost", href: base(kind) }, "Cancel"), p.status !== "published" ? pubBtn : null, saveBtn))
  );
};
