// The flame-puff, smoke and spark recipe is adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, hex, clamp, smooth, WHITE } from "../../core/index.mjs";
import { noiseFor, pnoise, hotFirst, flameTongue, firePuff, smokePuff, spark, drift, looped, solid, LAYERS } from "./_lib.mjs";

export const meta = {
  name: "Flamethrower",
  desc: "A pressurised jet shooting right: a blue pilot at the nozzle, a tight stream with surges racing down it, a sputter, burning drops falling off, a tip that curls up into smoke.",
  tags: ["fire", "flamethrower", "stream", "weapon", "directional", "loop"],
  size: [184, 104],
  origin: [30, 60],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    pilot: ["#1b2a8a", "#3a62e0", "#a8d4ff"],
    reach: 112,
    speed: 280,
    seed: 3,
  },
};

const D = meta.duration, NL = noiseFor(D), SOOT = hex("#2a2430");
// the sputter: the jet coughs once a loop, then surges back
const COUGH = 0.55;
const flow = (te) => {
  const u = ((te % D) + D) % D;
  return 1 - smooth(COUGH, COUGH + 0.04, u) * (1 - smooth(COUGH + 0.1, COUGH + 0.16, u)) + 0.25 * Math.exp(-(((u - COUGH - 0.2) / 0.05) ** 2));
};

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), PL = fit(o.pilot, 3), S = o.seed, L = o.reach, V = o.speed;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25), SPARKS = [H[1], H[2], H[4], H[5]], SMOKE = mix(SOOT, H[7], 0.3);
  // the stream's centre line: dead straight at the nozzle, sagging and wavering as it runs out
  const cy = (x) => 5 * (x / L) ** 2 + N(1.2, S + 9, x * 0.02) * 2.2 * (x / L) ** 1.5;
  const width = (x) => (2.1 + 5 * Math.pow(x / L, 0.7)) * flow(t - x / V);

  // the curl: where the stream runs out of push, burning fuel rolls up and back on itself and turns to smoke
  const fire = [], smoke = [];
  looped(t, D, 80, S + 100, (r) => ({ a0: r.range(-0.3, 0.5), R: r.range(9, 15), w: r.range(5, 7.5), up: r.range(4, 12), dx: r.range(-6, 2), fl: r.range(0.38, 0.62), sl: r.range(0.6, 1.0), s: r.range(2.4, 4.4), f: r.next(), life: 1.6 }), (q, age) => {
    const tb = t - age, k = flow(tb - L / V);
    if (k < 0.4) return;
    // round a curl: forward, up and back over the top, rising as it goes
    const x0 = L + q.dx, y0 = cy(L), a = Math.min(age, q.fl) * q.w + q.a0;
    const x = x0 + q.R * Math.sin(a), y = y0 - q.R * (1 - Math.cos(a)) - q.up * age;
    if (age < q.fl) return fire.push([age / q.fl, x, y, q, k]);
    if (age - q.fl < q.sl) smoke.push([(age - q.fl) / q.sl, x - (age - q.fl) * 6, y - (age - q.fl) * 16, q]);
  });
  for (const [u, x, y, q] of smoke) smokePuff(p, x, y, 1 - u, q.s * 1.2, SMOKE, true, 0.85);
  fire.sort((a, b) => b[0] - a[0]);
  for (const [u, x, y, q, k] of fire) firePuff(p, x, y, 1 - u, q.s * (0.8 + 1.1 * u) * k, q.f, H, 0.1);

  // flames licking up off the burning fuel, riding along the stream, swept back by the wind of it
  for (let i = 0; i < 13; i++) {
    const n = (S * 3 + i) * 19, ph = ((i * 0.618 + t / D) % 1), x = 10 + ph * (L - 14), k = flow(t - x / V);
    if (k < 0.35) continue;
    const h = (2 + 11 * (x / L)) * (0.55 + 0.6 * (0.5 + 0.5 * N(5, n + 1))) * k * Math.min(1, (1 - ph) * 6);
    flameTongue(p, x, cy(x) - width(x) * 0.6, h, 1.1 + 1.6 * (x / L), -h * 0.55, N, n, H, LAYERS);
  }
  // the stream: a white core in yellow, orange and a red skin, surges racing down it
  const P = Math.round(D * 3);
  for (let x = 0; x <= L; x++) {
    const c = cy(x), w = width(x) * (1 + 0.15 * pnoise(x * 0.4 - (t / D) * 24, 24, S + 4));
    if (w < 0.4) continue;
    const surge = ((x * 0.035 - (t / D) * P) % 1 + 1) % 1 < 0.12 ? 1 : 0;
    for (let y = Math.floor(c - w - 1); y <= Math.ceil(c + w + 1); y++) {
      const q = Math.abs(y + 0.5 - c) / w;
      if (q > 1.15) continue;
      // a white core near the nozzle cooling to yellow down the stream; ragged red skin
      let lvl = (q < 0.3 ? 0 : q < 0.55 ? 1 : q < 0.78 ? 2 : q < 1 ? 3 : 4) + (x > L * 0.45 && q < 0.55 ? 1 : 0);
      lvl = Math.max(0, Math.min(4, lvl - surge));
      if (lvl === 4 && pnoise(x * 0.5 + y * 7.3 - (t / D) * 40, 40, S + 6) < 0) continue;
      p.px(x, y, [H[0], H[2], H[4], H[6], H[7]][lvl]);
    }
    // two hot strands twisting through the fuel, racing downstream
    for (const ph of [0, Math.PI]) {
      const a = x * 0.22 - (t / D) * Math.PI * 2 * 9 + ph, sy = c + Math.sin(a) * w * 0.55;
      if (Math.cos(a) > -0.1 && w > 1.2) p.px(x, sy, Math.cos(a) > 0.55 ? H[0] : H[1]);
    }
  }
  // the pilot at the nozzle: a blue cone of gas where it lights
  const pk = flow(t);
  for (let x = 0; x < 6; x++) for (let y = -2; y <= 2; y++) if (Math.abs(y) <= 2 - x * 0.3) p.px(x, y, Math.abs(y) < 1 ? (x < 2 ? PL[2] : PL[1]) : PL[0]);
  solid(p, 1, 0, 1.6 * pk, WHITE);

  // burning drops shaken off the stream: they arc down trailing flame and burn out
  looped(t, D, 10, S + 200, (r) => ({ d: r.range(20, 95), vx: r.range(0.3, 0.6), vy: r.range(-25, 15), life: r.range(0.35, 0.6) }), (q, age) => {
    const tb = t - age;
    if (flow(tb - q.d / V) < 0.5) return;
    const at = (a) => drift(q.d, cy(q.d), V * q.vx, q.vy, a, 0, 260, 1.2, 0.5);
    for (let j = 4; j >= 1; j--) {
      const a = age - j * 0.035;
      if (a < 0) continue;
      const [x, y] = at(a);
      firePuff(p, x, y, 1 - Math.min(0.99, j * 0.18 + age / q.life * 0.4), 1.8 - j * 0.25, 0.3, H, 0.06);
    }
    const [x, y] = at(age), k = 1 - age / q.life;
    p.px(x, y, k > 0.5 ? H[0] : H[2]);
    p.px(x + 1, y, H[3]);
    p.glow(x, y, 6, H[3], 0.45 * k);
  });
  // the cough: when the jet sputters the nozzle spits sparks and a puff of smoke
  looped(t, D, 12, S + 300, (r) => ({ born: COUGH + r.range(0, 0.08), a: r.range(-0.8, 0.8), v: r.range(120, 240), life: r.range(0.2, 0.45) }), (q, age) => {
    const u = ((t - age) % D + D) % D;
    if (Math.abs(u - q.born) > 0.06) return;
    const [x, y, vx, vy] = drift(4, 0, Math.cos(q.a) * q.v, Math.sin(q.a) * q.v, age, 0, 300, 2.5, 2.5);
    spark(p, x, y, vx, vy, 1 - age / q.life, SPARKS);
  });
  // and spits a few blobs of burning fuel that fall short
  looped(t, D, 5, S + 350, (r) => ({ born: COUGH + r.range(0.01, 0.1), v: r.range(90, 170), vy: r.range(-30, 10), life: r.range(0.25, 0.4), s: r.range(1.6, 2.6) }), (q, age) => {
    const u = ((t - age) % D + D) % D;
    if (Math.abs(u - q.born) > 0.05) return;
    const [x, y] = drift(4, 0, q.v, q.vy, age, 0, 200, 2, 1);
    firePuff(p, x, y, 1 - age / q.life, q.s, 0.2, H, 0.1, -0.86, -0.5);
  });
  {
    const u = ((t % D) + D) % D, a = u - COUGH;
    if (a > 0 && a < 0.7) smokePuff(p, 8 + a * 20, -a * 18, 1 - a / 0.7, 3, SMOKE, false, 0.8);
  }

  // light: the pilot, the stream, the burning tip
  p.glow(2, 0, 34 * pk, GLOW, 0.8 * pk);
  p.glow(2, 0, 9, PL[2], 0.45 * pk);
  for (let d = 8; d <= L; d += 8) p.glow(d, cy(d), 12 + d * 0.16, GLOW, 0.3 * flow(t - d / V));
  p.glow(L, cy(L) - 10, 52, GLOW, 0.34 * flow(t - L / V));
}
