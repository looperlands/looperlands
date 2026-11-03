// The layered tongue, its noise-torn edges and the shed puffs are adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, clamp, WHITE, TAU } from "../../core/index.mjs";
import { noiseFor, hotFirst, looped, drift, soft } from "./_lib.mjs";

export const meta = {
  name: "Spirit flame",
  desc: "A cold blue-teal ghost fire floating in the air: a bright rim round a hollow dark heart, a wave climbing its wispy tail, curls breaking off, cold sparks rising.",
  tags: ["fire", "spirit", "ghost", "magic", "cold", "ambient", "loop"],
  size: [80, 124],
  origin: [40, 94],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#040a16", "#08203a", "#0b3a52", "#0f5e6e", "#16908e", "#2cc4b4", "#7ef0dc", "#c8fff2", "#ffffff"],
    seed: 7,
  },
};

const D = meta.duration, NL = noiseFor(D);
// inverted layers: the rim burns brightest, a teal band inside it, a dark hollow heart, a pale core low down
const GHOST = [[1, 1, 1], [0.8, 0.92, 3], [0.6, 0.78, 6], [0.3, 0.42, 2], [0.14, 0.22, 0]];

// a tongue whose centre line carries a wave climbing it: drawn row by row in layers like a fire tongue
function ghostTongue(p, x, y, h, w, centre, N, n, H, layers, jit = 0.5) {
  for (const [lw, lh, ri] of layers) {
    const L = h * lh, c = H[ri];
    for (let r = 0; r <= L; r++) {
      const u = r / Math.max(1, L), v = r / h;
      // a teardrop: round at the bottom, swelling, then drawn out thin
      const half = w * lw * Math.pow(1 - u, 0.75) * Math.min(1, (r + 1.5) / 4) + N(6, n, r * 0.4) * jit * u;
      if (half < 0.3) continue;
      const cx = x + centre(v, r), Y = Math.round(y - r);
      for (let px = Math.round(cx - half), x1 = Math.round(cx + half); px <= x1; px++) p.px(px, Y, c);
    }
  }
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), S = o.seed, ph = t / D;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const COLD = mix(H[3], WHITE, 0.15), bob = Math.sin(ph * TAU) * 1.5;
  // the wave: it climbs the flame twice a loop, growing toward the tip, and the whole flame leans with a slow drift
  const lean = N(0.67, S + 2) * 3;
  const wave = (v, r, k = 0) => (Math.sin(r * 0.24 - ph * TAU * 2 + k) * 2.2 + Math.sin(r * 0.11 - ph * TAU + k * 0.5) * 3.2) * v * v + lean * v * v;
  const H0 = 44 * (0.92 + 0.08 * N(1.3, S + 3)), y0 = bob;

  // the glow it casts, cold and slow
  const br = 0.9 + 0.1 * N(2, S + 4);
  p.glow(0, y0 - 16, 60, COLD, 0.36 * br);
  p.glow(wave(0.5, 20) * 0.5, y0 - 20, 26, H[2], 0.2 * br);
  // curls breaking off the tips and drifting up, thinning out
  looped(t, D, 40, S + 300, (r) => ({ x: r.range(-4, 4), y: -H0 * r.range(0.55, 0.95), vx: r.range(-7, 7), vy: -r.range(10, 22), life: r.range(1, 1.9), s: r.range(1.4, 2.8), a: r.range(0, TAU), w: r.range(2, 3.5) }), (q, age) => {
    const tb = t - age, [x, y] = drift(q.x + wave(0.9, 26, 0) * 0.5, q.y + y0, q.vx, q.vy, age, 0, -6, 1.2, 0.6), k = 1 - age / q.life;
    const cx = x + Math.sin(age * q.w + q.a) * 3 * (age + 0.2), a = Math.min(1, age * 5) * k;
    soft(p, cx, y, q.s * (0.8 + age * 0.8), H[4], 0.35 * a);
    soft(p, cx - 0.4, y - 0.6, q.s * 0.5 * (0.8 + age * 0.5), H[2], 0.4 * a * k);
    p.glow(cx, y, 6, H[3], 0.15 * a);
  });
  // two thin wisps trailing off the sides, then the body
  // side wisps that flicker out and curl, now long, now gone
  const wl = Math.max(0, 0.25 + 0.55 * N(1.7, S + 6)), wr = Math.max(0, 0.25 + 0.55 * N(1.7, S + 7));
  if (wl > 0.12) ghostTongue(p, -4, y0 - 4, H0 * wl, 2.4, (v, r) => wave(v, r, 2.1) - 6 * v * v + 3 * Math.sin(v * 5 - ph * TAU * 2) * v, N, S * 11 + 1, H, GHOST);
  if (wr > 0.12) ghostTongue(p, 4.2, y0 - 4, H0 * wr, 2.4, (v, r) => wave(v, r, -1.8) + 6 * v * v - 3 * Math.sin(v * 5 - ph * TAU * 2 + 1) * v, N, S * 11 + 2, H, GHOST);
  ghostTongue(p, 0, y0, H0, 8.6, (v, r) => wave(v, r), N, S * 11, H, GHOST, 0.6);
  // bright strands drifting up through the hollow heart
  for (const k of [0, 1]) {
    for (let r = 4; r < H0 * 0.72; r++) {
      const v = r / H0, x = wave(v, r) + Math.sin(r * 0.35 - ph * TAU * 3 + k * Math.PI) * 2.2 * (1 - v), on = Math.sin(r * 0.2 - ph * TAU * 4 + k * 2) > 0.2;
      if (on) p.px(x, y0 - r, k ? H[2] : H[1]);
    }
  }
  // light along the body
  for (const v of [0.2, 0.45, 0.7]) p.glow(wave(v, H0 * v), y0 - H0 * v, 12, H[2], 0.16 * br);
  // the pale heart breathing low in the flame
  p.glow(0, y0 - 4, 9, H[1], 0.22 + 0.06 * N(3, S + 5));
  // cold sparks rising off it, twinkling
  looped(t, D, 34, S + 400, (r) => ({ x: r.range(-7, 7), y: -r.range(4, 28), vx: r.range(-12, 12), vy: -r.range(14, 34), life: r.range(0.9, 1.8), a: r.range(0, TAU) }), (q, age) => {
    const [x, y] = drift(q.x, q.y + y0, q.vx, q.vy, age, 0, -10, 1.2, 1.2), k = 1 - age / q.life, tw = 0.5 + 0.5 * Math.sin(age * 14 + q.a);
    const sx = x + Math.sin(age * 3 + q.a) * 3;
    if (k * (0.4 + 0.6 * tw) < 0.2) return;
    p.px(sx, y, tw > 0.7 && k > 0.5 ? H[0] : k > 0.5 ? H[1] : H[3]);
    if (tw > 0.85 && k > 0.6) p.px(sx - 1, y, H[3]), p.px(sx + 1, y, H[3]), p.px(sx, y - 1, H[3]), p.px(sx, y + 1, H[3]);
    p.glow(sx, y, 4, H[2], 0.3 * k);
  });
}
