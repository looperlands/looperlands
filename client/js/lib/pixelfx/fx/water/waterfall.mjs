// The pool's caustic light (two warped sine nets, light where they cross zero) is adapted from Sprite Fusion's
// open-source bubbles (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, tileNoise, rand, clamp, smooth, ease, TAU, WHITE } from "../../core/index.mjs";
import { WATER, bead, ring, billow, rock } from "./_lib.mjs";

export const meta = {
  name: "Waterfall",
  desc: "A river pours from a notch in a rock outcrop: a white curl, a deep sheet that splits into strands, churning foam, spray, drifting mist and rings on a dark pool.",
  tags: ["water", "waterfall", "cascade", "foam", "mist", "ambient", "loop"],
  size: [144, 136],
  origin: [72, 118],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, height: 92, width: 13, ledge: true, seed: 5 },
};

const D = meta.duration, SY = 0.2, G = 760, POOL = [56, 11];

// half the sheet's width at depth d below the lip: it spreads a little as it falls
const halfW = (W, d, H) => W + 3.2 * Math.pow(clamp(d / H), 1.6);

// the falling sheet, in 1 px lanes. Lanes on the far side of the fall are dark and see-through, so the night shows
// between strands; the front lanes carry white dashes sliding down them, stretching as the water speeds up (the
// texture runs in fall time, √depth). The top is glassy and dark, and the lower third splits into strands that
// fan apart with gaps between, each lit down its left edge.
function sheet(p, C, ph, H, W, S) {
  for (let y = -H + 2; y <= -1; y++) {
    const d = y + 0.5 + H, v = d / H, s = Math.sqrt(d + 3), hw0 = halfW(W, d, H), split = smooth(0.56, 0.95, v), glass = 1 - smooth(4, 24, d);
    const wl = tileNoise(2, s * 1.4 - ph * 12, 0, 12, S + 2) * (0.4 + 1.8 * v), wr = tileNoise(11, s * 1.4 - ph * 12, 0, 12, S + 2) * (0.4 + 1.8 * v);
    const fan = split > 0 ? tileNoise(3, s * 0.8 - ph * 4, 0, 4, S + 61) * 1.6 : 0, sd = s * 1.5 - ph * 20, sb = s * 0.45 - ph * 6;
    for (let X = -W - 8; X <= W + 8; X++) {
      const x = X + 0.5, hw = hw0 + (x < 0 ? wl : wr), ax = Math.abs(x);
      if (ax > hw) continue;
      const e = ax / hw;
      let edge = false;
      if (split > 0) {
        const f = ((((x / (1 + 0.22 * split) + fan + 64) / 5.4) % 1) + 1) % 1;
        if (f > 1 - 0.46 * split) continue;
        edge = f < 0.2;
      }
      const dash = tileNoise(X * 1.618 + 0.31, sd, 0, 20, S);
      if (rand(X, S + 60) < 0.48 && e < 0.86 && !edge) {
        p.blend(x, y + 0.5, dash > 0.45 ? C[4] : glass > 0.5 ? C[3] : C[2], dash > 0.45 ? 0.7 : 0.42 + 0.15 * v);
        continue;
      }
      const broad = tileNoise(Math.floor((x + 40) / 3) * 2.7, sb, 0, 6, S + 1);
      let b = -0.34 + 0.46 * v + 0.3 * broad - glass * 0.5 + 0.35 * smooth(0.7, 1, e) * (x < 0 ? 1 : 0.3) - (x > 0 ? 0.12 * e : 0) + (edge ? 0.3 : 0);
      if (dash > 0.2 - 0.22 * v) b += 0.36 + 0.7 * (dash - 0.2);
      if (b > -0.2) p.px(X, y, b > 0.62 ? WHITE : b > 0.34 ? C[6] : b > 0.08 ? C[5] : C[4]);
      else p.blend(x, y + 0.5, C[3], 0.8);
    }
  }
  // strands peel off the edges and fall free
  cycle(ph * D, D, 16, S + 30, 0.4, (age, life, r) => {
    const side = r.sign(), d0 = r.range(14, H * 0.7), d = d0 + 50 * age + 260 * age * age, k = age / life;
    if (d > H - 6) return;
    const x = side * (halfW(W, d, H) + 1.5 + age * r.range(6, 16)), y = -H + d, len = 2 + 6 * k;
    p.line(x, y - len, x, y, (u) => (u > 0.7 ? C[6] : C[4]), 1 - k * 0.5);
  });
}

