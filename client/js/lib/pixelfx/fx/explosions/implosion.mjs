// The gathering streaks, the pulse rings and the release (cross flare, rings, light) are adapted from Sprite Fusion's
// open-source energy charge (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, TAU, WHITE, hex, mix } from "../../core/index.mjs";
import { cull } from "./_lib.mjs";

export const meta = {
  name: "Implosion",
  desc: "Everything is sucked in: streaks and grit rush inward, rings contract and a dark sphere collapses onto a crushed white point; a beat of stillness, then a sharp pop.",
  tags: ["implosion", "energy", "magic", "collapse", "pop", "one-shot"],
  size: [208, 184],
  origin: [104, 92],
  duration: 1.65,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a0614", "#1c1236", "#3a2470", "#6a44c0", "#a080f0", "#d8c8ff", "#ffffff"], seed: 2 },
};

const SUCK = 0.8, STILL = 1.02, VOID = hex("#05040a");

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [C[6], C[5], C[4], C[3]] }), lights = new Lights();
  // grit pulled in: specks that spiral toward the middle, faster and faster
  const grit = Array.from({ length: 70 }, () => {
    const t0 = R.range(0, 0.4);
    return { a: R.range(0, TAU), d: R.range(40, 86), t0, T: R.range(0.3, SUCK - 0.04 - t0), spin: R.sign() * R.range(0.6, 1.6), c: R.pick([C[2], C[3], C[4], hex("#4a4458"), hex("#6e6880")]) };
  });
  const rays = Array.from({ length: 4 }, (_, i) => (i * TAU) / 4 + Math.PI / 4);
  let t = 0, popped = false;
  return {
    update(dt) {
      t += dt;
      if (t < SUCK - 0.26) {
        // streaks of light rushing in from all round, accelerating, more of them as it goes
        const k = t / SUCK;
        for (let n = 0; n < 1 + Math.floor(k * 4); n++) {
          if (!R.chance(0.9)) continue;
          const a = R.range(0, TAU), D = R.range(34, 82) * (1 - 0.3 * k), T = R.range(0.14, 0.24), v = (D * 3) / (Math.exp(3 * T) - 1);
          ps.spawn(P.STREAK, Math.cos(a) * D, Math.sin(a) * D, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[5] : C[4]);
        }
        // vapour drawn in along the way
        if (R.chance(14 * dt)) {
          const a = R.range(0, TAU), D = R.range(50, 80);
          ps.spawn(P.VAPOUR, Math.cos(a) * D, Math.sin(a) * D, -Math.cos(a) * 90, -Math.sin(a) * 90, R.range(0.4, 0.6), C[3], R.range(3, 5));
        }
      }
      if (!popped && t >= STILL) {
        popped = true;
        lights.add(0, 0, 90, C[4], 1, 0.4);
        lights.add(0, 0, 30, WHITE, 0.9, 0.08);
        for (let i = 0; i < 34; i++) {
          const a = R.range(0, TAU), sp = R.range(120, 330);
          ps.spawn(R.chance(0.6) ? P.MOTE : P.STAR, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.45), R.pick([C[6], C[5], C[4]]), R.range(0.8, 1.8));
        }
      }
      ps.update(dt);
      cull(ps, -meta.origin[0] + 3, -meta.origin[1] + 3, meta.size[0] - meta.origin[0] - 3, meta.size[1] - meta.origin[1] - 3);
      lights.update(dt);
    },
    draw(p) {
      const k = clamp(t / SUCK);
      if (t < STILL) {
        // the void: a dark sphere edged with light, collapsing onto the core
        const vr = 64 * (1 - ease.inCubic(k)) + 3;
        if (k < 1) {
          p.disc(0, 0, vr, VOID, 0.35 + 0.35 * k);
          p.ring(0, 0, vr + 1, 1, k < 0.5 ? C[3] : C[4], 0.5 + 0.5 * k);
          p.glowRing(0, 0, vr, 5, C[4], 0.18 + 0.3 * k);
        }
        // rings pulled in after it, one after another, brighter as they go
        for (let i = 0; i < 4; i++) {
          const u = (t - i * 0.17) / 0.34;
          if (u <= 0 || u >= 1) continue;
          const r = (70 - i * 8) * (1 - ease.inQuad(u)) + 2;
          p.ring(0, 0, r, u > 0.7 ? 2 : 1, u > 0.6 ? C[5] : C[3], 0.4 + 0.6 * u);
        }
        // the grit, spiralling in
        for (const q of grit) {
          const u = (t - q.t0) / q.T;
          if (u <= 0 || u >= 1) continue;
          const d = q.d * (1 - ease.inCubic(u)), a = q.a + q.spin * ease.inQuad(u) * 2, x = Math.cos(a) * d, y = Math.sin(a) * d;
          const x2 = Math.cos(a - q.spin * 0.1) * (d + 4 * u * u + 0.5), y2 = Math.sin(a - q.spin * 0.1) * (d + 4 * u * u + 0.5);
          p.line(x2, y2, x, y, (v) => (v < 0.5 ? mix(q.c, VOID, 0.4) : q.c));
        }
        // the core: growing hotter as it's crushed, then a white point trembling in the stillness
        const still = t > SUCK, jit = still ? (Math.floor(t * 40) % 2 ? 0.5 : -0.5) : 0, cr = still ? 1.6 : 1 + 3.5 * (1 - k) * k * 4;
        p.disc(jit, 0, cr + 3.5, VOID, 0.85);
        p.circle(jit, 0, cr + 1.2, C[4]);
        p.circle(jit, 0, cr, WHITE);
        p.glow(0, 0, 10 + 26 * k, C[4], 0.3 + 0.5 * k);
        if (still) p.glow(0, 0, 8, WHITE, 0.4 + 0.2 * Math.sin(t * 60));
      } else {
        // the pop: a white point bursting, a cross flare, a fast thin ring and a slower one
        const q = (t - STILL) / 0.5, e = ease.outCubic(clamp(q));
        if (q < 0.08) p.circle(0, 0, 6 * (1 - q / 0.08) + 1, WHITE);
        if (q < 0.35) {
          const L = (1 - q / 0.35) * 34 + 3;
          for (const a of rays) for (let d = 0; d <= L; d += 0.5) p.dot(Math.cos(a) * d, Math.sin(a) * d, d < L * 0.4 ? WHITE : C[5], d < L * 0.7 ? 1 : 1 - (d / L - 0.7) / 0.3);
          for (const a of rays) for (let d = 0; d <= L * 0.45; d += 0.5) p.dot(Math.cos(a + Math.PI / 4) * d, Math.sin(a + Math.PI / 4) * d, C[5], 1 - d / (L * 0.45));
        }
        if (q < 1) {
          p.ring(0, 0, 4 + 74 * e, Math.max(1, 2.5 * (1 - q)), q < 0.2 ? WHITE : C[5], 1.15 - q);
          p.ring(0, 0, 2 + 40 * ease.outCubic(clamp(q * 1.4)), 1, C[4], 1 - q);
        }
        if (q < 0.6) sparkle(p, 0, 0, 5 * (1 - q / 0.6), WHITE, C[5], 0.6);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
