// The projectile recipe (a hot head, a trail that thins behind it, motes shed along the way, light riding the
// head) is adapted from Sprite Fusion's open-source energy bolt (https://www.spritefusion.com/pixel-art-vfx/energy),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, fly, clamp, TAU, WHITE } from "../../core/index.mjs";
import { blade } from "./_lib.mjs";

export const meta = {
  name: "Ice lance",
  desc: "A faceted ice spear flying right: a light pulse runs through its core, rings of cold air shear off the tip, frost peels off into a wake and crystals shed behind it.",
  tags: ["ice", "lance", "spear", "projectile", "directional", "magic", "loop"],
  size: [176, 64],
  origin: [146, 32],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], length: 40, seed: 13 },
};

// the spear: a hexagonal shaft seen from the side, row by row (a white top edge, a lit upper facet, a bright
// ridge, a cool lower facet, a deep keel, a dark rim), a long cutting point, a light pulse running through
// its ridge to the tip, a glint sliding back along the top
function spear(p, C, L, pulse, glint) {
  const T = 16, H = 3.5;
  const half = (x) => (x > -T ? H * (-x / T) + 0.3 : x < -L + 3 ? H * (0.7 + 0.3 * ((x + L) / 3)) : H);
  p.shade(-L - 1, -H - 2, 1, H + 2, (x, y, o) => {
    if (x > 0 || x < -L) return;
    const h = half(x);
    if (Math.abs(y) > h + 0.5) {
      if (Math.abs(y) < h + 1.5) o.c = C[1];
      return;
    }
    const v = y / Math.max(0.5, h);
    if (x > -1.5) return (o.c = WHITE);
    // three faces lit from above: a pale top facet, a mid front facet with a bright ridge, a deep underside
    if (v > -0.3 && v < 0.35 && Math.abs(x - pulse) < 2.5) return (o.c = WHITE);
    if (v < -0.3 && Math.abs(x - glint) < 1) return (o.c = WHITE);
    o.c = v < -0.72 ? WHITE : v < -0.36 ? C[6] : v < -0.18 ? C[7] : v < 0.38 ? C[4] : v < 0.78 ? C[2] : C[1];
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), D = meta.duration, S = o.seed, L = o.length, ph = t / D;
  // the wake: a ribbon of frost narrowing behind the spear, with cold light in it
  p.each(-L - 100, -12, -L + 4, 12, (x, y, sx, sy) => {
    const u = (-L + 4 - x) / 104, w = 4.5 * (1 - u) ** 0.7 + 0.5 + 1.5 * Math.sin(u * 9 - ph * TAU * 2) * u, v = Math.abs(y) / w;
    if (v >= 1) return;
    const a = (1 - v * v) * (1 - u) ** 1.4;
    if (a < 0.04) return;
    p.blendPx(sx, sy, v < 0.25 && u < 0.4 ? C[6] : v < 0.6 ? C[5] : C[4], a * 0.7);
    if (a > 0.3) p.add(sx, sy, C[5], 0.12 * a);
  });
  p.glowLine(-L - 60, 0, 0, 0, 14, C[4], 0.22);
  // frost peeling off the shaft into soft puffs left behind
  cycle(t, D, 14, S, (g) => g.range(0.35, 0.55), (age, life, r) => {
    const x0 = r.range(-L + 2, -8), [x, y] = fly(x0, r.range(-2.5, 2.5), -r.range(150, 230), r.sign() * r.range(8, 30), age, 0, 2.2);
    const k = age / life, rad = 1.2 + 5.5 * k, a = 0.5 * (1 - k) ** 1.3;
    p.disc(x, y, rad, k < 0.3 ? C[6] : C[5], (d) => a * (1 - d * d));
    p.glow(x, y, rad * 1.6, C[4], 0.1 * (1 - k));
  });
  // crystals shed along the way: short tumbling shards with a white edge, glinting, falling back
  cycle(t, D, 9, S + 1, (g) => g.range(0.4, 0.6), (age, life, r) => {
    const [x, y] = fly(r.range(-L, -6), r.range(-3, 3), -r.range(170, 260), r.range(-35, 35), age, 60, 1.2);
    const k = age / life, a = r.range(0, TAU) + age * r.range(10, 18) * r.sign(), l = r.range(1.2, 2.2), ca = Math.cos(a), sa = Math.sin(a);
    if (k > 0.85 && (age * 30) % 2 < 1) return;
    p.line(x - ca * l, y - sa * l, x + ca * l, y + sa * l, C[5]);
    p.px(x + ca * l, y + sa * l, WHITE);
    if (Math.cos(a * 2) > 0.9) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
      p.glow(x, y, 6, C[5], 0.45);
    }
  });
  // speed lines: the air streaming past above and below
  cycle(t, D, 12, S + 2, (g) => g.range(0.16, 0.26), (age, life, r) => {
    const y = r.sign() * r.range(4, 13), x = r.range(-20, 0) - age * r.range(280, 380), l = r.range(6, 16), k = age / life;
    p.line(x, y, x + l, y, (u) => (u > 0.7 ? C[6] : C[4]), (u) => u * (1 - k) * 1.4);
  });
  // rings of cold air shearing off the point and sliding back along the shaft: the near arc bright, the far dim
  for (let i = 0; i < 3; i++) {
    const q = (ph * 3 + i / 3) % 1, x = -4 - q * (L + 20), ry = 4.5 + q * 8, rx = 1.2 + q * 2.6;
    if (q > 0.8) continue;
    for (let k = 0; k < 40; k++) {
      const an = (k / 40) * TAU, px = x + Math.cos(an) * rx, py = Math.sin(an) * ry;
      if (Math.abs(py) < 4.6 && px > -L - 2) continue;
      p.px(px, py, Math.cos(an) > 0 ? (q < 0.35 ? WHITE : C[6]) : q < 0.4 ? C[5] : C[4]);
    }
    p.glowRing(x, 0, ry * 0.75, 3, C[5], 0.14 * (1 - q));
  }
  // the ice fletching at the back: three shards fanning out behind the shaft
  for (const [dy, l, w] of [[-1, 10, 4], [1, 9, 4], [-0.2, 6, 3]]) blade(p, -L + 3, dy * 1.5, -L + 3 - l, dy * (2 + l * 0.5), w, C);
  // the spear itself, a pulse of light running through it, a glint sliding back along the top
  const pulse = -L + ((ph * 2) % 1) * (L + 6), glint = -((ph * 2 + 0.5) % 1) * L * 1.2;
  spear(p, C, L, pulse, glint);
  p.glowLine(-L, 0, 0, 0, 10, C[4], 0.1);
  p.glow(pulse, 0, 8, C[6], 0.3);
  p.glow(0, 0, 8, WHITE, 0.4);
  p.glow(-L * 0.4, 0, 30, C[3], 0.16);
}
