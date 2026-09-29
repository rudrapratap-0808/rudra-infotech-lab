/**
 * Hero "lab grid": a field of dots on springs that bends around the pointer,
 * draws a live wire-mesh near it, and emits occasional signal pings.
 * - Pauses when off-screen or the tab is hidden.
 * - Auto-pilots a virtual pointer on touch devices / when idle.
 * - Renders a single static frame for reduced-motion users.
 */
import { reducedMotion } from "../lib/dom.js";

const INK: [number, number, number] = [239, 235, 228];
const EMBER: [number, number, number] = [255, 107, 44];

const mix = (t: number) =>
  `${Math.round(INK[0] + (EMBER[0] - INK[0]) * t)},${Math.round(INK[1] + (EMBER[1] - INK[1]) * t)},${Math.round(
    INK[2] + (EMBER[2] - INK[2]) * t
  )}`;

interface Ping {
  x: number;
  y: number;
  t0: number;
}

export function initHeroCanvas(canvas: HTMLCanvasElement, hero: HTMLElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let gap = 34;
  let cols = 0;
  let rows = 0;
  let pts = new Float32Array(0); // bx, by, x, y, vx, vy
  let R = 180;

  const pointer = { x: -9999, y: -9999, sx: -9999, sy: -9999, real: false, last: 0 };
  const pings: Ping[] = [];
  let lastPing = 0;
  let running = false;
  let visible = true;
  let raf = 0;
  const start = performance.now();

  const build = () => {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gap = w < 720 ? 28 : 34;
    R = w < 720 ? 120 : 190;
    cols = Math.ceil(w / gap) + 1;
    rows = Math.ceil(h / gap) + 1;
    const ox = (w - (cols - 1) * gap) / 2;
    const oy = (h - (rows - 1) * gap) / 2;
    pts = new Float32Array(cols * rows * 6);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 6;
        pts[i] = pts[i + 2] = ox + c * gap;
        pts[i + 1] = pts[i + 3] = oy + r * gap;
      }
    }
  };

  /** Virtual pointer path (Lissajous) used when nobody is interacting. */
  const autopilot = (t: number) => {
    const s = t / 1000;
    pointer.x = w * (0.62 + 0.26 * Math.sin(s * 0.33));
    pointer.y = h * (0.46 + 0.28 * Math.sin(s * 0.47 + 1.2));
  };

  const draw = (now: number, animate: boolean) => {
    ctx.clearRect(0, 0, w, h);
    const t = now - start;

    if (animate) {
      if (!pointer.real || now - pointer.last > 3500) {
        pointer.real = false;
        autopilot(t);
      }
      const k = pointer.sx < -1000 ? 1 : 0.12;
      pointer.sx += (pointer.x - pointer.sx) * k;
      pointer.sy += (pointer.y - pointer.sy) * k;
    }
    const px = pointer.sx;
    const py = pointer.sy;
    const R2 = R * R;

    // Scan wave: a soft diagonal band sweeping every ~9s
    const period = 9000;
    const wave = ((t % period) / period) * (w + h + 600) - 300;

    // 1) Physics + base dots (one batched path)
    ctx.beginPath();
    const active: number[] = [];
    for (let i = 0; i < pts.length; i += 6) {
      let x = pts[i + 2];
      let y = pts[i + 3];
      if (animate) {
        const dx = x - px;
        const dy = y - py;
        const d2 = dx * dx + dy * dy;
        let vx = pts[i + 4];
        let vy = pts[i + 5];
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / R) ** 2 * 2.4;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }
        vx += (pts[i] - x) * 0.055;
        vy += (pts[i + 1] - y) * 0.055;
        vx *= 0.8;
        vy *= 0.8;
        x += vx;
        y += vy;
        pts[i + 2] = x;
        pts[i + 3] = y;
        pts[i + 4] = vx;
        pts[i + 5] = vy;
      }
      const dx = x - px;
      const dy = y - py;
      const d2 = dx * dx + dy * dy;
      const band = Math.abs(pts[i] + pts[i + 1] * 0.6 - wave);
      if (d2 < R2 || band < 90) active.push(i);
      else ctx.rect(x - 0.6, y - 0.6, 1.2, 1.2);
    }
    ctx.fillStyle = "rgba(239,235,228,0.14)";
    ctx.fill();

    // 2) Mesh lines near the pointer
    ctx.lineWidth = 1;
    for (const i of active) {
      const x = pts[i + 2];
      const y = pts[i + 3];
      const d = Math.hypot(x - px, y - py);
      if (d > R) continue;
      const p = 1 - d / R;
      const idx = i / 6;
      const c = idx % cols;
      const neighbours = [c < cols - 1 ? i + 6 : -1, i + cols * 6 < pts.length ? i + cols * 6 : -1];
      for (const j of neighbours) {
        if (j < 0) continue;
        const nd = Math.hypot(pts[j + 2] - px, pts[j + 3] - py);
        if (nd > R) continue;
        const a = Math.min(p, 1 - nd / R) * 0.42;
        ctx.strokeStyle = `rgba(${mix(Math.min(1, p * 1.3))},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(pts[j + 2], pts[j + 3]);
        ctx.stroke();
      }
    }

    // 3) Highlighted dots (pointer proximity + scan band)
    for (const i of active) {
      const x = pts[i + 2];
      const y = pts[i + 3];
      const d = Math.hypot(x - px, y - py);
      const p = d < R ? 1 - d / R : 0;
      const band = Math.max(0, 1 - Math.abs(pts[i] + pts[i + 1] * 0.6 - wave) / 90);
      const a = 0.14 + p * 0.75 + band * 0.22;
      const s = 1.2 + p * 1.8 + band * 0.4;
      ctx.fillStyle = `rgba(${mix(p)},${Math.min(1, a).toFixed(3)})`;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }

    // 4) Crosshair + coordinates for real pointers
    if (pointer.real && animate) {
      ctx.strokeStyle = "rgba(239,235,228,0.06)";
      ctx.beginPath();
      ctx.moveTo(0, py + 0.5);
      ctx.lineTo(w, py + 0.5);
      ctx.moveTo(px + 0.5, 0);
      ctx.lineTo(px + 0.5, h);
      ctx.stroke();
      ctx.fillStyle = "rgba(142,140,147,0.9)";
      ctx.font = '10px "Geist Mono", ui-monospace, monospace';
      ctx.fillText(`X ${String(Math.round(px)).padStart(4, "0")}  Y ${String(Math.round(py)).padStart(4, "0")}`, px + 14, py - 12);
    }

    // 5) Signal pings
    if (animate) {
      if (now - lastPing > 1100 && pts.length) {
        lastPing = now;
        const i = Math.floor(Math.random() * (pts.length / 6)) * 6;
        pings.push({ x: pts[i], y: pts[i + 1], t0: now });
      }
      for (let k = pings.length - 1; k >= 0; k--) {
        const pg = pings[k];
        const life = (now - pg.t0) / 1800;
        if (life >= 1) {
          pings.splice(k, 1);
          continue;
        }
        const e = 1 - (1 - life) ** 3;
        ctx.strokeStyle = `rgba(255,107,44,${(0.5 * (1 - life)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pg.x, pg.y, 2 + e * 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,140,90,${(0.9 * (1 - life)).toFixed(3)})`;
        ctx.fillRect(pg.x - 1.5, pg.y - 1.5, 3, 3);
      }
    }
  };

  const loop = (now: number) => {
    draw(now, true);
    raf = requestAnimationFrame(loop);
  };
  const play = () => {
    if (running || reducedMotion() || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  build();
  if (reducedMotion()) {
    pointer.sx = pointer.sy = -9999;
    draw(performance.now(), false);
  } else play();
  hero.classList.add("is-live");

  // Pointer tracking (only while over the hero)
  hero.addEventListener(
    "pointermove",
    (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.real = e.pointerType === "mouse";
      pointer.last = performance.now();
    },
    { passive: true }
  );
  hero.addEventListener("pointerleave", () => {
    pointer.real = false;
    pointer.last = 0;
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? play() : pause();
  }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));

  let lastW = innerWidth;
  addEventListener("resize", () => {
    // Ignore mobile URL-bar height jitter; rebuild on width changes.
    if (Math.abs(innerWidth - lastW) < 2 && Math.abs(canvas.getBoundingClientRect().height - h) < 120) return;
    lastW = innerWidth;
    build();
    if (!running) draw(performance.now(), false);
  });
}
