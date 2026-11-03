// The critters' kit. A creature is built in a small offscreen grid from shaded parts, given a 1 px outline
// (picked per side, so it can be darker in shadow and break into a highlight), then put on the painter, opaque
// or translucent. Pure loops also get loop-safe noise, springs, closed-form flight with a floor, and the
// toolkit's own particle looks for particles whose state is a function of time.
// The flame tongue and fire puff recipes are adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), and the bubble from its open-source bubbles
// (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.

import { Particles, Rng, hex, clamp, wrap, tileNoise, TAU, WHITE } from "../../core/index.mjs";

/**
 * The loop time for this critter: seeds other than 1 start it at a different point in its loop, so a crowd of
 * the same critter doesn't move in lockstep.
 */
export const shift = (t, D, seed = 1) => wrap(t + (seed - 1) * 0.618 * D, D);

/** A curve through keyframes [[x, value], ...] that doesn't wrap: held flat before the first and after the last. */
export function curve(x, list) {
  if (x <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    const [x0, v0] = list[i - 1], [x1, v1] = list[i];
    if (x <= x1) {
      const u = (x - x0) / (x1 - x0 || 1);
      return v0 + (v1 - v0) * u * u * (3 - 2 * u);
    }
  }
  return list[list.length - 1][1];
}

/**
 * Smooth noise in -1..1 that repeats every D seconds: F bumps a loop (a whole number), off shifts it along,
 * so lnoise(t, D, F, r * 0.4) wobbles along a flame and still loops.
 */
export const lnoise = (t, D, F, off = 0, seed = 0) => tileNoise((t / D) * F + off, 0.5, F, 0, seed);

/** A damped spring's swing after a kick: 1 at age 0, ringing at hz, dying at rate damp. */
export const spring = (age, hz, damp) => (age < 0 ? 0 : Math.exp(-age * damp) * Math.cos(age * hz * TAU));

/**
 * A ballistic body thrown from (x, y) at (vx, vy) px/s under gravity g, stopping on the floor y = floor.
 * Returns { x, y, vx, vy, landed, at (time it landed), lx (where) }.
 */
export function toss(x, y, vx, vy, age, g, floor = 0) {
  const tl = g > 0 ? (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * (floor - y)))) / g : Infinity;
  if (age < tl) return { x: x + vx * age, y: y + vy * age + 0.5 * g * age * age, vx, vy: vy + g * age, landed: false, at: tl, lx: x + vx * tl };
  return { x: x + vx * tl, y: floor, vx: 0, vy: 0, landed: true, at: tl, lx: x + vx * tl };
}

