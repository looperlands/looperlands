// The puddle (a domed wet surface with glints sliding along it, bubbles that swell and pop) is adapted from
// Sprite Fusion's open-source poison puddle (https://www.spritefusion.com/pixel-art-vfx/poison),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, wrap, smooth, seg, ease, lerp, rng, cycle, sparkle, TAU } from "../../core/index.mjs";
import { Grid, shift, curve, spring, toss, lnoise } from "./_lib.mjs";

export const meta = {
  name: "Slime",
  desc: "A glossy slime hops in place: it squashes to wind up, stretches into the jump, rounds out in the air, splats down flinging droplets that creep back, then wobbles and blinks.",
  tags: ["critter", "slime", "monster", "hop", "goo", "loop"],
  size: [112, 88],
  origin: [56, 72],
  duration: 1.8,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#061412", "#0b2f2b", "#12594a", "#1f8f4f", "#47c752", "#a6f06a", "#f0ffd2"], hop: 24, seed: 1 },
};

const GRID = new Grid(-30, -64, 60, 66);
const D = meta.duration, T_SQ = 0.5, T_UP = 0.84, T_LIFT = 0.9, T_LAND = 1.44, SNAP = 0.965;
const W0 = 30, H0 = 22, VC = 0.4, G = 640, NDROP = 12;

// the body's shape and squash at loop time t: s > 0 stretched tall, s < 0 squashed flat
function pose(t, hop) {
  const age = wrap(t - T_LAND, D);
  let s, by = 0, lean = 0, round = 0.1, q = -1;
  if (t >= T_LIFT && t < T_LAND) {
    q = (t - T_LIFT) / (T_LAND - T_LIFT);
    by = -hop * 4 * q * (1 - q);
    s = curve(q, [[0, 0.36], [0.4, 0.02], [0.55, -0.05], [0.85, 0.08], [1, 0.16]]);
    round = 0.1 + 0.8 * smooth(0, 0.16, q) * (1 - smooth(0.86, 1, q));
  } else if (t >= T_UP && t < T_LIFT) s = lerp(-0.3, 0.36, ease.outCubic(seg(t, T_UP, T_LIFT)));
  else if (t >= T_SQ && t < T_UP) {
    const u = seg(t, T_SQ, T_UP);
    s = -0.3 * ease.inOutSine(u) + 0.018 * Math.sin(t * TAU * 16) * smooth(0.55, 1, u);
  } else {
    // the splat holds for a beat, then rings out into a wobble; the top sways a little as it settles
    s = age < 0.06 ? -0.46 : -0.46 * spring(age - 0.06, 2.1, 4.6);
    lean = 0.07 * Math.exp(-age * 4) * Math.sin(age * TAU * 1.9);
    if (t < T_SQ) s += 0.02 * Math.sin((t / T_SQ) * TAU);
  }
  return { s, by, lean, round, q, age, W: W0 / Math.sqrt(1 + s), H: H0 * (1 + s) };
}

// half the body's width at height v (0 base .. 1 top): a dome over a soft foot with rounded corners
function halfW(v, P) {
  if (v < 0 || v > 1) return -1;
  const { W, H, round } = P;
  if (v >= VC) {
    const q = (v - VC) / (1 - VC);
    return (W / 2) * Math.sqrt(1 - q * q);
  }
  const q = (VC - v) / VC, hb = v * H, rc = 3;
  let hw = (W / 2) * Math.sqrt(Math.max(0, 1 - round * q * q));
  if (hb < rc) hw -= rc - Math.sqrt(rc * rc - (rc - hb) ** 2);
  return hw;
}
const inside = (P, x, y) => {
  const v = (P.by - 1 - y) / P.H, hw = halfW(v, P);
  return hw >= 0 && Math.abs(x - P.lean * v * P.H) <= hw;
};

