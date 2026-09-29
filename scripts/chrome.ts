import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";
import { CHROME_CANDIDATES } from "./paths.js";

export async function findChrome(): Promise<string> {
  for (const c of CHROME_CANDIDATES) {
    if (await stat(c).then(() => true, () => false)) return c;
  }
  throw new Error("Chrome/Chromium not found. Set CHROME_PATH=/path/to/chrome");
}

/** Headless screenshot of a URL at an exact viewport size. */
export function screenshot(chrome: string, url: string, out: string, width: number, height: number, extra: string[] = []) {
  const res = spawnSync(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      `--screenshot=${out}`,
      ...extra,
      url,
    ],
    { encoding: "utf8", timeout: 60000 }
  );
  if (res.status !== 0) throw new Error(`Chrome failed for ${url}: ${res.stderr}`);
}
