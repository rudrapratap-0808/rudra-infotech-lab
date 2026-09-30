/** Signed-in user, role capabilities, unread badge and the "publish website" flow. */
import { db, fn, type ApiError } from "./api.js";
import { toast } from "./ui.js";

export type Role = "owner" | "admin" | "editor" | "pending" | "disabled";
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

export const state = {
  profile: null as Profile | null,
  unread: 0,
};

export const can = {
  staff: () => ["owner", "admin", "editor"].includes(state.profile?.role ?? ""),
  admin: () => ["owner", "admin"].includes(state.profile?.role ?? ""),
  owner: () => state.profile?.role === "owner",
};

type Listener = () => void;
const listeners = new Set<Listener>();
export const onState = (fn: Listener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((l) => l());

/* ── Unread enquiries badge ───────────────────────────────── */
let pollTimer = 0;
export async function refreshUnread(): Promise<void> {
  if (!can.admin()) return;
  try {
    state.unread = Number(await db.rpc<number>("unread_enquiries")) || 0;
  } catch {
    /* keep the last value */
  }
  document.title = `${state.unread ? `(${state.unread}) ` : ""}Admin — Rudra InfoTech Lab`;
  emit();
}
export function startPolling(): void {
  clearInterval(pollTimer);
  refreshUnread();
  pollTimer = window.setInterval(() => document.visibilityState === "visible" && refreshUnread(), 60_000);
}
export const stopPolling = () => clearInterval(pollTimer);

/* ── Publish website (rebuild via Vercel deploy hook) ─────── */
const DIRTY = "ritl-admin-dirty";
const AUTO = "ritl-admin-autopublish";
const AUTO_DELAY = 20_000;

export const publish = {
  /** "idle" | "pending" (auto-publish countdown) | "publishing" | "error" */
  status: "idle" as "idle" | "pending" | "publishing" | "error",
  dueAt: 0,
  message: "",
  get dirty() {
    return Boolean(localStorage.getItem(DIRTY));
  },
  get auto() {
    return localStorage.getItem(AUTO) !== "off";
  },
  set auto(v: boolean) {
    localStorage.setItem(AUTO, v ? "on" : "off");
    if (!v) cancelAuto();
    else if (this.dirty) schedule();
    emit();
  },
};
let timer = 0;
const cancelAuto = () => {
  clearTimeout(timer);
  if (publish.status === "pending") publish.status = "idle";
  publish.dueAt = 0;
};
function schedule(delay = AUTO_DELAY) {
  clearTimeout(timer);
  publish.status = "pending";
  publish.dueAt = Date.now() + delay;
  timer = window.setTimeout(() => publishNow(true), delay);
  emit();
}

/** Call after any change that affects the public website. */
export function markChanged(): void {
  localStorage.setItem(DIRTY, new Date().toISOString());
  if (publish.auto) schedule();
  else emit();
}

export async function publishNow(auto = false): Promise<boolean> {
  clearTimeout(timer);
  publish.status = "publishing";
  publish.dueAt = 0;
  emit();
  try {
    await fn("rebuild", { method: "POST", body: {} });
    localStorage.removeItem(DIRTY);
    publish.status = "idle";
    publish.message = "";
    emit();
    toast("Publishing — the website will update in about a minute.", "success");
    return true;
  } catch (err) {
    const e = err as ApiError;
    if (e.status === 429) {
      // Already rebuilding: try again once the window has passed so this change is included.
      schedule(((e.retryAfter || 30) + 2) * 1000);
      if (!auto) toast("A publish is already running — this change will go out right after it.", "info");
      return false;
    }
    publish.status = "error";
    publish.message = e.message;
    emit();
    toast(e.status === 503 ? `${e.message} Your changes are saved; add the deploy hook to publish automatically.` : `Couldn't publish: ${e.message}`, "error");
    return false;
  }
}
export const cancelPublish = () => {
  cancelAuto();
  emit();
};
