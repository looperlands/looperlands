// Banded volumes with a lit crest (light on the top edge, tones stepping down into the body, Bayer at the steps)
// after Sprite Fusion's open-source fog (https://www.spritefusion.com/pixel-art-vfx/fog), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rand, wrap, mix, TAU, WHITE } from "../../core/index.mjs";
import { clip, box, bayer } from "./_lib.mjs";

export const meta = {
  name: "Clouds",
  desc: "Layers of clouds drift past a bright moon at night: silver-lit tops, dark bellies, edges that flare where they cross the moon, forming and thinning as they go.",
  tags: ["weather", "clouds", "moon", "night", "sky", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 180],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#0c0c18", "#16172a", "#232540", "#363a5a", "#545a80", "#8088ae", "#bcc4e2", "#f2f4ff"],
    seed: 7,
  },
};

const D = 12, MX = 92, MY = -128, MR = 12;
// far to near: how many clouds, how wide, how tall their puffs, how high, drift speed, how long they live,
// tones [belly, body, upper, top], how see-through
const LAYERS = [
  { n: 7, w: [40, 70], h: [6, 11], y: [-150, -110], v: 3, life: [8, 11], tone: [2, 3, 4, 5], alpha: 0.7 },
  { n: 6, w: [60, 100], h: [9, 15], y: [-120, -70], v: 6, life: [8, 11], tone: [1, 2, 4, 6], alpha: 0.88 },
  { n: 5, w: [90, 140], h: [12, 20], y: [-80, -30], v: 10, life: [9, 12], tone: [1, 2, 3, 6], alpha: 1 },
];

export function draw(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 8);
  moon(q, C);
  LAYERS.forEach((L, j) => {
    for (let i = 0; i < L.n; i++) cloud(q, t, S, C, L, j, i);
  });
  // the moon's light over everything: a halo, brightest close in, catching any cloud that passes
  q.glow(MX, MY, 110, C[4], 0.14);
  q.glow(MX, MY, 40, C[5], 0.25);
  q.glow(MX, MY, 18, C[6], 0.3);
}

function moon(q, C) {
  q.shade(MX - MR - 1, MY - MR - 1, MX + MR + 1, MY + MR + 1, (x, y, out) => {
    const dx = x - MX, dy = y - MY, d = Math.hypot(dx, dy) / MR;
    if (d > 1) return;
    // a pale disc with darker seas, a bright limb on the lit side
    const sea = (dx + 4) ** 2 + (dy + 2) ** 2 < 14 || (dx - 3) ** 2 + (dy - 4) ** 2 < 9 || (dx - 5) ** 2 + (dy + 5) ** 2 < 4;
    out.c = d > 0.86 ? (dx + dy < 0 ? C[6] : WHITE) : sea ? C[5] : d < 0.5 && dx + dy < 0 ? WHITE : C[7];
  });
}

// one cloud: born once a loop, it swells into shape, drifts, and thins away. Its outline is a row of puffs on a
// flat base; shading steps down from a silver top to a dark belly, and edges near the moon flare
function cloud(q, t, S, C, L, j, i) {
  const R = (k) => rand(S, j, i, k), life = L.life[0] + R(1) * (L.life[1] - L.life[0]), age = wrap(t - R(2) * D, D);
  if (age >= life) return;
  const u = age / life, grow = Math.min(1, u * 4) * Math.min(1, (1 - u) * 4), w = (L.w[0] + R(3) * (L.w[1] - L.w[0])) * (0.6 + 0.4 * grow);
  const x0 = -200 + R(4) * 330 + L.v * age, base = L.y[0] + R(5) * (L.y[1] - L.y[0]), H = (L.h[0] + R(6) * (L.h[1] - L.h[0])) * grow;
  if (H < 1.5) return;
  // a row of puffs along the base, and a tier of bigger ones heaped in the middle
  const n = 4 + Math.floor(R(7) * 4), puffs = [];
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n, r = H * (0.5 + 0.35 * Math.sin(Math.PI * f)) * (0.75 + 0.5 * R(10 + k)) * (1 + 0.06 * Math.sin((TAU * t) / D + k + i));
    puffs.push([x0 + w * (f - 0.5) + (R(20 + k) - 0.5) * 6, base - r * 0.3 - R(30 + k) * H * 0.15, r]);
  }
  for (let k = 0; k < 1 + Math.floor(R(8) * 3); k++) {
    const f = 0.3 + R(40 + k) * 0.4, r = H * (0.75 + 0.35 * R(50 + k)) * (1 + 0.05 * Math.sin((TAU * t) / D + k * 2 + i));
    puffs.push([x0 + w * (f - 0.5), base - H * 0.55 - r * 0.2, r]);
  }
  const x1 = x0 - w / 2 - H, x2 = x0 + w / 2 + H, B = box(meta);
  for (let x = Math.max(B.x0, Math.floor(x1)); x <= Math.min(B.x1 - 1, Math.ceil(x2)); x++) {
    const cx = x + 0.5;
    let top = Infinity, top2 = Infinity;
    for (const [px, py, r] of puffs) {
      const dx = cx - px;
      if (dx * dx >= r * r) continue;
      const y = py - Math.sqrt(r * r - dx * dx);
      if (y < top) (top2 = top), (top = y);
      else if (y < top2) top2 = y;
    }
    if (top === Infinity) continue;
    // a belly that's nearly flat, lifting at the ends and rippling a little
    const end = Math.min(cx - x1, x2 - cx) / H, bot = base + 1.5 + Math.sin(cx * 0.21 + i) * 0.8 - (end < 1 ? (1 - end) * 4 : 0);
    if (bot <= top) continue;
    const h = bot - top, inner = top2 - top > 2.5 && top2 < bot - 2 ? Math.floor(top2) : -999;
    for (let y = Math.floor(top); y < bot; y++) {
      const d = y + 0.5 - top, v = d / h, th = bayer(x, y) * 0.12, md = Math.hypot(cx - MX, y - MY);
      let c = d < 1 ? L.tone[3] : v < 0.25 + th ? L.tone[2] : v < 0.62 + th ? L.tone[1] : L.tone[0];
      // the top of a lower puff shows inside the body as a lit line: the cloud's lobes
      if (y === inner) c = Math.max(c, L.tone[2]);
      if (bot - y - 0.5 < 1 && v > 0.5) c = Math.max(0, L.tone[0] - 1);
      // the silver lining: near the moon the edges light right up
      if (md < 46 && (d < 2 || y === inner || v < 0.3)) c = Math.min(7, c + (md < 24 ? 2 : 1));
      const a = L.alpha * Math.min(1, grow * 1.5);
      if (a >= 1) q.px(x, y, C[c]);
      else q.blend(x, y, C[c], a);
      if (d < 1 && md < 46) q.light(x, y, C[6], 0.35 * (1 - md / 46));
    }
  }
}
