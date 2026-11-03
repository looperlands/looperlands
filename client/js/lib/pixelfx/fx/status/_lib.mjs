// Shared by the status effects (files starting with _ are helpers, not effects): the character's shape, noise
// that loops, and the toolkit's flame, smoke and ember particles drawn from their age alone, so loops stay seamless.
// The flame tongue, flame puff, smoke and ember recipes are
// adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.
// The shaded, outlined icons are
// adapted from Sprite Fusion's open-source heal (https://www.spritefusion.com/pixel-art-vfx/heal),
// MIT License, Copyright (c) 2026 Hugo Duprez.

import { rand, wrap, mix, luma, WHITE, SMOKE_RAMP } from "../../core/index.mjs";

const SHAPES = new WeakMap();

/**
 * The character's shape, worked out once per mask, in mask space (0, 0 = its top-left): `on(x, y)`, `body`
 * ([x, y] of every pixel), `up` (pixels with nothing above them: where flames stand), `side` ([x, y, dir] of
 * pixels open to the left (-1) or right (1)), `outline` ([x, y, nx, ny]: empty cells touching it, with the
 * outward normal), `top` (each column's first row, -1 if empty) and `rows` ([left, right] of each row).
 */
export function shape(a) {
  const m = a.mask;
  let s = SHAPES.get(m);
  if (s) return s;
  const { w, h, data } = m, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] > 0;
  const body = [], up = [], side = [], outline = [], top = [], rows = [];
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h && !on(x, y)) y++;
    top.push(y < h ? y : -1);
  }
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      if (l < 0) l = x;
      r = x;
      body.push([x, y]);
      if (!on(x, y - 1)) up.push([x, y]);
      if (!on(x - 1, y)) side.push([x, y, -1]);
      if (!on(x + 1, y)) side.push([x, y, 1]);
    }
    rows.push([l, r]);
  }
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      if (on(x, y)) continue;
      let nx = 0, ny = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) (nx -= dx), (ny -= dy);
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) {
        const l = Math.hypot(nx, ny) || 1;
        outline.push([x, y, nx / l, ny / l]);
      }
    }
  s = { w, h, on, body, up, side, outline, top, rows };
  SHAPES.set(m, s);
  return s;
}

/** The character's own color at mask pixel (x, y), or a mid grey for a mask without pixels. */
export const colorAt = (a, x, y) => (a.pixels ? a.pixels[y * a.mask.w + x] : a.mask.data[y * a.mask.w + x] ? 0xff6b6b6b : 0);

/** 1D value noise in [-1, 1] whose lattice wraps every P cells. */
export function wnoise(x, P, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = rand(wrap(i, P), seed), b = rand(wrap(i + 1, P), seed);
  return (a + (b - a) * u) * 2 - 1;
}

/** Noise of time t that repeats every D seconds, about f wiggles a second; off slides along it (ripples). */
export function tnoise(t, D, f, seed = 0, off = 0) {
  const P = Math.max(2, Math.round(f * D));
  return wnoise((t / D) * P + off, P, seed);
}

/** How far something has moved after age a, launched at speed v under acceleration g with linear drag d. */
export const travel = (v, g, d, a) => (d > 0 ? (g / d) * a + ((v - g / d) * (1 - Math.exp(-d * a))) / d : v * a + 0.5 * g * a * a);

// A tongue's nested layers: [width, height, ramp step (0 brightest)]: a deep rim, orange, yellow, a white heart.
export const LAYERS = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];

/**
 * A flame tongue standing on (x, y): h tall, w half-wide at its root, its tip swept sx px sideways, filled in
 * nested layers from F (bright to dark, 9 steps). Rows ripple with noise that loops every D seconds (seed n).
 */
export function tongue(p, x, y, h, w, sx, F, t, D, n, layers = LAYERS) {
  if (h < 1) return;
  for (const [lw, lh, ri] of layers) {
    if (ri === 0 && h < 4) continue;
    const H = h * lh, col = F[ri];
    for (let r = 0; r <= H; r++) {
      const u = r / Math.max(1, H);
      const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + tnoise(t, D, 9, n, r * 0.45) * 0.5;
      if (half < 0.3) continue;
      const cx = x + sx * u * u * lh + tnoise(t, D, 4, n + 7, r * 0.2) * u * 1.1;
      for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) p.px(px, Math.round(y - r), col);
    }
  }
}

