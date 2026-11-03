// The basin's caustic light (two warped sine nets, light where they cross zero) is adapted from Sprite Fusion's
// open-source bubbles (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, tileNoise, clamp, smooth, rand, TAU, WHITE } from "../../core/index.mjs";
import { WATER, bead, ring, rock } from "./_lib.mjs";

export const meta = {
  name: "Fountain",
  desc: "A stone basin; a jet rises from its spout and blooms into glassy arcs that break into beads, fall back and plink into the water with rings.",
  tags: ["water", "fountain", "jet", "basin", "prop", "ambient", "loop"],
  size: [120, 104],
  origin: [60, 96],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, seed: 3 },
};

const D = meta.duration, SY = 0.34, G = 600, RIM = 10, RX = 36, IN = 29.5, JET = 54, ARCS = 12;
// the basin stands on the floor: its base ellipse touches y = 0 at the front; heights are measured from that plane
const BY = -RX * SY, LEVEL = RIM - 1.2;

// the arcs: water thrown out of the top of the jet in every direction, each a parabola back down to the basin
const arcs = (S) =>
  Array.from({ length: ARCS }, (_, i) => {
    const a = ((i + 0.5) / ARCS) * TAU + rand(i, S) * 0.25, vr = 38 + 14 * rand(i, S + 1), vh = 30 + 26 * rand(i, S + 2);
    const tl = (vh + Math.sqrt(vh * vh + 2 * G * (JET - LEVEL))) / G;
    return { a, vr, vh, tl, ca: Math.cos(a), sa: Math.sin(a) };
  });
// a point along an arc tau seconds into its flight: screen x, y and the height above the floor
const along = (q, tau) => {
  const r = q.vr * tau, h = JET + q.vh * tau - 0.5 * G * tau * tau;
  return [q.ca * r, BY + q.sa * r * SY - h, h];
};

// the stone basin: a wide rim lit toward the light with a dark line round both edges, a wall of stone blocks
// below its near side (lit left, shaded right) standing on the floor
const inEll = (x, y, rx, cy) => (x / rx) ** 2 + ((y - cy) / (rx * SY)) ** 2 <= 1;
function basin(p, ST, half) {
  const cy = BY - RIM, ry = RX * SY;
  p.shade(-RX - 1, cy - ry - 1, RX + 1, 1, (x, y, out) => {
    if (inEll(x, y, RX, cy)) {
      if (inEll(x, y, IN, cy)) return;
      const near = y > cy;
      if (near !== half > 0) return;
      const outer = !inEll(x, y - 1, RX, cy) || !inEll(x, y + 1, RX, cy) || !inEll(x - 1, y, RX, cy) || !inEll(x + 1, y, RX, cy);
      const inner = inEll(x, y - 1, IN, cy) || inEll(x, y + 1, IN, cy) || inEll(x - 1, y, IN, cy) || inEll(x + 1, y, IN, cy);
      const a = Math.atan2((y - cy) / ry, x / RX), lit = -Math.cos(a) * 0.65 - Math.sin(a) * 0.45;
      out.c = outer ? ST[0] : inner ? (y < cy ? ST[2] : ST[1]) : lit > 0.4 ? ST[5] : lit > -0.05 ? ST[4] : lit > -0.45 ? ST[3] : ST[2];
      return;
    }
    // the wall, under the near half of the rim
    if (half < 0 || Math.abs(x) >= RX) return;
    const dx = x / RX, top = cy + Math.sqrt(1 - dx * dx) * ry, base = top + RIM;
    if (y < top || y > base) return;
    const u = Math.asin(clamp(dx)) * RX * 0.62, block = ((((u + 40) / 9) % 1) + 1) % 1, row = y - top, course = row > RIM * 0.5 ? 1 : 0;
    const joint = (((((u + 40 + course * 4.5) / 9) % 1) + 1) % 1) < 0.1;
    out.c = y > base - 1 || Math.abs(x) > RX - 1 || row < 1 ? ST[0] : joint || Math.abs(row - RIM * 0.5) < 0.5 ? ST[1] : dx < -0.4 ? ST[4] : dx < 0.3 ? ST[3] : ST[2];
    if (row >= 1 && row < 2 && !joint) out.c = dx < 0 ? ST[2] : ST[1];
  });
}

// the water in the basin: dark and see-through, a lit band at the far side, caustic light swimming in it
function pool(p, C, ph) {
  const rx = IN, ry = rx * SY, cy = BY - LEVEL, T = ph * TAU;
  for (let Y = Math.floor(cy - ry); Y < cy + ry; Y++)
    for (let X = -Math.ceil(rx); X < rx; X++) {
      const x = X + 0.5, y = Y + 0.5, dx = x / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      if (d > 1) continue;
      p.blend(x, y, dy < -0.55 ? C[3] : C[1], dy < -0.55 ? 0.8 : 0.85);
      const u = x * 0.25 + 1.6 * Math.sin(y * 0.6 + T), w = y * 0.7 + 1.6 * Math.sin(x * 0.14 - T * 2);
      const f = Math.max(0, 1 - Math.abs(Math.sin(u) + Math.sin(w)) * 2.6) * (1 - d);
      if (f > 0.35) p.light(x, y, C[5], 0.3 * f);
    }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, S = o.seed, ST = rock(), Q = arcs(S);
  basin(p, ST, -1);
  pool(p, C, ph);
  // the arcs on the far side, dimmer, behind the jet
  for (const q of Q) if (q.sa < 0) arc(p, C, q, ph, true);
}

