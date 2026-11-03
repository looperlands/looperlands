// Shared by the fire effects (the leading _ keeps the tools from listing it as an effect).
// Flame tongues, licks, flame puffs that cool into smoke, embers and sparks, with their motion in closed form so
// looping effects can draw them from t alone and stay seamless. The tongue, lick, puff, smoke, ember and spark
// recipes are adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.

import { rand, rng, wrap, noise, mix, hex, clamp, WHITE, SMOKE_RAMP, P, PF } from "../../core/index.mjs";

/** Smooth value noise in [-1, 1] that repeats every `period` cells (a whole number). */
export function pnoise(x, period, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = rand(wrap(i, period), seed), b = rand(wrap(i + 1, period), seed);
  return (a + (b - a) * u) * 2 - 1;
}

/**
 * Noise for a loop D seconds long: N(tt, rate, seed, off) wobbles about `rate` times a second and is the same at
 * tt and tt + D. Pass D = 0 for one-shots (plain noise, no repeat).
 */
export function noiseFor(D) {
  if (!D) return (tt, rate, seed = 0, off = 0) => noise(tt * rate + off, seed);
  return (tt, rate, seed = 0, off = 0) => {
    const P = Math.max(1, Math.round(rate * D));
    return pnoise((tt / D) * P + off, P, seed);
  };
}

/**
 * Seamless particles for a loop D seconds long: count particles, each born at its own phase and reborn every D.
 * make(r, i) builds particle i from its own rng (the same every frame) and returns it with a .life (which may
 * be longer than D); draw(q, age, i) is called for every live copy.
 */
export function looped(t, D, count, seed, make, draw) {
  for (let i = 0; i < count; i++) {
    const r = rng(seed, i), born = r.next() * D, q = make(r, i);
    for (let age = wrap(t - born, D); age < q.life; age += D) draw(q, age, i);
  }
}

/** Hugo's flicker, 0.74 to 1: a slow breath and a fast crackle. N(rate, seed) at the current time. */
export const flicker = (N, s = 0) => 0.74 + 0.16 * N(7.3, 1 + s) + 0.1 * N(19, 2 + s);

/** A fire ramp hot-first (H[0] white .. H[8] smouldering) from a palette dark to bright, any length. */
export const hotFirst = (F) => [...F].reverse();

/** Tongue layers [width share, height share, step of the hot-first ramp]: red rim, orange, yellow, white heart. */
export const LAYERS = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];

/** Layers for big tongues: more orange and a smaller white heart, so the light doesn't wash them out. */
export const BIG_LAYERS = [[1, 1, 6], [0.8, 0.9, 5], [0.62, 0.78, 4], [0.44, 0.6, 3], [0.26, 0.4, 1], [0.12, 0.22, 0]];

/** The same layers a step cooler, for flames further back: dark red rim, deep orange, gold, yellow. */
export const BACK_LAYERS = [[1, 1, 7], [0.76, 0.86, 5], [0.54, 0.68, 3], [0.3, 0.42, 2]];

/**
 * A flame tongue standing at (x, y), h tall, w its half-width at the base, its tip swept sx px sideways: a red
 * rim round orange round yellow round a white heart, every row's width and centre jittered by noise so the
 * edges crackle. N(rate, seed, off) is the effect's noise at this frame; n seeds this tongue. H: hot-first ramp.
 * jit: how far the edges crackle (px); wob: how far the tip wanders (px).
 */
export function flameTongue(p, x, y, h, w, sx, N, n, H, layers = LAYERS, jit = 0.5, wob = 1.1) {
  if (h < 1) return;
  for (const [lw, lh, ri] of layers) {
    const L = h * lh, c = H[ri];
    for (let r = 0; r <= L; r++) {
      const u = r / Math.max(1, L);
      const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N(9, n, r * 0.45) * jit;
      if (half < 0.3) continue;
      const cx = x + sx * u * u * lh + N(4, n + 7, r * 0.2) * u * wob, Y = Math.round(y - r);
      for (let px = Math.round(cx - half), x1 = Math.round(cx + half); px <= x1; px++) p.px(px, Y, c);
    }
  }
}

