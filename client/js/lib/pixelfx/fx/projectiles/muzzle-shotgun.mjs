// The flash lobes, spark, smoke and casing recipes are adapted from Sprite Fusion's open-source
// muzzle-flash (https://www.spritefusion.com/pixel-art-vfx/muzzle-flash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, P, Rng, fit, mix, clamp, WHITE } from "../../core/index.mjs";
import { flash, cloud, Smoke, casing } from "./_lib.mjs";

export const meta = {
  name: "Shotgun blast",
  desc: "A shotgun blast from a muzzle `height` px above the floor (the origin): a wide ragged fan of flame, pellet streaks, a heavy rolling smoke cloud, a red shell kicked out on the pump.",
  tags: ["projectile", "muzzle", "gun", "shotgun", "flash", "smoke", "casing", "directional", "one-shot"],
  size: [160, 88],
  origin: [44, 82],
  duration: 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    smoke: ["#221e2a", "#36313f", "#4e4858", "#6a6474", "#888192", "#a8a1b1", "#c8c1cf"],
    shell: ["#4a0f14", "#9a1e22", "#d8423a", "#8c5c1c", "#e9b54a"],
    height: 26,
    seed: 5,
  },
};

const F1 = 1 / 30;

// the fan: a fat fireball at the muzzle and a spray of ragged tongues across the cone, each its own length
function fan(R, f) {
  const k = f === 1 ? 1 : f === 2 ? 0.82 : 0.55, w = f === 1 ? 1 : 1.25;
  const L = [{ off: 0.5, a: 0, len: 11 * k, wid: 3.6 * w, core: 0.5 }];
  for (let i = 0; i < 9; i++) {
    const u = i / 8 - 0.5, a = u * 1.15 + R[i * 3] * 0.12, len = (17 + 11 * (1 - Math.abs(u) * 1.4) + R[i * 3 + 1] * 7) * k;
    L.push({ off: 2, a, len, wid: (1.7 + R[i * 3 + 2]) * w, core: f === 1 ? 0.32 : 0 });
  }
  if (f === 1) for (const s of [-1, 1]) L.push({ off: 1, a: s * (1.6 + R[27 + (s > 0)] * 0.4), len: 5 + R[29] * 3, wid: 1.2, core: 0 });
  return L;
}

