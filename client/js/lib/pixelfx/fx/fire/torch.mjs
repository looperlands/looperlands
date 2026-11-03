// The tongue, lick, flame-puff, smoke and ember recipe is adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, hex, rand, clamp } from "../../core/index.mjs";
import { noiseFor, hotFirst, burn } from "./_lib.mjs";

export const meta = {
  name: "Torch",
  desc: "A wall torch on an iron bracket: a licking flame leaping off a pitch-soaked wrap, licks and puffs torn off its tips, smoke, embers, a flickering light on the wall.",
  tags: ["fire", "torch", "prop", "light", "wall", "dungeon", "loop"],
  size: [72, 120],
  origin: [36, 94],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    wood: ["#0e080a", "#24130f", "#3b2216", "#5a3520", "#8a5a34", "#b9884f"],
    iron: ["#0d0b12", "#1e1b26", "#363242", "#5b5566", "#8a8396"],
    seed: 4,
  },
};

const D = meta.duration, NL = noiseFor(D), BASE = -16;
// the flame: [x, y from the wrap's top, height share, half-width, back row?]
const TONGUES = [
  [-1.9, -1, 0.74, 2.0, 1],
  [2.1, -1, 0.7, 2.0, 1],
  [-3.4, 0.5, 0.42, 1.6, 0],
  [3.6, 0.5, 0.46, 1.6, 0],
  [0, 0, 1, 2.9, 0],
];

// the bracket: a bevelled iron plate on the wall with two rivets, and a ring round the handle
function plate(p, I, H, fl) {
  p.shade(-5.5, -5.5, 5.5, 11.5, (x, y) => {
    if (x < -5 || x > 5 || y < -5 || y > 11) return I[0];
    const rv = Math.abs(x) < 0.6 && (Math.abs(y + 3.5) < 0.6 || Math.abs(y - 9.5) < 0.6);
    if (rv) return mix(I[4], H[3], 0.35 * fl);
    if (y < -4 || x < -4) return mix(I[3], H[4], 0.3 * fl);
    if (y > 10 || x > 4) return I[1];
    return y < 2 ? I[2] : I[1];
  });
}
function handle(p, W) {
  p.shade(-3, -12, 3, 15, (x, y) => {
    const half = 1.3 + clamp((14 - y) / 26) * 0.9;
    if (Math.abs(x) > half + 0.5 || y > 14.5) return;
    if (Math.abs(x) > half - 0.5 || y > 13.5) return W[0];
    const g = rand(Math.floor(y / 3), Math.round(x), 9);
    return x < -0.3 ? (g < 0.3 ? W[2] : W[4]) : g < 0.4 ? W[1] : W[2];
  });
}
function ring(p, I, H, fl) {
  p.rect(-3, -2, 7, 4, I[0]);
  p.rect(-2, -1, 5, 1, mix(I[4], H[3], 0.3 * fl));
  p.rect(-2, 0, 5, 1, I[2]);
}
// the head: rags bound with cord and soaked in pitch, flaring into a cup at the top, charred where it burns
// with embers breathing in the folds
function wrap(p, W, I, H, t) {
  p.shade(-6, BASE - 2, 6, -9, (x, y, out) => {
    const v = (y - (BASE - 1.5)) / 7.5, half = 4.6 - v * 1.9;
    if (Math.abs(x) > half + 0.5 || y < BASE - 1.5 || y > -9.5) return;
    if (Math.abs(x) > half - 0.5 || y > -10.5) return W[0];
    const cord = Math.floor(y - x * 0.6 + 40) % 3 === 0, h = rand(Math.floor(x), Math.floor(y), 31);
    if (v < 0.45) {
      if (h < 0.42) {
        const g = 0.5 + 0.5 * Math.sin((t / D) * Math.PI * 4 + h * 40);
        out.k = 0.3 * g;
        return g > 0.66 ? H[2] : g > 0.33 ? H[4] : H[5];
      }
      return h < 0.75 ? W[0] : W[1];
    }
    if (cord) return I[2];
    return x < -1 ? W[3] : x < 1.5 ? W[2] : W[1];
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), W = fit(o.wood, 6), I = fit(o.iron, 5), S = o.seed;
  const fl0 = 0.74 + 0.16 * NL(t, 7.3, S + 1) + 0.1 * NL(t, 19, S + 2);
  plate(p, I, H, fl0);
  handle(p, W);
  ring(p, I, H, fl0);
  burn(p, t, TONGUES, {
    H, D, NL, S, x: 0, y: BASE, height: 20, lean: 0.12, spread: 4,
    puffs: 10, licks: 5, smoke: 7, smokeSize: 2.3, smokeLife: [1.3, 2.1], embers: 7, glowR: 48, glow: 1.25, wind: 2,
    mid: () => wrap(p, W, I, H, t),
  });
}
