// Soft puffs drawn as a body, a denser core and a lit cap, and streaks with a hot head and a cool tail, follow
// the recipes in Sprite Fusion's open-source pixel art VFX (https://www.spritefusion.com/pixel-art-vfx),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, fly, flyV, loopNoise, tileFbm, clamp, TAU, WHITE, mix } from "../../core/index.mjs";

export const meta = {
  name: "Frost breath",
  desc: "A cone of icy wind blowing right: frost puffs billow out, swell and sink, wind streaks race through, ice crystals tumble and glint off a white-hot mouth.",
  tags: ["ice", "breath", "frost", "cone", "wind", "directional", "loop"],
  size: [184, 104],
  origin: [12, 50],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], spread: 0.21, power: 1, seed: 11 },
};

const SINK = 9; // cold air is heavy: it sags a little as it slows

// a puff of frost: a soft body, a denser core sitting low, a lit cap while it's young, a cold haze of light
function puff(p, C, x, y, r, a, k, front) {
  const body = front ? C[5] : C[4], cap = front ? C[7] : C[6], soft = (q) => (d) => q * (1 - d * d);
  p.disc(x, y, r, body, soft(a * 0.6));
  p.disc(x + r * 0.06, y + r * 0.12, r * 0.68, mix(body, C[3], 0.3), soft(a * 0.5));
  if (k < 0.55) p.disc(x - r * 0.25, y - r * 0.3, r * 0.5, cap, soft(a * 0.7 * (1 - k / 0.55)));
  p.glow(x, y, r * 1.7, C[4], 0.1 * a);
}

