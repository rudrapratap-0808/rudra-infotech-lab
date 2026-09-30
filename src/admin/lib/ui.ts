/** UI primitives: toasts, dialogs, skeletons, empty states, form fields, formatting. */
import { $, $$, h, icon, type Child } from "./dom.js";

/* ── Toasts (aria-live, no alert()) ───────────────────────── */
let toastRoot: HTMLElement | null = null;
export function toast(message: string, kind: "success" | "error" | "info" = "success", ms = kind === "error" ? 7000 : 4000): void {
  if (!toastRoot) {
    toastRoot = h("div", { class: "toasts", role: "status", "aria-live": "polite" });
    document.body.append(toastRoot);
  }
  const t = h("div", { class: `toast toast--${kind}` }, icon(kind === "error" ? "close" : kind === "info" ? "activity" : "check"), h("span", null, message));
  const close = h("button", { class: "toast__x", type: "button", "aria-label": "Dismiss", onclick: () => t.remove() }, icon("close"));
  t.append(close);
  toastRoot.append(t);
  setTimeout(() => t.remove(), ms);
}
export const toastError = (err: unknown, prefix = "") => toast(`${prefix}${(err as Error)?.message ?? String(err)}`, "error");

/* ── Modal / confirm ──────────────────────────────────────── */
export interface ModalHandle {
  el: HTMLElement;
  body: HTMLElement;
  close: (v?: unknown) => void;
  done: Promise<unknown>;
}
export function modal(title: string, content: Child, o: { wide?: boolean; actions?: HTMLElement[] } = {}): ModalHandle {
  const prev = document.activeElement as HTMLElement | null;
  let resolve!: (v: unknown) => void;
  const done = new Promise((r) => (resolve = r));
  const body = h("div", { class: "modal__body" }, content);
  const titleId = `m-${Math.random().toString(36).slice(2, 8)}`;
  const dialog = h(
    "div",
    { class: `modal${o.wide ? " modal--wide" : ""}`, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId },
    h("div", { class: "modal__head" }, h("h2", { class: "modal__title", id: titleId }, title), h("button", { class: "icon-btn", type: "button", "aria-label": "Close", onclick: () => close(undefined) }, icon("close"))),
    body,
    o.actions?.length ? h("div", { class: "modal__foot" }, o.actions) : null
  );
  const overlay = h("div", { class: "overlay", onmousedown: (e: MouseEvent) => e.target === overlay && close(undefined) }, dialog);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close(undefined);
    } else if (e.key === "Tab") {
      const f = $$<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])", dialog).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    }
  };
  const close = (v?: unknown) => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    prev?.focus?.();
    resolve(v);
  };
  document.addEventListener("keydown", onKey, true);
  document.body.append(overlay);
  setTimeout(() => ($<HTMLElement>("[autofocus], input, select, textarea, .modal__foot .btn--primary, .modal__foot .btn--danger", dialog) ?? dialog.querySelector<HTMLElement>("button"))?.focus(), 30);
  return { el: dialog, body, close, done };
}

export function confirmDialog(o: { title: string; message: Child; confirm?: string; danger?: boolean }): Promise<boolean> {
  const ok = h("button", { class: `btn ${o.danger ? "btn--danger" : "btn--primary"}`, type: "button" }, o.confirm ?? "Confirm");
  const cancel = h("button", { class: "btn", type: "button" }, "Cancel");
  const m = modal(o.title, h("div", { class: "confirm" }, o.message), { actions: [cancel, ok] });
  ok.addEventListener("click", () => m.close(true));
  cancel.addEventListener("click", () => m.close(false));
  return m.done.then((v) => v === true);
}