// shaded the way a pixel artist shades jelly: a dark dome over light pooling low inside the body, a shadow
// crescent (the rim the body leaves bare when nudged toward the light), a glossy streak hugging the top-left
// contour with a hot spot under it, light bounced up off the floor caught just inside the lower rim
function body(g, C, P) {
  const yb = P.by - 1, half = P.W / 2 + 3;
  const cx = P.lean * 0.45 * P.H, cy = yb - P.H * 0.5, lx = cx - P.W * 0.24, ly = cy - P.H * 0.36;
  const lit = (x, y, k) => inside(P, lx + (x - lx) / k, ly + (y - ly) / k);
  g.clear();
  g.shade(-half, yb - P.H - 1, half, yb, (x, y, o) => {
    if (!inside(P, x, y)) return 0;
    o.t = 1;
    o.a = 0.92;
    let i = lit(x, y, 0.42) ? 5 : lit(x, y, 0.7) ? 4 : 3;
    // light pooled in the jelly along the bottom, brightest just inside the rim
    const v = (yb - y) / P.H;
    if (v < 0.3 && inside(P, x, y + 1.4)) i = !inside(P, x, y + 2.4) ? 5 : v < 0.2 ? 4 : i;
    if (!inside(P, x + 2, y + 2.4)) (i = 2), (o.a = 1);
    const ang = Math.atan2(y - cy, (x - cx) * (P.H / P.W));
    if (!inside(P, x - 1.6, y - 1.6) && inside(P, x - 0.7, y - 0.7) && ang > -2.75 && ang < -1.55) (i = ang > -2.45 && ang < -1.8 ? 6 : 5), (o.a = 1);
    if (i === 2 && inside(P, x + 1, y + 1.2) && !inside(P, x + 2, y + 2.4) && ang > 0.3 && ang < 1.5) i = 4;
    return C[i];
  });
  // the hot spot: a tiny bright window reflection under the streak
  const hx = Math.round(cx - P.W * 0.27), hy = Math.round(cy - P.H * 0.14);
  if (inside(P, hx - 1, hy) && inside(P, hx + 1, hy + 1)) g.set(hx, hy, C[6]), g.set(hx, hy + 1, C[5]);
}

// the eyes ride the squash: squint while winding up, wide in the air, screwed shut on the splat, a blink at rest
function face(g, C, P, t) {
  const yb = P.by - 1, ev = 0.47, ey = Math.round(yb - P.H * ev), ex = Math.max(3, Math.round(P.W * 0.16)), xc = Math.round(P.lean * ev * P.H);
  const air = P.q >= 0, shut = P.age < 0.16 && !air, blink = t > 0.22 && t < 0.29;
  const wind = t >= T_SQ && t < T_LIFT ? seg(t, T_SQ, T_UP) : 0, look = air ? (P.q < 0.45 ? -1 : P.q > 0.7 ? 1 : 0) : 0;
  const eh = clamp(Math.round(4 * (1 + P.s * 0.8) - wind * 2 + (air && P.q < 0.6 ? 1 : 0)), 1, 5);
  for (const side of [-1, 1]) {
    const x = xc + side * ex - (side > 0 ? 1 : 0);
    if (shut) {
      const a = side < 0 ? 0 : 1, b = 1 - a;
      g.set(x + a, ey - 1, C[0]); g.set(x + b, ey, C[0]); g.set(x + a, ey + 1, C[0]);
      continue;
    }
    if (blink) {
      g.set(x, ey + 1, C[0]); g.set(x + 1, ey + 1, C[0]);
      continue;
    }
    const top = ey + 2 - eh + look;
    for (let k = 0; k < eh; k++) g.set(x, top + k, C[0]), g.set(x + 1, top + k, C[0]);
    g.set(x + (look > 0 ? 1 : 0), top + (look > 0 ? 1 : 0), C[6]);
    if (eh >= 4) g.set(x + 1, top + eh - 1, C[2]);
  }
  const my = Math.round(yb - P.H * 0.31);
  if (air && P.q < 0.75) g.set(xc, my, C[0]), g.set(xc - 1, my, C[0]), g.set(xc, my + 1, C[1]), g.set(xc - 1, my + 1, C[1]);
  else if (!shut) g.set(xc, my, C[1]), g.set(xc - 1, my, C[1]);
}

