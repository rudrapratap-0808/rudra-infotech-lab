/** CRM: enquiry inbox (search + filters + pagination) and the enquiry detail page. */
import { normalizePhone, prettyPhone, waLink } from "../../data/model.js";
import { db, likeQ } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { navigate, setQuery, type Ctx } from "../lib/router.js";
import { refreshUnread, state } from "../lib/state.js";
import {
  ago, badge, btn, busy, card, confirmDialog, empty, ENQ_STATUS, errorState, field, fmtDate, input, modal, money, nul, PRIORITY, refNo,
  select, setError, skeleton, SOURCES, textarea, toast, toastError,
} from "../lib/ui.js";
import { pageHead } from "./shell.js";

interface Enquiry {
  id: string;
  ref: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  company: string | null;
  service: string | null;
  budget: string | null;
  message: string;
  source: string;
  page_url: string | null;
  status: string;
  priority: string;
  is_read: boolean;
  archived: boolean;
  next_follow_up: string | null;
  potential_value: number | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}
const PAGE = 25;
const COLS = "id,ref,name,email,phone,company,service,budget,status,priority,is_read,archived,next_follow_up,potential_value,source,created_at";

async function formOptions(): Promise<{ services: string[]; budgets: string[]; cc: string }> {
  const { data } = await db.select("site_settings", "select=key,value&key=in.(form,contact)");
  const form = data.find((r: any) => r.key === "form")?.value ?? {};
  const contact = data.find((r: any) => r.key === "contact")?.value ?? {};
  return { services: form.services ?? [], budgets: form.budgets ?? [], cc: String(contact.default_country_code ?? "91") };
}

