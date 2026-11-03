// The impact's particle recipe (fire puffs that cool into smoke, sparks, embers, burning brands that land and
// keep burning, rocks, grit, dust, scorch) is adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, Blazes, P, PF, B, Rng, fit, band, flare, clamp, smooth, ease, noise, rand, TAU, WHITE, hex, mix, scale, rgb } from "../../core/index.mjs";
import { hotFirst, flameBlade, simDraw, floorLight, LAYERS } from "./_lib.mjs";

export const meta = {
  name: "Meteor",
  desc: "A burning rock streaks in from the upper left in a comet of fire and smashes into the floor: a white flash, a fireball, rocks and brands thrown, a glowing crater that cools.",
  tags: ["fire", "meteor", "impact", "explosion", "spell", "debris", "one-shot"],
  size: [272, 232],
  origin: [150, 208],
  duration: 5,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    stone: "#4a3f69",
    rock: ["#120e16", "#2a2230", "#463a4a", "#6a5a66"],
    seed: 9,
  },
};

const HIT = 0.62, FROM = [-112, -142], SOOT = hex("#0d0a12"), SOOT2 = hex("#17121d"), OUTLINE = hex("#1a1422"), WARM = rgb(255, 176, 96);

function stone(c) {
  c = hex(c);
  return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3) };
}
function rock(p, b, st) {
  const r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
  p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
    const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
    if (d > r + 0.9) return;
    const lit = dx * lx + dy * ly;
    out.c = d > r ? OUTLINE : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body;
    out.a = fade;
  });
}

