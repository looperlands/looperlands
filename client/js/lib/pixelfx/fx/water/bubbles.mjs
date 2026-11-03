// The bubble shading (a lit rim top-left, a shaded rim bottom-right, a see-through body, a highlight and a
// refraction fleck, 2x2 and 1 px forms when small) and the surface line are adapted from Sprite Fusion's
// open-source bubbles (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, clamp, smooth, rand, TAU, WHITE } from "../../core/index.mjs";
import { WATER, rock } from "./_lib.mjs";

export const meta = {
  name: "Bubbles",
  desc: "Bubbles stream up from a vent of pebbles, wobbling and swelling as they rise, flare as they cross shafts of light from the surface, then dome up and pop there.",
  tags: ["water", "bubbles", "underwater", "vent", "ambient", "loop"],
  size: [104, 112],
  origin: [52, 104],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, seed: 4 },
};

const D = meta.duration, TOP = -92, HALF = 48;

// the surface: a wavy lit line, a darker band under it
const surfaceY = (x, ph) => TOP + Math.sin(x * 0.13 + ph * TAU * 2) * 1.1 + Math.sin(x * 0.051 - ph * TAU) * 1.3;
// light shafts slanting down from the surface, drifting: how much of one a point is in
const shaft = (x, y, ph) => {
  const u = x + (y - TOP) * 0.32, s = Math.sin(u * 0.16 + ph * TAU) * 0.6 + Math.sin(u * 0.07 - ph * TAU + 1) * 0.4;
  return Math.max(0, s - 0.35) / 0.65;
};

// one bubble at (x, y), radius r, squash q: tiny ones a pixel or a shaded 2x2, bigger ones a lit rim round a
// see-through body with a highlight and a fleck of light refracted through it
function bubble(p, C, x, y, r, q, lit) {
  if (r < 0.9) return p.px(x, y, lit > 0.3 ? WHITE : r < 0.7 ? C[5] : C[6]);
  if (r < 1.5) {
    const X = Math.floor(x), Y = Math.floor(y);
    p.px(X, Y, WHITE);
    p.px(X + 1, Y, C[6]);
    p.px(X, Y + 1, C[5]);
    p.px(X + 1, Y + 1, C[4]);
    p.glow(x + 0.5, y + 0.5, 3, C[5], 0.12 + 0.2 * lit);
    return;
  }
  const rx = r * (1 + q), ry = r * (1 - q);
  p.shade(x - rx - 1, y - ry - 1, x + rx + 1, y + ry + 1, (px, py, out) => {
    const dx = (px - x) / rx, dy = (py - y) / ry, d = Math.hypot(dx, dy) * r;
    if (d > r + 0.5) return;
    const l = (-dx - dy) / Math.SQRT2 / Math.max(0.01, d / r);
    if (d > r - 0.6) out.c = l > 0.45 ? C[6] : l < -0.55 ? C[3] : C[4];
    else p.blend(px, py, C[5], 0.16 + 0.2 * lit);
  });
  p.px(Math.round(x - rx * 0.45), Math.round(y - ry * 0.45), WHITE);
  if (r >= 2.5) p.px(Math.round(x - rx * 0.45) + 1, Math.round(y - ry * 0.45), C[6]);
  if (r >= 2) p.px(Math.round(x + rx * 0.5), Math.round(y + ry * 0.5), C[6]);
  p.glow(x, y, r * 2.4 + 2, C[5], 0.12 + 0.3 * lit);
}

