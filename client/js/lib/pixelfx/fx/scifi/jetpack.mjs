// The exhaust (flame puffs cooling down the fire ramp into smoke, a warm light over the smoke) follows Sprite
// Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { P, PF, Rng, fit, tileFbm, clamp, lerp, rand, mix, TAU, WHITE } from "../../core/index.mjs";
import { Ghosts } from "./_lib.mjs";

export const meta = {
  name: "Jetpack",
  desc: "Twin thrusters fire straight down: white-hot cores with shock diamonds inside ragged flames, puffs that cool into smoke billowing below, lit by the fire.",
  tags: ["scifi", "jetpack", "thrust", "rocket", "fire", "smoke", "flight", "loop"],
  size: [96, 116],
  origin: [48, 30],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#2a0e12", "#5c1818", "#a02818", "#e0501a", "#ff8a2a", "#ffc23d", "#fff3a6", "#ffffff"],
    metal: ["#0e0d14", "#1e1c27", "#312e3e", "#4b4759", "#6f6a82", "#9d98b0"],
    length: 26,
    seed: 30,
  },
};

const D = meta.duration, GAP = 8, FR = 30;

const cache = new Map();
function ghosts(o, F) {
  const key = `${o.seed}:${o.palette.join()}:${o.length}`;
  if (cache.has(key)) return cache.get(key);
  const rn = new Rng(o.seed), L = o.length;
  const g = new Ghosts(D, { sparks: [WHITE, F[6], F[5], F[4]], box: [-46, -28, 46, 84] });
  for (const s of [-1, 1]) {
    // flame shed off the tip, cooling down the ramp into smoke that's driven down, slows and billows
    for (let i = 0; i < 26; i++) g.add(rn.range(0, D), P.FIRE, s * GAP + rn.range(-1.5, 1.5), L * rn.range(0.55, 0.85), rn.range(-10, 10), rn.range(70, 130), rn.range(0.22, 0.4), 0, rn.range(2.2, 3.4), PF.SMOKES | (rn.chance(0.5) ? PF.BIG : 0));
    for (let i = 0; i < 10; i++) g.add(rn.range(0, D), P.SMOKE, s * GAP + rn.range(-3, 3), L + rn.range(2, 8), s * rn.range(0, 14), rn.range(40, 80), rn.range(1.1, 1.6), 0, rn.range(3, 5), PF.BIG);
    // sparks spat out of the exhaust, embers drifting off it
    for (let i = 0; i < 10; i++) g.add(rn.range(0, D), P.SPARK, s * GAP + rn.range(-1, 1), L * rn.range(0.3, 0.7), s * rn.range(-40, 60), rn.range(80, 200), rn.range(0.2, 0.45));
    for (let i = 0; i < 5; i++) g.add(rn.range(0, D), P.EMBER, s * GAP + rn.range(-2, 2), L * rn.range(0.6, 1), s * rn.range(10, 40), rn.range(20, 60), rn.range(0.6, 1.1), F[4], rn.range(0.8, 1.6));
  }
  cache.set(key, g);
  return g;
}

// the pack: twin tanks with rounded caps, a spine between them, belled nozzles glowing hot inside
function pack(p, H, F, dy) {
  for (const s of [-1, 1]) {
    const cx = s * GAP;
    p.shade(cx - 5, -24 + dy, cx + 5, -3 + dy, (x, y, out) => {
      const u = (x - cx) / 4.5, top = -19 + dy, v = y < top ? (y - top) / 4.5 : 0;
      if (u * u + v * v > 1) return;
      const l = -u * 0.8 - v * 0.6;
      out.c = u * u + v * v > 0.78 ? H[0] : Math.abs(y - (-12 + dy)) < 0.6 ? H[1] : l > 0.55 ? H[5] : l > 0.15 ? H[4] : l > -0.35 ? H[3] : H[2];
    });
    // the nozzle bell, wider at its mouth, its inside lit by the flame
    for (let y = -3; y <= 0; y++) {
      const w = 2 + (y + 3) * 0.7;
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
        const inner = Math.abs(x + 0.5 - cx) < w - 1.2 && y >= -1;
        p.px(x, y + dy, inner ? (y === 0 ? F[6] : F[4]) : Math.abs(x + 0.5 - cx) > w - 0.6 ? H[0] : x < cx ? H[3] : H[1]);
      }
    }
  }
  for (let y = -20; y <= -6; y++) p.px(-1, y + dy, H[1]), p.px(0, y + dy, H[2]), p.px(1, y + dy, H[0]);
  // a status light on the spine
  p.px(0, -16 + dy, F[5]);
}

