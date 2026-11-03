// The soft lit smoke puffs and the shaded, outlined skull are
// adapted from Sprite Fusion's open-source poison (https://www.spritefusion.com/pixel-art-vfx/poison),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, rand, clamp, luma, mix, smooth, tileFbm, TAU } from "../../core/index.mjs";
import { shape, colorAt, eyes, icon, bitmap } from "./_lib.mjs";

export const meta = {
  name: "Cursed",
  desc: "Hexed: violet smoke rises off the body in winding trails, a dark stain creeps up from the feet with a glowing edge, the eyes burn, a skull glitches in overhead.",
  tags: ["status", "curse", "hex", "dark", "debuff", "shadow", "loop"],
  size: [64, 84],
  origin: [32, 76],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#0c0612", "#1f0f2e", "#3a1a55", "#5e2a85", "#8a3fc0", "#b86ef0", "#e0b0ff", "#ffffff"], seed: 9 },
};

const HUNCH = { turn: 1, crouch: 4, lean: 3, hy: 1, fx: -7, fy: -33, bx: 8, by: -33, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [[0, HUNCH], [0.6, { ...HUNCH, crouch: 5 }], [1.2, { ...HUNCH, lean: 2 }], [1.8, { ...HUNCH, crouch: 5 }], [2.4, HUNCH]],
};

const D = meta.duration;
const SKULL = bitmap([
  "...#####...",
  ".#########.",
  "###########",
  "##eee#eee##",
  "##eEe#eEe##",
  "##eee#eee##",
  "#####.#####",
  ".####.####.",
  "..#######..",
  "..#.#.#.#..",
  "...#####...",
]);
// the skull's life in the loop: hidden, glitching in, hanging there, glitching out
const IN = 0.5, HOLD = 0.75, OUT = 1.85, GONE = 2.1;

// how high the stain has crept at column x (0 at the feet, 1 at the head), a slow tide with crawling tendrils
const tide = (t) => 0.3 + 0.12 * Math.sin((t / D) * TAU);
const reach = (x, t, seed) => tide(t) + 0.13 * tileFbm(x * 0.35, (t / D) * 4, 0, 4, seed, 2);

