// The shaded, outlined question marks are
// adapted from Sprite Fusion's open-source heal (https://www.spritefusion.com/pixel-art-vfx/heal),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { cycle, fit, sparkle, ease, clamp, TAU } from "../../core/index.mjs";
import { icon, bitmap, eyes } from "./_lib.mjs";

export const meta = {
  name: "Confused",
  desc: "Head in a spin: a glowing spiral whirls over the head, question marks pop up round it and bob, the eyes dart left and right.",
  tags: ["status", "confused", "confusion", "dizzy", "debuff", "loop"],
  size: [60, 78],
  origin: [30, 70],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#1e0f2e", "#4b2070", "#8a3ab0", "#c66ae0", "#f0a8ff", "#ffffff"],
    marks: ["#2a1608", "#b0701a", "#ffd84a", "#fff4b8"],
    seed: 6,
  },
};

const SHRUG = { turn: 1, fx: -13, fy: -26, bx: 14, by: -26, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [
    [0, { ...SHRUG, x: 0, lean: -2 }],
    [0.6, { ...SHRUG, x: 1, lean: 1, crouch: 1, fy: -23, by: -29, fbx: 5, fby: -6 }],
    [1.2, { ...SHRUG, x: 2, lean: 2 }],
    [1.8, { ...SHRUG, x: 1, lean: -1, crouch: 1, fy: -29, by: -23, ffx: -4, ffy: -6 }],
    [2.4, { ...SHRUG, x: 0, lean: -2 }],
  ],
};

const D = meta.duration;
const QS = [
  [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  [".####.", "##..##", "....##", "...##.", "..##..", "..##..", "......", "..##..", "..##.."],
  [".#####.", "##...##", "##...##", ".....##", "....##.", "...##..", "...##..", ".......", "...##..", "...##.."],
].map((rows) => bitmap(rows));
// three marks round the spiral: where they sit, when they pop, how big they get
const MARKS = [
  { x: -12, y: -5, t0: 0, big: 2 },
  { x: 12, y: -8, t0: 0.8, big: 1 },
  { x: 1, y: -17, t0: 1.6, big: 2 },
];

// the spiral, seen from the front: an arm winding out from its heart, spinning
function spiral(p, C, cx, cy, t) {
  const rot = (t / D) * TAU * 2, turns = 1.8, n = 72, breathe = 1 + 0.08 * Math.sin((t / D) * TAU * 4);
  const at = (u) => {
    const th = u * turns * TAU - rot, r = (0.8 + 6.6 * u) * breathe;
    return [cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.9];
  };
  // a dark underlay on the outer arm so it reads against anything, then the arm brightening as it winds out
  for (let i = 1; i <= n; i++) {
    const u = i / n, [x0, y0] = at((i - 1) / n), [x1, y1] = at(u);
    if (u > 0.45) p.line(x0 + 0.5, y0 + 0.7, x1 + 0.5, y1 + 0.7, C[1]);
  }
  for (let i = 1; i <= n; i++) {
    const u = i / n, [x0, y0] = at((i - 1) / n), [x1, y1] = at(u);
    p.line(x0, y0, x1, y1, u > 0.88 ? C[5] : u > 0.62 ? C[4] : u > 0.3 ? C[3] : C[2]);
    if (i % 6 === 0) p.light(x1, y1, C[3], 0.4 * u);
  }
  const [hx, hy] = at(1);
  sparkle(p, hx, hy, 2, C[4], C[3], 0.5);
  p.glow(cx, cy, 13, C[3], 0.28);
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 6), a = o.actor;
  p.glow(0, a.y - 7, 16, C[3], 0.22);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 6), M = fit(o.marks, 4), a = o.actor;
  // the eyes dart from side to side
  const look = Math.floor((t / D) * 6) % 2 ? 1 : -1;
  for (const e of eyes(a)) {
    for (const [x, y] of e.px) p.px(a.x + x, a.y + y, 0xff17121f);
    p.px(a.x + (look < 0 ? e.x0 : e.x1), a.y + e.y0, 0xffffffff);
  }
  spiral(p, C, 0, a.y - 7, t);
  // the question marks pop up, bob, and shrink away
  for (const m of MARKS) {
    const age = (((t - m.t0) % D) + D) % D, life = 1.9;
    if (age > life) continue;
    const u = age / life, pop = ease.outBack(clamp(age / 0.16), 3), out = clamp((u - 0.82) / 0.18);
    const size = Math.max(0, Math.round(m.big * pop * (1 - out) + (pop > 1.1 ? 1 : 0)));
    const bob = Math.sin(age * 5 + m.t0 * 3) * 1.6, tilt = Math.sin(age * 3.3 + m.t0) * 0.8;
    if (pop < 0.3 || (out > 0 && size === 0 && out > 0.6)) continue;
    const x = m.x + tilt, y = a.y + m.y + bob - age * 2;
    // it pops in with a burst of short rays and a flash
    if (age < 0.2) {
      const k = age / 0.2;
      for (let j = 0; j < 8; j++) {
        const an = (j / 8) * TAU + 0.2, d0 = 4 + 7 * k, d1 = d0 + 3 * (1 - k);
        p.line(x + Math.cos(an) * d0, y + Math.sin(an) * d0, x + Math.cos(an) * d1, y + Math.sin(an) * d1, j % 2 ? M[2] : M[3], 1 - k);
      }
      p.glow(x, y, 16, M[2], 0.45 * (1 - k));
    }
    icon(p, x, y, 7, QS[Math.min(2, size)], [M[0], M[1], M[2], M[3]]);
    p.glow(x, y, 10 + size * 2, M[2], 0.28 * (1 - out));
  }
  // glitter flicking off the spiral
  cycle(t, D, 10, o.seed + 2, (r) => r.range(0.35, 0.6), (age, life, r) => {
    const th = r.range(0, TAU), u = age / life, d = 6 + age * r.range(12, 22);
    const x = Math.cos(th) * d, y = a.y - 7 + Math.sin(th) * d * 0.8;
    if (Math.sin(Math.PI * u) > 0.6 && r.next() < 0.5) sparkle(p, x, y, 1, C[4], C[3], 0.3);
    else p.dot(x, y, u < 0.5 ? C[5] : C[4], 1.2 - u);
  });
}
