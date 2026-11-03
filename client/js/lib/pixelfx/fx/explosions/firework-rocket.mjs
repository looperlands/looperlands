// The flare, the twinkling glitter and the crackle are adapted from Sprite Fusion's open-source sparkle
// (https://www.spritefusion.com/pixel-art-vfx/sparkle), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, ease, TAU, WHITE, hex, mix } from "../../core/index.mjs";
import { cull } from "./_lib.mjs";

export const meta = {
  name: "Firework rocket",
  desc: "A rocket fizzes off the ground on a sparkling gold trail, coasts, and bursts into a palm: heavy gold fronds arc out, droop on glittering trails and crackle at the tips.",
  tags: ["firework", "rocket", "celebration", "sparkle", "sky", "one-shot"],
  size: [300, 300],
  origin: [150, 288],
  duration: 3.8,
  loop: false,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#2a1406", "#6a3a0c", "#b8701a", "#f0a830", "#ffd860", "#fff2b0", "#ffffff"],
    tips: ["#0c2a3a", "#1a5a78", "#36a2c8", "#7cd8f0", "#c8f4ff", "#ffffff"],
    seed: 12,
  },
};

const FLY = 1.05, HIGH = 192, DRAG = 1.35, G = 105, TRAIL = 1.15;

export function create(o) {
  const C = fit(o.palette, 7), T = fit(o.tips, 6), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [C[6], C[5], C[4], C[3]] }), lights = new Lights();
  const fronds = [], pops = [];
  const at = (t) => [Math.sin(t * 8) * 1.6 * (t / FLY), -8 - HIGH * ease.outQuad(clamp(t / FLY))];
  let t = 0, burst = false, bx = 0, by = 0, acc = 0;
  lights.add(0, -14, 24, C[4], 0.7, 0.35);
  // ignition: a puff of smoke and a spray of sparks off the ground
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(60, 180);
    ps.spawn(P.SPARK, 0, -2, Math.cos(a) * sp, Math.sin(a) * sp * 0.6, R.range(0.15, 0.4));
  }
  for (let i = 0; i < 5; i++) ps.spawn(P.VAPOUR, R.range(-3, 3), -2, R.range(-20, 20), -R.range(2, 10), R.range(0.6, 1), hex("#5a5468"), R.range(3, 5));
  return {
    update(dt) {
      t += dt;
      if (t < FLY) {
        // the climb: a hot tail spitting gold sparks, glitter left hanging, a thread of smoke
        const [x, y] = at(t), [x2, y2] = at(Math.max(0, t - 0.02)), vy = (y - y2) / 0.02, vx = (x - x2) / 0.02;
        for (acc += dt * 90; acc > 1; acc--) {
          const a = Math.PI / 2 + R.range(-0.45, 0.45), sp = R.range(30, 110);
          ps.spawn(P.SPARK, x, y + 4, Math.cos(a) * sp + vx * 0.2, Math.sin(a) * sp + vy * 0.15, R.range(0.15, 0.4));
          if (R.chance(0.25)) ps.spawn(P.STAR, x + R.range(-1.5, 1.5), y + R.range(2, 6), R.range(-6, 6), R.range(5, 20), R.range(0.4, 0.9), R.chance(0.5) ? C[5] : WHITE, R.chance(0.15) ? 1.2 : 0.5);
          if (R.chance(0.18)) ps.spawn(P.VAPOUR, x, y + 5, R.range(-4, 4), R.range(4, 12), R.range(0.6, 1.1), hex("#4a4458"), R.range(1.2, 2.2));
        }
      } else if (!burst) {
        burst = true;
        [bx, by] = at(FLY);
        lights.add(bx, by, 82, C[4], 0.8, 1.6);
        lights.add(bx, by, 40, WHITE, 0.6, 0.08);
        // the palm: heavy comets thrown up and out, a few low ones to the sides
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + ((i - 4) / 4) * 1.4 + R.range(-0.1, 0.1), sp = R.range(180, 210) * (1 - 0.12 * Math.abs(i - 4) / 4);
          fronds.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: R.range(1.8, 2.15), pts: [], acc: R.next(), seed: R.range(0, 100) });
        }
        for (let i = 0; i < 6; i++) ps.spawn(P.VAPOUR, bx + R.range(-4, 4), by + R.range(-4, 4), R.range(-20, 20), R.range(-15, 15), R.range(1.8, 2.6), hex("#4a4458"), R.range(6, 10));
        for (let i = 0; i < 30; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 160);
          ps.spawn(P.SPARK, bx, by, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.35));
        }
      }
      for (let i = fronds.length - 1; i >= 0; i--) {
        const f = fronds[i];
        f.age += dt;
        const k = f.age / f.life;
        if (k >= 1) {
          for (let j = 0; j < 4; j++) pops.push({ x: f.x + R.range(-5, 5), y: f.y + R.range(-5, 5), t0: t + R.range(0, 0.2), life: R.range(0.06, 0.12), c: R.chance(0.5) ? WHITE : T[3] });
          fronds.splice(i, 1);
          continue;
        }
        f.vx -= f.vx * DRAG * dt;
        f.vy -= f.vy * DRAG * dt - G * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.pts.push(f.x, f.y, t);
        while (f.pts.length > 3 && t - f.pts[2] > TRAIL) f.pts.splice(0, 3);
        // glitter shed all along: specks that hang, twinkle and drift down
        for (f.acc += dt * 34; f.acc > 1; f.acc--) ps.spawn(P.STAR, f.x + R.range(-1, 1), f.y + R.range(-1, 1), f.vx * 0.1 + R.range(-5, 5), R.range(0, 14), R.range(0.5, 1.1), R.chance(0.6) ? C[5] : WHITE, R.chance(0.12) ? R.range(1, 1.5) : 0.5);
      }
      for (let i = pops.length - 1; i >= 0; i--) if (t > pops[i].t0 + pops[i].life) pops.splice(i, 1);
      ps.update(dt);
      cull(ps, -meta.origin[0] + 2, -meta.origin[1] + 2, meta.size[0] - meta.origin[0] - 2, meta.size[1] - meta.origin[1] - 2);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
    },
    draw(p) {
      if (t < FLY) {
        // the rocket: a little tube on a stick, a white-hot tail flickering under it
        const [x, y] = at(t);
        p.line(x, y + 4, x, y + 12, hex("#5a4030"));
        p.rect(x - 1, y - 3, 3, 7, hex("#b8303a"));
        p.px(x - 1, y - 3, hex("#e86070"));
        p.px(x, y - 4, hex("#d8d0c0"));
        const fl = 2 + (Math.sin(t * 70) > 0 ? 1 : 0);
        p.line(x, y + 4, x, y + 4 + fl, (u) => (u < 0.4 ? WHITE : C[5]));
        p.glow(x, y + 5, 9, C[4], 0.6);
      }
      for (const f of fronds) {
        const k = f.age / f.life, P2 = f.pts, n = P2.length / 3;
        // the frond: a thick gold trail, hot near the head, cooling and dithering out behind
        for (let j = n - 1; j > 0; j--) {
          const u = (t - P2[j * 3 + 2]) / TRAIL;
          if (u >= 1) break;
          const c = u < 0.08 ? C[6] : u < 0.25 ? C[5] : u < 0.5 ? C[4] : u < 0.75 ? C[3] : C[2], a = Math.pow(1 - u, 0.6) * (1.25 - k * 0.45);
          p.line(P2[j * 3], P2[j * 3 + 1], P2[j * 3 - 3], P2[j * 3 - 2], c, a);
          if (u < 0.7) p.line(P2[j * 3] + 1, P2[j * 3 + 1], P2[j * 3 - 3] + 1, P2[j * 3 - 2], u < 0.25 ? C[5] : u < 0.5 ? C[3] : C[2], a * 0.85);
          if (u < 0.35) p.line(P2[j * 3], P2[j * 3 + 1] + 1, P2[j * 3 - 3], P2[j * 3 - 2] + 1, C[3], a * 0.6);
        }
        if (k > 0.8 && Math.sin(t * 55 + f.seed) < 0) continue;
        p.rect(f.x - 0.5, f.y - 0.5, 2, 2, k < 0.5 ? WHITE : C[6]);
        if (k < 0.6) for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [0, 2]]) p.px(f.x + dx, f.y + dy, C[5]);
        p.glow(f.x, f.y, 10, C[4], 0.6 * (1 - k * 0.5));
      }
      for (const q of pops) {
        const u = (t - q.t0) / q.life;
        if (u < 0 || u > 1) continue;
        sparkle(p, q.x, q.y, 2.8 * Math.sin(Math.PI * u), q.c, T[2], 0.5);
      }
      // the burst: a white heart for two frames, a flare turning
      const b = t - FLY;
      if (b >= 0 && b < 0.26) {
        const u = b / 0.26, L = 30 * Math.pow(1 - u, 1.3);
        for (let i = 0; i < 8; i++) {
          const diag = i % 2 === 1, an = u * 0.5 + (i * TAU) / 8, len = diag ? L * 0.45 : L, ca = Math.cos(an), sa = Math.sin(an);
          for (let d = 0; d <= len; d += 0.5) {
            const v = d / len;
            p.dot(bx + ca * d, by + sa * d, v < 0.3 ? WHITE : v < 0.65 ? C[5] : C[4], v < 0.7 ? 1 : 1 - (v - 0.7) / 0.35);
          }
        }
        if (b < 0.07) p.circle(bx, by, 2.5, WHITE);
        p.glow(bx, by, 4 + L * 1.2, C[4], 0.35);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
