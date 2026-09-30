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
  // Android Apps — handset
  android: sym(
    "android",
    `<rect class="f f--acid" x="94" y="74" width="52" height="92"/>` +
      P("M78 28H162V212H78Z") +
      P("M78 58H162M78 182H162") +
      P("M110 43H130") +
      P("M120 190a7 7 0 1 1 0 14a7 7 0 1 1 0-14", "acid")
  ),
  // Custom Development — nested brackets
  custom: sym(
    "custom",
    `<rect class="f f--paper" x="104" y="104" width="32" height="32"/>` + P("M60 60H180V180H60Z", "dash") + P("M88 88H152V152H88Z") + P("M40 120H88M152 120H200", "acid")
  ),
};

/** Symbol ids an admin can pick for a service. */
export const SYMBOL_IDS = Object.keys(serviceSymbol);

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

/** WhatsApp glyph (Simple Icons, CC0). */
export const whatsappIcon = (cls = "wa-ico"): string =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`;

/** The four-colour Google Play mark. */
export const playMark = (cls = "play-mark"): string =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#fbbc04" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z"/><path fill="#4285f4" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z"/><path fill="#34a853" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z"/><path fill="#ea4335" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></svg>`;

/** "GET IT ON Google Play" badge, redrawn in SVG (decorative — the link carries the text). */
export const playBadge = (cls = "play-badge"): string =>
  `<svg class="${cls}" viewBox="0 0 180 54" aria-hidden="true" focusable="false"><rect x=".5" y=".5" width="179" height="53" rx="8" fill="#000" stroke="#a6a6a6"/><g transform="translate(13 13) scale(1.17)"><path fill="#fbbc04" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z"/><path fill="#4285f4" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z"/><path fill="#34a853" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z"/><path fill="#ea4335" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></g><text x="52" y="21" fill="#fff" font-family="Inter Tight, Arial, sans-serif" font-size="9" font-weight="600" letter-spacing=".08em">GET IT ON</text><text x="51" y="41" fill="#fff" font-family="Inter Tight, Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="-.01em">Google Play</text></svg>`;