/**
 * The same tongue lying along any direction (ux, uy) from its root (x, y): for jets, breath and comet tails.
 * len long, w half-width at the root, bend: px the tip is swept sideways (to the left of the direction).
 */
export function flameBlade(p, x, y, ux, uy, len, w, bend, N, n, H, layers = LAYERS, jit = 0.5, wob = 1.1) {
  if (len < 1) return;
  const nx = -uy, ny = ux;
  for (const [lw, lh, ri] of layers) {
    const L = len * lh, c = H[ri];
    for (let r = 0; r <= L; r += 0.5) {
      const u = r / Math.max(1, L);
      const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N(9, n, r * 0.45) * jit;
      if (half < 0.3) continue;
      const off = bend * u * u * lh + N(4, n + 7, r * 0.2) * u * wob, cx = x + ux * r + nx * off, cy = y + uy * r + ny * off;
      for (let q = -half; q <= half; q += 0.5) p.px(cx + nx * q, cy + ny * q, c);
    }
  }
}

/** A solid disc drawn straight in screen space (fast; a disc looks the same mirrored or turned). */
export function solid(p, x, y, r, c) {
  if (r < 0.6) return p.px(x, y, c);
  const cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
  for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
    const dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
    if (s2 < 0) continue;
    const s = Math.sqrt(s2);
    for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.put(sx, sy, c, 1);
  }
}

/** A translucent disc in screen space: smoke and haze. */
export function soft(p, x, y, r, c, a) {
  if (a <= 0.004) return;
  if (r < 0.5) return p.blend(x, y, c, a);
  const cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
  for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
    const dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
    if (s2 < 0) continue;
    const s = Math.sqrt(s2);
    for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.blendPx(sx, sy, c, a);
  }
}

/**
 * A ball of flame with life left k (1 new, 0 gone) cooling down the hot-first ramp H as it ages: a darker rim,
 * a lit core up and to the left, a little tongue on top, a hot heart while it's young, and its light.
 * frac (0..1) nudges how hot it starts. (tx, ty): which way its tongue points (up, unless it's streaming).
 */
export function firePuff(p, x, y, k, size, frac, H, glowK = 0.18, tx = 0, ty = -1) {
  const age = 1 - k, n = H.length, heat = Math.min(0.999, Math.pow(age, 0.62) + frac * 0.1);
  const idx = Math.min(n - 2, Math.floor(heat * (n - 1)));
  const r = size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = H[idx];
  if (idx >= n - 2) return soft(p, x, y, r, c, Math.min(1, k * 3) * 0.85);
  solid(p, x, y, r, H[Math.min(n - 1, idx + 2)]);
  if (r > 1.6 && ty > -0.99) solid(p, x + tx * r * 1.5, y + ty * r * 1.5, r * 0.3, H[Math.min(n - 1, idx + 1)]);
  solid(p, x - r * 0.16, y - r * 0.22, r * 0.78, c);
  if (r > 1.6) solid(p, x + tx * r * 0.9, y + ty * r * 0.9, r * 0.42, c);
  if (idx <= 3 && r > 1.8) solid(p, x - r * 0.28, y - r * 0.34, r * 0.36, H[Math.max(0, idx - 1)]);
  if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, glowK * k);
}

/** A lick: a blob of flame torn off a tongue's tip, a red rim round a yellow heart, shrinking as it rises. */
export function lick(p, x, y, k, s, H) {
  const r = s * (0.4 + 0.6 * k);
  solid(p, x, y, r + 0.6, k > 0.5 ? H[5] : H[6]);
  if (k > 0.35) solid(p, x, y - 0.3, r * 0.6, k > 0.7 ? H[2] : H[4]);
}

const rampAt = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];

/**
 * A puff of smoke with life left k: three soft discs (a body, a denser core sitting low, a lit cap while it's
 * young), swelling and thinning. col tints it (0 for plain smoke); big for slower, fuller smoke.
 */
