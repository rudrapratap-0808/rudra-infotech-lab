/** SEO, Contact settings, Form settings and general Settings (publishing, account, system). */
import { AVAILABILITY_TEXT, normalizePhone, prettyPhone, waLink, type Availability } from "../../data/model.js";
import { seedContact, seedForm, seedSeo } from "../../data/seed.js";
import { auth, CFG, db, fn } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { imageField } from "../lib/media.js";
import { setLeaveGuard } from "../lib/router.js";
import { can, markChanged, publish, publishNow, state } from "../lib/state.js";
import { ago, btn, busy, card, confirmDialog, errorState, field, input, isUrl, ROLE_TEXT, setError, textarea, toast, toastError, toggle } from "../lib/ui.js";
import { pageHead } from "./shell.js";

const guardOn = (form: HTMLElement) => {
  let dirty = false;
  const on = () => {
    if (dirty) return;
    dirty = true;
    setLeaveGuard(() => confirmDialog({ title: "Discard unsaved changes?", message: "Your changes on this page haven't been saved.", confirm: "Discard", danger: true }));
  };
  form.addEventListener("input", on);
  form.addEventListener("change", on);
  return () => {
    dirty = false;
    setLeaveGuard(null);
  };
};

/* ── SEO ──────────────────────────────────────────────────── */
export async function seoView(): Promise<HTMLElement> {
  let s: Record<string, any>;
  try {
    s = (await db.one("seo_settings", "select=*&id=eq.1")) ?? { ...seedSeo };
  } catch (err) {
    return h("div", { class: "page" }, errorState(err));
  }
  const title = input(s.site_title, { max: 120 });
  const desc = textarea(s.meta_description, { rows: 3, max: 320 });
  const base = input(s.canonical_base_url, { type: "url", max: 200, placeholder: CFG.siteUrl || "https://yourdomain.com" });
  const ogTitle = input(s.og_title, { max: 160 });
  const ogDesc = textarea(s.og_description, { rows: 3, max: 320 });
  const ogImg = imageField("Social share image (OG)", s.og_image || null, { hint: "1200 × 630 PNG/JPG/WebP. Shown when the site is shared on WhatsApp, LinkedIn, X…" });
  const twImg = imageField("Twitter / X image", s.twitter_image || null, { hint: "Optional — defaults to the OG image." });
  const favicon = imageField("Favicon", s.favicon || null, { hint: "Optional. Square PNG, at least 48 × 48. Leave empty for the Rudra R." });
  const appIcon = imageField("App icon (home screen)", s.app_icon || null, { hint: "Optional. Square PNG, 512 × 512." });
  const robots = toggle(!!s.robots_index, "Allow search engines to index the website");
  const preview = h("div", { class: "og" });
  const drawPreview = () =>
    preview.replaceChildren(
      h("div", { class: "og__img" }, ogImg.value ? h("img", { src: ogImg.value, alt: "" }) : h("span", { class: "muted" }, "No image")),
      h("div", { class: "og__body" }, h("p", { class: "og__host mono" }, (base.value || CFG.siteUrl || "").replace(/^https?:\/\//, "")), h("p", { class: "og__title" }, ogTitle.value || title.value), h("p", { class: "og__desc" }, ogDesc.value || desc.value))
    );
  const serp = h("div", { class: "serp" });
  const drawSerp = () => serp.replaceChildren(h("p", { class: "serp__url" }, (base.value || CFG.siteUrl || "").replace(/^https?:\/\//, "")), h("p", { class: "serp__title" }, title.value), h("p", { class: "serp__desc" }, desc.value));
  const form = h(
    "form",
    { class: "editor", novalidate: true },
    card("Search engines", h("div", { class: "grid2" }, field("Site title", title, { max: 60, counter: true, hint: "Home page <title>. Aim for 50–60 characters." }), field("Canonical base URL", base, { hint: "Your main domain, e.g. https://rudrainfotechlab.com. Empty = the Vercel production domain." }), h("div", { class: "span2" }, field("Meta description", desc, { max: 160, counter: true })), h("div", { class: "span2" }, robots.el)), h("h3", { class: "card__sub" }, "Google preview"), serp),
    card("Social previews", h("div", { class: "grid2" }, field("Open Graph title", ogTitle, { max: 90, counter: true }), h("div", { class: "span2" }, field("Open Graph description", ogDesc, { max: 200, counter: true })), ogImg.el, twImg.el), h("h3", { class: "card__sub" }, "Link preview"), preview, h("p", { class: "field__hint" }, "Changing the image? Use a new file (upload a fresh one) so WhatsApp and LinkedIn don't keep showing a cached preview.")),
    card("Icons", h("div", { class: "grid2" }, favicon.el, appIcon.el))
  );
  form.addEventListener("input", () => (drawPreview(), drawSerp()));
  form.addEventListener("click", () => setTimeout(drawPreview, 50));
  drawPreview();
  drawSerp();
  const clearGuard = guardOn(form);
  const save = btn("Save SEO settings", { kind: "primary" });
  save.addEventListener("click", () =>
    busy(save, async () => {
      setError(base, !base.value || /^https?:\/\/[^\s/"<>]+$/.test(base.value.replace(/\/+$/, "")) ? null : "Use just the domain, e.g. https://example.com");
      setError(title, title.value.trim() ? null : "The site needs a title.");
      if (!title.value.trim() || (base.value && !/^https?:\/\/[^\s/"<>]+$/.test(base.value.replace(/\/+$/, "")))) return toast("Please fix the highlighted fields.", "error");
      if (!robots.input.checked && s.robots_index && !(await confirmDialog({ title: "Hide the site from search engines?", message: "Every page will get a noindex tag and robots.txt will block crawlers until you turn this back on.", confirm: "Hide from search", danger: true }))) return;
      try {
        await db.upsert("seo_settings", {
          id: 1,
          site_title: title.value.trim(),
          meta_description: desc.value.trim(),
          canonical_base_url: base.value.trim().replace(/\/+$/, ""),
          og_title: ogTitle.value.trim(),
          og_description: ogDesc.value.trim(),
          og_image: ogImg.value ?? "",
          twitter_image: twImg.value ?? "",
          favicon: favicon.value ?? "",
          app_icon: appIcon.value ?? "",
          robots_index: robots.input.checked,
        }, "id");
        s.robots_index = robots.input.checked;
        clearGuard();
        toast("SEO settings saved.");
        markChanged();
      } catch (err) {
        toastError(err);
      }
    })
  );
  return h("div", { class: "page page--editor" }, pageHead("SEO", "Search and social metadata for the whole site. Project pages have their own SEO fields."), form, h("div", { class: "savebar" }, h("span", { class: "savebar__state" }), save));
}

/* ── Contact settings ─────────────────────────────────────── */
async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.one<{ value: T }>("site_settings", `select=value&key=eq.${key}`);
  return { ...fallback, ...(row?.value ?? {}) };
}

export async function contactView(): Promise<HTMLElement> {
  let c: typeof seedContact;
  try {
    c = await loadSetting("contact", seedContact);
  } catch (err) {
    return h("div", { class: "page" }, errorState(err));
  }
  const email = input(c.email, { type: "email", max: 120, placeholder: "hello@yourdomain.com" });
  const phone = input(c.phone, { type: "tel", max: 24, placeholder: "+91 …" });
  const wa = input(c.whatsapp ? prettyPhone(c.whatsapp) : "", { type: "tel", max: 24, placeholder: "+351 930 656 040" });
  const waMsg = textarea(c.whatsapp_message, { rows: 2, max: 300 });
  const cc = input(c.default_country_code, { max: 3, inputmode: "numeric", placeholder: "91" });
  const insta = input(c.instagram, { type: "url", max: 200, placeholder: "https://instagram.com/…" });
  const linkedin = input(c.linkedin, { type: "url", max: 200, placeholder: "https://linkedin.com/company/…" });
  const github = input(c.github, { type: "url", max: 200, placeholder: "https://github.com/…" });
  const location = input(c.location, { max: 60, placeholder: "e.g. India" });
  const avail = h(
    "div",
    { class: "radios", role: "radiogroup", "aria-label": "Availability" },
    (Object.keys(AVAILABILITY_TEXT) as Availability[]).map((k) => h("label", { class: "radio" }, h("input", { type: "radio", name: "availability", value: k, checked: c.availability === k }), h("span", null, AVAILABILITY_TEXT[k].toUpperCase())))
  );
  const test = h("a", { class: "btn btn--sm", target: "_blank", rel: "noopener noreferrer" }, icon("whatsapp"), "Test WhatsApp link");
  const waHint = h("span", { class: "field__hint" });
  const drawWa = () => {
    const d = normalizePhone(wa.value, "");
    test.hidden = !d;
    if (d) test.setAttribute("href", waLink(d, waMsg.value));
    waHint.textContent = d ? `Saved as ${d} — ${prettyPhone(d)}` : wa.value ? "Include the country code, e.g. +351 930 656 040" : "Empty hides WhatsApp everywhere on the site.";
  };
  wa.addEventListener("input", drawWa);
  waMsg.addEventListener("input", drawWa);
  drawWa();
  const form = h(
    "form",
    { class: "editor", novalidate: true },
    card("WhatsApp", h("div", { class: "grid2" }, h("div", null, field("WhatsApp number", wa), waHint), h("div", null, test), h("div", { class: "span2" }, field("Default WhatsApp message", waMsg, { max: 300, counter: true, hint: "Pre-filled when visitors tap the floating WhatsApp button." })), field("Default country code", cc, { hint: "Used to turn local numbers from the form (e.g. 98765 43210) into WhatsApp links." }))),
    card("Contact details", h("div", { class: "grid2" }, field("Email", email, { hint: "Shown on the site and used for the email fallback." }), field("Phone", phone), field("Location", location))),
    card("Social links", h("div", { class: "grid2" }, field("Instagram", insta), field("LinkedIn", linkedin), field("GitHub", github))),
    card("Availability", avail, h("p", { class: "field__hint" }, "Shown in the navigation, hero, contact section and footer."))
  );
  const clearGuard = guardOn(form);
  const save = btn("Save contact settings", { kind: "primary" });
  save.addEventListener("click", () =>
    busy(save, async () => {
      const d = normalizePhone(wa.value, "");
      const checks: [HTMLElement, string | null][] = [
        [wa, !wa.value.trim() || d ? null : "Enter the full number with country code."],
        [email, !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? null : "Enter a valid email."],
        [cc, /^\d{1,3}$/.test(cc.value.trim()) || !cc.value.trim() ? null : "1–3 digits, e.g. 91"],
        ...[insta, linkedin, github].map((x) => [x, !x.value || isUrl(x.value, true) ? null : "Use a full https:// link."] as [HTMLElement, string | null]),
      ];
      checks.forEach(([el, m]) => setError(el, m));
      const bad = checks.find(([, m]) => m);
      if (bad) return (toast("Please fix the highlighted fields.", "error"), bad[0].focus());
      const value = {
        email: email.value.trim(),
        phone: phone.value.trim(),
        whatsapp: d,
        whatsapp_message: waMsg.value.trim(),
        instagram: insta.value.trim(),
        linkedin: linkedin.value.trim(),
        github: github.value.trim(),
        location: location.value.trim(),
        availability: (avail.querySelector<HTMLInputElement>("input:checked")?.value ?? "available") as Availability,
        default_country_code: cc.value.trim(),
      };
      try {
        await db.upsert("site_settings", { key: "contact", value, is_public: true }, "key");
        clearGuard();
        toast("Contact settings saved.");
        markChanged();
      } catch (err) {
        toastError(err);
      }
    })
  );
  return h("div", { class: "page page--editor" }, pageHead("Contact Settings", "How visitors reach you — used across the whole website."), form, h("div", { class: "savebar" }, h("span", { class: "savebar__state" }), save));
}

/* ── Form settings ────────────────────────────────────────── */
function stringList(title: string, items: string[], o: { max: number; hint: string; min: number }) {
  const list = [...items];
  const ul = h("ul", { class: "listed" });
  const draw = () =>
    ul.replaceChildren(
      ...list.map((v, i) => {
        const inp = input(v, { max: o.max });
        inp.setAttribute("aria-label", `${title} ${i + 1}`);
        inp.addEventListener("input", () => (list[i] = inp.value));
        return h(
          "li",
          { class: "listed__row" },
          inp,
          h("button", { class: "icon-btn", type: "button", "aria-label": "Move up", disabled: i === 0, onclick: () => (list.splice(i - 1, 0, ...list.splice(i, 1)), draw(), ul.dispatchEvent(new Event("input", { bubbles: true }))) }, icon("up")),
          h("button", { class: "icon-btn", type: "button", "aria-label": "Move down", disabled: i === list.length - 1, onclick: () => (list.splice(i + 1, 0, ...list.splice(i, 1)), draw(), ul.dispatchEvent(new Event("input", { bubbles: true }))) }, icon("down")),
          h("button", { class: "icon-btn", type: "button", "aria-label": "Remove", disabled: list.length <= o.min, onclick: () => (list.splice(i, 1), draw(), ul.dispatchEvent(new Event("input", { bubbles: true }))) }, icon("trash"))
        );
      }),
      ...(list.length < 16 ? [h("li", null, btn("Add option", { small: true, icon: "plus", onclick: () => (list.push(""), draw(), ul.lastElementChild?.previousElementSibling?.querySelector("input")?.focus()) }))] : [])
    );
  draw();
  return { el: card(title, ul, h("p", { class: "field__hint" }, o.hint)), values: () => list.map((x) => x.trim()).filter(Boolean) };
}

export async function formSettingsView(): Promise<HTMLElement> {
  let f: typeof seedForm;
  try {
    f = await loadSetting("form", seedForm);
  } catch (err) {
    return h("div", { class: "page" }, errorState(err));
  }
  const services = stringList("Service options", f.services, { max: 80, min: 1, hint: "The “Service needed” choices on the contact form (required field). Service pages pre-select the closest match." });
  const budgets = stringList("Budget ranges", f.budgets, { max: 60, min: 0, hint: "Optional field. Remove every option to hide the budget question." });
  const form = h("form", { class: "editor", novalidate: true }, services.el, budgets.el);
  const clearGuard = guardOn(form);
  const save = btn("Save form settings", { kind: "primary" });
  save.addEventListener("click", () =>
    busy(save, async () => {
      const value = { services: services.values(), budgets: budgets.values() };
      if (!value.services.length) return toast("Keep at least one service option.", "error");
      if (new Set(value.services).size !== value.services.length || new Set(value.budgets).size !== value.budgets.length) return toast("Options must be unique.", "error");
      try {
        await db.upsert("site_settings", { key: "form", value, is_public: true }, "key");
        clearGuard();
        toast("Form settings saved.");
        markChanged();
      } catch (err) {
        toastError(err);
      }
    })
  );
  return h("div", { class: "page page--editor" }, pageHead("Form Settings", "Options on the website's project brief form."), form, h("div", { class: "savebar" }, h("span", { class: "savebar__state" }), save));
}

/* ── Settings ─────────────────────────────────────────────── */
export async function settingsView(): Promise<HTMLElement> {
  const root = h("div", { class: "page" }, pageHead("Settings", "Publishing, your account and system status."));
  // Publishing
  const pubInfo = h("div", { class: "stack" }, h("p", { class: "muted" }, "Checking…"));
  const auto = toggle(publish.auto, "Publish automatically ~20 seconds after changes");
  auto.input.addEventListener("change", () => ((publish.auto = auto.input.checked), toast(auto.input.checked ? "Auto-publish on." : "Auto-publish off — use “Publish website” when you're ready.", "info")));
  const pubBtn = btn("Publish website now", { kind: "primary", icon: "publish", onclick: () => busy(pubBtn, () => publishNow().then(loadPub)) });
  const loadPub = async () => {
    try {
      const r = await fn<{ configured: boolean; last: { requested_at?: string; by?: string } }>("rebuild");
      pubInfo.replaceChildren(
        h("p", null, r.configured ? "Publishing rebuilds the static website on Vercel with the latest published content (about a minute)." : "Automatic publishing isn't configured: add DEPLOY_HOOK_URL in Vercel (see SETUP.md). Saved content goes live on the next deploy."),
        h("p", { class: "muted" }, r.last?.requested_at ? `Last published ${ago(r.last.requested_at)} by ${r.last.by ?? "—"}.` : "Not published from the admin yet."),
        h("p", { class: "muted" }, publish.dirty ? "There are unpublished changes." : "No unpublished changes.")
      );
      pubBtn.disabled = !r.configured;
    } catch (err) {
      pubInfo.replaceChildren(h("p", { class: "muted" }, (err as Error).message));
    }
  };
  loadPub();

  // Account
  const me = state.profile!;
  const name = input(me.full_name, { max: 80, autocomplete: "name" });
  const saveName = btn("Save name", { small: true });
  saveName.addEventListener("click", () =>
    busy(saveName, async () => {
      try {
        await db.update("profiles", `id=eq.${me.id}`, { full_name: name.value.trim() });
        me.full_name = name.value.trim();
        toast("Name saved.");
      } catch (err) {
        toastError(err);
      }
    })
  );
  const pw = input("", { type: "password", max: 200, autocomplete: "new-password" });
  const pw2 = input("", { type: "password", max: 200, autocomplete: "new-password" });
  const savePw = btn("Change password", { small: true });
  savePw.addEventListener("click", () =>
    busy(savePw, async () => {
      setError(pw, pw.value.length >= 10 ? null : "Use at least 10 characters.");
      setError(pw2, pw2.value === pw.value ? null : "The passwords don't match.");
      if (pw.value.length < 10 || pw.value !== pw2.value) return;
      try {
        await auth.updateUser({ password: pw.value });
        pw.value = pw2.value = "";
        toast("Password changed.");
      } catch (err) {
        toastError(err);
      }
    })
  );

  // System
  const sys = h("dl", { class: "dl" }, h("div", null, h("dt", null, "Signed in as"), h("dd", null, `${me.email} · ${ROLE_TEXT[me.role]}`)), h("div", null, h("dt", null, "Supabase"), h("dd", null, CFG.supabaseUrl.replace(/^https?:\/\//, ""))), h("div", null, h("dt", null, "Website"), h("dd", null, h("a", { href: CFG.siteUrl, target: "_blank", rel: "noopener" }, CFG.siteUrl.replace(/^https?:\/\//, "")))));
  const enq = h("div", null, h("dt", null, "Enquiry form"), h("dd", null, "Checking…"));
  sys.append(enq);
  fn<{ configured: boolean; email: boolean }>("enquiry")
    .then((r) => enq.lastElementChild!.replaceChildren(r.configured ? `Saving to Supabase${r.email ? " + email notifications" : " (email notifications off)"}` : "Not configured — the form falls back to WhatsApp"))
    .catch(() => (enq.lastElementChild!.textContent = "API not reachable"));

  root.append(
    h(
      "div",
      { class: "stack" },
      card("Publishing", pubInfo, auto.el, h("div", { class: "row" }, pubBtn)),
      card("Your account", h("div", { class: "grid2" }, h("div", { class: "stack" }, field("Name", name), h("div", { class: "row" }, saveName)), h("div", { class: "stack" }, field("New password", pw, { hint: "At least 10 characters." }), field("Repeat new password", pw2), h("div", { class: "row" }, savePw)))),
      card("System", sys),
      can.admin() ? card("Security checklist", h("ul", { class: "bul" }, h("li", null, "In Supabase → Authentication → Sign In / Providers, turn off “Allow new users to sign up”. Team members join by invite."), h("li", null, "Keep SUPABASE_SERVICE_ROLE_KEY only in Vercel environment variables — never in code."), h("li", null, "Give Editor access to people who only manage portfolio content."))) : null
    )
  );
  return root;
}