/* ── Inbox ────────────────────────────────────────────────── */
export async function enquiriesView(ctx: Ctx): Promise<HTMLElement> {
  const q = new URLSearchParams(ctx.query);
  const root = h("div", { class: "page" });
  const opts = await formOptions().catch(() => ({ services: [], budgets: [], cc: "91" }));

  const search = input(q.get("q") ?? "", { type: "search", placeholder: "Search name, email, phone or company" });
  search.setAttribute("aria-label", "Search enquiries");
  const status = select(q.get("status") ?? "", [["", "All active"], ...Object.entries(ENQ_STATUS).map(([k, v]) => [k, v.label] as [string, string]), ["archived", "ARCHIVED"]]);
  status.setAttribute("aria-label", "Status");
  const service = select(q.get("service") ?? "", [["", "All services"], ...opts.services]);
  service.setAttribute("aria-label", "Service");
  const budget = select(q.get("budget") ?? "", [["", "All budgets"], ...opts.budgets]);
  budget.setAttribute("aria-label", "Budget");
  const from = input(q.get("from") ?? "", { type: "date" });
  from.setAttribute("aria-label", "Received from");
  const to = input(q.get("to") ?? "", { type: "date" });
  to.setAttribute("aria-label", "Received until");
  const unread = h("input", { type: "checkbox", checked: q.get("unread") === "1" });
  const due = h("input", { type: "checkbox", checked: q.get("due") === "1" });
  let page = Math.max(1, Number(q.get("page")) || 1);

  const list = h("div", { class: "tablewrap" }, skeleton(8));
  const pager = h("div", { class: "pager" });
  root.append(
    pageHead("Client Queries", "Every brief from the website, newest first.", btn("Add enquiry", { icon: "plus", onclick: () => addEnquiry(opts) })),
    h(
      "div",
      { class: "filters card" },
      h("div", { class: "filters__q" }, icon("search"), search),
      status,
      service,
      budget,
      h("label", { class: "filters__date" }, h("span", { class: "mono" }, "From"), from),
      h("label", { class: "filters__date" }, h("span", { class: "mono" }, "To"), to),
      h("label", { class: "check" }, unread, "Unread only"),
      h("label", { class: "check" }, due, "Follow-up due"),
      btn("Reset", { kind: "ghost", small: true, onclick: () => navigate("/admin/enquiries/") })
    ),
    list,
    pager
  );

  const load = async () => {
    const p = new URLSearchParams();
    const params: string[] = [`select=${COLS}`, "order=created_at.desc", `limit=${PAGE}`, `offset=${(page - 1) * PAGE}`];
    const term = search.value.trim();
    if (term) {
      const lq = likeQ(term);
      params.push(`or=(name.ilike.${lq},email.ilike.${lq},phone.ilike.${lq},company.ilike.${lq})`);
      p.set("q", term);
    }
    if (status.value === "archived") params.push("archived=is.true");
    else {
      params.push("archived=is.false");
      if (status.value) params.push(`status=eq.${status.value}`);
      else params.push("status=neq.spam");
    }
    if (status.value) p.set("status", status.value);
    if (service.value) (params.push(`service=eq.${encodeURIComponent(service.value)}`), p.set("service", service.value));
    if (budget.value) (params.push(`budget=eq.${encodeURIComponent(budget.value)}`), p.set("budget", budget.value));
    if (from.value) (params.push(`created_at=gte.${from.value}`), p.set("from", from.value));
    if (to.value) {
      const end = new Date(`${to.value}T00:00:00`);
      end.setDate(end.getDate() + 1);
      params.push(`created_at=lt.${end.toISOString().slice(0, 10)}`);
      p.set("to", to.value);
    }
    if (unread.checked) (params.push("is_read=is.false"), p.set("unread", "1"));
    if (due.checked) (params.push(`next_follow_up=lte.${new Date().toISOString().slice(0, 10)}`, "status=not.in.(converted,closed,spam)"), p.set("due", "1"));
    if (page > 1) p.set("page", String(page));
    setQuery(p);
    try {
      const { data, count } = await db.select<Enquiry>("enquiries", params.join("&"), true);
      const total = count ?? data.length;
      list.replaceChildren(
        data.length
          ? h(
              "table",
              { class: "table table--click" },
              h("thead", null, h("tr", null, ["", "Ref", "Client", "Service", "Budget", "Status", "Priority", "Follow-up", "Received"].map((c) => h("th", { scope: "col" }, c)))),
              h(
                "tbody",
                null,
                data.map((e) =>
                  h(
                    "tr",
                    { class: e.is_read ? "" : "is-unread", tabindex: "0", onclick: () => navigate(`/admin/enquiries/${e.id}/`), onkeydown: (ev: KeyboardEvent) => ev.key === "Enter" && navigate(`/admin/enquiries/${e.id}/`) },
                    h("td", { class: "td-dot" }, e.is_read ? null : h("span", { class: "dot", title: "Unread" }, h("span", { class: "sr-only" }, "Unread"))),
                    h("td", { class: "mono" }, refNo(e.ref)),
                    h("td", null, h("a", { class: "td-main", href: `/admin/enquiries/${e.id}/` }, e.name), h("small", { class: "td-sub" }, [e.company, e.email].filter(Boolean).join(" · "))),
                    h("td", null, e.service ?? "—"),
                    h("td", null, e.budget ?? "—"),
                    h("td", null, badge(ENQ_STATUS[e.status]?.label ?? e.status, ENQ_STATUS[e.status]?.tone)),
                    h("td", null, badge(PRIORITY[e.priority]?.label ?? e.priority, PRIORITY[e.priority]?.tone)),
                    h("td", { class: e.next_follow_up && e.next_follow_up <= new Date().toISOString().slice(0, 10) ? "is-due" : "" }, e.next_follow_up ? fmtDate(e.next_follow_up) : "—"),
                    h("td", { class: "mono", title: fmtDate(e.created_at, true) }, ago(e.created_at))
                  )
                )
              )
            )
          : empty(term || status.value || service.value || budget.value || unread.checked || due.checked || from.value || to.value ? "No enquiries match" : "No enquiries yet", "Briefs from the website's contact form land here — new ones are marked NEW and unread.")
      );
      const pages = Math.max(1, Math.ceil(total / PAGE));
      pager.replaceChildren(
        h("span", { class: "muted" }, `${total} ${total === 1 ? "enquiry" : "enquiries"}`),
        ...(pages > 1
          ? [
              h(
                "div",
                { class: "row" },
                btn("Previous", { small: true, disabled: page <= 1, onclick: () => ((page -= 1), load()) }),
                h("span", { class: "mono" }, `${page} / ${pages}`),
                btn("Next", { small: true, disabled: page >= pages, onclick: () => ((page += 1), load()) })
              ),
            ]
          : [])
      );
    } catch (err) {
      list.replaceChildren(errorState(err, load));
    }
  };
  let deb = 0;
  search.addEventListener("input", () => {
    clearTimeout(deb);
    deb = window.setTimeout(() => ((page = 1), load()), 300);
  });
  for (const c of [status, service, budget, from, to, unread, due]) c.addEventListener("change", () => ((page = 1), load()));
  load();
  return root;
}