/** A creature-sized canvas in local coordinates: cells [x0, x0 + w) x [y0, y0 + h), each a color and an alpha. */
export class Grid {
  constructor(x0, y0, w, h) {
    this.x0 = Math.floor(x0); this.y0 = Math.floor(y0); this.w = w; this.h = h;
    this.c = new Uint32Array(w * h);
    this.a = new Float32Array(w * h);
    this.tag = new Uint8Array(w * h);
    this.o = { a: 1, t: 0 };
  }
  idx(x, y) {
    const ix = Math.floor(x) - this.x0, iy = Math.floor(y) - this.y0;
    return ix < 0 || iy < 0 || ix >= this.w || iy >= this.h ? -1 : iy * this.w + ix;
  }
  /** Paint a cell: color c, alpha a (below 1 is drawn translucent), tag (any 0..255 label for later passes). */
  set(x, y, c, a = 1, tag = 0) {
    const i = this.idx(x, y);
    if (i >= 0 && c) (this.c[i] = c), (this.a[i] = a), (this.tag[i] = tag);
  }
  get(x, y) {
    const i = this.idx(x, y);
    return i < 0 ? 0 : this.c[i];
  }
  tagAt(x, y) {
    const i = this.idx(x, y);
    return i < 0 ? 0 : this.tag[i];
  }
  erase(x, y) {
    const i = this.idx(x, y);
    if (i >= 0) this.c[i] = 0;
  }
  /**
   * fn(x, y, out) at each cell center in the box returns a color (or 0 / undefined to leave it); it may set
   * out.a (alpha) and out.t (tag).
   */
  shade(x0, y0, x1, y1, fn) {
    const o = this.o;
    for (let y = Math.floor(y0); y <= Math.floor(y1); y++)
      for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
        o.a = 1; o.t = 0;
        const c = fn(x + 0.5, y + 0.5, o);
        if (c) this.set(x, y, c, o.a, o.t);
      }
  }
  /** Filled ellipse; c may be fn(nx, ny) of the normalized offset (-1..1), returning a color. */
  ellipse(cx, cy, rx, ry, c, a = 1) {
    if (rx <= 0 || ry <= 0) return;
    this.shade(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, o) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      if (nx * nx + ny * ny > 1) return 0;
      o.a = a;
      return typeof c === "function" ? c(nx, ny) : c;
    });
  }
  /** 1 px line; c may be fn(u). */
  line(x0, y0, x1, y1, c, a = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, typeof c === "function" ? c(i / n) : c, a);
  }
  /** A line of discs, r may be fn(u): tails, tentacles, legs. c may be fn(u, v) with v 0 center .. 1 edge. */
  tube(pts, r, c, a = 1) {
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k], L = Math.max(1, Math.hypot(bx - ax, by - ay));
      for (let s = 0; s <= L; s += 0.5) {
        const u = (k - 1 + s / L) / (pts.length - 1), rr = typeof r === "function" ? r(u) : r;
        const x = ax + ((bx - ax) * s) / L, y = ay + ((by - ay) * s) / L;
        if (rr < 0.75) {
          this.set(x, y, typeof c === "function" ? c(u, 0) : c, a);
          continue;
        }
        this.shade(x - rr, y - rr, x + rr, y + rr, (px, py, o) => {
          const d = Math.hypot(px - x, py - y) / rr;
          o.a = a;
          return d > 1 ? 0 : typeof c === "function" ? c(u, d) : c;
        });
      }
    }
  }
  /** Filled polygon (even-odd); c may be fn(x, y). */
  poly(pts, c, a = 1) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
    const n = pts.length;
    this.shade(x0, y0, x1, y1, (x, y, o) => {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      o.a = a;
      return inside ? (typeof c === "function" ? c(x, y) : c) : 0;
    });
  }
  /**
   * A sprite from strings, its pixel (ax, ay) placed at (X, Y). opts: { sx, sy (scale), rot, flip }.
   * Scaled or turned sprites are resampled nearest-neighbour, so they stay hard pixels.
   */
  sprite(rows, pal, X, Y, { ax = 0, ay = 0, sx = 1, sy = 1, rot = 0, flip = false } = {}) {
    const H = rows.length, W = rows[0].length, cache = {};
    const col = (ch) => (ch in cache ? cache[ch] : (cache[ch] = pal[ch] === undefined ? 0 : hex(pal[ch])));
    if (sx === 1 && sy === 1 && rot === 0) {
      for (let r = 0; r < H; r++)
        for (let q = 0; q < W; q++) {
          const ch = rows[r][flip ? W - 1 - q : q];
          if (ch === "." || ch === " ") continue;
          const c = col(ch);
          if (c) this.set(Math.round(X - (flip ? W - 1 - ax : ax)) + q, Math.round(Y - ay) + r, c);
        }
      return;
    }
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const R = Math.hypot(Math.max(ax, W - ax) * Math.abs(sx), Math.max(ay, H - ay) * Math.abs(sy)) + 1;
    this.shade(X - R, Y - R, X + R, Y + R, (x, y) => {
      const dx = x - X, dy = y - Y, u = (dx * cs + dy * sn) / sx, v = (-dx * sn + dy * cs) / sy;
      let q = Math.floor(ax + u), r = Math.floor(ay + v);
      if (q < 0 || r < 0 || q >= W || r >= H) return 0;
      if (flip) q = W - 1 - q;
      const ch = rows[r][q];
      return ch === "." || ch === " " ? 0 : col(ch);
    });
  }
  /**
   * How deep each filled cell sits: 1 on the edge (next to an empty cell, 4-neighbour), 2 one in, ... up to max.
   * Returns a Uint8Array over the grid (0 where empty); depth(x, y) reads it.
   */
  depths(max = 4) {
    const { w, h, c } = this, d = new Uint8Array(w * h), q = [];
    for (let i = 0; i < w * h; i++) {
      if (!c[i]) continue;
      const x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !c[i - 1] || !c[i + 1] || !c[i - w] || !c[i + w]) (d[i] = 1), q.push(i);
    }
    for (let k = 0; k < q.length; k++) {
      const i = q[k], v = d[i];
      if (v >= max) continue;
      for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && c[j] && !d[j]) (d[j] = v + 1), q.push(j);
    }
    for (let i = 0; i < w * h; i++) if (c[i] && !d[i]) d[i] = max;
    this.d = d;
    return d;
  }
  depth(x, y) {
    const i = this.idx(x, y);
    return i < 0 || !this.d ? 0 : this.d[i];
  }
  /**
   * Wrap everything drawn so far in a 1 px outline (4-neighbour). c is a color, or fn(x, y, nx, ny) with
   * (nx, ny) the outward direction there (summed from the filled neighbours), so the outline can be picked
   * per side: darker under the light, broken where a highlight touches it. Return 0 to leave a gap.
   */
  outline(c, a = 1) {
    const src = this.c.slice(), w = this.w, h = this.h, fn = typeof c === "function";
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i]) continue;
        const l = x > 0 && src[i - 1], r = x < w - 1 && src[i + 1], u = y > 0 && src[i - w], d = y < h - 1 && src[i + w];
        if (!(l || r || u || d)) continue;
        const col = fn ? c(this.x0 + x, this.y0 + y, (l ? 1 : 0) - (r ? 1 : 0), (u ? 1 : 0) - (d ? 1 : 0)) : c;
        if (col) (this.c[i] = col), (this.a[i] = a), (this.tag[i] = 255);
      }
  }
  /** Rework every filled cell: fn(x, y, color, alpha, tag) returns its new color (0 erases it). */
  recolor(fn) {
    for (let i = 0; i < this.w * this.h; i++) {
      if (!this.c[i]) continue;
      this.c[i] = fn(this.x0 + (i % this.w), this.y0 + ((i / this.w) | 0), this.c[i], this.a[i], this.tag[i]) || 0;
    }
  }
  /** Put the grid on the painter, moved by (dx, dy): opaque cells dithered by fade, translucent ones blended. */
  draw(p, fade = 1, dx = 0, dy = 0) {
    const X = this.x0 + Math.round(dx), Y = this.y0 + Math.round(dy);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x, c = this.c[i];
        if (!c) continue;
        const a = this.a[i];
        if (a >= 0.999) p.dot(X + x, Y + y, c, fade);
        else p.blend(X + x, Y + y, c, a * fade);
      }
  }
  clear() {
    this.c.fill(0);
    this.tag.fill(0);
    this.d = null;
    return this;
  }
}

