// The release (a white disc, a cross, two rings, a big light and a spray of motes and stars) is adapted from
// Sprite Fusion's open-source energy charge (https://www.spritefusion.com/pixel-art-vfx/energy),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, PAL, fit, flare, sparkle, clamp, ease, TAU, WHITE } from "../../core/index.mjs";
import { sigil } from "./_lib.mjs";

const CY = -28, GATHER = 0.22, N = 9;

export const meta = {
  name: "Mana burst",
  desc: "Energy rushes into a point and blows out in a white flash and rings, flinging glowing runes that flare and pop into sparks one after another.",
  tags: ["arcane", "burst", "mana", "rune", "nova", "magic", "ground", "one-shot"],
  size: [208, 150],
  origin: [104, 124],
  duration: 1.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: PAL.arcane, seed: 9 },
};

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  // the runes: flung out round the burst, slowing hard, bobbing while they burn, each popping in its turn
  const runes = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * TAU + R.range(-0.25, 0.25) - Math.PI / 2, sp = R.range(150, 210);
    // thrown less far downward, so the low ones stay clear of the floor
    return { g: i, x: 0, y: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (Math.sin(a) > 0 ? 0.42 : 0.85), pop: GATHER + 0.42 + i * 0.065 + R.range(0, 0.05), popped: false, ph: R.range(0, TAU) };
  });
  const pops = [];
  let t = 0, released = false;

  return {
    update(dt) {
      t += dt;
      if (t < GATHER - 0.03) {
        // the gather: streaks rush in from all round
        for (let i = 0; i < 2; i++) {
          const a = R.range(0, TAU), D = R.range(24, 52), T = R.range(0.12, 0.18), v = (D * 3) / (Math.exp(3 * T) - 1);
          const x = Math.cos(a) * D, y = Math.min(-2, CY + Math.sin(a) * D * 0.85), l = Math.hypot(x, y - CY) || 1;
          ps.spawn(P.STREAK, x, y, (-x / l) * v, ((CY - y) / l) * v, T, R.chance(0.5) ? C[6] : C[5]);
        }
      }
      if (t >= GATHER && !released) {
        released = true;
        lights.add(0, CY - 12, 96, C[5], 1, 0.5);
        lights.add(0, CY, 40, WHITE, 0.9, 0.1);
        // a spray of motes and stars, thrown less hard at the floor
        for (let i = 0; i < 96; i++) {
          const a = R.range(0, TAU), sp = R.range(100, 250), dn = Math.sin(a) > 0 ? 0.45 : 1;
          ps.spawn(R.chance(0.65) ? P.MOTE : P.STAR, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp * dn, R.range(0.25, 0.55), R.pick([WHITE, C[6], C[5]]), R.range(0.8, 1.8));
        }
        for (let i = 0; i < 20; i++) {
          const a = R.range(0, TAU), sp = R.range(130, 280);
          ps.spawn(P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.45));
        }
      }
      if (released)
        for (const r of runes) {
          if (r.popped) continue;
          r.vx -= r.vx * 4.2 * dt;
          r.vy -= r.vy * 4.2 * dt + 8 * dt;
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          if (R.chance(0.35)) ps.spawn(P.MOTE, r.x + R.range(-1.5, 1.5), r.y, r.vx * 0.2 + R.range(-10, 10), r.vy * 0.2 - R.range(5, 25), R.range(0.2, 0.4), C[5], 0.5);
          if (t >= r.pop) {
            r.popped = true;
            pops.push({ t, x: r.x, y: r.y });
            lights.add(r.x, r.y, 34, C[5], 0.9, 0.22);
            lights.add(r.x, r.y, 12, WHITE, 0.8, 0.06);
            for (let i = 0; i < 9; i++) {
              const a = R.range(0, TAU), sp = R.range(70, 200);
              ps.spawn(P.SPARK, r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.4));
            }
            for (let i = 0; i < 5; i++) {
              const a = R.range(0, TAU), sp = R.range(20, 80);
              ps.spawn(i % 2 ? P.STAR : P.MOTE, r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.3, 0.6), R.pick([WHITE, C[6]]), R.range(0.8, 1.6));
            }
          }
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the floor beneath catches the burst
      const k = t < GATHER ? 0.4 * (t / GATHER) : Math.max(0, 1 - (t - GATHER) / 1.1);
      if (k > 0) p.glow(0, -1, 50, C[4], 0.3 * k);
    },
    draw(p) {
      if (t < GATHER) {
        // the point it gathers into: a swelling ball with a white heart
        const k = t / GATHER, r = 1 + 3.5 * k * k;
        p.circle(0, CY, r + 1.2, C[4]);
        p.circle(0, CY, r, C[6]);
        p.circle(0, CY, r * 0.5, WHITE);
        p.glow(0, CY, 10 + 20 * k, C[5], 0.4 + 0.4 * k);
        const q = clamp((t - GATHER * 0.35) / (GATHER * 0.65));
        if (q > 0 && q < 1) p.ring(0, CY, r + 2 + 16 * (1 - ease.outCubic(q)), 1, q > 0.6 ? WHITE : C[6], 1 - q * 0.5);
      } else {
        const q = (t - GATHER) / 0.6;
        if (q < 1) {
          const e = ease.outCubic(q);
          if (q < 0.12) {
            p.circle(0, CY, 12 * (1 - q / 0.12) + 2, C[5]);
            p.circle(0, CY, 12 * (1 - q / 0.12), WHITE);
          }
          if (q < 0.32) flare(p, 0, CY, 30 * (1 - q / 0.32) + 4, 1 - q / 0.32, C);
          // the rings, cut off where they meet the floor
          p.ring(0, CY, 4 + 62 * e, Math.max(1, 5 * (1 - q)), q < 0.2 ? WHITE : C[6], (v, ang) => (CY + Math.sin(ang) * (4 + 62 * e) > 0 ? 0 : 1.2 - q));
          p.ring(0, CY, 2 + 38 * ease.outCubic(Math.min(1, q * 1.4)), Math.max(1, 2 * (1 - q)), C[5], (v, ang) => (CY + Math.sin(ang) * 40 > 0 ? 0 : 1 - q));
          p.glow(0, CY, 60 * (0.4 + 0.6 * e), C[5], 0.9 * (1 - q));
        }
      }
      // the runes: white as they fly, settling to lilac, flaring white just before they pop
      for (const r of runes) {
        if (!released || r.popped) continue;
        const left = r.pop - t, hot = t - GATHER < 0.08 || left < 0.06, bob = Math.sin(t * 9 + r.ph) * 0.6;
        sigil(p, r.g, r.x, r.y + bob, hot ? WHITE : C[6], 1, hot ? C[4] : C[3]);
        p.glow(r.x, r.y + bob, 10, C[5], hot ? 0.7 : 0.35);
        if (left < 0.06) sparkle(p, r.x, r.y + bob, 3 + 4 * (1 - left / 0.06), C[6], C[5], 0.5);
      }
      // each pop: a small flare and a ring
      for (const q of pops) {
        const k = (t - q.t) / 0.32;
        if (k >= 1) continue;
        if (k < 0.35) flare(p, q.x, q.y, 11 * (1 - k / 0.35) + 2, 1 - k / 0.35, C);
        p.ring(q.x, q.y, 2 + 11 * ease.outCubic(k), Math.max(1, 2 * (1 - k)), k < 0.3 ? WHITE : C[6], 1.15 - k);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
