/** Sign in, forgot password, set a new password (recovery + invite links), no-access screen. */
import { auth, CFG, configured } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { navigate } from "../lib/router.js";
import { btn, busy, field, input, setError, toast } from "../lib/ui.js";

const frame = (title: string, sub: string, ...body: (HTMLElement | null)[]) =>
  h(
    "main",
    { class: "auth" },
    h(
      "div",
      { class: "auth__card" },
      h("p", { class: "auth__brand mono" }, h("span", null, "Rudra"), h("span", null, "InfoTech Lab")),
      h("h1", { class: "auth__title" }, title),
      h("p", { class: "auth__sub" }, sub),
      body
    ),
    h("a", { class: "auth__back mono", href: CFG.siteUrl || "/", target: "_blank", rel: "noopener" }, icon("back"), "View website")
  );

const notConfigured = () =>
  frame(
    "Connect Supabase",
    "The admin panel needs a Supabase project. Add SUPABASE_URL and SUPABASE_ANON_KEY to the Vercel environment variables and redeploy — SETUP.md in the repository walks through every step.",
    null
  );

export function loginView(): HTMLElement {
  if (!configured()) return notConfigured();
  const email = input("", { type: "email", required: true, autocomplete: "username", max: 120 });
  const pw = input("", { type: "password", required: true, autocomplete: "current-password", max: 200 });
  const msg = h("p", { class: "auth__msg", role: "alert" });
  const submit = btn("Sign in", { kind: "primary", type: "submit" });
  const form = h(
    "form",
    { class: "stack", novalidate: true },
    field("Email", email, { required: true }),
    field("Password", pw, { required: true }),
    msg,
    submit,
    h("a", { class: "auth__link", href: "/admin/forgot/" }, "Forgot your password?")
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "";
    setError(email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? null : "Enter your email address.");
    setError(pw, pw.value ? null : "Enter your password.");
    if (!email.value.trim() || !pw.value) return;
    busy(submit, async () => {
      try {
        await auth.signIn(email.value.trim(), pw.value);
        const next = new URLSearchParams(location.search).get("next");
        navigate(next && next.startsWith("/admin/") ? next : "/admin/", { replace: true, force: true });
      } catch (err) {
        msg.textContent = (err as Error).message;
        pw.select();
      }
    });
  });
  setTimeout(() => email.focus(), 30);
  return frame("Sign in", "Private admin for the Rudra InfoTech Lab website.", form);
}

export function forgotView(): HTMLElement {
  if (!configured()) return notConfigured();
  const email = input("", { type: "email", required: true, autocomplete: "username", max: 120 });
  const msg = h("p", { class: "auth__msg", role: "status" });
  const submit = btn("Send reset link", { kind: "primary", type: "submit" });
  const form = h("form", { class: "stack", novalidate: true }, field("Email", email, { required: true }), msg, submit, h("a", { class: "auth__link", href: "/admin/login/" }, "Back to sign in"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setError(email, "Enter the email you sign in with.");
    setError(email, null);
    busy(submit, async () => {
      try {
        await auth.recover(v);
        msg.textContent = "If that email has an account, a reset link is on its way. Check your inbox (and spam folder).";
        submit.disabled = true;
      } catch (err) {
        msg.textContent = (err as Error).message;
      }
    });
  });
  return frame("Reset password", "We'll email you a link to choose a new password.", form);
}

/** Landing page for recovery and invite links: #access_token=…&type=recovery|invite */
export async function resetView(): Promise<HTMLElement> {
  if (!configured()) return notConfigured();
  let kind = "recovery";
  if (location.hash) {
    try {
      const r = await auth.fromHash(location.hash);
      history.replaceState(null, "", location.pathname);
      if (r && "error" in r) return frame("Link expired", `${r.error}. Request a new link and use it within an hour.`, h("a", { class: "btn btn--primary", href: "/admin/forgot/" }, "Send a new link"));
      if (r && "type" in r) kind = r.type;
    } catch (err) {
      return frame("Link problem", (err as Error).message, h("a", { class: "btn btn--primary", href: "/admin/forgot/" }, "Send a new link"));
    }
  }
  if (!auth.session()) return frame("Link expired", "This page needs a valid password-reset or invite link.", h("a", { class: "btn btn--primary", href: "/admin/forgot/" }, "Send a new link"));
  const pw = input("", { type: "password", required: true, autocomplete: "new-password", max: 200 });
  const pw2 = input("", { type: "password", required: true, autocomplete: "new-password", max: 200 });
  const name = input(String(auth.session()?.user.user_metadata?.full_name ?? ""), { max: 80, autocomplete: "name" });
  const msg = h("p", { class: "auth__msg", role: "alert" });
  const submit = btn(kind === "invite" ? "Create account" : "Save new password", { kind: "primary", type: "submit" });
  const form = h(
    "form",
    { class: "stack", novalidate: true },
    kind === "invite" ? field("Your name", name) : null,
    field("New password", pw, { required: true, hint: "At least 10 characters." }),
    field("Repeat password", pw2, { required: true }),
    msg,
    submit
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setError(pw, pw.value.length >= 10 ? null : "Use at least 10 characters.");
    setError(pw2, pw2.value === pw.value ? null : "The passwords don't match.");
    if (pw.value.length < 10 || pw.value !== pw2.value) return;
    busy(submit, async () => {
      try {
        await auth.updateUser({ password: pw.value, ...(kind === "invite" && name.value.trim() ? { data: { full_name: name.value.trim() } } : {}) });
        toast(kind === "invite" ? "Welcome aboard — your account is ready." : "Password updated.");
        navigate("/admin/", { replace: true, force: true });
      } catch (err) {
        msg.textContent = (err as Error).message;
      }
    });
  });
  return frame(kind === "invite" ? "Accept your invite" : "Choose a new password", kind === "invite" ? "Set a password to finish creating your admin account." : `Signed in as ${auth.session()?.user.email}.`, form);
}

export function noAccessView(role: string): HTMLElement {
  const out = btn("Sign out", { kind: "primary", onclick: async () => (await auth.signOut(), navigate("/admin/login/", { replace: true, force: true })) });
  return frame(
    role === "disabled" ? "Account disabled" : "Waiting for access",
    role === "disabled"
      ? "Your admin access has been turned off. Contact the site owner if you think this is a mistake."
      : `You're signed in as ${auth.session()?.user.email}, but an owner or admin still needs to give you a role (Admin or Editor).`,
    out
  );
}
