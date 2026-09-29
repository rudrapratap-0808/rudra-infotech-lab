/**
 * QA harness — drives headless Chrome over the DevTools Protocol (no dependencies).
 *   npm run qa            → screenshots in .build/qa + audit report
 *   QA_OUT=/some/dir npm run qa
 * Checks: console errors, failed requests, broken internal links/anchors, missing alt,
 * duplicate ids, heading order, unnamed controls, horizontal overflow, mobile menu,
 * form validation, reduced-motion visibility.
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./paths.js";
import { findChrome } from "./chrome.js";
import { startServer } from "./server.js";

const OUT = process.env.QA_OUT || join(ROOT, ".build/qa");
const PORT_CDP = 9333;
const sleep = (ms: number) => new Promise((r) => setTimeout(r as () => void, ms));

type Json = any;
class CDP {
  private id = 0;
  private pending = new Map<number, (v: Json) => void>();
  private handlers: ((m: Json) => void)[] = [];
  constructor(private ws: WebSocket) {
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg.error ? { __error: msg.error } : msg.result);
        this.pending.delete(msg.id);
      } else this.handlers.forEach((h) => h(msg));
    };
  }
  static connect(url: string): Promise<CDP> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new CDP(ws));
      ws.onerror = reject;
    });
  }
  send(method: string, params: Json = {}): Promise<Json> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((r) => this.pending.set(id, r));
  }
  on(fn: (m: Json) => void) {
    this.handlers.push(fn);
  }
  async eval<T = Json>(expr: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
    return r.result?.value as T;
  }
  close() {
    this.ws.close();
  }
}

const viewports = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "laptop", width: 1280, height: 760, mobile: false },
  { name: "tablet", width: 820, height: 1180, mobile: true },
  { name: "mobile", width: 390, height: 844, mobile: true },
];
const sections = ["top", "philosophy", "work", "services", "why", "process", "stack", "about", "cta", "contact", "footer"];

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.port}`;
  const chrome = spawn(await findChrome(), [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT_CDP}`,
    "--user-data-dir=/tmp/ritl-qa-profile",
    "--no-proxy-server",
    "about:blank",
  ]);

  let targets: Json[] = [];
  for (let i = 0; i < 50 && !targets.length; i++) {
    await sleep(200);
    try {
      targets = (await (await fetch(`http://127.0.0.1:${PORT_CDP}/json/list`)).json()).filter((t: Json) => t.type === "page");
    } catch {
      /* not up yet */
    }
  }
  const cdp = await CDP.connect(targets[0].webSocketDebuggerUrl);
  const issues: string[] = [];
  const log: string[] = [];

  cdp.on((m) => {
    if (m.method === "Runtime.exceptionThrown") issues.push(`JS exception: ${m.params.exceptionDetails?.exception?.description?.split("\n")[0]}`);
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type))
      issues.push(`console.${m.params.type}: ${m.params.args.map((a: Json) => a.value ?? a.description).join(" ")}`);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400 && m.params.response.url.startsWith(base))
      issues.push(`HTTP ${m.params.response.status}: ${m.params.response.url}`);
    if (m.method === "Network.loadingFailed" && !/fonts\.(googleapis|gstatic)/.test(m.params.errorText + (m.params.requestId || "")))
      log.push(`request failed (${m.params.errorText}) — ${m.params.type}`);
  });
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Page.enable");

  const shot = async (file: string, full = false) => {
    const params: Json = { format: "jpeg", quality: 70 };
    if (full) {
      const m = await cdp.send("Page.getLayoutMetrics");
      params.captureBeyondViewport = true;
      params.clip = { x: 0, y: 0, width: m.cssContentSize.width, height: Math.min(m.cssContentSize.height, 16000), scale: 1 };
    }
    const r = await cdp.send("Page.captureScreenshot", params);
    await writeFile(join(OUT, file), Buffer.from(r.data, "base64"));
  };
  const load = async (url: string) => {
    await cdp.send("Page.navigate", { url });
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      if ((await cdp.eval("document.readyState")) === "complete") break;
    }
    await sleep(1600);
  };

  /* ── Visual pass per viewport ───────────────────────────── */
  for (const vp of viewports) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: vp.mobile });
    await load(base + "/");
    const vitals = await cdp.eval<Json>(`new Promise(r => {
      let lcp = 0, lcpEl = "", cls = 0;
      new PerformanceObserver(l => l.getEntries().forEach(e => { lcp = e.startTime; lcpEl = e.element ? e.element.tagName.toLowerCase() + "." + [...e.element.classList].join(".") : ""; })).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value; })).observe({ type: "layout-shift", buffered: true });
      const res = performance.getEntriesByType("resource").filter(e => e.name.startsWith(location.origin));
      const nav = performance.getEntriesByType("navigation")[0];
      const kb = (res.reduce((s, e) => s + (e.transferSize || 0), 0) + (nav ? nav.transferSize : 0)) / 1024;
      setTimeout(() => r({ lcp: Math.round(lcp), lcpEl, cls: +cls.toFixed(4), requests: res.length + 1, kb: +kb.toFixed(1) }), 400);
    })`);
    log.push(`[${vp.name}] LCP ${vitals.lcp}ms (${vitals.lcpEl}) · CLS ${vitals.cls} · ${vitals.requests} same-origin requests · ${vitals.kb} KB transferred (uncompressed local server)`);
    if (vitals.cls > 0.1) issues.push(`[${vp.name}] CLS ${vitals.cls} exceeds 0.1`);
    for (const id of sections) {
      const ok = await cdp.eval<boolean>(`(() => {
        const el = document.getElementById(${JSON.stringify(id)}) || document.querySelector(${JSON.stringify(`[data-${id}], .${id}`)});
        if (!el) return false;
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY - (${JSON.stringify(id)} === "top" ? 0 : 20));
        return true;
      })()`);
      if (!ok) continue;
      await sleep(1300);
      await shot(`${vp.name}-${sections.indexOf(id).toString().padStart(2, "0")}-${id}.jpg`);
    }
    const overflow = await cdp.eval<Json>(`(() => {
      const w = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll("body *")].filter(el => {
        const r = el.getBoundingClientRect();
        if (!r.width) return false;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") return false;
        let p = el.parentElement, clipped = false;
        while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === "hidden" || o === "clip" || o === "auto") { clipped = true; break; } p = p.parentElement; }
        return !clipped && (r.right > w + 1 || r.left < -1);
      }).slice(0, 5).map(el => el.tagName.toLowerCase() + "." + [...el.classList].join(".") + " → right " + Math.round(el.getBoundingClientRect().right));
      return { scrollW: document.documentElement.scrollWidth, w, offenders };
    })()`);
    if (overflow.scrollW > overflow.w || overflow.offenders.length)
      issues.push(`[${vp.name}] horizontal overflow: scrollWidth ${overflow.scrollW} > ${overflow.w} ${overflow.offenders.join(", ")}`);
    await cdp.eval("window.scrollTo(0,0)");
    await sleep(400);
  }

  /* ── Mobile menu ────────────────────────────────────────── */
  const menu = await cdp.eval<Json>(`(async () => {
    const t = document.querySelector("[data-menu-toggle]");
    t.click();
    await new Promise(r => setTimeout(r, 1200));
    const open = document.querySelector("[data-menu]").classList.contains("is-open");
    const expanded = t.getAttribute("aria-expanded");
    const focusInMenu = document.querySelector("[data-menu]").contains(document.activeElement);
    return { open, expanded, focusInMenu };
  })()`);
  await shot("mobile-menu-open.jpg");
  const menuClosed = await cdp.eval<Json>(`(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    return { open: document.querySelector("[data-menu]").classList.contains("is-open"), inert: document.querySelector("[data-menu]").hasAttribute("inert"), focus: document.activeElement?.getAttribute("data-menu-toggle") !== null };
  })()`);
  log.push(`menu: open=${menu.open} aria-expanded=${menu.expanded} focusInMenu=${menu.focusInMenu} | after Esc: open=${menuClosed.open} inert=${menuClosed.inert} focusReturned=${menuClosed.focus}`);
  if (!menu.open || menu.expanded !== "true" || !menu.focusInMenu || menuClosed.open || !menuClosed.inert || !menuClosed.focus) issues.push("mobile menu behaviour incorrect");

  /* ── Services tabs keyboard (desktop layout) ────────────── */
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  const tabs = await cdp.eval<Json>(`(async () => {
    const tabs = [...document.querySelectorAll("[data-services] [role='tab']")];
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    const afterDown = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
    const focused = tabs.indexOf(document.activeElement);
    tabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    const afterEnd = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
    const visiblePanels = [...document.querySelectorAll("[data-services] [role='tabpanel']")].filter(p => !p.hidden).length;
    tabs[0].click();
    return { afterDown, focused, afterEnd, visiblePanels, total: tabs.length };
  })()`);
  log.push(`services tabs: ArrowDown→${tabs.afterDown} (focus ${tabs.focused}) End→${tabs.afterEnd}/${tabs.total - 1} visible panels=${tabs.visiblePanels}`);
  if (tabs.afterDown !== 1 || tabs.focused !== 1 || tabs.afterEnd !== tabs.total - 1 || tabs.visiblePanels !== 1) issues.push("services tabs keyboard behaviour incorrect");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(300);

  /* ── Form ───────────────────────────────────────────────── */
  const form = await cdp.eval<Json>(`(async () => {
    const f = document.querySelector("[data-form]");
    f.scrollIntoView();
    f.requestSubmit();
    await new Promise(r => setTimeout(r, 300));
    const errors = [...f.querySelectorAll("[data-error-for]")].filter(e => e.textContent).map(e => e.dataset.errorFor);
    const status = f.querySelector("[data-status]").textContent;
    const focused = document.activeElement?.name || document.activeElement?.id;
    return { errors, status, focused };
  })()`);
  await sleep(600);
  await shot("mobile-form-errors.jpg");
  log.push(`form (empty submit): errors=${form.errors.join(",")} status="${form.status}" focused=${form.focused}`);
  if (form.errors.length !== 4) issues.push(`form: expected 4 required-field errors, got ${form.errors.length}`);

  const sent = await cdp.eval<Json>(`(async () => {
    const f = document.querySelector("[data-form]");
    const set = (n, v) => { const el = f.querySelector('[name="' + n + '"]'); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
    set("name", "Test Person"); set("email", "test@example.com"); set("phone", "+91 90000 00000");
    set("details", "We need a fast business website with an enquiry form.");
    f.querySelector('input[name="type"]').click();
    await new Promise(r => setTimeout(r, 3200)); // pass the min-fill-time trap
    f.requestSubmit();
    await new Promise(r => setTimeout(r, 600));
    return { errors: [...f.querySelectorAll("[data-error-for]")].filter(e => e.textContent).length, status: f.querySelector("[data-status]").textContent, success: !document.querySelector("[data-success]").hidden };
  })()`);
  log.push(`form (valid submit): errors=${sent.errors} success=${sent.success} status="${sent.status}"`);
  await shot("mobile-form-submitted.jpg");

  /* ── Audits on every page ───────────────────────────────── */
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  for (const path of ["/", "/privacy/", "/this-page-does-not-exist"]) {
    await load(base + path);
    const a = await cdp.eval<Json>(`(async () => {
      const out = [];
      const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
      const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dup.length) out.push("duplicate ids: " + [...new Set(dup)].join(", "));
      document.querySelectorAll("img:not([alt])").forEach(i => out.push("img missing alt: " + i.src));
      const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(h => !h.closest("[hidden]") && getComputedStyle(h).display !== "none");
      const h1 = hs.filter(h => h.tagName === "H1").length;
      if (h1 !== 1) out.push("h1 count = " + h1);
      let prev = 1;
      for (const h of hs) { const l = +h.tagName[1]; if (l > prev + 1) out.push("heading skip: h" + prev + " → h" + l + " (" + (h.getAttribute("aria-label") || h.textContent).trim().slice(0, 40) + ")"); prev = l; }
      document.querySelectorAll("a, button").forEach(el => {
        if (el.closest("[aria-hidden='true']")) return;
        const name = (el.getAttribute("aria-label") || el.textContent || "").trim();
        if (!name) out.push("control without accessible name: " + el.outerHTML.slice(0, 80));
      });
      document.querySelectorAll("input:not([type=hidden]):not([type=radio]), textarea, select").forEach(el => {
        if (!el.closest(".hp") && !document.querySelector('label[for="' + el.id + '"]')) out.push("unlabelled field: " + el.name);
      });
      const links = [...new Set([...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")))];
      const internal = links.filter(h => h.startsWith("/") || h.startsWith("#"));
      for (const h of internal) {
        const url = new URL(h, location.href);
        if (url.hash && url.pathname === location.pathname && url.hash !== "#top" && !document.getElementById(url.hash.slice(1))) out.push("broken anchor: " + h);
        if (!url.hash || url.pathname !== location.pathname) {
          const r = await fetch(url.pathname, { method: "GET" });
          if (!r.ok) out.push("broken link: " + h + " (" + r.status + ")");
          if (url.hash && url.pathname === "/") {
            const html = await r.text();
            if (!html.includes('id="' + url.hash.slice(1) + '"')) out.push("broken cross-page anchor: " + h);
          }
        }
      }
      const external = links.filter(h => /^https?:/.test(h));
      const meta = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        og: !!document.querySelector('meta[property="og:image"]'),
        jsonld: document.querySelectorAll('script[type="application/ld+json"]').length,
      };
      return { out, external, meta };
    })()`);
    log.push(`\n[${path}] title="${a.meta.title}" (${a.meta.title.length} chars)\n  description (${a.meta.description?.length} chars): ${a.meta.description}\n  canonical=${a.meta.canonical} og:image=${a.meta.og} json-ld blocks=${a.meta.jsonld}\n  external links: ${a.external.join(", ")}`);
    a.out.forEach((o: string) => issues.push(`[${path}] ${o}`));
  }
  await shot("desktop-404.jpg");
  await load(base + "/privacy/");
  await shot("desktop-privacy.jpg");

  /* ── Reduced motion: everything must be visible without animation ── */
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await load(base + "/");
  const reduced = await cdp.eval<Json>(`(() => {
    const hidden = [...document.querySelectorAll("[data-reveal], [data-intro], .w > span")].filter(el => {
      const cs = getComputedStyle(el); return +cs.opacity < 0.99 || (cs.transform !== "none" && !cs.transform.startsWith("matrix(1, 0, 0, 1, 0, 0)"));
    }).length;
    return { rmClass: document.documentElement.classList.contains("rm"), hidden, marquee: getComputedStyle(document.querySelector(".tech__marquees")).display };
  })()`);
  log.push(`reduced motion: html.rm=${reduced.rmClass} hidden-elements=${reduced.hidden} marquee display=${reduced.marquee}`);
  if (!reduced.rmClass || reduced.hidden) issues.push(`reduced motion: ${reduced.hidden} elements still hidden/transformed`);

  cdp.close();
  chrome.kill("SIGKILL");
  server.close();

  const report = `QA REPORT\n=========\n\n${log.join("\n")}\n\nISSUES (${issues.length})\n${issues.map((i) => " • " + i).join("\n") || " none 🎉"}\n`;
  await writeFile(join(OUT, "report.txt"), report);
  console.log(report);
  console.log(`Screenshots → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
