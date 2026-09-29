/** Zero-dependency static server for /dist (mirrors typical static-host behaviour). */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { DIST } from "./paths.js";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

const isFile = (p: string) => stat(p).then((s) => s.isFile(), () => false);

export function startServer(port: number): Promise<{ port: number; close: () => void }> {
  const server = createServer(async (req: any, res: any) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const path = normalize(decodeURIComponent(url.pathname));
      let file = join(DIST, path);
      if (!(await isFile(file))) file = join(DIST, path, "index.html");
      let status = 200;
      if (!(await isFile(file))) {
        file = join(DIST, "404.html");
        status = 404;
      }
      const body = await readFile(file);
      res.writeHead(status, {
        "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
        "Cache-Control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(body);
    } catch {
      res.writeHead(400);
      res.end("Bad request");
    }
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve({ port: server.address().port, close: () => server.close() }));
  });
}
