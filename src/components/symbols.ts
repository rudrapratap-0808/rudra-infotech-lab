/**
 * The Rudra graphical vocabulary: arrows, construction marks, service symbols
 * and the R monogram. All custom SVG — no icon library. Decorative → aria-hidden.
 */

/** Sharp arrows (the web fonts' Latin subsets have no ↗ / → glyphs). */
const ARROWS = {
  ne: "M4.5 11.5 11.5 4.5M5.5 4.5h6v6",
  e: "M2.5 8h11M9 3.5 13.5 8 9 12.5",
  s: "M8 2.5v11M3.5 9 8 13.5 12.5 9",
  n: "M8 13.5v-11M3.5 7 8 2.5 12.5 7",
  w: "M13.5 8h-11M7 3.5 2.5 8 7 12.5",
};
export const arrow = (dir: keyof typeof ARROWS = "ne", cls = "arw"): string =>
  `<svg class="${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="${ARROWS[dir]}"/></svg>`;

/** Four corner crop marks (construction detail). */
export const cropMarks = (cls = "crop"): string =>
  `<span class="${cls}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;

/* ── Service symbols (240 × 240, stroke = currentColor) ────── */
const sym = (id: string, body: string) =>
  `<svg class="sym sym--${id}" viewBox="0 0 240 240" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">${body}</svg>`;

const P = (d: string, cls = "") => `<path class="d ${cls}" pathLength="1" d="${d}"/>`;

export const serviceSymbol: Record<string, string> = {
  // Website Design — grid
  design: sym(
    "design",
    `<rect class="f f--acid" x="93" y="93" width="54" height="54"/>` +
      P("M40 40H200M40 93H200M40 147H200M40 200H200") +
      P("M40 40V200M93 40V200M147 40V200M200 40V200") +
      P("M80 80H160V160H80Z", "dash")
  ),
  // Web Development — brackets
  development: sym(
    "development",
    P("M90 62 50 120l40 58") + P("M150 62l40 58-40 58") + P("M134 50 106 190", "acid")
  ),
  // Business Websites — window
  business: sym(
    "business",
    `<rect class="f f--paper" x="62" y="112" width="58" height="46"/>` +
      P("M36 56H204V184H36Z") +
      P("M36 82H204") +
      P("M132 112H178M132 128H170M132 144H160")
  ),
  // E-commerce — circle + counter
  ecommerce: sym(
    "ecommerce",
    `<circle class="f f--acid" cx="120" cy="120" r="46"/>` +
      P("M120 32a88 88 0 1 1 0 176a88 88 0 1 1 0-176") +
      P("M120 18v14M120 208v14M18 120h14M208 120h14") +
      `<text class="sym__count" x="120" y="131" text-anchor="middle">01</text>`
  ),
  // Landing Pages — vertical line into a target
  landing: sym(
    "landing",
    P("M120 20V132") +
      P("M120 136a38 38 0 1 1 0 76a38 38 0 1 1 0-76") +
      P("M120 156a18 18 0 1 1 0 36a18 18 0 1 1 0-36", "acid") +
      P("M76 174H96M144 174H164")
  ),
  // Website Redesign — before / after split
  redesign: sym(
    "redesign",
    `<rect class="f f--paper" x="120" y="52" width="84" height="136"/>` +
      P("M36 52H120V188H36Z", "dash") +
      P("M120 30V210") +
      P("M120 106a14 14 0 1 1 0 28a14 14 0 1 1 0-28", "acid")
  ),
  // Performance Optimization — speed lines
  performance: sym(
    "performance",
    P("M30 74H150M60 104H170M20 134H130M70 164H160") + P("M40 196H200l-16-12M200 196l-16 12", "acid")
  ),
  // Maintenance & Support — loop
  support: sym(
    "support",
    P("M186 96A72 72 0 1 1 164 64") + P("M150 44l18 22-24 14", "") + P("M120 96v48M96 120h48", "acid")
  ),
};

/**
 * The R monogram — built from primitives: ink stem, orange bowl, blue leg,
 * drawn first as construction lines. viewBox 400 × 480.
 */
export const monogram = (): string => `<svg class="mono-r" viewBox="0 0 400 480" fill="none" aria-hidden="true" focusable="false">
  <g class="mono-r__guides" stroke="currentColor" stroke-width="1">
    ${P("M0 40H400M0 150H400M0 260H400M0 440H400")}
    ${P("M40 0V480M150 0V480M240 0V480")}
    ${P("M240 40a110 110 0 1 1 0 220a110 110 0 1 1 0-220")}
    ${P("M235 100a50 50 0 1 1 0 100a50 50 0 1 1 0-100")}
    ${P("M200 260 380 470")}
  </g>
  <rect class="mono-r__stem" x="40" y="40" width="110" height="400"/>
  <path class="mono-r__bowl" fill-rule="evenodd" d="M150 40H240a110 110 0 0 1 0 220H150ZM150 100H235a50 50 0 0 1 0 100H150Z"/>
  <path class="mono-r__leg" d="M196 260h82l100 180h-82Z"/>
  <g class="mono-r__labels">
    <text x="404" y="44">CAP</text><text x="404" y="154">MID</text><text x="404" y="264">BOWL</text><text x="404" y="444">BASE</text>
    <text x="40" y="474">X 040</text><text x="150" y="474">X 150</text><text x="240" y="474">X 240</text>
  </g>
</svg>`;