/** A ball of flame at age u (0..1) of its life, radius size, cooling down F (bright to dark) as it rises. */
export function flame(p, x, y, size, u, F, heatSeed = 0) {
  const n = F.length, k = 1 - u;
  const heat = Math.min(0.999, Math.pow(u, 0.62) + heatSeed * 0.1), idx = Math.min(n - 2, Math.floor(heat * (n - 1)));
  const r = size * (0.55 + 0.45 * Math.min(1, u * 7)) * (1 - u * 0.55), c = F[idx];
  if (idx >= n - 2) return p.disc(x, y, r, c, Math.min(1, k * 3) * 0.85);
  p.circle(x, y, r, F[Math.min(n - 1, idx + 2)]);
  p.circle(x - r * 0.16, y - r * 0.22, r * 0.78, c);
  if (r > 1.6) p.circle(x, y - r * 0.9, r * 0.42, c);
  if (idx <= 3 && r > 1.8) p.circle(x - r * 0.28, y - r * 0.34, r * 0.36, F[Math.max(0, idx - 1)]);
  if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, 0.18 * k);
}

const rampAt = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];

/**
 * A puff of smoke at age u (0..1): three soft discs (a body, a denser core sitting low, a lit cap while young),
 * swelling and thinning, tinted col and walking down the smoke ramp. warm (a color) lights its underside.
 */
export function smoke(p, x, y, size, u, col, k = 1, warm = 0) {
  const r = size * (0.65 + Math.min(1, u * 2.5) * 0.45 + u * 0.4);
  const a = Math.min(1, u * 12) * Math.min(1, (1 - u) * 2.4) * 0.58 * k;
  if (a <= 0.01) return;
  const c = col ? mix(col, rampAt(SMOKE_RAMP, u), u) : rampAt(SMOKE_RAMP, u * 1.05);
  p.disc(x, y, r, c, a * 0.45);
  p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
  if (warm && u < 0.6) p.disc(x + r * 0.1, y + r * 0.3, r * 0.56, mix(c, warm, 0.5), a * 0.7 * (1 - u / 0.6));
  if (u < 0.5) p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - u * 2));
}

/** An ember at age u: hot and flickering, cooling to a dim red that blinks out. E is [hot, warm, cool]. */
export function ember(p, x, y, u, E, ph, k = 1) {
  const left = 1 - u;
  if (left < 0.22 && Math.sin(ph * 40) < 0) return;
  const c = left > 0.5 ? (Math.sin(ph * 22) > -0.2 ? E[0] : E[1]) : left > 0.22 ? E[1] : E[2];
  p.px(x, y, c);
  p.glow(x, y, 3, c, 0.32 * left * k);
}




/** A flat, translucent bank of haze centred on (x, y), rx by ry, thinning to nothing at its edge. */
export function haze(p, x, y, rx, ry, col, a) {
  if (a <= 0.01 || rx < 0.5 || ry < 0.5) return;
  for (let py = Math.floor(y - ry); py <= Math.ceil(y + ry); py++)
    for (let px = Math.floor(x - rx); px <= Math.ceil(x + rx); px++) {
      const dx = (px + 0.5 - x) / rx, dy = (py + 0.5 - y) / ry, d = dx * dx + dy * dy;
      if (d < 1) p.blend(px, py, col, a * (1 - d));
    }
}

/**
 * A shape from a bitmap (rows of strings, "." empty), centred on (0, 0), scaled up by whole k, mirrored if flip:
 * returns inside(dx, dy) giving the bitmap's character there (or "").
 */
export function bitmap(rows, k = 1, flip = false) {
  const h = rows.length, w = rows[0].length, ox = Math.floor((w * k) / 2), oy = Math.floor((h * k) / 2);
  return (dx, dy) => {
    let bx = Math.floor((dx + ox) / k);
    const by = Math.floor((dy + oy) / k);
    if (bx < 0 || by < 0 || bx >= w || by >= h) return "";
    if (flip) bx = w - 1 - bx;
    const c = rows[by][bx];
    return c === "." ? "" : c;
  };
}

/**
 * A little shaded pixel icon at (x, y): every cell where inside(dx, dy) is truthy, within ext of the centre, filled
 * from R = [outline, shadow, body, light] (lit on its top and left edges, shaded on the bottom and right, ringed by
 * the outline) and recoloured where inside returns a character listed in paint ({ e: eyeColor, ... }). a fades it.
 */
