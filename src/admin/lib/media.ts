/** Media pipeline: validate → convert to WebP (+800w variant) → Storage → media table; image fields + picker. */
import { db, storage } from "./api.js";
import { h, icon } from "./dom.js";
import { btn, bytes, empty, errorState, modal, skeleton, slugify, toast, toastError } from "./ui.js";

export interface MediaRow {
  id: string;
  path: string;
  url: string;
  name: string;
  alt: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  variant_path: string | null;
  created_at: string;
}

export const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_BYTES = 10 * 1024 * 1024;
const MAX_W = 2400;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif";

const rand = () => Math.random().toString(36).slice(2, 8);
const ext = (mime: string) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" })[mime] ?? "bin";

async function decode(file: Blob): Promise<{ draw: CanvasImageSource; width: number; height: number } | null> {
  try {
    const b = await createImageBitmap(file);
    return { draw: b, width: b.width, height: b.height };
  } catch {
    const img = new Image();
    const url = URL.createObjectURL(file);
    try {
      img.src = url;
      await img.decode();
      return { draw: img, width: img.naturalWidth, height: img.naturalHeight };
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function encode(src: CanvasImageSource, w: number, h0: number, width: number, quality: number): Promise<Blob | null> {
  const height = Math.round((h0 / w) * width);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const x = c.getContext("2d")!;
  x.imageSmoothingQuality = "high";
  x.drawImage(src, 0, 0, width, height);
  return new Promise((r) => c.toBlob((b) => r(b && b.type === "image/webp" ? b : null), "image/webp", quality));
}

/** Validates, optimises and uploads one image. Returns the new media row. */
export async function uploadImage(file: File): Promise<MediaRow> {
  if (!ALLOWED.includes(file.type)) throw new Error(`${file.name}: only JPG, PNG, WebP or AVIF images can be uploaded.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is ${bytes(file.size)} — the limit is 10 MB.`);
  const img = await decode(file);
  if (!img) throw new Error(`${file.name} couldn't be read as an image.`);
  let out: Blob = file;
  let mime = file.type;
  let { width, height } = img;
  if (mime === "image/jpeg" || mime === "image/png" || (mime === "image/webp" && width > MAX_W)) {
    const w = Math.min(MAX_W, width);
    const webp = await encode(img.draw, img.width, img.height, w, 0.84);
    if (webp) {
      out = webp;
      mime = "image/webp";
      width = w;
      height = Math.round((img.height / img.width) * w);
    }
  }
  const base = `uploads/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${slugify(file.name.replace(/\.[^.]+$/, "")) || "image"}-${rand()}`;
  const path = `${base}.${ext(mime)}`;
  let variant: string | null = null;
  const uploaded: string[] = [];
  try {
    await storage.upload(path, out, mime);
    uploaded.push(path);
    if (mime === "image/webp" && width > 1000) {
      const small = await encode(img.draw, img.width, img.height, 800, 0.8);
      if (small) {
        variant = `${base}-800w.webp`;
        await storage.upload(variant, small, "image/webp");
        uploaded.push(variant);
      }
    }
    return await db.insert<MediaRow>("media", {
      path,
      url: storage.publicUrl(path),
      name: file.name.replace(/\.[^.]+$/, "").slice(0, 160),
      alt: "",
      mime,
      size: out.size,
      width,
      height,
      variant_path: variant,
    });
  } catch (err) {
    await storage.remove(uploaded).catch(() => {});
    throw err;
  }
}

/** Opens the OS file dialog. */
export function chooseFiles(multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const inp = h("input", { type: "file", accept: ACCEPT, multiple, style: "position:fixed;left:-9999px" });
    inp.addEventListener("change", () => {
      resolve(Array.from(inp.files ?? []));
      inp.remove();
    });
    document.body.append(inp);
    inp.click();
  });
}

/** Uploads several files with toasts; returns the rows that succeeded. */
export async function uploadMany(files: File[], onEach?: (row: MediaRow) => void): Promise<MediaRow[]> {
  const ok: MediaRow[] = [];
  for (const f of files) {
    try {
      const row = await uploadImage(f);
      ok.push(row);
      onEach?.(row);
    } catch (err) {
      toastError(err);
    }
  }
  if (ok.length) toast(ok.length === 1 ? "Image uploaded." : `${ok.length} images uploaded.`);
  return ok;
}

/* ── Picker ───────────────────────────────────────────────── */
export function pickImages(o: { multiple?: boolean; title?: string } = {}): Promise<{ url: string; alt: string }[]> {
  const chosen = new Map<string, MediaRow>();
  const grid = h("div", { class: "pick__grid" }, skeleton(4));
  const search = h("input", { class: "input", type: "search", placeholder: "Search images…", "aria-label": "Search images" });
  const count = h("span", { class: "muted" }, "");
  const use = btn(o.multiple ? "Add selected" : "Use image", { kind: "primary", disabled: true });
  const upload = btn("Upload new", { icon: "upload" });
  const cancel = btn("Cancel");
  let rows: MediaRow[] = [];
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const list = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.alt.toLowerCase().includes(q));
    grid.replaceChildren(
      ...(list.length
        ? list.map((r) => {
            const on = chosen.has(r.id);
            return h(
              "button",
              {
                type: "button",
                class: `pick__item${on ? " is-on" : ""}`,
                "aria-pressed": String(on),
                title: r.name,
                onclick: () => {
                  if (!o.multiple) chosen.clear();
                  on ? chosen.delete(r.id) : chosen.set(r.id, r);
                  draw();
                },
              },
              h("img", { src: r.url, alt: "", loading: "lazy", decoding: "async" }),
              h("span", { class: "pick__name" }, r.name || "Untitled"),
              on ? icon("check", "pick__tick") : null
            );
          })
        : [empty("No images yet", "Upload an image to get started.")])
    );
    use.disabled = chosen.size === 0;
    count.textContent = chosen.size ? `${chosen.size} selected` : "";
  };
  const load = async () => {
    try {
      rows = (await db.select<MediaRow>("media", "select=*&order=created_at.desc&limit=300")).data;
      draw();
    } catch (err) {
      grid.replaceChildren(errorState(err, load));
    }
  };
  search.addEventListener("input", draw);
  const m = modal(o.title ?? "Media library", h("div", { class: "pick" }, h("div", { class: "pick__bar" }, search, upload, count), grid), { wide: true, actions: [cancel, use] });
  upload.addEventListener("click", async () => {
    const files = await chooseFiles(!!o.multiple);
    const added = await uploadMany(files);
    rows = [...added, ...rows];
    for (const r of added) {
      if (!o.multiple) chosen.clear();
      chosen.set(r.id, r);
    }
    draw();
  });
  cancel.addEventListener("click", () => m.close([]));
  use.addEventListener("click", () => m.close([...chosen.values()].map((r) => ({ url: r.url, alt: r.alt }))));
  load();
  return m.done.then((v) => (Array.isArray(v) ? (v as { url: string; alt: string }[]) : []));
}

