// The shaded, outlined letters are
// adapted from Sprite Fusion's open-source heal (https://www.spritefusion.com/pixel-art-vfx/heal),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { cycle, fit, sparkle, TAU } from "../../core/index.mjs";
import { icon, bitmap, eyes, colorAt } from "./_lib.mjs";

export const meta = {
  name: "Sleep",
  desc: "Fast asleep: eyes shut, soft outlined Zs float up off the head one after another, swaying and growing as they rise, dream motes drift, a slow breathing glow.",
  tags: ["status", "sleep", "zzz", "rest", "debuff", "loop"],
  size: [60, 82],
  origin: [26, 74],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#1a1636", "#3c3a7a", "#6f78c8", "#a9b8f0", "#dfe6ff", "#ffffff"], seed: 3 },
};

const NOD = { turn: 0.9, crouch: 1, lean: 1, hy: 2, fx: -6, fy: -14, bx: 7, by: -14, ffx: -2, fbx: 3 };
export const act = {
  onBody: true,
  poses: [[0, NOD], [1.2, { ...NOD, crouch: 2, lean: 2, hy: 3 }], [2.4, NOD]],
};

const D = meta.duration, NZ = 3;
// the letter at four sizes: it grows a step at a time as it rises
const ZS = [
  ["#####", "...#.", "..#..", ".#...", "#####"],
  ["#######", ".....#.", "....#..", "...#...", "..#....", ".#.....", "#######"],
  [".#######.", "#########", "......##.", ".....##..", "....##...", "...##....", "..##.....", "#########", ".#######."],
  [".#########.", "###########", ".......###.", "......###..", ".....###...", "....###....", "...###.....", "..###......", ".###.......", "###########", ".#########."],
].map((rows) => bitmap(rows));

// a Z at age u (0..1): where it is, how big, how solid
function zAt(a, i, u) {
  const side = i % 2 ? 1 : 0.6, x0 = a.x + a.w * 0.78, y0 = a.y + 7;
  const x = x0 + 13 * side * u + 2.5 * Math.sin(TAU * 1.1 * u + i * 2.1), y = y0 - 32 * (1 - Math.pow(1 - u, 1.35));
  const size = u < 0.18 ? 0 : u < 0.42 ? 1 : u < 0.68 ? 2 : 3, k = Math.min(1, u / 0.06);
  return { x, y, size, k };
}

// shut the eyes: paint them over with skin and draw a soft lid line
function shut(p, a) {
  for (const e of eyes(a)) {
    for (const [x, y] of e.px) p.px(a.x + x, a.y + y, e.skin);
    const lid = colorAt(a, e.x0 - 1, e.y0 - 4) || colorAt(a, e.px[0][0], e.px[0][1]);
    const y = a.y + e.y1 - 1;
    for (let x = e.x0; x <= e.x1; x++) p.px(a.x + x, y, 0xff1f1726);
    p.px(a.x + e.x0 - 1, y - 1, 0xff1f1726);
    p.px(a.x + e.x1 + 1, y - 1, 0xff1f1726);
    void lid;
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 6), a = o.actor, breath = 0.5 + 0.5 * Math.sin((t / D) * TAU * 2);
  shut(p, a);
  // a slow breathing glow round the head, and soft dream light drifting about it
  p.glow(0, a.y + 10, 24, C[3], 0.1 + 0.1 * breath);
  cycle(t, D, 5, o.seed + 6, D, (age, life, r) => {
    const u = age / life, x = a.x + a.w * r.range(0.3, 1.1) + Math.sin(u * TAU + r.next() * TAU) * 3, y = a.y + r.range(-6, 8) - u * 10;
    const rad = r.range(3, 5) * (0.8 + 0.4 * u), k = Math.sin(Math.PI * u);
    p.glow(x, y, rad * 2.4, C[3], 0.1 * k);
  });
  // dream motes drifting up
  cycle(t, D, 14, o.seed + 4, (r) => r.range(1.2, 2), (age, life, r) => {
    const u = age / life, x = a.x + a.w * r.range(0.4, 1.1) + Math.sin(age * 2 + r.next() * TAU) * 2, y = a.y + r.range(0, 10) - age * r.range(10, 18);
    const tw = Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(age * 9 + r.next() * TAU));
    if (tw < 0.15) return;
    sparkle(p, x, y, tw > 0.7 && r.next() < 0.4 ? 1 : 0, C[4], C[3], 0.3 * tw);
    p.dot(x, y, tw > 0.6 ? C[5] : C[4], tw * 1.3);
  });
  // the Zs, oldest (biggest) first so the young ones sit on top
  const zs = [];
  for (let i = 0; i < NZ; i++) zs.push({ i, u: (((t - (i * D) / NZ) % D) + D) % D / D });
  zs.sort((p1, p2) => p2.u - p1.u);
  for (const { i, u } of zs) {
    const z = zAt(a, i, u);
    if (u > 0.9) {
      // it pops into motes
      const k = (u - 0.9) / 0.1;
      for (let j = 0; j < 7; j++) {
        const an = (j / 7) * TAU + i, d = 3 + 6 * Math.sqrt(k);
        p.dot(z.x + Math.cos(an) * d, z.y + Math.sin(an) * d * 0.8, j % 2 ? C[4] : C[5], 1.2 - k);
      }
      p.glow(z.x, z.y, 10, C[3], 0.25 * (1 - k));
      continue;
    }
    // a dotted trail where it has been
    for (let j = 1; j <= 6; j++) {
      const q = zAt(a, i, Math.max(0, u - j * 0.025));
      if (j % 2 === 0 || u - j * 0.025 < 0.05) continue;
      p.dot(q.x - 1, q.y + 4 + q.size, C[3], (1 - j / 7) * 0.9);
    }
    // it dims down the ramp as it gets old
    const old = u > 0.78 ? 1 : 0, R = old ? [C[0], C[1], C[2], C[3]] : [C[1], C[2], C[3], C[4]];
    icon(p, z.x, z.y, 7, ZS[z.size], R, z.k);
    if (!old) p.px(z.x - 2 - z.size, z.y - 2 - z.size * 0.8, C[5]);
    p.glow(z.x, z.y, 7 + z.size * 3, C[3], (old ? 0.12 : 0.26) * z.k);
  }
}
