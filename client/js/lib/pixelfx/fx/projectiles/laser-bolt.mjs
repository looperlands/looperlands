// The banded body, travelling pulses and spiralling sparks follow Sprite Fusion's open-source energy beam
// (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, rand, sparkle, TAU, WHITE } from "../../core/index.mjs";
import { beat } from "./_lib.mjs";

export const meta = {
  name: "Laser bolt",
  desc: "A red laser bolt: a white-hot core in a rounded head, red bands tapering back, pulses racing down it, a tail that shimmers apart into wavering dashes.",
  tags: ["projectile", "laser", "energy", "sci-fi", "directional", "loop"],
  size: [128, 32],
  origin: [108, 16],
  duration: 0.5,
  loop: true,
  fps: 30,
  bg: "sky",
  options: { palette: ["#2a0610", "#5c0d1c", "#9a1428", "#d8243a", "#ff4d5e", "#ff8a94", "#ffd0d4", "#ffffff"], length: 40, seed: 2 },
};

export function draw(p, t, o) {
  const C = fit(o.palette, 8), L = o.length, S = o.seed, D = meta.duration, ph = t / D, fr = Math.floor(t * 30 + 1e-6);
  const left = -meta.origin[0] + 2;

  // the shimmering tail: dashes shed off the bolt's end, wavering, flickering and cooling as they fall behind
  beat(t, D, 14, S, (r) => r.range(0.18, 0.3), (age, life, r) => {
    const k = age / life, x0 = -L * 0.8 - age * r.range(150, 230), len = r.range(3, 7) * (1 - k * 0.5), y = 0.5 + Math.sin(x0 * 0.25 + ph * TAU * 2) * (0.5 + k * 1.5) + r.range(-0.6, 0.6) * k;
    if (x0 - len < left || rand(fr, r.int(0, 999)) < k * 0.5) return;
    p.line(x0, y, x0 - len, y, k < 0.3 ? C[5] : k < 0.6 ? C[4] : C[3]);
    if (k < 0.4) p.glow(x0 - len / 2, y, 4, C[4], 0.3 * (1 - k));
  });

  // the body: bands round a white core, thickest just behind the rounded head and tapering to a thread, a
  // pulse running back down it every so often; the edge breaks up a little as the light shimmers
  p.shade(-L - 1, -5, 4, 6, (x, y) => {
    const d = -x + 3, u = d / (L + 3);
    if (u < 0 || u > 1) return;
    const head = d < 3 ? Math.sqrt(Math.max(0, 1 - ((3 - d) / 3) ** 2)) : 1;
    const w = (3.4 * Math.pow(1 - u, 0.9) + 0.5) * head * (1 + 0.08 * Math.sin(d * 0.9 - ph * TAU * 4)), v = Math.abs(y - 0.5) / w;
    if (v > 1.2) return;
    if (v > 1 && (u > 0.5 || rand(Math.floor(x), fr) > 0.6)) return;
    const pulse = ((d * 0.05 - ph * 3) % 1 + 1) % 1 < 0.12 ? 1 : 0;
    const lvl = v < 0.22 ? (u < 0.6 ? 7 : 6) : v < 0.45 ? 6 - (u > 0.5 ? 1 : 0) : v < 0.72 ? 4 : v <= 1 ? 3 : 2;
    return C[Math.min(7, lvl + (v < 0.72 ? pulse : 0))];
  });
  // sparks spiralling round the core, a bright one on the near side and a dim one behind
  for (const s of [0, Math.PI]) {
    for (let d = 2; d < L * 0.7; d += 1) {
      const a = d * 0.45 - ph * TAU * 3 + s, y = 0.5 + Math.sin(a) * (2.2 * (1 - d / L) + 0.6);
      if (Math.cos(a) > 0.3) p.dot(-d, y, Math.cos(a) > 0.8 ? WHITE : C[6]);
    }
  }
  // the head's glint, flickering, and the light
  const g = 0.75 + 0.25 * Math.sin(ph * TAU * 2);
  sparkle(p, 1, 0.5, 3 + Math.round(g * 2), C[6], C[4], 0.5);
  p.glowLine(1, 0.5, -L, 0.5, 9, C[3], 0.4);
  p.glow(-2, 0.5, 20, C[3], 0.5 * g);
  p.glow(1, 0.5, 6, WHITE, 0.25);
}