export function create(o) {
  const F = fit(o.palette, 9), SM = fit(o.smoke, 7), SH = fit(o.shell, 5), H = o.height, MY = -H, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [F[7], F[6], F[4], F[3]] }), smoke = new Smoke(R);
  const right = meta.size[0] - meta.origin[0] - 2, jit = Array.from({ length: 32 }, () => R.next());
  // pellets: a tight spray, gone off the canvas in a few frames, each dragging a hot streak
  const pellets = Array.from({ length: 10 }, () => ({ a: R.range(-0.13, 0.13), v: R.range(900, 1150), d0: R.range(0, 4) }));
  // sparks and burning wad, flung wide
  for (let i = 0; i < 16; i++) {
    const a = R.range(-0.55, 0.55), sp = R.range(180, 460);
    ps.spawn(P.SPARK, 4, MY, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.08, 0.3));
  }
  for (let i = 0; i < 7; i++) {
    const a = R.range(-0.5, 0.3), sp = R.range(70, 200);
    ps.spawn(P.EMBER, 4, MY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.4, 0.9), F[5]);
  }
  // the smoke: a heavy shove of gas forward that slows, rolls, swells and lifts; the first of it lit by the blast
  for (let i = 0; i < 26; i++) {
    const a = R.range(-0.45, 0.35), sp = R.range(60, 230) * (i < 8 ? 1.15 : 0.8);
    smoke.add({ x: 4 + R.range(0, 4), y: MY + R.range(-1.5, 1.5), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r0: R.range(2.5, 3.5), r1: R.range(7, 12.5), life: R.range(2.1, 2.9), a: R.range(0.55, 0.72), b: R.range(0.9, 1), drag: R.range(2.6, 3.6), rise: R.range(9, 15), grow: R.range(1.8, 2.8), warm: 1, delay: R.range(0, 0.04) });
  }
  for (let i = 0; i < 6; i++) smoke.add({ x: 2, y: MY, vx: R.range(15, 50), vy: -R.range(10, 25), r0: 1.5, r1: R.range(4, 6), life: R.range(1.8, 2.4), a: 0.5, b: 1, drag: 2, rise: 10, curl: -R.range(1.5, 3), warm: 0.6, delay: 0.08 + i * 0.05 });
  // the pump throws the spent shell a beat later
  const shell = { t0: 0.42, vx: -R.range(30, 55), vy: -R.range(110, 150), va: R.sign() * R.range(16, 24), a0: R.range(0, 6.28) };
  let t = 0;
  return {
    update(dt) {
      t += dt;
      ps.update(dt);
      smoke.update(dt);
    },
    draw(p) {
      const pop = Math.exp(-(t + 0.008) / 0.05), list = smoke.puffs();
      for (const q of list) q.w *= 0.25 + pop * 1.2;
      cloud(p, list, SM, [SM[0], mix(F[1], SM[1], 0.5), mix(F[2], SM[2], 0.4), F[3], F[4], F[5], F[7]], { dens: 1.4, max: 0.86, lit: 1.4 });

      // the shell: red hull, brass head, tumbling up and back, bouncing, lying a moment
      if (t > shell.t0 && t < meta.duration - 0.05) {
        const k = casing(-9, MY, shell.vx, shell.vy, shell.va, t - shell.t0, 850, -1, 0.35, shell.a0), ca = Math.cos(k.a), sa = Math.sin(k.a), fade = clamp((meta.duration - 0.05 - t) / 0.3);
        for (let d = -1.5; d <= 1.5; d += 0.5) p.dot(k.x + ca * d, k.y + sa * d - 0.5, d > 0.8 ? (d > 1.2 ? SH[4] : SH[3]) : d > -0.6 ? SH[2] : SH[1], fade);
        for (let d = -1; d <= 1; d += 0.5) p.dot(k.x + ca * d - sa, k.y + sa * d + ca - 0.5, d > 0.6 ? SH[3] : SH[0], fade);
        if (k.hit >= 0 && k.hit < 0.07) p.glow(k.x, k.y, 5, SH[4], 0.5 * (1 - k.hit / 0.07));
      }

      // the flash: a white-hot hero frame, then the fan cooling and spreading as the gas balloons
      if (t < 3 * F1) {
        const f = t < F1 ? 1 : t < 2 * F1 ? 2 : 3;
        flash(p, 0, MY, 0, fan(jit, f), f === 1 ? [WHITE, F[7], F[6], F[3]] : f === 2 ? [F[7], F[6], F[4], F[2]] : [F[5], F[4], F[3], F[1]], f + 9);
      }
      // the pellets: hot heads with tails that cool to orange, clipped at the canvas edge
      if (t < 0.2)
        for (const q of pellets) {
          const head = 6 + q.d0 + q.v * t, tail = Math.max(4, head - 26), ca = Math.cos(q.a), sa = Math.sin(q.a);
          for (let d = tail; d <= head; d += 0.5) {
            const x = ca * d;
            if (x > right) break;
            const u = (d - tail) / Math.max(1, head - tail);
            p.dot(x, MY + sa * d, u > 0.85 ? WHITE : u > 0.5 ? F[6] : F[4], u > 0.3 ? 1 : u / 0.3);
          }
          if (ca * head < right) p.glow(ca * head, MY + sa * head, 4, F[6], 0.5);
        }
      ps.draw(p);
      // light: a big pop that floods the floor, a white heart
      p.glow(8, MY, 46, F[4], 0.95 * pop);
      p.glow(4, MY, 12, WHITE, 0.6 * pop);
      p.glow(10, 0, 30, F[4], 0.28 * pop);
    },
  };
}
