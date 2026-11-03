import { cycle, fit, smooth, ease, rand, TAU, WHITE } from "../../core/index.mjs";
import { VOID, ringFast, halo } from "./_lib.mjs";

export const meta = {
  name: "Soul drain",
  desc: "Pale souls are torn loose on the right and dragged down a funnel of streaks into a black crystal vessel, which flares violet as each one lands.",
  tags: ["shadow", "soul", "drain", "necromancy", "funnel", "directional", "magic", "loop"],
  size: [208, 120],
  origin: [40, 110],
  duration: 3.2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: VOID, soul: ["#2c3f66", "#7d9fd0", "#cfe6ff", "#ffffff"], seed: 8 },
};

// the vessel's centre; the loop; the funnel's streamlines (start points out on the right); four souls a loop
const VY = -50, D = 3.2, LINES = 11, SOULS = 4, TRAVEL = 1.45;
const wrap = (x) => ((x % D) + D) % D;
const line = (i) => {
  const sx = 96 + rand(i, 1) * 64, sy = -88 + rand(i, 2) * 72, bend = (rand(i, 3) - 0.5) * 50;
  return { sx, sy, c1x: sx * 0.55, c1y: sy + bend, c2x: 22 + rand(i, 4) * 14, c2y: VY + (sy - VY) * 0.25 };
};
const LN = Array.from({ length: LINES }, (_, i) => line(i));
// a point along streamline i at u (0 at its start, 1 at the vessel), cubic bezier
function along(L, u) {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * L.sx + b * L.c1x + c * L.c2x, a * L.sy + b * L.c1y + c * L.c2y + d * (VY - L.sy) + d * L.sy];
}
const soul = (j) => ({ born: (j + 0.15 + rand(j, 7) * 0.5) * (D / SOULS), line: Math.floor(rand(j, 8) * LINES) });
const landings = (t) => {
  let f = 0;
  for (let j = 0; j < SOULS; j++) {
    const since = wrap(t - soul(j).born - TRAVEL);
    f += Math.exp(-since / 0.14) * (since < 1 ? 1 : 0);
  }
  return Math.min(1.4, f);
};