// a bubble works its way up through the jelly while it rests and pops at the top
const POP = 0.4;
function bubbleIn(g, C, P, t) {
  if (t > POP) return;
  const v = lerp(0.18, 0.86, ease.inQuad(t / POP)), hw = halfW(v, P), x = P.lean * v * P.H - hw * lerp(0.35, 0.05, t / POP), y = P.by - 1 - v * P.H;
  g.set(x, y, C[6]); g.set(x + 1, y, C[5]); g.set(x, y + 1, C[5]); g.set(x + 1, y + 1, C[4]);
}

// droplets flung off the splat: they arc, land with a little splat, and creep back to the body to rejoin it
function droplet(i, o, age) {
  const r = rng(o.seed, i, 7), a = -Math.PI / 2 + r.range(-1.2, 1.2), sp = r.range(60, 118), size = r.chance(0.35) ? 1 : r.chance(0.7) ? 2 : 3;
  const fa = a + Math.PI / 2, x0 = Math.sin(fa) * 21, y0 = -1 - Math.cos(fa) * 12.5;
  const f = toss(x0, y0, Math.cos(a) * sp * 0.75, Math.sin(a) * sp, age, G, -1);
  f.size = size;
  if (f.landed) {
    const home = Math.sign(f.lx || 1) * (W0 / 2 - 2), dur = Math.min(0.55, 0.22 + Math.abs(f.lx - home) / 60), u = seg(age - f.at - 0.14, 0, dur);
    f.x = lerp(f.lx, home, ease.inOutSine(u));
    f.k = 1 - u;
    f.gone = u >= 1;
    f.splat = clamp(1 - (age - f.at) / 0.14);
  }
  return f;
}

