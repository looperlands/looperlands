// The flash, spark and smoke recipes are adapted from Sprite Fusion's open-source muzzle-flash and explosion
// (https://www.spritefusion.com/pixel-art-vfx/muzzle-flash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, mix, clamp, hex, WHITE } from "../../core/index.mjs";
import { flash, cloud, Smoke } from "./_lib.mjs";

export const meta = {
  name: "Cannon shot",
  desc: "A cannon fires from a muzzle `height` px above the floor (the origin): a white flash, a tongue of flame, the ball arcing off trailing smoke, a big gunsmoke cloud rolling out.",
  tags: ["projectile", "cannon", "cannonball", "smoke", "flash", "directional", "one-shot"],
  size: [208, 116],
  origin: [48, 102],
  duration: 3.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    smoke: ["#3a3542", "#55505e", "#736d7c", "#938d9b", "#b3adba", "#d2cdd6", "#ece8ee"],
    iron: ["#141218", "#2c2a34", "#4c4a58", "#8a8898"],
    height: 12,
    seed: 4,
  },
};

const ANG = -0.32, F1 = 1 / 30;

export function create(o) {
  const F = fit(o.palette, 9), SM = fit(o.smoke, 7), IR = fit(o.iron, 4), H = o.height, MY = -H, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [F[7], F[6], F[4], F[3]] }), smoke = new Smoke(R), lights = new Lights();
  const ca = Math.cos(ANG), sa = Math.sin(ANG), right = meta.size[0] - meta.origin[0] - 3, top = -meta.origin[1] + 3;
  const ball = { x: 4, y: MY, vx: ca * 330, vy: sa * 330, out: false };
  const jit = Array.from({ length: 16 }, () => R.next());
  lights.add(12, MY - 2, 44, hex("#ffb060"), 1, 0.35);
  lights.add(6, MY, 18, WHITE, 0.9, 0.08);
  // burning wadding and sparks thrown out with the shot
  for (let i = 0; i < 22; i++) {
    const a = ANG + R.range(-0.45, 0.45), sp = R.range(140, 380);
    ps.spawn(P.SPARK, 6, MY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.1, 0.4));
  }
  for (let i = 0; i < 10; i++) {
    const a = ANG + R.range(-0.3, 0.3), sp = R.range(70, 170);
    ps.spawn(P.SPARK, 6, MY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.5, 0.9));
  }
  for (let i = 0; i < 8; i++) {
    const a = ANG + R.range(-0.5, 0.3), sp = R.range(40, 110);
    ps.spawn(P.EMBER, 8, MY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.7, 1.4), F[5], 2);
  }
  // the gunsmoke: a great white shove of it out of the bore that slows, rolls over itself, swells and lifts
  for (let i = 0; i < 34; i++) {
    const a = ANG + R.range(-0.4, 0.35), sp = R.range(40, 260) * (i < 12 ? 1.1 : 0.75);
    smoke.add({ x: 6 + R.range(0, 6), y: MY + R.range(-2, 2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r0: R.range(3, 4.5), r1: R.range(9, 16), life: R.range(2.7, 3.5), a: R.range(0.6, 0.75), b: R.range(0.9, 1), drag: R.range(2.2, 3.2), rise: R.range(7, 13), grow: R.range(1.5, 2.4), curl: R.range(-1.2, 0.4), warm: 1, delay: R.range(0, 0.05) });
  }
  let t = 0, wisp = 0;
  return {
    update(dt) {
      t += dt;
      if (!ball.out) {
        const x0 = ball.x, y0 = ball.y;
        ball.vy += 260 * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        // the ball leaves a thin wisp of smoke off its hot skin, one puff every two pixels of flight
        for (wisp += Math.hypot(ball.x - x0, ball.y - y0) / 2; wisp > 1; wisp--) {
          const f = R.next(), x = x0 + (ball.x - x0) * f, y = y0 + (ball.y - y0) * f;
          if (x < right - 8 && x > 24 && t < 0.6) smoke.add({ x: x - 3, y, vx: -ball.vx * 0.04, vy: -ball.vy * 0.04, r0: 1, r1: R.range(2.5, 3.6) * (1 - t), life: R.range(0.7, 1.1), a: 0.5 * (1 - t), b: 0.95, drag: 2, rise: 5, grow: 2 });
        }
        if (ball.x > right || ball.y < top) ball.out = true;
      }
      ps.update(dt);
      smoke.update(dt);
      lights.update(dt);
    },
    draw(p) {
      const pop = Math.exp(-(t + 0.008) / 0.06), list = smoke.puffs();
      for (const q of list) q.w *= 0.2 + pop * 1.3;
      cloud(p, list, SM, [SM[0], mix(F[1], SM[1], 0.5), mix(F[2], SM[2], 0.45), F[3], F[4], F[6], F[7]], { dens: 1.35, max: 0.86, lit: 1.3 });
      ps.draw(p);
      // the ball: dark iron, a lit crescent, a hot glint where the flash still burns on it
      if (!ball.out) {
        const x = ball.x, y = ball.y;
        p.circle(x, y, 3.2, IR[0]);
        p.circle(x, y, 2.6, IR[1]);
        p.circle(x - 0.7, y - 0.7, 1.8, IR[2]);
        p.px(x - 1, y - 1.5, IR[3]), p.px(x - 2, y - 1, IR[3]);
        p.px(x + 1.5, y + 1, t < 0.3 ? F[5] : IR[2]);
        p.glow(x, y, 6, F[4], 0.45 * clamp(1 - t / 0.5));
      }
      // the flash: a white ball with a tongue of flame for a frame, then a cooler, bigger burst as the gas spills
      if (t < 3 * F1) {
        const f = t < F1 ? 1 : t < 2 * F1 ? 2 : 3, k = (f === 1 ? 1 : f === 2 ? 1.15 : 0.8) * 1.3;
        const L = [{ off: 0, a: 0, len: 12 * k, wid: 5 * k, core: 0.55 }, { off: 2, a: 0, len: (24 + jit[0] * 8) * k, wid: 2.2 * k, core: 0.4 }];
        for (let i = 0; i < 6; i++) {
          const a = (i < 3 ? -1 : 1) * (0.4 + (i % 3) * 0.45 + jit[i + 1] * 0.2), down = Math.sin(ANG + a);
          let len = (8 + jit[i + 7] * 7) * k * (f === 3 ? 0.7 : 1);
          if (down > 0.1) len = Math.min(len, (H - 3) / down);
          L.push({ off: 2, a, len, wid: 1.6 * k, core: 0.25 });
        }
        flash(p, 4, MY, ANG, L, f === 1 ? [WHITE, F[7], F[6], F[3]] : f === 2 ? [F[7], F[6], F[4], F[2]] : [F[5], F[4], F[3], F[1]], f);
        if (f === 1) p.circle(7, MY - 1, 6.5, WHITE), p.ring(7, MY - 1, 7.5, 1, F[7]);
      }
      lights.draw(p);
      p.glow(14, 0, 22, F[4], 0.25 * pop);
    },
  };
}