function addEnquiry(opts: { services: string[]; budgets: string[]; cc: string }) {
  const name = input("", { max: 80, required: true });
  const email = input("", { type: "email", max: 120, required: true });
  const phone = input("", { type: "tel", max: 24 });
  const company = input("", { max: 100 });
  const service = select("", [["", "—"], ...opts.services]);
  const budget = select("", [["", "—"], ...opts.budgets]);
  const source = select("whatsapp", SOURCES.filter((s) => s !== "website").map((s) => [s, s[0].toUpperCase() + s.slice(1)] as [string, string]));
  const message = textarea("", { rows: 5, max: 2000, required: true });
  const save = btn("Add enquiry", { kind: "primary" });
  const cancel = btn("Cancel");
  const m = modal(
    "Add an enquiry",
    h(
      "div",
      { class: "grid2" },
      field("Name", name, { required: true }),
      field("Email", email, { required: true }),
      field("Phone / WhatsApp", phone),
      field("Company", company),
      field("Service", service),
      field("Budget", budget),
      field("Lead source", source),
      h("div", { class: "span2" }, field("Project details", message, { required: true, hint: "At least 20 characters." }))
    ),
    { wide: true, actions: [cancel, save] }
  );
  cancel.addEventListener("click", () => m.close());
  save.addEventListener("click", () =>
    busy(save, async () => {
      setError(name, name.value.trim().length >= 2 ? null : "Enter the client's name.");
      setError(email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? null : "Enter a valid email.");
      setError(message, message.value.trim().length >= 20 ? null : "Add at least 20 characters.");
      if (name.value.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) || message.value.trim().length < 20) return;
      try {
        const row = await db.insert<Enquiry>("enquiries", {
          name: name.value.trim(),
          email: email.value.trim().toLowerCase(),
          phone: nul(phone.value),
          whatsapp: normalizePhone(phone.value, opts.cc) || null,
          company: nul(company.value),
          service: nul(service.value),
          budget: nul(budget.value),
          source: source.value,
          message: message.value.trim(),
          is_read: true,
        });
        m.close();
        toast("Enquiry added.");
        navigate(`/admin/enquiries/${row.id}/`);
      } catch (err) {
        toastError(err);
      }
    })
  );
}