// the outcrop the river pours from: boulders shaded like the explosion's rocks (a lit top edge, shaded faces, a
// dark underside, a dark rim), creased where they meet, cracked; dark and glossy where the water runs over them
// which boulder is frontmost at each pixel of the outcrop, and how much light its face catches there
const ROCKS = new Map();
function rockMap(lumps, x0, y0, w, hgt, Lx, Ly, Lz, S) {
  const id = new Int8Array(w * hgt).fill(-1), lit = new Float32Array(w * hgt);
  for (let j = 0; j < hgt; j++)
    for (let i = 0; i < w; i++) {
      const x = x0 + i + 0.5, y = y0 + j + 0.5;
      let best = -1, z = -1e9, l = 0;
      lumps.forEach(([cx, cy, rx, ry], k) => {
        const nx = (x - cx) / rx, ny = (y - cy) / ry, r2 = nx * nx + ny * ny;
        if (r2 >= 1) return;
        const nz = Math.sqrt(1 - r2), depth = nz * ry + (k === 5 ? -6 : k === 2 ? -3 : k > 2 ? -1 : 0);
        if (depth > z) (z = depth), (best = k), (l = nx * Lx + ny * Ly + nz * Lz);
      });
      id[j * w + i] = best;
      lit[j * w + i] = l + 0.2 * tileNoise(x * 0.32, y * 0.32, 0, 0, S + 70);
    }
  return { id, lit };
}

function outcrop(p, C, ph, H, W, S) {
  const ST = rock(), Lx = -0.55, Ly = -0.72, Lz = 0.42;
  // [x, y, rx, ry]: a big boulder left of the notch, a smaller one right, the sill the water runs over, two feet,
  // and a slab behind that joins them, the notch cut into it
  const lumps = [[-W - 11, -H - 4, 13, 10], [W + 8, -H - 2, 9, 7.5], [0, -H + 3.5, W + 3, 4.2], [-W - 21, -H + 4, 7, 5.5], [W + 15, -H + 4.5, 5, 4], [-2, -H - 5, W + 7, 6.5]];
  const x0 = -W - 29, x1 = W + 21, y0 = -H - 15, y1 = -H + 10, w = x1 - x0 + 1, hgt = y1 - y0 + 1, key = `${W}|${H}|${S}`;
  let map = ROCKS.get(key);
  if (!map) ROCKS.set(key, (map = rockMap(lumps, x0, y0, w, hgt, Lx, Ly, Lz, S)));
  const { id, lit } = map;
  // a soft shadow under it on whatever is behind
  p.each(-W - 26, -H, W + 18, -H + 20, (x, y, sx, sy) => {
    const k = 1 - Math.hypot((x + 4) / (W + 22), (y + H) / 20);
    if (k > 0) p.blendPx(sx, sy, ST[0], 0.4 * Math.min(1, k * 3));
  });
  const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= hgt ? -1 : id[j * w + i]);
  for (let j = 0; j < hgt; j++)
    for (let i = 0; i < w; i++) {
      const k = id[j * w + i], x = x0 + i, y = y0 + j;
      // the river runs over the sill: nothing of the sill shows through it
      if ((k === 2 || k === 5 || k < 0) && y >= -H - 5 && y < -H + 1 && Math.abs(x + 0.5) < W + 1.5) continue;
      if (k < 0) {
        if (at(i - 1, j) >= 0 || at(i + 1, j) >= 0 || at(i, j - 1) >= 0 || at(i, j + 1) >= 0) p.px(x, y, ST[0]);
        continue;
      }
      // a crease where one boulder sits in front of another
      const r = at(i + 1, j), b = at(i, j + 1);
      if ((r >= 0 && r !== k && r < k) || (b >= 0 && b !== k)) {
        p.px(x, y, ST[1]);
        continue;
      }
      const l = lit[j * w + i], wet = Math.abs(x + 0.5) < W + 6 && y > -H - 9;
      let c = l > 0.9 ? ST[5] : l > 0.64 ? ST[4] : l > 0.3 ? ST[3] : l > -0.05 ? ST[2] : ST[1];
      if (k === 5) c = l > 0.7 ? ST[3] : l > 0.2 ? ST[2] : ST[1];
      if (at(i, j - 1) < 0 && l > 0.25) c = ST[5];
      if (wet) {
        // wet stone: a step darker, a cool gloss running down it where the light catches
        c = l > 0.9 ? ST[4] : l > 0.64 ? ST[3] : l > 0.3 ? ST[2] : ST[1];
        if (l > 0.3 && tileNoise(x * 0.9, y * 0.6 - ph * 8, 0, 8, S + 71) > 0.42) c = l > 0.6 ? C[6] : C[4];
      }
      p.px(x, y, c);
    }
  // cracks: dark lines with a lit lip above them
  for (let q = 0; q < 3; q++) {
    const L = lumps[q % 2], cx = Math.floor(L[0] + (q === 2 ? -0.5 : 0.15) * L[2]), cy = Math.floor(L[1] + L[3] * (q === 2 ? 0.1 : -0.25));
    const len = 3 + Math.floor(rand(q, S + 74) * 4), dx = rand(q, S + 75) < 0.5 ? 1 : -1;
    for (let n = 0; n <= len; n++) {
      const x = cx + Math.round(n * 0.6) * dx, y = cy + n, i = x - x0, j = y - y0;
      if (at(i, j) < 0 || at(i, j) > 1 || at(i, j + 1) < 0) break;
      p.px(x, y, n === len ? ST[1] : ST[0]);
      if (n === 0) p.px(x - dx, y - 1, ST[4]);
    }
  }
  // trickles run down the wet faces either side of the notch
  for (const sx of [-W - 3, W + 3]) {
    for (let y = -H - 2; y < -H + 7; y++) {
      const g = ((y * 0.35 - ph * 6) % 1 + 1) % 1, i = Math.floor(sx) - x0, j = Math.floor(y) - y0;
      if (at(i, j) >= 0) p.px(sx, y, g < 0.3 ? C[6] : C[3]);
    }
  }
}

