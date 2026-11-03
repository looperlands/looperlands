// Shared by the explosions. Not an effect (the leading _ keeps the tools away).
// The fire balls, rocks and scorch are adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.

import { P, PF, clamp, smooth, rand, TAU, WHITE, hex, mix, scale, rgb } from "../../core/index.mjs";

export const OUTLINE = hex("#1a1422"), SOOT = hex("#0d0a12"), SOOT2 = hex("#17121d");

/** Stone colors from one body color: a lit face, the body, a shaded face, and the dust it makes. */
export function stone(c) {
  c = hex(c);
  return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3) };
}

/** A 9-step fire ramp, white-hot down to smouldering (the shape of FIRE_RAMP), from an 8-step palette (dark to bright). */
export const fireRamp = (F) => [F[7], F[6], F[5], F[4], F[3], F[2], F[1], mix(F[1], F[0], 0.5), F[0]];

/** One FIRE particle drawn in the fire ramp FR: a darker rim, a lit core, a tongue on top, a hot heart. */
export function fireBall(p, q, FR) {
  const k = q.life / q.max, age = 1 - k, n = FR.length, x = q.x, y = q.y;
  const heat = Math.min(0.999, Math.pow(age, 0.62) + (q.seed % 1) * 0.1), idx = Math.min(n - 2, Math.floor(heat * (n - 1)));
  const r = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = FR[idx];
  if (idx >= n - 2) return p.disc(x, y, r, c, Math.min(1, k * 3) * 0.85);
  // the hottest puffs get a rim a step darker still, so a mass of them reads as separate balls
  p.circle(x, y, r, FR[Math.min(n - 1, idx + (idx <= 2 ? 3 : 2))]);
  p.circle(x - r * 0.16, y - r * 0.22, r * 0.78, c);
  if (r > 1.6) p.circle(x, y - r * 0.9, r * 0.42, c);
  if (idx <= 3 && r > 1.8) p.circle(x - r * 0.28, y - r * 0.34, r * 0.36, FR[Math.max(0, idx - 1)]);
  if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, 0.18 * k);
}

/** A particle system's layer ("back" or "front") with its FIRE puffs in the fire ramp FR, so a palette recolors them. */
export function drawPs(p, ps, layer, FR) {
  const all = ps.list, fires = [], rest = [];
  for (const q of all) (q.k === P.FIRE ? fires : rest).push(q);
  const back = layer === "back";
  if (!back) for (const q of fires) if (q.delay <= 0 && !(q.flag & PF.BACK)) fireBall(p, q, FR);
  ps.list = rest;
  ps.draw(p, layer);
  ps.list = all;
  if (back) for (const q of fires) if (q.delay <= 0 && q.flag & PF.BACK) fireBall(p, q, FR);
}

const LIFTS = new Set([P.SMOKE, P.DUST, P.FIRE, P.EMBER, P.VAPOUR]);
/**
 * An updraft column at x: smoke, dust, fire and embers below `top` and within w of the axis are carried up
 * (up px/s²) and squeezed toward it; near the floor (within `low` px) they're drawn in from as far as `reach`:
 * the afterwinds that feed a blast's column. k scales it all.
 */
export function draft(ps, dt, { x = 0, top = -Infinity, w = 12, up = 150, squeeze = 4, pull = 0, low = 10, reach = 100, k = 1 }) {
  if (k <= 0) return;
  for (const q of ps.list) {
    if (q.delay > 0 || !LIFTS.has(q.k) || q.y < top) continue;
    const dx = q.x - x, ax = Math.abs(dx), u = ax / w;
    if (u < 1) {
      const f = (1 - u * u) * k;
      q.vy -= up * f * dt;
      q.vx -= dx * squeeze * f * dt;
    }
    if (pull && q.y > -low && ax > w * 0.4 && ax < reach) q.vx -= Math.sign(dx) * pull * k * (1 - ax / reach) * dt;
  }
}

/** Drop particles that leave the box (local px), so nothing is drawn past the canvas. */
export function cull(ps, x0, y0, x1, y1) {
  const L = ps.list;
  for (let i = L.length - 1; i >= 0; i--) {
    const q = L[i];
    if (q.x < x0 || q.x > x1 || q.y < y0 || q.y > y1) L.splice(i, 1);
  }
}

