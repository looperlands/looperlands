// The flash lobes, spark, smoke wisp and casing recipes are adapted from Sprite Fusion's open-source
// muzzle-flash (https://www.spritefusion.com/pixel-art-vfx/muzzle-flash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { clamp, rand, rng, wrap, fit, fly, flyV, hex, mix, TAU, WHITE } from "../../core/index.mjs";
import { flashShape, flash, spark, cloud, casing, drawCasing } from "./_lib.mjs";

export const meta = {
  name: "SMG burst",
  desc: "Sustained fire at twelve rounds a second: each shot a different spiky flash with a white core, sparks, smoke wisps piling up and drifting, brass casings bouncing on the floor.",
  tags: ["projectile", "muzzle", "gun", "automatic", "flash", "smoke", "casing", "directional", "loop"],
  size: [112, 72],
  origin: [56, 66],
  duration: 1,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    brass: ["#4a2e10", "#8c5c1c", "#d9a441", "#ffe39a"],
    smoke: ["#26222e", "#3b3644", "#544e5e", "#6f6979", "#8c8596", "#aca5b5", "#cbc4d2"],
    height: 26,
    seed: 6,
  },
};

const SHOTS = 12, F1 = 1 / 30;

// every live copy of every shot: fn(s, age) for shot s fired at s * D / SHOTS, while age < life
function shots(t, D, life, fn) {
  for (let s = 0; s < SHOTS; s++) for (let age = wrap(t - (s * D) / SHOTS + 1e-7, D); age < life; age += D) fn(s, age);
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9), B = fit(o.brass, 4), SM = fit(o.smoke, 7), S = o.seed, D = meta.duration, H = o.height;
  const MX = 0, MY = -H, SP = [F[7], F[6], F[4], F[3]], top = -meta.origin[1] + 1;
  // the latest shot's pop of light, for the smoke it lights up
  let pop = 0;
  shots(t, D, 0.2, (s, age) => (pop = Math.max(pop, Math.exp(-(age + 0.008) / 0.035))));

  // smoke: every shot leaves a few wisps that push forward, slow, swell and rise, piling up into a drifting haze
  const puffs = [];
  shots(t, D, 2.2, (s, age) => {
    for (let j = 0; j < 3; j++) {
      const r = rng(S, s, j, 3), life = r.range(1.5, 2.2), dl = j * 0.03;
      if (age < dl || age - dl >= life) continue;
      const a = age - dl, k = a / life, port = j === 2;
      // a push forward that dies fast, then the warm gas lifts it and the air drifts it back over the gun
      const vx = port ? r.range(-12, 6) : r.range(45, 100) * (1 - j * 0.4), vy = port ? -r.range(14, 26) : -r.range(4, 16);
      const x = (port ? -7 : MX + 3) + (vx * (1 - Math.exp(-3.2 * a))) / 3.2 - r.range(3, 7) * a * a + Math.sin(a * 2.1 + r.range(0, TAU)) * a * 2.5;
      const y = (port ? MY - 2 : MY) + (vy * (1 - Math.exp(-2.4 * a))) / 2.4 - 0.5 * r.range(9, 16) * a * a;
      const rad = (port ? 1 : 1.2) + r.range(2, 4.5) * (1 - Math.exp(-1.4 * a));
      if (y - rad < top + 1) continue;
      const edge = Math.min(1, (y - rad - top) / 12);
      puffs.push({ x, y, r: rad, a: Math.min(1, a * 10) * Math.pow(1 - k, 1.6) * (port ? 0.24 : 0.34) * edge, b: clamp(0.92 - k * 0.6), w: pop * Math.exp(-Math.hypot(x - MX, y - MY) / 9) });
    }
  });
  cloud(p, puffs, SM, [SM[0], mix(F[1], SM[1], 0.5), mix(F[2], SM[2], 0.4), F[3], F[4], F[5], F[7]], { dens: 1.4, max: 0.7, lit: 1.3 });

  // casings: thrown up and back out of the ejection port, tumbling, bouncing on the floor, then lying a moment
  shots(t, D, D, (s, age) => {
    const r = rng(S, s, 7), k = casing(-7, MY - 1, -r.range(18, 48), -r.range(85, 135), r.sign() * r.range(20, 32), age, 850, -0.5, 0.42, r.range(0, TAU));
    drawCasing(p, k, B, clamp((D - age) / 0.25));
  });

  // the flash: a hero frame with a white core, then a cooler, smaller one; every shot its own shape
  shots(t, D, 2 * F1, (s, age) => {
    const r = rng(S, s), f = age < F1 ? 1 : 2, tilt = r.range(-0.06, 0.06);
    const L = flashShape(r, f, { size: r.range(0.95, 1.2), spike: [12, 21], diag: [6, 11], cross: [4, 7.5], back: [2.5, 5] });
    const C = f === 1 ? [WHITE, F[7], F[6], F[3]] : [F[7], F[6], F[4], F[2]];
    flash(p, MX, MY, tilt, L, C, s * 7 + f);
  });

  // sparks and unburnt grains spat forward with each shot, dropping as they slow
  shots(t, D, 0.3, (s, age) => {
    for (let j = 0; j < 5; j++) {
      const r = rng(S, s, j, 11), life = r.range(0.05, 0.16) * (j > 2 ? 1.8 : 1);
      if (age >= life) continue;
      const a = r.range(-0.3, 0.3), sp = r.range(170, 380) * (j > 2 ? 0.5 : 1), [x, y] = fly(MX + 2, MY, Math.cos(a) * sp, Math.sin(a) * sp, age, 420, 2.2);
      const [vx, vy] = flyV(Math.cos(a) * sp, Math.sin(a) * sp, age, 420, 2.2);
      if (j > 2) p.px(x, y, age / life < 0.5 ? F[6] : F[4]);
      else spark(p, x, y, vx, vy, 1 - age / life, SP, 0.45, 0.011);
    }
  });

  // light: a hot pop at the muzzle on every shot, the floor and smoke catching it
  shots(t, D, 0.15, (s, age) => {
    const k = Math.exp(-(age + 0.008) / 0.03);
    p.glow(MX + 4, MY, 26, F[4], 0.8 * k);
    p.glow(MX + 2, MY, 7, WHITE, 0.45 * k);
    p.glow(MX + 2, 0, 12, F[4], 0.16 * k);
  });
}
