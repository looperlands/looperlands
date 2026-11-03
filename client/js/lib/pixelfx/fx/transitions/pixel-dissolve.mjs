// The glints and the twinkling pixel dust follow Sprite Fusion's open-source sparkle
// (https://www.spritefusion.com/pixel-art-vfx/sparkle), MIT License, Copyright (c) 2026 Hugo Duprez.
import { PAL, fit, hex, clamp, ease, fbm, rand, WHITE } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, glint, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "Pixel dissolve",
  desc: "Clumps of blocks wink in, each drawn in a white outline that fills black and cools, with glints; then they wink out, outlines collapsing, the last small ones sparkling away.",
  tags: ["dissolve", "pixel", "blocks", "glint"],
  duration: 2.2,
  options: { palette: PAL.neon, seed: 1 },
});

const P = 0.17, IN0 = 0.04, IN1 = 0.8, OUT0 = 1.12, OUT1 = 1.85, CELL = 20;

// the blocks: 20 px cells, some whole, some in quarters, some in sixteenths. Each winks in and out at its own
// time read off a clumpy field, so they gather in growing patches: small ones scatter first, big ones fill in
const cache = new Map();
function layout(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const blocks = [];
  for (let cy = 0; cy < H / CELL; cy++)
    for (let cx = 0; cx < W / CELL; cx++) {
      const h = rand(cx, cy, seed), n = h < 0.32 ? 1 : h < 0.74 ? 2 : 4, s = CELL / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) blocks.push({ x: cx * CELL + i * s, y: cy * CELL + j * s, s });
    }
  const rank = (key) => {
    const v = blocks.map(key), out = new Float32Array(v.length);
    v.map((_, i) => i).sort((a, b) => v[a] - v[b]).forEach((i, k) => (out[i] = k / (v.length - 1)));
    return out;
  };
  const at = (b, sd) => fbm((b.x + b.s / 2) / 64, (b.y + b.s / 2) / 64, sd, 3);
  const uin = rank((b) => at(b, seed) + 0.22 * rand(b.x, b.y, seed + 1) + (b.s === 20 ? 0.12 : b.s === 5 ? -0.08 : 0));
  const uout = rank((b) => at(b, seed + 7) + 0.22 * rand(b.x, b.y, seed + 2) + (b.s === 20 ? -0.14 : b.s === 5 ? 0.1 : 0));
  blocks.forEach((b, i) => {
    b.tin = IN0 + uin[i] * (IN1 - IN0);
    b.tout = OUT0 + uout[i] * (OUT1 - OUT0);
    b.glint = rand(b.x, b.y, seed + 3) < (b.s >= 10 ? 0.32 : 0.1);
    b.gx = b.x + (rand(b.x, b.y, seed + 4) < 0.5 ? 0 : b.s);
    b.gy = b.y + (rand(b.x, b.y, seed + 5) < 0.5 ? 0 : b.s);
    b.spin = (rand(b.x, b.y, seed + 6) - 0.5) * 3;
    // now and then a big block throws a hero glint
    b.L = b.s === 20 && rand(b.x, b.y, seed + 8) < 0.45 ? 9 + 6 * rand(b.x, b.y, seed + 9) : 2.5 + b.s * 0.32;
  });
  cache.set(seed, blocks);
  return blocks;
}

// a square block, filled, with a 1 px rim
// a mote of pixel dust: a lone pixel, or now and then a little cross
function mote(p, x, y, c, cross) {
  p.px(x, y, c);
  if (cross) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, c);
}

function square(p, x, y, s, fill, rim) {
  const X = Math.round(x), Y = Math.round(y), S = Math.max(1, Math.round(s));
  if (fill) rect(p, X, Y, S, S, fill);
  if (rim && S > 2) rect(p, X, Y, S, 1, rim), rect(p, X, Y + S - 1, S, 1, rim), rect(p, X, Y, 1, S, rim), rect(p, X + S - 1, Y, 1, S, rim);
}

