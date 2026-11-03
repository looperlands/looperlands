// The hover, floor shadow and twinkle glints follow Sprite Fusion's open-source pickup and sparkle
// (https://www.spritefusion.com/pixel-art-vfx/pickup), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, smooth, ease, cycle, rand, TAU, WHITE, hex, mix, scale } from "../../core/index.mjs";
import { Layer, brilliant, drawGem, glint, blobShadow } from "./_lib.mjs";

export const meta = {
  name: "Gem spin",
  desc: "A brilliant-cut ruby turning on its axis: real facets catch the light in turn, flashes roll over the crown, refracted light slides across the floor, sparkles wink round it.",
  tags: ["pickup", "gem", "jewel", "treasure", "ruby", "loop"],
  size: [64, 64],
  origin: [32, 56],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#16040e", "#3e0a1e", "#760e2e", "#b8163c", "#ec3250", "#ff7482", "#ffc4c8", "#ffffff"], seed: 6 },
};

const GEM = brilliant({ r: 7.5, crown: 3.2, table: 0.5, pavilion: 9.5, girdle: 0.9 });
const L = new Layer(32, 32), HOVER = 19;

// where the gem is: hovering, one slow bob a loop, turning four facets a loop
const pose = (t, T) => ({ y: -HOVER - 1.8 * Math.sin((t / T) * TAU), spin: (t / T) * Math.PI });

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, { y, spin } = pose(t, T), lift = (-y - HOVER + 2) / 4;
  blobShadow(p, 0, 8 - lift * 1.5, 0.75 - lift * 0.2);
  // light refracted through the stone, sliding over the floor as it turns
  for (let k = 0; k < 3; k++) {
    const a = spin * 4 + (k * TAU) / 3, x = Math.sin(a) * 9, k2 = 0.5 + 0.5 * Math.cos(a);
    if (k2 < 0.15) continue;
    p.dot(x, 0, k2 > 0.7 ? C[6] : C[5], k2 * 1.2);
    p.dot(x + 1, 0, C[4], k2 * 0.8);
    p.dot(x - 1, 0, C[4], k2 * 0.6);
    p.glow(x + 0.5, 0, 6, C[5], 0.3 * k2);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T, { y, spin } = pose(t, T);
  // its light: a wide soft halo and a hot heart
  p.glowRing(0, y - 1, 5, 15, C[4], 0.34);
  p.glow(0, y, 26, C[3], 0.14);
  const hi = drawGem(L, p, GEM, 0, y, spin, C, { tilt: 0.22 });
  // a star flares where a facet swings square to the light, twice a loop
  const f = ((spin * 4) / TAU) % 1, fk = Math.max(0, 1 - Math.abs(f - 0.5) / 0.08);
  if (fk > 0) glint(p, -3, y - 3, 3.4 * ease.outQuad(fk), C[6], 0.45 * fk);
  // sparkles wink on and off round it, one after another
  for (let i = 0; i < 8; i++) {
    const life = 0.4, age = (((t - (i / 8) * T - rand(i, o.seed, 3) * 0.1) % T) + T) % T;
    if (age > life) continue;
    const a = rand(i, o.seed, 1) * TAU + i * 2.4, d = 10 + rand(i, o.seed, 2) * 7, k = Math.sin((age / life) * Math.PI);
    glint(p, Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - age * 6, Math.round(2.4 * k * (0.6 + 0.4 * rand(i, 9))), i % 3 ? C[6] : WHITE, 0.4 * k);
  }
}
