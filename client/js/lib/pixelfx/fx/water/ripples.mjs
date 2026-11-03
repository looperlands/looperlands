import { fit, cycle, clamp, smooth, ease, TAU, WHITE } from "../../core/index.mjs";
import { WATER, ring } from "./_lib.mjs";

export const meta = {
  name: "Ripples",
  desc: "A drop plinks on still dark water and rings spread out across it at a low angle: the swell of each ring catches the light, crests glint, and they fade into the calm.",
  tags: ["water", "ripples", "rings", "surface", "pond", "ambient", "loop"],
  size: [136, 52],
  origin: [68, 30],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, seed: 2 },
};

const D = meta.duration, SY = 0.26, EVERY = 0.5, LIFE = 2, RMAX = 60, PATCH = 64;

// one ring at age a: its radius (fast out, slowing) and strength
const radius = (a) => 2 + (RMAX - 2) * ease.outCubic(a / LIFE);
const power = (a) => Math.pow(1 - a / LIFE, 1.5) * Math.min(1, a / 0.08);

// the rings alive at t, newest first: [age, index]
function alive(t) {
  const out = [];
  for (let k = 0; k * EVERY < LIFE; k++) {
    const a = (((t - k * EVERY) % D) + D) % D;
    if (a < LIFE) out.push([a, Math.round((((t - a) % D) + D) % D / EVERY)]);
  }
  return out;
}

// the water: dark and see-through, shading with the slope of the swell each ring carries, so the rings read as
// waves catching the light from the far left, not just lines
function surface(p, C, t) {
  const rs = alive(t).map(([a]) => [radius(a), power(a), 3 + a * 2.2]);
  for (let Y = Math.floor(-PATCH * SY); Y < PATCH * SY; Y++)
    for (let X = -PATCH; X < PATCH; X++) {
      const x = X + 0.5, y = Y + 0.5, z = y / SY, r = Math.hypot(x, z), e = r / PATCH;
      if (e > 1) continue;
      const edge = 1 - smooth(0.6, 1, e);
      p.blend(x, y, C[1], 0.55 * edge);
      let slope = 0;
      for (const [R, k, w] of rs) {
        const d = r - R;
        if (d > 2.2 * w || d < -2.2 * w) continue;
        slope += k * Math.exp(-((d / w) ** 2)) * -Math.sin(d * 1.15) * 1.15;
      }
      if (slope === 0) continue;
      // the side of a swell facing the light (back and left) catches it; the side away from it goes dark
      const face = slope * (-(x * -0.55 + z * -0.84) / Math.max(1, r));
      if (face > 0.18) p.blend(x, y, face > 0.6 ? C[5] : C[4], Math.min(0.9, (face - 0.18) * 2.2) * edge);
      else if (face < -0.25) p.blend(x, y, C[0], Math.min(0.8, (-face - 0.25) * 2) * edge);
    }
}

function rings(p, C, t, half) {
  for (const [a, i] of alive(t)) {
    const R = radius(a), k = power(a);
    ring(p, 0, 0, R, SY, 0.85 * k, C, { n: 2, gap: 3 + a * 1.4, half, hot: a < 0.14, glint: half > 0 && a > 0.1 ? k : 0, seed: i + 1, wob: 0.4 + a * 1.1 });
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8);
  surface(p, C, t);
  rings(p, C, t, -1);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed;
  rings(p, C, t, 1);
  // each ring starts with a drop: a white fleck, a bead thrown up and back down, a little light
  for (const [a] of alive(t)) {
    if (a < 0.08) {
      p.px(0, 0, WHITE);
      p.px(-1, 0, C[6]);
      p.px(1, 0, C[6]);
      p.glow(0, 0, 8, C[5], 0.5 * (1 - a / 0.08));
    }
    const b = a - 0.04, h = 90 * b - 0.5 * 700 * b * b;
    if (b > 0 && h > 0) {
      p.px(0, -h, WHITE);
      p.px(0, -h + 1, C[5]);
    }
  }
  // glints ride the near crests, winking
  cycle(t, D, 10, S + 5, (g) => g.range(0.25, 0.45), (age, life, r) => {
    const all = alive(t), [a] = all[Math.floor(r.next() * all.length)] ?? [0];
    const ang = r.range(0.3, Math.PI - 0.3), R = radius(a), k = Math.sin((Math.PI * age) / life) * power(a);
    if (k < 0.15 || R < 6) return;
    const x = Math.cos(ang) * R, y = Math.sin(ang) * R * SY;
    p.px(x, y, WHITE);
    if (k > 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
    p.glow(x, y, 5, C[5], 0.4 * k);
  });
  // a cool light on the water, brightest where the rings start
  p.glow(0, 0, 40, C[4], 0.14);
  p.glow(0, 0, 14, C[5], 0.12);
}