export function draw(p, t, o) {
  const F = fit(o.palette, 8), H = fit(o.metal, 6), ph = t / D, f = Math.floor(t * FR) % Math.round(D * FR), S = o.seed;
  const dy = Math.round(Math.sin(TAU * 12 * ph) * 0.6);
  const g = ghosts(o, F).at(t);
  // smoke and spent flame behind, then the plumes
  g.draw(p, "back");
  for (const s of [-1, 1]) {
    const cx = s * GAP + (rand(S, f, s) < 0.15 ? s * 0.5 : 0), L = o.length * (0.92 + 0.08 * Math.sin(TAU * 7 * ph + s) + 0.06 * (rand(S, f, s, 1) - 0.5));
    // the flame: a cone of heat torn ragged by noise streaming down it, white at its heart, red at its edges
    p.shade(cx - 7, dy, cx + 7, dy + L + 4, (x, y, out) => {
      const v = (y - dy) / L, w = lerp(3.4, 0.6, v) + 1.4 * Math.sin(v * Math.PI) * (v < 1 ? 1 : 0);
      const n = tileFbm((x - cx) / 3 + s * 5, (y - dy) / 4 - ph * 20, 0, 10, S + (s > 0 ? 9 : 0), 2), q = Math.abs(x - cx) / w + n * 0.45;
      if (v > 1.15 || q > 1.2) return;
      const heat = (1 - v) * 1.15 - q * 0.9 + n * 0.25;
      // a dark red rim round the flame, so it reads as a shape and not a smear
      if (q > 0.95) {
        out.c = heat > 0.2 ? F[3] : F[2];
        if (heat < -0.3) out.a = 0.5;
        return;
      }
      out.c = heat > 0.82 ? WHITE : heat > 0.62 ? F[6] : heat > 0.42 ? F[5] : heat > 0.22 ? F[4] : heat > 0.02 ? F[3] : F[2];
    });
    // shock diamonds: bright knots strung down the core, breathing
    for (let i = 0; i < 3; i++) {
      const y = Math.round(dy + 5 + i * 6.5 + Math.sin(TAU * 4 * ph + i) * 0.5), r = Math.round(2.2 - i * 0.45 + 0.4 * Math.sin(TAU * 8 * ph + i * 2));
      if (y > dy + L * 0.75 || r < 1) break;
      for (let yy = -r; yy <= r; yy++)
        for (let xx = -r; xx <= r; xx++) {
          const d = Math.abs(xx) + Math.abs(yy);
          if (d <= r) p.px(cx + xx, y + yy, d < r ? WHITE : i === 0 ? F[6] : F[5]);
        }
      p.glow(cx, y, 6, F[6], 0.35);
    }
    // light: hot at the nozzle, warm down the plume
    p.glow(cx, dy + 2, 9, WHITE, 0.45);
    p.glow(cx, dy + L * 0.45, L * 0.8, F[4], 0.35);
  }
  pack(p, H, F, dy);
  g.draw(p, "front");
  // the fire lights the smoke below it, and its own surroundings
  p.glow(0, o.length + 14, 34, F[4], 0.16);
  p.glow(0, o.length * 0.4, 30, F[5], 0.18);
}
