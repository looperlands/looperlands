// The specks of white, cyan and magenta a body breaks into follow Sprite Fusion's open-source blink
// (https://www.spritefusion.com/pixel-art-vfx/movement), MIT License, Copyright (c) 2026 Hugo Duprez.
import { PAL, fit, hex, clamp, ease, noise, rand, WHITE } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "Glitch wipe",
  desc: "Torn bands of black stutter across the screen, freezing and jerking back, their ragged edges split into magenta and cyan ghosts spitting data slivers; then they tear on through.",
  tags: ["glitch", "digital", "rgb", "bands", "wipe"],
  duration: 1.8,
  options: { palette: PAL.cyber, split: "#ff2d6f", seed: 1 },
});

const TICK = 1 / 18, IN0 = 0.03, IN1 = 0.78, OUT0 = 0.98, OUT1 = 1.66;

// the bands: torn strips of different thickness. Neighbours move together in chunks (their timing follows a
// smooth noise down the screen), mostly left to right, now and then one from the other side
const cache = new Map();
function bands(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const out = [];
  for (let y = 0, i = 0; y < H; i++) {
    const r = rand(i, seed), h = Math.min(H - y, r < 0.4 ? 5 + Math.floor(rand(i, seed + 1) * 6) : r < 0.85 ? 10 + Math.floor(rand(i, seed + 1) * 10) : 20 + Math.floor(rand(i, seed + 1) * 12));
    const a = clamp(0.5 + 0.55 * noise(y / 40, seed + 9) + (rand(i, seed + 2) - 0.5) * 0.25), b = clamp(0.5 + 0.55 * noise(y / 40, seed + 19) + (rand(i, seed + 3) - 0.5) * 0.25);
    const span = 0.32 + rand(i, seed + 6) * 0.12;
    out.push({ i, y, h, dir: rand(i, seed + 4) < 0.82 ? 1 : -1, off: rand(i, seed + 5), t0: IN0 + a * (IN1 - IN0 - span), t1: IN0 + a * (IN1 - IN0 - span) + span, o0: OUT0 + b * (OUT1 - OUT0 - span), o1: OUT0 + b * (OUT1 - OUT0 - span) + span });
    y += h;
  }
  cache.set(seed, out);
  return out;
}

// how far a band has torn at t: it moves only on ticks, by uneven jumps, sometimes freezing, sometimes
// jerking back a little, but it always starts at 0 and ends at 1
function tear(b, t, t0, t1, salt) {
  if (t <= t0) return 0;
  if (t >= t1) return 1;
  let n = Math.floor((t + b.off * TICK) / TICK);
  while (n > 0 && rand(n, b.i, salt) < 0.22) n--; // frozen ticks hold the last position
  const tq = n * TICK - b.off * TICK, u = clamp((tq - t0) / (t1 - t0));
  return clamp(ease.inOutQuad(u) + (rand(n, b.i, salt + 1) - 0.6) * 0.12 * Math.sin(Math.PI * u));
}

