// The glowing line (a white core, a pale fringe, an outer fringe while it's fresh, light along it) follows
// Sprite Fusion's open-source lightning strike (https://www.spritefusion.com/pixel-art-vfx/lightning),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, clamp, ease, noise, rand, WHITE } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, glint, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "CRT off",
  desc: "The picture squeezes into a white-hot glowing line, the line into a dot that lingers as a fading afterglow; then it switches back on, dot to line to picture, with a warm-up glow.",
  tags: ["crt", "tv", "retro", "switch", "wipe"],
  duration: 2.0,
  options: { palette: ["#060a14", "#0e1a33", "#1a3360", "#2a5a9a", "#4a8fd0", "#8cc4f0", "#d4ecff", "#ffffff"], seed: 1 },
});

const YC = H / 2, XC = W / 2;
// off: squeeze to a line, the line to a dot, the dot fades; on: a dot, a line, the picture
const SQ0 = 0.06, SQ1 = 0.34, LN1 = 0.56, DOT1 = 0.86, ON0 = 1.06, ON1 = 1.16, OPEN1 = 1.42;

// the visible strip's height and the line's half-length at time t
function shape(t) {
  if (t < SQ0) return { h: H, w: XC };
  if (t < SQ1) return { h: Math.max(1, H * (1 - ease.inCubic((t - SQ0) / (SQ1 - SQ0)))), w: XC };
  if (t < LN1) return { h: 1, w: XC * (1 - ease.inQuad((t - SQ1) / (LN1 - SQ1))) };
  if (t < ON0) return { h: 0, w: 0 };
  if (t < ON1) return { h: 1, w: XC * ease.outExpo((t - ON0) / (ON1 - ON0)) };
  return { h: Math.max(1, H * ease.outCubic(clamp((t - ON1) / (OPEN1 - ON1)))), w: XC };
}

export function draw(p0, t, o) {
  const C = fit(o.palette, 8), ink = hex(o.color), p = clipTo(p0), { h, w } = shape(t), fl = 0.85 + 0.15 * rand(Math.floor(t * 30), 7, o.seed);
  if (t >= OPEN1 + 0.02 && t < OPEN1 + 0.6) {
    // switched on: a warm-up glow over the picture, a bright refresh band rolling down it once, scanlines
    const u = (t - OPEN1) / 0.6, band = -20 + u * (H + 40);
    for (let y = 0; y < H; y++) {
      const k = 0.22 * (1 - u) ** 2 + 0.3 * Math.max(0, 1 - Math.abs(y - band) / 10) ** 2 * (1 - u) + (y & 1 ? 0.05 * (1 - u) : 0);
      if (k > 0.01) for (let x = 0; x < W; x += 1) p0.light(x, y, C[5], k);
    }
    return;
  }
  if (h >= H) return;
  const top = Math.round(YC - h / 2), bot = Math.round(YC + h / 2);
  // the dark closing in from above and below
  if (top > 0) rect(p0, 0, 0, W, top, ink);
  if (bot < H) rect(p0, 0, bot, W, H - bot, ink);
  if (h > 2) {
    // the squeezed picture: brighter as it narrows, with scanlines, its edges glowing where the dark meets it
    const sq = 1 - h / H;
    for (let y = top; y < bot; y++) {
      const e = Math.min(y - top, bot - 1 - y), k = 0.55 * sq * sq + (y & 1 ? 0.08 * sq : 0) + 0.35 * Math.max(0, 1 - e / 6) ** 2;
      for (let x = 0; x < W; x++) p0.light(x, y, C[5], k * fl);
    }
    for (const y of [top - 1, bot]) if (y >= 0 && y < H) rect(p0, 0, y, W, 1, sq > 0.6 ? C[6] : C[5]);
    return;
  }
  // the line (and the dot it shrinks to): white-hot core, a pale fringe, an outer fringe while it's fresh, light
  const dotPhase = t >= LN1 && t < ON0, x0 = Math.floor(XC - w), x1 = Math.ceil(XC + w), fresh = t < SQ1 + 0.08 || (t > ON0 && t < ON1 + 0.04);
  if (h > 0 && w >= 1) {
    const fr = Math.floor(t * 30);
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      // it hums: the line wavers a pixel here and there, and crackles with flecks of static
      const u = Math.abs(x + 0.5 - XC) / w, y = YC + Math.round(noise(x / 23 + t * 9, o.seed) * (0.7 + 0.5 * u)); // 0 middle .. 1 ends
      p0.px(x, y, u < 0.85 ? WHITE : C[6]);
      if (u < 0.92) p0.px(x, y - 1, C[6]), p0.px(x, y + 1, u < 0.6 ? C[6] : C[5]);
      if (fresh && u < 0.8) p0.dot(x, y - 2, C[4], 0.5), p0.dot(x, y + 2, C[4], 0.5);
      if (rand(x, fr, o.seed + 3) < 0.06) p.px(x, y + (rand(x, fr, o.seed + 4) < 0.5 ? -1 : 1) * (2 + Math.floor(rand(x, fr, o.seed + 5) * 4)), rand(x, fr, 6) < 0.5 ? WHITE : C[5]);
      p0.light(x, y, C[6], 0.5 * fl * (1 - u * 0.6));
    }
    for (let x = x0; x <= x1; x += 9) p.glow(x, YC, 10, C[5], 0.35 * fl);
    p.glow(XC, YC, Math.min(70, 16 + w * 0.4), C[5], 0.4 * fl);
  }
  // the dot: a glint that holds a moment, then an afterglow cooling to nothing
  if (dotPhase) {
    const u = (t - LN1) / (DOT1 - LN1);
    if (u < 0.35) glint(p, XC, YC, 10 * (1 - u / 0.35) + 3, 0.2 + u * 2, C[6], C[5]);
    if (u < 1) {
      p.px(XC, YC, u < 0.5 ? WHITE : u < 0.75 ? C[6] : C[4]);
      p.px(XC - 1, YC, u < 0.4 ? C[6] : C[4]);
      // the phosphor smears the dot sideways as it cools
      const sm = Math.round(9 * (1 - u));
      for (let k = 2; k <= sm; k++) p.dot(XC - k, YC, C[4], 1 - k / (sm + 1)), p.dot(XC + k - 1, YC, C[4], 1 - k / (sm + 1));
      p.glow(XC, YC, 22 * (1 - u * 0.5), C[5], 0.55 * (1 - u) ** 1.5);
    }
  }
  // switching on: a pop of light at the heart before the line runs out
  const s = t - ON0;
  if (s >= 0 && s < 0.14) glint(p, XC, YC, 12 * (1 - s / 0.14) + 2, 0.4 + s * 6, C[6], C[5]), p.glow(XC, YC, 40, WHITE, 0.5 * (1 - s / 0.14));
}
