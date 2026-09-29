import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Compiled to .build/scripts/paths.js → project root is two levels up. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const DIST = resolve(ROOT, "dist");
export const PUBLIC = resolve(ROOT, "public");
export const STYLES = resolve(ROOT, "src/styles");
export const CLIENT_OUT = resolve(ROOT, ".build/client");

/** Locates a Chrome/Chromium binary for the screenshot + OG scripts. */
export const CHROME_CANDIDATES = [
  process.env.CHROME_PATH ?? "",
  "/usr/local/bin/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);