/* ── Single image field ───────────────────────────────────── */
export interface ImageField {
  el: HTMLElement;
  get value(): string | null;
  set value(v: string | null);
}
export function imageField(label: string, value: string | null | undefined, o: { hint?: string; onChange?: () => void; tall?: boolean } = {}): ImageField {
  let current: string | null = value || null;
  const preview = h("div", { class: `imgf__preview${o.tall ? " imgf__preview--tall" : ""}` });
  const url = h("p", { class: "imgf__url mono" });
  const remove = btn("Remove", { kind: "ghost", small: true, icon: "trash" });
  const render = () => {
    preview.replaceChildren(current ? h("img", { src: current, alt: "", loading: "lazy" }) : h("span", { class: "imgf__none" }, icon("image"), "No image"));
    url.textContent = current ?? "";
    remove.hidden = !current;
  };
  const set = (v: string | null) => {
    current = v;
    render();
    o.onChange?.();
  };
  const upload = btn("Upload", { small: true, icon: "upload" });
  const lib = btn("Library", { small: true, icon: "media" });
  upload.addEventListener("click", async () => {
    const [f] = await chooseFiles(false);
    if (!f) return;
    upload.disabled = true;
    try {
      const row = await uploadImage(f);
      set(row.url);
      toast("Image uploaded.");
    } catch (err) {
      toastError(err);
    } finally {
      upload.disabled = false;
    }
  });
  lib.addEventListener("click", async () => {
    const [p] = await pickImages({ title: `Choose: ${label}` });
    if (p) set(p.url);
  });
  remove.addEventListener("click", () => set(null));
  render();
  const el = h(
    "div",
    { class: "field imgf" },
    h("span", { class: "field__label" }, label),
    h("div", { class: "imgf__row" }, preview, h("div", { class: "imgf__side" }, h("div", { class: "imgf__btns" }, upload, lib, remove), url, o.hint ? h("span", { class: "field__hint" }, o.hint) : null))
  );
  return {
    el,
    get value() {
      return current;
    },
    set value(v: string | null) {
      current = v;
      render();
    },
  };
}
