// The flame-puff, smoke and spark recipe is adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, hex, clamp, WHITE, TAU } from "../../core/index.mjs";
import { noiseFor, pnoise, hotFirst, flameBlade, firePuff, smokePuff, spark, ember, drift, looped, LAYERS } from "./_lib.mjs";

export const meta = {
  name: "Fireball",
  desc: "A fireball flying right: a churning white-hot head with a corona of flame, a long torn tail of flame puffs cooling into smoke, embers shed behind.",
  tags: ["fire", "fireball", "projectile", "magic", "directional", "loop"],
  size: [136, 56],
  origin: [112, 28],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    radius: 5,
    speed: 120,
    seed: 5,
  },
};

const D = meta.duration, NL = noiseFor(D), SMOKE1 = hex("#5b5566");
// the comet body: tongues rooted in the head streaming back, the longest behind [length, half-width, y offset]
const BODY = [[30, 4.2, 0], [23, 4.4, -1.6], [22, 4.4, 1.6], [15, 4.6, 0]];
// the corona: thin licks peeling back off the head [angle on the head (0 is the nose), length, half-width]
const CORONA = [[-1.3, 6, 1.1], [-1.8, 8, 1.2], [-2.3, 7, 1.1], [1.3, 6, 1.1], [1.8, 8, 1.2], [2.3, 7, 1.1]];

