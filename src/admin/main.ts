/**
 * Rudra InfoTech Lab — admin panel (vanilla TypeScript SPA).
 * Every read and write goes to Supabase with the signed-in user's JWT; row-level
 * security in the database decides what each role may do.
 */
import { auth, configured, db } from "./lib/api.js";
import { h } from "./lib/dom.js";
import { addRoute, match, navigate, onNavigate, rememberPath, startRouter, type Route } from "./lib/router.js";
import { can, startPolling, state, stopPolling, type Profile } from "./lib/state.js";
import { empty, errorState, skeleton } from "./lib/ui.js";
import { forgotView, loginView, noAccessView, resetView } from "./views/auth.js";
import { contentView } from "./views/content.js";
import { dashboardView } from "./views/dashboard.js";
import { enquiriesView, enquiryView } from "./views/enquiries.js";
import { processView, toolkitView } from "./views/lists.js";
import { mediaView } from "./views/media.js";
import { projectEditView, projectsView } from "./views/projects.js";
import { serviceEditView, servicesView } from "./views/services.js";
import { contactView, formSettingsView, seoView, settingsView } from "./views/settings.js";
import { shell, type Shell } from "./views/shell.js";
import { activityView, usersView } from "./views/team.js";

const STAFF: Route["roles"] = ["owner", "admin", "editor"];
const ADMIN: Route["roles"] = ["owner", "admin"];
const routes: Route[] = [
  { pattern: "/admin/login", view: loginView, title: "Sign in", public: true },
  { pattern: "/admin/forgot", view: forgotView, title: "Reset password", public: true },
  { pattern: "/admin/reset", view: resetView, title: "Set password", public: true },
  { pattern: "/admin", view: dashboardView, title: "Overview", roles: STAFF, nav: "overview" },
  { pattern: "/admin/enquiries", view: enquiriesView, title: "Client Queries", roles: ADMIN, nav: "enquiries" },
  { pattern: "/admin/enquiries/:id", view: enquiryView, title: "Enquiry", roles: ADMIN, nav: "enquiries" },
  { pattern: "/admin/projects", view: projectsView("web"), title: "Projects", roles: STAFF, nav: "projects" },
  { pattern: "/admin/projects/new", view: projectEditView("web"), title: "New project", roles: STAFF, nav: "projects" },
  { pattern: "/admin/projects/:id", view: projectEditView("web"), title: "Edit project", roles: STAFF, nav: "projects" },
  { pattern: "/admin/apps", view: projectsView("apps"), title: "Apps", roles: STAFF, nav: "apps" },
  { pattern: "/admin/apps/new", view: projectEditView("apps"), title: "New app", roles: STAFF, nav: "apps" },
  { pattern: "/admin/apps/:id", view: projectEditView("apps"), title: "Edit app", roles: STAFF, nav: "apps" },
  { pattern: "/admin/services", view: servicesView, title: "Services", roles: ADMIN, nav: "services" },
  { pattern: "/admin/services/new", view: serviceEditView, title: "New service", roles: ADMIN, nav: "services" },
  { pattern: "/admin/services/:id", view: serviceEditView, title: "Edit service", roles: ADMIN, nav: "services" },
  { pattern: "/admin/content", view: contentView, title: "Website Content", roles: STAFF, nav: "content" },
  { pattern: "/admin/process", view: processView, title: "Process", roles: STAFF, nav: "process" },
  { pattern: "/admin/toolkit", view: toolkitView, title: "Toolkit", roles: STAFF, nav: "toolkit" },
  { pattern: "/admin/media", view: mediaView, title: "Media", roles: STAFF, nav: "media" },
  { pattern: "/admin/seo", view: seoView, title: "SEO", roles: ADMIN, nav: "seo" },
  { pattern: "/admin/contact", view: contactView, title: "Contact Settings", roles: ADMIN, nav: "contact" },
  { pattern: "/admin/form-settings", view: formSettingsView, title: "Form Settings", roles: ADMIN, nav: "form" },
  { pattern: "/admin/users", view: usersView, title: "Users", roles: ADMIN, nav: "users" },
  { pattern: "/admin/activity", view: activityView, title: "Activity", roles: ADMIN, nav: "activity" },
  { pattern: "/admin/settings", view: settingsView, title: "Settings", roles: STAFF, nav: "settings" },
];
routes.forEach(addRoute);

