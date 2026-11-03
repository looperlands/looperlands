import { fit, clamp, rand, hex, mix, luma, WHITE } from "../../core/index.mjs";

export const meta = {
  name: "Glitch",
  desc: "The hero's signal breaks up in bursts: an RGB split, slices torn sideways, rows smeared out, junk blocks and dead pixels, then snaps back clean.",
  tags: ["scifi", "glitch", "digital", "corrupt", "hologram", "status", "loop"],
  size: [88, 64],
  origin: [44, 54],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#14101f", "#3b1f5c", "#ff2e63", "#ff7aa8", "#2ef2ff", "#b4fbff", "#ffffff"], seed: 7 },
};

const TWITCH_A = { turn: 0.3, lean: 3, crouch: 1, fx: 13, fy: -31, bx: 6, by: -14, hx: 1 };
const TWITCH_B = { turn: 1.2, lean: -3, crouch: 0, fx: -9, fy: -14, bx: 14, by: -31, hx: -1 };
const FINE = {};
export const act = {
  onBody: true,
  poses: [
    [0, FINE],
    [0.3, TWITCH_A, "snap"],
    [0.37, TWITCH_B, "snap"],
    [0.44, TWITCH_A, "snap"],
    [0.53, FINE, "snap"],
    [1.1, TWITCH_B, "snap"],
    [1.23, FINE, "snap"],
    [1.7, TWITCH_A, "snap"],
    [1.8, { ...TWITCH_B, crouch: 3 }, "snap"],
    [1.9, TWITCH_A, "snap"],
    [2, TWITCH_B, "snap"],
    [2.07, FINE, "snap"],
    [2.4, FINE],
  ],
};

const FPS = 30, NF = Math.round(meta.duration * FPS);
// the bursts: [first frame, last frame, how hard]
const BURSTS = [[9, 16, 0.8], [33, 37, 0.5], [51, 62, 1]];

// the effect draws the hero itself, clean or broken
export const actorAlpha = () => 0;

