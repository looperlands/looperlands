// The pop recipe (a gathering, a white flash with a ring and flares, twinkling motes that linger and fade) is
// adapted from Sprite Fusion's open-source sparkle (https://www.spritefusion.com/pixel-art-vfx/sparkle),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, flare, sparkle, clamp, smooth, seg, ease, TAU, WHITE } from "../../core/index.mjs";
import { flakeDesign, snowflake, endBy } from "./_lib.mjs";

export const meta = {
  name: "Snowflake burst",
  desc: "A cold pop: frost gathers and flashes white in a ring, then crisp six-armed snowflakes spin out, slow, twinkle and drift down to settle and melt.",
  tags: ["ice", "snow", "snowflake", "burst", "magic", "one-shot"],
  size: [140, 120],
  origin: [70, 106],
  duration: 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], count: 9, seed: 8 },
};

const POP = 0.16, CY = -48;

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const lights = new Lights();
  // the flakes: two big, a few middling, the rest small; small ones fly further
  const flakes = [];
  const SIZES = [2, 0, 1, 0, 2, 0, 1, 0, 1];
  for (let i = 0; i < o.count; i++) {
    const z = SIZES[i % SIZES.length], r = z === 2 ? R.range(9.5, 11.5) : z === 1 ? R.range(6, 7.5) : R.range(3, 4.5);
    const a = (i / o.count) * TAU + R.range(-0.3, 0.3) + 0.4, sp = R.range(80, 120) * (1.4 - r / 14);
    flakes.push({
      x: 0, y: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.85 - 20, r, rot: R.range(0, TAU), w0: R.sign() * R.range(7, 12), w1: R.sign() * R.range(0.4, 1),
      d: flakeDesign(R), life: R.range(2.1, 2.8), age: 0, ph: R.range(0, TAU), tw: R.range(0.5, 0.85), tw0: R.range(0.15, 0.6), rest: false, popped: false,
    });
  }
  let t = 0, popped = false;
  const sz = (f) => f.r * Math.min(1, ease.outBack(clamp(f.age / 0.18), 2)) * Math.min(1, (f.life - f.age) / 0.35);

  return {
    update(dt) {
      t += dt;
      // the cold gathers: streaks of frost spiral in, snow motes drift in
      if (t < POP - 0.03 && R.chance(0.8)) {
        const a = R.range(0, TAU), D = R.range(22, 44), T = R.range(0.12, 0.16), v = (D * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, Math.cos(a) * D, CY + Math.sin(a) * D, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[6] : C[5]);
      }
      if (!popped && t >= POP) {
        popped = true;
        lights.add(0, CY, 44, WHITE, 0.8, 0.1);
        lights.add(0, CY, 72, C[4], 0.5, 0.6);
        // frost thrown out: streaking motes, snow, glints that come and go round it
        for (let i = 0; i < 22; i++) {
          const a = R.range(0, TAU), sp = R.range(80, 150);
          ps.spawn(P.MOTE, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.5), R.chance(0.5) ? C[6] : C[5], R.range(0.6, 1));
        }
        for (let i = 0; i < 18; i++) {
          const a = R.range(-Math.PI, 0.2), sp = R.range(30, 110);
          ps.spawn(P.FLAKE, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.6), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.5));
        }
        for (let i = 0; i < 12; i++) {
          const a = R.range(0, TAU), d = R.range(10, 44);
          ps.spawn(P.STAR, Math.cos(a) * d, CY + Math.sin(a) * d * 0.85, 0, R.range(2, 6), R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(0.8, 2.2), R.range(0.08, 1.6));
        }
      }
      if (popped)
        for (const f of flakes) {
          f.age += dt;
          if (f.age >= f.life) continue;
          if (!f.rest) {
            f.vx -= f.vx * 2.8 * dt;
            f.vy -= f.vy * 2.8 * dt - 26 * dt;
            f.x += f.vx * dt + Math.sin(t * 1.8 + f.ph) * 5 * dt;
            f.y += f.vy * dt;
            f.rot += (f.w1 + (f.w0 - f.w1) * Math.exp(-f.age * 2.5)) * dt;
            // it settles on the floor, flat and still, and melts there
            if (f.y > -sz(f) * 0.3) {
              f.rest = true;
              f.y = -1;
              f.life = Math.min(f.life, f.age + 0.6);
            }
          }
          // a melted or spent flake goes out with a glint or two
          if (!f.popped && f.life - f.age < 0.1) {
            f.popped = true;
            for (let i = 0; i < 2; i++) ps.spawn(P.STAR, f.x + R.range(-2, 2), f.y + R.range(-2, 2), R.range(-6, 6), -R.range(2, 8), R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(0.8, 1.6));
          }
        }
      ps.update(dt);
      lights.update(dt);
      endBy(t, meta.duration, ps);
    },
    draw(p) {
      // the gathering: a tiny flake spins up at the heart, faster and brighter
      if (t < POP) {
        const k = t / POP;
        snowflake(p, 0, CY, 1 + 3.2 * k * k, t * 20, flakes[0].d, C, { hot: k });
        p.glow(0, CY, 8 + 14 * k, C[5], 0.3 + 0.4 * k);
      }
      // the pop: a white flash, a flare and a ring of frost running out
      const q = t - POP;
      if (q >= 0 && q < 0.4) {
        if (q < 0.07) p.circle(0, CY, 6 * (1 - q / 0.07) + 1, WHITE);
        flare(p, 0, CY, 28 * Math.pow(Math.max(0, 1 - q / 0.26), 1.5), 1 - q / 0.26, C);
        const e = ease.outCubic(q / 0.4), r = 5 + 34 * e;
        p.ring(0, CY, r, Math.max(1, 2.4 * (1 - e)), q < 0.08 ? WHITE : q < 0.2 ? C[6] : C[5], 1.15 - e);
        p.glowRing(0, CY, r, 5, C[5], 0.4 * (1 - e));
      }
      // the cold light left where it burst, fading
      if (popped) p.glow(0, CY, 46, C[4], 0.3 * (1 - smooth(POP, POP + 1.6, t)));
      // the flakes: spinning out, twinkling now and then, landing and melting
      for (const f of flakes) {
        if (!popped || f.age >= f.life) continue;
        const r = sz(f), tw = Math.max(0, Math.sin(((f.age - f.tw0) / f.tw) * TAU)) ** 8 * (f.age > f.tw0 ? 1 : 0);
        if (f.rest) {
          // lying on the floor: flattened to a sparkling smear that shrinks away
          const L = Math.max(1, Math.round(r * 1.2 * ((f.life - f.age) / 0.6)));
          for (let i = -L; i <= L; i++) p.px(f.x + i, -1, Math.abs(i) === L ? C[5] : i === 0 ? WHITE : C[6]);
          p.glow(f.x, -1, 3 + L, C[4], 0.3);
          continue;
        }
        snowflake(p, f.x, f.y, r, f.rot, f.d, C, { hot: Math.max(tw, 1 - clamp(f.age / 0.12)) });
        p.glow(f.x, f.y, 6 + r * 1.4, C[4], 0.12);
        if (tw > 0.5) flare(p, f.x, f.y, (3 + r * 0.7) * tw, tw, C);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
