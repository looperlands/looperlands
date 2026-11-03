// The caustic light and the bubbles are adapted from Sprite Fusion's open-source bubbles
// (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, clamp, wrap, lerp, smooth, ease, rng, cycle, TAU } from "../../core/index.mjs";
import { Grid, shift, bubble } from "./_lib.mjs";

export const meta = {
  name: "Fish school",
  desc: "A school of fish holds station in two depth rows: bodies wag into swinging tails, one darts ahead now and then, bubbles rise and caustic light ripples over them.",
  tags: ["critter", "fish", "school", "sea", "underwater", "swim", "loop"],
  size: [136, 80],
  origin: [68, 40],
  duration: 4.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#0a1a2a", "#123552", "#1d5a7e", "#2f8aa8", "#62bccc", "#bfe8e6", "#f4fff8"],
    stripe: ["#5a1e14", "#d8582a", "#ffa04a"],
    seed: 1,
  },
};

const D = meta.duration, GRID = new Grid(-28, -12, 34, 24);
// the school: [x, y, size, back row?, phase]
const SCHOOL = [
  [-34, -16, 0.72, true, 0.1], [2, -20, 0.68, true, 0.55], [30, -10, 0.7, true, 0.3],
  [-22, 4, 1, false, 0.8], [12, -4, 1, false, 0.2], [-40, -2, 0.95, false, 0.45], [26, 14, 0.96, false, 0.65],
];

// one fish, its nose at (0, 0), facing right, its body trailing back to the left
function fish(g, C, Sp, s, t, ph, dart) {
  g.clear();
  const L = 15 * s, H = 8 * s, beats = 12 + (dart > 0 ? 6 : 0), w = (t / D) * TAU * beats + ph * TAU;
  const amp = (1.3 + 1.2 * dart) * s, bend = (u) => amp * u ** 1.8 * Math.sin(w - 4 * u);
  const prof = (u) => (u < 0.3 ? Math.sqrt(u / 0.3) : 1 - ((u - 0.3) / 0.7) ** 1.5 * 0.72);
  const hh = (u) => (H / 2) * prof(u);
  // body: dark back, lighter flank, silver belly; a stripe down the side; light rippling on its back
  g.shade(-L, -H, 0, H, (x, y, o) => {
    const u = -x / L, dy = y - bend(u), h = hh(u);
    if (u < 0 || u > 1 || Math.abs(dy) > h) return 0;
    const v = dy / h;
    if (v > -0.12 && v < 0.12 && u > 0.22 && u < 0.92) return u < 0.3 ? Sp[1] : Sp[v < 0 ? 2 : 1];
    if (v < -0.6) return u < 0.5 && v < -0.8 ? C[3] : C[2];
    if (v < -0.12) return C[3];
    if (v < 0.5) return C[4];
    return v > 0.86 ? C[4] : C[5];
  });
  // the tail: a forked fin swinging off the end of the wave, lit along its upper lobe
  const tb = bend(1), ta = Math.atan(amp * 1.8 * 0.9 * Math.cos(w - 4)) * 0.8, TL = 6 * s, hb = hh(1);
  const rot = (dx, dy) => [-(L + dx * Math.cos(ta) - dy * Math.sin(ta)), tb + dx * Math.sin(ta) + dy * Math.cos(ta)];
  g.poly([rot(-0.5, -hb), rot(TL, -hb - 3.4 * s), rot(TL * 0.62, 0), rot(TL, hb + 3.4 * s), rot(-0.5, hb)], (x, y) => (y < tb - 1 ? C[4] : C[3]), 0.88);
  // the dorsal fin: swept back, ribbed; a pectoral fin paddling, the gill, the eye
  const d0 = 0.34, d1 = 0.66;
  g.poly([[-d0 * L, bend(d0) - hh(d0) + 0.5], [-(d0 + 0.08) * L, bend(d0) - hh(d0) - 3.6 * s], [-d1 * L, bend(d1) - hh(d1) + 0.5]], (x) => (Math.round(x) % 2 ? C[3] : C[4]), 0.85);
  const pf = Math.sin(w * 0.5) * 1.2;
  g.set(-0.34 * L, bend(0.34) + 1.5 * s + pf * 0.3, C[4], 0.85); g.set(-0.34 * L - 1, bend(0.34) + 2 * s + pf * 0.6, C[4], 0.85);
  for (let y = -2; y <= 1; y++) g.set(-0.26 * L, bend(0.26) + y * s, C[2]);
  const ex = -0.13 * L - 1, ey = bend(0.13) - 0.25 * H;
  g.set(ex, ey, C[0]); g.set(ex + 1, ey, C[0]); g.set(ex, ey + 1, C[1]); g.set(ex + 1, ey + 1, C[0]);
  g.set(ex + 1, ey, C[6]);
  g.outline(C[0]);
}

