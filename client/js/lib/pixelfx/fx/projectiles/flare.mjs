// The spark, star and light recipes are adapted from Sprite Fusion's open-source explosion and sparkle
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, mix, clamp, smooth, ease, rand, sparkle, flare as rays, TAU, WHITE } from "../../core/index.mjs";
import { cloud, Smoke } from "./_lib.mjs";

export const meta = {
  name: "Signal flare",
  desc: "A signal flare streaks up off the ground trailing sparks and smoke, bursts, and hangs as a pulsing red star that drips sparks under its own red-lit smoke, then gutters out.",
  tags: ["projectile", "flare", "signal", "fire", "smoke", "light", "one-shot"],
  size: [152, 232],
  origin: [76, 226],
  duration: 5,
  loop: false,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#2a0610", "#5c0d1c", "#9a1428", "#d8243a", "#ff4d5e", "#ff8a94", "#ffd0d4", "#ffffff"],
    smoke: ["#1e1a26", "#2e2938", "#433d4d", "#5b5466", "#77707f", "#958e9c", "#b3acb9"],
    height: 150,
    seed: 2,
  },
};

const RISE = 0.85, BURN = 3.1;

export function create(o) {
  const C = fit(o.palette, 8), SM = fit(o.smoke, 7), H = o.height, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[4], C[2]] }), smoke = new Smoke(R), lights = new Lights();
  const WR = [C[0], C[1], mix(C[2], SM[2], 0.45), mix(C[3], SM[3], 0.35), C[4], C[5], C[6]];
  // the rise: fast off the ground, slowing to the top; then the star hangs, sways and sinks slowly
  const rise = (t) => [Math.sin(t * 3) * 2 * (t / RISE), -H * ease.outCubic(clamp(t / RISE))];
  const star = (t) => {
    const u = t - RISE;
    return [Math.sin(u * 1.6) * 3 + rise(RISE)[0], -H + u * 9 + Math.sin(u * 2.3) * 1.5];
  };
  let t = 0, burst = false, emit = 0, drip = 0;
  lights.add(0, -3, 26, C[4], 0.8, 0.25);
  for (let i = 0; i < 5; i++) smoke.add({ x: R.range(-3, 3), y: -2, vx: R.range(-25, 25), vy: -R.range(5, 20), r0: 2, r1: R.range(4, 6), life: R.range(1, 1.6), a: 0.5, warm: 0.8, rise: 6 });
  return {
    update(dt) {
      t += dt;
      if (t < RISE) {
        const [x, y] = rise(t), [px, py] = rise(Math.max(0, t - dt));
        for (emit += Math.hypot(x - px, y - py) / 1.5; emit > 1; emit--)
          smoke.add({ x: x + R.range(-0.6, 0.6), y: y + 4, vx: R.range(-6, 6), vy: R.range(0, 8), r0: 1.3, r1: R.range(3, 4.8), life: R.range(1.4, 2.1), a: 0.5, b: 0.95, warm: 0.9, rise: 3, drag: 2, grow: 1.4 });
        if (R.chance(0.5)) ps.spawn(P.SPARK, x, y + 3, R.range(-40, 40), R.range(20, 90), R.range(0.2, 0.45));
      } else if (!burst) {
        burst = true;
        const [x, y] = star(t);
        lights.add(x, y, 64, C[4], 0.9, 0.5);
        lights.add(x, y, 24, WHITE, 0.8, 0.12);
        for (let i = 0; i < 30; i++) {
          const a = R.range(0, TAU), sp = R.range(70, 190);
          ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.25, 0.7));
        }
        for (let i = 0; i < 10; i++) smoke.add({ x: x + R.range(-3, 3), y: y + R.range(-3, 3), vx: R.range(-40, 40), vy: R.range(-40, 10), r0: 2.5, r1: R.range(6, 9), life: R.range(1.6, 2.4), a: 0.55, warm: 1, rise: 10, drag: 2.5 });
      } else if (t < RISE + BURN) {
        // the star burns: sparks drip off it, smoke boils up off it into a plume it lights from below
        const [x, y] = star(t), k = (t - RISE) / BURN, power = 1 - smooth(0.75, 1, k);
        for (drip += dt * 26 * power; drip > 1; drip--) ps.spawn(P.SPARK, x + R.range(-1.5, 1.5), y + 2, R.range(-30, 30), R.range(10, 60), R.range(0.35, 0.8));
        if (R.chance(dt * 18 * power)) smoke.add({ x: x + R.range(-1.5, 1.5), y: y - 2, vx: R.range(-8, 8), vy: -R.range(15, 30), r0: 2, r1: R.range(6, 10), life: R.range(1.6, 2.4) * (1 - 0.4 * k), a: 0.5, b: 0.85, warm: 1, rise: 14, drag: 1.6, grow: 1.2 });
      }
      ps.update(dt);
      smoke.update(dt);
      lights.update(dt);
    },
    draw(p) {
      // the smoke lit red by the star, more the closer and the brighter it burns
      const list = smoke.puffs(), lit = t > RISE && t < RISE + BURN ? 1 - smooth(0.75, 1, (t - RISE) / BURN) : 0;
      if (lit > 0) {
        const [sx, sy] = star(t);
        for (const q of list) q.w = Math.max(q.w, lit * Math.exp(-Math.hypot(q.x - sx, q.y - sy) / 26));
      }
      cloud(p, list, SM, WR, { dens: 1.4, max: 0.8, lit: 1.3 });
      ps.draw(p);
      if (t < RISE) {
        // the rising flare: a white-hot head, a short red flame under it
        const [x, y] = rise(t);
        p.line(x, y + 1, x, y + 5, (u) => (u < 0.3 ? C[6] : u < 0.7 ? C[4] : C[3]));
        p.px(x, y, WHITE), p.px(x, y - 1, C[6]);
        p.glow(x, y, 14, C[4], 0.6);
        p.glow(x, y, 4, WHITE, 0.4);
      } else if (t < RISE + BURN) {
        const [x, y] = star(t), u = t - RISE, k = u / BURN, fr = Math.floor(t * 30);
        const fl = 0.8 + 0.2 * rand(fr, 3) + 0.08 * Math.sin(u * 19), die = 1 - smooth(0.78, 1, k);
        // the burst: a flash of white and rays for a moment
        if (u < 0.25) {
          const e = u / 0.25;
          rays(p, x, y, 22 * (1 - e) + 3, 1 - e, C);
          if (e < 0.25) p.circle(x, y, 5 * (1 - e * 3) + 1, WHITE);
        }
        // the star: a hot ball with a long cross of light that pulses, guttering at the end
        const r = (2 + 0.6 * fl) * (0.4 + 0.6 * die);
        p.circle(x, y, r + 1.2, C[3]);
        p.circle(x, y, r, die > 0.4 ? C[5] : C[4]);
        if (die > 0.25) p.circle(x - 0.3, y - 0.3, r * 0.55, die > 0.6 ? WHITE : C[6]);
        if (die > 0.15 && rand(fr, 9) > 0.15) sparkle(p, x, y, Math.round((5 + 3 * fl) * die), C[6], C[4], 0.5 * die);
        p.glow(x, y, 70 * (0.6 + 0.4 * die), C[3], 0.55 * fl * die);
        p.glow(x, y, 22, C[4], 0.5 * fl * die);
        p.glow(x, y, 6, WHITE, 0.35 * die);
      }
      lights.draw(p);
    },
  };
}
