// The streaks falling in (a dim body, a bright head) follow Sprite Fusion's open-source rain
// (https://www.spritefusion.com/pixel-art-vfx/rain), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, clamp, smooth, rand, TAU, WHITE } from "../../core/index.mjs";
import { WATER, bead, ring } from "./_lib.mjs";

export const meta = {
  name: "Rain splash",
  desc: "A low close-up on one puddle in the rain: big drops land in crowns that throw beads and a rebound jet, rings spread and interfere, a lamp's reflection wobbles on the water.",
  tags: ["water", "rain", "splash", "puddle", "close-up", "ambient", "loop"],
  size: [176, 80],
  origin: [88, 50],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, seed: 9 },
};

const D = meta.duration, SY = 0.3, RX = 92, G = 640, N = 8, LAMP = 34;

// the big drops: where each lands on the puddle (x across, z into it), when, how tall its crown stands
function drops(S) {
  return Array.from({ length: N }, (_, i) => ({
    x: (rand(i, S) - 0.5) * 120, z: (rand(i, S + 1) - 0.5) * 50, t0: ((i + 0.25 * rand(i, S + 2)) / N) * D,
    H: 10 + 4 * rand(i, S + 3), J: 7 + 4 * rand(i, S + 4), spin: rand(i, S + 5) * TAU, i,
  }));
}
const ageOf = (t, t0) => (((t - t0) % D) + D) % D;
// a ring's radius and strength at age a
const ringR = (a) => 3 + 34 * Math.pow(a / 1.8, 0.7);
const ringK = (a) => (a < 1.8 ? 1.3 * Math.pow(1 - a / 1.8, 1.3) * Math.min(1, a / 0.06) : 0);
// the crown at age a: how high its walls stand and how wide its foot is
const crownH = (a, H) => H * Math.pow(Math.sin(Math.PI * clamp(a / 0.3)), 0.8) * (a < 0.3 ? 1 : 0);
const crownR = (a) => 1.5 + 4.5 * Math.sqrt(clamp(a / 0.3));
// the rebound jet: up and back down after the crown has fallen
const jetH = (a, J) => (a > 0.26 && a < 0.56 ? J * Math.sin((Math.PI * (a - 0.26)) / 0.3) : 0);

// the water's height at a point: every ring's swell summed, so where two cross they add and cancel
function field(x, z, list) {
  let h = 0;
  for (const q of list) {
    const dx = x - q.x;
    if (dx > q.R + 10 || dx < -q.R - 10) continue;
    const d = Math.hypot(dx, z - q.z) - q.R, w = 3.6 + q.a * 3;
    if (d > 2 * w || d < -3 * w) continue;
    h += q.k * Math.cos(d * 1.1) * Math.exp(-((d / w) ** 2));
  }
  return h;
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed, ry = RX * SY, ph = t / D;
  const list = drops(S).map((q) => ({ ...q, a: ageOf(t, q.t0) })).filter((q) => q.a < 1.8).map((q) => ({ ...q, R: ringR(q.a), k: ringK(q.a) }));
  for (let Y = Math.floor(-ry); Y < ry; Y++) {
    const y = Y + 0.5, z = y / SY, act = list.filter((q) => Math.abs(z - q.z) <= q.R + 12), far = (y + ry) / (2 * ry);
    // the lamp's reflection on this row: a dash of light, its width shimmering, pushed about by the swell
    const dashW = (1.5 + far * 4) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(Y * 1.73 + ph * TAU * 3 + Math.sin(Y * 0.61) * 3)));
    let hPrev = 0;
    for (let X = -88; X < 88; X++) {
      const x = X + 0.5, d = (x / RX) ** 2 + (y / ry) ** 2;
      if (d > 1) continue;
      const edge = Math.min(1, (1 - d) * 6);
      // the puddle: dark see-through water, the far part holding a little of the sky
      p.blend(x, y, C[0], (0.62 + 0.2 * far) * edge);
      if (far < 0.45) p.blend(x, y, C[2], 0.3 * (1 - far / 0.45) * edge);
      // its swell: every ring summed, so crests catch the light, troughs go dark, and crossings beat
      const h = act.length ? field(x, z, act) : 0, hx = h - hPrev;
      hPrev = h;
      if (h > 0.24) p.blend(x, y, h > 0.75 ? C[5] : C[4], Math.min(0.95, (h - 0.24) * 2.2) * edge);
      else if (h < -0.4) p.blend(x, y, C[0], Math.min(0.85, (-h - 0.4) * 1.8) * edge);
      if (x < LAMP - 14 || x > LAMP + 14) continue;
      const lx = Math.abs(x - LAMP - hx * 9 - Math.sin(y * 0.8 + ph * TAU * 2) * 1.4);
      if (lx < dashW) {
        const k = (1 - lx / dashW) * edge;
        p.px(X, Y, k > 0.72 ? WHITE : k > 0.35 ? C[6] : C[5]);
        p.light(x, y, C[5], 0.2 * k);
      }
    }
  }
  // the far rim of the puddle catches the light
  for (let X = -82; X < 82; X++) {
    const x = X + 0.5, y = -Math.sqrt(Math.max(0, 1 - (x / RX) ** 2)) * ry;
    p.px(X, y + 0.5, Math.abs(x - LAMP) < 10 ? C[6] : C[3]);
  }
  // the back halves of the crowns, behind their own front walls
  for (const q of drops(S)) crown(p, C, q, ageOf(t, q.t0), true);
}