// the river sliding out of the notch between the boulders, seen from just above: flow lines sliding to the edge
function river(p, C, ph, H, W, S) {
  const top = -H - 6;
  p.shade(-W - 3, top, W + 3, -H, (x, y, out) => {
    const back = top + 1.5 + tileNoise(x * 0.3, 4, 0, 0, S + 62) * 1.5, v = (y - back) / (-H - back), hw = W + 2 - (1 - v) * 3;
    if (y < back || Math.abs(x) > hw) return;
    const n = tileNoise(x * 0.32, (y - top) * 0.7 - ph * 8, 0, 8, S + 3);
    out.c = n > 0.66 ? C[6] : n > 0.4 ? C[5] : v < 0.5 ? C[3] : C[4];
  });
}

// the curl over the edge: glassy blue as it rolls, a hard white line along the bend; its light on the stone
function curl(p, C, ph, H, W, S) {
  for (let x = -W; x <= W; x++) {
    const g = tileNoise(x * 0.45, ph * 4, 0, 4, S + 4);
    p.px(x, -H - 1, C[4]);
    p.px(x, -H, WHITE);
    p.px(x, -H + 1, g > 0.2 ? C[6] : C[5]);
  }
  p.glowLine(-W, -H, W, -H, 6, C[6], 0.18);
  p.glow(0, -H, 34, C[5], 0.2);
  // glints run along it
  cycle(ph * D, D, 4, S + 5, 0.36, (age, life, r) => {
    const k = Math.sin((Math.PI * age) / life), x = r.range(-W, W);
    if (k > 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, -H + dy, C[6]);
    p.glow(x, -H, 6, C[5], 0.4 * k);
  });
}