// the head: a ball whose outline churns and whose heat swirls in a spiral, white at the heart, swept back
function head(p, H, t, R0, S, hx, hy) {
  const ph = t / D;
  p.shade(hx - R0 * 2.4, hy - R0 * 1.7, hx + R0 * 1.5, hy + R0 * 1.7, (x, y, out) => {
    x -= hx;
    y -= hy;
    const d = Math.hypot(x, y), th = Math.atan2(y, x), back = Math.max(0, -Math.cos(th)), a = th / TAU;
    const bump = 0.55 * pnoise(a * 9 + ph * 9, 9, S) + 0.35 * pnoise(a * 5 - ph * 10, 5, S + 1);
    const rim = R0 * (1 + 0.55 * back * back) + bump;
    if (d > rim) return;
    const swirl = pnoise(a * 5 - ph * 10 + d * 0.45, 5, S + 2);
    const h = 1 - d / rim + 0.26 * swirl + 0.1 * (1 - back);
    // the leading edge: a crisp hot rim where it cuts the air
    if (rim - d < 1 && back < 0.3) return h > 0.3 ? H[3] : H[5];
    return h > 0.74 ? H[0] : h > 0.58 ? H[1] : h > 0.42 ? H[2] : h > 0.27 ? H[4] : h > 0.13 ? H[5] : H[6];
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), S = o.seed, R0 = o.radius, V = o.speed;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25), SMOKE = mix(SMOKE1, H[6], 0.3), SPARKS = [H[1], H[2], H[4], H[5]], EMB = [H[1], H[2], H[4], H[6]];
  // the head bobs a hair as it flies
  const hx = N(3, S + 50) * 0.5, hy = N(2.5, S + 51) * 0.7;

  // the tail: flame puffs thrown off the back that the head leaves behind; they cool, swell, rise and some
  // burn out into smoke. Positions are relative to the head, which outruns them.
  const fire = [], smoke = [];
  looped(t, D, 130, S + 100, (r) => {
    const fl = r.range(0.22, 0.55), sm = r.chance(0.55), x = -r.range(2, 24);
    return { x, y: r.range(-1, 1) * (R0 - 0.1 * -x), v: V * r.range(0.3, 0.6), vy: r.range(-16, 16), fl, sm, sl: r.range(0.25, 0.45), s: r.range(1.3, 2.9), f: r.next() * 0.5 + 0.5 * (-x / 24), life: fl + (sm ? 0.45 : 0) };
  }, (q, age) => {
    const ta = Math.min(age, q.fl), [wx, y, wvx, vy] = drift(0, q.y, q.v, q.vy, ta, 0, -70, 4.5, 3);
    const x = q.x + wx - V * ta;
    if (age < q.fl) return fire.push([age, x, y, q]);
    if (!q.sm || age - q.fl > q.sl) return;
    const sa = age - q.fl, [sx, sy] = drift(x, y, wvx - V, vy * 0.6 - 6, sa, V * 2, -30, 2, 1.2);
    smoke.push([sa, sx, sy, q]);
  });
  for (const [sa, x, y, q] of smoke) smokePuff(p, x, y, 1 - sa / q.sl, q.s * 0.9, SMOKE);
  fire.sort((a, b) => b[0] - a[0]);
  for (const [age, x, y, q] of fire) {
    const u = age / q.fl;
    firePuff(p, x, y, 1 - u, q.s * (1 + 1.3 * u), q.f, H, 0.07, -0.86, -0.5);
  }

  // the body: tongues of flame rooted in the head streaming back, and a corona licking round it
  BODY.forEach(([len, w, dy], i) => {
    const n = (S * 5 + i) * 17, L = len * (0.82 + 0.25 * N(4, n)) * (1 + 0.3 * Math.max(0, N(2.4, n + 3)));
    flameBlade(p, hx + 1, hy + dy * 0.5, -1, dy * 0.02, L, w * R0 / 5, N(3, n + 5) * 3 + dy, N, n, H, LAYERS, 0.5, 1.1 + L * 0.05);
  });
  CORONA.forEach(([a, len, w], i) => {
    const n = (S * 5 + i + 20) * 17, L = len * (0.7 + 0.4 * (0.5 + 0.5 * N(6, n))), ox = Math.cos(a) * R0 * 0.85, oy = Math.sin(a) * R0 * 0.85;
    const dx = Math.cos(a) * 0.55 - 1, dy = Math.sin(a) * 0.55, l = Math.hypot(dx, dy);
    flameBlade(p, hx + ox, hy + oy, dx / l, dy / l, L, w, -Math.sign(a) * 1.5, N, n, H, LAYERS);
  });
  head(p, H, t, R0, S, hx, hy);

  // motes flicked off the head's skin: short hot streaks that die at once
  looped(t, D, 26, S + 200, (r) => ({ a: r.range(-2.4, 2.4), v: r.range(30, 70), life: r.range(0.08, 0.18) }), (q, age) => {
    const ca = Math.cos(q.a), sa = Math.sin(q.a), d = R0 * 0.9 + q.v * age, x = hx + ca * d - V * 0.4 * age, y = hy + sa * d;
    const k = 1 - age / q.life, L = 1 + 2 * k;
    p.line(x - ca * L + V * 0.02, y - sa * L, x, y, k > 0.5 ? H[1] : H[3]);
    p.glow(x, y, 3, H[2], 0.4 * k);
  });
  // embers left behind: streaks that the head outruns, falling as they cool
  looped(t, D, 30, S + 300, (r) => ({ x: -r.range(2, 16), y: r.range(-3, 3), v: V * r.range(0.3, 0.8), vy: r.range(-20, 20), life: r.range(0.25, 0.55), big: r.chance(0.25), ph: r.range(0, 6.3) }), (q, age) => {
    const [wx, y, wvx, vy] = drift(0, q.y, q.v, q.vy, age, 0, 50, 3, 2);
    const x = q.x + wx - V * age, k = 1 - age / q.life;
    if (q.big) ember(p, x, y, k, 2, EMB, age * 40 + q.ph);
    else spark(p, x, y, wvx - V, vy, k, SPARKS);
  });

  // light: a hot heart, a warm halo, light running down the tail
  const fl = 0.85 + 0.15 * N(9, S + 7);
  p.glowLine(hx - 6, hy, -50, -2, 12, GLOW, 0.2 * fl);
  p.glow(hx - 2, hy, 42, GLOW, 0.42 * fl);
  p.glow(hx, hy, 13, H[1], 0.3 * fl);
}
