/** Users (roles, invites, removal) and the Activity log. */
import { db, fn } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { can, state } from "../lib/state.js";
import { ago, badge, btn, busy, card, confirmDialog, empty, errorState, field, fmtDate, input, modal, ROLE_TEXT, select, setError, skeleton, toast, toastError } from "../lib/ui.js";
import { pageHead } from "./shell.js";

interface Member {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  confirmed: boolean;
}

export async function usersView(): Promise<HTMLElement> {
  const root = h("div", { class: "page" });
  const table = h("div", { class: "tablewrap" }, skeleton(4));
  const invite = btn("Invite user", { kind: "primary", icon: "plus", onclick: () => inviteDialog(load) });
  root.append(
    pageHead("Users", "Who can sign in to this admin, and what they can do.", invite),
    table,
    card(
      "Roles",
      h(
        "dl",
        { class: "dl" },
        h("div", null, h("dt", null, "Owner"), h("dd", null, "Everything, including managing other owners.")),
        h("div", null, h("dt", null, "Admin"), h("dd", null, "Enquiries, projects, apps, services, content, media, SEO, settings and users — but can't remove or change an owner.")),
        h("div", null, h("dt", null, "Editor"), h("dd", null, "Projects, apps, website content, process, toolkit and media only.")),
        h("div", null, h("dt", null, "Pending / Disabled"), h("dd", null, "Signed in but no access."))
      )
    )
  );
  async function load() {
    try {
      const { users } = await fn<{ users: Member[] }>("admin-users");
      table.replaceChildren(
        users.length
          ? h(
              "table",
              { class: "table" },
              h("thead", null, h("tr", null, ["Person", "Role", "Status", "Last sign-in", ""].map((c) => h("th", { scope: "col" }, c)))),
              h("tbody", null, users.map((u) => row(u)))
            )
          : empty("No users", "Invite your team.")
      );
    } catch (err) {
      table.replaceChildren(errorState(err, load));
    }
  }
  const row = (u: Member) => {
    const self = u.id === state.profile?.id;
    const editable = !self && (can.owner() || u.role !== "owner");
    const roleOpts: [string, string][] = [...(can.owner() ? [["owner", "Owner"] as [string, string]] : []), ["admin", "Admin"], ["editor", "Editor"], ["pending", "Pending"], ["disabled", "Disabled"]];
    const roleSel = select(u.role, editable ? roleOpts : [[u.role, ROLE_TEXT[u.role] ?? u.role]]);
    roleSel.setAttribute("aria-label", `Role for ${u.email}`);
    roleSel.disabled = !editable;
    roleSel.addEventListener("change", async () => {
      const to = roleSel.value;
      if ((to === "owner" || u.role === "owner") && !(await confirmDialog({ title: to === "owner" ? "Make this person an owner?" : "Remove owner role?", message: to === "owner" ? `${u.email} will get full control, including over your account.` : `${u.email} will no longer be an owner.`, confirm: "Change role", danger: true }))) {
        roleSel.value = u.role;
        return;
      }
      try {
        await db.update("profiles", `id=eq.${u.id}`, { role: to });
        u.role = to;
        toast(`${u.email} is now ${ROLE_TEXT[to]}.`);
      } catch (err) {
        roleSel.value = u.role;
        toastError(err);
      }
    });
    const statusText = u.role === "disabled" ? badge("DISABLED", "grey") : u.role === "pending" ? badge("NO ACCESS", "orange") : !u.confirmed && u.invited_at ? badge("INVITED", "blue") : badge("ACTIVE", "green");
    return h(
      "tr",
      null,
      h("td", null, h("span", { class: "td-main" }, u.full_name || u.email, self ? h("span", { class: "muted" }, " (you)") : null), h("small", { class: "td-sub" }, u.email)),
      h("td", null, roleSel),
      h("td", null, statusText),
      h("td", { class: "mono" }, u.last_sign_in_at ? ago(u.last_sign_in_at) : "never"),
      h(
        "td",
        { class: "td-acts" },
        editable
          ? h(
              "div",
              { class: "row" },
              btn("Reset password", {
                small: true,
                kind: "ghost",
                onclick: async (e) =>
                  busy(e.currentTarget as HTMLButtonElement, async () => {
                    try {
                      await fn("admin-users", { body: { action: "reset", user_id: u.id } });
                      toast(`Password reset email sent to ${u.email}.`);
                    } catch (err) {
                      toastError(err);
                    }
                  }),
              }),
              btn("Remove", {
                small: true,
                kind: "ghost",
                icon: "trash",
                onclick: async () => {
                  if (!(await confirmDialog({ title: `Remove ${u.email}?`, message: "Their account is deleted and they lose access immediately. Their past activity stays in the log.", confirm: "Remove user", danger: true }))) return;
                  try {
                    await fn("admin-users", { body: { action: "delete", user_id: u.id } });
                    toast(`${u.email} removed.`);
                    load();
                  } catch (err) {
                    toastError(err);
                  }
                },
              })
            )
          : null
      )
    );
  };
  await load();
  return root;
}

