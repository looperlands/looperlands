// The tongue, lick, flame-puff, smoke and ember recipe is adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Rng, fit, mix, hex, rand, clamp, WHITE } from "../../core/index.mjs";
import { noiseFor, hotFirst, flameTongue, firePuff, lick, smokePuff, ember, spark, drift, sparkAt, floorLight, looped, LAYERS, BACK_LAYERS } from "./_lib.mjs";

export const meta = {
  name: "Campfire",
  desc: "Crossed logs on a bed of coals and a lively fire: tongues that lick and leap, popping sparks, embers drifting up, smoke curling off, a warm pool of light.",
  tags: ["fire", "campfire", "prop", "light", "smoke", "ambient", "loop"],
  size: [128, 128],
  origin: [64, 112],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    wood: ["#0e080a", "#24130f", "#3b2216", "#5a3520", "#8a5a34", "#b9884f"],
    height: 22,
    seed: 3,
  },
};

const D = meta.duration, NL = noiseFor(D), SMOKE1 = hex("#5b5566"), ASH = [hex("#2a2530"), hex("#4a4350"), hex("#6b6270")];

// the logs, near end first: they cross in an X over the coals, their near ends showing the cut grain and their
// far ends poking out past the flames
const LOGS = [
  [-19, 2, 15, -12, 3.4],
  [19, 2, -15, -12, 3.4],
];
const CROSS = 0.56;
// big tongues keep more orange and a smaller white heart, so the light doesn't wash them out
const BIG_LAYERS = [[1, 1, 6], [0.8, 0.9, 5], [0.62, 0.78, 4], [0.44, 0.6, 3], [0.26, 0.4, 1], [0.12, 0.22, 0]]; // the crossing, as a share of each log's length

// the fire: [x, base, height (share of o.height), half-width, back row?]
const TONGUES = [
  [-7.5, -7, 0.42, 1.8, 1],
  [7.5, -7, 0.46, 1.8, 1],
  [-3, -9, 0.78, 2.0, 1],
  [3.2, -9, 0.82, 2.0, 1],
  [-12, -3, 0.14, 1.3, 0],
  [12.5, -3, 0.16, 1.3, 0],
  [-9.5, -4.5, 0.3, 1.9, 0],
  [9.5, -4.5, 0.34, 1.9, 0],
  [-5, -6, 0.6, 2.6, 0],
  [5.2, -6, 0.66, 2.6, 0],
  [0, -7, 1, 3.4, 0],
];

// a log from its near end (x0, y0) to its far end, radius r, drawn between u0 and u1 along it: a 1 px dark rim,
// a lit top, grooves running along the grain, a shadowed underside; charred with glowing cracks in the fire
function log(p, L, W, H, u0, u1, t, S) {
  const [x0, y0, x1, y1, r] = L, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ax = dx / len, ay = dy / len;
  let nx = -ay, ny = ax;
  if (ny < 0) (nx = -nx), (ny = -ny);
  const rim = 1 - 1.05 / r;
  p.shade(Math.min(x0, x1) - r - 1, Math.min(y0, y1) - r - 1, Math.max(x0, x1) + r + 1, Math.max(y0, y1) + r + 1, (x, y, out) => {
    const along = (x - x0) * ax + (y - y0) * ay, u = along / len, s = ((x - x0) * nx + (y - y0) * ny) / r;
    if (u < u0 || u > u1 || Math.abs(s) > 1) return;
    const burn = clamp(1.2 - Math.abs(x) / 8), lane = Math.round(s * r * 0.85), run = rand(Math.floor(along / 3), lane, S);
    if (Math.abs(s) > rim || along > len - 1) return s < 0 && burn > 0.4 ? H[7] : W[0];
    if (burn > 0.35 && lane < 2) {
      // charred: black, with embers breathing in the cracks along the grain
      if (run < 0.55 && lane > -2) {
        const g = 0.5 + 0.5 * Math.sin((t / D) * Math.PI * 6 + rand(Math.floor(along / 2), lane, S + 1) * 6.3);
        out.k = 0.3 * burn * g;
        return g > 0.72 ? H[3] : g > 0.4 ? H[4] : H[5];
      }
      return lane < -1 ? W[1] : W[0];
    }
    if (lane <= -2) return run < 0.25 ? W[2] : mix(W[3], H[4], 0.45 * burn);
    if (lane === -1) return run < 0.45 ? W[1] : W[2];
    if (lane === 0) return run < 0.2 ? W[1] : W[2];
    return run < 0.4 ? W[0] : W[1];
  });
  // the near end's cut face: a dark rim, pale sapwood, growth rings round a dark heart
  if (u0 <= 0) p.ellipse(x0, y0, r * 0.62, r + 0.2, (d) => (d > 0.78 ? W[0] : d > 0.56 ? W[5] : d > 0.32 ? W[4] : W[3]));
}

