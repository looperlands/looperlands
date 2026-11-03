// The beam (banded across, pulses running down it, sine strands that brighten in front, a source flare with
// spinning rays, an end flare spraying rays and sparks) is adapted from Sprite Fusion's open-source energy beam
// (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { PAL, fit, cycle, fly, flyV, loopNoise, fract, ease, sparkle, TAU, WHITE, READY } from "../../core/index.mjs";
import { bayer, mote } from "./_lib.mjs";

const D = 1.2, HX = 15, HY = -24, L = 168, W = 6;

export const meta = {
  name: "Arcane beam",
  desc: "A beam fires right from the hand: a white core, strands twisting round it, pulses running down it, a flaring source and an end that sprays sparks.",
  tags: ["arcane", "beam", "laser", "ray", "magic", "directional", "loop"],
  size: [264, 100],
  origin: [26, 84],
  duration: D,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: PAL.arcane, seed: 10 },
};

const AIM = { ...READY, x: -3, crouch: 4, lean: 4, fx: 18, fy: -24, bx: 13, by: -20, ffx: 11, fbx: -9, toeB: true };
const PULL = { ...READY, x: -3, crouch: 4, lean: -3, fx: 1, fy: -20, bx: 4, by: -22, ffx: 9, fbx: -7 };
export const act = {
  target: { x: 186 },
  poses: [
    [-0.62, { ...READY, x: -3 }],
    [-0.3, PULL],
    [-0.04, { ...PULL, crouch: 5, lean: -4 }],
    [0, { ...AIM, crouch: 3 }, "snap"],
    [0.3, AIM],
    [0.6, { ...AIM, crouch: 5, lean: 3 }],
    [0.9, AIM],
    [1.2, { ...AIM, crouch: 3 }],
  ],
  hits: [{ t: 0.1, push: 0.5, straw: 3, flash: 0.02, y: -24 }, { t: 0.7, push: 0.5, straw: 3, flash: 0.02, y: -24 }],
  dust: [{ t: 0, x: -10, n: 5, dir: -1 }],
};

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, S = o.seed, EX = HX + L;
  // the body, built across from a white core out to a dithered violet edge, wobbling and pulsing as it goes
  const LV = [WHITE, C[6], C[5], C[4], C[3], C[2]];
  for (let d = 0; d <= L; d += 0.5) {
    const x = HX + d, w = W * (1 + 0.12 * Math.sin(d * 0.35 - ph * TAU * 8)) * Math.min(1, (d + 3) / 7);
    const pulse = fract(d * 0.025 - ph * 4) < 0.07 ? 1 : 0;
    for (let q0 = -w * 1.3; q0 <= w * 1.3; q0 += 0.5) {
      const q = Math.abs(q0) / w, y = HY + q0;
      let lv = q < 0.2 ? 0 : q < 0.4 ? 1 : q < 0.62 ? 2 : q < 0.85 ? 3 : q < 1 ? 4 : 5;
      lv = Math.max(0, lv - pulse);
      if (lv === 5 && bayer(x, y) > (1.3 - q) / 0.3) continue;
      p.px(x, y, LV[lv]);
    }
    // three strands twisting round it: bright on the near side, gone behind
    for (let s = 0; s < 3; s++) {
      const a = d * 0.17 - ph * TAU * 6 + (s * TAU) / 3, off = Math.sin(a) * w * 1.05;
      if (Math.cos(a) > -0.15) p.dot(x, HY + off, Math.cos(a) > 0.55 ? WHITE : C[6]);
    }
    if ((Math.round(d * 2) & 11) === 0) p.glow(x, HY, w * 2.2 + 4, C[5], 0.2);
  }

  // the source: a flickering flare with spinning rays at the hand
  const fr = 4.2 + Math.sin(ph * TAU * 10) * 0.6;
  for (let i = 0; i < 4; i++) {
    const a = ph * TAU * 2.5 + (i * TAU) / 4, l = 7 + 3 * Math.sin(ph * TAU * 6 + i);
    p.line(HX, HY, HX + Math.cos(a) * l, HY + Math.sin(a) * l, (u) => (u < 0.5 ? WHITE : C[6]), (u) => (u < 0.6 ? 1 : 1.6 - u));
  }
  p.circle(HX, HY, fr + 1.5, C[4]);
  p.circle(HX, HY, fr, C[6]);
  p.circle(HX, HY, fr * 0.6, WHITE);
  p.glow(HX, HY, 32, C[5], 0.8);
  // energy drawn into the hand
  cycle(t, D, 10, S * 3 + 1, 0.18, (age, life, r) => {
    const a = r.range(0, TAU), dd = 16 * (1 - age / life) + 3, x = HX + Math.cos(a) * dd, y = HY + Math.sin(a) * dd;
    p.dot(x, y, age / life > 0.6 ? WHITE : C[6]);
  });

  // the end: a hot flare spraying rays, rings shocking out, sparks thrown back and falling
  const ir = 5 + Math.sin(ph * TAU * 12) * 0.8;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i - 3) * 0.36, l = 8 + 8 * Math.abs(loopNoise(ph, 4, S * 7 + i));
    p.line(EX, HY, EX + Math.cos(a) * l, HY + Math.sin(a) * l, (u) => (u < 0.4 ? WHITE : i % 2 ? C[5] : C[6]), (u) => (u < 0.6 ? 1 : 1.6 - u));
  }
  for (let k = 0; k < 3; k++) {
    const q = fract(ph * 3 + k / 3);
    p.ring(EX, HY, 3 + 15 * ease.outCubic(q), Math.max(1, 2 * (1 - q)), q < 0.25 ? WHITE : C[5], 1.1 - q);
  }
  p.circle(EX, HY, ir + 1.5, C[4]);
  p.circle(EX, HY, ir, C[6]);
  p.circle(EX, HY, ir * 0.55, WHITE);
  p.glow(EX, HY, 40, C[5], 0.9);
  p.glow(EX, HY, 12, WHITE, 0.6);
  // a fountain of sparks thrown up and back off the end, arcing down
  cycle(t, D, 220, S * 3 + 2, (g) => g.range(0.18, 0.5), (age, life, r) => {
    const a = Math.PI * 1.5 + r.range(-1.7, 0.45), sp = r.range(70, 260), vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - 30;
    const [x, y] = fly(EX, HY, vx, vy, age, 480, 2.2), [ux, uy] = flyV(vx, vy, age, 480, 2.2), k = 1 - age / life;
    if (y > -1) return;
    const head = k > 0.6 ? WHITE : k > 0.3 ? C[6] : C[5], sp2 = Math.hypot(ux, uy) || 1, len = Math.min(8, 1 + sp2 * 0.022);
    p.line(x - (ux / sp2) * len, y - (uy / sp2) * len, x, y, (u) => (u > 0.5 ? head : C[4]));
    p.glow(x, y, 3, head, 0.45 * k);
  });
  cycle(t, D, 6, S * 3 + 3, 0.3, (age, life, r) => {
    const k = Math.sin((age / life) * Math.PI);
    sparkle(p, EX + r.range(-12, 4), HY + r.range(-12, 12), 1 + 2.5 * k, C[6], C[5], 0.4 * k);
  });
  // violet vapour lifting off the end
  cycle(t, D, 7, S * 3 + 5, (g) => g.range(0.8, 1.2), (age, life, r) => {
    const q = age / life, x = EX + r.range(-8, 4) - q * 6, y = HY - 4 - q * r.range(14, 24), rad = r.range(3, 5) * (0.7 + 0.8 * q);
    p.disc(x, y, rad, C[4], (dd) => 0.28 * Math.sin(q * Math.PI) * (1 - dd * dd));
  });
  // motes shed along the beam
  cycle(t, D, 16, S * 3 + 4, (g) => g.range(0.3, 0.6), (age, life, r) => {
    const q = age / life, x = HX + r.range(10, L - 10) + q * 20, y = HY + r.sign() * (W + 1 + q * r.range(4, 10));
    mote(p, x, y, 40, (y - HY) * 1.5, r.chance(0.5) ? C[6] : C[5], 0.6, 1 - q, 0.3);
  });
  // the floor beneath catches the light
  p.glow(EX, -1, 30, C[5], 0.25);
  p.glow(HX + L / 2, -1, 60, C[4], 0.12);
}