export function draw(p, t, o) {
  const C = fit(o.palette, 7), A = o.actor, S = o.seed, RED = C[2], CYAN = C[4], f = Math.floor(t * FPS + 1e-6) % NF;
  const burst = BURSTS.find(([a, b]) => f >= a && f <= b), k = burst ? burst[2] : 0, r = (...n) => rand(S, f, ...n);
  // what this frame's corruption is
  const split = burst ? Math.round(1 + r(1) * 3 * k) * (r(2) < 0.5 ? -1 : 1) : 0;
  const tears = [];
  if (burst) for (let i = 0; i < 1 + Math.floor(r(3) * 4 * k); i++) tears.push([A.y + Math.floor(r(4, i) * A.h), 1 + Math.floor(r(5, i) * 5), Math.round((r(6, i) - 0.5) * 16 * k), r(7, i)]);
  // a lone row slips now and then even when it's calm
  if (!burst && r(8) < 0.07) tears.push([A.y + Math.floor(r(9) * A.h), 1, r(10) < 0.5 ? -2 : 2, 1]);
  const interlace = burst && r(11) < 0.3, roll = burst && r(12) < 0.15 ? -2 - Math.floor(r(13) * 2) : 0, poster = burst && r(14) < 0.15 * k;
  const tearAt = (y) => {
    for (const [y0, h, dx, tint] of tears) if (y >= y0 && y < y0 + h) return [dx, tint];
    return null;
  };
  // the calm signal: a faint bar rolling down the body
  const bar = A.y + ((t / meta.duration) * 2 * (A.h + 12)) % (A.h + 12) - 6;

  const px = (x, y, c) => p.px(x, y, c);
  // the split: the red and cyan ghosts first, offset either side
  if (split)
    for (let my = 0; my < A.h; my++)
      for (let mx = 0; mx < A.w; mx++) {
        if (!A.mask.data[my * A.w + mx]) continue;
        const y = A.y + my + roll, tr = tearAt(A.y + my), dx = tr ? tr[0] : 0;
        px(A.x + mx + dx - split, y, RED);
        px(A.x + mx + dx + split, y, CYAN);
      }
  // the body itself, row by row: torn, interlaced, rolled, posterised, tinted where the bar passes
  for (let my = 0; my < A.h; my++) {
    const ry = A.y + my, y = ry + roll;
    if (interlace && (my & 1)) continue;
    const tr = tearAt(ry), dx = tr ? tr[0] : 0, tint = tr && tr[1] < 0.35 ? (tr[1] < 0.18 ? RED : CYAN) : 0, near = Math.abs(ry - bar);
    for (let mx = 0; mx < A.w; mx++) {
      const c = A.pixels[my * A.w + mx];
      if (!c) continue;
      let col = c;
      if (poster) col = luma(c) > 0.32 ? C[5] : C[1];
      else if (tint) col = mix(c, tint, 0.6);
      else if (near < 1) col = mix(c, C[5], 0.35);
      px(A.x + mx + dx, y, col);
    }
    // a torn row smears its edge pixel out sideways, fading
    if (tr && Math.abs(dx) > 2 && rand(S, f, ry) < 0.6) {
      const right = dx > 0, mx = right ? A.w - 1 - [...Array(A.w)].findIndex((_, i) => A.mask.data[my * A.w + A.w - 1 - i]) : [...Array(A.w)].findIndex((_, i) => A.mask.data[my * A.w + i]);
      if (mx >= 0 && mx < A.w) {
        const c = A.pixels[my * A.w + mx], L = 4 + Math.floor(rand(S, f, ry, 1) * 10);
        for (let i = 1; i <= L; i++) p.dot(A.x + mx + dx + (right ? i : -i), y, c, 1 - i / (L + 1));
      }
    }
  }
  // a roll leaves the top slice repeated at the bottom
  if (roll)
    for (let my = 0; my < -roll; my++)
      for (let mx = 0; mx < A.w; mx++) {
        const c = A.pixels[my * A.w + mx];
        if (c && ((mx + my) & 1)) px(A.x + mx, A.y + A.h + roll + my, mix(c, C[1], 0.5));
      }
  // junk blocks round the body
  if (burst)
    for (let i = 0; i < 2 + Math.floor(r(20) * 5 * k); i++) {
      const w = 2 + Math.floor(r(21, i) * 9), h = 1 + Math.floor(r(22, i) * 3), x = A.x - 6 + Math.floor(r(23, i) * (A.w + 12)), y = A.y + Math.floor(r(24, i) * A.h);
      const c = [WHITE, RED, CYAN, C[5], C[3]][Math.floor(r(25, i) * 5)];
      if (r(26, i) < 0.4) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) p.px(x + xx, y + yy, (xx + yy) & 1 ? c : C[0]);
      else p.rect(x, y, w, h, c);
    }
  // dead pixels thrown off by a burst, drifting and blinking out
  for (const [a, b, kk] of BURSTS) {
    const age = (f - a + NF) % NF;
    if (age > b - a + 8) continue;
    for (let i = 0; i < 10 * kk; i++) {
      const life = 4 + Math.floor(rand(S, a, i) * 6), at = Math.floor(rand(S, a, i, 1) * (b - a + 1)), q = age - at;
      if (q < 0 || q > life || (q > life / 2 && (q & 1))) continue;
      const x0 = A.x + rand(S, a, i, 2) * A.w, y0 = A.y + rand(S, a, i, 3) * A.h, side = rand(S, a, i, 4) < 0.5 ? -1 : 1;
      p.px(x0 + side * q * (1 + rand(S, a, i, 5) * 2), y0 - q * 0.5, [WHITE, RED, CYAN][i % 3]);
    }
  }
  // light: a cold flicker in the bursts, the split's colors glowing at its edges
  if (burst) {
    if (f === burst[0]) p.glow(A.x + A.w / 2, A.y + A.h / 2, 26, C[5], 0.4);
    p.glow(A.x + A.w / 2 - split * 4, A.y + A.h / 2, 18, RED, 0.18 * k);
    p.glow(A.x + A.w / 2 + split * 4, A.y + A.h / 2, 18, CYAN, 0.18 * k);
  }
  if (Math.abs(bar - (A.y + A.h / 2)) < A.h / 2 + 3) p.glowLine(A.x - 2, bar, A.x + A.w + 2, bar, 4, C[4], 0.12);
}
