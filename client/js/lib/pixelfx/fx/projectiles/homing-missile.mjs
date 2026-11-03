// The blast's particle recipe (fire that cools, sparks, embers, grit, rocks, scorch, floor ring, lights) is adapted
// from Sprite Fusion's open-source explosion (https://www.spritefusion.com/pixel-art-vfx/explosion),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, band, clamp, smooth, rand, mix, scale, hex, TAU, WHITE } from "../../core/index.mjs";
import { cloud, Smoke, turnSprite } from "./_lib.mjs";

export const meta = {
  name: "Homing missile",
  desc: "A missile kicks off, arcs up, rolls over and dives onto its target (the origin), its smoke trail left hanging in the air, and hits in a fiery blast of flame, sparks and rocks.",
  tags: ["projectile", "missile", "rocket", "homing", "smoke", "explosion", "one-shot"],
  size: [248, 140],
  origin: [160, 120],
  duration: 3.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    metal: ["#25243a", "#3e4058", "#61667f", "#8e97b0", "#c4cce0"],
    smoke: ["#26222e", "#3b3644", "#544e5e", "#6f6979", "#8c8596", "#aca5b5", "#cbc4d2"],
    stone: "#4a3f69",
    seed: 8,
  },
};

const FLY = 1.15;
// the path: up out of the launcher, over the top, and down onto the target, faster all the way
const PATH = [[-130, -22], [-114, -110], [-30, -120], [0, 0]];
const at = (u) => {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * PATH[0][0] + b * PATH[1][0] + c * PATH[2][0] + d * PATH[3][0], a * PATH[0][1] + b * PATH[1][1] + c * PATH[2][1] + d * PATH[3][1]];
};
const heading = (u) => {
  const v = 1 - u, d = (i) => 3 * v * v * (PATH[1][i] - PATH[0][i]) + 6 * v * u * (PATH[2][i] - PATH[1][i]) + 3 * u * u * (PATH[3][i] - PATH[2][i]);
  return Math.atan2(d(1), d(0));
};
const progress = (t) => Math.pow(clamp(t / FLY), 1.45);
// the missile, nose right: fins, a body lit on top, a red warhead with a white tip
const MISSILE = ["ff..........", ".fhhhhhhhre.", "nmmmmmmmmrrw", ".fsssssssrd.", "ff.........."];

