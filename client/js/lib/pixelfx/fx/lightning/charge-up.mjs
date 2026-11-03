// The charge (streaks spiralling in, a core that swells with an accelerating pulse, little arcs spitting off
// it) and the release (flash, rings, a spray of motes and stars) follow Sprite Fusion's open-source energy charge
// (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, flare, sparkle, clamp, smooth, ease, rng, TAU, WHITE, hex, mix, READY } from "../../core/index.mjs";
import { VOLT, PLASMA, zigzag, stroke, crackle } from "./_lib.mjs";

export const meta = {
  name: "Charge up",
  desc: "Sparks streak and arcs whip in to a crackling core at the caster's hand that swells and pulses faster, then it flashes and bursts: bolts every way, a ring, a spray of sparks.",
  tags: ["lightning", "electric", "charge", "spell", "power-up", "actor", "one-shot"],
  size: [272, 184],
  origin: [124, 148],
  duration: 2.7,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: VOLT, sparks: PLASMA, charge: 1.6, seed: 4 },
};

const HOLD = { ...READY, crouch: 3, lean: -2, fx: 15, fy: -21, bx: 9, by: -17, ffx: 9, fbx: -7 };
const BURST = { turn: 1.15, y: -2, crouch: 0, lean: -2, fx: -13, fy: -37, bx: 14, by: -36, ffx: -2, ffy: -6, fbx: 3, fby: -6 };
export const act = {
  onBody: true,
  follow: 0,
  poses: [
    [-0.36, READY],
    [0, HOLD],
    [0.8, { ...HOLD, crouch: 4 }],
    [1.4, { ...HOLD, crouch: 6, lean: 0 }],
    [1.59, { ...HOLD, crouch: 7, lean: 0 }],
    [1.6, BURST, "snap"],
    [1.95, { ...BURST, y: 0, crouch: 2, fy: -30, by: -30, ffy: -4, fby: -4 }],
    [2.7, READY],
  ],
  hits: [{ t: 1.6, stop: 0.14, shake: 0.3, amp: 3 }],
  dust: [{ t: 1.6, x: 10, n: 6, dir: 1 }, { t: 1.6, x: -10, n: 6, dir: -1 }],
};