// where a fish is: holding station in the current, swaying; one darts ahead and drifts back once a loop
function place(f, i, t) {
  const [bx, by, , , ph] = f, a = (t / D) * TAU;
  const dt = wrap(t - (i * 0.71 * D) % D, D), dart = i === 4 ? (dt < 0.25 ? ease.outCubic(dt / 0.25) : dt < 1.6 ? 1 - ease.inOutSine((dt - 0.25) / 1.35) : 0) : 0;
  return { x: bx + 3 * Math.sin(a + ph * TAU) + 8 * dart, y: by + 1.8 * Math.sin(2 * a + ph * 5), dart: i === 4 && dt < 0.6 ? 1 - dt / 0.6 : 0 };
}

// caustics: the light that comes down through rippling water, as bright crossing lines
function caustics(p, C, t) {
  const a = (t / D) * TAU;
  for (let y = -38; y < 38; y++)
    for (let x = -66; x < 66; x++) {
      const fall = clamp(1 - ((x / 64) ** 2 + (y / 40) ** 2)) * (0.6 + 0.4 * clamp(-y / 40 + 0.6));
      if (fall <= 0) continue;
      const u = x * 0.16 + 1.9 * Math.sin(y * 0.12 + a), v = y * 0.19 + 1.9 * Math.sin(x * 0.1 - a);
      const n1 = Math.sin(u) + Math.sin(v), sh = 0.75 + 0.25 * Math.sin(x * 0.05 - y * 0.04 + 2 * a);
      const f = Math.max(0, 1 - Math.abs(n1) * 5) * fall * sh;
      if (f > 0.55) p.light(x, y, C[4], 0.3);
      else if (f > 0.25) p.light(x, y, C[3], 0.14);
    }
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), Sp = fit(o.stripe, 3), g = GRID;
  // shafts of light slanting down through the water
  for (const [x0, w, ph] of [[-30, 10, 0], [14, 7, 2.1], [44, 12, 4]]) {
    const sw = Math.sin((t / D) * TAU + ph) * 4;
    p.glowLine(x0 + sw - 12, -40, x0 + sw + 8, 40, w, C[4], 0.05);
  }
  // the back row first, dimmed into the water; then the front row
  for (const back of [true, false])
    SCHOOL.forEach((f, i) => {
      if (f[3] !== back) return;
      const P = place(f, i, t);
      fish(g, C, Sp, f[2], t, f[4], P.dart);
      if (back) {
        g.recolor((x, y, c) => mix(c, C[1], 0.42));
      }
      g.draw(p, 1, P.x, P.y);
    });
  // bubbles let go from their mouths now and then
  cycle(t, D, 9, o.seed * 13 + 1, (r) => r.range(1.6, 2.6), (age, L, r, i) => {
    const f = SCHOOL[i % SCHOOL.length], P = place(f, i % SCHOOL.length, wrap(t - age, D)), rad = r.range(0.6, 1.6) * f[2];
    const ph = r.next() * TAU, x = P.x + 1 + Math.sin(age * (4 + 2 / rad) + ph) * (0.5 + rad * 0.7), y = P.y - 1 - (16 + 12 * rad) * age;
    if (y < -38) return;
    bubble(p, x, y, rad, [C[6], C[5], C[4], C[3]], Math.min(1, age * 4, (L - age) * 3, (y + 38) / 4));
  });
  caustics(p, C, t);
  p.glow(0, -8, 74, C[2], 0.2);
  p.glow(-6, -18, 40, C[3], 0.1);
}
