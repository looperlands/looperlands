// The shaded smear, its light and the dotted trace follow Sprite Fusion's open-source slash
// (https://www.spritefusion.com/pixel-art-vfx/slash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, clamp, smooth, ease, READY } from "../../core/index.mjs";
import { through, onSwing, travel, smear, trace, glowAlong } from "./_lib.mjs";

export const meta = {
  name: "Claw swipe",
  desc: "Three claw marks rake down one after another, white-hot, cooling through orange to red, then close up from both ends and leave a dotted scar, with hot flecks and drips.",
  tags: ["melee", "claw", "swipe", "beast", "scratch", "combat", "directional", "one-shot"],
  size: [128, 96],
  origin: [36, 84],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#2a0808", "#5c0f12", "#a51d1d", "#e2401f", "#ff8a2a", "#ffd166", "#fff3c4", "#ffffff"],
    sparks: ["#fff3c4", "#ffd166", "#ff8a2a", "#c42a1a"],
    seed: 8,
  },
};

const READY_ = { ...READY, weapon: "claw", offWeapon: "claw", sa: -0.4, sb: -0.9, crouch: 5, lean: 3, fx: 14, fy: -21, bx: 8, by: -25, ffx: 9, fbx: -8 };
const HIGH = { ...READY_, x: -6, crouch: 4, lean: -3, fx: 3, fy: -41, sa: -1.4, bx: 7, by: -18, sb: -0.3, ffx: 10 };
export const act = {
  target: { x: 58 },
  poses: [
    [-0.46, { ...READY_, x: -6 }],
    [-0.2, HIGH],
    [-0.05, { ...HIGH, crouch: 5 }],
    [0, { ...READY_, x: 0, crouch: 3, lean: 4, fx: 19, fy: -36, sa: -0.9, bx: -7, by: -24, ghost: 1 }, "snap"],
    [0.05, { ...READY_, x: 2, crouch: 5, lean: 6, fx: 23, fy: -24, sa: 0.5, bx: -7, by: -24, ffx: 13, fbx: -10, toeB: true }, "snap"],
    [0.1, { ...READY_, x: 3, crouch: 7, lean: 7, fx: 22, fy: -12, sa: 1.2, bx: -7, by: -24, ffx: 13, fbx: -10, toeB: true }, "snap"],
    [0.42, { ...READY_, x: 3, crouch: 6, lean: 5, fx: 21, fy: -13, sa: 1.1, bx: -6, by: -22, ffx: 13, fbx: -10 }],
    [0.9, { ...READY_, x: -6 }],
  ],
  hits: [
    { t: 0.04, stop: 0.03, push: 0.9, straw: 5, y: -30, flash: 0.03 },
    { t: 0.08, stop: 0.03, push: 0.9, straw: 5, y: -26, flash: 0.03 },
    { t: 0.12, stop: 0.08, shake: 0.14, amp: 2, push: 1.4, straw: 9, y: -18 },
  ],
  dust: [{ t: 0.1, x: 12, n: 6, dir: 1 }],
};

const RAKE = 0.05; // each mark tears open
const STAGGER = 0.04;
const CLOSE0 = 0.16, CLOSE = 0.3; // then closes up from both ends

export function create(o) {
  const C = fit(o.palette, 8), n = C.length, Rg = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: Rg, ground: floor, sparks: o.sparks }), drips = new Bits({ ground: floor }), lights = new Lights();
  // three marks raking down and back, each a little lower and further out than the last
  const marks = [0, 1, 2].map((i) => {
    const s = through(31 + i * 8, -23 + i * 2, 1.84, 1, 40, 0.84 - i * 0.05, 0.5);
    return { s, t0: i * STAGGER, W: 4.2 - i * 0.4, open: false, end: travel(s, s.span) };
  });
  let t = 0;
  const heatAt = (m) => clamp(1 - (t - m.t0) / 0.42);
  return {
    update(dt) {
      t += dt;
      for (const m of marks) {
        if (!m.open && t >= m.t0 + RAKE * 0.7) {
          m.open = true;
          lights.add(m.end.x, m.end.y - 6, 34, C[4], 0.45, 0.3);
          // hot flecks thrown on along the rake, and drips running off the wound
          for (let i = 0; i < 7; i++) {
            const a = Math.atan2(m.end.dy, m.end.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(110, 260);
            ps.spawn(P.SPARK, m.end.x, m.end.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.32));
          }
          for (let i = 0; i < 5; i++) {
            const [x, y] = onSwing(m.s, m.s.R, m.s.span * Rg.range(0.15, 0.9));
            ps.spawn(P.MOTE, x, y, Rg.range(-60, -10), Rg.range(-30, 30), Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : C[4], 0.5);
          }
          for (let i = 0; i < 2; i++) {
            const [x, y] = onSwing(m.s, m.s.R - 1, m.s.span * Rg.range(0.35, 0.75));
            drips.add({ kind: B.DRIP, x, y, vx: Rg.range(-8, 8), vy: Rg.range(10, 40), g: 0.55, life: 1.2, c: C[3] });
          }
        }
      }
      drips.update(dt);
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      for (const m of marks) {
        const u = t - m.t0;
        if (u < 0) continue;
        const S = m.s.span, head = S * ease.outExpo(clamp(u / RAKE)), c = smooth(CLOSE0, CLOSE0 + CLOSE, u), lo = (S / 2) * c, hi = Math.min(head, S - (S / 2) * c);
        const heat = heatAt(m);
        if (hi - lo > 0.02) {
          // a lens: sharp at both ends, thickest in the middle; white-hot at the core, cooling outward and with time
          smear(p, m.s, lo, hi, m.W, (uu, r, out) => {
            const v = uu / S, w = m.W * Math.pow(Math.sin(Math.PI * v), 1.15) * (1 - 0.55 * c), off = Math.abs(r - (m.s.R - m.W / 2)) / (w / 2 + 0.01);
            if (w < 0.5 || off > 1) return;
            const ci = Math.round((1 - heat) * 5.2 + off * 1.6 + (head < S ? (S - uu) / S : 0) * 0.5);
            out.c = C[n - 1 - clamp(ci, 0, n - 2)];
          }, 0, 2);
          glowAlong(p, m.s, m.s.R - m.W / 2, lo, hi, 11, C[4], 0.42 * heat * heat, 0, 0.2);
        }
        // where it has closed, a dotted red scar lingers and fades
        const k = 0.8 * (1 - clamp((u - CLOSE0 - CLOSE * 0.5) / 0.4));
        if (c > 0.05 && k > 0) {
          trace(p, m.s, m.s.R - m.W / 2, 0.04 * S, lo, C[2], k);
          trace(p, m.s, m.s.R - m.W / 2, S - lo, 0.96 * S, C[2], k);
        }
        // the claw tip glints as it tears in
        const g = u - RAKE * 0.4;
        if (g > 0 && g < 0.16) sparkle(p, m.end.x, m.end.y, 5 * ease.outBack(Math.min(1, g / 0.04)) * (1 - g / 0.16), C[6], C[4], 0.4);
      }
      drips.draw(p);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
