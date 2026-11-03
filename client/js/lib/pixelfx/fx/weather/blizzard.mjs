// Snow driven near-flat by the wind (depth layers of streaks, a gusty wind) after Sprite Fusion's open-source snow
// (https://www.spritefusion.com/pixel-art-vfx/snow), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, smooth, rand, wrap, mix, TAU, WHITE } from "../../core/index.mjs";
import { clip, rows, field, sample, trips } from "./_lib.mjs";

export const meta = {
  name: "Blizzard",
  desc: "Snow driven almost flat by a gale: streaks at three depths race past, gusts throw translucent sheets of snow across the sky and spindrift streams off the drifts.",
  tags: ["weather", "blizzard", "snow", "wind", "storm", "winter", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 170],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#0d111f", "#182035", "#27324d", "#3e4d6e", "#64779c", "#9cb0d0", "#d8e4f6", "#ffffff"],
    seed: 9,
  },
};

const D = 8;
// gusts: waves of wind rolling left to right, a whole number a loop
const gustAt = (x, t) => 0.5 + 0.5 * Math.sin(TAU * ((x + 160) / 400 - (2 * t) / D) + 0.8);
const bank = (x) => -2 + 1.2 * Math.sin(x * 0.05 + 2) + 0.8 * Math.sin(x * 0.15 + 1);
// far to near: how many, crossings a loop, streak length, fall while crossing, colors (tail, body, head)
const LAYERS = [
  { n: 240, m: [3, 4], len: [2, 4], drop: [10, 40], col: [3, 4, 5] },
  { n: 130, m: [4, 5], len: [5, 8], drop: [20, 60], col: [4, 5, 6] },
  { n: 34, m: [6, 7], len: [10, 16], drop: [30, 70], col: [4, 6, 7], near: true },
];

export function drawBack(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 8);
  sheets(p, t, S, C, 0);
  streaks(q, t, S, C, 0);
  streaks(q, t, S, C, 1);
  ground(p, q, t, S, C);
}

export function draw(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 8);
  sheets(p, t, S, C, 1);
  streaks(q, t, S, C, 2);
}

// streaks: each slot crosses the canvas a whole number of times a loop at its own height, dipping as it goes;
// the gusts stretch and brighten it
function streaks(q, t, S, C, L) {
  const Ly = LAYERS[L], sd = S * 17 + L, [c0, c1, c2] = Ly.col.map((i) => C[i]);
  trips(t, D, Ly.n, sd, Ly.m[0], Ly.m[1], (u, k, m, i) => {
    const j = wrap(k, m), R = (n) => rand(sd, i, j, n), drop = Ly.drop[0] + R(3) * (Ly.drop[1] - Ly.drop[0]);
    const x = -190 + 380 * u, y = -178 + R(1) * 182 + drop * u + 3 * Math.sin(u * TAU * (1 + R(5)) + R(6) * 6);
    if (y > bank(x) - 1) return;
    const g = gustAt(x, t);
    // between gusts the far snow thins out; in a gust it's everywhere
    if (!Ly.near && R(7) > 0.45 + 0.75 * g) return;
    const L = (Ly.len[0] + R(2) * (Ly.len[1] - Ly.len[0])) * (0.7 + 0.6 * g), dx = 380 / (D / m), dy = drop / (D / m), l = Math.hypot(dx, dy);
    const ux = dx / l, uy = dy / l;
    q.line(x - ux * L, y - uy * L, x - ux * L * 0.45, y - uy * L * 0.45, c0, (v) => 0.3 + 0.7 * v);
    q.line(x - ux * L * 0.45, y - uy * L * 0.45, x - ux, y - uy, c1);
    q.px(x, y, g > 0.6 && Ly.near ? WHITE : c2);
    if (Ly.near) q.glow(x, y, 5, C[5], 0.12 + 0.12 * g);
  });
}

// sheets of blown snow: long thin translucent bands racing with the wind, thick in a gust and thin between
const GX = new Float32Array(320), WV = new Float32Array(320);
function sheets(p, t, S, C, near) {
  const F = field(S * 3 + 7 + near, 256, 128), shift = (256 * (near ? 3 : 2) * t) / D, c = near ? C[6] : C[5], y0 = near ? -110 : -170, haze = mix(C[2], C[3], 0.5);
  const sy = near ? 4.5 : 3.2, th = near ? 0.58 : 0.54;
  for (let i = 0; i < 320; i++) (GX[i] = gustAt(i - 160 + 0.5, t)), (WV[i] = 5 * Math.sin((i - 160) * 0.021 - (TAU * t) / D + near * 2));
  rows(p, meta, y0, 4, (y, R) => {
    const fade = near ? smooth(-110, -40, y) : 1;
    for (let i = 0; i < 320; i++) {
      const g = GX[i], n = sample(F, (i - 160) * 0.16 - shift, (y + WV[i]) * sy + 40), d = (n - th) * 2.2 * (0.35 + g) * fade;
      // the far pass is also the whiteout haze behind everything, thicker in a gust
      if (near) {
        if (d <= 0.02) continue;
        R.c[i] = c;
        R.a[i] = Math.min(0.5, d);
      } else {
        R.c[i] = d > 0.08 ? c : haze;
        R.a[i] = 0.3 + 0.12 * g + Math.min(0.42, Math.max(0, d));
      }
      R.b[i] = 1;
      if (d > 0.05) (R.l[i] = C[5]), (R.k[i] = d * 0.08);
    }
  });
}

// the ground: a low drift with a white crest, spindrift streaming low along it, plumes blown off the crest
function ground(p, q, t, S, C) {
  const F = field(S * 5 + 1, 256, 128), shift = (256 * 4 * t) / D;
  for (let i = 0; i < 320; i++) (GX[i] = gustAt(i - 160 + 0.5, t)), (WV[i] = bank(i - 160 + 0.5));
  rows(p, meta, -16, 9, (y, R) => {
    for (let i = 0; i < 320; i++) {
      const x = i - 160 + 0.5, top = WV[i], d = y - top;
      if (d >= 0) {
        R.c[i] = d < 1 ? WHITE : d < 2 ? C[6] : d < 4 ? C[5] : C[4];
        if (d < 1) (R.l[i] = C[6]), (R.k[i] = 0.1);
        continue;
      }
      // spindrift: a low, fast, streaky haze hugging the drift
      if (y < -14) continue;
      const n = sample(F, x * 0.5 - shift, y * 3 + 9), s = (n - 0.5) * 3 * smooth(-14, -1, y) * (0.4 + GX[i]);
      if (s > 0.02) (R.c[i] = C[6]), (R.a[i] = Math.min(0.55, s)), (R.b[i] = 1);
    }
  });
  // grains skipping along the crest
  trips(t, D, 40, S * 23, 8, 10, (u, k, m, i) => {
    const j = wrap(k, m), x = -175 + 350 * u, y = bank(x) - 1 - rand(S, i, j, 1) * 6 * Math.abs(Math.sin(u * 9 + i));
    q.px(x, y, rand(S, i, j, 2) < 0.5 ? WHITE : C[6]);
    q.px(x - 1, y, C[5]);
  });
}
