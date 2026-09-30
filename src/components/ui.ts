import { chapterText, type ChapterKey } from "../data/site.js";
import { D } from "../data/store.js";
import { waLink } from "../data/model.js";
import { esc, EXT, html } from "../lib/html.js";
import { arrow, whatsappIcon } from "./symbols.js";

/** Section label: "/ 02  SELECTED WORK" */
export const label = (n: string, text: string, extra = "") =>
  html`<p class="label mono ${extra}"><span class="label__n">/ ${esc(n)}</span><span class="label__t">${esc(text)}</span></p>`;

/** Mono key/value pairs ("STATUS / LIVE"). */
export const spec = (rows: [string, string][], cls = "spec") =>
  html`<dl class="${cls} mono">${rows.map(([k, v]) => html`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)}</dl>`;

type Variant = "ink" | "paper" | "orange" | "acid" | "line";

/** Sharp rectangular call-to-action. */
export const cta = (text: string, href: string, variant: Variant = "ink", dir: "ne" | "e" | "s" = "ne", extra = "") =>
  html`<a class="cta cta--${variant}" href="${esc(href)}" data-cursor="go" ${extra}><span class="cta__t">${esc(text)}</span>${arrow(dir, "cta__a")}</a>`;

/** CTA that opens another site in a new tab. */
export const extCta = (text: string, href: string, variant: Variant = "ink", srExtra = "") =>
  html`<a class="cta cta--${variant}" href="${esc(href)}" ${EXT} data-cursor="visit"><span class="cta__t">${esc(text)}</span>${arrow("ne", "cta__a")}<span class="sr-only">${esc(srExtra)} (opens in a new tab)</span></a>`;

/** WhatsApp CTA with a pre-filled message. Empty when no WhatsApp number is configured. */
export const waCta = (text: string, message: string, variant: Variant = "line", extra = "") => {
  const n = D().contact.whatsapp;
  if (!n) return "";
  return html`<a class="cta cta--${variant} cta--wa" href="${esc(waLink(n, message))}" ${EXT} data-cursor="go" data-wa ${extra}>${whatsappIcon("cta__wa")}<span class="cta__t">${esc(text)}</span>${arrow("ne", "cta__a")}<span class="sr-only"> (opens WhatsApp)</span></a>`;
};

/** Underlined text link with arrow. */
export const tlink = (text: string, href: string, dir: "ne" | "e" | "s" = "e", extra = "") =>
  html`<a class="tlink mono" href="${esc(href)}" ${extra}><span>${esc(text)}</span>${arrow(dir, "tlink__a")}</a>`;

/** Availability indicator (acid dot; grey when not accepting projects). */
export const status = (text: string, cls = "") =>
  text
    ? html`<p class="status mono ${cls}" data-availability="${esc(D().contact.availability)}"><span class="status__dot" aria-hidden="true"></span>${esc(text)}</p>`
    : "";

/** Column grid overlay (12 columns) — the Rudra grid made visible. */
export const gridLines = (cls = "gridlines") =>
  `<span class="${cls}" aria-hidden="true">${"<i></i>".repeat(12)}</span>`;

/** data-chapter attribute — the text the nav shows while this section is under it. */
export const chapterAttr = (k: ChapterKey) => `data-chapter="${esc(chapterText(k))}"`;
export const chapterRaw = (text: string) => `data-chapter="${esc(text)}"`;