const CX = 15, CY = -21, BK = [1, 0.7, 0.95, 0.5, 0.8, 0.35], ASH = hex("#5b5566");
const edges = new WeakMap();
function edgeOf(A) {
  let e = edges.get(A.mask);
  if (e) return e;
  const m = A.mask, on = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.data[y * m.w + x];
  e = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))) e.push([A.x + x, A.y + y]);
  edges.set(A.mask, e);
  return e;
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), REL = o.charge, floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), lights = new Lights();
  const bolts = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * TAU + R.range(-0.25, 0.25), L = R.range(44, 72), x1 = CX + Math.cos(a) * L, y1 = Math.min(0, CY + Math.sin(a) * L);
    return { x1, y1, t0: REL + R.range(0, 0.05) };
  });
  const arcs = [];
  let t = 0, released = false, phase = 0, beats = [];
  const level = () => clamp(t / REL);
  return {
    update(dt) {
      t += dt;
      const k = level(), e = k * k;
      if (t < REL) {
        // energy rushes in: long streaks spiralling in from all round, more and more of them
        for (let acc = (60 + 360 * e) * dt; acc > 0; acc--) {
          if (acc < 1 && !R.chance(acc)) break;
          const a = R.range(0, TAU), d = R.range(30, 72) * (1 - 0.35 * k), life = R.range(0.16, 0.26), sp = (d / life) * 0.95;
          ps.spawn(P.MOTE, CX + Math.cos(a) * d, Math.min(-2, CY + Math.sin(a) * d), -Math.cos(a) * sp - Math.sin(a) * sp * 0.4, -Math.sin(a) * sp + Math.cos(a) * sp * 0.4, life, R.pick([C[7], C[6], C[5]]), 1);
        }
        // arcs whip in from the air, more and more of them
        if (k > 0.2 && R.chance((2 + 16 * e) * dt)) {
          const a = R.range(0, TAU), d = R.range(20, 40);
          arcs.push({ x: CX + Math.cos(a) * d, y: Math.min(-3, CY + Math.sin(a) * d), t, seed: R.int(0, 1e6) });
        }
        // the pulse quickens
        phase += (1.5 + 11 * e) * dt;
        if (phase >= 1) (phase -= 1), beats.push(t);
        if (R.chance(4 * e * dt)) ps.spawn(P.STAR, CX + R.range(-14, 14), CY + R.range(-14, 10), 0, -4, R.range(0.2, 0.35), C[6], R.range(1, 2));
      } else if (!released) {
        released = true;
        lights.add(CX, CY, 110, C[4], 0.8, 0.5);
        lights.add(CX, CY, 28, WHITE, 0.6, 0.08);
        for (let i = 0; i < 70; i++) {
          const a = R.range(0, TAU), sp = R.range(140, 330) * (Math.sin(a) > 0.4 ? 0.55 : 1);
          ps.spawn(Math.sin(a) < -0.2 && R.chance(0.35) ? P.MOTE : P.SPARK, CX, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.55), R.pick([C[7], C[6], C[5]]), R.range(0.8, 1.4));
        }
        for (let i = 0; i < 10; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 160);
          ps.spawn(P.STAR, CX, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.4, 0.8), R.chance(0.5) ? C[6] : C[5], R.range(1.2, 2.4));
        }
        for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, CX + R.range(-5, 5), CY + R.range(-4, 4), R.range(-12, 12), -R.range(8, 18), R.range(0.6, 0.85), mix(ASH, C[4], 0.3), R.range(3, 5), R.range(0.05, 0.15));
      }
      beats = beats.filter((b) => t - b < 0.22);
      for (let i = arcs.length - 1; i >= 0; i--) if (t - arcs[i].t > 0.07) arcs.splice(i, 1);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const k = level();
      if (t < REL) p.glow(CX * 0.5, -3, 40, C[3], 0.3 * k * k);
      ps.draw(p, "back");
    },
    draw(p) {
      const k = level(), e = k * k, f = Math.floor(t * 30 + 1e-4), A = o.actor;
      if (t < REL) {
        const jit = k > 0.85 ? (f % 2 ? 1 : -1) * ((k - 0.85) / 0.15) : 0, x = CX + jit, y = CY, pr = 0.5 + 0.5 * Math.sin(phase * TAU);
        // the body catches the core's light along its near edge
        for (const [ex, ey] of edgeOf(A)) {
          const d = Math.hypot(ex + 0.5 - x, ey + 0.5 - y);
          if (d < 6 + 10 * k && e > 0.08) p.px(ex, ey, d < 4 + 6 * k && e > 0.4 ? C[6] : C[4]);
        }
        // rings fall inward to the core on every beat
        for (const b of beats) {
          const q = (t - b) / 0.22;
          p.ring(x, y, 4 + 20 * (1 - ease.inQuad(q)) * (0.5 + k), 1, q > 0.6 ? C[6] : C[4], 0.4 + 0.6 * q);
        }
        // arcs whipping in to the core
        for (const a of arcs) crackle(p, zigzag(rng(a.seed, f), a.x, a.y, x, y, 0.35, 0.4), 0.85, C, 0.4);
        // the core: swelling, layered, with arcs racing round its skin
        const r = 1.2 + 6.5 * e + pr * (0.5 + 1.2 * k);
        p.circle(x, y, r + 1.3, C[2]);
        p.circle(x, y, r, C[4]);
        p.circle(x - r * 0.12, y - r * 0.12, r * 0.7, C[5]);
        p.circle(x, y, r * 0.38, WHITE);
        if (r > 3)
          for (const s of [0, Math.PI])
            for (let a = 0; a < 1.3; a += 0.12) {
              const ang = t * 10 + s + a, rr = r * (0.62 + 0.1 * Math.sin(a * 3));
              p.dot(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, a < 0.5 ? WHITE : C[6]);
            }
        if (k > 0.35) {
          const q = rng(o.seed, 5, f), a = q.range(0, TAU), l = q.range(3, 6) * (0.5 + k);
          crackle(p, zigzag(q, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r + l), y + Math.sin(a) * (r + l), 0.4, 0.3), 0.7, C, 0.3);
        }
        p.glow(x, y, 12 + 30 * k, C[4], 0.35 + 0.45 * k);
        p.glow(x, y, 6 + 6 * k, C[6], 0.25 + 0.3 * k);
      } else {
        const a = t - REL;
        // the release: the caster flashed white, a flare, a white core blown open
        if (a < 0.07) p.mask(A.mask, A.x, A.y, a < 0.035 ? WHITE : C[6]);
        if (a < 0.22) {
          const q = a / 0.22;
          flare(p, CX, CY, 46 * Math.pow(1 - q, 1.4), 1 - q, C);
          if (q < 0.3) p.circle(CX, CY, 12 * (1 - q * 2.5) + 1.5, WHITE);
        }
        // bolts every way, struck and flickering
        for (const [i, b] of bolts.entries()) {
          const ba = Math.floor((t - b.t0) * 30 + 1e-4);
          if (t < b.t0 || ba >= BK.length) continue;
          stroke(p, zigzag(rng(o.seed, 3, i, ba >> 1), CX, CY, b.x1, b.y1, 0.25, 0.75), BK[ba], C, ba === 0 ? 0.95 : 0.75, { hero: ba === 0 });
          if (b.y1 > -1) p.glow(b.x1, -3, 18, C[5], 0.5 * BK[ba]);
        }
        // a ring bursting out with a fainter echo inside it
        const q = a / 0.45;
        if (q < 1) {
          const r = 8 + 80 * ease.outCubic(q), hide = (rr) => (v, g) => (CY + Math.sin(g) * rr > -1 ? 0 : 1.1 - q);
          p.ring(CX, CY, r, Math.max(1, 3 * (1 - q)), q < 0.25 ? WHITE : C[5], hide(r));
          const r2 = 6 + 56 * ease.outCubic(Math.min(1, q * 1.3));
          p.ring(CX, CY, r2, 1, C[4], (v, g) => (CY + Math.sin(g) * r2 > -1 ? 0 : 0.8 - q));
          p.glow(CX, CY - 6, Math.min(r * 0.9, 46), C[3], 0.42 * (1 - q) * (1 - q));
        }
        // the charge bleeds off in a few last crackles at the hand
        if (a > 0.15 && a < 0.5) {
          const qq = rng(o.seed, 8, f), ang = qq.range(0, TAU), l = qq.range(5, 10);
          crackle(p, zigzag(qq, CX, CY, CX + Math.cos(ang) * l, CY + Math.sin(ang) * l, 0.45, 0.3), 0.8 * (1 - (a - 0.15) / 0.35) + 0.15, C, 0.3);
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
