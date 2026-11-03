// The ground's part (grit thrown up that bounces and settles, stones that tumble and kick up dust where they land,
// dust rolling out along the floor and climbing) is adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, clamp, smooth, ease, rand, TAU, WHITE, hex, mix } from "../../core/index.mjs";
import { stoneShape, drawRock } from "./_lib.mjs";

export const meta = {
  name: "Quake",
  desc: "The ground jolts three times: a rift tears out along the floor glowing deep inside, slabs of floor heave up and drop back askew, pebbles hop and dust bursts out of the split.",
  tags: ["nature", "earth", "quake", "rift", "aoe", "ground", "one-shot"],
  size: [288, 104],
  origin: [144, 88],
  duration: 3.1,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0e0c14", "#1a1724", "#211d2d", "#2b2639", "#3a3450", "#4a4263", "#6a6088", "#8e86a8"],
    glow: ["#4a1a0c", "#a8401a", "#ff8a2a", "#ffd27a", "#fff4d0"],
    reach: 118,
    seed: 12,
  },
};

const JOLTS = [0.06, 0.5, 0.92], CLOSE = 2.2;

export function create(o) {
  const S = fit(o.palette, 8), G = fit(o.glow, 5), R = new Rng(o.seed), floor = () => 0, REACH = o.reach;
  const DUST = mix(S[6], hex("#8c8494"), 0.4), DUST2 = mix(S[5], hex("#6c6474"), 0.35);
  const ps = new Particles({ rng: R, ground: floor, sparks: [G[4], G[3], G[2], G[1]] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  // the rift: a jagged line out both ways, its depth into the floor at each step
  const rift = [];
  for (let x = -REACH; x <= REACH; x += R.range(2.5, 5)) rift.push([x, R.int(0, 2)]);
  const slabs = [];
  for (let x = -REACH + 8; x < REACH - 6; x += R.range(12, 17)) slabs.push({ x: x + R.range(-2, 2), y: 0, vy: 0, a: 0, va: 0, rest: true, s: R.range(4.5, 6), side: R.sign(), pts: [[-1, -0.38], [1, -0.42], [1.02, 0.4], [-0.98, 0.38]] });
  let t = 0, j = 0;
  const open = () => ease.outCubic(clamp((t - JOLTS[0]) / 0.45)) * REACH * (0.55 + 0.45 * smooth(JOLTS[1], JOLTS[1] + 0.3, t));
  const gap = (x) => (1 - smooth(CLOSE, CLOSE + 0.5, t)) * (1 + 2.6 * (1 - Math.abs(x) / REACH)) * (0.6 + 0.4 * smooth(JOLTS[1], JOLTS[2] + 0.2, t));
  const heat = () => smooth(0, 0.3, t) * (1 - smooth(1.4, CLOSE + 0.3, t)) * (0.8 + 0.2 * Math.sin(t * 17));
  const shake = () => JOLTS.reduce((s, tj, i) => (t > tj ? s + Math.exp(-(t - tj) * 9) * Math.sin((t - tj) * 80) * (1.6 - i * 0.3) : s), 0);
  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      while (j < JOLTS.length && t >= JOLTS[j]) {
        const k = 1 - j * 0.2, L = open() + 10;
        j++;
        lights.add(0, -2, 60, G[2], 0.5 * k, 0.5);
        lights.add(0, -2, 26, WHITE, 0.4 * k, 0.07);
        // the floor heaves: slabs along the split jump and twist, pebbles and stones hop, dust bursts out
        for (const s of slabs) {
          const d = Math.abs(s.x) / REACH;
          if (Math.abs(s.x) > L || R.chance(0.25 + d * 0.3)) continue;
          (s.rest = false), (s.vy = -R.range(70, 170) * k * (1 - d * 0.5)), (s.va = s.side * R.range(3, 8));
        }
        for (let i = 0; i < 70 * k; i++) {
          const x = R.range(-L, L), a = -Math.PI / 2 + R.range(-0.6, 0.6), sp = R.range(40, 200) * k;
          ps.spawn(P.GRIT, x, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.6, 1.2), R.pick([S[7], S[6], S[5], S[4]]), R.chance(0.35) ? 2 : 1);
        }
        for (let i = 0; i < 8 * k; i++) {
          const x = R.range(-L, L) * 0.8, a = -Math.PI / 2 + R.range(-0.9, 0.9), sp = R.range(100, 230) * k;
          bits.add({ kind: B.CHUNK, x, y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.5, bounce: 0.3, life: Math.min(R.range(1.1, 1.6), meta.duration - 0.1 - t), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1.6, 3.2), pts: stoneShape(R) });
        }
        for (let i = 0; i < 14 * k; i++) {
          const x = R.range(-L, L) * 0.9;
          ps.spawn(P.SMOKE, x, -R.range(1, 4), R.range(-40, 40), -R.range(15, 55) * k, R.range(1, 1.7), R.chance(0.5) ? DUST : DUST2, R.range(4, 7) * k, R.range(0, 0.15), PF.BIG);
        }
        for (let i = 0; i < 10 * k; i++) {
          const x = R.range(-L, L) * 0.7, a = -Math.PI / 2 + R.range(-1, 1), sp = R.range(120, 300);
          ps.spawn(P.SPARK, x, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.3));
        }
      }
      // between jolts the split keeps breathing grit and wisps of dust, embers float up out of it
      if (t > JOLTS[0] && t < CLOSE && R.chance(0.3 * f)) {
        const x = R.range(-1, 1) * open();
        ps.spawn(P.GRIT, x, -1, R.range(-20, 20), -R.range(20, 70), R.range(0.5, 0.8), R.pick([S[6], S[5]]), 1);
        if (R.chance(0.3)) ps.spawn(P.EMBER, x, -1, R.range(-10, 10), -R.range(20, 45), Math.min(R.range(0.6, 1.2), meta.duration - 0.1 - t), G[3], 1);
        if (R.chance(0.25)) ps.spawn(P.DUST, x, -1, R.range(-15, 15), -R.range(4, 14), R.range(0.5, 0.8), DUST2, R.range(2, 3.5));
      }
      for (const s of slabs) {
        if (s.rest) continue;
        s.vy += 950 * dt;
        s.y += s.vy * dt;
        s.a += s.va * dt;
        if (s.y >= 0 && s.vy > 0) {
          s.y = 0;
          s.a = clamp(s.a, -0.45, 0.45);
          if (s.vy > 160) (s.vy *= -0.25), (s.va *= -0.4);
          else {
            s.rest = true;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, s.x + R.range(-5, 5), -0.5, R.sign() * R.range(10, 40), -R.range(2, 12), R.range(0.4, 0.7), DUST2, R.range(1.5, 3));
          }
        }
      }
      bits.update(dt);
      for (const b of bits.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          ps.spawn(P.DUST, b.x, -0.5, R.sign() * R.range(8, 30), -R.range(2, 10), Math.min(R.range(0.3, 0.6), meta.duration - 0.1 - t), DUST2, R.range(1.3, 2.4));
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the rift: lit along its upper lip, dark inside with a deep glow, opening out from the middle
      const L = open(), hk = heat(), jx = shake(), fade = 1 - smooth(CLOSE + 0.3, CLOSE + 0.7, t);
      if (t > JOLTS[0])
        for (let i = 1; i < rift.length; i++) {
          const [x0, d0] = rift[i - 1], [x1, d1] = rift[i];
          if (Math.abs(x0) > L) continue;
          for (let x = Math.ceil(x0); x < x1; x++) {
            const u = (x - x0) / (x1 - x0), d = Math.round(d0 + (d1 - d0) * u), w = gap(x), X = x + jx;
            if (w < 0.4) {
              p.dot(X, d, S[1], fade);
              continue;
            }
            p.dot(X, d - 1, S[6], fade);
            const deep = rand(Math.floor(x / 3), 41) + (w - 1.5) * 0.35, hot = hk * clamp(deep - 0.35, 0, 1) * 1.6;
            for (let y = 0; y < w; y++) p.dot(X, d + y, y > w / 2 - 1 && hot > 0.25 ? (hot > 0.9 && rand(x, Math.floor(t * 12)) < 0.6 ? G[3] : G[2]) : y > w / 2 - 1 && hot > 0.08 ? G[1] : S[0], fade);
            p.dot(X, d + Math.ceil(w), S[2], fade);
          }
          if (i % 3 === 0 && hk > 0) p.glow(x1 + jx, d1 + 1, 9, G[2], 0.35 * hk * (1 - Math.abs(x1) / (REACH * 1.2)));
        }
      ps.draw(p, "back");
    },
    draw(p) {
      // slabs of floor heaved up out of it, tilted, sinking back as it closes
      const jx = shake(), sink = smooth(CLOSE, CLOSE + 0.6, t);
      for (const s of slabs) if (!(s.rest && s.a === 0 && s.y === 0) && sink < 1) drawRock(p, s.x + jx, s.y - 1.5 + sink * 4, s.s, s.a, s.pts, S, 1 - sink);
      for (const b of bits.list) drawRock(p, b.x, b.y, b.s, b.a, b.pts, S, Math.min(1, b.life / 0.4));
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