export function draw(p0, t, o) {
  const C = fit(o.palette, 8), ink = hex(o.color), RED = hex(o.split), p = clipTo(p0), B = bands(o.seed), fr = Math.floor(t / TICK);
  const out = t >= OUT0;
  for (const b of B) {
    const k = out ? tear(b, t, b.o0, b.o1, 7) : tear(b, t, b.t0, b.t1, 3);
    if ((!out && k <= 0) || (out && k >= 1)) continue;
    const moving = k > 0 && k < 1, slip = moving && rand(fr, b.i, 11) < 0.12 ? Math.round((rand(fr, b.i, 12) - 0.5) * 18) : 0;
    // the edge advances along +fwd; in, the black is behind it; out, the black is ahead of it
    const fwd = b.dir, e = (b.dir > 0 ? k * W : W - k * W) + slip;
    for (let y = b.y; y < b.y + b.h; y++) {
      // a ragged edge: each row torn a little ahead or behind, re-torn every tick
      const jag = moving ? Math.round((rand(fr, y, 14) - 0.5) * 6 + (rand(fr >> 1, b.i, 15) - 0.5) * 6) : 0, ex = clamp(Math.round(e + jag), 0, W);
      const behind = (fwd > 0) !== out; // is the black on the low-x side of the edge?
      if (behind) ex > 0 && rect(p0, 0, y, ex, 1, ink);
      else ex < W && rect(p0, ex, y, W - ex, 1, ink);
      if (!moving) continue;
      // the torn edge: a white line, a magenta ghost on the open side and a cyan ghost in the black
      const e1 = behind ? ex - 1 : ex, side = behind ? 1 : -1, sp = 2 + ((b.i + fr) % 3);
      p.px(e1, y, WHITE);
      p.px(e1 + side * sp, y, RED), p.px(e1 + side * (sp + 1), y, RED);
      p.px(e1 - side * (sp + 1), y, C[5]), p.px(e1 - side * (sp + 2), y, C[4]);
      p.light(e1, y, WHITE, 0.45);
      p.light(e1 + side * (sp + 1), y, RED, 0.5), p.light(e1 + side * (sp + 3), y, RED, 0.22);
      p.light(e1 - side * (sp + 1), y, C[5], 0.45), p.light(e1 - side * (sp + 3), y, C[5], 0.22);
    }
    if (!moving) continue;
    const ex = clamp(Math.round(e), 0, W), open = ((fwd > 0) !== out) ? 1 : -1;
    // the edge glows, and a cloud of specks crackles round it, thickest close in
    p.glow(ex, b.y + b.h / 2, b.h * 0.7 + 7, (b.i & 1) ? RED : C[5], 0.28);
    for (let s = 0; s < b.h; s++) {
      if (rand(fr, b.i, 100 + s) > 0.55) continue;
      const x = ex + open * Math.round(rand(fr, b.i, 200 + s) ** 2 * 22 - 4), y = b.y + Math.floor(rand(fr, b.i, 300 + s) * b.h);
      p.px(x, y, [WHITE, C[6], C[5], RED][Math.floor(rand(fr, b.i, 400 + s) * 4)]);
    }
    // data slivers spit off the edge: dashes of light out over the picture and glitches back in the black
    for (let s = 0; s < 4; s++) {
      if (rand(fr, b.i, 20 + s) > 0.5) continue;
      const len = 2 + Math.floor(rand(fr, b.i, 30 + s) ** 2 * 60), ahead = rand(fr, b.i, 40 + s) < 0.6;
      const d = Math.floor(rand(fr, b.i, 50 + s) ** 1.5 * 70) + 4, y = b.y + Math.floor(rand(fr, b.i, 60 + s) * b.h);
      const x = ahead ? (open > 0 ? ex + d : ex - d - len) : open > 0 ? ex - d - len : ex + d, c = [WHITE, C[6], C[5], RED][Math.floor(rand(fr, b.i, 70 + s) * 4)];
      p.rect(x, y, len, 1, c);
      for (let q = 0; q < len; q += 3) p.light(x + q, y, c, 0.35);
    }
    // a corrupted block or two: the outline of a broken tile near the edge
    if (b.h >= 8 && rand(fr, b.i, 80) < 0.35) {
      const bw = 6 + Math.floor(rand(fr, b.i, 81) * 10), bh = 3 + Math.floor(rand(fr, b.i, 82) * Math.min(6, b.h - 3)), x = ex + open * Math.floor(rand(fr, b.i, 83) * 24 - 4) - (open < 0 ? bw : 0);
      const y = b.y + Math.floor(rand(fr, b.i, 84) * (b.h - bh)), c = rand(fr, b.i, 85) < 0.5 ? C[5] : RED;
      p.rect(x, y, bw, 1, c), p.rect(x, y + bh - 1, bw, 1, c), p.rect(x, y, 1, bh, c), p.rect(x + bw - 1, y, 1, bh, c);
      for (let q = 0; q < bw; q += 2) p.light(x + q, y, c, 0.25);
    }
  }
  // while it's all black, the signal still spits now and then
  if (t > IN1 && t < OUT0 + 0.05)
    for (let s = 0; s < 3; s++) {
      if (rand(fr, s, 90) > 0.4) continue;
      const y = Math.floor(rand(fr, s, 91) * H), x = Math.floor(rand(fr, s, 92) * W), len = 3 + Math.floor(rand(fr, s, 93) ** 2 * 40);
      p.rect(x, y, len, 1, s === 0 ? C[4] : s === 1 ? C[3] : RED);
    }
}
