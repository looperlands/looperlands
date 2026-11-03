// The column recipe (ramp bands out from a white core, drifting strands, dithered edges, light every few rows)
// is adapted from Sprite Fusion's open-source holy light (https://www.spritefusion.com/pixel-art-vfx/holy-light),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, smooth, ease, rand, cycle, band, flare, TAU, WHITE, hex, mix, scale } from "../../core/index.mjs";
import { Layer, glint, pool, blobShadow } from "./_lib.mjs";

export const meta = {
  name: "Loot beam",
  desc: "A dropped sword in a tall pillar of rarity light: a white core thinning to the sky, rings pulsing across the floor, motes streaming up, a glint racing up the shaft.",
  tags: ["pickup", "loot", "beam", "rarity", "drop", "item", "loop"],
  size: [96, 176],
  origin: [48, 162],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#140a24", "#2c1250", "#4b1d86", "#7330c0", "#a050f0", "#c890ff", "#ecd4ff", "#ffffff"],
    seed: 4,
  },
};

const H = 150, RINGS = [0.08, 0.58];
const STEEL = ["#151726", "#2c3149", "#4f5775", "#8a93b3", "#d6dcef", "#ffffff"].map(hex);
const GOLD = ["#3a2008", "#7a4a10", "#b8801c", "#e8b432", "#ffe27a", "#fff6cc"].map(hex);
const LEATHER = ["#1e0f0e", "#3e2016", "#633620"].map(hex);
const INK = hex("#0d0b14");
const L = new Layer(40, 24);

// the time since the last ring left the foot, in loop phase, for ring k
const since = (ph, k) => (((ph - RINGS[k]) % 1) + 1) % 1;