// the bed of coals under the logs: coals that breathe in the heat, grey ash round the rim
function coals(p, W, H, t, S) {
  p.shade(-15, -3, 15, 2, (x, y, out) => {
    const dx = x / 14, dy = (y + 0.3) / 2.2, d = dx * dx + dy * dy;
    if (d > 1) return;
    const h = rand(Math.floor(x / 2), Math.floor(y), S + 20);
    if (d > 0.55 && h < 0.55) return ASH[h < 0.15 ? 2 : h < 0.32 ? 1 : 0];
    if (h > 0.5) {
      const g = (0.5 + 0.5 * Math.sin((t / D) * Math.PI * 4 + h * 40)) * (1.1 - d);
      out.k = 0.35 * g;
      return g > 0.7 ? H[2] : g > 0.5 ? H[3] : g > 0.3 ? H[4] : H[5];
    }
    return h > 0.3 ? W[1] : W[0];
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), W = fit(o.wood, 6), S = o.seed, R = new Rng(S), HC = o.height;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const fla = (tt) => 0.74 + 0.16 * NL(tt, 7.3, S + 1) + 0.1 * NL(tt, 19, S + 2), fl = fla(t);
  const GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25), SMOKE = mix(SMOKE1, H[6], 0.25);
  const SPARKS = [H[1], H[2], H[4], H[5]], EMB = [H[1], H[2], H[4], H[6]];

  const T = TONGUES.map(([dx, y, h, w, back], i) => ({ dx: dx + R.range(-0.4, 0.4), y, h: 3 + HC * h * R.range(0.92, 1.08), w: w * R.range(0.9, 1.1), back, env: h, n: (S * 7 + i) * 13 }));
  const lean = (tt) => NL(tt, 0.67, S + 90) * 0.12;
  const height = (i, tt) => {
    const { h, n } = T[i], leap = Math.max(0, NL(tt, 2.6, n + 70) - 0.55) * 1.4;
    return (h + 0.25 * h * NL(tt, 3.3, n) + h * leap) * (0.9 + 0.1 * fla(tt));
  };
  const sweep = (i, tt, h) => NL(tt, 2.2, T[i].n + 40) * (1 + h * 0.08) + lean(tt) * h * 0.9 - clamp(T[i].dx * 0.3, -2.5, 2.5);
  const tip = (i, tt) => {
    const h = height(i, tt);
    return [T[i].dx + sweep(i, tt, h) * 0.85, T[i].y - h * 0.88 + 3, h];
  };
  const tongueAt = (i) => {
    const { dx, y, w, n, back } = T[i], h = height(i, t);
    flameTongue(p, dx, y, h, w, sweep(i, t, h), N, n, H, back ? BACK_LAYERS : w > 2.2 ? BIG_LAYERS : LAYERS, 0.5, 1.1 + h * 0.04);
  };

  // smoke curling off the top, behind everything: each puff keeps the sway the plume had when it left the
  // flames, so the wiggle climbs the plume, and the draught bends it over as it rises
  looped(t, D, 48, S + 300, (r) => ({ x: r.range(-5, 5), y: -HC * 0.8 - r.range(0, 8), vx: r.range(-2, 2), vy: -r.range(10, 17), life: r.range(2, 2.9), s: r.range(2.4, 3.8) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 4, -20, 1.6, 1);
    smokePuff(p, x + NL(t - age, 0.8, S + 60) * (2 + 3 * age), y, 1 - age / q.life, q.s, SMOKE);
  });
  // flame puffs shed from the tips: they burn out above the fire, some into smoke
  const puffs = [];
  looped(t, D, T.length * 24, S + 200, (r, j) => {
    const i = j % T.length, fire = r.range(0.14, 0.3), smokes = r.chance(0.45);
    return { i, fire, smokes, sl: r.range(0.8, 1.4), ox: r.range(-1, 1), oy: r.range(0, 4), vx: r.range(-4, 4), vy: -r.range(15, 30), s: r.range(0.8, 1.6) * (0.8 + 0.6 * T[i].env), f: r.next(), life: fire + (smokes ? 1.4 : 0) };
  }, (q, age) => {
    const [tx, ty] = tip(q.i, t - age);
    const [x, y, vx, vy] = drift(tx + q.ox, ty + q.oy, q.vx, q.vy, Math.min(age, q.fire), 0, -95, 5, 3.2);
    if (age < q.fire) return puffs.push([x, y, 1 - age / q.fire, q.s, q.f]);
    if (age - q.fire > q.sl) return;
    const [sx, sy] = drift(x, y, vx * 0.6, vy * 0.6 - 6, age - q.fire, 2, -16, 1.6, 1.2);
    smokePuff(p, sx, sy, 1 - (age - q.fire) / q.sl, q.s * 0.7, 0);
  });

  coals(p, W, H, t, S);
  for (const L of LOGS) log(p, L, W, H, CROSS, 1, t, S + 11);
  for (let i = 0; i < T.length; i++) if (T[i].back) tongueAt(i);
  // flames licking up off the burning wood
  looped(t, D, 90, S + 210, (r) => ({ x: r.range(-10, 10), y: -r.range(3, 8), vx: r.range(-5, 5), vy: -r.range(20, 40), life: r.range(0.16, 0.3), s: r.range(1, 1.8), f: r.next() }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -95, 5, 3.2);
    firePuff(p, x, y, 1 - age / q.life, q.s, q.f, H);
  });
  for (let i = 0; i < T.length; i++) if (!T[i].back) tongueAt(i);
  // licks torn off the tips, rising and shrinking
  looped(t, D, T.length * 12, S + 220, (r, j) => ({ i: j % T.length, vx: r.range(-3, 3), vy: -r.range(12, 22), s: r.range(0.9, 1.6) * (0.8 + 0.5 * T[j % T.length].env), life: 0.26 }), (q, age) => {
    const [tx, ty] = tip(q.i, t - age);
    lick(p, tx + q.vx * age, ty - 2 + q.vy * age, 1 - age / q.life, q.s, H);
  });
  for (const [x, y, k, s, f] of puffs) firePuff(p, x, y, k, s, f, H);
  for (const L of LOGS) log(p, L, W, H, 0, CROSS, t, S + 11);

  // pops: a crack, a flash, and a fistful of sparks thrown up out of the wood that bounce on the floor
  looped(t, D, 4, S + 400, (r) => ({ x: r.range(-9, 9), y: -r.range(4, 9), n: r.int(3, 5), seed: r.int(0, 1e6), life: 0.7 }), (q, age) => {
    if (age < 0.08) {
      p.px(q.x, q.y, WHITE);
      p.glow(q.x, q.y, 12, H[1], 0.7 * (1 - age / 0.08));
    }
    const r = new Rng(q.seed);
    for (let j = 0; j < q.n; j++) {
      const a = -Math.PI / 2 + r.range(-0.8, 0.8), sp = r.range(110, 220), life = r.range(0.25, 0.6);
      if (age >= life) continue;
      const [x, y, vx, vy] = sparkAt(q.x, q.y, Math.cos(a) * sp, Math.sin(a) * sp, age, 0);
      spark(p, x, y, vx, vy, 1 - age / life, SPARKS);
    }
  });
  // embers carried up by the heat, wandering and cooling
  looped(t, D, 36, S + 500, (r) => ({ x: r.range(-7, 7), y: -r.range(8, 18), vx: r.range(-15, 15), vy: -r.range(25, 60), life: r.range(1.1, 2.5), s: r.chance(0.15) ? 2 : r.range(1, 1.6), a: r.range(0, 6.3), b: r.range(0, 6.3) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -30, 1.6, 1.6);
    ember(p, x + 7 * (Math.sin(age * 2.3 + q.a) - Math.sin(q.a)), y + 2 * (Math.sin(age * 3 + q.b) - Math.sin(q.b)), 1 - age / q.life, q.s, EMB, age * 40 + q.a);
  });

  // light: a big warm room light, a hot heart, a pool on the floor, all breathing with the flames
  const br = 0.92 + 0.08 * N(0.67, S + 3);
  const lx = lean(t) * 12;
  p.glow(lx, -8, 74 * br * (0.9 + 0.1 * fl), GLOW, 0.3 * fl);
  for (const [x, y, k] of [[-6, -17, 0.85], [0, -21, 1], [6, -17, 0.85]]) {
    p.glow(x + lx, y, 46 * br, GLOW, 0.3 * k * fl);
    p.glow(x * 0.6, y + 13, 15, H[2], 0.16 * k * fl);
  }
  p.glow(0, -3, 9, H[0], 0.16 * fl);
  floorLight(p, 0, 0.5, 48, 8, GLOW, 0.3 * fl);
}
