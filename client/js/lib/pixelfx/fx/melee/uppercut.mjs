// The crescent recipe is adapted from Sprite Fusion's open-source slash, and the star from his impact
// (https://www.spritefusion.com/pixel-art-vfx), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, hex, clamp, smooth, ease, TAU, WHITE, READY } from "../../core/index.mjs";
import { swing, onSwing, slash, slashEnd, star } from "./_lib.mjs";

export const meta = {
  name: "Uppercut",
  desc: "A crescent rises from the floor past the face, and at the top a comic impact star bursts: bold outline, hot core, burst lines, twinkles and sparks.",
  tags: ["melee", "uppercut", "punch", "rising", "launcher", "comic", "combat", "directional", "one-shot"],
  size: [132, 128],
  origin: [48, 110],
  duration: 0.85,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#3a1408", "#7a2a10", "#c4501a", "#f08a2a", "#ffc94a", "#fff2a8", "#ffffff"],
    outline: "#2a0a08",
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    seed: 11,
  },
};

const FISTS = { ...READY, fx: 12, fy: -25, bx: 9, by: -27, crouch: 3, lean: 1 };
const COIL = { ...FISTS, crouch: 7, lean: 3, fx: 8, fy: -11, bx: 8, by: -27, ffx: 10, fbx: -9 };
const TOP = { ...FISTS, x: 1, y: -11, crouch: -1, lean: 2, fx: 12, fy: -42, bx: -6, by: -21, ffx: 8, ffy: -8, fbx: -3, fby: -2, toeB: true, ghost: 1 };
export const act = {
  target: { x: 44 },
  poses: [
    [-0.42, FISTS],
    [-0.16, COIL],
    [0, { ...COIL, crouch: 8 }],
    [0.03, { ...FISTS, y: -4, crouch: 1, lean: 4, fx: 18, fy: -27, bx: -5, by: -23, ffx: 9, fbx: -7, toeB: true, ghost: 1 }, "snap"],
    [0.076, TOP, "snap"],
    [0.3, { ...TOP, y: -13, ghost: undefined }],
    [0.56, { ...TOP, y: 0, crouch: 2, fx: 13, fy: -31, ffx: 7, ffy: -6, fbx: -5, fby: -5, ghost: undefined }, "in"],
    [0.6, { ...FISTS, y: 0, crouch: 7, lean: 3, fx: 12, fy: -14, bx: -6, by: -16, ffx: 10, fbx: -9 }, "snap"],
    [0.98, FISTS],
  ],
  hits: [{ t: 0.076, stop: 0.13, shake: 0.18, amp: 2, push: -2.6, straw: 18, y: -34 }],
  dust: [{ t: 0.03, x: 8, n: 6 }, { t: 0.6, x: 0, n: 6 }],
};