export function promptDialog(title: string, label: string, value = "", o: { max?: number; placeholder?: string } = {}): Promise<string | null> {
  const input = h("input", { class: "input", value, maxlength: o.max ?? 120, placeholder: o.placeholder ?? "", autofocus: true });
  const ok = h("button", { class: "btn btn--primary", type: "submit" }, "Save");
  const cancel = h("button", { class: "btn", type: "button" }, "Cancel");
  const form = h("form", { class: "stack" }, h("label", { class: "field" }, h("span", { class: "field__label" }, label), input));
  const m = modal(title, form, { actions: [cancel, ok] });
  const submit = (e?: Event) => {
    e?.preventDefault();
    m.close(input.value.trim());
  };
  form.addEventListener("submit", submit);
  ok.addEventListener("click", submit);
  cancel.addEventListener("click", () => m.close(null));
  return m.done.then((v) => (typeof v === "string" && v ? v : null));
}

/* ── States ───────────────────────────────────────────────── */
export const skeleton = (rows = 5, cls = "") =>
  h("div", { class: `skel ${cls}`, "aria-busy": "true", "aria-label": "Loading" }, Array.from({ length: rows }, (_, i) => h("span", { class: "skel__row", style: { width: `${92 - ((i * 17) % 35)}%` } })));

export const empty = (title: string, text: string, action?: HTMLElement | null) =>
  h("div", { class: "empty" }, h("p", { class: "empty__title" }, title), h("p", { class: "empty__text" }, text), action ?? null);

export const errorState = (err: unknown, retry?: () => void) =>
  h(
    "div",
    { class: "empty empty--error" },
    h("p", { class: "empty__title" }, "Couldn't load this"),
    h("p", { class: "empty__text" }, (err as Error)?.message ?? String(err)),
    retry ? h("button", { class: "btn", type: "button", onclick: retry }, "Try again") : null
  );

/* ── Badges ───────────────────────────────────────────────── */
export const badge = (text: string, tone = "") => h("span", { class: `badge${tone ? ` badge--${tone}` : ""}` }, text);

export const ENQ_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "NEW", tone: "orange" },
  contacted: { label: "CONTACTED", tone: "blue" },
  in_discussion: { label: "IN DISCUSSION", tone: "violet" },
  converted: { label: "CONVERTED", tone: "green" },
  closed: { label: "CLOSED", tone: "grey" },
  spam: { label: "SPAM", tone: "red" },
};
export const PRIORITY: Record<string, { label: string; tone: string }> = {
  low: { label: "LOW", tone: "grey" },
  medium: { label: "MEDIUM", tone: "blue" },
  high: { label: "HIGH", tone: "red" },
};
export const PUB_STATUS: Record<string, { label: string; tone: string }> = {
  published: { label: "PUBLISHED", tone: "green" },
  draft: { label: "DRAFT", tone: "grey" },
  archived: { label: "ARCHIVED", tone: "violet" },
};
export const ROLE_TEXT: Record<string, string> = { owner: "Owner", admin: "Admin", editor: "Editor", pending: "Pending", disabled: "Disabled" };
export const SOURCES = ["website", "whatsapp", "email", "phone", "referral", "instagram", "linkedin", "other"];

/* ── Formatting ───────────────────────────────────────────── */
export const fmtDate = (iso?: string | null, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};
export const ago = (iso?: string | null) => {
  if (!iso) return "—";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(iso);
};
export const money = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const bytes = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const refNo = (ref: number) => `#${String(ref).padStart(4, "0")}`;
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
/** "" → null for optional text columns. */
export const nul = (v: string | null | undefined) => (v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim());