function inviteDialog(onDone: () => void) {
  const email = input("", { type: "email", max: 120, required: true });
  const name = input("", { max: 80 });
  const role = select("editor", [["editor", "Editor — projects, apps, content, media"], ["admin", "Admin — everything except owners"]]);
  const send = btn("Send invite", { kind: "primary" });
  const cancel = btn("Cancel");
  const m = modal("Invite a user", h("div", { class: "stack" }, field("Email", email, { required: true }), field("Name", name), field("Role", role), h("p", { class: "field__hint" }, "They'll get an email with a link to set their password. The link opens /admin/reset/ — add it to Supabase → Authentication → URL Configuration → Redirect URLs.")), { actions: [cancel, send] });
  cancel.addEventListener("click", () => m.close());
  send.addEventListener("click", () =>
    busy(send, async () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) return setError(email, "Enter a valid email address.");
      setError(email, null);
      try {
        await fn("admin-users", { body: { action: "invite", email: email.value.trim(), full_name: name.value.trim(), role: role.value } });
        toast(`Invite sent to ${email.value.trim()}.`);
        m.close();
        onDone();
      } catch (err) {
        toastError(err);
      }
    })
  );
}

/* ── Activity ─────────────────────────────────────────────── */
const TYPES: [string, string][] = [
  ["", "Everything"],
  ["projects", "Projects & apps"],
  ["enquiries", "Enquiries"],
  ["enquiry_notes", "Notes"],
  ["services", "Services"],
  ["content_sections", "Website content"],
  ["process_steps", "Process"],
  ["technologies", "Toolkit"],
  ["media", "Media"],
  ["seo_settings", "SEO"],
  ["site_settings", "Settings"],
  ["profiles", "Users"],
  ["site", "Publishing"],
];

export async function activityView(): Promise<HTMLElement> {
  const root = h("div", { class: "page" });
  const type = select("", TYPES);
  type.setAttribute("aria-label", "Filter by area");
  const who = input("", { type: "search", placeholder: "Filter by person (email)" });
  who.setAttribute("aria-label", "Filter by person");
  const list = h("div", { class: "tablewrap" }, skeleton(8));
  const more = btn("Load more", { small: true });
  root.append(pageHead("Activity", "Who changed what, and when."), h("div", { class: "filters card" }, type, h("div", { class: "filters__q" }, icon("search"), who)), list, h("div", { class: "pager" }, more));
  let offset = 0;
  const PAGE = 50;
  let rows: any[] = [];
  const load = async (reset = true) => {
    if (reset) {
      offset = 0;
      rows = [];
    }
    const f = [`select=*`, "order=id.desc", `limit=${PAGE}`, `offset=${offset}`];
    if (type.value) f.push(`resource_type=eq.${type.value}`);
    if (who.value.trim()) f.push(`actor_email=ilike.${encodeURIComponent(`*${who.value.trim().replace(/[*%]/g, "")}*`)}`);
    try {
      const { data } = await db.select("activity_logs", f.join("&"));
      rows = [...rows, ...data];
      offset += data.length;
      more.hidden = data.length < PAGE;
      list.replaceChildren(
        rows.length
          ? h(
              "table",
              { class: "table" },
              h("thead", null, h("tr", null, ["When", "Who", "Action", "What", "Details"].map((c) => h("th", { scope: "col" }, c)))),
              h(
                "tbody",
                null,
                rows.map((a) =>
                  h(
                    "tr",
                    null,
                    h("td", { class: "mono", title: fmtDate(a.created_at, true) }, ago(a.created_at)),
                    h("td", null, a.actor_email || "system"),
                    h("td", null, badge(a.action.toUpperCase(), a.action === "deleted" ? "red" : a.action === "published" ? "green" : "")),
                    h("td", null, h("span", { class: "td-main" }, a.resource_label ?? "—"), h("small", { class: "td-sub" }, a.resource_type.replace(/_/g, " "))),
                    h("td", { class: "td-sub" }, a.details ? [a.details.from && a.details.to ? `${a.details.from} → ${a.details.to}` : null, a.details.changed ? `changed: ${a.details.changed.join(", ")}` : null, a.details.count ? `${a.details.count} items` : null].filter(Boolean).join(" · ") : "")
                  )
                )
              )
            )
          : empty("No activity yet", "Changes made in the admin are recorded here.")
      );
    } catch (err) {
      list.replaceChildren(errorState(err, () => load()));
    }
  };
  type.addEventListener("change", () => load());
  let deb = 0;
  who.addEventListener("input", () => (clearTimeout(deb), (deb = window.setTimeout(() => load(), 300))));
  more.addEventListener("click", () => busy(more, () => load(false)));
  await load();
  return root;
}
