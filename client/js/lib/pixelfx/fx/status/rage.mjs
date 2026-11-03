// The shaded, outlined anger mark and the embers are
// adapted from Sprite Fusion's open-source heal and fire (https://www.spritefusion.com/pixel-art-vfx/heal),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { cycle, fit, hex, mix, luma, rand, Rng, clamp, TAU } from "../../core/index.mjs";
import { shape, colorAt, eyes, icon, bitmap, travel, ember } from "./_lib.mjs";

export const meta = {
  name: "Rage",
  desc: "Seething: the body judders on every heartbeat, an anger mark throbs at the temple, eyes burn, steam jets off the head, stress lines flash out and the floor cracks hot underfoot.",
  tags: ["status", "rage", "berserk", "anger", "buff", "loop"],
  size: [80, 80],
  origin: [40, 70],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#1a0208", "#4a0612", "#8a0c1c", "#c81828", "#ff3040", "#ff7a7a", "#ffc8c8", "#ffffff"],
    heat: ["#5a0a0a", "#c8281a", "#ff7a2a", "#ffd27a"],
    steam: "#f2e8ee",
    seed: 6,
  },
};

const SEETHE = { turn: 1, crouch: 4, fx: -13, fy: -19, bx: 13, by: -19, ffx: -8, fbx: 9 };
const THUD = { ...SEETHE, crouch: 6, fy: -23, by: -23 };
export const act = {
  onBody: true,
  poses: [[0, SEETHE], [0.05, THUD, "snap"], [0.17, SEETHE, "snap"], [0.29, { ...THUD, crouch: 5 }, "snap"], [0.4, SEETHE, "snap"], [1.2, SEETHE]],
};

const D = meta.duration, LUB = 0.05, DUB = 0.29, G = 760;
const pulse = (t, at, w = 0.06) => Math.exp(-((((((t - at) % D) + D + D / 2) % D - D / 2) / w) ** 2));
const beat = (t) => pulse(t, LUB) + 0.65 * pulse(t, DUB);
// how long after the last lub or dub it is
const since = (t, at) => (((t - at) % D) + D) % D;
// the body judders for a moment on each beat
const shaking = (t) => since(t, LUB - 0.02) < 0.13 || since(t, DUB - 0.02) < 0.09;

/** The stand-in is hidden while the body judders: the effect draws it, shaken. */
export const actorAlpha = (t) => (shaking(t) ? 0 : 1);

// the anger mark: four curves round a cross-shaped gap, at two sizes for the throb
const MARK = [
  bitmap(["..#.#..", "..#.#..", "##...##", ".......", "##...##", "..#.#..", "..#.#.."]),
  bitmap(["...#.#...", "...#.#...", "..##.##..", "###...###", ".........", "###...###", "..##.##..", "...#.#...", "...#.#..."]),
];

