/** App frame: dark sidebar (drawer on mobile), top bar with global search + publish status. */
import { auth, CFG, db, likeQ } from "../lib/api.js";
import { $, h, icon } from "../lib/dom.js";
import { navigate } from "../lib/router.js";
import { can, cancelPublish, onState, publish, publishNow, state } from "../lib/state.js";
import { ENQ_STATUS, refNo, ROLE_TEXT } from "../lib/ui.js";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  key: string;
  show: () => boolean;
  badge?: boolean;
}
const NAV: NavItem[] = [
  { href: "/admin/", label: "Overview", icon: "overview", key: "overview", show: can.staff },
  { href: "/admin/enquiries/", label: "Client Queries", icon: "inbox", key: "enquiries", show: can.admin, badge: true },
  { href: "/admin/projects/", label: "Projects", icon: "projects", key: "projects", show: can.staff },
  { href: "/admin/apps/", label: "Apps", icon: "apps", key: "apps", show: can.staff },
  { href: "/admin/services/", label: "Services", icon: "services", key: "services", show: can.admin },
  { href: "/admin/content/", label: "Website Content", icon: "content", key: "content", show: can.staff },
  { href: "/admin/process/", label: "Process", icon: "process", key: "process", show: can.staff },
  { href: "/admin/toolkit/", label: "Toolkit", icon: "toolkit", key: "toolkit", show: can.staff },
  { href: "/admin/media/", label: "Media", icon: "media", key: "media", show: can.staff },
  { href: "/admin/seo/", label: "SEO", icon: "seo", key: "seo", show: can.admin },
  { href: "/admin/contact/", label: "Contact Settings", icon: "contact", key: "contact", show: can.admin },
  { href: "/admin/form-settings/", label: "Form Settings", icon: "form", key: "form", show: can.admin },
  { href: "/admin/users/", label: "Users", icon: "users", key: "users", show: can.admin },
  { href: "/admin/activity/", label: "Activity", icon: "activity", key: "activity", show: can.admin },
  { href: "/admin/settings/", label: "Settings", icon: "settings", key: "settings", show: can.staff },
];

export interface Shell {
  el: HTMLElement;
  main: HTMLElement;
  setActive(key: string, title: string): void;
}

