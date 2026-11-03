// The bubbles are adapted from Sprite Fusion's open-source bubbles (https://www.spritefusion.com/pixel-art-vfx/bubbles),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, clamp, wrap, lerp, seg, ease, rng, cycle, TAU } from "../../core/index.mjs";
import { Grid, shift, bubble } from "./_lib.mjs";

export const meta = {
  name: "Jellyfish",
  desc: "A see-through jellyfish pulses: its bell squeezes to shove it up and relaxes as it sinks, frilled arms and long tentacles trailing, a glow inside, bubbles drifting by.",
  tags: ["critter", "jellyfish", "sea", "underwater", "glow", "swim", "loop"],
  size: [96, 120],
  origin: [48, 38],
  duration: 3.2,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#140b2b", "#2a1650", "#4b2386", "#7a3cb8", "#b066e0", "#e09cf5", "#ffd6ff", "#ffffff"],
    glow: ["#0b3550", "#1f7fa8", "#4fd2e8", "#b8fbff"],
    seed: 1,
  },
};

const D = meta.duration, BEAT = D / 2, GRID = new Grid(-22, -28, 44, 36), W0 = 32, H0 = 18;

// the bell's squeeze (1 squeezed, below 0 flared out past rest) and its height through one beat
function squeeze(u) {
  if (u < 0.16) return ease.outCubic(u / 0.16);
  if (u < 0.22) return 1;
  if (u < 0.72) return lerp(1, -0.14, ease.inOutSine((u - 0.22) / 0.5));
  return lerp(-0.14, 0, ease.inOutSine((u - 0.72) / 0.28));
}
function lift(u) {
  return u < 0.42 ? -6 * ease.outCubic(seg(u, 0.04, 0.42)) : -6 + 6 * ease.inOutSine((u - 0.42) / 0.58);
}
// the bell at loop time t: rim center (x, y), width, height, squeeze
function bell(t) {
  t = wrap(t, D);
  const u = (t % BEAT) / BEAT, c = squeeze(u);
  return { x: 2 * Math.sin((t / D) * TAU), y: lift(u), c, W: W0 * (1 - 0.3 * c), H: H0 * (1 + 0.24 * c) };
}

// the bell's half-width h px above its rim: a dome whose margin pulls in as it squeezes
function halfW(h, B) {
  if (h > B.H) return -1;
  let hw = (B.W / 2) * Math.sqrt(Math.max(0, 1 - (Math.max(0, h) / B.H) ** 2));
  if (h < B.H * 0.3) hw -= B.c * 2.4 * (1 - h / (B.H * 0.3));
  return hw;
}
// the margin hangs in little scallops
const scallop = (dx, B) => 1.1 * Math.max(0, Math.sin((dx / (B.W / 2)) * Math.PI * 4 + Math.PI / 2));

function drawBell(p, C, G, B, t) {
  const g = GRID.clear(), bx = Math.round(B.x), by = Math.round(B.y);
  const inside = (x, y) => {
    const dx = x - B.x, h = B.y - y;
    if (h < -scallop(dx, B)) return false;
    const hw = halfW(Math.max(0, h), B);
    return hw >= 0 && Math.abs(dx) <= hw;
  };
  g.shade(-20, -26, 20, 3, (x, y, o) => {
    const X = x + bx, Y = y + by;
    if (!inside(X, Y)) return 0;
    o.t = 1;
    return C[3];
  });
  g.depths(4);
  // the subumbrella: the hollow under the bell, seen through it as a fainter inner dome
  const iw = B.W * 0.36, ih = B.H * 0.66, lx = B.x - B.W * 0.22, ly = B.y - B.H * 0.78;
  g.recolor((x, y, c, a, tag) => {
    if (tag !== 1) return c;
    const X = x + bx + 0.5, Y = y + by + 0.5, d = g.depth(x, y), dx = X - B.x, h = B.y - Y, v = h / B.H;
    const i = g.idx(x, y);
    let col = C[3], al = 0.26 + 0.2 * clamp(v);
    const ie = (dx / iw) ** 2 + (Math.max(0, h) / ih) ** 2;
    if (ie > 0.8 && ie < 1.12 && h > 0.5) (col = C[4]), (al = 0.55);
    if (h < 1) (col = C[5]), (al = 0.85);
    if (d === 2) (col = v > 0.5 && dx < 0 ? C[5] : C[4]), (al = 0.75);
    if (d === 1) (col = dx < 0 && v > 0.25 ? C[6] : C[5]), (al = 0.92);
    // the gloss on the top-left of the dome
    const gx = X - lx, gy = Y - ly;
    if (d === 2 && dx < -1 && v > 0.45 && gx * gx + gy * gy < 26) (col = C[7]), (al = 1);
    g.a[i] = al;
    return col;
  });
  // radial canals running down from the crown
  for (const s of [-0.62, 0.62]) {
    for (let h = 2; h < B.H - 2; h++) {
      const hw = halfW(h, B), x = B.x + s * hw * 0.9, y = B.y - h;
      if (g.depth(x - bx, y - by) >= 3) g.set(x - bx, y - by, C[4], 0.5);
    }
  }
  // the stomach and gonads: a soft glowing mass hung in the bell, brighter as it squeezes
  const pulse = 0.5 + 0.5 * B.c, cy = B.y - B.H * 0.42, rx = B.W * 0.2, ry = B.H * 0.2;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(B.x - rx); x <= B.x + rx; x++) {
      const d = ((x + 0.5 - B.x) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d > 1 || g.depth(x - bx, y - by) < 2) continue;
      g.set(x - bx, y - by, d < 0.3 ? C[6] : d < 0.65 ? C[5] : C[4], d < 0.3 ? 0.9 : 0.6);
    }
  g.outline((x, y, nx, ny) => (ny > 0 ? 0 : C[1]), 0.9);
  g.draw(p, 1, bx, by);
  // the light inside, and the little lamps round the margin
  p.glow(B.x, B.y - B.H * 0.45, 30 + 6 * B.c, C[4], 0.22 + 0.12 * pulse);
  p.glow(B.x, B.y - B.H * 0.45, 11, C[6], 0.14 + 0.16 * pulse);
  for (const s of [-1, 1])
    for (const q of [0.14, 0.42, 0.78]) {
      const x = B.x + s * halfW(0.5, B) * q, y = B.y + 1, tw = 0.6 + 0.4 * Math.sin((t / D) * TAU * 3 + q * 9 + s);
      p.px(x, y, tw > 0.85 ? G[3] : G[2]);
      p.glow(x, y, 4, G[2], 0.4 * tw);
    }
}

