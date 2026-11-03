// The crescent shading, cooling ramp, dotted trace, glint and spark recipe is adapted from Sprite Fusion's
// open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, PF, Rng, fit, sparkle, clamp, smooth, ease, rand, TAU, WHITE, READY } from "../../core/index.mjs";
import { swing, onSwing, travel, smear, trace, glowAlong } from "./_lib.mjs";

export const meta = {
  name: "Spin slash",
  desc: "The blade whirls once round the waist on a tilted plane, behind the body and back in front; the closed ring flares white, dissolves into a dotted trace and throws sparks.",
  tags: ["melee", "slash", "spin", "sword", "aoe", "combat", "one-shot"],
  size: [208, 104],
  origin: [104, 84],
  duration: 0.8,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#16224a", "#1f4a86", "#2a7fc0", "#48b8ec", "#9fe2ff", "#e2f7ff", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    radius: 46,
    seed: 3,
  },
};

const STANCE = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
// he really turns: forward, away from us, facing back, towards us, and round to the front
const WOUND = { ...STANCE, crouch: 6, lean: -2, yaw: 1.1, fx: 13, fy: -20, sa: 0.3, bx: 6, by: -24, ffx: 8, fbx: -8 };
const WIDE = { ...STANCE, crouch: 5, lean: 3, fx: 21, fy: -21, sa: 0.05, bx: -9, by: -23, ffx: 11, fbx: -11 };
export const act = {
  target: { x: 60 },
  poses: [
    [-0.46, STANCE],
    [-0.2, WOUND],
    [-0.02, { ...WOUND, crouch: 7, yaw: 1.3 }],
    [0, { ...WIDE, sa: -0.1, ghost: 1 }, "snap"],
    [0.05, { ...WIDE, yaw: -1.57, ghost: 1 }, "snap"],
    [0.09, { ...WIDE, yaw: -3.14, ghost: 1 }, "snap"],
    [0.13, { ...WIDE, yaw: -4.71, ghost: 1 }, "snap"],
    [0.17, WIDE, "snap"],
    [0.56, { ...WIDE, crouch: 4, lean: 2 }],
    [0.92, STANCE],
  ],
  hits: [{ t: 0.17, stop: 0.12, shake: 0.16, amp: 2, push: 2.4, straw: 16 }],
  dust: [{ t: 0, x: 0, n: 6 }, { t: 0.17, x: 12, n: 6, dir: 1 }],
};

const SW = 0.17; // the edge goes once round
const FLARE = 0.3; // the closed ring flares and dissolves
const turn = (t) => 1 - Math.pow(1 - clamp(t / SW), 1.6); // fraction of the turn the edge has made
const passedAt = (f) => SW * (1 - Math.pow(1 - clamp(f), 1 / 1.6)); // when the edge passed fraction f

