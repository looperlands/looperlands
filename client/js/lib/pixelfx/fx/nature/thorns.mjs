// The wave (spikes punching up one after another, each bigger, with overshoot, a white frame, a burst of debris
// and glints, a line running along the floor ahead of them) is adapted from Sprite Fusion's open-source ice
// spikes (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, clamp, smooth, ease, rand, TAU, WHITE } from "../../core/index.mjs";
import { drawRock, stoneShape, drawLeaf } from "./_lib.mjs";

export const meta = {
  name: "Thorns",
  desc: "A seam races along the floor and hooked thorns punch up out of it one after another, each bigger than the last, in bursts of dirt and green light; they hold, then sink.",
  tags: ["nature", "thorns", "plant", "spikes", "ground", "attack", "one-shot"],
  size: [232, 92],
  origin: [48, 78],
  duration: 2.4,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#160c0e", "#2e1418", "#4e2224", "#743a30", "#9a5a3e", "#c08458", "#e2b484", "#fbe8c8"],
    glow: ["#123818", "#2f7a2a", "#6cb83a", "#c8f070"],
    soil: ["#120c0c", "#251917", "#3b2a24", "#553d31", "#715440", "#8f6e52", "#b8966e", "#e6d0a8"],
    count: 6,
    seed: 8,
  },
};

const RISE = 0.11, SINK = 0.36;

