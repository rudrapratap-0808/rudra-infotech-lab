/** Inline SVG icon set (decorative — always aria-hidden). */

const svg = (body: string, vb = "0 0 24 24", cls = "icon") =>
  `<svg class="${cls}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icon = {
  arrowRight: svg(`<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>`),
  arrowUpRight: svg(`<path d="M7 17 17 7"/><path d="M8 7h9v9"/>`),
  arrowUp: svg(`<path d="M12 20V5"/><path d="m6 11 6-6 6 6"/>`),
  arrowDown: svg(`<path d="M12 4v15"/><path d="m6 13 6 6 6-6"/>`),
  lock: svg(`<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`),
  check: svg(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`),
  mail: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>`),
  phone: svg(`<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>`),
  chat: svg(`<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z"/>`),
  pin: svg(`<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>`),
  spark: svg(`<path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18"/>`),
};

/** The RITL mark — an abstracted trident (a nod to Rudra) drawn as a signal. */
export const mark = (cls = "mark") =>
  `<svg class="${cls}" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
    <circle cx="16" cy="16" r="15" stroke="currentColor" stroke-opacity=".28"/>
    <path d="M9.5 9.5v6.2c0 3 2.9 4.3 6.5 4.3s6.5-1.3 6.5-4.3V9.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M16 6.5v19" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <circle class="mark__dot" cx="16" cy="6.5" r="2.1" fill="var(--ember)"/>
  </svg>`;

/** Large line illustrations for the services panel (120×120). */
const big = (body: string) => svg(body, "0 0 120 120", "svc-art");

export const serviceArt: Record<string, string> = {
  design: big(
    `<rect x="18" y="22" width="84" height="64" rx="6"/><path d="M18 36h84"/><circle cx="27" cy="29" r="1.6"/><circle cx="34" cy="29" r="1.6"/><rect x="28" y="46" width="30" height="30" rx="3" class="a1"/><path d="M66 50h26M66 60h20M66 70h14" class="a2"/><path d="m80 92 10-18 10 18" class="a3"/>`
  ),
  development: big(
    `<path d="m42 38-20 22 20 22" class="a1"/><path d="m78 38 20 22-20 22" class="a1"/><path d="M68 28 52 92" class="a2"/><circle cx="60" cy="60" r="44" stroke-dasharray="2 6" class="a3"/>`
  ),
  business: big(
    `<rect x="20" y="40" width="80" height="54" rx="5"/><path d="M46 40V30a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v10"/><path d="M20 62h80" class="a2"/><rect x="54" y="56" width="12" height="12" rx="2" class="a1"/><path d="M30 78h16M30 86h10" class="a3"/>`
  ),
  ecommerce: big(
    `<path d="M26 40h68l-6 52H32Z"/><path d="M46 40v-6a14 14 0 0 1 28 0v6" class="a1"/><path d="M44 58h32" class="a2"/><circle cx="60" cy="74" r="6" class="a3"/>`
  ),
  landing: big(
    `<circle cx="60" cy="60" r="40"/><circle cx="60" cy="60" r="26" class="a2"/><circle cx="60" cy="60" r="11" class="a1"/><path d="M60 14v14M60 92v14M14 60h14M92 60h14" class="a3"/>`
  ),
  redesign: big(
    `<path d="M92 50a34 34 0 0 0-62-10" class="a1"/><path d="m30 26 0 14 14 0" class="a1"/><path d="M28 70a34 34 0 0 0 62 10" class="a2"/><path d="m90 94 0-14-14 0" class="a2"/><rect x="48" y="48" width="24" height="24" rx="4" class="a3"/>`
  ),
  performance: big(
    `<path d="M18 84a42 42 0 1 1 84 0"/><path d="M60 84 82 52" class="a1"/><circle cx="60" cy="84" r="5" class="a1"/><path d="M28 84h6M86 84h6M60 42v6M36 58l4 4M84 58l-4 4" class="a3"/><path d="M40 100h40" class="a2"/>`
  ),
  support: big(
    `<path d="M60 16 96 30v28c0 22-15 38-36 46-21-8-36-24-36-46V30Z"/><path d="m44 60 11 11 22-24" class="a1"/><path d="M60 16v88" stroke-dasharray="2 6" class="a3"/>`
  ),
};
