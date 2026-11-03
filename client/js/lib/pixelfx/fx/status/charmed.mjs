// The shaded, outlined hearts are
// adapted from Sprite Fusion's open-source heal (https://www.spritefusion.com/pixel-art-vfx/heal),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { cycle, fit, mix, sparkle, TAU } from "../../core/index.mjs";
import { icon, bitmap, shaped, heartShape, eyes } from "./_lib.mjs";

export const meta = {
  name: "Charmed",
  desc: "Smitten: a big heart beats over the head, throwing a ring and a flush of light with every beat, little hearts float up, the eyes go pink and the cheeks blush.",
  tags: ["status", "charm", "love", "hearts", "debuff", "loop"],
  size: [60, 76],
  origin: [30, 68],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#3a0a1e", "#7a1238", "#c4245a", "#f04e86", "#ff8ab0", "#ffc8da", "#ffffff"], seed: 8 },
};

const SWOON = { turn: 1.1, fx: -2, fy: -28, bx: 2, by: -28, armsFront: true, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [[0, { ...SWOON, lean: -2 }], [0.6, { ...SWOON, lean: 0, crouch: 1 }], [1.2, { ...SWOON, lean: 2 }], [1.8, { ...SWOON, lean: 0, crouch: 1 }], [2.4, { ...SWOON, lean: -2 }]],
};

const D = meta.duration, BEAT = D / 2;
const HEART5 = bitmap([".#.#.", "#####", "#####", ".###.", "..#.."]);
const HEART7 = bitmap([".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]);
// a heartbeat: a strong lub and a softer dub
const thump = (ph) => Math.exp(-(((ph - 0.04) / 0.07) ** 2)) + 0.6 * Math.exp(-(((ph - 0.26) / 0.07) ** 2));

// little hearts drifting up (half of them behind the character)
function hearts(p, C, a, t, seed, back) {
  cycle(t, D, 12, seed + 4, (r) => r.range(1.3, 1.9), (age, life, r, i) => {
    if ((i % 3 === 0) !== back) return;
    const u = age / life, side = r.next() < 0.5 ? -1 : 1, ph = r.range(0, TAU), big = r.next() < 0.3;
    const x = side * r.range(4, 15) + Math.sin(age * 4 + ph) * 2.2, y = a.y + r.range(8, 30) - age * r.range(14, 22);
    const k = Math.min(1, u * 6);
    if (u > 0.88) {
      // it pops into a twinkle
      const q = (u - 0.88) / 0.12;
      sparkle(p, x, y, Math.round(2 * (1 - q)), C[5], C[4], 0.4 * (1 - q));
      return;
    }
    const R = back ? [C[0], C[1], C[2], C[3]] : [C[0], C[2], C[3], C[4]];
    icon(p, x, y, 4, big ? HEART7 : HEART5, R, k);
    if (!back) p.px(x - (big ? 2 : 1), y - 1, C[6]);
    p.glow(x, y, 6, C[3], (back ? 0.12 : 0.22) * k);
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 7), a = o.actor, ph = ((t % BEAT) + BEAT) % BEAT, th = thump(ph);
  p.glow(0, a.y - 8, 26 + 8 * th, C[3], 0.16 + 0.22 * th);
  hearts(p, C, a, t, o.seed, true);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), a = o.actor, ph = ((t % BEAT) + BEAT) % BEAT, th = thump(ph);
  // lovestruck: pink eyes with a bright catchlight, flushed cheeks
  for (const e of eyes(a)) {
    for (const [x, y] of e.px) p.px(a.x + x, a.y + y, y === e.y0 ? C[3] : C[2]);
    p.px(a.x + e.x0, a.y + e.y0 + 1, C[6]);
    const blush = mix(e.skin, C[3], 0.55), out = e.x0 < a.w / 2 ? -1 : 1, bx = out < 0 ? e.x0 - 1 : e.x1;
    p.px(a.x + bx, a.y + e.y1 + 1, blush);
    p.px(a.x + bx + 1, a.y + e.y1 + 1, blush);
  }
  hearts(p, C, a, t, o.seed, false);
  // the big heart, beating
  const hx = 0, hy = a.y - 10, s = 5.6 * (1 + 0.24 * th);
  // a heart-shaped ring thrown off with each beat
  for (const [t0, kk] of [[0.04, 1], [0.26, 0.6]]) {
    const u = (ph - t0) / 0.5;
    if (u < 0 || u > 1) continue;
    const S1 = 5.6 * (1.25 + 1.3 * u), outer = shaped(heartShape, S1), inner = shaped(heartShape, S1 - 1.3), E = Math.ceil(S1 * 1.2) + 1;
    for (let dy = -E; dy <= E; dy++)
      for (let dx = -E; dx <= E; dx++) if (outer(dx, dy) && !inner(dx, dy)) p.dot(hx + dx, hy + dy, u < 0.3 ? C[5] : C[4], (1 - u) * kk * 1.3);
  }
  icon(p, hx, hy, 9, shaped(heartShape, s), [C[0], C[2], C[3], C[4]]);
  // a glint on the left lobe
  p.px(hx - Math.round(s * 0.55), hy - Math.round(s * 0.45), C[6]);
  p.px(hx - Math.round(s * 0.55) + 1, hy - Math.round(s * 0.45), C[5]);
  p.px(hx - Math.round(s * 0.55), hy - Math.round(s * 0.45) + 1, C[5]);
  p.glow(hx, hy, 12 + 6 * th, C[4], 0.3 + 0.4 * th);
  if (th > 0.5) sparkle(p, hx + s * 0.9, hy - s * 0.8, Math.round(3 * th), C[5], C[4], 0.4 * th);
  // twinkles round the heart
  cycle(t, D, 8, o.seed + 2, (r) => r.range(0.3, 0.5), (age, life, r) => {
    const an = r.range(0, TAU), d = r.range(8, 15), u = age / life;
    sparkle(p, hx + Math.cos(an) * d, hy + Math.sin(an) * d * 0.8, Math.round(1.6 * Math.sin(Math.PI * u)), C[5], C[4], 0.3 * Math.sin(Math.PI * u));
  });
}
