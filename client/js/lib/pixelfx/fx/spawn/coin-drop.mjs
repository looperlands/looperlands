// The coin's spin (squashed toward its edge), glints and burst of light, and the soft smoke of the poof, follow
// Sprite Fusion's open-source pickup (https://www.spritefusion.com/pixel-art-vfx/pickup), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, flare, sparkle, clamp, smooth, ease, TAU, WHITE, hex } from "../../core/index.mjs";

export const meta = {
  name: "Coin drop",
  desc: "An enemy goes up in a soft poof and gold coins spin out of it, bounce with a glint on each hit, settle on the floor, twinkle, and wink out one by one.",
  tags: ["spawn", "death", "loot", "coins", "gold", "drop", "pickup", "ground", "one-shot"],
  size: [160, 88],
  origin: [80, 78],
  duration: 3,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#2a1606", "#5c3208", "#9a5a0c", "#d48c14", "#f5b82a", "#ffe066", "#fff6c4", "#ffffff"],
    smoke: ["#3a3450", "#6c6688", "#a8a2c0", "#dcd8ea"],
    coins: 7,
    seed: 23,
  },
};

const CY = -16;
// an original coin: a rim, a lit face, a raised mark in the middle
const COIN = ["..oooo..", ".ohhlmo.", "ohlmmmdo", "ohmdhmdo", "olmdhmdo", "olmmmmdo", ".oddddo.", "..oooo.."];
// lying flat on the floor, seen from the side
const FLAT = [".lhhhl.", "olmmmdo", ".odddo."];