// smoke trails: each rises from a spot on the body as a ribbon of soft puffs that wind as they climb, swell, cool
// and thin
function trails(p, C, a, S, t, seed, front) {
  const spots = [[0.12, -1], [0.1, 1], [0.5, -1], [0.48, 1]];
  spots.forEach(([q, side], j) => {
    if ((j % 2 === 0) !== front) return;
    const my = Math.round(S.h * q), [l, r] = S.rows[my] ?? [0, 0];
    const x0 = a.x + (side < 0 ? l : r + 1), y0 = a.y + my, life = 1.6, n = 18;
    for (let i = n - 1; i >= 0; i--) {
      const age = (((t - (i / n) * D - j * 0.37) % D) + D) % D, tb = t - age, u = age / life;
      if (u >= 1) continue;
      const sway = Math.sin((tb / D) * TAU * 2 + j * 1.7) * 4 * Math.min(1, u * 1.6);
      const x = x0 + side * u * 7 + sway + (rand(i, j, 71) - 0.5) * 2.5 * u, y = y0 - age * 19 - 5 * u * u;
      const rad = (1.3 + 3.6 * (1 - Math.pow(1 - u, 3))) * (0.7 + 0.6 * rand(i, j, 72)), k = smooth(0, 0.12, u) * (1 - smooth(0.45, 1, u)) * (front ? 0.5 : 0.62);
      const c = mix(rand(i, j, 70) < 0.5 ? C[4] : mix(C[4], C[3], 0.4), C[1], u * 0.85);
      p.disc(x, y, rad * 1.08, c, k * 0.4);
      p.disc(x + rad * 0.05, y + rad * 0.08, rad * 0.76, c, k * 0.55);
      p.disc(x - rad * 0.22, y - rad * 0.3, rad * 0.48, mix(c, C[6], 0.25), k * 0.38 * (1 - u * 0.6));
      if (i % 3 === 0) p.glow(x, y, rad * 1.6, C[4], 0.08 * k);
    }
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a);
  // the stain pooling round the feet, its rim glowing
  const [fl, fr] = S.rows[S.h - 1], cx = a.x + (fl + fr + 1) / 2, rx = (fr - fl) / 2 + 7 + 2 * Math.sin((t / D) * TAU);
  for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const q = Math.abs(x + 0.5 - cx) / rx, n = rand(x, 31);
    if (q > 1 + n * 0.12) continue;
    p.px(x, 0, q > 0.8 ? C[4] : n < 0.2 ? C[3] : C[2]);
    if (q < 0.85) p.px(x, 1, C[1]);
    if (q < 0.55 && n < 0.7) p.px(x, 2, C[1]);
  }
  p.shade(cx - rx - 6, -4, cx + rx + 6, 5, (x, y, out) => {
    const d = Math.hypot((x - cx) / (rx + 6), y / 4);
    if (d < 1) (out.l = C[4]), (out.k = 0.2 * (1 - d) * (1 - d));
  });
  trails(p, C, a, S, t, o.seed, false);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a), H = S.h;
  // the stain on the body: everything below the creeping line drowned in violet, the line itself burning
  for (const [mx, my] of S.body) {
    const c = colorAt(a, mx, my), up = 1 - (my + 0.5) / H, lv = reach(mx, t, o.seed);
    if (up > lv + 0.035) continue;
    const x = a.x + mx, y = a.y + my;
    if (up > lv - 0.02) p.px(x, y, C[6]);
    else if (up > lv - 0.06) p.px(x, y, C[4]);
    else p.px(x, y, mix(C[1], C[3], clamp(luma(c) * 1.6)));
  }
  for (let mx = 0; mx < S.w; mx++) {
    const lv = reach(mx, t, o.seed), my = Math.floor((1 - lv) * H);
    if (S.on(mx, my)) p.glow(a.x + mx, a.y + my, 4, C[5], 0.14);
  }
  // the eyes burn
  for (const e of eyes(a)) {
    for (const [x, y] of e.px) p.px(a.x + x, a.y + y, y === e.y0 ? C[7] : C[5]);
    p.glow(a.x + (e.x0 + e.x1 + 1) / 2, a.y + (e.y0 + e.y1 + 1) / 2, 5, C[5], 0.4);
  }
  trails(p, C, a, S, t, o.seed, true);
  // the skull glitches in, hangs there bobbing, and glitches out
  if (t >= IN && t < GONE) {
    const glitch = t < HOLD ? 1 - (t - IN) / (HOLD - IN) : t > OUT ? (t - OUT) / (GONE - OUT) : 0;
    const f = Math.floor(t * 30), on = glitch < 0.15 || rand(f, 3) > glitch * 0.6;
    const x = 0, y = a.y - 12 + Math.sin((t / D) * TAU * 2) * 1.2;
    if (on) {
      const tear = (dx, dy) => {
        const row = dy + 6, shift = glitch > 0 && rand(f, row >> 1, 7) < glitch * 0.8 ? Math.round((rand(f, row, 9) - 0.5) * 6 * glitch) : 0;
        return SKULL(dx - shift, dy);
      };
      if (glitch > 0) {
        icon(p, x - 2, y, 7, tear, [0, C[2], C[2], C[3]], 0.7 * glitch);
        icon(p, x + 2, y, 7, tear, [0, C[6], C[6], C[6]], 0.5 * glitch);
      }
      icon(p, x, y, 8, tear, [C[0], C[4], C[6], C[7]], 1, { e: C[0], E: C[7] });
      p.glow(x - 3, y - 1, 5, C[5], 0.6);
      p.glow(x + 3, y - 1, 5, C[5], 0.6);
      p.glow(x, y, 16, C[4], 0.24 + 0.3 * glitch);
    }
    // scanlines fizzing as it comes and goes
    if (glitch > 0.1)
      for (let k = 0; k < 3; k++) {
        const ly = y - 5 + Math.floor(rand(f, k, 11) * 11), lx = Math.round((rand(f, k, 12) - 0.5) * 10), len = 3 + Math.floor(rand(f, k, 13) * 8);
        p.line(lx - len / 2, ly, lx + len / 2, ly, k % 2 ? C[6] : C[4], glitch);
      }
  }
  p.glow(0, a.y + H * (1 - tide(t)), 24, C[4], 0.2);
  p.glow(0, a.y + H * 0.45, 30, C[3], 0.12);
}