/* ── Detail ───────────────────────────────────────────────── */
export async function enquiryView(ctx: Ctx): Promise<HTMLElement> {
  const root = h("div", { class: "page" });
  let e: Enquiry | null;
  try {
    e = await db.one<Enquiry>("enquiries", `select=*&id=eq.${encodeURIComponent(ctx.params.id)}`);
  } catch (err) {
    return h("div", { class: "page" }, errorState(err, () => navigate(ctx.path, { force: true, replace: true })));
  }
  if (!e) return h("div", { class: "page" }, empty("Enquiry not found", "It may have been deleted.", h("a", { class: "btn", href: "/admin/enquiries/" }, "Back to enquiries")));
  const opts = await formOptions().catch(() => ({ services: [], budgets: [], cc: "91" }));
  if (!e.is_read) {
    db.update("enquiries", `id=eq.${e.id}`, { is_read: true }).then(() => refreshUnread()).catch(() => {});
    e.is_read = true;
  }
  const first = e.name.split(" ")[0];
  const wa = e.whatsapp || normalizePhone(e.phone ?? "", opts.cc);
  const waHref = wa ? waLink(wa, `Hi ${first}, thanks for your enquiry with Rudra InfoTech Lab${e.service ? ` about ${e.service}` : ""}. `) : "";
  const mailHref = `mailto:${e.email}?subject=${encodeURIComponent(`Re: your project enquiry ${refNo(e.ref)} — Rudra InfoTech Lab`)}&body=${encodeURIComponent(`Hi ${first},\n\nThanks for getting in touch with Rudra InfoTech Lab.\n\n`)}`;
  const telHref = e.phone ? `tel:${e.phone.replace(/[^\d+]/g, "")}` : "";

  const patch = async (p: Partial<Enquiry>, msg = "Saved.") => {
    try {
      const [row] = await db.update<Enquiry>("enquiries", `id=eq.${e!.id}`, p);
      Object.assign(e!, row);
      toast(msg);
      refreshUnread();
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  };

  const statusSel = select(e.status, Object.entries(ENQ_STATUS).map(([k, v]) => [k, v.label] as [string, string]));
  const prioSel = select(e.priority, Object.entries(PRIORITY).map(([k, v]) => [k, v.label] as [string, string]));
  const sourceSel = select(e.source, SOURCES.map((s) => [s, s[0].toUpperCase() + s.slice(1)] as [string, string]));
  const follow = input(e.next_follow_up ?? "", { type: "date" });
  const value = input(e.potential_value ?? "", { type: "number", min: 0, step: "1", inputmode: "numeric" });
  statusSel.addEventListener("change", () => patch({ status: statusSel.value }, `Status: ${ENQ_STATUS[statusSel.value].label}`).then(() => drawHead()));
  prioSel.addEventListener("change", () => patch({ priority: prioSel.value }, `Priority: ${PRIORITY[prioSel.value].label}`));
  sourceSel.addEventListener("change", () => patch({ source: sourceSel.value }, "Lead source saved."));
  follow.addEventListener("change", () => patch({ next_follow_up: follow.value || null }, follow.value ? `Follow-up set for ${fmtDate(follow.value)}` : "Follow-up cleared."));
  value.addEventListener("change", () => {
    const v = value.value === "" ? null : Math.max(0, Math.round(Number(value.value)));
    if (v !== null && !Number.isFinite(v)) return setError(value, "Enter an amount in rupees.");
    setError(value, null);
    patch({ potential_value: v }, v === null ? "Value cleared." : `Potential value: ${money(v)}`);
  });

  const head = h("div", { class: "ehead" });
  const drawHead = () =>
    head.replaceChildren(
      h("a", { class: "back", href: "/admin/enquiries/" }, icon("back"), "All enquiries"),
      h(
        "div",
        { class: "ehead__row" },
        h("div", null, h("h1", { class: "phead__title" }, e!.name), h("p", { class: "phead__sub" }, [e!.company, refNo(e!.ref), `Received ${fmtDate(e!.created_at, true)}`].filter(Boolean).join(" · "))),
        h("div", { class: "row" }, badge(ENQ_STATUS[e!.status]?.label ?? e!.status, ENQ_STATUS[e!.status]?.tone), e!.archived ? badge("ARCHIVED", "violet") : null)
      ),
      h(
        "div",
        { class: "ehead__acts" },
        wa ? h("a", { class: "btn btn--wa", href: waHref, target: "_blank", rel: "noopener noreferrer" }, icon("whatsapp"), "Open WhatsApp") : h("span", { class: "btn is-disabled", title: "No valid phone number" }, icon("whatsapp"), "Open WhatsApp"),
        h("a", { class: "btn", href: mailHref }, icon("mail"), "Email client"),
        telHref ? h("a", { class: "btn", href: telHref }, icon("phone"), "Call") : h("span", { class: "btn is-disabled", title: "No phone number" }, icon("phone"), "Call")
      )
    );
  drawHead();

  const notesList = h("ul", { class: "notes" }, skeleton(2));
  const noteBox = textarea("", { rows: 3, max: 4000, placeholder: "Private note — only admins can see this." });
  noteBox.setAttribute("aria-label", "New note");
  const addNote = btn("Add note", { kind: "primary", small: true });
  const loadNotes = async () => {
    try {
      const { data } = await db.select("enquiry_notes", `select=*&enquiry_id=eq.${e!.id}&order=created_at.asc`);
      notesList.replaceChildren(
        ...(data.length
          ? data.map((n: any) =>
              h(
                "li",
                { class: "note" },
                h("p", { class: "note__meta mono" }, `${n.author_name || "—"} · ${fmtDate(n.created_at, true)}`),
                h("p", { class: "note__body" }, n.body),
                n.author_id === state.profile?.id || state.profile?.role === "owner"
                  ? h(
                      "button",
                      {
                        class: "linkbtn note__del",
                        type: "button",
                        onclick: async () => {
                          if (!(await confirmDialog({ title: "Delete note?", message: "This note will be removed permanently.", confirm: "Delete", danger: true }))) return;
                          try {
                            await db.remove("enquiry_notes", `id=eq.${n.id}`);
                            toast("Note deleted.");
                            loadNotes();
                          } catch (err) {
                            toastError(err);
                          }
                        },
                      },
                      "Delete"
                    )
                  : null
              )
            )
          : [h("li", { class: "muted" }, "No notes yet.")])
      );
    } catch (err) {
      notesList.replaceChildren(errorState(err, loadNotes));
    }
  };
  addNote.addEventListener("click", () =>
    busy(addNote, async () => {
      const body = noteBox.value.trim();
      if (!body) return setError(noteBox, "Write a note first.");
      setError(noteBox, null);
      try {
        await db.insert("enquiry_notes", { enquiry_id: e!.id, body });
        noteBox.value = "";
        toast("Note added.");
        loadNotes();
      } catch (err) {
        toastError(err);
      }
    })
  );
  loadNotes();

  const detail = (k: string, v: string | HTMLElement | null) => h("div", null, h("dt", null, k), h("dd", null, v ?? "—"));
  root.append(
    head,
    h(
      "div",
      { class: "split" },
      h(
        "div",
        { class: "stack" },
        card("Message", h("p", { class: "message" }, e.message)),
        card(
          "Details",
          h(
            "dl",
            { class: "dl" },
            detail("Email", h("a", { href: `mailto:${e.email}` }, e.email)),
            detail("Phone", e.phone),
            detail("WhatsApp", wa ? prettyPhone(wa) : null),
            detail("Service", e.service),
            detail("Budget", e.budget),
            detail("Sent from", e.page_url ? h("a", { href: e.page_url, target: "_blank", rel: "noopener noreferrer" }, e.page_url.replace(/^https?:\/\/[^/]+/, "") || "/") : null),
            detail("Received", fmtDate(e.created_at, true)),
            detail("Browser", e.user_agent ? h("small", { class: "muted" }, e.user_agent) : null)
          )
        ),
        card("Private notes", notesList, h("div", { class: "stack" }, noteBox, h("div", { class: "row" }, addNote)))
      ),
      h(
        "div",
        { class: "stack" },
        card("Pipeline", field("Status", statusSel), field("Priority", prioSel), field("Next follow-up", follow), field("Potential value (₹)", value), field("Lead source", sourceSel)),
        card(
          "Actions",
          h(
            "div",
            { class: "stack" },
            btn("Mark as unread", { icon: "inbox", onclick: async () => (await patch({ is_read: false }, "Marked as unread.")) && navigate("/admin/enquiries/") }),
            btn(e.archived ? "Unarchive" : "Archive", { icon: "archive", onclick: async () => (await patch({ archived: !e!.archived }, e!.archived ? "Moved to archive." : "Restored to the inbox.")) && drawHead() }),
            e.status !== "spam" ? btn("Mark as spam", { icon: "close", onclick: async () => (await patch({ status: "spam" }, "Marked as spam.")) && navigate("/admin/enquiries/") }) : null,
            btn("Delete enquiry", {
              kind: "danger",
              icon: "trash",
              onclick: async () => {
                if (!(await confirmDialog({ title: "Delete this enquiry?", message: `${e!.name}'s enquiry and its notes will be deleted permanently. Archive it instead if you might need it later.`, confirm: "Delete permanently", danger: true }))) return;
                try {
                  await db.remove("enquiries", `id=eq.${e!.id}`);
                  toast("Enquiry deleted.");
                  refreshUnread();
                  navigate("/admin/enquiries/", { replace: true });
                } catch (err) {
                  toastError(err);
                }
              },
            })
          )
        )
      )
    )
  );
  return root;
}