// cracks in the floor round the feet, worked out once per seed: jagged runs out from under each foot
const CRACKS = new Map();
function cracks(a, seed) {
  if (CRACKS.has(seed)) return CRACKS.get(seed);
  const S = shape(a), [fl, fr] = S.rows[S.h - 1], R = new Rng(seed * 31 + 7), out = [];
  for (const [x0, dir] of [[a.x + fl + 2, -1], [a.x + fr - 1, 1], [a.x + (fl + fr) / 2, -1], [a.x + (fl + fr) / 2 + 1, 1]]) {
    let x = x0, y = 0.5;
    const pts = [[x, y]], n = R.int(5, 9);
    for (let i = 0; i < n; i++) {
      x += dir * R.range(1.2, 2.4);
      y = clamp(y + R.range(-0.9, 0.9), 0, 2.5);
      pts.push([x, y]);
      if (i > 1 && R.chance(0.3)) out.push([[x, y], [x + dir * R.range(1, 2), clamp(y + R.sign() * R.range(0.6, 1.4), 0, 3)]]);
    }
    out.push(pts);
  }
  CRACKS.set(seed, out);
  return out;
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), Hh = fit(o.heat, 4), a = o.actor, b = beat(t), stamp = Math.exp(-since(t, LUB) / 0.18);
  // dark-red heat shimmering up round the body
  cycle(t, D, 9, o.seed + 2, (r) => r.range(0.7, 1.1), (age, life, r) => {
    const u = age / life, x0 = r.range(-16, 16), y = a.y + r.range(10, 40) - age * r.range(14, 22), len = r.range(6, 11), ph = r.range(0, TAU);
    const k = Math.sin(Math.PI * u) * 0.55;
    for (let d = 0; d < len; d++) p.dot(x0 - len / 2 + d, y + Math.round(Math.sin(d * 0.9 + ph + age * 12) * 0.8), d % 3 ? C[2] : C[1], k * (1 - Math.abs(d / len - 0.5) * 1.4));
  });
  // the floor: red light pooling, cracks under the feet glowing hot on each stamp and cooling between
  p.shade(-30, -4, 30, 8, (x, y, out) => {
    const d = Math.hypot(x / 28, (y - 0.5) / 4.5);
    if (d < 1) (out.l = C[3]), (out.k = (0.2 + 0.3 * b) * (1 - d) * (1 - d));
  });
  const heat = 0.25 + 0.75 * stamp;
  for (const pts of cracks(a, o.seed))
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], far = i / pts.length;
      p.line(x0, y0, x1, y1, heat * (1 - far * 0.6) > 0.6 ? Hh[3] : heat * (1 - far * 0.5) > 0.35 ? Hh[2] : Hh[1]);
      if (i % 2) p.glow(x1, y1, 4, Hh[2], 0.25 * heat * (1 - far * 0.5));
    }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), Hh = fit(o.heat, 4), a = o.actor, S = shape(a), b = beat(t), steam = hex(o.steam);
  const shake = shaking(t), dx = shake ? (Math.floor(t * 60) % 2 ? 1 : -1) : 0, dy = shake && since(t, LUB - 0.02) < 0.06 ? -1 : 0;
  // the body: shaken while the beat lands, the face flushing red with it
  for (const [mx, my] of S.body) {
    const c = colorAt(a, mx, my), l = luma(c), skin = l > 0.55 && (c & 255) > ((c >>> 16) & 255) + 30;
    if (skin) p.px(a.x + mx + dx, a.y + my + dy, mix(c, C[4], 0.22 + 0.3 * b));
    else if (shake) p.px(a.x + mx + dx, a.y + my + dy, c);
  }
  // burning eyes under angry brows
  for (const e of eyes(a)) {
    const ex = a.x + dx, ey = a.y + dy, inner = (e.x0 + e.x1) / 2 < a.w / 2 ? 1 : -1;
    for (const [x, y] of e.px) p.px(ex + x, ey + y, y === e.y0 ? C[7] : y === e.y0 + 1 ? C[6] : C[4]);
    const xi = inner > 0 ? e.x1 : e.x0, xo = inner > 0 ? e.x0 : e.x1;
    p.px(ex + xo - inner, ey + e.y0 - 2, 0xff1f1726);
    p.px(ex + xo, ey + e.y0 - 2, 0xff1f1726);
    p.px(ex + xi, ey + e.y0 - 1, 0xff1f1726);
    p.glow(ex + (e.x0 + e.x1 + 1) / 2, ey + e.y0 + 1, 5, C[5], 0.35 + 0.35 * b);
  }
  // the anger mark throbbing at the temple: big on the lub, smaller on the dub
  const big = pulse(t, LUB + 0.02, 0.05) > 0.35 || pulse(t, DUB + 0.02, 0.04) > 0.6;
  const mx = a.x + a.w * 0.86 + dx, my = a.y + 3 + dy;
  icon(p, mx, my, 5, MARK[big ? 1 : 0], [C[0], C[3], C[4], C[5]]);
  p.px(mx - (big ? 3 : 2), my - (big ? 3 : 2), C[6]);
  p.glow(mx, my, 8, C[4], 0.25 + 0.4 * b);
  // steam jetting off the head in short bursts after each beat
  for (const [at, n, power] of [[LUB + 0.04, 7, 1], [DUB + 0.04, 4, 0.75]])
    for (const side of [-1, 1])
      for (let i = 0; i < n; i++) {
        const age = since(t, at + i * 0.016), life = 0.22 + 0.12 * rand(i, side, 3);
        if (age >= life) continue;
        const u = age / life, ang = -Math.PI / 2 + side * (0.5 + 0.2 * rand(i, side, 5)), sp = (90 + 40 * rand(i, side, 7)) * power;
        const x = side * a.w * 0.36 + Math.cos(ang) * travel(sp, 0, 7, age), y = a.y + 3 + Math.sin(ang) * travel(sp, 0, 7, age) - 8 * age;
        const rad = (1 + 3.2 * Math.sqrt(u)) * (0.8 + 0.4 * rand(i, side, 9)), k = Math.min(1, u * 12) * Math.pow(1 - u, 2);
        p.disc(x, y, rad, steam, 0.7 * k);
        p.disc(x - rad * 0.2, y - rad * 0.25, rad * 0.6, 0xffffffff, 0.6 * k);
        if (u < 0.3) p.dot(x, y, 0xffffffff, 1 - u / 0.3);
      }
  // jagged stress lines flashing out round the head on the beat
  for (const [at, n, len] of [[LUB, 8, 7], [DUB, 6, 5]]) {
    const age = since(t, at);
    if (age > 0.2) continue;
    const k = age / 0.2;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + ((i + 0.5) / n - 0.5) * 4.4, r0 = 15 + 6 * k, ca = Math.cos(ang), sa = Math.sin(ang), cx = 0, cy = a.y + 12;
      const pts = [];
      for (let j = 0; j <= 3; j++) {
        const r = r0 + (j / 3) * len, off = j % 2 ? 1.3 : -0.4;
        pts.push([cx + ca * r - sa * off, cy + sa * r + ca * off]);
      }
      p.polyline(pts, (u) => (u > 0.66 ? C[7] : u > 0.33 ? C[5] : C[4]), 1.2 - k);
      p.glowLine(pts[0][0], pts[0][1], pts[3][0], pts[3][1], 3, C[4], 0.3 * (1 - k));
    }
  }
  // the stamp: embers spat up out of the cracks, grit hopping
  const st = since(t, LUB);
  for (let i = 0; i < 10; i++) {
    const life = 0.5 + 0.5 * rand(i, 11), age = st - 0.02 * rand(i, 12);
    if (age < 0 || age > life) continue;
    const x = (rand(i, 13) - 0.5) * 30 + Math.sin(age * 9 + i) * 1.5 * age, y = -1 + travel(-(40 + 50 * rand(i, 14)), -20, 1.6, age);
    ember(p, x, y, age / life, [Hh[3], Hh[2], Hh[1]], age + i);
  }
  for (let i = 0; i < 12; i++) {
    const vx = (rand(i, 21) - 0.5) * 90, vy = -(40 + 70 * rand(i, 22)), tt = st;
    const x = (rand(i, 23) - 0.5) * 18 + vx * tt, y = -1 + vy * tt + 0.5 * G * tt * tt;
    if (tt > 0.6 || y > 0) continue;
    p.px(x, y, i % 3 ? C[2] : 0xff6a5e72);
  }
  // the beat flares red light round the head and down onto the floor
  p.glow(0, a.y + 10, 26, C[4], 0.12 + 0.4 * b);
  p.glow(0, a.y + 22, 34, C[3], 0.08 + 0.18 * b);
}
