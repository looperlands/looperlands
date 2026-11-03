import { fit, sparkle, cycle, TAU, WHITE, mix, luma } from "../../core/index.mjs";
import { GOLD } from "./_lib.mjs";

export const meta = {
  name: "Halo",
  desc: "A ring of gold light floats over the head with a glint running round it; fine dust sifts down from it and the head catches its light.",
  tags: ["holy", "halo", "saint", "buff", "glow", "character", "loop"],
  size: [56, 80],
  origin: [28, 70],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: GOLD, seed: 5 },
};

const PRAY = { turn: 1.1, fx: -1, fy: -26, bx: 2, by: -26, armsFront: true, hy: 1, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [[0, PRAY], [0.5, { ...PRAY, crouch: 1 }], [1, { ...PRAY, crouch: 1, hy: 2 }], [1.5, { ...PRAY, crouch: 1 }], [2, PRAY]],
};

const HY = -46, RX = 9.5, RY = 2.6;
// how far apart two angles are (0..π)
const apart = (a, b) => Math.abs(((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI);

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = (t / T) * TAU, A = o.actor;
  const y0 = HY + (Math.sin(ph) > 0.55 ? -1 : 0), gl = Math.PI / 2 + ph;
  // the hair under it catches the light
  if (A) {
    // a warm rim on the top edge of each column of the head, and light falling off below it
    const m = A.mask;
    for (let i = 0; i < m.w; i++)
      for (let j = 0; j < Math.min(m.h, 9); j++) {
        const c = A.pixels[j * m.w + i];
        // skip empty space and the dark outline, light the first pixel of hair under it
        if (!c || luma(c) < 0.15) continue;
        const x = A.x + i, y = A.y + j;
        p.px(x, y, mix(c, C[6], 0.45));
        const c2 = A.pixels[(j + 1) * m.w + i];
        if (c2 && luma(c2) >= 0.15) p.px(x, y + 1, mix(c2, C[5], 0.18));
        for (let d = 0; d <= 4; d++) p.light(x, y + d, C[4], 0.3 * (1 - d / 5));
        break;
      }
  }
  // the ring: a thick bright near side, a thin far side, a slow shimmer running round, the glint
  for (let j = 0, n = 92; j < n; j++) {
    const g = (j / n) * TAU, x = Math.cos(g) * RX, y = y0 + Math.sin(g) * RY, near = Math.sin(g) >= 0;
    const shimmer = Math.sin(g * 3 - ph * 2) > 0.7, hot = apart(g, gl) < 0.3;
    if (near) {
      p.px(x, y, hot ? WHITE : shimmer ? WHITE : C[6]);
      p.px(x, y + 1, hot ? C[6] : C[4]);
    } else p.dot(x, y, hot ? WHITE : shimmer ? C[6] : C[5], 0.9);
  }
  p.glow(0, y0, 20, C[4], 0.4);
  p.glow(0, y0 + 1, 9, WHITE, 0.16);
  const gx = Math.cos(gl) * RX, gy = y0 + Math.sin(gl) * RY;
  if (Math.sin(gl) > -0.2) sparkle(p, gx, gy + 0.5, 1.5 + 2.5 * Math.max(0, Math.sin(gl)), WHITE, C[6], 0.45);
  else p.glow(gx, gy, 5, C[6], 0.3);
  // light falls from it onto the head
  p.glowLine(0, y0 + 2, 0, y0 + 9, 9, C[4], 0.16);
  // little stars wink on and off about the ring
  cycle(t, T, 6, o.seed + 3, (g) => g.range(0.3, 0.5), (age, life, R) => {
    const g = R.range(0, TAU), d = R.range(1.1, 1.5), k = Math.sin((age / life) * Math.PI);
    sparkle(p, Math.cos(g) * RX * d, y0 + Math.sin(g) * RY * d - R.range(1, 4), 1 + 2 * k, WHITE, C[6], 0.4 * k);
  });
  // dust sifting down off the ring
  cycle(t, T, 16, o.seed, (g) => g.range(0.8, 1.5), (age, life, R) => {
    const g = R.range(0, TAU), u = age / life, x = Math.cos(g) * RX * R.range(0.8, 1) + Math.sin(u * 5 + g) * 1.2, y = y0 + Math.sin(g) * RY + 1 + u * R.range(7, 14);
    const tw = 0.6 + 0.4 * Math.sin(age * 18 + g * 7), k = Math.sin(u * Math.PI) * tw;
    p.dot(x, y, tw > 0.85 ? WHITE : C[6], Math.min(1, k * 1.5));
    p.light(x, y, C[5], 0.5 * k);
  });
}