/**
 * The toolkit's particle looks for particles whose state is a function of time (pure loops): begin(t), then
 * add(kind, x, y, vx, vy, age, life, color, size, flag, seed) for each one alive now, then draw(p, layer).
 * opts as for core Particles: { sparks: [head..tail], haze }.
 */
export class Swarm {
  constructor(opts = {}) {
    this.ps = new Particles({ rng: new Rng(1), ...opts });
  }
  begin(t) {
    this.ps.list.length = 0;
    this.ps.t = t;
    return this;
  }
  add(k, x, y, vx, vy, age, life, col = WHITE, size = 1, flag = 0, seed = 0) {
    if (age < 0 || age >= life) return;
    this.ps.list.push({ k, x, y, vx, vy, life: life - age, max: life, col: col ? hex(col) : 0, size, seed, delay: 0, flag });
  }
  draw(p, layer) {
    this.ps.draw(p, layer);
  }
}

// Hugo's flame layers: [width, height, ramp step] from the widest dark outer flame to the white-hot heart
const LAYERS = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];

/**
 * A tongue of flame standing on (x, y), h tall, w half-wide at its root, its tip swaying sx px; four nested
 * layers down a 9-step fire ramp given bright-first (heat[0] white). n seeds its flicker; t, D keep it looping.
 * only: draw just that layer (0 outer .. 3 heart), so a bunch of tongues can be laid down layer by layer and
 * merge into one flame with one dark rim.
 */
export function tongue(p, x, y, h, w, sx, t, D, n, heat, only = -1) {
  if (h < 1) return;
  const F1 = Math.max(1, Math.round(9 * D)), F2 = Math.max(1, Math.round(4 * D));
  for (let li = 0; li < LAYERS.length; li++) {
    if (only >= 0 && li !== only) continue;
    const [lw, lh, ri] = LAYERS[li];
    const H = h * lh, col = heat[ri];
    for (let r = 0; r <= H; r++) {
      const u = r / Math.max(1, H);
      const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + lnoise(t, D, F1, r * 0.45, n) * 0.5;
      const cx = x + sx * u * u * lh + lnoise(t, D, F2, r * 0.2, n + 7) * u * 1.1;
      if (half < 0.3) continue;
      for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) p.px(px, Math.round(y - r), col);
    }
  }
}

