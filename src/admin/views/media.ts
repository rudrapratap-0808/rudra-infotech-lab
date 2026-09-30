/** Media library: upload (drag & drop), search, copy URL, rename/alt, delete with usage check. */
import { db, pq, storage } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { ALLOWED, chooseFiles, uploadMany, type MediaRow } from "../lib/media.js";
import { btn, busy, bytes, confirmDialog, empty, errorState, field, fmtDate, input, modal, skeleton, toast, toastError } from "../lib/ui.js";
import { pageHead } from "./shell.js";

async function usage(url: string): Promise<string[]> {
  const e = encodeURIComponent(url);
  const qe = encodeURIComponent(pq(url)); // values inside or=(…) must be quoted
  const cols = ["project_logo", "featured_image", "desktop_screenshot", "mobile_screenshot", "social_image"];
  const [projects, images, seo] = await Promise.all([
    db.select("projects", `select=name&or=(${cols.map((c) => `${c}.eq.${qe}`).join(",")})`),
    db.select("project_images", `select=project_id,projects(name)&url=eq.${e}`).catch(() => db.select("project_images", `select=project_id&url=eq.${e}`)),
    db.select("seo_settings", `select=id&or=(og_image.eq.${qe},twitter_image.eq.${qe},favicon.eq.${qe},app_icon.eq.${qe})`),
  ]);
  return [
    ...projects.data.map((p: any) => `Project: ${p.name}`),
    ...images.data.map((i: any) => `Gallery: ${i.projects?.name ?? "a project"}`),
    ...(seo.data.length ? ["SEO settings (social image / icons)"] : []),
  ];
}

export async function mediaView(): Promise<HTMLElement> {
  const root = h("div", { class: "page" });
  const search = input("", { type: "search", placeholder: "Search by name or alt text" });
  search.setAttribute("aria-label", "Search media");
  const grid = h("ul", { class: "mgrid" }, skeleton(6));
  const up = btn("Upload images", { kind: "primary", icon: "upload" });
  const drop = h(
    "div",
    { class: "drop", tabindex: "0", role: "button", "aria-label": "Upload images: drop files here or press Enter to browse" },
    icon("upload"),
    h("p", null, h("b", null, "Drop images here"), " or click to browse"),
    h("p", { class: "muted" }, "JPG, PNG, WebP or AVIF · up to 10 MB · JPG/PNG are converted to WebP automatically")
  );
  root.append(pageHead("Media", "Images used across the website. Files are stored in Supabase Storage.", up), drop, h("div", { class: "filters card" }, h("div", { class: "filters__q" }, icon("search"), search)), grid);
  let rows: MediaRow[] = [];

  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const list = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.alt.toLowerCase().includes(q));
    if (!list.length) return grid.replaceChildren(empty(rows.length ? "No images match" : "No images yet", rows.length ? "Try a different search." : "Upload images to use them in projects, apps and SEO."));
    grid.replaceChildren(
      ...list.map((r) =>
        h(
          "li",
          { class: "mcard" },
          h("a", { class: "mcard__img", href: r.url, target: "_blank", rel: "noopener", title: "Open full size" }, h("img", { src: r.url, alt: r.alt || "", loading: "lazy", decoding: "async" })),
          h("div", { class: "mcard__body" }, h("p", { class: "mcard__name" }, r.name || "Untitled"), h("p", { class: "mcard__meta mono" }, [r.width && r.height ? `${r.width}×${r.height}` : null, bytes(r.size), r.mime.replace("image/", "").toUpperCase(), fmtDate(r.created_at)].filter(Boolean).join(" · "))),
          h(
            "div",
            { class: "mcard__acts" },
            h(
              "button",
              {
                class: "icon-btn",
                type: "button",
                "aria-label": `Copy URL of ${r.name}`,
                title: "Copy URL",
                onclick: async () => {
                  try {
                    await navigator.clipboard.writeText(r.url);
                    toast("URL copied.");
                  } catch {
                    modal("Image URL", h("input", { class: "input", value: r.url, readonly: true, onfocus: (e: FocusEvent) => (e.target as HTMLInputElement).select() }));
                  }
                },
              },
              icon("link")
            ),
            h("button", { class: "icon-btn", type: "button", "aria-label": `Rename ${r.name}`, title: "Rename / alt text", onclick: () => edit(r) }, icon("edit")),
            h("button", { class: "icon-btn", type: "button", "aria-label": `Delete ${r.name}`, title: "Delete", onclick: () => remove(r) }, icon("trash"))
          )
        )
      )
    );
  };

  const edit = (r: MediaRow) => {
    const name = input(r.name, { max: 160 });
    const alt = input(r.alt, { max: 300, placeholder: "Describe the image for screen readers" });
    const save = btn("Save", { kind: "primary" });
    const cancel = btn("Cancel");
    const m = modal("Edit image details", h("div", { class: "stack" }, h("img", { class: "medit__img", src: r.url, alt: "" }), field("Name", name, { hint: "Only changes the label in the library — the file URL stays the same, so nothing breaks." }), field("Default alt text", alt)), { actions: [cancel, save] });
    cancel.addEventListener("click", () => m.close());
    save.addEventListener("click", () =>
      busy(save, async () => {
        try {
          const [row] = await db.update<MediaRow>("media", `id=eq.${r.id}`, { name: name.value.trim(), alt: alt.value.trim() });
          Object.assign(r, row);
          toast("Image details saved.");
          m.close();
          draw();
        } catch (err) {
          toastError(err);
        }
      })
    );
  };

  const remove = async (r: MediaRow) => {
    let used: string[] = [];
    try {
      used = await usage(r.url);
    } catch {
      /* usage check is best-effort */
    }
    const ok = await confirmDialog({
      title: `Delete “${r.name || "image"}”?`,
      message: used.length
        ? h("div", null, h("p", null, "This image is still used by:"), h("ul", { class: "bul" }, used.map((u) => h("li", null, u))), h("p", null, "Those places will show no image until you choose another one."))
        : "The file will be deleted from storage permanently.",
      confirm: "Delete image",
      danger: true,
    });
    if (!ok) return;
    try {
      await storage.remove([r.path, ...(r.variant_path ? [r.variant_path] : [])]);
      await db.remove("media", `id=eq.${r.id}`);
      rows = rows.filter((x) => x.id !== r.id);
      toast("Image deleted.");
      draw();
    } catch (err) {
      toastError(err);
    }
  };

  const add = async (files: File[]) => {
    if (!files.length) return;
    const ok = files.filter((f) => ALLOWED.includes(f.type));
    if (ok.length < files.length) toast(`${files.length - ok.length} file(s) skipped — only JPG, PNG, WebP or AVIF images.`, "error");
    up.disabled = true;
    drop.classList.add("is-busy");
    await uploadMany(ok, (row) => {
      rows.unshift(row);
      draw();
    });
    up.disabled = false;
    drop.classList.remove("is-busy");
  };
  up.addEventListener("click", async () => add(await chooseFiles(true)));
  drop.addEventListener("click", async () => add(await chooseFiles(true)));
  drop.addEventListener("keydown", async (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), add(await chooseFiles(true))));
  drop.addEventListener("dragover", (e) => (e.preventDefault(), drop.classList.add("is-over")));
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("is-over");
    add(Array.from(e.dataTransfer?.files ?? []));
  });
  search.addEventListener("input", draw);
  try {
    rows = (await db.select<MediaRow>("media", "select=*&order=created_at.desc&limit=500")).data;
    draw();
  } catch (err) {
    grid.replaceChildren(errorState(err));
  }
  return root;
}
