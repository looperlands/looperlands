// The hover, floor shadow and glints follow Sprite Fusion's open-source pickup
// (https://www.spritefusion.com/pixel-art-vfx/pickup), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, rand, TAU, WHITE, scale } from "../../core/index.mjs";
import { Layer, coin3d, glint, blobShadow } from "./_lib.mjs";

export const meta = {
  name: "Coin spin",
  desc: "A thick gold coin turning on its edge: an embossed star face, a reeded rim showing as it goes edge-on, a flash sweeping the face, bobbing over its shadow.",
  tags: ["pickup", "coin", "gold", "money", "loop"],
  size: [56, 56],
  origin: [28, 48],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], seed: 3 },
};

const L = new Layer(32, 32), R = 7, TH = 3, HOVER = 17;

export function drawBack(p, t, o) {
  const T = meta.duration, ph = t / T, th = ph * TAU, y = -HOVER - 2 * Math.sin(ph * TAU);
  // the shadow narrows as the coin turns edge-on and thins as it rises
  blobShadow(p, 0, 2.5 + 4.5 * Math.abs(Math.cos(th)) + 1.5 * Math.abs(Math.sin(th)), 0.85 - (-y - HOVER + 2) * 0.06);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T, th = ph * TAU, y = -HOVER - 2 * Math.sin(ph * TAU);
  // warm light round it, swelling when the face catches the light
  const facing = Math.abs(Math.cos(th));
  p.glow(0, y, 20, C[4], 0.3 + 0.12 * facing);
  const flash = coin3d(L, p, 0, y, R, TH, th, C);
  p.glow(-1, y - 1, 12, C[6], 0.35 * flash);
  // a star glint where the flash leaves the rim
  if (flash > 0.3) glint(p, -4, y - 4, 1 + 3.2 * flash, C[6], 0.5 * flash);
  // little twinkles round it, one after another
  for (let i = 0; i < 5; i++) {
    const life = 0.35, age = (((t - (i / 5) * T - rand(i, o.seed, 3) * 0.08) % T) + T) % T;
    if (age > life) continue;
    const a = rand(i, o.seed, 1) * TAU + i * 2.1, d = 10 + rand(i, o.seed, 2) * 5, k = Math.sin((age / life) * Math.PI);
    glint(p, Math.cos(a) * d, y + Math.sin(a) * d * 0.85 - age * 8, Math.round(2 * k), i % 2 ? C[6] : WHITE, 0.35 * k);
  }
}
