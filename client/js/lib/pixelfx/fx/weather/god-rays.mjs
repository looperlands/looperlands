// The banded light (posterized steps from a hot core to the edges, fine strands through it, light laid over the top)
// is adapted from Sprite Fusion's open-source holy light (https://www.spritefusion.com/pixel-art-vfx/holy-light),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rand, mix, TAU, WHITE } from "../../core/index.mjs";
import { clip, rows } from "./_lib.mjs";

export const meta = {
  name: "God rays",
  desc: "Shafts of light slant down from high on the left, breathing and swaying, pooling on the floor, as drifting dust motes light up whenever they cross a beam.",
  tags: ["weather", "god rays", "light", "sunbeam", "dust", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 170],
  duration: 10,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#1a1208", "#3a2810", "#7a5a24", "#c89a44", "#f2d27a", "#fff2c4", "#ffffff"],
    seed: 3,
  },
};

const D = 10, W = 320, SX = -230, SY = -300;
// the fan's axis (down and to the right) and its normal; a pixel's place across the fan is its angle from it
const AX = Math.cos(0.94), AY = Math.sin(0.94), NX = -AY, NY = AX;
// the shafts: angle off the axis, half width (radians), strength, breathing (cycles a loop), sway
const SHAFTS = [
  { c: -0.27, h: 0.03, k: 0.65, b: 1, sw: 0.006 },
  { c: -0.17, h: 0.022, k: 0.55, b: 2, sw: 0.005 },
  { c: -0.07, h: 0.05, k: 1, b: 1, sw: 0.008 },
  { c: 0.03, h: 0.018, k: 0.6, b: 3, sw: 0.004 },
  { c: 0.12, h: 0.042, k: 0.85, b: 2, sw: 0.007 },
  { c: 0.23, h: 0.026, k: 0.6, b: 1, sw: 0.005 },
];
const STR = new Float32Array(512);

// light at a point: the shafts it's in, softened at their edges, fading with distance, threaded with strands
function lightAt(x, y, sh) {
  const dx = x - SX, dy = y - SY, r = dx * AX + dy * AY, ang = (dx * NX + dy * NY) / r;
  let e = 0;
  for (const s of sh) {
    const q = Math.abs(ang - s.c) / s.h;
    if (q < 1) e += s.k * (1 - q * q) ** 1.5;
  }
  if (e <= 0) return 0;
  const strand = STR[clamp(Math.floor((ang + 0.36) * 700), 0, 511)], fall = clamp(1.25 - (r - 230) / 420);
  return e * fall * (0.7 + 0.45 * strand);
}

export function drawBack(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 7);
  const sh = shafts(t, S);
  // dark air the light falls through, a dark floor it lands on; each beam posterized into a white-hot core, a
  // gold body and a soft translucent edge, brightest near the sun and fading as it falls
  const L = C.map((c) => mix(C[0], c, 0.75));
  const n = sh.length, SC = new Float32Array(n), SI = new Float32Array(n), SK = new Float32Array(n);
  sh.forEach((s, j) => ((SC[j] = s.c), (SI[j] = 1 / s.h), (SK[j] = s.k)));
  rows(p, meta, -170, 9, (y, R) => {
    const floor = y > 0, dy = y - SY, air = floor ? 0.8 : 0.66, boost = floor ? 1.6 : 1;
    let r = (-160 + 0.5 - SX) * AX + dy * AY, nn = (-160 + 0.5 - SX) * NX + dy * NY;
    R.a.fill(air);
    R.b.fill(1);
    R.c.fill(C[0]);
    for (let i = 0; i < W; i++, r += AX, nn += NX) {
      const ang = nn / r;
      let e = 0;
      for (let j = 0; j < n; j++) {
        const q2 = (ang - SC[j]) * SI[j];
        if (q2 > -1 && q2 < 1) {
          const w = 1 - q2 * q2;
          e += SK[j] * w * Math.sqrt(w);
        }
      }
      if (e <= 0) continue;
      const fall = 1.35 - (r - 200) / 330, si = ((ang + 0.36) * 700) | 0;
      e *= (fall > 1 ? 1 : fall < 0 ? 0 : fall) * (0.7 + 0.45 * STR[si < 0 ? 0 : si > 511 ? 511 : si]) * boost;
      if (e < 0.06) continue;
      const lv = e > 1.05 ? 6 : e > 0.78 ? 5 : e > 0.52 ? 4 : e > 0.3 ? 3 : 2;
      R.c[i] = floor ? C[lv] : L[lv];
      R.a[i] = floor ? 0.85 : Math.min(0.78, 0.12 + e * 0.5);
      R.l[i] = C[4];
      R.k[i] = e * (floor ? 0.32 : 0.26);
    }
  });
  // the sun's glare where the beams come in
  q.glow(-168, -178, 130, C[3], 0.3);
  q.glow(-168, -178, 50, C[5], 0.35);
  motes(q, t, S, C, sh, false);
}

export function draw(p, t, o) {
  const q = clip(p, meta), S = o.seed, C = fit(o.palette, 7);
  motes(q, t, S, C, shafts(t, S), true);
}

// each shaft breathes and sways on whole cycles; the strands drift slowly across the beams
function shafts(t, S) {
  for (let i = 0; i < 512; i++) {
    const a = i / 512;
    STR[i] = 0.5 + 0.5 * Math.sin(a * 190 + Math.sin((TAU * t) / D) * 2 + S) * Math.sin(a * 77 - (TAU * t) / D + S * 2);
  }
  return SHAFTS.map((s, i) => ({ c: s.c + s.sw * Math.sin((TAU * t) / D + i * 1.3), h: s.h * (1 + 0.15 * Math.sin((TAU * s.b * t) / D + i)), k: s.k * (0.72 + 0.28 * Math.sin((TAU * s.b * t) / D + i * 2.1)) }));
}

// dust motes drifting slowly, invisible in the dark, catching the light as they cross a beam
function motes(q, t, S, C, sh, front) {
  for (let i = front ? 0 : 50; i < (front ? 50 : 160); i++) {
    const R = (k) => rand(S, i, k), n1 = 1 + Math.floor(R(1) * 2), n2 = 1 + Math.floor(R(2) * 2);
    const x = -170 + R(3) * 340 + (8 + R(4) * 14) * Math.sin((TAU * n1 * t) / D + R(5) * TAU), y = -170 + R(6) * 172 + (6 + R(7) * 10) * Math.sin((TAU * n2 * t) / D + R(8) * TAU) + 4 * Math.sin((TAU * 3 * t) / D + i);
    const e = lightAt(x, y, sh);
    if (e < 0.12) continue;
    const big = front && R(9) < 0.5, k = Math.min(1, e);
    q.px(x, y, k > 0.6 ? WHITE : k > 0.3 ? C[5] : C[4]);
    if (big && k > 0.5) (q.px(x + 1, y, C[4]), q.px(x, y + 1, C[4]));
    q.glow(x, y, big ? 6 : 4, C[4], 0.4 * k);
  }
}
