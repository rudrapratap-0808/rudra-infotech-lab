import { accent, esc, html, splitWords } from "../lib/html.js";
import { icon } from "./icons.js";

/** Section label: "[02] Selected Work" */
export const eyebrow = (n: string, label: string) =>
  html`<p class="eyebrow mono" data-reveal><span class="eyebrow__n">[${esc(n)}]</span><span class="eyebrow__bar" aria-hidden="true"></span>${esc(label)}</p>`;

/** Masked, word-by-word revealed heading. */
export const heading = (text: string, tag: "h1" | "h2" | "h3" = "h2", cls = "h2", id?: string) =>
  `<${tag} class="${cls}" data-split${id ? ` id="${id}"` : ""} aria-label="${esc(text.replace(/\*/g, ""))}"><span aria-hidden="true">${splitWords(text)}</span></${tag}>`;

export const button = (
  label: string,
  href: string,
  variant: "ember" | "ghost" | "light" = "ember",
  size: "sm" | "md" | "lg" = "md",
  extra = ""
) =>
  html`<a class="btn btn--${variant} btn--${size}" href="${esc(href)}" data-magnetic ${extra}><span class="btn__label">${esc(label)}</span>${icon.arrowRight}</a>`;

export { accent };
