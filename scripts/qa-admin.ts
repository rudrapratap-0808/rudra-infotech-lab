/**
 * End-to-end QA for the admin + the database-driven site (headless Chrome over CDP).
 * Runs the real schema/RLS on local Postgres + PostgREST via the Supabase emulator.
 *   PG_BIN=… POSTGREST_BIN=… PGHOST=127.0.0.1 PGPORT=5432 npm run qa:admin
 * Output: .build/qa-admin (screenshots + report.txt)
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./paths.js";
import { launch, sleep } from "./cdp.js";
import { startLocalSupabase } from "./local-supabase.js";
import { runBuild } from "./dev-local.js";
import { startServer } from "./server.js";

type Json = any;
const OUT = join(ROOT, ".build/qa-admin");
const results: string[] = [];
let failed = 0;
const check = (name: string, ok: unknown, detail = "") => {
  if (!ok) failed++;
  results.push(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  console.log(results[results.length - 1]);
};

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const server = await startServer(0);
  const SITE = `http://127.0.0.1:${server.port}`;
  let env: Record<string, string> = {};
  const sb = await startLocalSupabase({ accessTtl: 300, onDeploy: () => runBuild(env) });
  env = { SUPABASE_URL: sb.url, SUPABASE_ANON_KEY: sb.publishableKey, SITE_URL: SITE };
  Object.assign(process.env, { SUPABASE_URL: sb.url, SUPABASE_SERVICE_ROLE_KEY: sb.secretKey, DEPLOY_HOOK_URL: `${sb.url}/_hooks/deploy/local`, SITE_URL: SITE, IP_SALT: "qa" });
  await sb.createUser("owner@example.com", "owner-password-123", "owner", "Olivia Owner");
  await sb.createUser("editor@example.com", "editor-password-123", "editor", "Eddie Editor");
  await runBuild(env);

  const html = async (p: string) => (await fetch(SITE + p)).text();
  check("site builds from Supabase (published projects)", (await html("/")).includes("THE LORD CAFE") && (await fetch(`${SITE}/projects/the-lord-cafe/`)).ok);
  check("robots.txt blocks /admin and /api", /Disallow: \/admin\/[\s\S]*Disallow: \/api\//.test(await html("/robots.txt")));
  check("admin page is noindex and carries the public config only", /noindex/.test(await html("/admin/")) && !(await html("/admin/")).includes(sb.secretKey) && (await html("/admin/")).includes(sb.publishableKey));

  const { page, close } = await launch(9480);
  const problems: string[] = [];
  // Designed responses: wrong password (400), the 404 page used as a canvas, the publish throttle (429).
  const expected = (u: string, s: number) => (s === 400 && u.includes("grant_type=password")) || (s === 404 && u.endsWith("/404")) || (s === 429 && u.endsWith("/api/rebuild"));
  page.on((m: Json) => {
    if (m.method === "Runtime.exceptionThrown") problems.push(`JS exception: ${m.params.exceptionDetails?.exception?.description?.split("\n")[0]}`);
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) problems.push(`console.${m.params.type}: ${m.params.args.map((a: Json) => a.value ?? a.description).join(" ").slice(0, 200)}`);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400 && !expected(m.params.response.url, m.params.response.status)) problems.push(`HTTP ${m.params.response.status}: ${m.params.response.url}`);
  });
  await page.send("Network.enable");
  await page.send("DOM.enable");
  await page.send("Page.setInterceptFileChooserDialog", { enabled: true });
  let pendingFile = "";
  page.on(async (m: Json) => {
    if (m.method === "Page.fileChooserOpened" && pendingFile) await page.send("DOM.setFileInputFiles", { files: [pendingFile], backendNodeId: m.params.backendNodeId });
  });
  const viewport = (w: number, h: number, mobile = false) => page.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  await viewport(1366, 900);
  const shot = async (name: string) => {
    const r = await page.send("Page.captureScreenshot", { format: "jpeg", quality: 60 });
    await writeFile(join(OUT, `${name}.jpg`), Buffer.from(r.data, "base64"));
  };
  const ev = <T = Json>(js: string) => page.eval<T>(js);
  const until = async (js: string, ms = 8000): Promise<boolean> => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      try {
        if (await ev(`!!(${js})`)) return true;
      } catch {
        /* navigating */
      }
      await sleep(120);
    }
    return false;
  };
  const open = async (path: string) => {
    await page.send("Page.navigate", { url: SITE + path });
    await sleep(400);
    await until("document.readyState === 'complete'");
  };
  /** Client-side navigation (keeps the SPA state, like clicking a sidebar link). */
  const go = async (path: string) => {
    await ev(`(() => { const a = document.createElement("a"); a.href = ${JSON.stringify(path)}; document.body.append(a); a.click(); a.remove(); })()`);
    await until(`location.pathname === ${JSON.stringify(path.split("?")[0])} && !document.querySelector(".main .skel")`, 8000);
    await sleep(250);
  };
  const setVal = (sel: string, v: string) =>
    ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
  /** Field control by its visible label text. */
  const byLabel = (label: string) => `(() => { const l = [...document.querySelectorAll("label.field__label")].find((x) => x.textContent.trim().replace(/\\s*\\*$/, "").startsWith(${JSON.stringify(label)})); return l && document.getElementById(l.htmlFor); })()`;
  const fillLabel = (label: string, v: string) =>
    ev(`(() => { const el = ${byLabel(label)}; if (!el) return false; el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
  const click = (sel: string, text = "") =>
    ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.offsetParent !== null && x.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
  const toastSeen = (t: string) => until(`[...document.querySelectorAll(".toast")].some((x) => x.textContent.includes(${JSON.stringify(t)}))`, 8000);
  const signIn = async (email: string, pw: string) => {
    await open("/admin/login/");
    await until("document.querySelector('form input[type=email]')");
    await setVal("form input[type=email]", email);
    await setVal("form input[type=password]", pw);
    await ev(`document.querySelector("form").requestSubmit()`);
    return until(`location.pathname === "/admin/" && document.querySelector(".main h1")`, 10000);
  };
  const signOut = async () => {
    await click(".side__link", "Logout");
    await until(`location.pathname === "/admin/login/"`);
  };

  // A real 1600×1000 PNG for the upload tests (made with canvas, so no binary fixtures in git).
  await open("/404");
  const png: string = await ev(`(() => { const c = document.createElement("canvas"); c.width = 1600; c.height = 1000; const x = c.getContext("2d"); const g = x.createLinearGradient(0, 0, 1600, 1000); g.addColorStop(0, "#ff4b18"); g.addColorStop(1, "#3155ff"); x.fillStyle = g; x.fillRect(0, 0, 1600, 1000); x.fillStyle = "#0c0c0c"; x.font = "bold 160px sans-serif"; x.fillText("QA UPLOAD", 180, 560); return c.toDataURL("image/png").split(",")[1]; })()`);
  const uploadFile = join(OUT, "qa-upload.png");
  await writeFile(uploadFile, Buffer.from(png, "base64"));

  /* ── 1. Auth ─────────────────────────────────────────────── */
  await open("/admin/projects/");
  check("signed-out visit redirects to login (with next=)", await until(`location.pathname === "/admin/login/" && location.search.includes("next=")`));
  await shot("01-login");
  await setVal("form input[type=email]", "owner@example.com");
  await setVal("form input[type=password]", "wrong-password");
  await ev(`document.querySelector("form").requestSubmit()`);
  check("wrong password shows an error", await until(`document.querySelector(".auth__msg")?.textContent.includes("Wrong email or password")`));
  check("owner signs in and lands on the dashboard", await signIn("owner@example.com", "owner-password-123"));
  await ev(`localStorage.setItem("ritl-admin-autopublish", "off")`); // publish explicitly below; auto-publish is tested at the end
  check("dashboard greets the owner + shows stats", await until(`document.querySelector(".main h1")?.textContent.includes("Olivia") && document.querySelectorAll(".stat").length >= 8`));
  await shot("02-dashboard");

  /* ── 2. Public contact form → CRM ────────────────────────── */
  await open("/contact/");
  await until("window.__ritl && window.__ritl.ready");
  await ev(`(() => { const f = document.querySelector("[data-form]"); const set = (n, v) => { const el = f.querySelector('[name="' + n + '"]'); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }; set("name", "Asha Verma"); set("email", "asha@example.com"); set("phone", "98765 43210"); set("company", "Asha Bakes"); set("details", "We want an online store for our bakery with delivery across Delhi."); [...f.querySelectorAll('input[name="service"]')].find((r) => r.value === "E-commerce").click(); [...f.querySelectorAll('input[name="budget"]')][1].click(); })()`);
  await sleep(3300);
  await ev(`document.querySelector("[data-form]").requestSubmit()`);
  check("public form shows success", await until(`!document.querySelector("[data-success]").hidden`, 10000));
  const enq = sb.sql("select status || '|' || is_read || '|' || coalesce(whatsapp,'') || '|' || service from enquiries").trim();
  check("enquiry stored as NEW + unread with WhatsApp normalised", enq === "new|false|919876543210|E-commerce", enq);
  await shot("03-contact-success");

  await open("/admin/");
  check("unread badge shows 1", await until(`document.querySelector("[data-unread]") && !document.querySelector("[data-unread]").hidden && document.querySelector("[data-unread]").textContent === "1"`, 10000));
  await go("/admin/enquiries/");
  check("inbox lists the enquiry as unread", await until(`document.querySelector("tr.is-unread")?.textContent.includes("Asha Verma")`));
  await setVal(".filters__q input", "asha bakes");
  check("search by company works", await until(`document.querySelectorAll("tbody tr").length === 1`));
  await setVal(".filters__q input", "+91 98765");
  check("search by phone works (special characters)", await until(`document.querySelectorAll("tbody tr").length === 1`));
  await setVal(".filters__q input", "");
  await ev(`(() => { const s = document.querySelector('select[aria-label="Status"]'); s.value = "spam"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  check("status filter (SPAM) → empty state", await until(`document.querySelector(".tablewrap .empty")`));
  await ev(`(() => { const s = document.querySelector('select[aria-label="Status"]'); s.value = ""; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await until(`document.querySelector("tbody tr")`);
  await shot("04-inbox");
  await ev(`document.querySelector("tbody tr").click()`);
  check("enquiry detail opens", await until(`location.pathname.startsWith("/admin/enquiries/") && document.querySelector(".ehead h1")?.textContent === "Asha Verma"`));
  await sleep(600);
  check("opening marks it read", sb.sql("select is_read from enquiries").trim() === "t");
  const links: Json = await ev(`(() => { const a = [...document.querySelectorAll(".ehead__acts a")]; return a.map((x) => x.getAttribute("href")); })()`);
  check("WhatsApp / email / call actions", links[0]?.startsWith("https://wa.me/919876543210?text=Hi%20Asha") && links[1]?.startsWith("mailto:asha@example.com") && links[2] === "tel:9876543210", JSON.stringify(links));
  await fillLabel("Status", "in_discussion");
  await toastSeen("IN DISCUSSION");
  await fillLabel("Priority", "high");
  await toastSeen("HIGH");
  const today = new Date().toISOString().slice(0, 10);
  await fillLabel("Next follow-up", today);
  await toastSeen("Follow-up set");
  await fillLabel("Potential value", "50000");
  await toastSeen("Potential value");
  const pipe = sb.sql("select status || '|' || priority || '|' || next_follow_up || '|' || potential_value::int from enquiries").trim();
  check("status, priority, follow-up and value persist", pipe === `in_discussion|high|${today}|50000`, pipe);
  await setVal('textarea[aria-label="New note"]', "Called — wants a quote by Friday.");
  await click(".btn", "Add note");
  check("private note saved with the author", await until(`[...document.querySelectorAll(".note")].some((n) => n.textContent.includes("Olivia Owner") && n.textContent.includes("quote by Friday"))`));
  await shot("05-enquiry");

  /* ── 3. Projects ─────────────────────────────────────────── */
  await go("/admin/projects/new/");
  await until(`document.querySelector(".editor")`);
  await fillLabel("Name", "QA Test Studio");
  const slugVal = await ev<string>(`${byLabel("URL slug")}.value`);
  check("slug is generated from the name", slugVal === "qa-test-studio", slugVal);
  await fillLabel("Short description", "A test project created by the admin QA run.");
  await fillLabel("Project type", "LANDING PAGE");
  await fillLabel("Live website URL", "not-a-url");
  await click(".savebar .btn", "Save");
  check("invalid URL is rejected before saving", await until(`${byLabel("Live website URL")}.getAttribute("aria-invalid") === "true"`) && sb.sql("select count(*) from projects where slug = 'qa-test-studio'").trim() === "0");
  await fillLabel("Live website URL", "https://example.com");
  pendingFile = uploadFile;
  await ev(`[...document.querySelectorAll(".imgf")].find((f) => f.textContent.includes("Featured image")).querySelector("button").click()`);
  check("featured image uploads (converted to WebP)", await until(`[...document.querySelectorAll(".imgf")].find((f) => f.textContent.includes("Featured image")).querySelector(".imgf__url").textContent.includes("/storage/v1/object/public/media/uploads/")`, 15000));
  pendingFile = "";
  await click(".savebar .btn", "Save & publish");
  check("new project saved & published", await until(`/^\\/admin\\/projects\\/[0-9a-f-]{36}\\/$/.test(location.pathname)`, 10000));
  const proj = sb.sql("select status || '|' || featured_image || '|' || project_type from projects where slug = 'qa-test-studio'").trim();
  check("project row + image URL in the database", /^published\|http:\/\/127\.0\.0\.1:\d+\/storage\/v1\/object\/public\/media\/uploads\/.+\.webp\|LANDING PAGE$/.test(proj), proj);
  const media = sb.sql("select mime || '|' || width || 'x' || height || '|' || (variant_path is not null) from media").trim();
  check("media row: WebP, real size, 800w variant", media === "image/webp|1600x1000|true", media);
  await shot("06-project-editor");
  await go("/admin/projects/");
  await until(`document.querySelectorAll(".plist__row").length === 6`);
  const order = () => sb.sql("select string_agg(slug, ',' order by display_order) from projects where platform = 'web'").trim().split(",");
  const before = order();
  await ev(`[...document.querySelectorAll(".plist__row")].find((r) => r.textContent.includes("QA Test Studio")).querySelector('button[aria-label^="Move QA Test Studio up"]').click()`);
  await toastSeen("Order saved");
  const after = order();
  check("reorder with arrows persists", before.indexOf("qa-test-studio") === 5 && after.indexOf("qa-test-studio") === 4 && after[5] === "rahulconstructionwork-site", after.join(" "));
  const apps = sb.sql("select min(display_order) > (select max(display_order) from projects where platform = 'web') from projects where platform <> 'web'").trim();
  check("global order keeps websites before apps", apps === "t");
  await ev(`[...document.querySelectorAll(".plist__row")].find((r) => r.textContent.includes("QA Test Studio")).querySelector(".star").click()`);
  await toastSeen("is featured");
  check("featured toggle persists", sb.sql("select featured from projects where slug = 'qa-test-studio'").trim() === "t");
  await shot("07-projects");
  await ev(`[...document.querySelectorAll(".plist__row")].find((r) => r.textContent.includes("RojgarLelo")).querySelector(".menuwrap button").click()`);
  await click(".menu__item", "Duplicate");
  check("duplicate creates a draft copy", await until(`document.querySelector(".main h1")?.textContent.includes("(copy)")`, 8000) && sb.sql("select status from projects where slug = 'rojgarlelo-site-copy'").trim() === "draft");
  await go("/admin/projects/");
  await until(`document.querySelectorAll(".plist__row").length === 7`);
  await ev(`[...document.querySelectorAll(".plist__row")].find((r) => r.textContent.includes("(copy)")).querySelector(".menuwrap button").click()`);
  await click(".menu__item", "Delete");
  await until(`document.querySelector(".modal")`);
  await click(".modal .btn--danger", "Delete permanently");
  await toastSeen("deleted");
  check("delete with confirmation", sb.sql("select count(*) from projects where slug = 'rojgarlelo-site-copy'").trim() === "0");

  /* ── 4. Content, settings, SEO, media ─────────────────────── */
  await go("/admin/content/");
  await until(`document.getElementById("c-hero")`);
  await ev(`(() => { const sec = document.getElementById("c-hero"); const l = [...sec.querySelectorAll("label.field__label")].find((x) => x.textContent.startsWith("Main statement")); const el = document.getElementById(l.htmlFor); el.value = "We build websites and apps that make businesses impossible to ignore."; el.dispatchEvent(new Event("input", { bubbles: true })); sec.querySelector(".btn--primary").click(); })()`);
  await toastSeen("Home hero saved");
  check("hero text saved", sb.sql("select data->>'heading' from content_sections where key = 'hero'").trim().startsWith("We build websites and apps"));
  await go("/admin/contact/");
  await until(`document.querySelector('input[name="availability"]')`);
  await ev(`document.querySelector('input[name="availability"][value="limited"]').click()`);
  await fillLabel("Default WhatsApp message", "Hi Rudra InfoTech Lab, I’m interested in discussing a website/app project.");
  await click(".savebar .btn", "Save contact settings");
  await toastSeen("Contact settings saved");
  check("availability saved", sb.sql("select value->>'availability' || '|' || (value->>'whatsapp') from site_settings where key = 'contact'").trim() === "limited|351930656040");
  await go("/admin/form-settings/");
  await until(`document.querySelector(".listed")`);
  await ev(`(() => { const card = [...document.querySelectorAll(".card")].find((c) => c.textContent.includes("Budget ranges")); [...card.querySelectorAll("button")].find((b) => b.textContent.includes("Add option")).click(); })()`);
  await ev(`(() => { const card = [...document.querySelectorAll(".card")].find((c) => c.textContent.includes("Budget ranges")); const ins = card.querySelectorAll("input"); const el = ins[ins.length - 1]; el.value = "₹5L +"; el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await click(".savebar .btn", "Save form settings");
  await toastSeen("Form settings saved");
  check("budget option added", sb.sql("select value->'budgets' ? '₹5L +' from site_settings where key = 'form'").trim() === "t");
  await go("/admin/seo/");
  await until(`document.querySelector(".serp")`);
  await fillLabel("Site title", "Rudra InfoTech Lab — Websites & Android Apps");
  await click(".savebar .btn", "Save SEO settings");
  await toastSeen("SEO settings saved");
  check("SEO title saved", sb.sql("select site_title from seo_settings").trim() === "Rudra InfoTech Lab — Websites & Android Apps");
  await go("/admin/media/");
  check("media library lists the upload", await until(`document.querySelectorAll(".mcard").length === 1`));
  await ev(`document.querySelector('.mcard button[title="Rename / alt text"]').click()`);
  await until(`document.querySelector(".modal")`);
  await ev(`(() => { const ins = document.querySelectorAll(".modal input"); ins[0].value = "QA hero image"; ins[1].value = "Orange to blue gradient with QA UPLOAD text"; })()`);
  await click(".modal .btn--primary", "Save");
  await toastSeen("Image details saved");
  check("rename + alt text saved", sb.sql("select name from media").trim() === "QA hero image");
  await shot("08-media");

  /* ── 5. Publish → rebuild → live site ─────────────────────── */
  await click(".pub .btn", "Publish website");
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && !sb.deploys.some((d) => d.state === "READY" || d.state === "ERROR")) await sleep(250);
  const dep = sb.deploys[sb.deploys.length - 1];
  check("publish calls the deploy hook and the site rebuilds", dep?.state === "READY", `${dep?.state ?? "none"} ${dep?.error ?? ""}`);
  const home = await html("/");
  check("live home: new hero text", home.includes("We build websites and apps that make businesses impossible to ignore."));
  check("live home: availability → Limited availability", home.includes("Limited availability"));
  check("live home: new SEO title", home.includes("<title>Rudra InfoTech Lab — Websites &amp; Android Apps</title>"));
  const qa = await fetch(`${SITE}/projects/qa-test-studio/`);
  const qaHtml = await qa.text();
  check("new project page is live with the uploaded image (+800w srcset)", qa.ok && /uploads\/[^"]+\.webp/.test(qaHtml) && /-800w\.webp 800w/.test(qaHtml));
  check("sitemap lists the new project", (await html("/sitemap.xml")).includes("/projects/qa-test-studio/"));
  check("contact form shows the new budget", (await html("/contact/")).includes("₹5L +"));

  /* ── 6. Team: invite → accept → editor permissions ────────── */
  await go("/admin/users/");
  await until(`document.querySelector("table")`);
  await click(".btn", "Invite user");
  await until(`document.querySelector(".modal")`);
  await ev(`(() => { const [email, name] = document.querySelectorAll(".modal input"); email.value = "nia@example.com"; name.value = "Nia New"; })()`);
  await click(".modal .btn--primary", "Send invite");
  await toastSeen("Invite sent");
  const invite = sb.outbox.find((m) => m.type === "invite");
  check("invite email sent with the admin reset link", !!invite && invite.link.includes(encodeURIComponent(`${SITE}/admin/reset/`)));
  await shot("09-users");
  await go("/admin/activity/");
  check("activity log shows publish / status / invite", await until(`["published", "STATUS CHANGED", "INVITED"].every((t) => document.querySelector("table")?.innerText.toUpperCase().includes(t.toUpperCase()))`));
  await shot("10-activity");
  await signOut();
  await page.send("Page.navigate", { url: invite!.link });
  check("invite link opens 'Accept your invite'", await until(`location.pathname === "/admin/reset/" && document.querySelector(".auth__title")?.textContent.includes("Accept your invite")`, 10000));
  await ev(`(() => { const ins = document.querySelectorAll("form input"); ins[1].value = "nia-password-123"; ins[2].value = "nia-password-123"; document.querySelector("form").requestSubmit(); })()`);
  check("invited editor lands on the dashboard", await until(`location.pathname === "/admin/" && document.querySelector(".main h1")?.textContent.includes("Nia")`, 10000));
  const nav = await ev<string>(`document.querySelector(".side__nav").innerText`);
  check("editor sidebar hides CRM/services/SEO/users", !/Client Queries|Services|SEO|Users/.test(nav) && /Projects/.test(nav) && /Media/.test(nav), nav.replace(/\n/g, " · "));
  await go("/admin/enquiries/");
  check("editor is blocked from enquiries", await until(`document.querySelector(".main")?.innerText.includes("No access")`));
  await signOut();

  /* ── 7. Password recovery ─────────────────────────────────── */
  await open("/admin/forgot/");
  await setVal("form input[type=email]", "owner@example.com");
  await ev(`document.querySelector("form").requestSubmit()`);
  await until(`document.querySelector(".auth__msg")?.textContent.includes("reset link")`);
  const rec = sb.outbox.find((m) => m.type === "recovery");
  check("recovery email sent", !!rec);
  await page.send("Page.navigate", { url: rec!.link });
  await until(`location.pathname === "/admin/reset/" && document.querySelector(".auth__title")`, 10000);
  await ev(`(() => { const ins = document.querySelectorAll("form input"); ins[0].value = "owner-new-password-1"; ins[1].value = "owner-new-password-1"; document.querySelector("form").requestSubmit(); })()`);
  check("new password saved → dashboard", await until(`location.pathname === "/admin/"`, 10000));
  await signOut();
  check("sign in with the new password", await signIn("owner@example.com", "owner-new-password-1"));

  /* ── 8. Auto-publish ──────────────────────────────────────── */
  await ev(`localStorage.setItem("ritl-admin-autopublish", "on")`);
  await go("/admin/process/");
  await until(`document.querySelector(".ledit__row")`);
  await ev(`(() => { const el = document.querySelector(".ledit__row textarea"); el.value = "We learn your business, audience, goals and requirements — before a single pixel is placed."; el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await click(".savebar .btn", "Save changes");
  await toastSeen("Process saved");
  const deploys = sb.deploys.length;
  check("auto-publish counts down after a change", await until(`document.querySelector(".pub")?.dataset.state === "pending"`, 4000));
  const t1 = Date.now();
  while (Date.now() - t1 < 75000 && !(sb.deploys.length > deploys && sb.deploys[sb.deploys.length - 1].state === "READY")) await sleep(300);
  check("auto-publish rebuilt the site", sb.deploys.length > deploys && (await html("/")).includes("audience, goals and requirements"), `${sb.deploys.length - deploys} deploy(s)`);

  /* ── 9. Mobile ────────────────────────────────────────────── */
  await viewport(390, 844, true);
  await open("/admin/");
  await until(`document.querySelector(".stat")`);
  await shot("11-mobile-dashboard");
  await ev(`document.querySelector(".top__menu").click()`);
  check("mobile drawer opens", await until(`document.body.classList.contains("drawer-open") && getComputedStyle(document.querySelector(".side")).transform === "none"`, 3000));
  await sleep(300);
  await shot("12-mobile-drawer");
  await ev(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
  check("Escape closes the drawer", await until(`!document.body.classList.contains("drawer-open")`, 3000));
  const overflow = await ev<number>("document.documentElement.scrollWidth - document.documentElement.clientWidth");
  check("no horizontal overflow on mobile", overflow <= 0, String(overflow));
  await go("/admin/enquiries/");
  await until(`document.querySelector("tbody tr")`);
  await shot("13-mobile-inbox");

  close();
  await sb.stop();
  server.close();
  const uniq = [...new Set(problems)];
  const report = `ADMIN QA\n========\n${results.join("\n")}\n\nBrowser problems (${uniq.length})\n${uniq.map((p) => ` • ${p}`).join("\n") || " none"}\n\n${failed ? `${failed} CHECK(S) FAILED` : "ALL CHECKS PASSED"}\n`;
  await writeFile(join(OUT, "report.txt"), report);
  console.log(`\n${report}`);
  process.exit(failed || uniq.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