const app = document.getElementById("app")!;
let frame: Shell | null = null;
let seq = 0;

async function loadProfile(): Promise<Profile | null> {
  const uid = auth.session()?.user.id;
  if (!uid) return null;
  if (state.profile?.id === uid) return state.profile;
  const p = await db.one<Profile>("profiles", `select=id,email,full_name,role&id=eq.${uid}`);
  state.profile = p;
  return p;
}

async function render(path: string, query: URLSearchParams): Promise<void> {
  const my = ++seq;
  rememberPath();
  const m = match(path);
  if (!m) {
    if (!auth.session()) return void navigate("/admin/login/", { replace: true, force: true });
  }
  const route = m?.route;
  if (route?.public) {
    frame = null;
    stopPolling();
    app.className = "";
    document.title = `${route.title} — Admin`;
    const el = await route.view({ params: m!.params, query, path });
    if (my === seq) app.replaceChildren(el);
    return;
  }
  if (!configured() || !auth.session()) {
    const next = path !== "/admin/" ? `?next=${encodeURIComponent(path + (query.toString() ? `?${query}` : ""))}` : "";
    return void navigate(`/admin/login/${next}`, { replace: true, force: true });
  }
  let profile: Profile | null;
  try {
    profile = await loadProfile();
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      await auth.signOut();
      return void navigate("/admin/login/", { replace: true, force: true });
    }
    app.replaceChildren(h("main", { class: "auth" }, errorState(err, () => render(path, query))));
    return;
  }
  if (my !== seq) return;
  if (!profile || !can.staff()) {
    frame = null;
    app.replaceChildren(noAccessView(profile?.role ?? "pending"));
    return;
  }
  if (!frame) {
    frame = shell();
    app.className = "";
    app.replaceChildren(frame.el);
    startPolling();
  }
  const f = frame;
  document.body.classList.remove("drawer-open");
  if (!route) {
    f.setActive("", "Not found");
    f.main.replaceChildren(h("div", { class: "page" }, empty("Page not found", "This admin page doesn't exist.", h("a", { class: "btn", href: "/admin/" }, "Go to overview"))));
    return;
  }
  if (route.roles && !route.roles.includes(profile.role as "owner")) {
    f.setActive(route.nav ?? "", route.title);
    f.main.replaceChildren(h("div", { class: "page" }, empty("No access", "Your role doesn't include this section. Ask an owner or admin if you need it.", h("a", { class: "btn", href: "/admin/" }, "Go to overview"))));
    return;
  }
  f.setActive(route.nav ?? "", route.title);
  document.title = `${state.unread ? `(${state.unread}) ` : ""}${route.title} — Admin`;
  f.main.replaceChildren(h("div", { class: "page" }, skeleton(8)));
  try {
    const el = await route.view({ params: m!.params, query, path });
    if (my !== seq) return;
    f.main.replaceChildren(el);
    f.main.scrollTop = 0;
    window.scrollTo(0, 0);
    f.main.querySelector<HTMLElement>("h1")?.setAttribute("tabindex", "-1");
    if (document.activeElement === document.body || !f.main.contains(document.activeElement)) f.main.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  } catch (err) {
    if (my === seq) f.main.replaceChildren(h("div", { class: "page" }, errorState(err, () => render(path, query))));
  }
}

auth.onChange((s) => {
  if (!s) {
    state.profile = null;
    frame = null;
    stopPolling();
    if (!/^\/admin\/(login|forgot|reset)\//.test(location.pathname)) navigate("/admin/login/", { replace: true, force: true });
  }
});

onNavigate(render);
startRouter();
const start = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
if (start !== location.pathname) history.replaceState(null, "", start + location.search + location.hash);
render(start, new URLSearchParams(location.search));
