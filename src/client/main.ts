/**
 * Rudra InfoTech Lab — client entry.
 * Everything is progressive enhancement: the site is fully usable without JS.
 */
import { $, onIdle } from "./lib/dom.js";
import { initAnchors } from "./modules/anchors.js";
import { initCursor } from "./modules/cursor.js";
import { initFooter } from "./modules/footer.js";
import { initForm } from "./modules/form.js";
import { initMagnetic } from "./modules/magnetic.js";
import { initMenu } from "./modules/menu.js";
import { initNav } from "./modules/nav.js";
import { initReveal } from "./modules/reveal.js";
import { initCtaOrb, initProcess, initScrub, initSpotlight, initWork } from "./modules/scroll-effects.js";
import { initServices } from "./modules/services.js";

const safe = (name: string, fn: () => void) => {
  try {
    fn();
  } catch (err) {
    console.error(`[ritl:${name}]`, err);
  }
};

safe("reveal", initReveal);
safe("nav", initNav);
safe("menu", initMenu);
safe("anchors", initAnchors);
safe("services", initServices);
safe("form", initForm);
safe("scrub", initScrub);
safe("process", initProcess);
safe("work", initWork);
safe("footer", initFooter);

// Pointer-only polish + the hero canvas load after first paint.
onIdle(() => {
  safe("cursor", initCursor);
  safe("magnetic", initMagnetic);
  safe("spotlight", initSpotlight);
  safe("cta", initCtaOrb);
  const canvas = $<HTMLCanvasElement>("[data-hero-canvas]");
  const hero = $("[data-hero]");
  if (canvas && hero) {
    import("./modules/hero-canvas.js")
      .then((m) => m.initHeroCanvas(canvas, hero))
      .catch((err) => console.error("[ritl:hero]", err));
  }
}, 600);