export function create(o) {
  const C = fit(o.palette, 7), INK = hex(o.outline), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
  // up from the floor in front, bowing forward past the face, to the top
  const A = swing({ cx: 8, cy: -25, R: 27, sy: 1, rot: 0, a0: 1.08, dir: -1, span: 2.5, W: 13, t0: 0.02, sweep: 0.07, hold: 0.05, trail: 0.22, ramp: C });
  const top = slashEnd(A), SX = top.x + 3, SY = top.y - 5, HIT = A.t0 + A.sweep * 0.8;
  const spikes = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * TAU + Rg.range(-0.12, 0.12) - Math.PI / 2, len: (i % 2 ? 7 : 13) + Rg.range(0, 4), w: i % 2 ? 2.2 : 3 }));
  const bursts = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU + 0.2 + Rg.range(-0.15, 0.15), r0: Rg.range(15, 18), L: Rg.range(5, 9) }));
  let t = 0, hit = false, kicked = false;
  return {
    update(dt) {
      t += dt;
      if (!kicked) {
        kicked = true;
        // the fist comes up off the floor
        for (let i = 0; i < 4; i++) ps.spawn(P.DUST, 18 + Rg.range(-4, 4), -1, Rg.range(-30, 30), -Rg.range(5, 20), Rg.range(0.3, 0.55), "#6a6080", Rg.range(1.5, 2.6));
      }
      if (!hit && t >= HIT) {
        hit = true;
        lights.add(SX, SY, 56, C[4], 0.6, 0.4);
        lights.add(SX, SY, 18, WHITE, 0.7, 0.08);
        for (let i = 0; i < 16; i++) {
          const a = -Math.PI / 2 + Rg.range(-1.6, 1.6), sp = Rg.range(120, 320);
          ps.spawn(P.SPARK, SX, SY, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.15, 0.45));
        }
        for (let i = 0; i < 6; i++) {
          const a = Rg.range(0, TAU), d = Rg.range(14, 24);
          ps.spawn(P.STAR, SX + Math.cos(a) * d, SY + Math.sin(a) * d, Math.cos(a) * 20, Math.sin(a) * 20 - 10, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1.4, 2.6), Rg.range(0.04, 0.18));
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      slash(p, A, t);
      // speed lines rising beside the crescent while it goes up
      const u = t - A.t0;
      if (u > 0 && u < 0.16)
        for (const [dx, y0, L] of [[A.cx + A.R + 7, -16, 18], [A.cx + A.R + 11, -30, 12], [A.cx - 4, -40, 10]]) {
          const k = u / 0.16, y = y0 - 30 * k;
          for (let d = 0; d < L; d += 1) p.dot(dx, y + d, d < 3 ? WHITE : d < L * 0.5 ? C[5] : C[3], (1 - d / L) * (1 - k));
        }
      if (u > 0 && u < A.sweep + 0.06) {
        const [x, y] = onSwing(A, A.R - 5, A.span * ease.outExpo(clamp(u / A.sweep)));
        p.glow(x, y, 34, C[3], 0.45 * (1 - u / (A.sweep + 0.06)));
      }
      // the comic star: pops past full size, holds, then shrinks away turning, with burst lines round it
      const q = t - HIT;
      if (q >= 0 && q < 0.36) {
        const pop = ease.outBack(clamp(q / 0.05), 2.6), out = 1 - smooth(0.16, 0.36, q), sc = pop * (0.35 + 0.65 * out), turn = q * 1.2;
        const sp = spikes.map((s) => ({ ...s, a: s.a + turn }));
        if (sc > 0.08) {
          star(p, SX, SY, sp, sc * 1.12, 1, INK, INK, INK, INK);
          star(p, SX, SY, sp, sc, 1, q < 0.05 ? WHITE : C[6], C[4], C[3], C[2]);
        }
        p.glow(SX, SY, 30, C[4], 0.45 * out);
      }
      if (q >= 0.02 && q < 0.24) {
        // a ring bursts out round the star, white to orange, breaking into dots
        const k = (q - 0.02) / 0.22, r = 7 + 17 * ease.outCubic(k), th = Math.max(1, 2.2 * (1 - k)), col = k < 0.25 ? WHITE : k < 0.5 ? C[5] : k < 0.75 ? C[4] : C[3];
        for (let a = 0; a < TAU; a += 0.6 / r) for (let o = 0; o < th; o += 0.5) p.dot(SX + Math.cos(a) * (r - o), SY + Math.sin(a) * (r - o), col, 1.15 - k);
      }
      if (q >= 0.02 && q < 0.2) {
        const k = (q - 0.02) / 0.18;
        for (const b of bursts) {
          const r0 = b.r0 + 10 * ease.outCubic(k), ca = Math.cos(b.a), sa = Math.sin(b.a);
          p.line(SX + ca * r0, SY + sa * r0, SX + ca * (r0 + b.L * (1 - k)), SY + sa * (r0 + b.L * (1 - k)), k < 0.4 ? WHITE : C[5], 1.1 - k);
        }
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