const SOFT = new Set([P.SMOKE, P.DUST, P.VAPOUR]);
/**
 * Soft particles (smoke, dust, vapour) fade out over w px as they near the sides x0, x1 and go before they reach
 * them; y1, a bottom edge, gets a thin w of 6 (keep things off it by design).
 */
export function fadeEdges(ps, x0, x1, w = 30, y1 = Infinity) {
  const L = ps.list;
  for (let i = L.length - 1; i >= 0; i--) {
    const q = L[i];
    if (!SOFT.has(q.k)) continue;
    const r = q.size * 1.65, e = Math.min((Math.min(q.x - x0, x1 - q.x) - r) / w, (y1 - q.y - r) / 6);
    if (e <= 0) L.splice(i, 1);
    else if (e < 1) q.life = Math.min(q.life, q.max * 0.42 * e);
  }
}

/** A soft pool of light, an ellipse rx by ry at (x, y): light falling on the floor (keep ry small, it's perspective). */
export function pool(p, x, y, rx, ry, c, k) {
  if (k <= 0.004 || rx < 1 || ry < 0.5) return;
  p.shade(x - rx, y - ry, x + rx, y + ry, (px, py, out) => {
    const dx = (px - x) / rx, dy = (py - y) / ry, d = dx * dx + dy * dy;
    if (d >= 1) return;
    const f = 1 - Math.sqrt(d);
    out.l = c;
    out.k = f * f * k;
  });
}

/** A translucent ellipse (blended, never dithered): c and a may be functions of d (0 centre .. 1 rim). */
export function haze(p, x, y, rx, ry, c, a) {
  if (rx < 0.5 || ry < 0.5) return;
  const fc = typeof c === "function", fa = typeof a === "function";
  p.each(x - rx, y - ry, x + rx, y + ry, (lx, ly, sx, sy) => {
    const dx = (lx - x) / rx, dy = (ly - y) / ry, d2 = dx * dx + dy * dy;
    if (d2 > 1) return;
    const d = Math.sqrt(d2);
    p.blendPx(sx, sy, fc ? c(d) : c, fa ? a(d) : a);
  });
}

/** Heat for a scorch, from a fire ramp (bright to dark) down to cinders. */
export const heatRamp = (FR) => [...FR.slice(0, 8), mix(FR[8], SOOT, 0.3), mix(FR[8], SOOT, 0.65)];

/**
 * The floor under a blast: a burn that spreads out in a blink, glows white-hot and cools through the heat ramp
 * HR to soot over `cool` seconds; a few cracks hold their glow twice as long. rows deep, fade 0..1.
 */
export function scorch(p, HR, t, rx0, cool, fade, rows = 3) {
  if (fade <= 0) return;
  const rx = rx0 * Math.min(1, t / 0.08), ry = rows + 1.5, n = HR.length;
  for (let y = 0; y < rows; y++)
    for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
      const dx = (x + 0.5) / rx, dy = (y + 0.5) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const k = rand(x * 31 + y, 3), T = Math.pow(clamp(1 - t / cool), 1.4) * (1.25 - d) - k * 0.35;
      const crack = k > 0.88 && d < 0.85 ? Math.pow(clamp(1 - t / (cool * 2)), 1.2) * (1.15 - d) * 0.8 : 0, H = Math.max(T, crack);
      if (H > 0.06) {
        const c = HR[Math.min(n - 1, Math.floor((1 - Math.min(1, H)) * (n - 1)))];
        p.dot(x, y, c, fade);
        if ((x & 3) === 0 || crack > T) p.glow(x + 0.5, y, 6, c, 0.18 * H * fade);
      } else p.dot(x, y, d < 0.5 ? SOOT : SOOT2, (d < 0.95 - k * 0.3 ? 1 : 1 - d) * fade);
    }
}

/**
 * A rock (a Bits CHUNK): a lit side, a shaded side and an outline, turning as it spins. b.heat (0..1) makes
 * it molten: its heart and shaded side glow through the fire ramp FR and it gives off light, cooling to stone.
 */