// the body of the gust: a cone of turbulent, translucent cold air streaming right, brightest at its heart.
// The noise scrolls exactly one tile per loop, so it never seams.
function gust(p, C, t, o) {
  const ph = t / meta.duration, sp = Math.tan(o.spread) * 1.08, S = o.seed;
  p.each(2, -46, 170, 46, (x, y, sx, sy) => {
    const u = x / 170, hw = 2.5 + x * sp, yc = 7 * u * u, v = (y - yc) / hw;
    if (v * v >= 1 || u >= 1) return;
    const n = tileFbm(x * 0.055 - ph * 10, (y - yc) * 0.15 + 7, 10, 0, S, 2), edge = (1 - v * v) * (u < 0.08 ? u / 0.08 : 1) * (1 - u) ** 0.8;
    // denser and brighter down its heart near the mouth
    const d = clamp(0.5 + n * 1.3 + (1 - Math.abs(v)) * 0.35 * (1 - u) ** 1.5) * edge;
    if (d < 0.08) return;
    p.blendPx(sx, sy, d > 0.72 ? C[7] : d > 0.52 ? C[6] : d > 0.32 ? C[5] : C[4], Math.min(0.78, d * 0.95) * clamp((d - 0.08) / 0.3));
    if (d > 0.3) p.add(sx, sy, d > 0.6 ? C[6] : C[5], 0.2 * d);
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), D = meta.duration, S = o.seed, sp = o.spread;
  gust(p, C, t, o);
  // the big slow billows behind
  cycle(t, D, 12, S, (g) => g.range(1, 1.25), (age, life, r) => {
    const th = r.range(-sp, sp), v = r.range(170, 230) * o.power, [x, y] = fly(3, r.range(-1, 1), v * Math.cos(th), v * Math.sin(th), age, SINK, 1.4);
    const k = age / life, rad = 2 + 12 * Math.pow(k, 0.75);
    puff(p, C, x, Math.min(y, 40 - rad), rad, 0.75 * Math.pow(1 - k, 1.2) * Math.min(1, age / 0.08), k, false);
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), D = meta.duration, S = o.seed, sp = o.spread, ph = t / D;
  // light down the cone
  p.glowLine(4, 0, 120, 6, 24, C[4], 0.26);
  p.glowLine(2, 0, 50, 1, 9, C[6], 0.3);
  p.glow(60, 4, 44, C[3], 0.16);
  // brighter puffs in front, smaller and quicker
  cycle(t, D, 10, S + 1, (g) => g.range(0.7, 0.95), (age, life, r) => {
    const th = r.range(-sp * 0.8, sp * 0.8), v = r.range(190, 260) * o.power, [x, y] = fly(3, r.range(-1, 1), v * Math.cos(th), v * Math.sin(th), age, SINK, 1.6);
    const k = age / life, rad = 1.5 + 8 * Math.pow(k, 0.7);
    puff(p, C, x, Math.min(y, 40 - rad), rad, 0.85 * Math.pow(1 - k, 1.3) * Math.min(1, age / 0.06), k, true);
  });
  // snow carried along, swaying
  cycle(t, D, 18, S + 2, (g) => g.range(0.8, 1.1), (age, life, r) => {
    const th = r.range(-sp * 1.1, sp * 1.1), v = r.range(120, 190), [x, y] = fly(4, 0, v * Math.cos(th), v * Math.sin(th), age, SINK * 1.4, 1.5);
    const k = age / life, sw = Math.sin(age * 9 + r.range(0, TAU)) * 1.5;
    if (k < 0.85 || (age * 30) % 2 < 1) p.px(x, y + sw, r.chance(0.5) ? WHITE : C[6]);
  });
  // wind streaks: a white head, a pale body, a cool tail
  cycle(t, D, 26, S + 3, (g) => g.range(0.22, 0.36), (age, life, r) => {
    const th = r.range(-sp * 0.9, sp * 0.9), v = r.range(280, 380), [x, y] = fly(6, r.range(-2, 2), v * Math.cos(th), v * Math.sin(th), age, 0, 0.9);
    const [vx, vy] = flyV(v * Math.cos(th), v * Math.sin(th), age, 0, 0.9), s = Math.hypot(vx, vy), L = 4 + s * 0.03, ux = vx / s, uy = vy / s, k = age / life;
    p.line(x - ux * L, y - uy * L, x, y, (u) => (u > 0.8 ? WHITE : u > 0.4 ? C[6] : C[4]), (u) => (u > 0.35 ? 1 : u / 0.35) * (k < 0.75 ? 1 : (1 - k) / 0.25));
    p.glow(x, y, 3, C[5], 0.3 * (1 - k));
  });
  // ice crystals tumbling through: a short shard with a white edge, glinting as it turns
  cycle(t, D, 9, S + 4, (g) => g.range(0.65, 0.9), (age, life, r) => {
    const th = r.range(-sp, sp), v = r.range(150, 230), [x, y] = fly(5, 0, v * Math.cos(th), v * Math.sin(th), age, SINK, 1.1);
    const k = age / life, a = r.range(0, TAU) + age * r.range(9, 15) * r.sign(), L = r.range(1.5, 2.6), ca = Math.cos(a), sa = Math.sin(a);
    if (k > 0.85 && (age * 30) % 2 < 1) return;
    p.line(x - ca * L, y - sa * L, x + ca * L, y + sa * L, C[5]);
    p.px(x + ca * L, y + sa * L, WHITE);
    const gl = Math.cos(a * 2);
    if (gl > 0.92) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
      p.px(x, y, WHITE);
      p.glow(x, y, 6, C[5], 0.5);
    } else p.glow(x, y, 3, C[5], 0.2);
  });
  // the mouth: a white-hot core, a flickering jet of cold
  for (let i = 0; i < 3; i++) {
    const L = 9 + 6 * loopNoise(ph, 1.2, S + i * 7), dy = (i - 1) * 1.4;
    p.line(2, dy * 0.5, 2 + L, dy, (u) => (u < 0.5 ? WHITE : C[6]), (u) => (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4));
  }
  p.ellipse(2.5, 0, 4.6, 3, C[6]);
  p.ellipse(2, 0, 3, 1.8, WHITE);
  const fl = 0.85 + 0.15 * Math.sin(ph * TAU * 3);
  p.glow(2, 0, 24, C[5], 0.7 * fl);
  p.glow(2, 0, 9, WHITE, 0.5 * fl);
}