// one arc: a glassy stream that thins as it falls and breaks into beads at the end; beads slide down it
function arc(p, C, q, ph, back) {
  let prev = null;
  for (let tau = 0; tau <= q.tl; tau += 0.012) {
    const [x, y] = along(q, tau), u = tau / q.tl;
    if (prev && u < 0.66) p.line(prev[0], prev[1], x, y, back ? (u < 0.25 ? C[5] : C[4]) : u < 0.2 ? WHITE : u < 0.45 ? C[6] : C[5]);
    prev = [x, y];
  }
  // the beads it breaks into, sliding down at the water's own speed
  for (let k = 0; k < 6; k++) {
    const u = ((ph * 2 + k / 6) % 1) * 0.42 + 0.58, tau = u * q.tl, [x, y] = along(q, tau), vy = (q.vh - G * tau) * -1 + q.sa * q.vr * SY;
    bead(p, x, y, q.ca * q.vr, vy, back ? 1 : k % 3 === 0 ? 2 : 1, back ? [C[0], C[1], C[2], C[2], C[3], C[4], C[5], C[5]] : C);
  }
  // and the ones sliding along the stream itself catch the light
  const g = ((ph * 4 + q.a) % 1) * 0.6, [gx, gy] = along(q, g * q.tl);
  p.px(gx, gy, WHITE);
  if (!back) p.glow(gx, gy, 3, C[5], 0.3);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, S = o.seed, ST = rock(), Q = arcs(S), T = ph * TAU;
  // the spout: a little stone stem in the middle of the basin
  p.shade(-3.5, BY - 16, 3.5, BY - LEVEL + 0.5, (x, y, out) => {
    const w = y < BY - 14 ? 3.4 : 2.2;
    if (Math.abs(x) > w) return;
    out.c = Math.abs(x) > w - 0.8 || y < BY - 15.5 ? ST[0] : x < -0.6 ? ST[4] : x < 0.8 ? ST[3] : ST[2];
  });
  // the jet: a glassy column, white down its middle, wobbling a little at the top
  p.shade(-3, BY - JET - 1, 3, BY - 16, (x, y, out) => {
    const v = (BY - 16 - y) / (JET - 16), sway = Math.sin(T * 2 + v * 5) * 0.5 * v, w = 1.3 + 0.5 * v + 0.3 * Math.sin(T * 3 + y * 0.4), q = (x - sway) / w;
    if (Math.abs(q) > 1) return;
    const n = tileNoise(x * 0.9, y * 0.15 + ph * 16, 0, 16, S);
    out.c = q < -0.4 ? C[6] : q < 0.35 ? (n > -0.3 ? WHITE : C[6]) : C[5];
  });
  // the bloom where it opens out at the top
  p.circle(0, BY - JET - 1, 2.4, C[6]);
  p.circle(-0.4, BY - JET - 1.5, 1.4, WHITE);
  p.glow(0, BY - JET, 22, C[5], 0.46 + 0.06 * Math.sin(T * 4));
  p.glow(0, BY - JET - 1, 8, WHITE, 0.3);
  // glints wink along the arcs
  cycle(t, D, 10, S + 30, (g) => g.range(0.2, 0.35), (age, life, r) => {
    const q = Q[Math.floor(r.next() * ARCS)], [x, y] = along(q, r.range(0.1, 0.7) * q.tl), k = Math.sin((Math.PI * age) / life);
    if (q.sa < -0.3) return;
    p.px(x, y, WHITE);
    if (k > 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
    p.glow(x, y, 5, C[5], 0.4 * k);
  });
  // foam where the jet leaves the spout
  for (let i = 0; i < 4; i++) p.px(Math.sin(T * 3 + i * 1.7) * 2.5, BY - 16 - (i % 2), i % 2 ? C[6] : WHITE);
  // the arcs on the near side, in front of the jet
  for (const q of Q) if (q.sa >= 0) arc(p, C, q, ph, false);
  // where they come down: near halves of the rings, flecks and tiny crowns thrown up, light on the water
  Q.forEach((q, i) => {
    const f = (ph * 2 + rand(i, S + 9)) % 1, [x, y] = along(q, q.tl);
    ring(p, x, y, 2 + f * 8, SY, 0.8 * Math.pow(1 - f, 1.3), C, { n: 1, half: 1, seed: i });
    const g = (ph * 6 + rand(i, S + 10)) % 1;
    if (g < 0.15) p.px(x, y - 1, WHITE);
    if (g < 0.3 && q.sa > -0.2) p.line(x, y - 1, x + (rand(i, S + 11) - 0.5) * 2, y - 1 - 3 * (1 - g / 0.3), C[6]);
    p.glow(x, y, 6, C[5], 0.18 * (1 - g));
  });
  basin(p, ST, 1);
  // a fine mist hangs round the bloom
  cycle(t, D, 16, S + 20, (g) => g.range(0.8, 1.4), (age, life, r) => {
    const k = age / life, a = r.range(0, TAU), rr = r.range(4, 20) + k * 6, x = Math.cos(a) * rr, y = BY - JET + r.range(-4, 16) + k * 10;
    if (k > 0.75 && r.next() < (k - 0.75) * 4) return;
    p.px(x, y, r.next() < 0.4 ? WHITE : C[6]);
  });
  // light: the jet, and the basin water lit from above
  p.glowLine(0, BY - 16, 0, BY - JET, 10, C[5], 0.18);
  p.glow(0, BY - LEVEL - 2, 46, C[4], 0.26 + 0.03 * Math.sin(T * 2));
  p.glow(0, BY - LEVEL - 20, 30, C[5], 0.12);
}