export function create(o) {
  const F = fit(o.palette, 9), H = hotFirst(F), RK = fit(o.rock, 4), st = stone(o.stone), R = new Rng(o.seed), floor = () => 0, S = o.seed * 11;
  let blazes;
  const ps = new Particles({ rng: R, ground: floor, sparks: [H[1], H[2], H[4], H[5]], onLand: (x, y) => blazes.add(x, y - 0.25, R.range(0.9, 1.6), R.range(0.5, 0.85)) });
  blazes = new Blazes(ps);
  const bits = new Bits({ ground: floor }), lights = new Lights(), GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25);
  const len = Math.hypot(FROM[0], FROM[1]), ux = -FROM[0] / len, uy = -FROM[1] / len;
  // the flight: speeding up a touch as it falls
  const pos = (tt) => {
    const k = ease.inQuad(clamp(tt / HIT)) * 0.35 + clamp(tt / HIT) * 0.65;
    return [FROM[0] * (1 - k), FROM[1] * (1 - k)];
  };
  let t = 0, hit = false, last = pos(0);

  // the meteor: a lumpy rock, white-hot on its leading face, cracks glowing over the dark back, an outline
  const meteor = (p, x, y, R0, cool, alpha = 1) => {
    p.shade(x - R0 - 2, y - R0 - 2, x + R0 + 2, y + R0 + 2, (px, py, out) => {
      out.a = alpha;
      const dx = px - x, dy = py - y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = R0 * (1 + 0.18 * noise(a * 2.2 + 3, S) + 0.1 * noise(a * 5, S + 1));
      if (d > rr + 1) return;
      if (d > rr) return OUTLINE;
      const face = (dx * ux + dy * uy) / Math.max(1, d), heat = (1 - cool) * (face * 0.6 + 0.5 - (d / rr) * 0.25);
      if (heat > 0.62) return heat > 0.85 ? H[0] : heat > 0.74 ? H[1] : H[2];
      if (heat > 0.42) return H[4];
      const h = rand(Math.floor(px - x), Math.floor(py - y), S + 3);
      if (h < 0.22 * (1 - cool * 0.7)) return (1 - cool) > 0.5 ? H[4] : H[6];
      return dx * -0.6 + dy * -0.8 > 0 ? RK[2] : d / rr > 0.6 ? RK[0] : RK[1];
    });
  };
  // the crater: hot rock pooled in the dent cooling to soot, a lip of broken floor
  const crater = (p) => {
    if (t < HIT) return;
    const a = t - HIT, end = 1 - smooth(meta.duration - 1, meta.duration - 0.15, t), rx = 36 * Math.min(1, a / 0.08), ry = 6;
    for (let y = -1; y <= 3; y++)
      for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
        const dx = (x + 0.5) / rx, dy = (y + 0.5) / ry, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        const k = rand(x * 31 + y, S + 5), T = Math.pow(clamp(1 - a / 2.6), 1.3) * (1.25 - d) - k * 0.35;
        if (T > 0.06) {
          const ramp = [H[0], H[1], H[2], H[3], H[4], H[5], H[6], H[7], H[8]], c = ramp[Math.min(8, Math.floor((1 - Math.min(1, T)) * 8))];
          p.dot(x, y, c, end);
          if ((x & 3) === 0) p.glow(x + 0.5, y, 7, c, 0.2 * T * end);
        } else p.dot(x, y, d < 0.55 ? SOOT : SOOT2, (d < 0.95 - k * 0.3 ? 1 : 1 - d) * end);
      }
    // the lip: broken floor heaped round the edge, lit by the glow inside
    for (let x = -40; x <= 40; x++) {
      const e = Math.abs(x) / 40, hh = e < 0.7 ? 0 : Math.round(2.4 * Math.sin(((e - 0.7) / 0.3) * Math.PI) * (0.6 + 0.4 * rand(x, S + 7)));
      for (let j = 0; j < hh; j++) p.dot(x, -1 - j, j === hh - 1 ? mix(st.light, H[4], 0.5 * clamp(1 - a / 2)) : st.shade, end);
      if (hh) p.dot(x, 0, OUTLINE, end);
    }
  };

  return {
    update(dt) {
      t += dt;
      if (t < HIT) {
        // the flight: a comet of fire shed behind, smoke, sparks, embers
        const [x, y] = pos(t), vx = (x - last[0]) / dt, vy = (y - last[1]) / dt;
        last = [x, y];
        for (let i = 0; i < 3; i++) {
          if (!R.chance(0.8 * dt * 60)) continue;
          ps.spawn(P.FIRE, x - ux * R.range(2, 8) + R.range(-3, 3), y - uy * R.range(2, 8) + R.range(-3, 3), vx * 0.15 + R.range(-20, 20), vy * 0.15 + R.range(-30, 10), R.range(0.3, 0.6), 0, R.range(3, 6), 0, R.chance(0.65) ? PF.SMOKES | PF.BIG : 0);
        }
        if (R.chance(0.6 * dt * 60)) ps.spawn(P.SPARK, x, y, vx * 0.35 + R.range(-80, 80), vy * 0.35 + R.range(-80, 40), R.range(0.2, 0.5));
        if (R.chance(0.3 * dt * 60)) ps.spawn(P.EMBER, x, y, vx * 0.1 + R.range(-30, 30), vy * 0.1 + R.range(-40, 0), R.range(0.8, 1.6), H[3], R.chance(0.2) ? 2 : 1);
      } else if (!hit) {
        hit = true;
        // the impact: flash, fireball thrown up and forward with the rock's momentum, a column, smoke, sparks
        lights.add(0, -40, 100, WARM, 0.95, 0.9);
        lights.add(0, -20, 46, WHITE, 0.9, 0.12);
        for (let i = 0; i < 34; i++) {
          const a = -Math.PI / 2 + R.range(-1.3, 1.3) + 0.25, sp = R.range(50, 210);
          ps.spawn(P.FIRE, R.range(-6, 6), -R.range(2, 10), Math.cos(a) * sp, Math.sin(a) * sp * 0.75 - 30, R.range(0.5, 1.1), 0, R.range(5, 9), 0, R.chance(0.5) ? PF.SMOKES | PF.BIG : 0);
        }
        for (let i = 0; i < 9; i++) ps.spawn(P.FIRE, R.range(-6, 6), -6, R.range(-14, 14), -R.range(130, 220), R.range(0.8, 1.2), 0, R.range(6, 8.5), R.range(0, 0.12), PF.SMOKES | PF.BIG);
        for (let i = 0; i < 20; i++) {
          const a = R.range(-Math.PI, 0), d = R.range(4, 18);
          ps.spawn(P.SMOKE, Math.cos(a) * d, -R.range(6, 24), Math.cos(a) * R.range(10, 40), -R.range(30, 110), R.range(1.8, 2.8), 0, R.range(8, 12), R.range(0.15, 0.5), PF.BIG);
        }
        for (let i = 0; i < 16; i++) {
          const s = R.sign();
          ps.spawn(P.SMOKE, s * R.range(4, 18), -R.range(1, 5), s * R.range(60, 130) + 10, -R.range(2, 12), R.range(1.2, 2.0), st.dust, R.range(5, 8), R.range(0, 0.06), PF.BIG);
        }
        for (let i = 0; i < 90; i++) {
          const a = -Math.PI / 2 + R.range(-1.3, 1.3) + 0.15, sp = R.range(100, 300);
          ps.spawn(P.SPARK, 0, -4, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.7));
        }
        for (let i = 0; i < 36; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 150);
          ps.spawn(P.EMBER, Math.cos(a) * 8, -8 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 70, R.range(1.2, 2.6), H[3]);
        }
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + R.range(-1, 1.05), sp = R.range(130, 240);
          ps.spawn(P.BRAND, 0, -6, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.7, 1.3));
        }
        for (let i = 0; i < 28; i++)
          bits.add({ kind: B.CHUNK, x: R.range(-8, 8), y: -3, vx: R.range(-80, 110), vy: -R.range(140, 340), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.8, 2.8), a: R.range(0, TAU), va: R.range(-16, 16), s: R.int(1, 3), ramp: [OUTLINE, st.shade, st.body, st.light, mix(st.light, WHITE, 0.3)] });
        for (let i = 0; i < 80; i++) {
          const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.7 + 0.15, sp = R.range(90, 270) * (1 - 0.4 * Math.abs(u));
          ps.spawn(P.GRIT, u * 6, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.2, 2.2), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.45) ? 2 : 1);
        }
      }
      bits.update(dt);
      for (const b of bits.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 18), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.6));
        }
      blazes.update(dt);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      crater(p);
      simDraw(p, ps, H, "back");
      blazes.drawBack(p);
      const k = (t - HIT) / 0.5;
      if (k > 0 && k < 1) band(p, 0, 0.5, 110 * ease.outCubic(k), 0.16, Math.max(1, 5 * (1 - k)), 1.15 - k, [st.body, st.light, H[4], H[1]], (g) => Math.sin(g) < 0);
    },
    draw(p) {
      const k = (t - HIT) / 0.5;
      if (k > 0 && k < 1) band(p, 0, 0.5, 110 * ease.outCubic(k), 0.16, Math.max(1, 5 * (1 - k)), 1.15 - k, [st.body, st.light, H[4], H[1]], (g) => Math.sin(g) >= 0, k < 0.12);
      for (const b of bits.list) rock(p, b, st);
      if (t < HIT) {
        // the comet: tongues of flame streaming back off the rock, the rock, its light; the floor lights up below
        const [x, y] = pos(t), NZ = (rate, seed = 0, off = 0) => noise(t * rate + off, seed);
        floorLight(p, 0, 0.5, 30 + 40 * (t / HIT), 7, GLOW, 0.5 * (t / HIT) ** 2);
        [[36, 7, 0], [26, 7.5, -2.5], [26, 7.5, 2.5], [16, 8, 0]].forEach(([L, w, off], i) => {
          const n = (S + i) * 13;
          flameBlade(p, x - uy * off, y + ux * off, -ux, -uy, L * (0.85 + 0.25 * NZ(5, n)), w, NZ(3, n + 3) * 3, NZ, n, H, LAYERS, 0.5, 1.6);
        });
        meteor(p, x, y, 6.5, 0);
        p.glow(x, y, 46, GLOW, 0.55);
        p.glow(x, y, 12, H[1], 0.4);
      } else {
        // the core of the meteor sits half-buried in the crater, cooling
        const a = t - HIT, cool = clamp(a / 2.8), end = 1 - smooth(meta.duration - 1.1, meta.duration - 0.2, t);
        if (end > 0) {
          meteor(p, 0, 0, 5.5, cool, end);
          p.glow(0, -2, 22, GLOW, 0.4 * (1 - cool) * end);
        }
      }
      simDraw(p, ps, H, "front");
      // the hero frame: a white-hot flash and a flare of rays
      const f = (t - HIT) / 0.08;
      if (f > 0 && f < 1) {
        p.circle(0, -6, 11 * (1 - f * 0.3) + 1.5, H[3]);
        p.circle(0, -6, 11 * (1 - f * 0.3), f < 0.5 ? H[1] : H[2]);
        p.circle(0, -6, 7 * (1 - f * 0.3), f < 0.5 ? WHITE : H[1]);
      }
      const fr = (t - HIT) / 0.24;
      if (fr > 0 && fr < 1) flare(p, 0, -6, 44 * Math.pow(1 - fr, 1.4), 1 - fr, [H[6], H[4], H[2], H[1]]);
      lights.draw(p);
    },
  };
}