export function rock(p, b, st, FR) {
  const r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4, heat = b.heat ?? 0;
  p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
    const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
    if (d > r + 0.9) return;
    out.a = fade;
    if (d > r) return OUTLINE;
    const lit = dx * lx + dy * ly;
    if (heat > 0.08) {
      const g = heat * (1.1 - d / (r + 0.5)) + (lit > 0.3 ? heat * 0.45 : 0);
      if (g > 0.5) return FR[g > 1 ? 1 : g > 0.8 ? 2 : g > 0.62 ? 3 : 4];
      if (g > 0.32) return FR[5];
    }
    return lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body;
  });
  if (heat > 0.05) p.glow(b.x, b.y, r * 2 + 3, FR[3], 0.32 * heat * fade);
}

/**
 * Light hugging the upper half of a circle of radius R at (x, y) (a dome's shock), falling off over width w.
 * box [x0, y0, x1, y1] (local) keeps it inside a canvas.
 */
export function glowDome(p, x, y, R, w, c, k, box = [-Infinity, -Infinity, Infinity, Infinity]) {
  if (k <= 0.004 || w < 1) return;
  p.shade(Math.max(box[0], x - R - w), Math.max(box[1], y - R - w), Math.min(box[2], x + R + w), Math.min(box[3], y + 0.5), (px, py, out) => {
    const d = Math.abs(Math.hypot(px - x, py - y) - R) / w;
    if (d >= 1) return;
    out.l = c;
    out.k = (1 - d) * (1 - d) * k;
  });
}

/**
 * A burning thing's trail: pts [{ x, y, t }] (oldest first) at time t, drawn as a ribbon that is fire near the
 * head (fire ramp FR) and swells into thin smoke behind (smoke ramp SM, light to dark) over life seconds.
 */
export function trail(p, pts, t, FR, SM, life = 0.5, w = 1, heat = 1) {
  let lx = NaN, ly = NaN;
  for (let i = pts.length - 1; i >= 0; i--) {
    const q = pts[i], age = (t - q.t) / life;
    if (age >= 1) break;
    if (Math.hypot(q.x - lx, q.y - ly) < 1.6) continue;
    lx = q.x;
    ly = q.y;
    const r = w * (0.7 + age * 2.6);
    if (age < 0.12 * heat) p.circle(q.x, q.y - age * 6, r * 0.8, FR[age < 0.05 ? 3 : 5]);
    else p.disc(q.x, q.y - age * 6, r, SM[Math.min(SM.length - 1, 1 + Math.floor(age * 3))], 0.55 * (1 - age));
  }
}

/**
 * Draw a particle system's GRIT as dirt in flight: fast bits stretch into short streaks (a darker tail, the bit at
 * the head), slow ones are the usual 1 or 2 px chips. The rest of the system draws as usual. layer as in draw.
 */
export function drawDirt(p, ps, layer) {
  const all = ps.list, grit = [], rest = [];
  for (const q of all) (q.k === P.GRIT ? grit : rest).push(q);
  ps.list = rest;
  ps.draw(p, layer);
  ps.list = all;
  if (layer === "back") return;
  for (const q of grit) {
    if (q.delay > 0) continue;
    const k = q.life / q.max, sp = Math.hypot(q.vx, q.vy);
    if (k < 0.25 && k * 4 < 0.5) continue;
    if (sp > 140) {
      const L = Math.min(5, sp * 0.012), ux = q.vx / sp, uy = q.vy / sp;
      p.line(q.x - ux * L, q.y - uy * L, q.x, q.y, (u) => (u < 0.5 ? scale(q.col, 0.7) : q.col));
    } else {
      p.px(q.x, q.y, q.col);
      if (q.size >= 2) p.px(q.x + 1, q.y, q.col), p.px(q.x, q.y + 1, scale(q.col, 0.8)), p.px(q.x + 1, q.y + 1, scale(q.col, 0.7));
    }
  }
}

/**
 * A crater in the floor at x: a dark pit (an ellipse in perspective) with its far wall lit, dirt heaped in a lip on
 * either side, and loose earth scattered round it. E: an earth ramp (dark to bright, 5+ steps); r: half-width;
 * k: 0..1 how far it has opened; a: alpha (fade it out).
 */