export function smokePuff(p, x, y, k, size, col = 0, big = false, aMul = 1) {
  const age = 1 - k;
  const r = size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * (big ? 0.5 : 0.4));
  const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * (big ? 0.7 : 0.58) * aMul;
  const c = col ? mix(col, rampAt(SMOKE_RAMP, age), age) : rampAt(SMOKE_RAMP, age * 1.05);
  soft(p, x, y, r, c, a * 0.45);
  soft(p, x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
  if (age < 0.5) soft(p, x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
}

/**
 * An ember with life left k: a hot pixel cooling through cols [hot, warm, cool, rim], flickering out near the
 * end (ph: its flicker phase), with its own light. Big ones (size 2) are a little cross with a darker rim.
 */
export function ember(p, x, y, k, size, cols, ph) {
  if (k < 0.25 && Math.sin(ph) < 0) return;
  const c = k > 0.6 ? cols[0] : k > 0.3 ? cols[1] : cols[2];
  if (size >= 2) {
    const rim = k > 0.45 ? cols[2] : cols[3];
    p.px(x - 1, y, rim), p.px(x + 1, y, rim), p.px(x, y - 1, rim), p.px(x, y + 1, rim);
    p.px(x, y, c);
    p.glow(x, y, 8, c, 0.4 * k);
    return;
  }
  p.px(x, y, c);
  if (size > 1.4) p.px(x, y + 1, cols[3]);
  p.glow(x, y, 3 + size, c, 0.35 * k);
}

/** A spark: a streak stretched along its velocity, a hot head and a cooler tail, and a point of light. */
export function spark(p, x, y, vx, vy, k, cols) {
  const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, len = Math.min(9, 1 + sp * 0.022);
  const head = k > 0.6 ? cols[0] : k > 0.3 ? cols[1] : cols[2];
  p.line(x - ux * len, y - uy * len, x - ux * len * 0.4, y - uy * len * 0.4, k > 0.5 ? head : cols[cols.length - 1]);
  p.line(x - ux * len * 0.45, y - uy * len * 0.45, x, y, head);
  p.glow(x, y, 3, head, 0.45 * k);
}

function along(x, v, a, k, t) {
  if (k <= 0) return [x + v * t + 0.5 * a * t * t, v + a * t];
  const e = Math.exp(-k * t), vt = a / k;
  return [x + vt * t + ((v - vt) * (1 - e)) / k, vt + (v - vt) * e];
}

/**
 * Where a body is t seconds after launch from (x, y) at (vx, vy), under acceleration (ax, ay) px/s² and linear
 * drag kx, ky (1/s): [x, y, vx, vy]. The particle kinds' own numbers: FIRE (0, -95, 5, 3.2), SMOKE
 * (0, -16, 1.6, 1.2), EMBER (0, -30, 1.6, 1.6), SPARK (0, 427, 2.2, 2.2).
 */
export function drift(x, y, vx, vy, t, ax, ay, kx, ky) {
  const X = along(x, vx, ax, kx, t), Y = along(y, vy, ay, ky, t);
  return [X[0], Y[0], X[1], Y[1]];
}

/** A spark's flight: falls, drags, and bounces off the floor at y = floor, losing speed each time. */
export function sparkAt(x, y, vx, vy, t, floor = 0, g = 427, k = 2.2) {
  let s = [x, y, vx, vy], left = t;
  for (let b = 0; b < 3; b++) {
    const e = drift(s[0], s[1], s[2], s[3], left, 0, g, k, k);
    if (e[1] < floor || s[1] >= floor) return e;
    let lo = 0, hi = left;
    for (let i = 0; i < 16; i++) {
      const m = (lo + hi) / 2;
      if (drift(s[0], s[1], s[2], s[3], m, 0, g, k, k)[1] < floor) lo = m;
      else hi = m;
    }
    const c = drift(s[0], s[1], s[2], s[3], hi, 0, g, k, k);
    s = [c[0], floor - 0.25, c[2] * 0.7, -Math.abs(c[3]) * 0.45];
    left -= hi;
  }
  const e = drift(s[0], s[1], s[2], s[3], left, 0, g, k, k);
  return e[1] < floor ? e : [e[0], floor - 0.25, e[2], 0];
}

/** A pool of light on the floor: an ellipse of glow, k at its middle falling to 0 at its rim. */
export function floorLight(p, x, y, rx, ry, c, k) {
  if (k <= 0.004 || rx < 1 || ry < 0.5) return;
  p.shade(x - rx, y - ry, x + rx, y + ry, (px, py, out) => {
    const dx = (px - x) / rx, dy = (py - y) / ry, d = dx * dx + dy * dy;
    if (d >= 1) return;
    const f = 1 - Math.sqrt(d);
    out.l = c;
    out.k = f * f * k;
  });
}

/**
 * A core Particles system drawn with its flame puffs recoloured down the hot-first ramp H (the core draws them
 * in its own fire colours): smoke and back particles, then the flames, then sparks and the rest on top.
 */
export function simDraw(p, ps, H, layer) {
  const all = ps.list, rest = [], fire = [];
  for (const q of all) (q.k === P.FIRE ? fire : rest).push(q);
  const puffs = (back) => {
    for (const q of fire) if (q.delay <= 0 && !!(q.flag & PF.BACK) === back) firePuff(p, q.x, q.y, q.life / q.max, q.size, q.seed % 1, H);
  };
  ps.list = rest;
  if (layer !== "front") ps.draw(p, "back"), puffs(true);
  if (layer !== "back") puffs(false), ps.draw(p, "front");
  ps.list = all;
}

const SMOKE1 = hex("#5b5566");

/**
 * A fire for loops, drawn from t alone. Tongues T: [[dx, dy, height share, half-width, back row?], ...] from the
 * base (o.x, o.y), back row first then outer to inner; licks torn off their tips, flame puffs that burn out into
 * smoke, a smoke plume curling off with the draught, embers, and the fire's light.
 * o: { H, D, NL (noiseFor(D)), S (seed), height, lean, rates per second: puffs and licks (per tongue), smoke,
 * embers; spread (how wide embers and smoke leave), glow (light strength), glowR, mid() (called after the
 * tongues, before what flies off them: draw what the fire burns out of there) }. Wide tongues get BIG_LAYERS.
 * Returns { tip(i, tt), fl (this frame's flicker) }.
 */
export function burn(p, t, T, o) {
  const { H, D, NL, S } = o, HC = o.height, X = o.x ?? 0, Y = o.y ?? 0, W = o.spread ?? 6, G = o.glow ?? 1;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const fla = (tt) => 0.74 + 0.16 * NL(tt, 7.3, S + 1) + 0.1 * NL(tt, 19, S + 2), fl = fla(t);
  const SMOKE = mix(SMOKE1, H[6], 0.25), EMB = [H[1], H[2], H[4], H[6]], GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25);
  const R = rng(S, 77), count = (rate) => Math.round(rate * D);
  const TT = T.map(([dx, dy, h, w, back], i) => ({ dx: dx + R.range(-0.3, 0.3), y: dy, h: 2 + HC * h * R.range(0.92, 1.08), w: w * R.range(0.92, 1.08), back, env: h, n: (S * 7 + i) * 13 }));
  const lean = (tt) => NL(tt, 0.67, S + 90) * (o.lean ?? 0.1);
  const height = (i, tt) => {
    const { h, n } = TT[i], leap = Math.max(0, NL(tt, 2.6, n + 70) - 0.55) * 1.4;
    return (h + 0.25 * h * NL(tt, 3.3, n) + h * leap) * (0.9 + 0.1 * fla(tt));
  };
  const sweep = (i, tt, h) => NL(tt, 2.2, TT[i].n + 40) * (1 + h * 0.08) + lean(tt) * h * 0.9 - clamp(TT[i].dx * 0.3, -2.5, 2.5);
  const tip = (i, tt) => {
    const h = height(i, tt);
    return [X + TT[i].dx + sweep(i, tt, h) * 0.85, Y + TT[i].y - h * 0.88 + 3, h];
  };
  const tongueAt = (i) => {
    const { dx, y, w, n, back } = TT[i], h = height(i, t);
    flameTongue(p, X + dx, Y + y, h, w, sweep(i, t, h), N, n, H, back ? BACK_LAYERS : w > 2.2 ? BIG_LAYERS : LAYERS, 0.5, 1.1 + h * 0.04);
  };

  // the plume: each puff keeps the sway the plume had when it left, so the wiggle climbs it
  looped(t, D, count(o.smoke ?? 12), S + 300, (r) => ({ x: r.range(-W, W) * 0.7, y: -HC * 0.8 - r.range(0, 6), vx: r.range(-2, 2), vy: -r.range(10, 17), life: r.range(...(o.smokeLife ?? [1.6, 2.6])), s: r.range(0.7, 1.1) * (o.smokeSize ?? 3) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, o.wind ?? 3, -20, 1.6, 1);
    smokePuff(p, X + x + NL(t - age, 0.8, S + 60) * (1.5 + 2.5 * age), Y + y, 1 - age / q.life, q.s, SMOKE);
  });
  // flame puffs shed from the tips
  const puffs = [];
  looped(t, D, TT.length * count(o.puffs ?? 8), S + 200, (r, j) => {
    const i = j % TT.length, fire = r.range(0.14, 0.3), smokes = r.chance(0.45);
    return { i, fire, smokes, sl: r.range(0.8, 1.4), ox: r.range(-1, 1), oy: r.range(0, 4), vx: r.range(-4, 4), vy: -r.range(15, 30), s: r.range(0.8, 1.6) * (0.8 + 0.6 * TT[i].env), f: r.next(), life: fire + (smokes ? 1.4 : 0) };
  }, (q, age) => {
    const [tx, ty] = tip(q.i, t - age);
    const [x, y, vx, vy] = drift(tx + q.ox, ty + q.oy, q.vx, q.vy, Math.min(age, q.fire), 0, -95, 5, 3.2);
    if (age < q.fire) return puffs.push([x, y, 1 - age / q.fire, q.s, q.f]);
    if (age - q.fire > q.sl) return;
    const [sx, sy] = drift(x, y, vx * 0.6, vy * 0.6 - 6, age - q.fire, o.wind ?? 3, -16, 1.6, 1.2);
    smokePuff(p, sx, sy, 1 - (age - q.fire) / q.sl, q.s * 0.7, 0);
  });
  for (let i = 0; i < TT.length; i++) if (TT[i].back) tongueAt(i);
  for (let i = 0; i < TT.length; i++) if (!TT[i].back) tongueAt(i);
  o.mid?.(fl);
  // licks torn off the tips, rising and shrinking
  looped(t, D, TT.length * count(o.licks ?? 4), S + 220, (r, j) => ({ i: j % TT.length, vx: r.range(-3, 3), vy: -r.range(12, 22), s: r.range(0.9, 1.6) * (0.8 + 0.5 * TT[j % TT.length].env), life: 0.26 }), (q, age) => {
    const [tx, ty] = tip(q.i, t - age);
    lick(p, tx + q.vx * age, ty - 2 + q.vy * age, 1 - age / q.life, q.s, H);
  });
  for (const [x, y, k, s, f] of puffs) firePuff(p, x, y, k, s, f, H);
  // embers carried up by the heat, wandering and cooling
  looped(t, D, count(o.embers ?? 8), S + 500, (r) => ({ x: r.range(-W, W), y: -r.range(HC * 0.3, HC * 0.8), vx: r.range(-15, 15), vy: -r.range(25, 60), life: r.range(1.1, 2.4), s: r.chance(0.15) ? 2 : r.range(1, 1.6), a: r.range(0, 6.3), b: r.range(0, 6.3) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -30, 1.6, 1.6);
    ember(p, X + x + 7 * (Math.sin(age * 2.3 + q.a) - Math.sin(q.a)), Y + y + 2 * (Math.sin(age * 3 + q.b) - Math.sin(q.b)), 1 - age / q.life, q.s, EMB, age * 40 + q.a);
  });
  // light: a broad warm wash, lights on the flames, a hot heart at the base
  if (G > 0) {
    const R1 = o.glowR ?? 46, lx = X + lean(t) * 12;
    p.glow(lx, Y - HC * 0.35, R1 * 1.5, GLOW, 0.22 * fl * G);
    p.glow(lx, Y - HC * 0.75, R1, GLOW, 0.34 * fl * G);
    p.glow(X, Y - HC * 0.2, R1 * 0.32, H[2], 0.2 * fl * G);
    p.glow(X, Y - 2, 8, H[0], 0.14 * fl * G);
  }
  return { tip, fl };
}
