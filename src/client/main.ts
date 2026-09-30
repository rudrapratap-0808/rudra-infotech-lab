/**
 * Rudra InfoTech Lab — client entry.
 * Progressive enhancement: every chapter is a complete static layout without JS;
 * GSAP + ScrollTrigger + Lenis add the choreography when available and allowed.
 */
import { initAnchors, initCursor, initFooter, initMenu, initNav } from "./chrome.js";
import { hasGsap, initScroll, lenis, reduced, root } from "./core.js";
import { initForm } from "./form.js";
import { intro } from "./intro.js";
import { initScenes } from "./scenes.js";
import { initLanes, initPlanes, initViz, initWhy } from "./widgets.js";

const w = window as unknown as { __ritl?: Record<string, unknown> };
w.__ritl = { booted: true };

const safe = (name: string, fn: () => void) => {
  try {
    fn();
  } catch (err) {
    console.error(`[ritl:${name}]`, err);
  }
};

const fx = hasGsap() && !reduced();
if (fx) {
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("fx");
  safe("scroll", initScroll);
  w.__ritl.lenis = lenis;
  w.__ritl.ScrollTrigger = ScrollTrigger;
} else {
  root.classList.remove("intro");
  document.querySelector("[data-preloader]")?.remove();
}

safe("nav", initNav);
safe("menu", initMenu);
safe("anchors", initAnchors);
safe("form", initForm);
safe("why", initWhy);
safe("lanes", initLanes);
safe("viz", initViz);
safe("footer", initFooter);

if (fx) {
  let done: () => void = () => {};
  const introDone = new Promise<void>((r) => (done = r));
  safe("scenes", () => initScenes(introDone));
  safe("planes", initPlanes);
  safe("cursor", initCursor);
  intro()
    .catch((err) => {
      console.error("[ritl:intro]", err);
      root.classList.remove("intro");
      document.querySelector("[data-preloader]")?.remove();
      lenis?.start();
    })
    .finally(() => {
      done();
      w.__ritl!.ready = true;
    });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener("load", () => ScrollTrigger.refresh());
} else {
  w.__ritl.ready = true;
}