export function crater(p, E, x, r, k, a = 1) {
  if (k <= 0 || a <= 0) return;
  const n = E.length, rx = r * k, ry = Math.max(1.5, r * 0.17 * k);
  for (let py = -1; py <= Math.ceil(ry) + 1; py++)
    for (let px = Math.floor(-rx - 1); px <= Math.ceil(rx + 1); px++) {
      const dx = (px + 0.5) / rx, dy = (py + 0.5 - ry * 0.35) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1.08) continue;
      // the pit: darkest at its far side under the lit rim, the near wall a step lighter
      const c = d > 0.92 ? (dy < 0 ? E[n - 2] : E[2]) : dy < -0.2 ? E[0] : dy < 0.35 ? E[1] : E[2];
      p.dot(x + px, py, c, a);
    }
  // the lip: dirt heaped up either side, lit on top, and a scatter of loose earth
  for (const s of [-1, 1])
    for (let i = 0; i < 9; i++) {
      const u = i / 8, h = Math.round(Math.sin(Math.PI * u) * 2.2 * k + (rand(i, s > 0 ? 3 : 4) < 0.4 ? 1 : 0) * k);
      const hx = x + s * (rx * 0.82 + u * r * 0.55);
      for (let j = 0; j <= h; j++) p.dot(hx, -j, j === h ? E[n - 2] : j === h - 1 ? E[3] : E[2], a);
    }
  for (let i = 0; i < 26; i++) {
    const s = rand(i, 7) < 0.5 ? -1 : 1, d = rx * (1.05 + rand(i, 8) * 1.4), y = Math.round(rand(i, 9) * 3) - 1;
    if (rand(i, 10) < k) p.dot(x + s * d, y, rand(i, 11) < 0.5 ? E[3] : E[2], a);
  }
}

/** A hemisphere of white-hot air on the floor at x, radius r: an orange rim, a hot body, a white core; k 1 → 0 as it dies. */
export function dome(p, F, x, r, k) {
  const e = 1.4 / r;
  p.shade(x - r - 1.5, -r - 1.5, x + r + 1.5, 0.5, (px, py) => {
    const d = Math.hypot(px - x, py) / r;
    if (d > 1 + e) return;
    return d > 1 ? F[2] : d > 0.8 ? (k > 0.45 ? F[6] : F[5]) : d > 0.5 ? (k > 0.45 ? WHITE : F[6]) : k > 0.2 ? WHITE : F[6];
  });
}

/**
 * A lobe of a billowing cloud, shaded like a ball. The sky lights it from the top left through the smoke ramp SM
 * (light to dark); fire (0..1) burns in its heart in the fire ramp FR (bright to dark), shrinking toward the
 * middle as it cools, with a darker band and a dark orange-red seam at its edge so a mass of burning lobes reads
 * apart; glow (0..1) lights its underside from below in fire colors. a: opacity (smoke edges stay soft); z: -1 far
 * .. 1 near (the far side sits a step darker); dark shifts the smoke down the ramp. style 1 cel-shades the smoke:
 * a lit crescent on top, a mid tone, a dark underside the fire tints while it's hot.
 */