export function draw(p0, t, o) {
  const C = fit(o.palette, 8), ink = hex(o.color), p = clipTo(p0), blocks = layout(o.seed), glints = [], frame = Math.floor(t * 15);
  for (let n = 0; n < blocks.length; n++) {
    const b = blocks[n], ki = (t - b.tin) / P, ko = (t - b.tout) / P, { x, y, s } = b, cx = x + s / 2, cy = y + s / 2;
    if (ki < 0 || ko >= 1.6) continue;
    if (ko < 0) {
      if (ki >= 1) square(p0, x, y, s, ink);
      else {
        // winking in: a white outline swells to the block, it fills with black, its rim cools down the ramp
        const g = ki < 0.35 ? 0.35 + 0.65 * ease.outBack(ki / 0.35) : 1, h = s * g;
        const rim = ki < 0.45 ? WHITE : ki < 0.6 ? C[6] : ki < 0.75 ? C[5] : ki < 0.9 ? C[4] : C[3];
        square(p, cx - h / 2, cy - h / 2, h, ki > 0.2 ? ink : 0, rim);
        if (ki < 0.3 && s >= 10) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(cx - 0.5 + dx, cy - 0.5 + dy, dx || dy ? C[6] : WHITE);
        p.glow(cx, cy, s * 0.8 + 4, C[5], 0.45 * (1 - ki));
      }
      if (b.glint && ki > 0.15 && ki < 1.6) glints.push([b, (ki - 0.15) / 1.45, 1]);
      // pixel dust flickers round the fresh block
      if (ki < 1.4 && rand(frame, n, 9) < 0.35) mote(p, x + rand(frame, n, 10) * (s + 6) - 3, y + rand(frame, n, 11) * (s + 6) - 3, rand(frame, n, 12) < 0.5 ? WHITE : C[6], rand(frame, n, 17) < 0.25);
    } else {
      if (ko < 0.35) {
        // winking out: its rim lights up...
        const q = ko / 0.35;
        square(p0, x, y, s, ink, q < 0.4 ? C[4] : q < 0.75 ? C[5] : C[6]);
        p.glow(cx, cy, s * 0.8 + 3, C[4], 0.35 * q);
      } else if (ko < 0.75) {
        // ...the black drops away and the white outline collapses into its heart
        const q = (ko - 0.35) / 0.4, h = s * (1 - ease.inQuad(q) * 0.85);
        square(p, cx - h / 2, cy - h / 2, h, 0, q < 0.5 ? WHITE : C[6]);
        p.glow(cx, cy, s * 0.8 + 4, C[5], 0.45 * (1 - q * 0.5));
      } else if (ko < 1) {
        const q = (ko - 0.75) / 0.25;
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (!(dx || dy) || q < 0.5) p.px(cx - 0.5 + dx, cy - 0.5 + dy, dx || dy ? C[6] : WHITE);
        p.glow(cx, cy, s * 0.5 + 3, C[5], 0.35 * (1 - q));
      }
      if (b.glint && ko > 0.3) glints.push([b, (ko - 0.3) / 1.3, -1]);
      if (ko > 0.3 && ko < 1.5 && rand(frame, n, 13) < 0.3) mote(p, x + rand(frame, n, 14) * (s + 6) - 3, y + rand(frame, n, 15) * (s + 6) - 3, rand(frame, n, 16) < 0.5 ? WHITE : C[6], rand(frame, n, 18) < 0.25);
    }
  }
  // glints on top: a spinning star on a corner of the block, swelling and fading
  for (const [b, u, dir] of glints) {
    if (u <= 0 || u >= 1) continue;
    const L = b.L * Math.pow(Math.sin(Math.PI * u), 0.7);
    glint(p, b.gx, b.gy, L, b.spin * u * dir + 0.4, C[5], C[4]);
    if (b.L > 8) p.glow(b.gx, b.gy, 18 + L, C[5], 0.25 * Math.sin(Math.PI * u));
  }
}