// the bubbles, from the vent's three mouths: each rises faster the bigger it is, swells as the pressure drops,
// wobbles side to side, and pops at the surface
const MOUTHS = [-5, 1, 6];
function each(t, S, fn) {
  cycle(t, D, 46, S, (g) => g.range(2.2, 3.4), (age, life, r, i) => {
    const m = MOUTHS[i % 3], r0 = r.next() < 0.7 ? r.range(0.5, 1.4) : r.range(1.6, 2.6), vy = 30 + 9 * r0 + r.range(-4, 4);
    const wf = r.range(3, 6), wa = 0.8 + r0 * 1.2, ph0 = r.range(0, TAU), drift = r.range(-4, 4);
    const y = -2 - vy * age, k = clamp(-y / -TOP), x = m + drift * k + Math.sin(age * wf + ph0) * wa * k;
    fn({ x, y, r: r0 * (1 + 0.45 * k), q: 0.12 * Math.sin(age * wf * 2 + ph0) * Math.min(1, r0 / 2), i, age, vy });
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D;
  // the water: deeper toward the floor, light falling through it in shafts
  for (let Y = TOP - 2; Y < 0; Y++)
    for (let X = -HALF; X < HALF; X++) {
      const x = X + 0.5, y = Y + 0.5, sy = surfaceY(x, ph);
      if (y < sy) continue;
      const e = 1 - smooth(HALF - 14, HALF, Math.abs(x)), depth = (y - TOP) / -TOP;
      p.blend(x, y, C[1], (0.22 + 0.22 * depth) * e);
      const s = shaft(x, y, ph) * (1 - depth * 0.7) * e;
      if (s > 0.05) p.light(x, y, C[4], 0.2 * s);
    }
  // where the shafts reach the floor, caustic light dances on it
  for (let X = -HALF; X < HALF; X++) {
    const x = X + 0.5, e = 1 - smooth(HALF - 14, HALF, Math.abs(x)), s = shaft(x, -2, ph);
    const c = Math.max(0, 1 - Math.abs(Math.sin(x * 0.42 + Math.sin(x * 0.11 + ph * TAU * 2) * 2.2)) * 2.4);
    if (s * c * e > 0.05) {
      p.light(x, -1, C[5], 0.5 * s * c * e);
      p.light(x, -2, C[4], 0.25 * s * c * e);
      p.light(x, 0, C[4], 0.3 * s * c * e);
    }
  }
  // the vent: a little heap of pebbles round a dark mouth
  const ST = rock();
  for (const [x, y, rr] of [[-9, -1.5, 2.4], [-4, -1, 1.8], [3.5, -1.2, 2.2], [9, -1.4, 2.6], [0, -0.6, 1.4], [-12.5, -0.8, 1.6]])
    p.shade(x - rr - 1, y - rr - 1, x + rr + 1, y + rr + 1, (px, py, out) => {
      const dx = px - x, dy = py - y, d = Math.hypot(dx * 1.1, dy);
      if (d > rr + 0.7 || py > 0) return;
      out.c = d > rr ? ST[0] : dx + dy < -rr * 0.6 ? ST[5] : dx + dy < rr * 0.3 ? ST[3] : ST[2];
    });
  for (const m of MOUTHS) p.px(m, -1, ST[0]);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, S = o.seed;
  // specks drifting in the water, flaring in the light
  cycle(t, D, 26, S + 7, D, (age, life, r) => {
    const x = r.range(-HALF + 6, HALF - 6) + Math.sin((age / D) * TAU + r.range(0, TAU)) * 3, y = TOP + 6 + ((r.range(0, 86) + age * 4) % 86);
    const s = shaft(x, y, ph), tw = Math.sin((age / D) * TAU * 3 + r.range(0, TAU));
    if (tw < -0.3 && s < 0.2) return;
    p.px(x, y, s > 0.4 ? WHITE : tw > 0.6 ? C[5] : C[4]);
    if (s > 0.4) p.glow(x, y, 3, C[5], 0.25 * s);
  });
  // the bubbles; when one reaches the surface it domes up, then pops with a ring and a couple of flecks
  each(t, S, (b) => {
    const sy = surfaceY(b.x, ph);
    if (b.y > sy + b.r) bubble(p, C, b.x, b.y, b.r, b.q, shaft(b.x, b.y, ph));
    else {
      const since = (sy + b.r - b.y) / b.vy;
      if (since < 0.12 && b.r >= 1.4) {
        for (let a = Math.PI; a <= TAU + 0.01; a += 0.4 / b.r) p.px(b.x + Math.cos(a) * b.r, sy + Math.sin(a) * b.r * 0.9, C[6]);
        p.px(b.x - b.r * 0.4, sy - b.r * 0.6, WHITE);
      } else if (since < (b.r >= 1.4 ? 0.32 : 0.2)) {
        const k = clamp((since - (b.r >= 1.4 ? 0.12 : 0)) / 0.2), w = Math.max(1, b.r + 1 + k * 4);
        for (let a = 0; a < Math.PI; a += 0.5 / w) if (Math.sin(a) > 0.15) p.dot(b.x + Math.cos(a) * w, sy + Math.sin(a) * w * 0.3, k < 0.4 ? WHITE : C[5], 1.2 - k);
        if (b.r >= 1.4 && k < 0.6) {
          p.px(b.x - 2, sy - 2 - k * 4, C[6]);
          p.px(b.x + 2, sy - 3 - k * 5, C[6]);
        }
      }
    }
  });
  // the surface: a lit line with glints running along it, a darker band under it
  for (let X = -HALF; X < HALF; X++) {
    const x = X + 0.5, y = surfaceY(x, ph), e = 1 - smooth(HALF - 12, HALF, Math.abs(x));
    const glint = Math.sin(x * 0.37 - ph * TAU * 3) * Math.sin(x * 0.13 + ph * TAU) > 0.55;
    p.dot(X, y, glint ? WHITE : C[5], e * 1.3);
    p.dot(X, y + 1, C[3], e * 1.3);
    if ((X & 3) === 0) p.glow(x, y + 1, 7, C[5], (glint ? 0.22 : 0.1) * e);
  }
}