export function lobe(p, x, y, r, FR, SM, fire, glow, a, z = 0, dark = 0, style = 0) {
  if (r < 0.7 || a <= 0.01) return;
  const n = FR.length, m = SM.length, back = z < -0.35 ? 1 : 0, rim = 1 - Math.min(0.35, 1.6 / r), seam = 1 - Math.min(0.3, 1.3 / r);
  // the soft edge: a step more see-through than the body, less of a step as the whole lobe thins (no bubble rims)
  const D = (i) => SM[Math.min(m - 1, i + back + dark)], soft = 0.55 + 0.4 * (1 - Math.min(1, a));
  const px = (lx, ly, sx, sy) => {
    const dx = (lx - x) / r, dy = (ly - y) / r, d2 = dx * dx + dy * dy;
    if (d2 > 1) return;
    const d = Math.sqrt(d2), nz = Math.sqrt(1 - d2), sky = -0.5 * dx - 0.66 * dy + 0.56 * nz;
    const v = fire * (1.32 - 0.78 * d) + 0.14 * sky * fire;
    let c, k = 0, solid = false;
    if (v > 0.44) {
      let i = Math.min(n - 3, Math.max(0, Math.floor((1.3 - v) * (n - 1) * 0.78)));
      if (d > seam) i = Math.min(6, Math.max(4, i + 2));
      else if (d > seam - 0.22) i = Math.min(n - 3, i + 1);
      c = FR[i];
      k = 0.05 * fire;
      solid = true;
    } else if (style) {
      const lam = -0.42 * dx - 0.78 * dy + 0.46 * nz;
      if (lam > 0.66 && d > 0.4) c = D(0);
      else if (lam > 0.16) c = D(1);
      else if (lam > -0.3) c = D(2);
      else {
        c = D(lam < -0.64 ? 4 : 3);
        const g = glow * (0.6 + 0.4 * dy);
        if (g > 0.55) (c = FR[g > 0.8 ? 5 : 6]), (k = 0.08 * g);
        else if (g > 0.34) c = mix(c, FR[6], 0.6);
        else if (g > 0.16) c = mix(c, FR[7], 0.45);
      }
    } else {
      const g = glow * (0.82 * dy + 0.3 * nz);
      if (g > 0.45) (c = FR[g > 0.66 ? 4 : 5]), (k = 0.1 * glow);
      else if (g > 0.3) c = FR[6];
      else if (g > 0.2) c = FR[7];
      else {
        const s = sky * 0.5 + 0.5;
        c = D(s > 0.8 ? 0 : s > 0.62 ? 1 : s > 0.42 ? 2 : s > 0.22 ? 3 : 4);
      }
    }
    p.blendPx(sx, sy, c, solid || d <= rim ? a : a * soft);
    if (k > 0) p.add(sx, sy, c, k);
  };
  if (p.sn !== 0 || p.cs !== 1) return p.each(x - r, y - r, x + r, y + r, px);
  // unrotated (the usual case): walk the screen pixels directly
  const ax = p.tx + (x - r) * p.fx, bx = p.tx + (x + r) * p.fx;
  const sx0 = Math.max(p.ox, Math.floor(Math.min(ax, bx))), sx1 = Math.min(p.ox + p.w - 1, Math.ceil(Math.max(ax, bx)));
  const sy0 = Math.max(p.oy, Math.floor(p.ty + y - r)), sy1 = Math.min(p.oy + p.h - 1, Math.ceil(p.ty + y + r));
  for (let sy = sy0; sy <= sy1; sy++) {
    const ly = sy + 0.5 - p.ty, q = (ly - y) / r;
    if (q * q >= 1) continue;
    // only the span of this row inside the circle
    const hw = r * Math.sqrt(1 - q * q), cx = p.tx + x * p.fx;
    for (let sx = Math.max(sx0, Math.floor(cx - hw - 0.5)), e = Math.min(sx1, Math.ceil(cx + hw)); sx <= e; sx++) px((sx + 0.5 - p.tx) * p.fx, ly, sx, sy);
  }
}

/**
 * A rolling fireball. n lobes ride a vortex ring that climbs (rise px, slowing with time constant tau, then
 * drifting up at drift px/s), swells (tube and ring radii grow with time constant grow) and rolls (up through
 * the middle, out over the top, down the outside, back in underneath), while it cools from white-hot fire
 * into smoke that glows from inside, then thins away. Seen from a little below: the near side sits lower.
 * update(dt); draw(p, FR (fire ramp, bright to dark), SM (smoke ramp, light to dark), { mid }) (mid() is drawn
 * between the far and near lobes: a stem going up into it); shape() its centre and radii; hot() how hot its heart
 * still is; ember() how strongly its inside still glows. Options for a nuclear cap: style 1 (cel-shaded lobes),
 * inner (a glow that lingers inside and draws back to the middle as it cools), hollow (the underside sits a step
 * darker), fray [t0, rate, t1] with onFray(x, y, r, ux, uy) (the rim sheds small puffs late on).
 */