export function create(o) {
  const C = fit(o.palette, 7), n = C.length, Rg = new Rng(o.seed), R0 = o.radius;
  const ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
  // the spin starts front-right, goes up the right side, behind the body, down the left and back across the front
  const A = swing({ cx: 0, cy: -17, R: R0, sy: 0.27, rot: -0.1, a0: 0.5, dir: -1, k: 0.15 });
  // a thinner echo just inside, a beat behind
  const E = { ...A, R: R0 * 0.8, k: 0.1 };
  const W = 16, WE = 5;
  // the far half sits deeper in the ramp
  const DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5]];
  let t = 0, closed = false, lastU = 0;

  // the smear: thickest just behind the edge, thinning and cooling where the edge passed longer ago
  const body = (p, s, w0, lag, half, rim) => {
    const U = TAU * turn(t - lag), ramp = half < 0 ? DIM : C;
    if (U < 0.02 || t - lag > SW + 0.02) return;
    smear(p, s, 0, U, w0, (u, r, out) => {
      const age = t - lag - passedAt(u / TAU), lead = U - u;
      const w = w0 * Math.pow(clamp(lead / 0.85), 0.5) * (0.3 + 0.7 * Math.exp(-age / 0.075)) * Math.pow(clamp(u / 1.3), 0.7);
      if (w < 0.45) return;
      const q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      // white rim while fresh, then darker steps inward, with age and towards the tail
      const ci = rim && q < 0.26 && age < 0.06 ? 0 : Math.round(q * (n - 1) * 0.7 + age * 13 + (rim ? 0.4 : 1.4));
      out.c = ramp[n - 1 - clamp(ci, 0, n - 1)];
      out.a = Math.min(1, u / 1.1 + 0.2);
    }, half);
  };

  const ring = (p, half) => {
    // the swept smear and its echo
    body(p, E, WE, 0.025, half, false);
    body(p, A, W, 0, half, true);
    if (t < SW + 0.04) glowAlong(p, A, A.R - 5, 0, TAU * turn(t), 14, C[3], (u) => (half < 0 ? 0.2 : 0.3) * Math.exp(-(t - passedAt(u / TAU)) / 0.08), half);
    if (t < SW) return;
    // closed: the ring flares white, swells a little, thins, cools and breaks into dots
    const f = (t - SW) / FLARE, ramp = half < 0 ? DIM : C;
    if (f < 1) {
      const R = A.R + 6 * ease.outCubic(f), th = f < 0.13 ? 9 : Math.max(1, 6 * Math.pow(1 - f, 1.5) + 0.5), S = { ...A, R };
      const step = f < 0.13 ? 6 : f < 0.3 ? 5 : f < 0.55 ? 4 : 3;
      smear(p, S, 0, TAU, th, (u, r, out) => {
        const q = (R - r) / th;
        if (q < 0 || q > 1) return;
        out.c = f < 0.13 ? (q < 0.6 ? WHITE : ramp[5]) : q < 0.45 ? ramp[step] : ramp[step - 1];
        out.a = f < 0.4 ? 1 : 1.3 - f;
      }, half);
      glowAlong(p, S, R - 2, 0, TAU, 14, C[4], 0.32 * (1 - f) * (1 - f), half);
    }
    // a dotted trace of the blade's path lingers where the ring was, fading
    const k = 1 - clamp((t - SW - 0.06) / 0.4);
    if (k > 0) trace(p, A, A.R - 0.5, 0, TAU, ramp[4], (u) => clamp(k * 1.5 - rand(Math.floor(u * 30), 5) * 0.8) * 0.95, half);
  };

  return {
    update(dt) {
      t += dt;
      const U = TAU * turn(t);
      // shavings peel off the edge as it goes round, flung along its path
      if (t < SW) {
        for (let u = lastU; u < U; u += 0.3) {
          const tr = travel(A, u), ox = tr.x - A.cx, oy = tr.y - A.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(40, 120);
          ps.spawn(P.MOTE, tr.x, tr.y, tr.dx * sp + (ox / l) * sp * 0.35, tr.dy * sp * 0.6 - Rg.range(5, 30), Rg.range(0.22, 0.45), C[4 + Rg.int(0, 1)], 0.55, 0, Math.sin(tr.a) < 0 ? PF.BACK : 0);
        }
        lastU = U;
      }
      if (!closed && t >= SW) {
        closed = true;
        lights.add(A.cx, A.cy + 4, 90, C[3], 0.4, 0.4);
        // sparks off the edge where it closes, and all round the ring along its turn
        const end = travel(A, TAU);
        for (let i = 0; i < 9; i++) {
          const a = Math.atan2(end.dy, end.dx) + Rg.range(-0.45, 0.35), sp = Rg.range(160, 360);
          ps.spawn(P.SPARK, end.x, end.y, Math.cos(a) * sp, Math.sin(a) * sp - Rg.range(20, 70), Rg.range(0.14, 0.36));
        }
        for (let i = 0; i < 16; i++) {
          const u = Rg.range(0, TAU), tr = travel(A, u), sp = Rg.range(110, 260);
          ps.spawn(P.SPARK, tr.x, tr.y, tr.dx * sp, tr.dy * sp - Rg.range(20, 80), Rg.range(0.12, 0.32), 0, 1, 0, Math.sin(tr.a) < 0 ? PF.BACK : 0);
        }
        // and twinkles left hanging on the ring
        for (let i = 0; i < 6; i++) {
          const u = Rg.range(0, TAU), [x, y] = onSwing(A, A.R + Rg.range(-1, 3), u);
          ps.spawn(P.STAR, x, y, 0, -Rg.range(2, 8), Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1.2, 2.6), Rg.range(0.04, 0.16), Math.sin(A.a0 + A.dir * u) < 0 ? PF.BACK : 0);
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ring(p, -1);
      ps.draw(p, "back");
    },
    draw(p) {
      ring(p, 1);
      // the blade catches the light as it sets off, and glints again where the ring closes
      if (t < 0.06) {
        const [x, y] = onSwing(A, A.R - 3, 0);
        sparkle(p, x, y, 7 * (1 - t / 0.06), C[5], C[3], 0.5);
      }
      const g = t - SW * 0.85, tip = onSwing(A, A.R - 3, TAU);
      if (g > 0 && g < 0.24) sparkle(p, tip[0], tip[1], 10 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.24), C[5], C[3], 0.6);
      // light rides the edge
      if (t < SW + 0.05) {
        const U = TAU * turn(t), [x, y] = onSwing(A, A.R - 5, U), far = Math.sin(A.a0 + A.dir * U) < 0;
        p.glow(x, y, far ? 26 : 38, C[3], (far ? 0.3 : 0.5) * (1 - smooth(SW - 0.04, SW + 0.05, t)));
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
