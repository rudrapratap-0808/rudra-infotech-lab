/**
 * Minimal Node.js ambient types for the build scripts (web-standard globals such as
 * fetch, URL, console and timers come from the DOM lib in tsconfig.json).
 * Keeps the project dependency-free — swap for `@types/node` any time.
 */
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exitCode?: number;
  exit(code?: number): never;
  cwd(): string;
  platform: string;
  pid: number;
  on(ev: string, fn: (...a: any[]) => void): void;
  stdout: { write(s: string): void };
};
interface NodeBuffer extends Uint8Array {
  toString(enc?: string): string;
}
declare const Buffer: {
  from(data: string | Uint8Array | ArrayBuffer, enc?: string): NodeBuffer;
  byteLength(s: string): number;
  concat(list: Uint8Array[]): NodeBuffer;
  alloc(n: number): NodeBuffer;
  isBuffer(v: unknown): boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "node:fs/promises" {
  export const readFile: (p: string, enc?: any) => Promise<any>;
  export const writeFile: (p: string, data: any) => Promise<void>;
  export const appendFile: (p: string, data: any) => Promise<void>;
  export const mkdir: (p: string, o?: any) => Promise<void>;
  export const readdir: (p: string, o?: any) => Promise<any[]>;
  export const cp: (a: string, b: string, o?: any) => Promise<void>;
  export const copyFile: (a: string, b: string) => Promise<void>;
  export const rename: (a: string, b: string) => Promise<void>;
  export const rm: (p: string, o?: any) => Promise<void>;
  export const unlink: (p: string) => Promise<void>;
  export const stat: (p: string) => Promise<{ isDirectory(): boolean; isFile(): boolean; size: number; mtimeMs: number }>;
  export const access: (p: string) => Promise<void>;
}
declare module "node:fs" {
  export const existsSync: (p: string) => boolean;
  export const mkdirSync: (p: string, o?: any) => void;
  export const writeFileSync: (p: string, d: any) => void;
  export const readFileSync: (p: string, enc?: any) => any;
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
  export const spawn: (
    cmd: string,
    args: string[],
    o?: any
  ) => { pid?: number; kill(sig?: string): void; on(ev: string, fn: (...a: any[]) => void): void; stdout: any; stderr: any };
}
declare module "node:crypto" {
  export const createHash: (alg: string) => { update(d: any): any; digest(enc?: string): any };
  export const createHmac: (alg: string, key: any) => { update(d: any): any; digest(enc?: string): any };
  export const randomBytes: (n: number) => NodeBuffer;
  export const randomUUID: () => string;
  export const scryptSync: (pw: string, salt: string, len: number) => NodeBuffer;
  export const timingSafeEqual: (a: Uint8Array, b: Uint8Array) => boolean;
}
declare module "node:zlib" {
  export const gzipSync: (d: any) => { length: number };
}
declare module "node:net" {
  export const createServer: (...a: any[]) => any;
}