export class Plume {
  constructor(R, o = {}) {
    this.o = o = {
      x: 0, y: -20, rise: 100, tau: 1.2, drift: 4, tube: [8, 20], ring: [1, 18], grow: 0.9, n: 40, size: [5, 10], swell: 0.5,
      spin: 2.4, spinTau: 1.6, heat: 1.15, cool: 0.45, under: 0.5, tilt: 0.2, squash: 0.7, fade: [4, 6], glow: 1, spread: 10,
      style: 0, inner: false, hollow: false, fray: null, ...o,
    };
    this.R = R;
    this.t = 0;
    this.roll = 0;
    this.onFray = null;
    // spread over the ring evenly: the roll angle on a golden-ratio walk, the turn round the axis in order
    this.lobes = Array.from({ length: o.n }, (_, i) => ({
      th: TAU * ((i * 0.618034 + R.range(-0.08, 0.08)) % 1), ph: (TAU * (i + R.range(-0.35, 0.35))) / o.n,
      j: R.range(-0.55, 0.12), s: R.range(o.size[0], o.size[1]), h: R.range(-0.22, 0.08), dx: R.range(-1, 1), dy: R.range(-1, 0.4),
      f: R.range(-0.9, 0.5), gv: R.range(0.55, 1.15),
    }));
  }
  shape(t = this.t) {
    const o = this.o, u = Math.max(0, t), g = 1 - Math.exp(-u / o.grow);
    return { x: o.x, y: o.y - o.rise * (1 - Math.exp(-u / o.tau)) - o.drift * u, tube: o.tube[0] + (o.tube[1] - o.tube[0]) * g, ring: o.ring[0] + (o.ring[1] - o.ring[0]) * g, g };
  }
  hot(t = this.t) {
    return clamp(this.o.heat - this.o.cool * t + 0.3);
  }
  /** How strongly the inside still glows (0..1), lingering well after the fire has gone. */
  ember(t = this.t) {
    return clamp((this.o.heat - this.o.cool * t + 1) / 1.1);
  }
  // where every lobe is at time t
  lobesAt(t) {
    const o = this.o, S = this.shape(t), base = o.heat - o.cool * t, span = S.ring + S.tube || 1, list = [];
    for (const q of this.lobes) {
      const fade = 1 - smooth(o.fade[0] + q.f, o.fade[1] + q.f * 0.5, t), loose = Math.pow(smooth(o.fade[0] - 1.8 + q.f, o.fade[1], t), 1.5) * o.spread;
      if (fade <= 0) continue;
      const th = q.th - this.roll, rt = S.tube * (1 + q.j), rho = S.ring + rt * Math.cos(th), up = Math.sin(th);
      const X = rho * Math.cos(q.ph), Z = rho * Math.sin(q.ph);
      // the outside cools first; the underside keeps its heat, fed from below
      const heat = base + q.h - 0.18 * Math.max(0, Math.cos(th)) * clamp(t * 2) + o.under * Math.max(0, -up) * clamp(base + 0.6);
      const r = q.s * (0.5 + 0.5 * S.g) * (1 + o.swell * clamp(1 - heat)) * (1 + 0.35 * (1 - fade));
      list.push({ x: S.x + X + q.dx * loose, y: S.y - rt * up * o.squash + Z * o.tilt + q.dy * loose, z: Z / span, up, out: Math.cos(th), heat, q, fade, r, d: Math.hypot(X, Z) / span, c: 1 - Math.min(1, Math.abs(X) / span) });
    }
    return list.sort((a, b) => a.z - b.z);
  }
  update(dt) {
    const o = this.o;
    this.t += dt;
    this.roll += o.spin * (0.12 + 0.88 * Math.exp(-this.t / o.spinTau)) * dt;
    // late on, the rim frays: lobes on the outside shed small puffs that drift off and thin
    if (o.fray && this.onFray && this.t > o.fray[0] && this.t < (o.fray[2] ?? Infinity)) {
      const S = this.shape(), k = o.fray[1] * dt * smooth(o.fray[0], o.fray[0] + 1, this.t);
      for (const e of this.lobesAt(this.t)) {
        if (e.out < 0.2 || !this.R.chance(k * e.fade)) continue;
        const ux = e.x - S.x, uy = e.y - S.y, l = Math.hypot(ux, uy) || 1;
        this.onFray(e.x + (ux / l) * e.r * 0.6, e.y + (uy / l) * e.r * 0.6, e.r, ux / l, uy / l);
      }
    }
  }
  draw(p, FR, SM, { mid } = {}) {
    const o = this.o, t = this.t;
    if (t >= o.fade[1] + 0.5) return;
    const S = this.shape(t), base = o.heat - o.cool * t, span = S.ring + S.tube || 1, list = this.lobesAt(t), age = clamp(t / o.fade[1]);
    const E = this.ember(t), reach = 0.3 + 1.15 * E;
    let drawn = false;
    for (const e of list) {
      if (!drawn && e.z >= 0 && mid) (drawn = true), mid();
      const h = e.heat, fade = e.fade, fire = clamp((h - 0.2) / 0.75);
      // the glow from inside: strongest under the middle, uneven from lobe to lobe; with inner, it draws back to the
      // middle as the cap cools
      const glow = o.inner
        ? E * clamp((reach - e.d) / 0.45) * (0.45 + 0.55 * Math.max(0, -e.up)) * e.q.gv * o.glow
        : clamp((base + 0.45) / 0.85) * o.glow * (0.4 + 0.35 * Math.max(0, -e.up) + 0.4 * e.c) * e.q.gv;
      lobe(p, e.x, e.y, e.r, FR, SM, fire, glow, fade * (0.82 + 0.18 * fire), e.z, (age > 0.72 ? 1 : 0) + (o.hollow && e.up < -0.35 ? 1 : 0), o.style);
      if (fire > 0.25) p.glow(e.x, e.y, e.r * 1.25 + 2, FR[2], 0.07 * fire);
    }
    if (!drawn && mid) mid();
    const hot = this.hot(t);
    if (hot > 0) p.glow(S.x, S.y, span * 1.8 + 14, FR[3], 0.32 * hot * o.glow);
    if (o.inner && E > 0.05) p.glow(S.x, S.y + S.tube * 0.3, span * (0.5 + 0.7 * E) + 8, FR[4], 0.22 * E * E);
  }
}

