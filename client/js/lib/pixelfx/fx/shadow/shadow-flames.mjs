// Tongues built from nested layers, each narrower and shorter than the last, are adapted from Sprite Fusion's
// open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
// Here the layers run the other way: a pale skin outside, violet within, a black heart at the core.
import { cycle, fit, noise2, TAU, WHITE, mix } from "../../core/index.mjs";
import { VOID } from "./_lib.mjs";

export const meta = {
  name: "Shadow flames",
  desc: "Inside-out fire on the floor: a black heart wrapped in violet flame with pale skin and tips, shedding embers and dark smoke.",
  tags: ["shadow", "fire", "flame", "ground", "dark", "magic", "loop"],
  size: [104, 112],
  origin: [52, 102],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: VOID, seed: 12 },
};

const D = 2.4, GX = 22, GY = 60;
// tongues: offset, base height, width, seed; the middle tallest
const TONGUES = [[-11, 20, 4.2, 1], [11, 22, 4.4, 2], [-6, 31, 5.4, 3], [6, 29, 5.2, 4], [0, 40, 6.6, 5]];
// layers from the outside in: width share, height share, which tone (3 is the black heart)
const LAYERS = [[1, 1, 0], [0.8, 0.88, 1], [0.54, 0.68, 2], [0.32, 0.48, 3]];

// noise that comes back to where it started each loop: a circle through 2D noise, offset by v
const lnoise = (t, v, seed, speed = 5) => noise2(Math.cos((TAU * t) / D) * speed + v, Math.sin((TAU * t) / D) * speed, seed);

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed;
  // the scorched floor: a dark burn, violet light pooled on it
  p.ellipse(0, 0.5, 22, 3.2, (d) => (d < 0.6 ? C[0] : C[1]), (d) => (d < 0.85 ? 1 : (1 - d) * 6));
  p.glow(0, -2, 46, C[4], 0.3);
  // dark smoke climbing off the tips, a lit rim on its underside
  cycle(t, D, 14, S + 1, (r) => r.range(1.2, 1.9), (age, L, r) => {
    const u = age / L, x = r.range(-6, 6) + Math.sin(u * 4 + r.range(0, 6)) * 5 * u, y = -30 - u * r.range(36, 52), rad = 3 + u * 6;
    const a = Math.min(1, u * 6) * (1 - u) * 0.7;
    p.disc(x, y, rad, mix(mix(C[3], C[2], 0.5), C[1], u), a);
    p.disc(x - rad * 0.2, y - rad * 0.3, rad * 0.5, C[3], a * 0.4);
    p.disc(x, y + rad * 0.45, rad * 0.55, C[5], a * 0.45 * (1 - u));
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed, TONE = [C[6], C[4], C[2], C[0]];
  // rasterize the tongues, outermost first, into a grid of tones
  const grid = new Int8Array(GX * 2 * GY).fill(-1), set = (x, y, v) => {
    const i = Math.round(x) + GX, j = Math.round(y) + GY;
    if (i >= 0 && j >= 0 && i < GX * 2 && j < GY) grid[j * GX * 2 + i] = v;
  };
  const order = TONGUES.map((_, i) => i).sort((a, b) => Math.abs(TONGUES[b][0]) - Math.abs(TONGUES[a][0]));
  for (const i of order) {
    const [dx, H0, w, n] = TONGUES[i], h = H0 * (0.78 + 0.22 * lnoise(t, n * 3, n, 4)), sway = lnoise(t, n * 7, n + 9, 3) * 3;
    for (const [lw, lh, tone] of LAYERS) {
      const Hl = h * lh;
      for (let r = 0; r <= Hl; r++) {
        const u = r / Math.max(1, Hl);
        const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + lnoise(t, r * 0.45 + n, n + 20, 6) * 1.1 + lnoise(t, r * 1.3 + n * 5, n + 50, 9) * 0.6;
        const cx = dx + sway * u * u * lh + lnoise(t, r * 0.2 + n * 2, n + 30, 5) * u * 1.4;
        if (half < 0.3) continue;
        for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
          // the skin breaks up near the top: pixels flicker out of it
          if (tone === 0 && u > 0.45 && lnoise(t, x * 0.9 + r * 0.7 + n, n + 60, 8) > 0.35) continue;
          set(x, -r, tone);
        }
      }
    }
  }
  // draw it: the pale skin whitening to its tips, the black heart pure black
  for (let j = 0; j < GY; j++)
    for (let i = 0; i < GX * 2; i++) {
      const v = grid[j * GX * 2 + i];
      if (v < 0) continue;
      const x = i - GX, y = j - GY;
      let c = TONE[v];
      if (v === 0 && y < -24 && (grid[(j - 1) * GX * 2 + i] ?? -1) < 0) c = y < -32 ? WHITE : C[7];
      p.px(x + 0.5, y + 0.5, c);
    }
  // licks of pale flame breaking off the tips
  cycle(t, D, 34, S, (r) => r.range(0.25, 0.5), (age, L, r) => {
    const u = age / L, k = r.int(0, 4), [dx, H0] = TONGUES[k], x = dx + r.range(-4, 4) + u * r.range(-5, 5), y = -H0 * r.range(0.45, 0.85) - u * r.range(10, 20);
    const rad = r.range(1, 2.2) * (1 - u) + 0.3;
    p.circle(x, y, rad + 0.6, u < 0.5 ? C[6] : C[4]);
    if (rad > 1) p.circle(x, y + 0.4, rad * 0.5, u < 0.3 ? C[2] : C[4]);
  });
  // embers drifting up, flickering, cooling to violet
  cycle(t, D, 30, S + 2, (r) => r.range(1, 1.8), (age, L, r) => {
    const u = age / L, x = r.range(-12, 12) + Math.sin(u * 6 + r.range(0, 6)) * 5 * u, y = -10 - u * r.range(40, 70);
    if (u > 0.7 && Math.sin(age * 40 + x) < 0) return;
    p.px(x, y, u < 0.3 ? WHITE : u < 0.6 ? C[7] : C[6]);
    p.glow(x, y, 3, C[6], 0.35 * (1 - u));
  });
  // light: a violet bloom round it, but none on the black heart
  const fl = 0.85 + 0.15 * lnoise(t, 0, 77, 6);
  p.glow(0, -16, 52, C[4], 0.5 * fl);
  p.glow(0, -12, 26, C[6], 0.34 * fl);
  for (let j = 0; j < GY; j++)
    for (let i = 0; i < GX * 2; i++) if (grid[j * GX * 2 + i] === 3) {
      const sx = p.cellX(i - GX + 0.5, j - GY + 0.5) - p.ox, sy = p.cellY(i - GX + 0.5, j - GY + 0.5) - p.oy;
      if (sx >= 0 && sy >= 0 && sx < p.w && sy < p.h) p.L[sy * p.w + sx] = 0;
    }
}
