// The snow recipe (depth layers falling at their own speeds with a sway, a gusty wind, flakes that settle on a
// drift for a while) is adapted from Sprite Fusion's open-source snow (https://www.spritefusion.com/pixel-art-vfx/snow),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, smooth, rand, wrap, mix, TAU, WHITE } from "../../core/index.mjs";
import { clip, pass, trips } from "./_lib.mjs";

export const meta = {
  name: "Snow",
  desc: "Snow at three depths in a gusty breeze: far specks, drifting flakes, big near crystals that spin and glow; they settle on a sparkling drift and melt away.",
  tags: ["weather", "snow", "winter", "cold", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 170],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#0c1020", "#161d36", "#24304f", "#3a4a72", "#5f74a3", "#93abd6", "#cfe0fa", "#ffffff"],
    seed: 6,
  },
};

const D = 12;
// the drift's top edge, and the gusts: a sway of the whole snowfall, periodic so the loop closes
const bank = (x) => -3 + 1.6 * Math.sin(x * 0.045 + 1.3) + 1.1 * Math.sin(x * 0.12 + 0.4) + 0.6 * Math.sin(x * 0.31 + 2);
const gust = (t) => 10 * Math.sin((TAU * t) / D + 0.6) + 4 * Math.sin((TAU * 2 * t) / D + 2.1);
// far to near: how many, falls a loop, share of a fall spent in the air (the rest lying on the drift), sway, wind
const LAYERS = [
  { n: 230, m: [1, 2], air: 1, sway: [1, 3], wind: 3, gust: 0.4 },
  { n: 140, m: [2, 3], air: 0.8, sway: [3, 7], wind: 6, gust: 0.7 },
  { n: 24, m: [2, 3], air: 0.74, sway: [8, 15], wind: 9, gust: 1 },
];

export function drawBack(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 8);
  // a cold haze, thicker low down, so the sky's stars don't read as snow
  const haze = mix(C[1], C[2], 0.4);
  pass(p, meta, -170, 9, (x, y, out) => {
    out.c = haze;
    out.a = 0.26 + 0.22 * smooth(-170, 0, y);
    out.b = 1;
  });
  layer(q, t, S, C, 0);
  drift(q, t, S, C);
  layer(q, t, S, C, 1);
}

export function draw(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 8);
  layer(q, t, S, C, 2);
}

function layer(q, t, S, C, L) {
  const Ly = LAYERS[L], sd = S * 13 + L;
  trips(t, D, Ly.n, sd, Ly.m[0], Ly.m[1], (u, k, m, i) => {
    const j = wrap(k, m), dur = D / m, R = (n) => rand(sd, i, j, n);
    const tf = dur * Ly.air, age = Math.min(u * dur, tf), sw = Ly.sway[0] + R(3) * (Ly.sway[1] - Ly.sway[0]), f = 0.25 + R(4) * 0.35, ph = R(5) * TAU;
    const xAt = (a) => -175 + R(2) * 350 + Ly.wind * a + (gust(t - u * dur + a) - gust(t - u * dur)) * Ly.gust + sw * Math.sin(TAU * f * a + ph);
    const x = xAt(age), xl = xAt(tf), y0 = -176, y1 = L ? bank(xl) - 0.5 : -110 + R(1) * 106;
    const y = y0 + (y1 - y0) * (age / tf), rest = u * dur - tf;
    if (L === 0) {
      // far: a speck, thinning out before it's gone
      const a = Math.min(1, (1 - u) * 6);
      q.dot(x, y, R(6) < 0.5 ? C[4] : C[5], a);
      return;
    }
    const fade = rest > 0 ? 1 - rest / (dur - tf) : 1;
    if (L === 1) {
      // a drifting flake: a point with a smaller one beside it, a plus when it's big
      const big = R(6) < 0.3;
      if (rest > 0) return void q.dot(xl, y1, C[7], fade * 0.9);
      q.px(x, y, big ? WHITE : C[7]);
      if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) q.px(x + dx, y + dy, C[5]);
      else (q.px(x + 1, y, C[6]), q.px(x, y + 1, C[6]), q.px(x + 1, y + 1, C[5]));
      return;
    }
    // a near crystal: six arms with side branches, spinning, a white heart, a cold glow; it lies down on the drift
    const r = R(6) < 0.4 ? 3 : R(6) < 0.8 ? 4 : 5, spin = 1.5 + R(7) * 2.5;
    if (rest > 0) {
      q.dot(xl - 1, y1, C[6], fade);
      q.dot(xl, y1, WHITE, fade);
      q.dot(xl + 1, y1, C[6], fade);
      q.glow(xl, y1, 5, C[5], 0.25 * fade);
      return;
    }
    crystal(q, x, y, r, Math.floor(age * spin + R(8) * 2) % 2, C);
  });
}