/**
 * A puff of flame k of its life left (1 new .. 0 gone), size px, cooling down heat (bright-first, 9 steps):
 * a darker rim, a lit core, a tongue on top, light.
 */
export function firePuff(p, x, y, k, size, seed, heat) {
  const age = 1 - k, n = heat.length, hot = Math.min(0.999, Math.pow(age, 0.62) + (seed % 1) * 0.1);
  const idx = Math.min(n - 2, Math.floor(hot * (n - 1)));
  const r = size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = heat[idx];
  if (idx >= n - 2) return p.disc(x, y, r, c, Math.min(1, k * 3) * 0.85);
  p.circle(x, y, r, heat[Math.min(n - 1, idx + 2)]);
  p.circle(x - r * 0.16, y - r * 0.22, r * 0.78, c);
  if (r > 1.6) p.circle(x, y - r * 0.9, r * 0.42, c);
  if (idx <= 3 && r > 1.8) p.circle(x - r * 0.28, y - r * 0.34, r * 0.36, heat[Math.max(0, idx - 1)]);
  if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, 0.18 * k);
}

/**
 * A bubble of radius r: a rim lit top-left and shaded bottom-right, a faint fill, a white glint, light.
 * cols: [highlight, lit, rim, shade]. Adapted from Sprite Fusion's open-source bubbles
 * (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
 */
export function bubble(p, cx, cy, r, cols, a = 1, wob = 0) {
  const [HI, LIT, RIM, SHADE] = cols;
  if (r < 0.9) return p.dot(cx, cy, r < 0.7 ? RIM : LIT, a);
  if (r < 1.5) {
    const px = Math.floor(cx), py = Math.floor(cy);
    p.dot(px, py, HI, a); p.dot(px + 1, py, LIT, a); p.dot(px, py + 1, RIM, a); p.dot(px + 1, py + 1, SHADE, a);
    p.glow(cx + 0.5, cy + 0.5, 3, LIT, 0.12 * a);
    return;
  }
  const rx = r * (1 + wob), ry = r * (1 - wob);
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy) * r;
      if (d > r + 0.5) continue;
      const l = (-dx - dy) / Math.SQRT2 / Math.max(0.01, d / r);
      if (d > r - 0.6) p.dot(x, y, l > 0.45 ? LIT : l < -0.55 ? SHADE : RIM, a);
    }
  const hx = Math.round(cx - rx * 0.45), hy = Math.round(cy - ry * 0.45);
  p.dot(hx, hy, HI, a);
  if (r >= 2.5) p.dot(hx + 1, hy, LIT, a), p.dot(hx, hy + 1, LIT, a);
  if (r >= 2) p.dot(Math.round(cx + rx * 0.5), Math.round(cy + ry * 0.5), LIT, a);
  p.glow(cx, cy, r * 2.4 + 2, RIM, 0.14 * a);
}

/** A soft shadow: an ellipse blended over what's there, a alpha at the center fading to nothing at the rim. */
export function shadow(p, cx, cy, rx, ry, c, a) {
  if (rx <= 0 || ry <= 0 || a <= 0) return;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d < 1) p.blend(x, y, c, a * (1 - d) ** 0.7);
    }
}

/**
 * A ballistic body thrown from (x, y) at (vx, vy) under gravity g that bounces on the floor y = floor, keeping
 * e of its speed each bounce (and 70% of its run), until it rests. Returns { x, y, vx, vy, hops, rest }.
 */
export function bounce(x, y, vx, vy, age, g, floor = 0, e = 0.45) {
  let hops = 0;
  for (; hops < 6; hops++) {
    const f = toss(x, y, vx, vy, age, g, floor);
    if (!f.landed) return { x: f.x, y: f.y, vx: f.vx, vy: f.vy, hops, rest: false };
    const vl = vy + g * f.at;
    age -= f.at;
    x = f.lx; y = floor - 0.01; vx *= 0.7; vy = -vl * e;
    if (Math.abs(vy) < 25) break;
  }
  return { x, y: floor - 0.25, vx: 0, vy: 0, hops, rest: true };
}