// the vessel: a black crystal, two facets lit violet from inside, a hard ridge, a heart of stolen light
function vessel(p, C, t, f) {
  const y0 = VY + Math.sin((TAU * t) / D) * 1.5, W = 9, UP = 14, DN = 12;
  p.shade(-W - 1, y0 - UP - 1, W + 1, y0 + DN + 1, (x, y) => {
    const dy = y - y0, half = dy < 0 ? W * (1 + dy / UP) : W * (1 - dy / DN);
    if (half <= 0 || Math.abs(x) > half + 0.6) return;
    if (Math.abs(x) > half - 0.4) return f > 0.5 ? C[6] : C[1];
    const ridge = Math.abs(x + dy * 0.12) < 0.6, heart = Math.abs(x) + Math.abs(dy - 1) < 2.6 + f * 1.5;
    if (heart) return f > 0.4 ? WHITE : C[6];
    if (ridge) return f > 0.3 ? C[7] : C[5];
    if (x < 0) return dy < 0 ? (f > 0.2 ? C[5] : C[4]) : C[3];
    return dy < 0 ? C[2] : C[1];
  });
  p.glow(0, y0, 30 + 14 * f, C[5], 0.5 + 0.5 * f);
  p.glow(0, y0 + 1, 8, WHITE, 0.25 + 0.6 * f);
  return y0;
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8);
  // the funnel: streamlines bunching into the vessel, dashes running down them, brighter as they close in
  for (let i = 0; i < LINES; i++) {
    const L = LN[i], ph = wrap(t + i * 0.37) / D;
    let px = null, py = null;
    for (let u = 0; u <= 1.0001; u += 0.01) {
      const [x, y] = along(L, u), dash = (((u * 5 - ph * 10 + i * 0.3) % 1) + 1) % 1;
      // a faint line the whole way, bright dashes riding it inward, all brighter as it narrows
      if (px !== null) p.line(px, py, x, y, u > 0.6 ? C[3] : C[2], 0.4 + 0.6 * u);
      if (dash < 0.18) p.px(x, y, u > 0.7 ? C[7] : u > 0.35 ? C[6] : C[5]);
      (px = x), (py = y);
    }
  }
  p.glow(10, VY, 40, C[4], 0.22);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = fit(o.soul, 4), f = landings(t);
  // where the souls are torn from: a faint pale haze out on the right
  cycle(t, D, 10, o.seed, (r) => r.range(0.8, 1.3), (age, Lf, r) => {
    const x = r.range(100, 150), y = r.range(-80, -20) - age * 18, u = age / Lf;
    p.dot(x, y, S[2], (1 - u) * 0.8);
    p.glow(x, y, 4, S[1], 0.2 * (1 - u));
  });
  // streaks racing down the funnel, faster as they close on the vessel, white at the head
  cycle(t, D, 22, o.seed + 1, (r) => r.range(0.4, 0.7), (age, Lf, r) => {
    const L = LN[Math.floor(r.next() * LINES)], u0 = r.range(0.15, 0.5), q = u0 + (1 - u0) * Math.pow(age / Lf, 2.2), q2 = u0 + (1 - u0) * Math.pow(Math.max(0, age - 0.06) / Lf, 2.2);
    const [x, y] = along(L, q), [tx, ty] = along(L, q2);
    p.line(tx, ty, x, y, (v) => (v > 0.7 ? WHITE : v > 0.35 ? C[6] : C[4]));
    p.glow(x, y, 4, C[6], 0.35);
  });
  const y0 = vessel(p, C, t, f);
  // motes circling the vessel, in front and behind it
  for (let k = 0; k < 6; k++) {
    const a = (TAU * (2 * t)) / D + (k * TAU) / 6, ex = Math.cos(a) * 15, ey = Math.sin(a) * 5 - 2, z = Math.sin(a);
    p.px(ex, y0 + ey, z > 0 ? C[7] : C[4]);
    if (z > 0) p.glow(ex, y0 + ey, 4, C[6], 0.35);
  }
  // the souls: a pale head with hollow eyes and an open mouth, a wavering tail, dragged faster as they go
  for (let j = 0; j < SOULS; j++) {
    const s = soul(j), age = wrap(t - s.born);
    if (age > TRAVEL) continue;
    const L = LN[s.line], u = Math.pow(age / TRAVEL, 1.8), [x, y] = along(L, u);
    if (age < 0.18) {
      const k = 1 - age / 0.18;
      ringFast(p, L.sx, L.sy, 3 + 9 * (1 - k), 1, k > 0.5 ? S[2] : S[1]);
      p.glow(L.sx, L.sy, 12, S[1], 0.5 * k);
    }
    // the tail: a wavering wisp, pale near the head, thinning to violet
    for (let k = 14; k >= 1; k--) {
      const uu = Math.pow(Math.max(0, age - k * 0.03) / TRAVEL, 1.8), [tx, ty] = along(L, uu), w = Math.sin(t * 12 + k * 0.8 + j) * k * 0.16;
      const r = Math.max(0.5, 2.6 - k * 0.17);
      p.disc(tx, ty + w, r, k < 4 ? S[2] : k < 9 ? S[1] : C[5], 0.75 * (1 - k / 15));
    }
    // the head: a pale round face, hollow eyes and an open mouth, a lit rim, stretched as it nears the vessel
    const near = smooth(0.82, 1, u), hr = 3.4 - near * 1.6;
    p.circle(x, y, hr + 0.8, S[1]);
    p.circle(x, y, hr, S[2]);
    p.px(x - 1, y - 2, S[3]);
    p.px(x - 2, y - 1, S[3]);
    if (near < 0.5) {
      p.px(x - 1.5, y, S[0]);
      p.px(x + 1.5, y, S[0]);
      p.px(x, y + 1.6, S[0]);
      p.px(x, y + 2.4, S[0]);
    }
    p.glow(x, y, 10, S[1], 0.5);
  }
  // each landing: a flash in the heart, a ring off the crystal, a glint
  for (let j = 0; j < SOULS; j++) {
    const since = wrap(t - soul(j).born - TRAVEL);
    if (since < 0.3) {
      const k = since / 0.3;
      ringFast(p, 0, y0, 6 + 18 * ease.outCubic(k), Math.max(1, 2 * (1 - k)), k < 0.4 ? C[7] : k < 0.7 ? C[5] : C[3]);
    }
  }
  halo(p, 0, y0, 4, 22, C[6], 0.25 * f);
}