// the wet patch it sits in: wider while squashed, splashed out on landing, left behind while it jumps
function puddleR(t, P) {
  if (P.q >= 0) return (W0 / Math.sqrt(1.36) / 2 + 3) * (1 - 0.22 * P.q);
  return P.W / 2 + 3 + 9 * Math.exp(-P.age * 5) * (1 - Math.exp(-P.age * 40)) * (t >= T_LAND || t < T_SQ ? 1 : 0);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), P = pose(t, o.hop), yb = P.by - 1, age = P.age;
  const g = GRID;
  body(g, C, P);
  face(g, C, P, t);
  bubbleIn(g, C, P, t);
  g.outline((x, y, nx, ny) => (ny < 0 && nx <= 0 && y < yb - P.H * 0.5 ? C[1] : C[0]));
  g.draw(p);

  // the bubble pops out of the top: a ring and two flecks
  if (t >= POP && t < POP + 0.16) {
    const k = (t - POP) / 0.16, x = P.lean * P.H - halfW(0.86, P) * 0.05, y = yb - P.H - 0.5;
    for (let a = 0; a < TAU; a += 0.6) p.dot(x + Math.cos(a) * (1 + k * 3), y + Math.sin(a) * (1 + k * 3) * 0.7, C[6], 1.2 - k);
    for (const s of [-1, 1]) p.dot(x + s * (1 + k * 4), y - 1 - k * 6 + k * k * 4, C[5], 1.3 - k);
    p.glow(x, y, 6, C[5], 0.4 * (1 - k));
  }
  // droplets in flight
  for (let i = 0; i < NDROP; i++) {
    const f = droplet(i, o, age);
    if (f.landed || inside(P, f.x, f.y)) continue;
    const sv = Math.hypot(f.vx, f.vy) || 1, ux = f.vx / sv, uy = f.vy / sv, L = Math.min(2.5, sv / 50);
    p.line(f.x - ux * L, f.y - uy * L, f.x, f.y, C[3]);
    if (f.size >= 2) p.px(f.x - 1, f.y, C[4]), p.px(f.x - 1, f.y + 1, C[3]), p.px(f.x, f.y + 1, C[2]);
    if (f.size >= 3) p.px(f.x + 1, f.y, C[3]), p.px(f.x - 1, f.y - 1, C[4]), p.px(f.x, f.y - 1, C[5]);
    p.px(f.x, f.y, f.size >= 2 ? C[6] : C[5]);
    p.glow(f.x, f.y, 5 + f.size, C[4], 0.32);
  }
  // spores drifting up out of the puddle, glowing
  cycle(t, D, 7, o.seed * 13 + 1, (r) => r.range(1.2, 1.8), (ag, L, r, i) => {
    const k = ag / L, x = r.range(-24, 24) + Math.sin(ag * 2.1 + i * 1.7) * 3, y = -2 - r.range(9, 17) * ag - 5 * ag * ag;
    const a = Math.min(1, k * 4) * Math.min(1, (1 - k) * 2.5), tw = 0.6 + 0.4 * Math.sin(ag * 7 + i * 2.3), big = r.chance(0.35);
    p.dot(x, y, tw > 0.8 ? C[6] : C[5], a);
    if (big) p.dot(x + 1, y, C[5], a), p.dot(x, y + 1, C[4], a), p.dot(x + 1, y + 1, C[4], a * 0.6);
    p.glow(x, y, big ? 9 : 6, C[5], (big ? 0.45 : 0.32) * a * tw);
  });
  // drips let go of its underside while it's in the air and plop into the puddle
  for (const [t0, dx] of DRIPS) {
    const a2 = wrap(t - t0, D);
    if (a2 > 0.6) continue;
    const P0 = pose(t0, o.hop), f = toss(dx, P0.by - 0.5, 0, 12, a2, G, -1);
    if (!f.landed) p.px(dx, f.y, C[5]), p.px(dx, f.y - 1, C[4]), p.glow(dx, f.y, 4, C[4], 0.3);
    else if (a2 - f.at < 0.14) {
      const k = (a2 - f.at) / 0.14;
      for (const s2 of [-1, 1]) p.dot(dx + s2 * (1 + k * 3), -2 - k * 3 + k * k * 3, C[5], 1.2 - k);
    }
  }
  // a glint on the dome at the top of the hop
  if (P.q > 0.4 && P.q < 0.64) {
    const k = Math.sin(Math.PI * seg(P.q, 0.4, 0.64));
    sparkle(p, P.lean * 0.8 * P.H - P.W * 0.21, yb - P.H * 0.8, 1 + 2.5 * k, C[6], C[5], 0.5 * k);
  }
  // light: the slime glows through and tints the air round it, the puddle lights the floor, a flash on the splat
  const cx = P.lean * P.H * 0.4, cy = yb - P.H * 0.45, near = clamp(1 + P.by / (o.hop * 1.1));
  const R = puddleR(t, P), br = 0.9 + 0.1 * Math.sin((t / D) * TAU * 2);
  p.glow(cx * 0.5, -14, 64, C[3], 0.3 * br);
  p.glow(cx, cy, 30 + P.W * 0.3, C[4], 0.2);
  p.glow(cx, cy + 3, 14, C[5], 0.16);
  p.glow(0, -2, R * 1.3 + 6, C[4], 0.12 + 0.08 * near);
  if (t >= T_LAND || t < T_SQ) p.glow(0, -3, 40, C[5], 0.42 * Math.exp(-age * 9));
}

const DRIPS = [[1.02, -4], [1.18, 3]];

