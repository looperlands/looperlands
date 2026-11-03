// The hop timing, the link shapes that re-strike every other frame, the glowing nodes and the crawling arcs
// follow Sprite Fusion's open-source lightning (https://www.spritefusion.com/pixel-art-vfx/lightning),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, rng, lerp, TAU, WHITE, hex, mix, READY } from "../../core/index.mjs";
import { VOLT, PLASMA, zigzag, bowed, stroke, crackle, trace, scorch } from "./_lib.mjs";

export const meta = {
  name: "Chain lightning",
  desc: "A bolt leaps from the caster's hand through three targets in turn; each flashes, sparks and grounds itself to the floor while the arcs between them flicker, then the chain snaps.",
  tags: ["lightning", "electric", "chain", "spell", "combat", "directional", "one-shot"],
  size: [248, 104],
  origin: [40, 82],
  duration: 1.8,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: VOLT, sparks: PLASMA, seed: 3 },
};

const AIM = { ...READY, x: -6, crouch: 4, lean: 4, fx: 16, fy: -16, bx: -6, by: -23, ffx: 11, fbx: -9 };
const BACK = { ...READY, x: -6, crouch: 4, lean: -3, fx: -5, fy: -32, bx: 8, by: -24, armsFront: true, ffx: 9, fbx: -7 };
const zap = (at, t, stop = 0.03) => ({ t, at, stop, push: 1.2, straw: 6, skin: "shock", shiver: 0.7, y: -22 });
export const act = {
  targets: [{ x: 58 }, { x: 104 }, { x: 150 }],
  poses: [
    [-0.46, { ...READY, x: -6 }],
    [-0.22, BACK],
    [0, { ...BACK, crouch: 5 }],
    [0.04, AIM, "snap"],
    [0.7, { ...AIM, crouch: 3 }],
    [1.35, { ...AIM, crouch: 3, fy: -18 }],
    [1.8, { ...READY, x: -6 }],
  ],
  hits: [
    zap(0, 0.05),
    zap(1, 0.14),
    { ...zap(2, 0.23, 0.07), shake: 0.14, amp: 1 },
    { t: 1.35, push: 0, straw: 0, flash: 0, skin: null },
  ],
};

const HAND = [10, -16], HOPS = [[58, -22], [104, -30], [150, -19]];
const WIND = 0.12, LEAP = 0.05, GAP = 0.075, HOLD = 0.78, BREAK = 0.16, ASH = hex("#5b5566");
const on = (i) => WIND + i * GAP + LEAP; // when link i lands on its target
const off = (i) => HOLD + i * 0.05; // when it starts to give out