export function create(o) {
  const C = fit(o.palette, 8), SM = fit(o.smoke, 4), R = new Rng(o.seed), floor = () => 0;
  const PAL = { o: C[1], h: C[6], l: C[5], m: C[4], d: C[3] };
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[6], C[5], C[3]] }), lights = new Lights();
  const coins = [], balls = [];
  // the poof the enemy goes up in
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + R.range(-0.25, 0.25), sp = R.range(60, 100);
    const life = R.range(0.55, 0.85);
    balls.push({ x: Math.cos(a) * 2, y: CY + Math.sin(a) * 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 10, r: R.range(4, 6), life, max: life });
  }
  // the coins: thrown up and out, each spinning at its own rate
  const n = o.coins;
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) - 0.5 : 0, a = -Math.PI / 2 + u * 1.6 + R.range(-0.1, 0.1), sp = R.range(230, 300);
    coins.push({ x: R.range(-3, 3), y: CY, vx: Math.cos(a) * sp * 0.4, vy: Math.sin(a) * sp, ph: R.range(0, TAU), w: R.range(9, 15) * R.sign(), rest: false, hits: 0, out: 2.15 + i * 0.07 + R.range(0, 0.1), glint: R.range(1.2, 1.9), born: R.range(0.04, 0.12) });
  }
  for (let i = 0; i < 8; i++) {
    const a = R.range(0, TAU), sp = R.range(50, 120);
    ps.spawn(P.STAR, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.3, 0.6), R.pick([WHITE, C[6], C[5]]), R.range(0.8, 1.8));
  }
  lights.add(0, CY, 44, C[4], 0.7, 0.4);
  lights.add(0, CY, 20, WHITE, 0.7, 0.1);
  let t = 0;

  // a coin turning in the air: its face squashed toward the edge, the rim showing when it's side-on
  function drawCoin(p, x, y, ph) {
    const c = Math.cos(ph), sx = Math.abs(c);
    if (sx < 0.28) {
      for (let dy = -3; dy <= 3; dy++) p.px(x, y + dy, Math.abs(dy) === 3 ? C[1] : dy < 0 ? C[6] : C[5]);
      if (sx > 0.12) for (let dy = -2; dy <= 2; dy++) p.px(x + (c > 0 ? 1 : -1), y + dy, C[3]);
      return;
    }
    const half = 4 * sx;
    for (let px = Math.floor(x - half); px < Math.ceil(x + half); px++) {
      let col = Math.floor((px + 0.5 - x) / sx + 4);
      if (col < 0 || col > 7) continue;
      if (c < 0) col = 7 - col;
      for (let row = 0; row < 8; row++) {
        const ch = COIN[row][col];
        if (ch !== ".") p.px(px, Math.round(y - 4 + row), PAL[ch]);
      }
    }
  }

  return {
    update(dt) {
      t += dt;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        if ((b.life -= dt) <= 0) {
          balls.splice(i, 1);
          continue;
        }
        b.vx -= b.vx * 7 * dt;
        b.vy -= b.vy * 7 * dt + 26 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      for (const c of coins) {
        // a coin winks out with a little burst of gold
        if (!c.gone && t >= c.out) {
          c.gone = true;
          for (let j = 0; j < 5; j++) {
            const a = R.range(-Math.PI, 0), sp = R.range(25, 60);
            ps.spawn(P.STAR, c.x, -3, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.3, 0.55), R.pick([WHITE, C[6], C[5]]), R.range(0.7, 1.4));
          }
          lights.add(c.x, -3, 14, C[5], 0.6, 0.2);
        }
        if (t < c.born || t > c.out || c.rest) continue;
        c.vy += 820 * dt;
        c.vx -= c.vx * 0.4 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.ph += c.w * dt;
        if (c.y >= -1.5 && c.vy > 0) {
          c.y = -1.5;
          c.hits++;
          // a tink of light and a puff of dust at each hit
          ps.spawn(P.STAR, c.x, -3, 0, -8, 0.25, WHITE, c.hits === 1 ? 2.2 : 1.4);
          for (let j = 0; j < 2; j++) ps.spawn(P.DUST, c.x + R.range(-1, 1), -0.5, R.sign() * R.range(8, 24), -R.range(2, 8), R.range(0.25, 0.45), SM[1], R.range(1, 1.8));
          lights.add(c.x, -3, 12, C[5], 0.5, 0.15);
          if (c.vy > 110) (c.vy *= -0.45), (c.vx *= 0.7), (c.w = c.w * 0.8 + R.range(-2, 2));
          else (c.rest = true), (c.vx = c.vy = 0), (c.restAt = t);
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // a warm gleam on the floor where the coins lie
      for (const c of coins)
        if (c.rest && t < c.out) p.glow(c.x, -1, 7, C[4], 0.18);
      ps.draw(p, "back");
    },
    draw(p) {
      // the poof: soft, top-lit balls, a pop of light in the middle
      for (const layer of [0, 1, 2])
        for (const b of balls) {
          const age = b.max - b.life, k = b.life / b.max, r = b.r * (0.6 + 0.6 * ease.outCubic(clamp(age / 0.2))) * (k < 0.35 ? k / 0.35 : 1);
          if (r < 0.6) continue;
          if (layer === 0) p.disc(b.x + r * 0.15, b.y + r * 0.2, r, SM[1], 0.8);
          else if (layer === 1) p.disc(b.x - r * 0.06, b.y - r * 0.08, r * 0.86, b.y > CY + 2 ? SM[1] : SM[2], 0.85);
          else if (b.y < CY + 2) p.disc(b.x - r * 0.28, b.y - r * 0.34, r * 0.4, SM[3], 0.85);
        }
      if (t < 0.07) {
        const k = t / 0.07;
        p.circle(0, CY, 8 + 2 * k, C[6]);
        p.circle(0, CY, 6 + 2 * k, WHITE);
        flare(p, 0, CY, 16 * (1 - k * 0.5), 1 - k, C);
      }
      for (const c of coins) {
        if (t < c.born || t > c.out + 0.12) continue;
        if (t > c.out) {
          // a coin winks out with a last flash and a ring
          const k = (t - c.out) / 0.12;
          sparkle(p, c.x, -2, Math.round(5 * (1 - k)), WHITE, C[5], 0.5);
          p.ring(c.x, -3, 2 + 5 * ease.outCubic(k), 1, C[6], 1.1 - k);
          continue;
        }
        if (c.rest) {
          // flat on the floor; now and then a glint runs over it
          p.sprite(FLAT, PAL, Math.round(c.x) - 3, -3);
          p.glow(c.x, -2, 6, C[5], 0.25);
          const g = ((t - c.restAt + c.glint) % 0.95) / 0.95;
          if (g < 0.2) sparkle(p, c.x - 1, -3, Math.round(3 * Math.sin((g / 0.2) * Math.PI)), WHITE, C[5], 0.4);
        } else {
          drawCoin(p, c.x, c.y, c.ph);
          p.glow(c.x, c.y, 8, C[4], 0.3);
          // a glint catches the face as it turns toward us
          if (Math.abs(Math.cos(c.ph)) > 0.96) p.px(c.x - 1, c.y - 2, WHITE);
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