export function icon(p, x, y, ext, inside, R, a = 1, paint = null) {
  const X = Math.round(x), Y = Math.round(y), at = (dx, dy) => !!inside(dx, dy);
  for (let dy = -ext - 1; dy <= ext + 1; dy++)
    for (let dx = -ext - 1; dx <= ext + 1; dx++) {
      const ch = inside(dx, dy);
      let c;
      if (ch) {
        if (paint && paint[ch] !== undefined) c = paint[ch];
        else {
          const top = !at(dx, dy - 1), left = !at(dx - 1, dy), bottom = !at(dx, dy + 1), right = !at(dx + 1, dy);
          c = top || left ? R[3] : bottom || right ? R[1] : R[2];
        }
      } else if (R[0] && (at(dx - 1, dy) || at(dx + 1, dy) || at(dx, dy - 1) || at(dx, dy + 1))) c = R[0];
      else continue;
      p.dot(X + dx, Y + dy, c, a);
    }
}

/** inside(dx, dy) for a shape given in its own unit space by f(u, v), rotated by ang and scaled by s px. */
export const shaped = (f, s, ang = 0) => {
  const c = Math.cos(ang), n = Math.sin(ang);
  return (dx, dy) => {
    const x = dx + 0.5, y = dy + 0.5;
    return f((x * c + y * n) / s, (-x * n + y * c) / s) ? "#" : "";
  };
};

/** A five-pointed star in unit space (points at radius 1, inner corners at r0). */
export function starShape(r0 = 0.45) {
  return (u, v) => {
    const a = Math.atan2(v, u) + Math.PI / 2, d = Math.hypot(u, v), seg = (2 * Math.PI) / 5;
    const k = 1 - Math.abs((((a % seg) + seg) % seg) - seg / 2) / (seg / 2); // 0 at a point, 1 between two
    return d <= 1 - (1 - r0) * Math.pow(k, 0.8);
  };
}

/** A heart in unit space (two lobes and a point, about 2 wide and 2 tall, centred). */
export const heartShape = (u, v) =>
  (u + 0.5) ** 2 + (v + 0.32) ** 2 <= 0.55 ** 2 || (u - 0.5) ** 2 + (v + 0.32) ** 2 <= 0.55 ** 2 || (v >= -0.32 && v <= 1 && Math.abs(u) <= 1.04 * Math.pow(1 - (v + 0.32) / 1.32, 0.75));

const EYES = new WeakMap();
/**
 * The character's eyes, if it has any we can find: small blobs of very dark pixels (with any white beside them)
 * inside the upper part of the body, surrounded by it. [{ x0, x1, y0, y1, px: [[x, y]...], skin }] in mask
 * space, left to right; skin is the colour round them, to paint them shut with. [] when nothing looks like eyes.
 */
export function eyes(a) {
  let list = EYES.get(a.mask);
  if (list) return list;
  // a body that says where its eyes would go: a blank head still needs somewhere to go pink, burn or shut
  if (a.eyes) {
    list = a.eyes.map(([x, y]) => ({ x0: x, x1: x, y0: y, y1: y + 1, px: [[x, y], [x, y + 1]], skin: colorAt(a, x, y) }));
    EYES.set(a.mask, list);
    return list;
  }
  const S = shape(a), W = S.w, col = (x, y) => (S.on(x, y) ? colorAt(a, x, y) : 0);
  const dark = (x, y) => S.on(x, y) && y < S.h * 0.4 && luma(col(x, y)) < 0.15 && S.on(x - 1, y) && S.on(x + 1, y) && S.on(x, y - 1) && S.on(x, y + 1);
  const seen = new Set();
  list = [];
  for (const [x0, y0] of S.body) {
    if (seen.has(y0 * W + x0) || !dark(x0, y0)) continue;
    const px = [], q = [[x0, y0]];
    seen.add(y0 * W + x0);
    while (q.length) {
      const [x, y] = q.pop();
      px.push([x, y]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = ny * W + nx;
        if (seen.has(k) || !(dark(nx, ny) || (S.on(nx, ny) && luma(col(nx, ny)) > 0.95))) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    if (px.length < 2 || px.length > 14) continue;
    const xs = px.map((p) => p[0]), ys = px.map((p) => p[1]), counts = new Map();
    const e = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), px };
    for (const [x, y] of px)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) {
        const c = col(x + dx, y + dy), l = luma(c);
        if (c && l > 0.5 && l < 0.95 && !px.some((p) => p[0] === x + dx && p[1] === y + dy)) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    e.skin = [...counts].sort((p, q) => q[1] - p[1])[0]?.[0];
    if (e.skin && e.x1 - e.x0 <= 4 && e.y1 - e.y0 <= 5) list.push(e);
  }
  list.sort((p, q) => p.x0 - q.x0);
  if (list.length > 2) list = [];
  EYES.set(a.mask, list);
  return list;
}
