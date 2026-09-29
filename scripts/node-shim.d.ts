/**
 * Minimal Node.js ambient types for the build scripts.
 * (Keeps the project dependency-free — swap for `@types/node` any time.)
 */
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exitCode?: number;
  exit(code?: number): never;
  cwd(): string;
  platform: string;
};
declare const console: {
  log(...a: unknown[]): void;
  warn(...a: unknown[]): void;
  error(...a: unknown[]): void;
};
declare function setTimeout(cb: (...a: unknown[]) => void, ms?: number): unknown;
declare function fetch(
  url: string,
  init?: { redirect?: string; method?: string }
): Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;
declare class WebSocket {
  constructor(url: string);
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
}
interface ImportMeta {
  url: string;
}
declare class URL {
  constructor(url: string, base?: string);
  pathname: string;
  href: string;
}
declare const Buffer: {
  from(data: string | Uint8Array, enc?: string): Uint8Array & { toString(enc?: string): string };
  byteLength(s: string): number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "node:fs/promises" {
  export const readFile: (p: string, enc?: any) => Promise<any>;
  export const writeFile: (p: string, data: any) => Promise<void>;
  export const mkdir: (p: string, o?: any) => Promise<void>;
  export const readdir: (p: string, o?: any) => Promise<any[]>;
  export const cp: (a: string, b: string, o?: any) => Promise<void>;
  export const rm: (p: string, o?: any) => Promise<void>;
  export const stat: (p: string) => Promise<{ isDirectory(): boolean; isFile(): boolean; size: number }>;
  export const access: (p: string) => Promise<void>;
}
declare module "node:path" {
  export const join: (...p: string[]) => string;
  export const resolve: (...p: string[]) => string;
  export const dirname: (p: string) => string;
  export const extname: (p: string) => string;
  export const relative: (a: string, b: string) => string;
  export const basename: (p: string, ext?: string) => string;
  export const normalize: (p: string) => string;
  export const sep: string;
}
declare module "node:http" {
  export const createServer: (handler: (req: any, res: any) => void) => any;
}
declare module "node:url" {
  export const fileURLToPath: (u: string) => string;
  export const pathToFileURL: (p: string) => { href: string };
}
declare module "node:child_process" {
  export const spawnSync: (cmd: string, args: string[], o?: any) => { status: number | null; stdout: any; stderr: any };
  export const spawn: (cmd: string, args: string[], o?: any) => { kill(sig?: string): void; on(ev: string, fn: (...a: any[]) => void): void };
}
declare module "node:crypto" {
  export const createHash: (alg: string) => { update(d: any): any; digest(enc: string): string };
}
declare module "node:zlib" {
  export const gzipSync: (d: any) => { length: number };
}