// a strand hanging from the bell: each point follows where its root was a moment ago, so the strand trails
// behind every thrust and billows as the bell sinks; a slow wave runs down it
function strand(t, off, len, step, lag, sway, ph, pull) {
  const pts = [], B1 = bell(t), o1 = off(B1);
  for (let s = 0; s <= len; s += step) {
    const B = bell(t - s * lag), relax = 1 - clamp(B.c), ox = lerp(o1[0], off(B)[0], 0.4);
    const w = (0.3 + s * sway) * (0.55 + 0.65 * relax) * Math.sin((t / D) * TAU * 2 - s * 0.11 + ph);
    pts.push([B.x + ox + w + ox * s * (0.009 * relax - 0.005 * pull * B.c), B.y + o1[1] + s * (0.88 + 0.05 * B.c)]);
  }
  return pts;
}

function drawTentacle(p, C, G, pts, back, t, i) {
  const n = pts.length;
  for (let k = 1; k < n; k++) {
    const u = k / (n - 1), [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    const c = back ? (u < 0.3 ? C[3] : u < 0.7 ? C[2] : C[1]) : u < 0.2 ? C[5] : u < 0.45 ? C[4] : u < 0.78 ? C[3] : C[2];
    p.line(x0, y0, x1, y1, c);
  }
  // stinging cells glinting along it
  if (back) return;
  for (let k = 3; k < n; k += 4) {
    const tw = Math.sin((t / D) * TAU * 2 - k * 0.5 + i * 1.7);
    if (tw < 0.3) continue;
    const [x, y] = pts[k];
    p.px(x, y, tw > 0.8 ? G[3] : G[2]);
    p.glow(x, y, 3.5, G[2], 0.35 * tw);
  }
}

// a frilled oral arm: a ribbon lit down its left edge, darker on its right, ruffled along both sides
const ARMS = new Grid(-40, -40, 80, 100);
function drawArms(p, C, list, back) {
  const g = ARMS.clear(), a = back ? 0.6 : 0.88;
  for (const arm of list) {
    if (arm.back !== back) continue;
    const pts = arm.pts, n = pts.length;
    let lastRow = -1e9;
    for (let k = 1; k < n; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], m = Math.max(1, Math.ceil(Math.abs(y1 - y0) * 2));
      for (let j = 0; j < m; j++) {
        const q = j / m, x = lerp(x0, x1, q), y = lerp(y0, y1, q), u = (k - 1 + q) / (n - 1), wd = lerp(2.2, 0.6, u);
        for (let i = -Math.ceil(wd); i <= Math.ceil(wd); i++) {
          if (Math.abs(i) > wd + 0.2) continue;
          g.set(x + i, y, i < 0 ? C[back ? 4 : 6] : i > 0 ? C[back ? 2 : 4] : C[back ? 3 : 5], a);
        }
        const row = Math.floor(y);
        if (row !== lastRow && row % 3 === 0 && u < 0.85) g.set(x + ((row / 3) % 2 ? -wd - 1.2 : wd + 1.2), y, C[back ? 4 : 6], a);
        lastRow = row;
      }
    }
  }
  g.draw(p);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 8), G = fit(o.glow, 4), B = bell(t);
  // specks drifting in the water
  cycle(t, D, 16, o.seed * 5 + 1, D, (age, L, r) => {
    const x = r.range(-42, 42) + Math.sin(age * 0.8 + r.next() * 6) * 3, y = r.range(-34, 66) + age * r.range(1, 4);
    const tw = Math.sin(age * 2.2 + r.next() * 6), a = Math.min(1, age * 2, (L - age) * 2) * (0.35 + 0.35 * tw);
    p.dot(x, y, tw > 0.8 ? G[2] : C[3], a);
  });
  const tents = [], arms = [];
  for (let i = 0; i < 9; i++) {
    const r = rng(o.seed, i, 4), q = -0.88 + (1.76 * i) / 8 + r.range(-0.05, 0.05), back = i % 2 === 1;
    tents.push({ back, i, pts: strand(t, (b) => [q * halfW(0.5, b), 0.5], r.range(36, 50), 1.5, 0.022, 0.065, r.range(0, TAU), 1) });
  }
  for (let i = 0; i < 4; i++) {
    const r = rng(o.seed, i, 9), q = [-0.32, -0.1, 0.12, 0.3][i], back = i === 1 || i === 2;
    arms.push({ back, pts: strand(t, (b) => [q * b.W * 0.5, -1], r.range(20, 27), 1, 0.03, 0.06, r.range(0, TAU) + i, 0.4) });
  }
  // each squeeze shoves a ring of water out under the bell: a soft swirl of light that swells and thins
  for (let b = 0; b < 2; b++) {
    const age = wrap(t - b * BEAT - 0.05, D);
    if (age > 0.9) continue;
    const B0 = bell(b * BEAT + 0.05), e = ease.outCubic(age / 0.9), k = 1 - age / 0.9;
    const cx = B0.x, cy = B0.y + 3 + 14 * e, rx = B0.W * 0.32 + 9 * e, ry = 1.5 + 2.5 * e;
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * TAU + e * 0.8;
      p.glow(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 5 + 3 * e, C[5], 0.14 * k);
    }
    // plankton caught in the swirl, glinting as it spins
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * TAU + e * 2.4 + b, x = cx + Math.cos(a) * rx * 1.05, y = cy + Math.sin(a) * ry * 1.4 - Math.cos(a * 2) * 0.6;
      if (k < 0.15 && j % 2) continue;
      p.dot(x, y, Math.sin(a) > 0 ? G[3] : G[2], Math.min(1, k * 2.5));
      p.glow(x, y, 3, G[2], 0.3 * k);
    }
    // and a few bubbles squeezed out of the margin
    for (let i = 0; i < 4; i++) {
      const r = rng(o.seed, b, i, 13), L = r.range(1.4, 2.2), ag = wrap(t - b * BEAT - 0.08 - i * 0.04, D);
      if (ag > L) continue;
      const rad = r.range(0.6, 1.5), sx = r.sign(), x = B0.x + sx * (B0.W * 0.4 + r.range(0, 4) + ag * r.range(4, 10)), y = B0.y + 2 - (14 + 10 * rad) * ag + 6 * Math.exp(-ag * 4);
      if (y < -33) continue;
      bubble(p, x + Math.sin(ag * 5 + i) * 0.8, y, rad, [G[3], G[3], G[2], G[1]], Math.min(1, ag * 6, (L - ag) * 3, (y + 33) / 6));
    }
  }
  for (const a of tents) if (a.back) drawTentacle(p, C, G, a.pts, true, t, a.i);
  drawArms(p, C, arms, true);
  drawBell(p, C, G, B, t);
  drawArms(p, C, arms, false);
  for (const a of tents) if (!a.back) drawTentacle(p, C, G, a.pts, false, t, a.i);
  // bubbles wobbling up past it
  cycle(t, D, 7, o.seed * 5 + 2, (r) => r.range(1.8, 3), (age, L, r) => {
    const rad = r.chance(0.6) ? r.range(0.6, 1.4) : r.range(1.6, 2.6), x0 = r.range(-30, 30), y0 = r.range(10, 70), v = 20 + 13 * rad;
    const end = Math.min(L, (y0 + 30) / v);
    if (age > end) return;
    const ph = r.next() * TAU, x = x0 + Math.sin(age * (4 + 2 / rad) + ph) * (0.6 + rad * 0.8), y = y0 - v * age;
    bubble(p, x, y, rad, [G[3], G[3], G[2], G[1]], Math.min(1, age * 3, (end - age) * 3), 0.1 * Math.sin(age * 9 + ph));
  });
  // a soft cool glow all round
  p.glow(B.x, B.y + 6, 58, C[3], 0.14);
}