export function shell(): Shell {
  const main = h("main", { class: "main", id: "main", tabindex: "-1" });
  const title = h("p", { class: "top__title" });
  const links = NAV.filter((n) => n.show()).map((n) =>
    h(
      "a",
      { class: "side__link", href: n.href, dataset: { key: n.key } },
      icon(n.icon),
      h("span", { class: "side__text" }, n.label),
      n.badge ? h("span", { class: "side__badge", "data-unread": "", hidden: true }) : null
    )
  );
  const side = h(
    "aside",
    { class: "side", id: "side", "aria-label": "Admin navigation" },
    h("a", { class: "side__brand", href: "/admin/" }, h("span", { class: "side__logo", "aria-hidden": "true" }, "R"), h("span", null, h("b", null, "Rudra"), h("small", null, "Admin panel"))),
    h("nav", { class: "side__nav" }, links),
    h(
      "div",
      { class: "side__foot" },
      h("a", { class: "side__link", href: CFG.siteUrl || "/", target: "_blank", rel: "noopener" }, icon("external"), h("span", { class: "side__text" }, "View Website")),
      h(
        "button",
        {
          class: "side__link",
          type: "button",
          onclick: async () => {
            await auth.signOut();
            navigate("/admin/login/", { replace: true, force: true });
          },
        },
        icon("logout"),
        h("span", { class: "side__text" }, "Logout")
      ),
      h("p", { class: "side__me" }, h("b", null, state.profile?.full_name || state.profile?.email || ""), h("small", null, `${ROLE_TEXT[state.profile?.role ?? ""] ?? ""} · ${state.profile?.email ?? ""}`))
    )
  );

  // Mobile drawer
  const scrim = h("div", { class: "scrim", hidden: true });
  const menuBtn = h("button", { class: "icon-btn top__menu", type: "button", "aria-label": "Open navigation", "aria-controls": "side", "aria-expanded": "false" }, icon("menu"));
  const setDrawer = (open: boolean) => {
    document.body.classList.toggle("drawer-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    scrim.hidden = !open;
    if (open) links[0]?.focus();
  };
  menuBtn.addEventListener("click", () => setDrawer(!document.body.classList.contains("drawer-open")));
  scrim.addEventListener("click", () => setDrawer(false));
  side.addEventListener("click", (e) => (e.target as Element).closest("a") && setDrawer(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && document.body.classList.contains("drawer-open") && setDrawer(false));

  // Publish widget
  const pubBtn = h("button", { class: "btn btn--sm", type: "button" });
  const pubNote = h("span", { class: "pub__note" });
  const pubCancel = h("button", { class: "linkbtn", type: "button", hidden: true, onclick: () => cancelPublish() }, "Cancel");
  const pub = h("div", { class: "pub", role: "status", "aria-live": "polite" }, pubNote, pubCancel, pubBtn);
  pubBtn.addEventListener("click", () => publishNow());
  let tick = 0;
  const drawPub = () => {
    clearInterval(tick);
    const s = publish.status;
    pub.dataset.state = s === "idle" && publish.dirty ? "dirty" : s;
    pubCancel.hidden = s !== "pending";
    pubBtn.disabled = s === "publishing";
    pubBtn.textContent = s === "publishing" ? "Publishing…" : "Publish website";
    pubBtn.className = `btn btn--sm${publish.dirty || s === "error" ? " btn--primary" : ""}`;
    const note = () => {
      if (s === "pending") pubNote.textContent = `Publishing in ${Math.max(0, Math.ceil((publish.dueAt - Date.now()) / 1000))}s`;
      else if (s === "publishing") pubNote.textContent = "Rebuilding the site…";
      else if (s === "error") pubNote.textContent = "Publish failed";
      else pubNote.textContent = publish.dirty ? "Unpublished changes" : "Website up to date";
    };
    note();
    if (s === "pending") tick = window.setInterval(note, 1000);
  };

  // Global search
  const q = h("input", { class: "input top__q", type: "search", placeholder: "Search projects, apps, services, enquiries…  ( / )", "aria-label": "Search the admin", autocomplete: "off" });
  const results = h("div", { class: "search", role: "listbox", hidden: true, id: "search-results" });
  q.setAttribute("aria-controls", "search-results");
  let seq = 0;
  let deb = 0;
  const runSearch = async () => {
    const term = q.value.trim();
    const my = ++seq;
    if (term.length < 2) {
      results.hidden = true;
      return;
    }
    const lq = likeQ(term);
    const jobs: Promise<HTMLElement[]>[] = [
      db.select("projects", `select=id,name,platform,status&or=(name.ilike.${lq},slug.ilike.${lq})&limit=6`).then(({ data }) =>
        data.map((p: any) => row(`/admin/${p.platform === "web" ? "projects" : "apps"}/${p.id}/`, p.name, p.platform === "web" ? "Project" : "App", p.status))
      ),
    ];
    if (can.admin()) {
      jobs.push(db.select("services", `select=id,title&title=ilike.${lq}&limit=4`).then(({ data }) => data.map((s: any) => row(`/admin/services/${s.id}/`, s.title, "Service"))));
      jobs.push(
        db
          .select("enquiries", `select=id,ref,name,company,status&or=(name.ilike.${lq},email.ilike.${lq},company.ilike.${lq},phone.ilike.${lq})&order=created_at.desc&limit=6`)
          .then(({ data }) => data.map((e: any) => row(`/admin/enquiries/${e.id}/`, `${e.name}${e.company ? ` · ${e.company}` : ""}`, `Enquiry ${refNo(e.ref)}`, ENQ_STATUS[e.status]?.label)))
      );
    }
    const groups = await Promise.all(jobs.map((j) => j.catch(() => [] as HTMLElement[])));
    if (my !== seq) return;
    const items = groups.flat();
    results.replaceChildren(...(items.length ? items : [h("p", { class: "search__none" }, `Nothing matches “${term}”.`)]));
    results.hidden = false;
  };
  const row = (href: string, label: string, kind: string, extra?: string) =>
    h("a", { class: "search__item", href, role: "option", onclick: () => ((results.hidden = true), (q.value = "")) }, h("span", { class: "search__kind mono" }, kind), h("span", { class: "search__label" }, label), extra ? h("span", { class: "search__extra mono" }, extra) : null);
  q.addEventListener("input", () => {
    clearTimeout(deb);
    deb = window.setTimeout(runSearch, 220);
  });
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      results.hidden = true;
      q.blur();
    } else if (e.key === "Enter") {
      $<HTMLAnchorElement>(".search__item", results)?.click();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      $<HTMLAnchorElement>(".search__item", results)?.focus();
    }
  });
  results.addEventListener("keydown", (e) => {
    const items = Array.from(results.querySelectorAll<HTMLElement>(".search__item"));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") (e.preventDefault(), items[Math.min(items.length - 1, i + 1)]?.focus());
    if (e.key === "ArrowUp") (e.preventDefault(), i <= 0 ? q.focus() : items[i - 1]?.focus());
    if (e.key === "Escape") ((results.hidden = true), q.focus());
  });
  document.addEventListener("click", (e) => !(e.target as Element).closest(".top__search") && (results.hidden = true));
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !(e.target as Element).closest("input, textarea, select, [contenteditable]")) {
      e.preventDefault();
      q.focus();
    }
  });

  const top = h("header", { class: "top" }, menuBtn, title, h("div", { class: "top__search" }, icon("search", "top__qi"), q, results), pub);
  const el = h("div", { class: "app" }, h("a", { class: "skip", href: "#main" }, "Skip to content"), side, scrim, h("div", { class: "frame" }, top, main));

  const drawUnread = () => {
    const b = $("[data-unread]", side);
    if (!b) return;
    b.textContent = state.unread > 99 ? "99+" : String(state.unread);
    b.hidden = !state.unread;
    b.setAttribute("aria-label", `${state.unread} unread`);
  };
  onState(() => {
    drawUnread();
    drawPub();
  });
  drawUnread();
  drawPub();

  return {
    el,
    main,
    setActive(key: string, t: string) {
      title.textContent = t;
      for (const a of links) {
        const on = a.dataset.key === key;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
    },
  };
}

/** Page header inside the main area. */
export const pageHead = (title: string, sub?: string | null, ...actions: (HTMLElement | null)[]) =>
  h("div", { class: "phead" }, h("div", null, h("h1", { class: "phead__title" }, title), sub ? h("p", { class: "phead__sub" }, sub) : null), h("div", { class: "phead__actions" }, actions));
