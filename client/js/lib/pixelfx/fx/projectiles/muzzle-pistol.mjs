// The flash lobes, spark, smoke and casing recipes are adapted from Sprite Fusion's open-source
// muzzle-flash (https://www.spritefusion.com/pixel-art-vfx/muzzle-flash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, P, Rng, rng, fit, mix, WHITE } from "../../core/index.mjs";
import { flashShape, flash, cloud, Smoke, casing, drawCasing } from "./_lib.mjs";

export const meta = {
  name: "Pistol shot",
  desc: "One pistol shot from a muzzle `height` px above the floor (the origin): a spiky white-cored flash, sparks, a curl of smoke hooking up and back, a casing that bounces and settles.",
  tags: ["projectile", "muzzle", "gun", "pistol", "flash", "smoke", "casing", "directional", "one-shot"],
  size: [96, 72],
  origin: [44, 66],
  duration: 1.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    brass: ["#4a2e10", "#8c5c1c", "#d9a441", "#ffe39a"],
    smoke: ["#26222e", "#3b3644", "#544e5e", "#6f6979", "#8c8596", "#aca5b5", "#cbc4d2"],
    height: 26,
    seed: 3,
  },
};

const F1 = 1 / 30;

export function create(o) {
  const F = fit(o.palette, 9), B = fit(o.brass, 4), SM = fit(o.smoke, 7), H = o.height, MY = -H, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [F[7], F[6], F[4], F[3]] }), smoke = new Smoke(R);
  // the flash's shape, fixed for this shot
  const shapeSeed = R.int(0, 1e6), tilt = R.range(-0.05, 0.05);
  // sparks spat forward, a few grains of unburnt powder that drop
  for (let i = 0; i < 6; i++) {
    const a = R.range(-0.3, 0.3), sp = R.range(180, 400);
    ps.spawn(P.SPARK, 3, MY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.06, 0.16));
  }
  for (let i = 0; i < 5; i++) {
    const a = R.range(-0.35, 0.25), sp = R.range(60, 160);
    ps.spawn(P.EMBER, 3, MY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.5), F[5]);
  }
  // a puff of gas forward, then a chain of wisps that push out, slow and curl up and back over the muzzle
  for (let i = 0; i < 3; i++) smoke.add({ x: 3, y: MY, vx: R.range(70, 120), vy: R.range(-12, 6), r0: 1.6, r1: R.range(4.5, 6), life: R.range(0.8, 1.05), a: 0.55, drag: 3.5, rise: 10, warm: 0.9, delay: i * 0.012 });
  for (let i = 0; i < 14; i++) {
    const k = i / 13;
    smoke.add({ x: 2, y: MY, vx: 115 - 75 * k + R.range(-12, 12), vy: -6 - 10 * k + R.range(-5, 5), r0: 1.4, r1: (3.6 + k * 2.6) * R.range(0.75, 1.25), life: 1.15 + k * 0.3, a: 0.62, b: R.range(0.85, 1), drag: 2.2, rise: 6, curl: -4.4 + k * 1.8 + R.range(-0.5, 0.5), grow: 1.6, warm: 0.7, delay: 0.02 + i * 0.022 });
  }
  smoke.add({ x: -7, y: MY - 2, vx: -6, vy: -18, r0: 1.2, r1: 4, life: 1.05, a: 0.4, rise: 8, delay: 0.03 });
  const shell = { vx: -R.range(25, 45), vy: -R.range(95, 130), va: R.sign() * R.range(22, 32), a0: R.range(0, 6.28) };
  let t = 0;
  return {
    update(dt) {
      t += dt;
      ps.update(dt);
      smoke.update(dt);
    },
    draw(p) {
      const pop = Math.exp(-(t + 0.008) / 0.035);
      const list = smoke.puffs();
      for (const q of list) q.w *= 0.4 + pop;
      cloud(p, list, SM, [SM[0], mix(F[1], SM[1], 0.5), mix(F[2], SM[2], 0.4), F[3], F[4], F[5], F[7]], { dens: 1.5, max: 0.8, lit: 1.4 });
      // the casing: out of the port, up and back, tumbling, a bounce or two, then it lies there and fades
      if (t < meta.duration) drawCasing(p, casing(-7, MY - 1, shell.vx, shell.vy, shell.va, t, 850, -0.5, 0.42, shell.a0), B, Math.min(1, (meta.duration - 0.05 - t) / 0.3));
      // the flash: the hero frame with a white core, then one cooler, smaller frame
      if (t < 2 * F1) {
        const f = t < F1 ? 1 : 2, L = flashShape(rng(shapeSeed), f, { size: 1.15, spike: [15, 22], diag: [7, 12], cross: [4.5, 8], back: [3, 5.5] });
        flash(p, 0, MY, tilt, L, f === 1 ? [WHITE, F[7], F[6], F[3]] : [F[7], F[6], F[4], F[2]], f + o.seed);
      }
      ps.draw(p);
      // light: the pop, its warm pool, a touch on the floor below
      p.glow(4, MY, 30, F[4], 0.85 * pop);
      p.glow(2, MY, 8, WHITE, 0.5 * pop);
      p.glow(4, 0, 16, F[4], 0.2 * pop);
    },
  };
}
