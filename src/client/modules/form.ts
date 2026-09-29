import { $, $$ } from "../lib/dom.js";

type Values = Record<string, string>;
type Rule = (v: string, all: Values) => string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_FILL_MS = 3000; // faster than this is almost certainly a bot
const COOLDOWN_MS = 60_000;
const STORE_KEY = "ritl:lastBrief";

const rules: Record<string, Rule> = {
  name: (v) => (!v ? "Please tell us your name." : v.length < 2 ? "That name looks a little short." : null),
  email: (v) => (!v ? "We need an email to reply to you." : !EMAIL.test(v) ? "That email doesn't look quite right." : null),
  phone: (v) => {
    if (!v) return null;
    const digits = v.replace(/\D/g, "");
    if (!/^[+\d\s().-]+$/.test(v) || digits.length < 7 || digits.length > 15) return "Please enter a valid phone / WhatsApp number.";
    return null;
  },
  type: (v) => (!v ? "Pick the type of website you need." : null),
  details: (v) =>
    !v ? "Tell us a little about the project." : v.length < 20 ? `A few more words, please (${20 - v.length} to go).` : null,
};

export function initForm(): void {
  const form = $<HTMLFormElement>("[data-form]");
  if (!form) return;
  const card = form.parentElement!;
  const success = $("[data-success]", card);
  const status = $("[data-status]", form)!;
  const submit = $<HTMLButtonElement>("button[type='submit']", form)!;
  const counter = $("[data-count]", form);
  const details = $<HTMLTextAreaElement>("textarea[name='details']", form);
  const loadedAt = performance.now();
  let attempted = false;

  const values = (): Values => {
    const fd = new FormData(form);
    const out: Values = {};
    fd.forEach((v, k) => (out[k] = String(v).trim()));
    return out;
  };

  const control = (name: string): HTMLElement | null =>
    form.querySelector<HTMLElement>(`fieldset[aria-describedby="f-${name}-err"]`) ||
    form.querySelector<HTMLElement>(`[name="${name}"]`);

  const showError = (name: string, msg: string | null) => {
    const err = $(`[data-error-for="${name}"]`, form);
    const el = control(name);
    if (err) err.textContent = msg || "";
    if (el) msg ? el.setAttribute("aria-invalid", "true") : el.removeAttribute("aria-invalid");
  };

  const validate = (only?: string): string[] => {
    const v = values();
    const bad: string[] = [];
    for (const [name, rule] of Object.entries(rules)) {
      if (only && only !== name) continue;
      const msg = rule(v[name] || "", v);
      showError(name, msg);
      if (msg) bad.push(name);
    }
    return bad;
  };

  const setStatus = (msg: string, kind: "error" | "info" | "" = "") => {
    status.textContent = msg;
    status.className = `form__status${kind ? ` is-${kind}` : ""}`;
  };

  const setLoading = (on: boolean) => {
    form.classList.toggle("is-loading", on);
    submit.disabled = on;
    submit.setAttribute("aria-busy", String(on));
    const label = $(".btn__label", submit);
    if (label) label.textContent = on ? "Sending…" : "Send Project Brief";
  };

  const showSuccess = (title?: string, text?: string) => {
    if (!success) return;
    if (title) $("h3", success)!.textContent = title;
    if (text) $("p", success)!.textContent = text;
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };

  // Live validation (after blur, or everywhere after the first submit attempt)
  form.addEventListener("focusout", (e) => {
    const name = (e.target as HTMLInputElement).name;
    if (name && rules[name] && (attempted || (e.target as HTMLInputElement).value)) validate(name);
  });
  form.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (details && counter && (e.target as Element) === details) counter.textContent = `${details.value.length} / ${details.maxLength}`;
    if (attempted && rules[t.name]) validate(t.name);
  });
  form.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type === "radio" && rules[t.name]) validate(t.name);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    attempted = true;
    setStatus("");
    const bad = validate();
    if (bad.length) {
      setStatus(bad.length === 1 ? "One field needs a quick fix." : `${bad.length} fields need a quick fix.`, "error");
      const first = control(bad[0]);
      (first?.matches("fieldset") ? first.querySelector<HTMLInputElement>("input") : first)?.focus();
      return;
    }

    const v = values();
    // Spam protection: honeypot + minimum fill time → silently "succeed".
    if (v.website || performance.now() - loadedAt < MIN_FILL_MS) {
      showSuccess();
      return;
    }
    const last = Number(localStorage.getItem(STORE_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) {
      setStatus("You just sent a brief — please wait a minute before sending another.", "info");
      return;
    }
    delete v.website;

    const endpoint = form.dataset.endpoint || "";
    const whatsapp = form.dataset.whatsapp || "";
    const email = form.dataset.email || "";
    const summary = [
      `New project brief — ${v.type}`,
      `Name: ${v.name}`,
      `Email: ${v.email}`,
      v.phone && `Phone / WhatsApp: ${v.phone}`,
      v.company && `Business: ${v.company}`,
      v.budget && `Budget: ${v.budget}`,
      "",
      v.details,
    ]
      .filter((l) => l !== "" && l !== undefined && l !== null)
      .join("\n");

    setLoading(true);
    try {
      if (endpoint) {
        let extra: Values = {};
        try {
          extra = JSON.parse(form.dataset.extra || "{}");
        } catch {
          /* ignore malformed config */
        }
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...extra, ...v, subject: `New project brief — ${v.name}`, page: location.href }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        localStorage.setItem(STORE_KEY, String(Date.now()));
        form.reset();
        showSuccess();
      } else if (whatsapp) {
        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(summary)}`, "_blank", "noopener");
        showSuccess("Almost there.", "WhatsApp has opened with your brief ready — just press send and we'll take it from there.");
      } else if (email) {
        location.href = `mailto:${email}?subject=${encodeURIComponent(`New project brief — ${v.name}`)}&body=${encodeURIComponent(summary)}`;
        showSuccess("Almost there.", "Your email app should open with the brief ready — just press send and we'll take it from there.");
      } else {
        console.warn("[contact form] No delivery method configured — set form.endpoint, contact.whatsapp or contact.email in src/data/site.ts");
        throw new Error("unconfigured");
      }
    } catch (err) {
      if ((err as Error).message !== "unconfigured") console.error("[contact form]", err);
      setStatus(
        `Sorry — your brief couldn't be sent just now. Please try again in a moment${email ? `, or email us at ${email}` : ""}.`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  });

  $("[data-reset]", card)?.addEventListener("click", () => {
    form.reset();
    attempted = false;
    $$("[data-error-for]", form).forEach((el) => (el.textContent = ""));
    $$("[aria-invalid]", form).forEach((el) => el.removeAttribute("aria-invalid"));
    if (counter && details) counter.textContent = `0 / ${details.maxLength}`;
    setStatus("");
    success!.hidden = true;
    form.hidden = false;
    $<HTMLInputElement>("input[name='name']", form)?.focus();
  });
}
