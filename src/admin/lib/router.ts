/** History-API router for /admin/* (paths always end with "/", matching Vercel's trailingSlash). */
export interface Ctx {
  params: Record<string, string>;
  query: URLSearchParams;
  path: string;
}
export type View = (ctx: Ctx) => Promise<HTMLElement> | HTMLElement;
export interface Route {
  pattern: string;
  view: View;
  title: string;
  roles?: ("owner" | "admin" | "editor")[];
  nav?: string;
  public?: boolean;
}

const routes: { re: RegExp; keys: string[]; r: Route }[] = [];
export function addRoute(r: Route): void {
  const keys: string[] = [];
  const re = new RegExp(`^${r.pattern.replace(/\/:([a-z_]+)/g, (_, k) => (keys.push(k), "/([^/]+)"))}/?$`);
  routes.push({ re, keys, r });
}

export function match(path: string): { route: Route; params: Record<string, string> } | null {
  for (const { re, keys, r } of routes) {
    const m = re.exec(path);
    if (m) return { route: r, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

/** Views register a guard while they hold unsaved changes. */
let leaveGuard: (() => Promise<boolean>) | null = null;
export const setLeaveGuard = (g: (() => Promise<boolean>) | null) => (leaveGuard = g);

let renderFn: (path: string, query: URLSearchParams) => void = () => {};
export const onNavigate = (fn: typeof renderFn) => (renderFn = fn);

const norm = (p: string) => (p.endsWith("/") ? p : `${p}/`);

export async function navigate(to: string, o: { replace?: boolean; force?: boolean } = {}): Promise<void> {
  const url = new URL(to, location.origin);
  url.pathname = norm(url.pathname);
  if (!o.force && leaveGuard && !(await leaveGuard())) return;
  leaveGuard = null;
  if (o.replace) history.replaceState(null, "", url.pathname + url.search);
  else history.pushState(null, "", url.pathname + url.search);
  renderFn(url.pathname, url.searchParams);
}

/** Updates the query string without re-rendering (list filters). */
export const setQuery = (q: URLSearchParams) => history.replaceState(null, "", `${location.pathname}${q.toString() ? `?${q}` : ""}`);

export function startRouter(): void {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/admin")) return;
    e.preventDefault();
    navigate(url.pathname + url.search);
  });
  addEventListener("popstate", async () => {
    if (leaveGuard && !(await leaveGuard())) {
      history.pushState(null, "", lastPath);
      return;
    }
    leaveGuard = null;
    renderFn(location.pathname, new URLSearchParams(location.search));
  });
  addEventListener("beforeunload", (e) => {
    if (leaveGuard) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
let lastPath = location.pathname;
export const rememberPath = () => (lastPath = location.pathname + location.search);