// the pool: dark see-through water, a lit far rim, caustic light swimming in it, the falls' reflection
function pool(p, C, ph, W, S) {
  const [RX, RY] = POOL, cy = 2;
  const T = ph * TAU, cols = [];
  for (let X = -RX; X < RX; X++) {
    const x = X + 0.5;
    cols.push([Math.sin(x * 0.11 - T * 2), Math.sin(T + x * 0.05) * 1.4 + x * 0.13]);
  }
  for (let Y = Math.floor(cy - RY); Y < cy + RY; Y++) {
    const y = Y + 0.5, dy = (y - cy) / RY, sy = Math.sin(y * 0.5 + T);
    for (let X = -RX; X < RX; X++) {
      const x = X + 0.5, dx = x / RX, d = dx * dx + dy * dy;
      if (d > 1) continue;
      p.blend(x, y, d < 0.12 ? C[2] : C[1], 0.62 * Math.min(1, (1 - d) * 4));
      // caustics: two warped sine nets, light where either crosses zero
      const [cx1, cx2] = cols[X + RX], u = x * 0.2 + 1.8 * sy, w = y * 0.55 + 1.8 * cx1;
      const f = (Math.max(0, 1 - Math.abs(Math.sin(u) + Math.sin(w)) * 2.6) + 0.6 * Math.max(0, 1 - Math.abs(Math.sin(cx2 + y * 0.3)) * 3)) * (1 - d);
      if (f > 0.5) p.light(x, y, C[5], 0.18 * f);
    }
  }
  // a few glints sit on the far shore
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.12 + 0.76 * ((i + 0.5) / 7)), x = Math.cos(a) * RX * 0.96, y = cy + Math.sin(a) * RY * 0.96, g = Math.sin(ph * TAU * 2 + i * 2.4);
    if (g > 0.2) p.px(x, y, g > 0.8 ? C[6] : C[4]);
  }
  // the falls mirrored in the water, broken by the chop
  p.shade(-W - 3, 3, W + 3, 10, (x, y, out) => {
    const n = tileNoise(x * 0.9, (y - 3) * 0.35 + ph * 6, 0, 6, S + 6), k = 1 - (y - 3) / 7;
    if (Math.abs(x) > W + 2 - (y - 3) * 0.4 || n < 0.25 + (1 - k) * 0.4) return;
    out.c = n > 0.6 && k > 0.6 ? C[6] : C[5];
  });
}

// the foot: a churning white band, billows rolling out of it, spray thrown clear landing with rings
function foam(p, C, t, ph, W, S) {
  const R = W + 10;
  p.shade(-R, -13, R, 3, (x, y, out) => {
    const ax = Math.abs(x), lump = tileNoise(x * 0.22, ph * 6, 0, 6, S + 7) * 3 + tileNoise(x * 0.55 + 9, ph * 12, 0, 12, S + 8) * 1.5;
    const top = -8 + lump + Math.pow(ax / R, 2) * 7;
    if (ax > R - Math.max(0, -y - 1) * 0.6 || y < top) return;
    // the churn in lumps: each boil lit on top, shadowed under, darker where it meets the pool
    const n = tileNoise(x * 0.5, (y - top) * 0.5 - ph * 10, 0, 10, S + 9), boil = tileNoise(x * 0.42 + 3, y * 0.42 - ph * 8, 0, 8, S + 12), u = y - top;
    if (y > 1) out.c = n > 0 ? C[5] : C[4];
    else if (u < 1.2) out.c = WHITE;
    else if (boil < -0.3) out.c = u > 4 ? C[4] : C[5];
    else if (boil < -0.05) out.c = C[6];
    else out.c = n > -0.2 ? WHITE : C[6];
  });
  cycle(t, D, 30, S + 10, 0.7, (age, life, r) => {
    const k = age / life, side = r.sign(), x0 = r.range(-W, W) * 0.9, sp = r.range(2, 8), up = r.range(2, 8);
    const x = x0 + side * ease.outCubic(k) * sp, y = -r.range(2, 5) - ease.outCubic(k) * up, rad = r.range(1.4, 3) * Math.pow(Math.sin(Math.PI * k), 0.7);
    if (rad > 0.6) billow(p, x, y, rad, C);
  });
  // spray: beads thrown clear of the churn, landing in the pool with a ring
  cycle(t, D, 18, S + 11, 1, (age, life, r) => {
    const side = r.sign(), x0 = side * r.range(2, W + 4), vx = side * r.range(12, 60), vy = -r.range(70, 150), z = r.range(-3, 9), s = r.next() < 0.3 ? 2 : 1;
    const land = z * SY, tl = (-vy + Math.sqrt(vy * vy + 2 * G * (land + 5))) / G;
    if (age < tl) bead(p, x0 + vx * age, -5 + vy * age + 0.5 * G * age * age, vx, vy + G * age, s, C);
    else if (age < tl + 0.35) ring(p, x0 + vx * tl, land, 1 + (age - tl) * 12, SY, 1 - (age - tl) / 0.35, C, { n: 1 });
  });
}

