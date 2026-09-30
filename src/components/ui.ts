import { chapterText } from "../data/site.js";
import { esc, html } from "../lib/html.js";
import { arrow } from "./symbols.js";

/** Section label: "/ 02  SELECTED WORK" */
export const label = (n: string, text: string, extra = "") =>
  html`<p class="label mono ${extra}"><span class="label__n">/ ${esc(n)}</span><span class="label__t">${esc(text)}</span></p>`;

/** Mono key/value pairs ("STATUS / LIVE"). */
export const spec = (rows: [string, string][], cls = "spec") =>
  html`<dl class="${cls} mono">${rows.map(([k, v]) => html`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)}</dl>`;

/** Sharp rectangular call-to-action. */
export const cta = (text: string, href: string, variant: "ink" | "paper" | "orange" = "ink", dir: "ne" | "e" | "s" = "ne", extra = "") =>
  html`<a class="cta cta--${variant}" href="${esc(href)}" data-cursor="go" ${extra}><span class="cta__t">${esc(text)}</span>${arrow(dir, "cta__a")}</a>`;

/** Underlined text link with arrow. */
export const tlink = (text: string, href: string, dir: "ne" | "e" | "s" = "e", extra = "") =>
  html`<a class="tlink mono" href="${esc(href)}" ${extra}><span>${esc(text)}</span>${arrow(dir, "tlink__a")}</a>`;

/** Availability indicator (acid dot). */
export const status = (text: string, cls = "") =>
  text ? html`<p class="status mono ${cls}"><span class="status__dot" aria-hidden="true"></span>${esc(text)}</p>` : "";

/** Column grid overlay (12 columns) — the Rudra grid made visible. */
export const gridLines = (cls = "gridlines") =>
  `<span class="${cls}" aria-hidden="true">${"<i></i>".repeat(12)}</span>`;

/** data-chapter attribute — the text the nav shows while this section is under it. */
export const chapterAttr = (k: import("../data/site.js").ChapterKey) =>
  `data-chapter="${esc(chapterText(k))}"`;