export function create(o) {
  const F = fit(o.palette, 9), M = fit(o.metal, 5), SM = fit(o.smoke, 7), R = new Rng(o.seed), floor = () => 0;
  const st = hex(o.stone), stone = { light: mix(scale(st, 1.35), WHITE, 0.08), body: st, shade: scale(st, 0.64), dust: mix(scale(st, 1.2), hex("#968c96"), 0.3) };
  const ps = new Particles({ rng: R, ground: floor, sparks: [F[7], F[6], F[4], F[3]] }), smoke = new Smoke(R), rocks = new Bits({ ground: floor }), lights = new Lights();
  const pal = { f: M[1], h: M[4], m: M[3], s: M[1], n: M[0], r: F[2], e: F[3], d: F[1], w: WHITE };
  let t = 0, emit = 0, hit = false;
  lights.add(PATH[0][0], PATH[0][1], 30, F[4], 0.7, 0.25);
  for (let i = 0; i < 6; i++) smoke.add({ x: PATH[0][0] + 2, y: PATH[0][1] + 2, vx: R.range(-30, 20), vy: R.range(-10, 15), r0: 2, r1: R.range(5, 7.5), life: R.range(1.2, 1.8), a: 0.6, warm: 1, rise: 8 });

  const blast = () => {
    const Y = -6;
    lights.add(0, Y - 2, 52, hex("#ffb060"), 0.8, 0.8);
    lights.add(0, Y - 2, 30, WHITE, 0.75, 0.1);
    for (let i = 0; i < 26; i++) {
      const a = R.range(0, TAU), d = R.range(0, 6), sp = R.range(30, 170);
      ps.spawn(P.FIRE, Math.cos(a) * d, Y + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.75 - 40, R.range(0.45, 0.95), 0, R.range(3.2, 6.5));
    }
    for (let i = 0; i < 5; i++) ps.spawn(P.FIRE, R.range(-3, 3), Y, R.range(-10, 10), -R.range(90, 150), R.range(0.7, 1.1), 0, R.range(4, 5.5), R.range(0, 0.08));
    for (let i = 0; i < 70; i++) {
      const a = R.range(Math.PI + 0.12, TAU - 0.12), sp = R.range(110, 280);
      ps.spawn(P.SPARK, 0, Y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.2, 0.65));
    }
    for (let i = 0; i < 22; i++) {
      const a = R.range(Math.PI, TAU), sp = R.range(30, 110);
      ps.spawn(P.EMBER, Math.cos(a) * 4, Y + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp - 50, R.range(0.9, 1.6), F[4]);
    }
    for (let i = 0; i < 16; i++)
      rocks.add({ kind: B.CHUNK, x: R.range(-5, 5), y: -2, vx: R.range(-110, 110), vy: -R.range(140, 290), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.5, 2.2), a: R.range(0, TAU), va: R.range(-16, 16), s: R.int(1, 2) });
    for (let i = 0; i < 60; i++) {
      const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.55, sp = R.range(80, 220) * (1 - 0.4 * Math.abs(u));
      ps.spawn(P.GRIT, u * 4, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.8), R.pick([stone.light, stone.body, stone.body, stone.shade]), R.chance(0.4) ? 2 : 1);
    }
    // the smoke: a column off the fire and dust rolling out along the floor, lit by the blast at first
    for (let i = 0; i < 18; i++) {
      const a = R.range(Math.PI * 1.15, Math.PI * 1.85), sp = R.range(20, 90);
      smoke.add({ x: Math.cos(a) * 4, y: Y + Math.sin(a) * 4, vx: Math.cos(a) * sp * 0.7, vy: Math.sin(a) * sp - 45 * (i / 18), r0: 3, r1: R.range(8, 14), life: R.range(1.7, 2.2), a: 0.62, b: 0.88, warm: 1, rise: 30 + i * 2, drag: 1.8, delay: R.range(0.05, 0.35) });
    }
    for (let i = 0; i < 12; i++) {
      const s = R.sign();
      smoke.add({ x: s * R.range(0, 6), y: -3, vx: s * R.range(60, 150), vy: -R.range(3, 12), r0: 2.5, r1: R.range(6, 9), life: R.range(1.1, 1.7), a: 0.5, b: 0.75, warm: 0.3, rise: 6, drag: 3 });
    }
  };

  return {
    update(dt) {
      t += dt;
      if (t < FLY) {
        // the trail: puffs left behind along the path, hanging where they're dropped, swelling and thinning
        const u = progress(t), [x, y] = at(u), h = heading(u), cx = Math.cos(h), cy = Math.sin(h), [px, py] = at(progress(Math.max(0, t - dt)));
        // one puff every pixel and a half of flight, wherever along this step it fell, so the trail has no beads
        for (emit += Math.hypot(x - px, y - py) / 1.5; emit > 1; emit--) {
          const f = (emit - 1) / Math.max(1e-6, Math.hypot(x - px, y - py) / 1.5), ex = x + (px - x) * f, ey = y + (py - y) * f;
          smoke.add({ x: ex - cx * 7 + R.range(-0.6, 0.6), y: ey - cy * 7 + R.range(-0.6, 0.6), vx: -cx * R.range(10, 30) + R.range(-6, 6), vy: -cy * R.range(10, 30) + R.range(-6, 6), r0: 1.4, r1: R.range(3.5, 6), life: R.range(1.5, 2.3), a: 0.5, b: 0.9, warm: 0.8, rise: 4, drag: 3, grow: 1.2 });
        }
        if (R.chance(0.35)) {
          const a = h + Math.PI + R.range(-0.5, 0.5), sp = R.range(40, 140);
          ps.spawn(P.SPARK, x - cx * 7, y - cy * 7, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.35));
        }
      } else if (!hit) {
        hit = true;
        blast();
      }
      for (const b of rocks.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R.range(-1, 1), -0.5, R.sign() * R.range(8, 30), -R.range(2, 14), R.range(0.3, 0.6), stone.dust, R.range(1.2, 2.2));
        }
      ps.update(dt);
      smoke.update(dt);
      rocks.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the scorch: white-hot where it hit, cooling through the fire to soot, fading late
      if (hit) {
        const k = t - FLY, fade = 1 - smooth(meta.duration - 1, meta.duration - 0.2, t), rx = 16 * Math.min(1, k / 0.06);
        for (let y = 0; y <= 2; y++)
          for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
            const d = Math.hypot((x + 0.5) / rx, (y + 0.5) / 4);
            if (d > 1) continue;
            const T = Math.pow(clamp(1 - k / 1.4), 1.4) * (1.25 - d) - rand(x * 31 + y, 3) * 0.35;
            p.dot(x, y, T > 0.06 ? F[Math.max(1, Math.min(8, Math.round(T * 8)))] : d < 0.5 ? hex("#0d0a12") : hex("#17121d"), fade);
          }
        const q = k / 0.45;
        if (q < 1) band(p, 0, 0.5, 60 * (1 - Math.pow(1 - q, 3)), 0.16, Math.max(1, 4 * (1 - q)), 1.15 - q, [stone.body, stone.light, F[4], F[7]], (g) => Math.sin(g) < 0);
      }
    },
    draw(p) {
      const list = smoke.puffs();
      cloud(p, list, SM, [SM[0], mix(F[1], SM[1], 0.5), mix(F[2], SM[2], 0.4), F[3], F[4], F[6], F[7]], { dens: 1.4, max: 0.82, lit: 1.4 });
      if (hit) {
        const q = (t - FLY) / 0.45;
        if (q < 1) band(p, 0, 0.5, 60 * (1 - Math.pow(1 - q, 3)), 0.16, Math.max(1, 4 * (1 - q)), 1.15 - q, [stone.body, stone.light, F[4], F[7]], (g) => Math.sin(g) >= 0);
      }
      for (const b of rocks.list) {
        const r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
        p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
          const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
          if (d > r + 0.9) return;
          const lit = dx * lx + dy * ly;
          out.c = d > r ? hex("#1a1422") : lit < -0.4 ? stone.light : lit > 0.6 ? stone.shade : stone.body;
          out.a = fade;
        });
      }
      ps.draw(p);
      if (t < FLY) {
        const u = progress(t), [x, y] = at(u), h = heading(u), cx = Math.cos(h), cy = Math.sin(h), fr = Math.floor(t * 30);
        // the motor: a short white-hot jet that flickers, the missile riding its heading
        const J = 5 + 3 * rand(fr, 7);
        for (let d = 0; d <= J; d += 0.5) {
          const v = d / J, c = v < 0.3 ? WHITE : v < 0.6 ? F[6] : F[4];
          p.dot(x - cx * (6.5 + d), y - cy * (6.5 + d), c);
          if (v < 0.5) p.dot(x - cx * (6.5 + d) - cy * 0.8, y - cy * (6.5 + d) + cx * 0.8, F[5]);
        }
        turnSprite(p, MISSILE, pal, x, y, h, 6, 2.5);
        p.glow(x - cx * 8, y - cy * 8, 18, F[4], 0.5);
        p.glow(x - cx * 7, y - cy * 7, 6, F[7], 0.5);
      }
      // the hit's flash: a white ball for two frames and a ring of flame
      const k = t - FLY;
      if (k >= 0 && k < 0.07) {
        const r = 14 * (0.8 + 0.2 * (1 - k / 0.07));
        p.circle(0, -6, r + 1.2, F[3]);
        p.circle(0, -6, r, k < 0.035 ? F[7] : F[6]);
        p.circle(0, -6, r * 0.6, k < 0.035 ? WHITE : F[7]);
      }
      if (k >= 0 && k < 0.3) {
        const rr = 8 + 30 * (1 - Math.pow(1 - k / 0.3, 3));
        p.ring(0, -6, rr, Math.max(1, 2.5 * (1 - k / 0.3) + 0.4), F[5], (v, ang) => (-6 + Math.sin(ang) * rr > 0 ? 0 : Math.min(1, (1 - k / 0.3) * 1.6)));
      }
      lights.draw(p);
    },
  };
}
