/**
 * Minimal Chrome DevTools Protocol client (no dependencies).
 * Launches headless Chrome and returns a connected page session.
 */
import { spawn } from "node:child_process";
import { findChrome } from "./chrome.js";

type Json = any;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r as () => void, ms));

export class CDP {
  private id = 0;
  private pending = new Map<number, (v: Json) => void>();
  private handlers: ((m: Json) => void)[] = [];
  constructor(private ws: WebSocket) {
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg.error ? { __error: msg.error } : msg.result);
        this.pending.delete(msg.id);
      } else this.handlers.forEach((h) => h(msg));
    };
  }
  static connect(url: string): Promise<CDP> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new CDP(ws));
      ws.onerror = reject;
    });
  }
  send(method: string, params: Json = {}): Promise<Json> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((r) => this.pending.set(id, r));
  }
  on(fn: (m: Json) => void) {
    this.handlers.push(fn);
  }
  async eval<T = Json>(expr: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.__error) throw new Error(r.__error.message);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || "eval failed");
    return r.result?.value as T;
  }
  close() {
    this.ws.close();
  }
}

export interface Browser {
  page: CDP;
  close: () => void;
}

export async function launch(port = 9333): Promise<Browser> {
  const chrome = spawn(await findChrome(), [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-proxy-server",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/ritl-cdp-${port}`,
    "about:blank",
  ]);
  let targets: Json[] = [];
  for (let i = 0; i < 60 && !targets.length; i++) {
    await sleep(200);
    try {
      targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t: Json) => t.type === "page");
    } catch {
      /* not up yet */
    }
  }
  if (!targets.length) throw new Error("Chrome did not start");
  const page = await CDP.connect(targets[0].webSocketDebuggerUrl);
  await page.send("Runtime.enable");
  await page.send("Page.enable");
  return {
    page,
    close: () => {
      page.close();
      chrome.kill("SIGKILL");
    },
  };
}