export function drawBack(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), P = pose(t, o.hop), age = P.age;
  // the puddle: a low dome of goo, lit along its top with glints sliding over it, darker where it meets the floor
  const R = puddleR(t, P), hp = Math.min(2.4, 0.9 + R * 0.06);
  for (let x = Math.floor(-R); x <= Math.ceil(R); x++) {
    const d = Math.abs(x + 0.5) / R;
    if (d > 1) continue;
    const top = -1 - Math.round(Math.sqrt(1 - d * d) * hp);
    for (let y = top; y <= 0; y++) {
      let c = y === top ? C[5] : y === 0 ? C[2] : C[4];
      if (d > 0.88) c = y === top ? C[4] : C[3];
      if (y === top && d < 0.88) {
        const n = lnoise(t, D, 7, x * 0.18, 3) + lnoise(t, D, 4, x * 0.07, 4) * 0.6;
        if (n > 0.55) c = C[6];
      } else if (y === top + 1 && d < 0.8 && lnoise(t, D, 3, x * 0.12, 5) > 0.3) c = C[5];
      p.px(x, y, c);
    }
    if (d > 0.96) p.px(x, top - 1, C[1]);
  }
  // bubbles swell out of the puddle and pop, flicking flecks
  cycle(t, D, 4, o.seed * 17 + 3, (r) => r.range(0.45, 0.75), (ag, L, r) => {
    const x = r.range(-0.85, 0.85) * R, k = ag / L, rb = r.range(1.4, 2.6) * (0.3 + 0.7 * ease.outCubic(Math.min(1, k * 1.25)));
    if (Math.abs(x) < P.W / 2 + 1 && P.q < 0) return;
    const sy = -1 - Math.round(Math.sqrt(Math.max(0, 1 - (x / R) ** 2)) * hp);
    if (k < 0.85) {
      for (let y = Math.floor(sy - rb); y <= sy; y++)
        for (let xx = Math.floor(x - rb - 1); xx <= Math.ceil(x + rb + 1); xx++) {
          const dx = xx + 0.5 - x, dy = y + 0.5 - sy, dd = Math.hypot(dx, dy);
          if (dd > rb + 0.5) continue;
          if (dd > rb - 0.7) p.px(xx, y, dx < 0 && dy < -rb * 0.3 ? C[6] : C[4]);
          else p.blend(xx, y, C[5], 0.3);
        }
      p.glow(x, sy - rb * 0.5, rb * 2 + 3, C[5], 0.2);
    } else {
      const q = (k - 0.85) / 0.15;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0.6, -0.7], [-0.6, -0.7], [0, -1]]) p.dot(x + dx * (2 + 3 * q), sy + dy * (2 + 3 * q), C[6], 1.2 - q);
    }
  });
  // landed droplets: a flattened splat, then a bead of goo creeping home, a wet trail behind it
  for (let i = 0; i < NDROP; i++) {
    const f = droplet(i, o, age);
    if (!f.landed || f.gone) continue;
    const x = Math.round(f.x), w = f.size + (f.splat > 0 ? 1 : 0);
    for (let j = 0; j < w; j++) p.px(x - (w >> 1) + j, -1, j === 0 ? C[5] : C[4]);
    if (f.size >= 2 && f.splat <= 0) p.px(x, -2, C[5]), p.px(x - 1, -2, C[4]);
    p.px(x, 0, C[3]);
    const dir = Math.sign(f.lx - f.x);
    for (let j = 1; j < Math.min(8, Math.abs(f.lx - f.x)); j++) p.dot(x + dir * j, 0, C[2], 0.7 - j * 0.08);
    p.glow(x, -1, 5, C[4], 0.25 * f.k + 0.1);
  }
  // the goo string it pulls off the floor as it leaves; when it snaps, a drip falls back and the rest pulls up
  if (t >= T_LIFT && t < SNAP) {
    const bot = P.by - 1, u = (t - T_LIFT) / (SNAP - T_LIFT);
    for (let y = Math.floor(bot); y < 0; y++) {
      const m = Math.sin(((y - bot) / -bot) * Math.PI);
      p.px(-1, y, C[4]);
      if (m * u < 0.45) p.px(0, y, C[3]);
    }
  } else if (t >= SNAP && t < SNAP + 0.3) {
    const a2 = t - SNAP, ys = pose(SNAP, o.hop).by - 1, f = toss(-1, ys * 0.45, 0, 0, a2, G * 1.3, -2);
    if (!f.landed) p.px(-1, f.y, C[5]), p.px(-1, f.y - 1, C[3]);
    const nub = 3 * (1 - a2 / 0.12);
    for (let j = 0; j < nub; j++) p.px(-1, P.by + j, j === 0 ? C[3] : C[4]);
  }
}