// a hooked thorn: a hardwood horn tapering from its foot, its point hooked forward; lit down its left edge with a
// bright ridge, shaded on the right, grain running up it, a pale point, a barb off its back, a dark rim
function thorn(p, s, h, C, opts) {
  if (h < 1.5) return;
  const { x, w, hook, lean } = s, base = opts.base ?? 0, white = opts.white;
  const cx = (u) => x + lean * u + hook * Math.pow(u, 2.4), hw = (u) => (w / 2) * Math.pow(1 - u, 0.9) + 0.25;
  const inside = (px, py) => {
    const u = (base - (py + 0.5)) / h;
    if (u < 0 || u > 1 || py + 0.5 > 0) return false;
    const c = cx(u), fx = px + 0.5;
    return Math.abs(fx - c) <= hw(u);
  };
  const X0 = Math.floor(x - w - 6), X1 = Math.ceil(x + w / 2 + Math.abs(lean) + Math.abs(hook) + 2);
  for (let py = Math.floor(base - h) - 1; py <= Math.min(0, Math.ceil(base)); py++)
    for (let px = X0; px <= X1; px++) {
      if (!inside(px, py)) {
        if (py <= 0 && (inside(px - 1, py) || inside(px + 1, py) || inside(px, py + 1) || inside(px, py - 1))) p.dot(px, py, C[0], opts.a ?? 1);
        continue;
      }
      if (white) {
        p.px(px, py, WHITE);
        continue;
      }
      const u = (base - (py + 0.5)) / h, c = cx(u), r = hw(u), q = (px + 0.5 - (c - r)) / (2 * r);
      let i = q < 0 ? 4 : q < 0.16 ? 6 : q < 0.36 ? 5 : q < 0.46 ? 7 : q < 0.7 ? 4 : q < 0.86 ? 3 : 2;
      if (u > 0.86) i = q < 0.6 ? 7 : 5;
      if (i < 7 && i > 2 && rand(px, Math.floor((py + 0.5 - base) / 3), s.seed) < 0.12) i -= 1;
      p.px(px, py, C[i]);
    }
  // a barb off its back, raking up and away
  if (!white && h > 14) {
    const u0 = 0.34, u1 = 0.46, y0 = base - u0 * h, y1 = base - u1 * h, e0 = cx(u0) - hw(u0), e1 = cx(u1) - hw(u1), L = w * 0.45;
    if (y0 <= 0) {
      p.tri(e0 + 0.5, y0, e1 + 0.5, y1, e1 - L, y1 - L * 0.7, C[3]);
      p.line(e1, y1, e1 - L, y1 - L * 0.7, C[6]);
      p.px(e1 - L, y1 - L * 0.7, C[7]);
      p.line(e0, y0 + 1, e1 - L + 1, y1 - L * 0.7 + 1, C[0]);
    }
  }
}

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.glow, 4), S = fit(o.soil, 8), R = new Rng(o.seed), floor = () => 0, n = Math.max(2, o.count);
  const ps = new Particles({ rng: R, ground: floor, sparks: [G[3], G[2], G[1], G[0]] });
  const lights = new Lights(), chips = [];
  const list = Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1), h = 12 + 36 * k + R.range(-1.5, 1.5);
    return { x: 10 + i * (104 / (n - 1)) + R.range(-3, 3), h, w: 6 + 9 * k, lean: R.range(-1, 1.5) + k * 2, hook: h * R.range(0.14, 0.22), at: 0.12 + i * 0.075, sink: 1.45 + i * 0.06, seed: R.int(1, 999), up: false, down: false };
  });
  const reach = list[n - 1].x + 8;
  let t = 0;
  const chip = (x, sp, nn) => {
    for (let i = 0; i < nn; i++) {
      const a = -Math.PI / 2 + R.range(-1.1, 1.1), v = R.range(60, 210) * sp;
      chips.push({ x: x + R.range(-3, 3), y: -1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: R.range(0, TAU), va: R.range(-15, 15), s: R.range(1.3, 2.6) * Math.sqrt(sp), pts: stoneShape(R), life: Math.min(R.range(0.7, 1.1), meta.duration - 0.05 - t) });
    }
  };
  const grown = (s) => (t < s.at ? 0 : ease.outBack(clamp((t - s.at) / RISE), 2.4));
  const sunk = (s) => smooth(s.sink, s.sink + SINK, t);
  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      for (const s of list) {
        const k = s.h / 48;
        if (!s.up && t >= s.at) {
          s.up = true;
          lights.add(s.x, -s.h * 0.5, 18 + 18 * k, WHITE, 0.45, 0.08);
          lights.add(s.x, -s.h * 0.4, 26 + 26 * k, G[2], 0.45, 0.4);
          chip(s.x, 0.6 + 0.6 * k, 3 + Math.round(5 * k));
          for (let i = 0; i < 10 + 18 * k; i++) {
            const a = -Math.PI / 2 + R.range(-1, 1), v = R.range(60, 230) * (0.6 + 0.6 * k);
            ps.spawn(P.GRIT, s.x + R.range(-s.w / 3, s.w / 3), -1, Math.cos(a) * v, Math.sin(a) * v, R.range(0.6, 1.1), R.pick([S[5], S[4], S[3]]), R.chance(0.3) ? 2 : 1);
          }
          for (let i = 0; i < 3 + 5 * k; i++) ps.spawn(P.SMOKE, s.x + R.range(-4, 4), -R.range(1, 4), R.sign() * R.range(20, 80), -R.range(5, 25), R.range(0.7, 1.2), S[5], R.range(3, 5.5) * (0.6 + 0.5 * k), 0, 0);
          for (let i = 0; i < 2 + 3 * k; i++) ps.spawn(P.STAR, s.x + s.hook * 0.8 + R.range(-3, 3), -s.h * R.range(0.5, 1), R.range(-10, 10), -R.range(5, 20), R.range(0.3, 0.6), G[3], R.range(0.8, 2), R.range(0, 0.12));
          for (let i = 0; i < 4; i++) ps.spawn(P.MOTE, s.x + R.range(-3, 3), -R.range(2, s.h * 0.6), R.range(-20, 20), -R.range(30, 70), R.range(0.4, 0.8), G[3], 0.7);
        }
        if (!s.down && t >= s.sink) {
          s.down = true;
          chip(s.x, 0.35, 2 + Math.round(2 * k));
          for (let i = 0; i < 3 + 3 * k; i++) ps.spawn(P.DUST, s.x + R.range(-s.w / 2, s.w / 2), -R.range(0, 3), R.sign() * R.range(15, 50), -R.range(2, 10), Math.min(R.range(0.4, 0.7), meta.duration - 0.05 - t), S[5], R.range(2, 4));
        }
        // while they stand, glints run up their lit edges
        if (s.up && !s.down && t > s.at + 0.2 && R.chance(0.05 * f)) ps.spawn(P.STAR, s.x + s.lean * 0.5 - s.w * 0.15, -s.h * R.range(0.3, 0.8), 0, -3, R.range(0.25, 0.45), C[7], R.range(0.8, 1.8));
      }
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        if ((c.life -= dt) <= 0) chips.splice(i, 1);
        c.vy += 950 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.a += c.va * dt;
        if (c.y > 0 && c.vy > 0) c.vy > 120 ? ((c.y = 0), (c.vy *= -0.3), (c.vx *= 0.6), (c.va *= 0.5)) : ((c.y = 0), (c.vy = c.vx = c.va = 0));
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the seam racing ahead along the floor: a dark split with a green glow in it, closing up again at the end
      const run = ease.outCubic(clamp((t - 0.04) / 0.5)) * reach, fade = 1 - smooth(1.9, 2.3, t);
      for (let x = -2; x <= run; x++) {
        const hot = clamp(1 - (run - x) / 18) * (1 - smooth(0.6, 1.2, t)), h = rand(x, 31);
        p.dot(x, 0, hot > 0.4 ? G[3] : hot > 0.1 ? G[2] : S[0], fade);
        if (h < 0.5) p.dot(x, 1, S[1], fade * 0.8);
        if (h < 0.15) p.dot(x, -1, S[4], fade);
        if (hot > 0.3 && (x & 3) === 0) p.glow(x, 0, 6, G[2], 0.3 * hot);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      for (const s of list) {
        const g = grown(s), k = sunk(s);
        if (g <= 0 || k >= 1) continue;
        thorn(p, s, s.h * g, C, { white: t - s.at < 0.035, base: k * s.h * 1.05 });
        if (t - s.at < 0.3) p.glow(s.x, -s.h * 0.5 * g, s.h * 0.6 + 6, G[2], 0.35 * (1 - (t - s.at) / 0.3));
        // a collar of leaves round its foot, unfurling as it comes up and folding away as it sinks
        const lk = clamp((t - s.at - 0.04) / 0.18) * (1 - k), lw = s.w * 0.5;
        if (lk > 0.05)
          for (const [sd, a0, sz] of [[-1, -2.5, 1], [1, -0.55, 0.9], [-1, -1.9, 0.7]]) {
            const la = a0 + sd * 0.25 * (1 - lk) + Math.sin(t * 4 + s.x) * 0.06, L = (5 + s.w * 0.45) * sz * lk;
            drawLeaf(p, s.x + sd * lw + Math.cos(la) * L * 0.5, -1 + Math.sin(la) * L * 0.5, L, 1.4 + s.w * 0.1 * sz, la, 0.35, [G[0], G[1], G[2], G[3]]);
          }
        p.glow(s.x, -2, s.w + 6, G[2], 0.18 * lk);
      }
      for (const c of chips) drawRock(p, c.x, c.y, c.s, c.a, c.pts, S, Math.min(1, c.life / 0.25));
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
