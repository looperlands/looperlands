// The firefly (a wandering point that glows up and fades on its own rhythm, close ones drawn with a dark body,
// beating wings and a lantern that throws a big soft light, grass blades swaying underneath) is adapted from
// Sprite Fusion's open-source fireflies (https://www.spritefusion.com/pixel-art-vfx/fireflies), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rand, mix, TAU, WHITE, loopNoise } from "../../core/index.mjs";
import { clip, rows } from "./_lib.mjs";

export const meta = {
  name: "Fireflies",
  desc: "Fireflies wander over a meadow at night, each glowing up and fading on its own rhythm, trailing light and lighting the grass tips beneath them.",
  tags: ["weather", "fireflies", "night", "glow", "meadow", "nature", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 170],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#2a3a10", "#5a7a1a", "#9ad02a", "#d6ff5a", "#f4ffb8", "#ffffff"],
    grass: ["#070f0b", "#0c1a12", "#13281a", "#1d3a24", "#2b5232", "#3f6e40"],
    seed: 2,
  },
};

const D = 12, cyc = (t, n, ph = 0) => (TAU * n * t) / D + ph;

// a firefly's path and glow, both whole cycles a loop. depth 0 far .. 2 near
function fly(S, i, t) {
  const R = (n) => rand(S, i, n), depth = i < 14 ? 0 : i < 26 ? 1 : 2, k = [0.5, 0.8, 1][depth];
  const cx = -150 + R(1) * 300, cy = -16 - R(2) * (depth === 2 ? 70 : 130);
  const ax = (14 + R(3) * 26) * k, ay = (8 + R(4) * 14) * k, n1 = 1 + Math.floor(R(5) * 2), n2 = 1 + Math.floor(R(6) * 3);
  const pos = (tt) => [
    cx + ax * Math.sin(cyc(tt, n1, R(7) * TAU)) + 10 * k * loopNoise(tt / D, 1.5, i * 3),
    cy + ay * Math.sin(cyc(tt, n2, R(8) * TAU)) + 6 * k * loopNoise(tt / D, 1.5, i * 3 + 1),
  ];
  // its rhythm: a quick rise, a hold, a slow fade, dark; some flash twice
  const per = D / (3 + Math.floor(R(9) * 4)), u = (((t / per + R(10)) % 1) + 1) % 1, two = R(11) < 0.35;
  const pulse = (v) => (v < 0.06 ? v / 0.06 : v < 0.14 ? 1 : v < 0.4 ? 1 - (v - 0.14) / 0.26 : 0);
  const glow = Math.max(pulse(u), two ? pulse(u - 0.22) * 0.8 : 0);
  return { pos, depth, glow, R };
}

export function drawBack(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 6), G = fit(o.grass, 6);
  // a cool night haze, so the sky's stars don't read as fireflies
  rows(p, meta, -170, 9, (y, R) => {
    const k = (y + 170) / 180;
    R.c.fill(mix(G[0], G[1], k));
    R.a.fill(0.48 + 0.14 * k);
    R.b.fill(1);
  });
  const flies = Array.from({ length: 32 }, (_, i) => fly(S, i, t));
  grass(q, t, S, G, C, flies, false);
  for (const f of flies) if (f.depth < 2) firefly(q, t, f, C);
}

export function draw(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 6), G = fit(o.grass, 6);
  const flies = Array.from({ length: 32 }, (_, i) => fly(S, i, t));
  grass(q, t, S, G, C, flies, true);
  for (const f of flies) if (f.depth === 2) firefly(q, t, f, C);
}

function firefly(q, t, f, C) {
  const [x, y] = f.pos(t), g = f.glow, X = Math.round(x), Y = Math.round(y);
  if (f.depth === 0) {
    if (g < 0.08) return;
    q.dot(X, Y, g > 0.6 ? C[4] : C[3], Math.min(1, g * 1.6));
    q.glow(x, y, 6, C[2], 0.45 * g);
    return;
  }
  // a short trail of light where it has just been, while it's lit
  if (g > 0.3)
    for (let j = 1; j <= 4; j++) {
      const [tx, ty] = f.pos(t - j * 0.05);
      q.dot(tx, ty, C[2], (g - 0.3) * (1 - j / 5) * 1.3);
    }
  if (f.depth === 1) {
    q.px(X, Y, g > 0.5 ? C[5] : g > 0.15 ? C[3] : C[1]);
    if (g > 0.4) q.px(X, Y + 1, C[2]);
    q.glow(x, y, 9, C[2], 0.5 * g);
    q.glow(x, y, 3, C[4], 0.5 * g);
    return;
  }
  // a close one: a dark body, wings a blur above it, a lantern at its tail; a glint at the peak
  const [nx] = f.pos(t + 0.05), dir = nx >= x ? 1 : -1, beat = Math.floor(t * 30) % 2;
  q.px(X + dir, Y, C[0]);
  q.px(X + dir * 2, Y, C[0]);
  q.dot(X, Y - 1 - beat, mix(C[1], WHITE, 0.4), 0.7);
  q.dot(X + dir, Y - 1 - beat, mix(C[1], WHITE, 0.4), 0.7);
  q.px(X, Y, g > 0.3 ? C[5] : C[1]);
  q.px(X - dir, Y, g > 0.5 ? C[4] : g > 0.15 ? C[3] : C[1]);
  if (g > 0.6) q.px(X - dir, Y + 1, C[3]);
  if (g > 0.7) for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) q.dot(X - dir + dx, Y + dy, C[3], (g - 0.7) * 3);
  q.glow(x, y, 28, C[2], 0.45 * g);
  q.glow(x, y, 10, C[4], 0.5 * g);
  q.glow(x, y, 4, C[5], 0.5 * g);
}

// the meadow: blades in two rows (the front row drawn over the low fireflies), swaying as the breeze rolls
// across, a few seed heads; blade tips near a lit firefly catch its light
function grass(q, t, S, G, C, flies, front) {
  const lit = flies.filter((f) => f.glow > 0.25 && f.depth > 0).map((f) => [...f.pos(t), f.glow]);
  const n = front ? 150 : 230;
  for (let i = 0; i < n; i++) {
    const R = (k) => rand(S * 3 + (front ? 1 : 0), i, k), x = -162 + (i + R(1)) * (324 / n), h = (front ? 4 : 5) + R(2) * (front ? 8 : 11) + (R(3) < 0.1 ? 6 : 0);
    const base = (front ? 9 : 2) - R(4) * 3, sway = (1.2 + R(5)) * Math.sin(cyc(t, 2, -x * 0.03) + R(6)) + 0.6 * Math.sin(cyc(t, 5, x * 0.07));
    const tone = front ? 1 + Math.floor(R(7) * 3) : 1 + Math.floor(R(7) * 2);
    let tipLight = 0;
    for (const [fx, fy, g] of lit) {
      const d = Math.hypot(fx - (x + sway), fy - (base - h));
      if (d < 28) tipLight = Math.max(tipLight, g * (1 - d / 28));
    }
    for (let r = 0; r < h; r++) {
      const u = r / h, c = u > 0.8 && tipLight > 0.2 ? (tipLight > 0.55 && u > 0.9 ? C[3] : C[2]) : u > 0.7 ? G[Math.min(5, tone + 1)] : G[tone];
      q.px(x + sway * u * u, base - r, c);
    }
    if (R(8) < 0.07) {
      const sx = x + sway, sy = base - h;
      q.px(sx, sy - 1, tipLight > 0.2 ? C[3] : G[5]);
      q.px(sx - 1, sy, G[4]);
      q.px(sx + 1, sy, G[4]);
    }
  }
}
