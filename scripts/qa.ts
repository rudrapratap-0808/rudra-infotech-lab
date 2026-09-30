/**
 * QA harness (headless Chrome over CDP, no dependencies).
 *   npm run qa                      → .build/qa (screenshots + report.txt)
 *   QA_OUT=dir QA_ONLY=desktop …    → limit viewports
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./paths.js";
import { launch, sleep } from "./cdp.js";
import { startServer } from "./server.js";

type Json = any;
const OUT = process.env.QA_OUT || join(ROOT, ".build/qa");
const ONLY = (process.env.QA_ONLY || "").split(",").filter(Boolean);
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, mobile: false, step: 1.1 },
  { name: "laptop", width: 1366, height: 768, mobile: false, step: 3.2 },
  { name: "tablet", width: 820, height: 1180, mobile: true, step: 2.6 },
  { name: "mobile", width: 390, height: 844, mobile: true, step: 1.2 },
].filter((v) => !ONLY.length || ONLY.includes(v.name));

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.port}`;
  const { page, close } = await launch(9333);
  const issues: string[] = [];
  const log: string[] = [];
  page.on((m) => {
    if (m.method === "Runtime.exceptionThrown") issues.push(`JS exception: ${m.params.exceptionDetails?.exception?.description?.split("\n")[0]}`);
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type))
      issues.push(`console.${m.params.type}: ${m.params.args.map((a: Json) => a.value ?? a.description).join(" ").slice(0, 200)}`);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400 && !m.params.response.url.includes("does-not-exist"))
      issues.push(`HTTP ${m.params.response.status}: ${m.params.response.url}`);
  });
  await page.send("Network.enable");

  const shot = async (file: string) => {
    const r = await page.send("Page.captureScreenshot", { format: "jpeg", quality: 62 });
    await writeFile(join(OUT, file), Buffer.from(r.data, "base64"));
  };
  const load = async (url: string) => {
    await page.send("Page.navigate", { url });
    for (let i = 0; i < 80; i++) {
      await sleep(150);
      try {
        if (await page.eval("!!(window.__ritl && window.__ritl.ready) && document.readyState === 'complete'")) break;
      } catch { /* navigating */ }
    }
    await sleep(600);
  };
  const scrollTo = (y: number) =>
    page.eval(`(() => { const l = window.__ritl && window.__ritl.lenis; if (l) l.scrollTo(${y}, { immediate: true, force: true }); else window.scrollTo(0, ${y}); return scrollY; })()`);

  for (const vp of VIEWPORTS) {
    await page.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    await page.send("Emulation.setTouchEmulationEnabled", { enabled: vp.mobile });
    const t0 = Date.now();
    await load(base + "/");
    log.push(`[${vp.name}] ready after ${Date.now() - t0} ms · stage=${await page.eval("document.documentElement.classList.contains('stage')")}`);
    await shot(`${vp.name}-000.jpg`);
    const H: number = await page.eval("document.documentElement.scrollHeight");
    let n = 1;
    for (let y = vp.height * vp.step; y < H; y += vp.height * vp.step) {
      await scrollTo(Math.round(y));
      await sleep(900);
      await shot(`${vp.name}-${String(n++).padStart(3, "0")}.jpg`);
    }
    const ov = await page.eval(`(() => ({ sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth }))()`);
    if (ov.sw > ov.w) issues.push(`[${vp.name}] horizontal overflow ${ov.sw} > ${ov.w}`);
    log.push(`[${vp.name}] page height ${H}px (${(H / vp.height).toFixed(1)} viewports), ${n} frames`);
  }

  /* Interaction checks (mobile) */
  await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await load(base + "/");
  const menu = await page.eval(`(async () => {
    const t = document.querySelector("[data-menu-toggle]"); t.click();
    await new Promise(r => setTimeout(r, 1100));
    const m = document.querySelector("[data-menu]");
    const open = m.classList.contains("is-open"), focusIn = m.contains(document.activeElement);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise(r => setTimeout(r, 900));
    return { open, focusIn, closed: !m.classList.contains("is-open"), inert: m.hasAttribute("inert") };
  })()`);
  log.push(`menu: ${JSON.stringify(menu)}`);
  if (!menu.open || !menu.focusIn || !menu.closed || !menu.inert) issues.push("menu behaviour incorrect");
  const form = await page.eval(`(async () => {
    const f = document.querySelector("[data-form]");
    f.requestSubmit(); await new Promise(r => setTimeout(r, 300));
    const errors = [...f.querySelectorAll("[data-error-for]")].filter(e => e.textContent).map(e => e.dataset.errorFor);
    const set = (n, v) => { const el = f.querySelector('[name="' + n + '"]'); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
    set("name", "Test Person"); set("email", "test@example.com"); set("details", "We need a fast business website with an enquiry form.");
    f.querySelector('input[name="type"]').click();
    await new Promise(r => setTimeout(r, 3200));
    f.requestSubmit(); await new Promise(r => setTimeout(r, 700));
    return { errors, after: [...f.querySelectorAll("[data-error-for]")].filter(e => e.textContent).length, status: f.querySelector("[data-status]").textContent, success: !document.querySelector("[data-success]").hidden };
  })()`);
  log.push(`form: empty-submit errors=${form.errors.join(",")} · valid submit: errors=${form.after} success=${form.success} status="${form.status}"`);
  if (form.errors.length !== 4) issues.push(`form: expected 4 required errors, got ${form.errors.length}`);
  await scrollTo(await page.eval("document.querySelector('#contact').offsetTop"));
  await sleep(800);
  await shot("mobile-form-state.jpg");

  /* Audits on every page (desktop) */
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  for (const path of ["/", "/privacy/", "/does-not-exist"]) {
    await load(base + path);
    const a = await page.eval(`(async () => {
      const out = [];
      const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
      const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dup.length) out.push("duplicate ids: " + [...new Set(dup)].join(", "));
      document.querySelectorAll("img:not([alt])").forEach(i => out.push("img missing alt: " + i.src));
      const hs = [...document.querySelectorAll("h1,h2,h3,h4")];
      if (hs.filter(h => h.tagName === "H1").length !== 1) out.push("h1 count != 1");
      let prev = 1; for (const h of hs) { const l = +h.tagName[1]; if (l > prev + 1) out.push("heading skip h" + prev + "→h" + l + ": " + h.textContent.trim().slice(0, 30)); prev = l; }
      document.querySelectorAll("a, button").forEach(el => { if (el.closest("[aria-hidden='true']")) return; const n = (el.getAttribute("aria-label") || el.textContent || "").trim(); if (!n) out.push("unnamed control: " + el.outerHTML.slice(0, 90)); });
      document.querySelectorAll("input:not([type=radio]), textarea").forEach(el => { if (!el.closest(".hp") && !document.querySelector('label[for="' + el.id + '"]')) out.push("unlabelled: " + el.name); });
      for (const h of [...new Set([...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")))].filter(h => h.startsWith("/") || h.startsWith("#"))) {
        const u = new URL(h, location.href);
        if (u.hash && u.pathname === location.pathname && u.hash !== "#top" && !document.getElementById(u.hash.slice(1))) out.push("broken anchor " + h);
        if (u.pathname !== location.pathname) { const r = await fetch(u.pathname); if (!r.ok) out.push("broken link " + h); else if (u.hash && u.hash !== "#top" && !(await r.text()).includes('id="' + u.hash.slice(1) + '"')) out.push("broken x-page anchor " + h); }
      }
      return { out, title: document.title, desc: document.querySelector('meta[name=description]')?.content?.length };
    })()`);
    log.push(`[${path}] "${a.title}" (desc ${a.desc} chars)`);
    a.out.forEach((o: string) => issues.push(`[${path}] ${o}`));
    if (path !== "/") await shot(`page${path.replace(/\//g, "_")}.jpg`);
  }

  /* Reduced motion + no JS: everything must be visible, static layouts intact */
  for (const mode of ["reduced", "nojs"]) {
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: mode === "reduced" ? "reduce" : "no-preference" }] });
    await page.send("Emulation.setScriptExecutionDisabled", { value: mode === "nojs" });
    await load(base + "/");
    await sleep(800);
    const r = await page.eval(`(() => {
      const hidden = [...document.querySelectorAll("h1 *, h2, h3, p, .proj__media, .si__name, .st__name")].filter(el => {
        const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
        return b.width > 0 && (cs.visibility === "hidden" || +cs.opacity < 0.05) && !el.closest("[aria-hidden='true'], .sr-only, .pre, [hidden], .wr__body, .menu");
      }).map(el => el.className || el.tagName).slice(0, 6);
      return { cls: document.documentElement.className, hidden, H: document.documentElement.scrollHeight };
    })()`);
    log.push(`${mode}: html.class="${r.cls}" height=${r.H} hidden=${r.hidden.length ? r.hidden.join(" | ") : "none"}`);
    if (r.hidden.length) issues.push(`${mode}: hidden content ${r.hidden.join(" | ")}`);
    await shot(`${mode}-top.jpg`);
    await page.eval("window.scrollTo(0, document.querySelector('#work').offsetTop + innerHeight * 1.2)");
    await sleep(400);
    await shot(`${mode}-work.jpg`);
  }
  await page.send("Emulation.setScriptExecutionDisabled", { value: false });

  close();
  server.close();
  const report = `QA REPORT\n=========\n${log.join("\n")}\n\nISSUES (${issues.length})\n${[...new Set(issues)].map((i) => " • " + i).join("\n") || " none"}\n`;
  await writeFile(join(OUT, "report.txt"), report);
  console.log(report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