/**
 * A rising column: lobes boil up a stem from the floor into whatever sits on top, wide at the foot, swaying,
 * cooling from fire to smoke and dust. update(dt, top, feed): top is the y the stem rises to, feed 0..1 how
 * strongly it's still being fed (new lobes stop when it's 0, and the stem breaks up from the bottom).
 * draw(p, FR, SM, fire (0..1 heat at the foot), glow (0..1 under-light)).
 */
export class Column {
  constructor(R, o = {}) {
    this.R = R;
    this.o = o = { w: 7, foot: 16, speed: 70, size: [5, 8], n: 18, sway: 2.5, fade: 0.5, style: 0, ...o };
    this.t = 0;
    this.lobes = [];
    this.acc = 0;
  }
  spawn(y) {
    const R = this.R, o = this.o;
    this.lobes.push({ y, x: R.range(-1, 1), s: R.range(o.size[0], o.size[1]), ph: R.range(0, TAU), a: 0, v: R.range(0.8, 1.2) });
  }
  update(dt, top, feed) {
    const o = this.o, L = Math.max(10, -top);
    this.t += dt;
    if (feed > 0) for (this.acc += dt * feed * o.n * (o.speed / L); this.acc > 1; this.acc--) this.spawn(-1);
    for (let i = this.lobes.length - 1; i >= 0; i--) {
      const b = this.lobes[i], u = clamp(-b.y / L);
      b.y -= o.speed * b.v * (0.45 + 0.55 * Math.min(1, -b.y / 24)) * dt;
      b.a = Math.min(1, b.a + dt * 4);
      if (b.y < top || (feed <= 0 && (b.a -= dt * (2 - u)) <= 0)) this.lobes.splice(i, 1);
    }
  }
  draw(p, top, FR, SM, fire, glow) {
    const o = this.o, L = Math.max(10, -top);
    // draw from the top down so the foot sits in front
    const list = [...this.lobes].sort((a, b) => a.y - b.y);
    for (const b of list) {
      const u = clamp(-b.y / L), foot = Math.pow(1 - u, 4), w = o.w + o.foot * foot;
      const x = b.x * w * 0.45 + Math.sin(this.t * 1.7 + b.ph + u * 3) * o.sway * u;
      const r = b.s * (0.75 + 0.5 * foot + 0.35 * u) * Math.min(1, b.a * 1.5);
      const end = 1 - smooth(0.85, 1, u);
      lobe(p, x, b.y - r * 0.3 * foot, r, FR, SM, clamp(fire * (1.1 - u * 0.9)), glow * smooth(0.55, 1, u), Math.min(1, b.a) * end * 0.9, 0, u > 0.5 ? 0 : 1, o.style);
    }
  }
}