/* ── Form fields ──────────────────────────────────────────── */
let fid = 0;
export interface FieldOpts {
  hint?: string;
  required?: boolean;
  max?: number;
  counter?: boolean;
  type?: string;
  placeholder?: string;
  rows?: number;
  pattern?: string;
  min?: number;
  step?: string;
  inputmode?: string;
  autocomplete?: string;
}
export type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function field(label: string, control: Control | HTMLElement, o: FieldOpts = {}): HTMLElement {
  const id = (control as HTMLElement).id || `f${++fid}`;
  (control as HTMLElement).id = id;
  const hint = o.hint ? h("span", { class: "field__hint", id: `${id}-hint` }, o.hint) : null;
  const err = h("span", { class: "field__err", id: `${id}-err`, "data-err": "" });
  if (hint) (control as HTMLElement).setAttribute("aria-describedby", `${id}-hint ${id}-err`);
  else (control as HTMLElement).setAttribute("aria-describedby", `${id}-err`);
  let counter: HTMLElement | null = null;
  if (o.counter && o.max && "value" in control) {
    counter = h("span", { class: "field__count", "aria-hidden": "true" });
    const upd = () => {
      const n = (control as HTMLInputElement).value.length;
      counter!.textContent = `${n} / ${o.max}`;
      counter!.classList.toggle("is-over", n > o.max!);
    };
    control.addEventListener("input", upd);
    upd();
  }
  return h(
    "div",
    { class: "field" },
    h("label", { class: "field__label", for: id }, label, o.required ? h("span", { class: "field__req", "aria-hidden": "true" }, " *") : null, counter),
    control,
    hint,
    err
  );
}

export const input = (value: string | number | null | undefined, o: FieldOpts = {}) =>
  h("input", {
    class: "input",
    type: o.type ?? "text",
    value: value ?? "",
    maxlength: o.max,
    required: o.required,
    placeholder: o.placeholder,
    pattern: o.pattern,
    min: o.min,
    step: o.step,
    inputmode: o.inputmode,
    autocomplete: o.autocomplete ?? "off",
  });
export const textarea = (value: string | null | undefined, o: FieldOpts = {}) =>
  h("textarea", { class: "input textarea", rows: o.rows ?? 4, maxlength: o.max, required: o.required, placeholder: o.placeholder }, value ?? "");
export const select = (value: string | null | undefined, options: (string | [string, string])[]) => {
  const s = h("select", { class: "input select" });
  for (const opt of options) {
    const [v, l] = Array.isArray(opt) ? opt : [opt, opt];
    s.append(h("option", { value: v, selected: v === (value ?? "") }, l));
  }
  return s;
};
export const toggle = (checked: boolean, label: string) => {
  const cb = h("input", { type: "checkbox", class: "toggle__input", checked });
  return { el: h("label", { class: "toggle" }, cb, h("span", { class: "toggle__ui", "aria-hidden": "true" }), h("span", { class: "toggle__label" }, label)), input: cb };
};

/** Shows a validation message under a field (or clears it). */
export function setError(control: HTMLElement, msg: string | null): void {
  const f = control.closest(".field");
  const err = f?.querySelector<HTMLElement>("[data-err]");
  if (err) err.textContent = msg ?? "";
  if (msg) control.setAttribute("aria-invalid", "true");
  else control.removeAttribute("aria-invalid");
}
export const isUrl = (v: string, https = false) => (https ? /^https:\/\/[^\s"<>]+\.[^\s"<>]+$/ : /^https?:\/\/[^\s"<>]+\.[^\s"<>]+$/).test(v) || (!https && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(v));

/** Section card for forms. */
export const card = (title: string | null, ...children: Child[]) =>
  h("section", { class: "card" }, title ? h("h2", { class: "card__title" }, title) : null, children);

/** Button helper. */
export const btn = (label: Child, o: { kind?: "primary" | "danger" | "ghost" | "" ; icon?: string; onclick?: (e: MouseEvent) => void; type?: string; title?: string; disabled?: boolean; small?: boolean } = {}) =>
  h(
    "button",
    { class: `btn${o.kind ? ` btn--${o.kind}` : ""}${o.small ? " btn--sm" : ""}`, type: o.type ?? "button", onclick: o.onclick, title: o.title, disabled: o.disabled },
    o.icon ? icon(o.icon) : null,
    label
  );

/** Busy state for async button actions (prevents double submits). */
export async function busy<T>(b: HTMLButtonElement, work: () => Promise<T>): Promise<T | undefined> {
  if (b.disabled) return undefined;
  b.disabled = true;
  b.setAttribute("aria-busy", "true");
  b.classList.add("is-busy");
  try {
    return await work();
  } finally {
    b.disabled = false;
    b.removeAttribute("aria-busy");
    b.classList.remove("is-busy");
  }
}