// a crown: a ring of fingers thrown up round the drop's hole, a bead on each tip until they tear away
function crown(p, C, q, a, back) {
  const h = crownH(a, q.H);
  if (h < 1) return;
  const r0 = crownR(a), cy = q.z * SY;
  for (let f = 0; f < 10; f++) {
    const ang = q.spin + (f / 10) * TAU, s = Math.sin(ang);
    if (s < 0 !== back) continue;
    const tip = h * (0.75 + 0.25 * rand(q.i, f, 7)), lean = 0.35 * tip, x0 = q.x + Math.cos(ang) * r0, y0 = cy + s * r0 * SY;
    const x1 = q.x + Math.cos(ang) * (r0 + lean), y1 = cy + s * (r0 + lean) * SY - tip;
    p.line(x0, y0, x1, y1, back ? (u) => (u > 0.7 ? C[5] : C[3]) : (u) => (u > 0.75 ? WHITE : u > 0.35 ? C[6] : C[5]));
    if (a > 0.08 && a < 0.17) p.px(x1, y1 - 1, back ? C[5] : WHITE);
  }
  if (!back) p.glow(q.x, cy - h * 0.6, 6 + h * 0.6, C[5], 0.3 * (h / q.H));
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed;
  for (const q of drops(S)) {
    const a = ageOf(t, q.t0), cy = q.z * SY;
    // falling in: a streak dropping into the frame just before it lands
    const pre = D - a;
    if (pre < 0.14 && cy - pre * 520 - 10 > -48) {
      const y = cy - pre * 520;
      p.line(q.x, y - 10, q.x, y - 4, C[4]);
      p.line(q.x, y - 4, q.x, y, C[6]);
    }
    // the hit: a white fleck and a flash of light, then the crown
    if (a < 0.05) {
      p.px(q.x, cy, WHITE);
      p.glow(q.x, cy - 2, 12, C[5], 0.5 * (1 - a / 0.05));
    }
    crown(p, C, q, a, false);
    // beads torn off the crown's tips arc out and fall back, each with a fleck and a little ring
    if (a > 0.16 && a < 0.8)
      for (let f = 0; f < 10; f += 2) {
        const ang = q.spin + (f / 10) * TAU, tip = crownH(0.16, q.H) * (0.75 + 0.25 * rand(q.i, f, 7)), r0 = crownR(0.16) + tip * 0.35;
        const v = 22 + 18 * rand(q.i, f, 8), vh = 40 + 30 * rand(q.i, f, 9), tt = a - 0.16, hh = tip + vh * tt - 0.5 * G * tt * tt;
        const bx = q.x + Math.cos(ang) * (r0 + v * tt), bz = q.z + Math.sin(ang) * (r0 + v * tt), by = bz * SY;
        if (hh > 0) bead(p, bx, by - hh, Math.cos(ang) * v, -(vh - G * tt) + Math.sin(ang) * v * SY, rand(q.i, f, 10) < 0.4 ? 2 : 1, C);
        else {
          const land = (vh + Math.sqrt(vh * vh + 2 * G * tip)) / G, since = tt - land;
          if (since < 0.05) p.px(bx, by, WHITE);
          if (since < 0.35) ring(p, bx, by, 1 + since * 12, SY, 1 - since / 0.35, C, { n: 1, half: 1, seed: q.i * 10 + f });
        }
      }
    // the rebound jet, with a bead that pinches off its top and drops back
    const jh = jetH(a, q.J);
    if (jh > 0.8) {
      p.line(q.x, cy - 1, q.x, cy - jh, (u) => (u > 0.6 ? WHITE : C[6]));
      p.px(q.x + 1, cy - 1, C[5]);
      if (a < 0.41) p.circle(q.x, cy - jh - 0.5, 1.2, C[6]);
      p.glow(q.x, cy - jh * 0.6, 6, C[5], 0.3);
    }
    const ba = a - 0.41, bh = q.J + 1 + 24 * ba - 0.5 * G * ba * ba;
    if (ba > 0 && bh > 0) {
      p.circle(q.x, cy - bh, 1.1, C[6]);
      p.px(q.x, cy - bh - 1, WHITE);
    }
  }
  // the near halves of the main rings, crisp, so each splash has its own edge in the swell
  for (const q of drops(S)) {
    const a = ageOf(t, q.t0);
    if (a < 1.8) ring(p, q.x, q.z * SY, ringR(a), SY, 0.75 * ringK(a), C, { n: 1, half: 1, hot: a < 0.1, seed: q.i, wob: 0.5 + a });
  }
  // finer rain dimpling the water, and a few streaks falling past
  cycle(t, D, 16, S + 20, 0.5, (age, life, r) => {
    const x = r.range(-80, 80), z = r.range(-26, 26), y = z * SY, s = age - 0.1;
    if (s < 0) {
      const yy = y - (0.1 - age) * 600;
      if (yy - 6 < -48) return;
      p.line(x, yy - 6, x, yy, (u) => (u > 0.6 ? C[5] : C[3]));
    } else if (s < 0.4 && (x / RX) ** 2 + (y / (RX * SY)) ** 2 < 0.9) {
      if (s < 0.04) p.px(x, y, C[6]);
      ring(p, x, y, 1 + s * 9, SY, 0.8 * (1 - s / 0.4), C, { n: 1, half: 1, seed: 40 });
    }
  });
  // the lamp's glow on the water
  p.glow(LAMP, -6, 30, C[4], 0.16);
}