// the sword lying where it fell, 22 px from pommel to point: it rests on its guard and its tip, so the hilt
// lifts off the floor. Built column by column on a stepped axis so its lines stay crisp at 1x.
// The beam rises from the guard; the blade reaches out of the light to the right.
const OX = 4, axis = (x) => Math.floor(-4 + (x + 4) / 7 + 0.5);
function sword(p, C, ph) {
  const edgeLit = (x) => (Math.abs(x + OX - 0.5) < 6 ? C[6] : mix(STEEL[4], C[6], 0.45));
  L.begin(-16, -12);
  L.set = ((set) => (x, y, c) => set.call(L, x + OX, y, c))(Object.getPrototypeOf(L).set);
  for (let x = -11; x <= 10; x++) {
    const a = axis(x);
    if (x <= -9) {
      // the pommel: a stone that holds the beam's colour
      const m = x + 10;
      if (m === 0) L.set(x, a - 1, C[6]), L.set(x, a, WHITE), L.set(x, a + 1, C[4]);
      else L.set(x, a, m < 0 ? C[5] : C[3]);
    } else if (x <= -5) {
      // the grip, wrapped in leather
      L.set(x, a, LEATHER[x % 2 ? 2 : 1]);
      L.set(x, a + 1, LEATHER[x % 2 ? 1 : 0]);
    } else if (x <= -3) {
      // the guard, gold catching the beam on its lit face, a small stone at its heart
      for (let y = a - 3; y <= a + 3; y++) {
        const end = y === a - 3 || y === a + 3;
        L.set(x, y, y === a ? (x === -4 ? C[6] : C[4]) : x === -4 ? (end ? GOLD[3] : mix(GOLD[4], C[6], 0.3)) : end ? GOLD[0] : GOLD[1]);
      }
    } else {
      // the blade: a lit edge on top, steel, a dark spine below, tapering to the point
      // backlit by the beam: a dark body with the beam's colour running along its upper edge
      const tip = x - 8;
      if (tip < 1) L.set(x, a - 1, edgeLit(x));
      if (tip < 2) L.set(x, a, tip === 1 ? edgeLit(x) : mix(STEEL[3], C[4], 0.2));
      L.set(x, a + 1, tip === 2 ? STEEL[2] : STEEL[0]);
    }
  }
  delete L.set;
  L.outline(INK).draw(p);
  // a glint slides down the blade's edge once a loop
  const g = (ph - 0.72) / 0.16;
  if (g > 0 && g < 1) {
    const x = -1 + 9 * ease.inOutSine(g);
    glint(p, x + OX, axis(Math.round(x)) - 1, 2.6 * Math.sin(g * Math.PI), WHITE, 0.5);
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T;
  // the floor: a pool of rarity light, a bright spot right under the item
  pool(p, 0.5, 0, 34, 5, C[4], 0.14);
  // light thrown on the floor in front, kept off the item itself
  p.shade(-30, -0.5, 31, 6, (x, y, out) => {
    const dx = (x - 0.5) / 30, dy = y / 6, d = dx * dx + dy * dy;
    if (d >= 1) return;
    out.l = C[5];
    out.k = 0.4 * (1 - Math.sqrt(d)) ** 2;
  });
  for (let x = -16; x <= 16; x++) {
    const q = Math.abs(x) / 16.5, a = 1.35 - q * 1.25;
    p.dot(x, 0, q < 0.3 ? WHITE : q < 0.6 ? C[6] : C[5], a);
    if (q < 0.75) p.dot(x, 1, q < 0.3 ? C[6] : q < 0.55 ? C[5] : C[4], a * 0.8);
    if (q < 0.4) p.dot(x, 2, C[4], a * 0.5);
  }
  // the far half of each ring, behind the item and the beam
  for (let k = 0; k < RINGS.length; k++) ring(p, C, since(ph, k) * T, true);
  column(p, C, t, T);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T;
  // a soft shadow where it lies, dark in the middle of the lit floor
  blobShadow(p, OX - 0.5, 12.5, 0.95);
  sword(p, C, ph);
  for (let k = 0; k < RINGS.length; k++) ring(p, C, since(ph, k) * T, false);
  motes(p, C, t, T, o.seed);
}

// a ring of light that pulses out across the floor from the item's foot
function ring(p, C, a, back) {
  const L1 = 1.1, k = a / L1;
  if (k >= 1) return;
  const r = 3 + 24 * ease.outCubic(k), th = Math.max(1, 3.2 * (1 - k));
  band(p, 0.5, 0, r, 0.2, th, Math.min(1, 1.25 * (1 - k)), [C[2], C[4], C[5], C[6]], (g) => Math.sin(g) < 0 === back, k < 0.12);
  if (!back) for (const s of [-1, 1]) p.glow(0.5 + s * r, -1, 8, C[5], 0.35 * (1 - k));
}

// the column: bands of the ramp out from a white core, strands drifting through it, pulses climbing it, the
// whole thing thinning and dithering away towards the sky; it swells as each ring leaves its foot
function column(p, C, t, T) {
  const ph = t / T;
  let beat = 0;
  for (let k = 0; k < RINGS.length; k++) {
    const s = since(ph, k) * T;
    beat = Math.max(beat, Math.exp(-s * 7) * (s < 0.5 ? 1 : 0), Math.exp(-((T - s) * 30)));
  }
  // the glint racing up the shaft once a loop
  const gq = (ph - 0.22) / 0.42, gh = gq > 0 && gq < 1 ? 4 + (H - 4) * ease.inQuad(gq) : -100;
  const shimmer = Math.floor(ph * 24);
  for (let y = -1; y >= -H; y--) {
    const h = -y - 0.5, u = h / H, fade = 1 - smooth(0.25, 1, u);
    // it narrows with height until only the core is left, and the core breaks into dashes near the top
    const w = (4.2 * (1 - 0.45 * u) + 3.2 * Math.exp(-h / 7)) * (1 + 0.2 * beat);
    // dashes of uneven length, flickering, as the column gives out
    const seg = Math.floor(h / 3 + rand(Math.floor(h / 9), 5) * 2), flick = Math.floor(ph * 12);
    if (u > 0.66 && rand(seg, flick, 7) > 1.75 - u * 1.65) continue;
    const thread = u > 0.58 && rand(seg, flick, 9) < (u - 0.58) * 3;
    const climb = ((h / 30 - ph * 3) % 1 + 1) % 1 < 0.1 ? 1 : 0, trail = gh - h > 0 && gh - h < 18 ? 1 - (gh - h) / 18 : 0;
    const X = thread ? 0 : Math.ceil(w * 1.6);
    for (let x = -X; x <= X; x++) {
      const q = Math.abs(x) / w;
      const cw = 0.2 + 0.18 * (1 - smooth(0, 0.5, u));
      let lvl = q < cw ? 0 : q < 0.47 ? 1 : q < 0.72 ? 2 : q < 1 ? 3 : 4;
      for (let s = 0; s < 3; s++) {
        const sx = (s - 1) * w * 0.55 + Math.sin(h * 0.09 + ph * TAU * (s + 1) + s * 2) * 0.9;
        if (Math.abs(x - sx) < 0.5) lvl = Math.max(0, lvl - 1);
      }
      if (rand(y, shimmer, 3) < 0.05 && lvl > 0) lvl--;
      if (q < 0.72) lvl = Math.max(0, lvl - climb - (trail > 0.3 ? 1 : 0));
      // the core and inner bands are solid light; only the fringe is dithered, and it goes first
      const a = lvl <= 2 ? 1 : ((1.55 - q) / 0.75) * fade * 1.2;
      if (a <= 0) continue;
      p.dot(x, y, thread ? (u > 0.85 ? C[6] : WHITE) : lvl === 0 ? (u > 0.8 ? C[6] : WHITE) : C[7 - lvl], a);
    }
    // light all along it: a close glow, and a wide haze that fades with the column
    const near = smooth(8, 20, h);
    if ((y & 3) === 0) p.glow(0.5, y, w * 2.6 + 6, C[5], 0.36 * near * (0.3 + 0.7 * fade) * (1 + 0.4 * beat));
    if ((y & 15) === 0) p.glow(0.5, y, 34, C[4], 0.2 * near * (0.25 + 0.75 * fade));
  }
  if (gh > 0) {
    glint(p, 0, -gh, 3.5 * (1 - gq * 0.5), C[6], 0.6);
    p.glow(0.5, -gh, 14, C[5], 0.45);
  }
  // the foot of the beam burns brightest: a small flare where it rises out of the item
  flare(p, 0.5, -5, 8 + 3 * beat + Math.sin(ph * TAU * 4) * 0.8, 0.6 + 0.4 * beat, C);
  p.glow(0.5, -16, 16, C[4], 0.12 + 0.25 * beat);
}

// motes streaming up round the beam, a few twinkling
function motes(p, C, t, T, seed) {
  cycle(t, T, 30, seed, (g) => g.range(1.0, 2.2), (age, life, r) => {
    const inner = r.chance(0.3), side = r.sign(), x0 = inner ? r.range(-3, 3) : side * r.range(4, 15), vy = r.range(22, 52) * (inner ? 1.5 : 1);
    const x = x0 + Math.sin(age * r.range(1.5, 3.5) + r.range(0, TAU)) * 1.6, y = -r.range(1, 10) - vy * age;
    const k = Math.min(1, age / 0.25, (life - age) / 0.5);
    if (k <= 0 || y < -H) return;
    if (r.chance(0.22)) {
      const tw = 0.5 + 0.5 * Math.sin(age * r.range(9, 14) + r.range(0, TAU));
      if (tw * k > 0.3) glint(p, x, y, tw > 0.75 ? 2 : 1, C[6], 0.4 * k);
      return;
    }
    p.dot(x, y, inner ? WHITE : C[6], k * 1.5);
    p.dot(x, y + 1, inner ? C[6] : C[4], k);
    p.dot(x, y + 2, C[3], k * 0.6);
    p.glow(x + 0.5, y + 0.5, 3.5, C[5], 0.35 * k);
  });
}
