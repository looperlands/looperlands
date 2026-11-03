// The flame-puff, smoke and spark recipe is adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, hex, clamp, WHITE } from "../../core/index.mjs";
import { noiseFor, hotFirst, flameBlade, flameTongue, firePuff, smokePuff, spark, ember, drift, looped, LAYERS, BACK_LAYERS } from "./_lib.mjs";

export const meta = {
  name: "Fire breath",
  desc: "A roaring cone of fire streaming right from the mouth: white-hot at the lips, billowing out and cooling to red and smoke at its edges, sparks thrown out ahead.",
  tags: ["fire", "breath", "dragon", "stream", "cone", "directional", "loop"],
  size: [160, 116],
  origin: [12, 72],
  duration: 1.5,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    spread: 0.24,
    speed: 320,
    seed: 6,
  },
};

const D = meta.duration, NL = noiseFor(D), SMOKE1 = hex("#5b5566");
// the dying licks: red and deep orange, no white heart
const COOL_LAYERS = [[1, 1, 7], [0.72, 0.82, 6], [0.44, 0.58, 5]];
// the jet at the lips: [length, half-width, angle]
const JET = [[42, 4.2, 0], [32, 3.8, -0.08], [30, 3.8, 0.08], [20, 4.6, 0]];

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), S = o.seed, A = o.spread, V = o.speed;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25), SMOKE = mix(SMOKE1, H[6], 0.3), SPARKS = [H[1], H[2], H[4], H[5]], EMB = [H[1], H[2], H[4], H[6]];
  // the roar: the stream surges and the cone sways a little
  const roar = (tt) => 0.85 + 0.15 * NL(tt, 3, S + 1), sway = (tt) => NL(tt, 1.3, S + 2) * 0.05;

  // the cone: puffs of flame blown out of the mouth that slow, swell, rise and cool; those near the edges
  // cool first, and many burn out into rolling smoke
  const fire = [], smoke = [];
  looped(t, D, 260, S + 100, (r) => {
    const e = r.range(-1, 1), fl = r.range(0.42, 0.8) * (1 - 0.3 * Math.abs(e)), sm = r.chance(0.2 + 0.4 * Math.abs(e));
    return { e, sp: r.range(0.75, 1.1), fl, sm, sl: r.range(0.5, 0.85), s: r.range(3, 5.2), f: r.next(), ox: r.range(4, 10), life: fl + (sm ? 0.85 : 0) };
  }, (q, age) => {
    const tb = t - age, a = q.e * A + sway(tb) - 0.04, v = V * q.sp * roar(tb);
    const ta = Math.min(age, q.fl), [x, y, vx, vy] = drift(q.ox, q.e * 1.5, Math.cos(a) * v, Math.sin(a) * v, ta, 0, -100, 2, 2.4);
    if (age < q.fl) return fire.push([age, x, y, q]);
    if (!q.sm || age - q.fl > q.sl) return;
    const sa = age - q.fl, [sx, sy] = drift(x, y, vx * 0.5, vy * 0.6 - 8, sa, 0, -26, 1.8, 1.2);
    smoke.push([sa, sx, sy, q]);
  });
  for (const [sa, x, y, q] of smoke) smokePuff(p, x, y, 1 - sa / q.sl, q.s * 1.1, SMOKE, true, 0.7);
  fire.sort((a, b) => b[0] - a[0]);
  for (const [age, x, y, q] of fire) {
    const u = age / q.fl, edge = Math.abs(q.e), size = q.s * (0.75 + 1.6 * u);
    // the heart of the stream stays hot longer than its edges
    const heat = Math.min(0.999, Math.pow(u, 1.5) * (0.85 + 0.2 * edge) + 0.3 * edge * edge);
    // near the mouth the fire rolls in round billows; further out each billow tears into a tongue licking up
    // and back, thinning to a lick as it cools, before the smoke takes it
    const tear = clamp((u - 0.32) / 0.2);
    firePuff(p, x, y, 1 - heat, size * (1 - 0.55 * tear), q.f, H, 0.1, -0.5, -0.86);
    if (tear > 0) {
      const n = Math.floor(q.f * 1e5), h = size * (1.5 + 0.5 * N(4, n)) * (1.2 - heat * 0.6) * tear;
      flameTongue(p, x, y + size * 0.3, h, size * 0.5 * (1.1 - heat * 0.5), -h * 0.4 + N(2.5, n + 1) * 2, N, n, H, heat < 0.45 ? LAYERS : heat < 0.72 ? BACK_LAYERS : COOL_LAYERS);
    }
  }
  // licks curling off the edges of the cone
  for (let i = 0; i < 6; i++) {
    const n = (S * 3 + i) * 19, side = i % 2 ? 1 : -1, d = 18 + (i >> 1) * 16 + N(2, n) * 4, L = (9 + 5 * (0.5 + 0.5 * N(5, n + 1))) * (1 - d / 120);
    const ex = d, ey = side * d * A * 0.85 - d * 0.06;
    flameBlade(p, ex, ey, 0.75, side * 0.45 - 0.48, L, 1.6 + L * 0.08, -side * 3, N, n, H, LAYERS);
  }
  // the roar: bright streaks racing out through the heart of the cone
  looped(t, D, 70, S + 250, (r) => ({ e: r.range(-0.6, 0.6), v: r.range(330, 470), life: r.range(0.12, 0.26), l: r.range(4, 9) }), (q, age) => {
    const a = q.e * A - 0.03, [x, y, vx, vy] = drift(6, q.e * 2, Math.cos(a) * q.v, Math.sin(a) * q.v, age, 0, -60, 2, 2);
    const sp = Math.hypot(vx, vy), k = 1 - age / q.life, L = q.l * (sp / 400);
    p.line(x - (vx / sp) * L, y - (vy / sp) * L, x, y, (u) => (u > 0.6 ? (k > 0.5 ? H[0] : H[1]) : k > 0.5 ? H[2] : H[3]));
  });
  // the jet at the lips: white-hot, overlapping tongues that flutter as the breath roars
  JET.forEach(([len, w, a], i) => {
    const n = (S * 5 + i) * 17, L = len * roar(t) * (0.85 + 0.2 * N(5, n)), aa = a + sway(t);
    flameBlade(p, 0, 0, Math.cos(aa), Math.sin(aa), L, w, N(3, n + 3) * 3, N, n, H, LAYERS, 0.5, 1.5);
  });

  // sparks flung out ahead and falling; embers lifting off the far end
  looped(t, D, 40, S + 300, (r) => ({ d: r.range(4, 60), e: r.range(-1, 1), v: r.range(140, 280), life: r.range(0.25, 0.55) }), (q, age) => {
    const a = q.e * A * 1.8 - 0.12, [x, y, vx, vy] = drift(q.d, q.e * q.d * A, Math.cos(a) * q.v, Math.sin(a) * q.v - 30, age, 0, 190, 2, 2);
    spark(p, x, y, vx, vy, 1 - age / q.life, SPARKS);
  });
  looped(t, D, 18, S + 400, (r) => ({ x: r.range(50, 100), y: r.range(-14, 6), vx: r.range(10, 40), vy: -r.range(20, 50), life: r.range(0.8, 1.4), s: r.chance(0.2) ? 2 : 1, ph: r.range(0, 6.3) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -30, 1.6, 1.6);
    ember(p, x + 5 * (Math.sin(age * 2.3 + q.ph) - Math.sin(q.ph)), y, 1 - age / q.life, q.s, EMB, age * 40 + q.ph);
  });

  // light: a flare at the lips, light all along the cone widening with it, a broad halo
  const k = roar(t);
  p.glow(3, 0, 34 * k, GLOW, 0.75 * k);
  p.glow(3, 0, 10, H[0], 0.55);
  for (let d = 10; d < 126; d += 8) p.glow(d, -d * 0.1, 10 + d * 0.2, GLOW, 0.32 * k * (1 - d / 150));
  p.glow(64, -12, 96, GLOW, 0.16 * k);
}