// a link's strength: a hard first flash, a restless hum, then it stutters out
function level(i, t) {
  const a = t - on(i);
  if (a < 0) return 0;
  const hum = a < 0.1 ? [1, 0.55, 1][Math.floor(a * 30)] ?? 1 : 0.78 + 0.22 * Math.sin(t * 61 + i) * Math.sin(t * 23 + i * 2);
  const b = t - off(i);
  return b < 0 ? hum : b < BREAK ? hum * (1 - b / BREAK) * (Math.floor(b * 60) % 3 === 1 ? 0.5 : 1) : 0;
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), hot = new Particles({ rng: R, ground: floor }), lights = new Lights();
  const pts = [HAND, ...HOPS], hit = HOPS.map(() => false), popped = HOPS.map(() => false);
  // where each target grounds itself: a spot on the floor below it
  const ground = HOPS.map(([x]) => x + R.range(-5, 5));
  let t = 0;
  const shape = (i, f, salt = 0) => {
    const r = rng(o.seed, 31 + salt, i, f), [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
    return bowed(r, x0, y0, x1, y1, -L * r.range(0.05, 0.15), 0.2, 0.08);
  };
  return {
    update(dt) {
      t += dt;
      // the charge gathers at the hand
      if (t < WIND && R.chance(70 * dt)) {
        const a = R.range(0, TAU), d = R.range(10, 24), T = R.range(0.06, 0.1), v = (d * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, HAND[0] + Math.cos(a) * d, HAND[1] + Math.sin(a) * d, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[6] : C[5]);
      }
      for (const [i, [x, y]] of HOPS.entries()) {
        if (!hit[i] && t >= on(i)) {
          hit[i] = true;
          const [px, py] = pts[i], dir = Math.atan2(y - py, x - px);
          lights.add(x, y, 56, C[4], 0.85, 0.22);
          lights.add(x, y, 16, WHITE, 0.7, 0.08);
          if (i === 0) lights.add(HAND[0], HAND[1], 40, C[4], 0.6, 0.15);
          for (let j = 0; j < 18; j++) {
            const a = R.chance(0.6) ? dir + R.range(-1.1, 1.1) : R.range(0, TAU), sp = R.range(70, 230);
            ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.4));
          }
          for (let j = 0; j < 5; j++) hot.spawn(P.SPARK, x + R.range(-2, 2), y + 2, R.range(-50, 50), R.range(-60, 20), R.range(0.5, 0.9));
          ps.spawn(P.STAR, x + R.range(-4, 4), y - R.range(3, 7), 0, -6, R.range(0.25, 0.4), C[6], R.range(1.5, 2.5));
          for (let j = 0; j < 2; j++) ps.spawn(P.SMOKE, x + R.range(-4, 4), y + R.range(-2, 3), R.range(-6, 6), -R.range(8, 16), R.range(0.7, 1), mix(ASH, C[2], 0.35), R.range(2, 3.5), R.range(0.1, 0.25));
        }
        // while the chain holds: sparks shed off the links, spit from the floor where each target grounds
        if (hit[i] && t < off(i)) {
          if (R.chance(9 * dt)) {
            const u = R.next(), [x0, y0] = pts[i];
            ps.spawn(P.SPARK, lerp(x0, x, u), lerp(y0, y, u) - 2, R.range(-60, 60), R.range(-90, 20), R.range(0.1, 0.25));
          }
          if (R.chance(7 * dt)) ps.spawn(P.SPARK, ground[i], -1, R.range(-70, 70), -R.range(40, 140), R.range(0.12, 0.3));
          if (R.chance(2 * dt)) hot.spawn(P.SPARK, x + R.range(-3, 3), y + 3, R.range(-30, 30), R.range(-30, 10), R.range(0.5, 0.8));
        }
        // when it gives out, the target pops once more and smokes
        if (!popped[i] && t >= off(i) + BREAK) {
          popped[i] = true;
          for (let j = 0; j < 7; j++) {
            const a = R.range(0, TAU), sp = R.range(40, 140);
            ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.12, 0.3));
          }
          ps.spawn(P.SMOKE, x, y, R.range(-4, 4), -R.range(10, 16), R.range(0.55, 0.7), mix(ASH, C[2], 0.35), R.range(2.5, 3.5));
          lights.add(x, y, 30, C[4], 0.5, 0.12);
        }
      }
      ps.update(dt);
      hot.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the floor scorches where the targets ground themselves
      for (const [i] of HOPS.entries()) {
        const a = t - on(i);
        if (a < 0) continue;
        const T0 = Math.min(1, a / 0.2) * Math.pow(clamp(1 - (t - off(i)) / 0.7), 1.3) * 0.9;
        scorch(p, ground[i], 0, 7, T0, 1 - smooth(1.35, 1.75, t));
      }
      ps.draw(p, "back");
      hot.draw(p, "back");
    },
    draw(p) {
      const f = Math.floor(t * 30 + 1e-4), f2 = f >> 1;
      // the hand: a node that swells while the charge gathers and holds the chain
      const kh = t < WIND ? t / WIND : level(0, t);
      if (kh > 0.02) {
        const r = (1.2 + 1.6 * kh + Math.sin(t * 53) * 0.4) * Math.min(1, kh * 1.5);
        p.circle(HAND[0], HAND[1], r + 1.2, C[4]);
        p.circle(HAND[0], HAND[1], r, C[6]);
        p.circle(HAND[0], HAND[1], r * 0.5, WHITE);
        p.glow(HAND[0], HAND[1], 18, C[4], 0.6 * kh);
        if (t > WIND * 0.5) {
          const r2 = rng(o.seed, 5, f), a = r2.range(0, TAU), d = r2.range(4, 8);
          crackle(p, zigzag(r2, HAND[0], HAND[1], HAND[0] + Math.cos(a) * d, HAND[1] + Math.sin(a) * d, 0.4, 0.3), 0.6 * kh, C, 0.3);
        }
      }
      for (const [i, [x, y]] of HOPS.entries()) {
        const t0 = WIND + i * GAP, [x0, y0] = pts[i];
        // the leap: the bolt races out from the last node with a hot head
        if (t >= t0 && t < on(i)) {
          const u = ease.outQuad((t - t0) / LEAP), b = shape(i, -1), trunk = { paths: [b.paths[0]] };
          stroke(p, trunk, 1, C, 0.75, { upTo: u });
          const tp = b.paths[0].pts, [hx, hy] = tp[Math.min(tp.length - 1, Math.floor(u * (tp.length - 1)))];
          p.circle(hx, hy, 2, WHITE);
          p.glow(hx, hy, 16, C[5], 0.7);
        }
        const k = level(i, t);
        if (k > 0) {
          stroke(p, shape(i, f2), k, C, 0.75);
        } else if (t >= off(i) + BREAK && t < off(i) + BREAK + 0.35) {
          // the spent channel: a dotted trace that cools and goes
          const g = 1 - (t - off(i) - BREAK) / 0.35, b = shape(i, Math.floor((off(i) + BREAK) * 15));
          trace(p, b.paths[0].pts, g > 0.5 ? C[4] : C[2], g * 0.9);
        }
        // the target: a flash as the bolt lands, then a node with arcs crawling over it and down to the floor
        const a = t - on(i);
        if (a >= 0 && a < 0.09) {
          const q = a / 0.09;
          p.circle(x, y, 6 * (1 - q) + 1.5, C[5]);
          p.circle(x, y, 5 * (1 - q), WHITE);
          sparkle(p, x, y, Math.round(10 * (1 - q)), C[6], C[4], 0.6);
        }
        if (k > 0.05) {
          const r = (2.6 + Math.sin(t * 47 + i) * 0.7) * k;
          p.circle(x, y, r + 1.5, C[2]);
          p.circle(x, y, r + 0.7, C[5]);
          p.circle(x, y, r * 0.6, WHITE);
          p.glow(x, y, 26, C[4], 0.6 * k);
          p.glow(x, y, 8, C[6], 0.5 * k);
          // arcs crawl over the target as if over a body caught in the current
          const r2 = rng(o.seed, 11, i, f);
          for (let j = 0; j < (t - on(i) < 0.12 ? 2 : 1); j++) {
            const a0 = r2.range(0, TAU), a1 = a0 + r2.sign() * r2.range(0.5, 1), d0 = r2.range(4, 6), d1 = r2.range(5, 8);
            crackle(p, zigzag(r2, x + Math.cos(a0) * d0, y + Math.sin(a0) * d0, x + Math.cos(a1) * d1, y + Math.sin(a1) * d1, 0.35, 0), r2.range(0.45, 0.7) * k, C, 0.25);
          }
          if (r2.next() < 0.3 * k) {
            const gx = ground[i] + r2.range(-3, 3);
            crackle(p, zigzag(r2, x + r2.range(-2, 2), y + 3, gx, -0.5, 0.3, 0.35), 0.75 * k, C, 0.35);
            p.glow(gx, -1, 12, C[5], 0.5 * k);
            p.px(gx, -1, WHITE);
          }
        }
      }
      ps.draw(p, "front");
      hot.draw(p, "front");
      lights.draw(p);
    },
  };
}
