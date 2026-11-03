// The stream's build (a white core banded out to darker edges, surges running along it, light down its length, a
// flare where it leaves the source) follows Sprite Fusion's open-source energy beam
// (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, tileNoise, clamp, smooth, TAU, WHITE } from "../../core/index.mjs";
import { WATER, bead } from "./_lib.mjs";

export const meta = {
  name: "Water jet",
  desc: "A pressurised stream blasts right: a tight glassy rod with surges running down it that swells, roughens, bends under its weight and breaks into chunks, spray and mist.",
  tags: ["water", "jet", "stream", "hose", "spray", "directional", "loop"],
  size: [188, 80],
  origin: [14, 32],
  duration: 1,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: WATER, length: 118, seed: 3 },
};

const D = meta.duration, G = 520, SPEED = 260;

// the stream's centre line drops as it goes, and how thick it is there
const drop = (x, L) => (x / L) ** 2 * 9;
const thick = (x, L) => 2.6 + 5.4 * Math.pow(x / L, 1.1);

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, L = o.length, S = o.seed, T = ph * TAU;
  // the stream, column by column: white down its core, banded out to blue edges, shadowed underneath; streaks race
  // along it and surges bulge through; past halfway it roughens, and its far end tears into chunks with gaps
  for (let X = 0; X <= L + 3; X++) {
    const x = X + 0.5, u = x / L;
    if (u > 1) break;
    const yc = drop(x, L), rough = smooth(0.25, 1, u), sd = ((((x - ph * SPEED * 2) % 130) + 130) % 130) - 65;
    const w0 = thick(x, L) + Math.exp(-(sd * sd) / 90) * 1.4 * (1 - u * 0.5);
    const up = w0 + tileNoise(x * 0.18 - ph * 30, 9, 30, 0, S + 1) * 2.2 * rough, dn = w0 + tileNoise(x * 0.18 - ph * 30, 3, 30, 0, S + 1) * 2.2 * rough;
    for (let Y = Math.floor(yc - up); Y <= Math.ceil(yc + dn); Y++) {
      const y = Y + 0.5, q = (y - yc) / Math.max(0.8, y < yc ? up : dn), aq = Math.abs(q);
      if (aq > 1) continue;
      if (u > 0.55 && tileNoise(x * 0.12 - ph * 25, (y - yc) * 0.25, 25, 0, S + 2) < -0.9 + 1.6 * smooth(0.55, 1, u)) continue;
      const streak = tileNoise(x * 0.06 - ph * 40, Math.floor(y - yc + 20) * 1.7, 40, 0, S);
      let lvl = aq < 0.2 ? 0 : aq < 0.48 ? 1 : aq < 0.78 ? 2 : 3;
      if (streak > 0.35) lvl = Math.max(0, lvl - 1);
      if (q > 0.4) lvl = Math.min(3, lvl + 1);
      p.px(X, Y, [WHITE, C[6], C[5], C[4]][lvl]);
      if (lvl === 0) p.light(x, y, C[5], 0.12);
    }
  }
  // the nozzle flare: a white burst where it leaves, ringed with light
  const fl = 0.85 + 0.15 * Math.sin(T * 6);
  p.circle(0, 0, 4.4 * fl, C[5]);
  p.circle(0, 0, 3.4 * fl, C[6]);
  p.circle(0, 0, 2.2 * fl, WHITE);
  for (let a = 0; a < TAU; a += 0.35) p.dot(Math.cos(a + T * 2) * 5.2 * fl, Math.sin(a + T * 2) * 5.2 * fl, C[5], 0.6);
  p.glow(0, 0, 24, C[5], 0.6 * fl);
  p.glow(0, 0, 8, WHITE, 0.4 * fl);
  // where it pinches apart: beads strung out along the end of the stream, racing on
  for (let k = 0; k < 6; k++) {
    const x = L * 0.82 + ((k * 13 + ph * SPEED) % 78), y = drop(Math.min(x, L), L) + (x > L ? ((x - L) / 60) ** 2 * 10 : 0) + Math.sin(k * 2.1) * 1.5;
    if (x < L + 34) bead(p, x, y, SPEED, 40, k % 3 === 0 ? 3 : 2, C);
  }
  // spray: a widening cone of drops shed from the stream and torn off its end, arcing down
  cycle(t, D, 70, S + 3, (g) => g.range(0.2, 0.42), (age, life, r) => {
    const f = Math.sqrt(r.next()), x0 = L * (0.3 + 0.7 * f), y0 = drop(x0, L) + r.range(-1, 1) * thick(x0, L);
    const vx = r.range(150, 270) * (0.55 + 0.45 * f), vy = r.range(-1, 1) * 110 * f + r.range(-10, 20);
    const x = x0 + vx * age, y = y0 + vy * age + 0.5 * G * age * age, k = age / life;
    if (x > L + 50 || y > 40 || y < -28 || (k > 0.75 && r.next() < (k - 0.75) * 4)) return;
    if (r.next() < 0.45) p.px(x, y, k < 0.5 ? WHITE : C[6]);
    else bead(p, x, y, vx, vy + G * age, r.next() < 0.2 ? 2 : 1, C);
  });
  // mist blooming off the end
  cycle(t, D, 12, S + 4, (g) => g.range(0.7, 1), (age, life, r) => {
    const k = age / life, x = L * r.range(0.7, 1) + age * r.range(20, 45), y = drop(Math.min(x, L), L) + r.range(-5, 5) + age * r.range(4, 14);
    const rad = r.range(3, 5) + k * r.range(5, 9), a = r.range(0.1, 0.18) * Math.min(1, k / 0.15) * Math.pow(1 - k, 1.5);
    p.disc(x, y, rad, C[6], (d) => a * (1 - d * d));
  });
  // light: down the core, brightest near the nozzle
  for (let x = 0; x < L; x += 10) p.glow(x, drop(x, L), 14 + x * 0.1, C[4], 0.26 * (1 - (x / L) * 0.5));
  p.glow(L * 0.9, drop(L * 0.9, L), 26, C[5], 0.22);
}
