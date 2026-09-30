/**
 * Measures every image the pages reference so <img> tags ship with real width/height
 * (no layout shift). Local files are read from /public; remote files (Supabase Storage)
 * are downloaded once per build. An optional "<name>-800w.<ext>" sibling becomes the
 * small srcset candidate (the admin uploader creates it for wide images).
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { PUBLIC } from "./paths.js";
import { imageSize } from "./image-size.js";
import type { Img } from "../src/data/store.js";

const exists = (p: string) => stat(p).then((s) => s.isFile(), () => false);
const smallName = (u: string) => u.replace(/(\.[a-z0-9]+)(\?.*)?$/i, "-800w$1");

async function fetchBytes(url: string, method = "GET"): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return method === "HEAD" ? new Uint8Array(0) : new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function measureOne(url: string, warn: (m: string) => void): Promise<Img | null> {
  if (url.startsWith("/")) {
    const file = join(PUBLIC, decodeURIComponent(url.split("?")[0]));
    if (!(await exists(file))) {
      warn(`missing image ${url}`);
      return null;
    }
    const s = imageSize(await readFile(file));
    if (!s) return null;
    const small = smallName(url);
    const sf = join(PUBLIC, decodeURIComponent(small.split("?")[0]));
    const ss = small !== url && (await exists(sf)) ? imageSize(await readFile(sf)) : null;
    return { src: url, ...s, ...(ss ? { small: { src: small, ...ss } } : {}) };
  }
  // https only (plus a local Supabase emulator during development)
  if (!/^https:\/\//.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) return null;
  const bytes = await fetchBytes(url);
  const s = bytes ? imageSize(bytes) : null;
  if (!s) {
    warn(`couldn't measure ${url} — using 16:10 fallback size`);
    return { src: url, width: 1600, height: 1000 };
  }
  let small: Img["small"];
  if (s.width > 1000) {
    const su = smallName(url);
    const sb = su !== url ? await fetchBytes(su) : null;
    const ss = sb ? imageSize(sb) : null;
    if (ss) small = { src: su, ...ss };
  }
  return { src: url, ...s, ...(small ? { small } : {}) };
}

export async function measureAll(urls: string[], warn: (m: string) => void): Promise<Map<string, Img>> {
  const out = new Map<string, Img>();
  const list = [...new Set(urls.filter(Boolean))];
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      const u = list[i++];
      const m = await measureOne(u, warn);
      if (m) out.set(u, m);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return out;
}