// a near crystal, kept crisp: long arms on one set of four directions, short ones on the other, nubs near the
// tips; turning means trading which set is long. Plates are a ring round a bright heart.
const AXIS = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [-1, -1], [1, -1], [-1, 1]];
function crystal(q, x, y, r, turn, C) {
  const X = Math.round(x), Y = Math.round(y), long = turn ? DIAG : AXIS, short = turn ? AXIS : DIAG, R = turn ? r - 1 : r;
  // long arms with a white-blue tip; nubs only where they can't touch the next arm, so the gaps stay open
  for (const [dx, dy] of long) {
    for (let d = 1; d <= R; d++) q.px(X + dx * d, Y + dy * d, d === R ? WHITE : C[6]);
    const nubs = turn ? (R >= 3 ? [R - 1] : []) : R >= 5 ? [R - 1, R - 2] : R >= 4 ? [R - 1] : [];
    for (const n of nubs) {
      const ox = turn ? dx : dy, oy = turn ? -dy : -dx;
      q.px(X + dx * n + (turn ? 0 : ox), Y + dy * n + (turn ? oy : oy), C[4]);
      q.px(X + dx * n + (turn ? -dx : -ox) + (turn ? dx : 0), Y + dy * n + (turn ? dy * 0 : -oy), C[4]);
    }
  }
  for (const [dx, dy] of short) for (let d = 1; d <= (turn ? 1 : Math.max(1, Math.floor(R / 2))); d++) q.px(X + dx * d, Y + dy * d, d === 1 ? C[6] : C[5]);
  q.px(X, Y, WHITE);
  // a faint halo, wide enough not to fill the gaps between the arms
  q.glow(X + 0.5, Y + 0.5, r * 2.5 + 5, C[5], 0.13);
  q.light(X, Y, C[6], 0.4);
}

// the drift on the floor: a lumpy bank with a white crest, blue shade below, and glints that twinkle
function drift(q, t, S, C) {
  pass(q, meta, -7, 9, (x, y, out) => {
    const top = bank(x), d = y - top;
    if (d < 0) return;
    out.c = d < 1 ? WHITE : d < 2 ? C[7] : d < 3.5 ? C[6] : d < 6 ? C[5] : C[4];
    if (d < 1) (out.l = C[6]), (out.k = 0.12);
  });
  for (let i = 0; i < 18; i++) {
    const x = -156 + rand(S, i, 81) * 312, c = 1 + Math.floor(rand(S, i, 82) * 3), tw = Math.sin((TAU * c * t) / D + rand(S, i, 83) * TAU);
    if (tw < 0.55) continue;
    const y = Math.ceil(bank(x)) + Math.floor(rand(S, i, 84) * 3), k = (tw - 0.55) / 0.45;
    q.px(x, y, WHITE);
    if (k > 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) q.px(x + dx, y + dy, C[6]);
    q.glow(x + 0.5, y + 0.5, 6, C[6], 0.35 * k);
  }
}