// mist: soft puffs rolled out of the churn that drift sideways along the pool, swell and thin, with a cool light
function mist(p, C, t, S, n, seed) {
  cycle(t, D, n, S + seed, (g) => g.range(1.8, 2.8), (age, life, r) => {
    const k = age / life, side = r.sign(), drift = ease.outCubic(k);
    const x = side * (r.range(3, 12) + drift * r.range(24, 48)), y = -r.range(2, 7) - k * r.range(3, 12);
    const rad = r.range(4, 6) + k * r.range(5, 9), a = r.range(0.2, 0.3) * Math.min(1, k / 0.12) * Math.pow(1 - k, 1.7);
    p.disc(x, y, rad, C[6], (d) => a * (1 - d * d));
    if (a > 0.05) p.glow(x, y, rad * 1.2, C[4], 0.35 * a);
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, W = o.width;
  pool(p, C, ph, W, o.seed);
  for (let i = 0; i < 3; i++) {
    const f = (ph + i / 3) % 1;
    ring(p, 0, 1, W + 6 + f * 38, SY, 0.95 * Math.pow(1 - f, 1.5), C, { n: 1, half: -1, seed: i + 1 });
  }
  mist(p, C, t, o.seed, 7, 20);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, H = o.height, W = o.width, S = o.seed, T = ph * TAU;
  for (let i = 0; i < 3; i++) {
    const f = (ph + i / 3) % 1;
    ring(p, 0, 1, W + 6 + f * 38, SY, 0.95 * Math.pow(1 - f, 1.5), C, { n: 1, half: 1, seed: i + 1, glint: f < 0.4 ? 1 - f * 2.5 : 0 });
  }
  river(p, C, ph, H, W, S);
  if (o.ledge) outcrop(p, C, ph, H, W, S);
  sheet(p, C, ph, H, W, S);
  curl(p, C, ph, H, W, S);
  foam(p, C, t, ph, W, S);
  mist(p, C, t, S, 5, 21);
  // glints wink on the falling water and in the spray
  cycle(t, D, 12, S + 50, (g) => g.range(0.2, 0.4), (age, life, r) => {
    const k = Math.sin((Math.PI * age) / life), low = r.next() < 0.45, d = low ? H - r.range(4, 16) : r.range(12, H - 16);
    const x = low ? r.range(-W - 10, W + 10) : r.range(-0.8, 0.8) * halfW(W, d, H), y = -H + d - (age / life) * (low ? 6 : -10);
    p.px(x, y, WHITE);
    if (k > 0.55) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
    if (k > 0.85 && r.next() < 0.5) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) p.px(x + dx, y + dy, C[5]);
    p.glow(x, y, 5, C[5], 0.35 * k);
  });
  // fine spray hangs in the air off the foot, drifting up and out
  cycle(t, D, 34, S + 51, (g) => g.range(0.9, 1.6), (age, life, r) => {
    const k = age / life, side = r.sign(), x = side * (r.range(0, W + 6) + k * r.range(6, 22)) + Math.sin(age * 5 + r.range(0, TAU)) * 1.2, y = -r.range(3, 10) - k * r.range(10, 34);
    if (k > 0.7 && r.next() < (k - 0.7) * 3.3) return;
    p.px(x, y, k < 0.4 && r.next() < 0.5 ? WHITE : C[6]);
  });
  // light: down the sheet, a pool of it where the water lands, on the water around
  p.glowLine(0, -H + 6, 0, -8, 26, C[4], 0.12);
  p.glow(0, -5, 40, C[5], 0.32 + 0.05 * Math.sin(T * 2));
  p.glow(0, 4, 50, C[3], 0.14);
}
