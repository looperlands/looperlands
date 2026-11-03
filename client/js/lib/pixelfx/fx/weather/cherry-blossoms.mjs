// Things that flutter down (a fall timed to land as their time in the air runs out, a flip by squashing across,
// a rest on the ground and a fade) after Sprite Fusion's open-source falling leaves
// (https://www.spritefusion.com/pixel-art-vfx/falling-leaves), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, rand, wrap, mix, TAU, WHITE, hex } from "../../core/index.mjs";
import { clip, rows, trips } from "./_lib.mjs";

export const meta = {
  name: "Cherry blossoms",
  desc: "Pink petals flutter down on a spring breeze, tumbling in little spirals and flashing as they catch the light, with a few whole blossoms spinning among them.",
  tags: ["weather", "cherry blossom", "sakura", "petals", "spring", "wind", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 170],
  duration: 10,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#4a1832", "#8e3460", "#d26a94", "#f2a2c0", "#ffd2e2", "#fff4f8"],
    seed: 12,
  },
};

const D = 10, FLOOR = 1;
const gust = (t) => 22 * Math.sin((TAU * t) / D + 0.4) + 7 * Math.sin((TAU * 2 * t) / D - 1);

export function drawBack(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 6);
  // a soft plum dusk, so the sky's stars don't read as petals
  const top = hex("#0e0a14"), low = mix(hex("#1a0e1a"), C[0], 0.4);
  rows(p, meta, -170, 9, (y, R) => {
    const k = (y + 170) / 180;
    R.c.fill(mix(top, low, k * k));
    R.a.fill(0.3 + 0.12 * k);
    R.b.fill(1);
  });
  scatter(q, S, C);
  petals(q, t, S, C, 0);
}

export function draw(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 6);
  petals(q, t, S, C, 1);
  blossoms(q, t, S, C);
}

// petals: each tumbles in a little spiral as it falls and drifts on the breeze, flipping fast; turned full face
// to the light it flashes
function petals(q, t, S, C, near) {
  const n = near ? 54 : 90, sd = S * 7 + near;
  trips(t, D, n, sd, 1, 2, (u, k, m, i) => {
    const j = wrap(k, m), R = (c) => rand(sd, i, j, c), dur = D / m, tf = dur * 0.84, a = Math.min(u * dur, tf), rest = u * dur - tf;
    const born = t - u * dur, x0 = -200 + R(1) * 330, y0 = -184, vy = (FLOOR + (near ? 2 : 0) - y0) / tf, vx = 9 + R(2) * 10;
    const rho = (near ? 3 : 2) + R(3) * 3, w = 2.2 + R(4) * 2.8, ph = R(5) * TAU, gk = near ? 1 : 0.6;
    const at = (aa) => [x0 + vx * aa + (gust(born + aa) - gust(born)) * gk + rho * Math.cos(w * aa + ph), y0 + vy * aa + rho * 0.6 * Math.sin(w * aa + ph)];
    const len = (near ? 3.6 : 2.6) + R(6) * 1.1;
    if (rest > 0) {
      const [x, y] = at(tf);
      // a landed petal settles and shrinks away (no dither, so the ground stays clean)
      const fade = 1 - rest / (dur - tf);
      return void (fade > 0.15 && petal(q, x, y, len * (0.35 + 0.65 * fade), (R(7) - 0.5) * 1.2, 0.5, C, 1));
    }
    const [x, y] = at(a), flip = Math.cos(R(8) * TAU + a * (3 + R(9) * 5)), ang = R(10) * TAU + a * (R(11) - 0.5) * 3;
    petal(q, x, y, len, ang, flip, C, 1);
    if (flip > 0.9) {
      const g = (flip - 0.9) / 0.1;
      q.px(x, y - 1, WHITE);
      q.glow(x, y, near ? 7 : 5, C[4], (near ? 0.32 : 0.22) * g);
    }
  });
}

// a petal: a little notched teardrop, squashed across as it flips; its pale face or its deeper back
function petal(q, x, y, len, ang, flip, C, a) {
  const fs = 0.3 + 0.7 * Math.abs(flip), back = flip < -0.2, c = Math.cos(ang), s = Math.sin(ang), e = len + 1;
  // deeper at the base, palest at the tip, lit on one side; the back is a step deeper all over
  const face = back ? [C[1], C[2], C[3]] : [C[2], C[3], C[4]], tip = back ? C[3] : C[5];
  q.shade(x - e, y - e, x + e, y + e, (px, py, out) => {
    const dx = px - x, dy = py - y, u = (dx * c + dy * s) / len, v = (-dx * s + dy * c) / (len * fs);
    if (u < -1 || u > 1) return;
    const hw = 0.55 * Math.sqrt(1 - u * u) * (1 + 0.35 * u);
    if (Math.abs(v) > hw || (u > 0.7 && Math.abs(v) < 0.12)) return;
    out.c = u > 0.45 && v < 0.1 ? tip : u < -0.45 ? face[0] : v < 0 ? face[2] : face[1];
    out.a = a;
  });
}

// a whole blossom: five petals round a gold heart, spinning slowly as it sinks
function blossoms(q, t, S, C) {
  trips(t, D, 7, S * 31, 1, 1, (u, k, m, i) => {
    const R = (c) => rand(S * 31, i, c), y = -190 + (FLOOR + 2 + 190) * Math.min(1, u / 0.9), born = t - u * D;
    if (u > 0.9) return;
    const x = -190 + R(1) * 330 + 14 * u * D * 0.1 + (gust(t) - gust(born)) + 6 * Math.sin(u * TAU * 2 + R(2) * 6), rot = R(3) * TAU + u * D * (R(4) - 0.5) * 2;
    const r = 3.6 + R(5) * 1.2;
    for (let p = 0; p < 5; p++) {
      const an = rot + (p * TAU) / 5;
      petal(q, x + Math.cos(an) * r * 0.75, y + Math.sin(an) * r * 0.75, r * 0.7, an, 1, C, 1);
    }
    q.px(x, y, hex("#ffe08a"));
    q.glow(x, y, 8, C[4], 0.2);
  });
}

// petals already fallen, scattered along the floor; they never move, so they're shaded once and replayed
const SCATTER = new Map();
function scatter(q, S, C) {
  const key = S + C.join();
  let px = SCATTER.get(key);
  if (!px) {
    px = [];
    const rec = {
      shade(x0, y0, x1, y1, fn) {
        const o = { c: 0, a: 1 };
        for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
          for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
            o.c = 0;
            const c = fn(x + 0.5, y + 0.5, o) || o.c;
            if (c) px.push(x + 0.5, y + 0.5, c, o.a);
          }
      },
    };
    for (let i = 0; i < 46; i++) petal(rec, -164 + rand(S, i, 71) * 328, FLOOR + Math.floor(rand(S, i, 72) * 3) * 2, 2.6 + rand(S, i, 73), (rand(S, i, 74) - 0.5) * 1.2, 0.5, C, 1);
    SCATTER.set(key, px);
  }
  for (let i = 0; i < px.length; i += 4) q.dot(px[i], px[i + 1], px[i + 2], px[i + 3]);
}
