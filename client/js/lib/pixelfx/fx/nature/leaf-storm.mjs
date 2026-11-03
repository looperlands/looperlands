// The leaves' tumble (turning as they go, flipping over through edge-on, palettes of autumn and green) is adapted
// from Sprite Fusion's open-source falling leaves (https://www.spritefusion.com/pixel-art-vfx/falling-leaves),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { cycle, fit, rng, smooth, clamp, lerp, TAU, WHITE, READY } from "../../core/index.mjs";
import { drawLeaf } from "./_lib.mjs";

export const meta = {
  name: "Leaf storm",
  desc: "Leaves tumble up a rising spiral round the character, passing behind and in front, turning and flipping, wrapped in bright bands of wind; litter swirls at their feet.",
  tags: ["nature", "wind", "leaves", "buff", "aura", "actor", "loop"],
  size: [112, 104],
  origin: [56, 92],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#1a2420", "#2e4038", "#4a6656", "#7a9a84", "#b4d0b8", "#eef8e8"],
    leaves: ["#123818", "#2f7a2a", "#6cb83a", "#c8f070", "#4a2a08", "#a8701c", "#e8b42e", "#fff09a", "#3a1010", "#9a2e1c", "#e0642a", "#ffb070"],
    seed: 5,
  },
};

const UP = { turn: 1.1, crouch: 0, fx: -13, fy: -37, bx: 13, by: -37, ffx: -3, fbx: 4 };
export const act = {
  poses: [
    [0, UP],
    [0.6, { ...UP, lean: 2, fy: -40, by: -33 }],
    [1.2, { ...UP, crouch: -1 }],
    [1.8, { ...UP, lean: -2, fy: -33, by: -40 }],
    [2.4, UP],
  ],
};

const SY = 0.3, TOP = 64;
const ringR = (y) => 15 + 9 * clamp(-y / TOP);

// leaves riding the spiral: up from the floor, round two turns or so, flung out off the top
function leaves(p, L, t, seed, back) {
  cycle(t, meta.duration, 28, seed, (g) => g.range(1.5, 2.3), (age, life, R) => {
    const k = age / life, turns = R.range(1.4, 2.2), th = R.range(0, TAU) + turns * TAU * k, sn = Math.sin(th);
    if (sn > 0 === back) return;
    const y = -lerp(1, TOP, Math.pow(k, 0.9)) - R.range(0, 6), fling = smooth(0.75, 1, k), rr = ringR(y) * R.range(0.85, 1.15) + fling * 22;
    const x = Math.cos(th) * rr, yy = y + sn * rr * SY;
    const a = Math.min(1, k * 7) * (1 - smooth(0.85, 1, k)), spin = R.range(-9, 9) * age + th, fl = age * R.range(5, 11), o = R.int(0, 2) * 4;
    const pal = back ? [L[o], L[o], L[o + 1], L[o + 2]] : [L[o], L[o + 1], L[o + 2], L[o + 3]];
    drawLeaf(p, x, yy, R.range(6.5, 9), R.range(2.4, 3.3), spin, fl, pal, a);
    // a glint as it turns face on to the light
    if (!back && Math.abs(Math.cos(fl)) > 0.97) {
      p.px(x, yy, WHITE);
      p.glow(x, yy, 5, L[o + 3], 0.35 * a);
    }
  });
}

// wind bands: 1 px streaks on tilted rings round the character, bright at the head, fading behind, the far
// halves dimmer and behind it
function wind(p, C, t, seed, back) {
  for (let j = 0; j < 16; j++) {
    const R = rng(seed, j), y0 = -R.range(4, TOP - 4), r = ringR(y0) * R.range(1.0, 1.25), K = R.int(2, 3), span = R.range(1.1, 2.4);
    const head = R.range(0, TAU) + (TAU * K * t) / meta.duration, rise = R.range(-0.18, 0.18);
    for (let s = 0; s <= span; s += 0.45 / r) {
      const th = head - s, sn = Math.sin(th);
      if (sn > 0 === back) continue;
      const k = s / span, x = Math.cos(th) * r, y = y0 + sn * r * SY + (th - head) * rise * 4;
      const c = back ? (k < 0.3 ? C[3] : C[2]) : k < 0.06 && R.next() < 2 ? WHITE : k < 0.15 ? C[5] : k < 0.4 ? C[4] : C[3];
      if (k < 0.45) p.dot(x, y, c);
      else p.blend(x, y, c, 1.6 * (1 - k));
    }
    if (!back && Math.sin(head) > 0) p.glow(Math.cos(head) * r, y0 + Math.sin(head) * r * SY, 5, C[4], 0.25);
  }
}

// at the feet: litter and dust swept round on the floor
function swirl(p, C, L, t, seed, back) {
  cycle(t, meta.duration, 14, seed, (g) => g.range(0.6, 1.1), (age, life, R) => {
    const k = age / life, th = R.range(0, TAU) + R.range(6, 9) * age, sn = Math.sin(th);
    if (sn > 0 === back) return;
    const rr = R.range(10, 22) + k * 8, x = Math.cos(th) * rr, y = -1 - k * R.range(2, 8) + sn * rr * 0.25, s = R.range(2, 3.5) * (0.6 + k);
    p.disc(x, y, s, back ? C[2] : C[3], (1 - k) * Math.min(1, k * 6) * 0.3);
  });
  for (let j = 0; j < 6; j++) {
    const R = rng(seed + 9, j), rr = R.range(12, 24), th0 = R.range(0, TAU) + (TAU * 3 * t) / meta.duration, span = R.range(0.5, 1);
    for (let s = 0; s < span; s += 0.6 / rr) {
      const th = th0 - s;
      if (Math.sin(th) > 0 === back) continue;
      p.dot(Math.cos(th) * rr, 0.5 + rr * 0.2 * Math.sin(th), s < span * 0.4 ? C[3] : C[2], 1 - s / span);
    }
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 6), L = fit(o.leaves, 12);
  p.glow(0, -30, 46, C[4], 0.12);
  p.glow(0, -2, 26, L[2], 0.12);
  swirl(p, C, L, t, o.seed * 3 + 1, true);
  wind(p, C, t, o.seed * 5 + 2, true);
  leaves(p, L, t, o.seed * 7 + 3, true);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 6), L = fit(o.leaves, 12);
  swirl(p, C, L, t, o.seed * 3 + 1, false);
  wind(p, C, t, o.seed * 5 + 2, false);
  leaves(p, L, t, o.seed * 7 + 3, false);
}
