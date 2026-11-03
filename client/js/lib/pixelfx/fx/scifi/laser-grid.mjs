// The beam's build (the ramp across it, a hot core, light along it) is adapted from Sprite Fusion's open-source
// energy beam (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { P, Rng, fit, sparkle, tileFbm, clamp, lerp, rand, hex, mix, TAU, WHITE } from "../../core/index.mjs";
import { Ghosts } from "./_lib.mjs";

export const meta = {
  name: "Laser grid",
  desc: "Security lasers between two steel posts: red beams slide and scissor across, dust and haze light up only where they cut through, and the floor sweepers scorch and spark.",
  tags: ["scifi", "laser", "security", "trap", "hazard", "beam", "ground", "loop"],
  size: [128, 84],
  origin: [64, 76],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1a0408", "#4a0a12", "#8a1020", "#d01c2a", "#ff4a4a", "#ff9a90", "#ffe4e0", "#ffffff"],
    metal: ["#0e0d14", "#1e1c27", "#312e3e", "#4b4759", "#6f6a82", "#9d98b0"],
    seed: 31,
  },
};

const D = meta.duration, PX = 48, TOP = -64, IN = PX - 4; // posts at ±PX, TOP high; beams leave their inner faces
// the sliding beams: [middle height, swing, sweeps a loop, phase]
const SLIDE = [[-14, 8, 1, 0], [-31, 12, 2, 1.3], [-48, 9, 1, 3.6]];
// the sweepers: from each post's head down to a spot on the floor that runs to and fro
const sweepX = (t, s) => s * (34 - 68 * (0.5 - 0.5 * Math.cos(TAU * (t / D) + (s > 0 ? 0 : 1.9))));
const slideY = (t, [y, a, n, f]) => y + a * Math.sin(TAU * n * (t / D) + f);

function beams(t) {
  const out = SLIDE.map((b) => [-IN, slideY(t, b), IN, slideY(t, b)]);
  for (const s of [-1, 1]) out.push([s * IN, TOP + 6, sweepX(t, s), 0]);
  return out;
}

// a laser: a white-hot core, a red body either side, a dithered fringe, haze lighting up along it
function laser(p, b, C, t, seed) {
  const [x0, y0, x1, y1] = b, steep = Math.abs(y1 - y0) > Math.abs(x1 - x0), ox = steep ? 1 : 0, oy = steep ? 0 : 1;
  for (const s of [-1, 1]) p.line(x0 + s * ox, y0 + s * oy, x1 + s * ox, y1 + s * oy, s < 0 ? C[4] : C[3]);
  p.line(x0, y0, x1, y1, (u) => ((((u * 5 - t * 3) % 1) + 1) % 1 < 0.12 ? C[6] : WHITE));
  // the haze it passes through scatters its light, so its glow is uneven and drifts
  const L = Math.hypot(x1 - x0, y1 - y0);
  for (let d = 0; d <= L; d += 5) {
    const x = lerp(x0, x1, d / L), y = lerp(y0, y1, d / L), h = 0.5 + 0.5 * tileFbm(x / 14 + (t / D) * 4, y / 10, 4, 0, seed);
    p.glow(x, y, 6 + 4 * h, C[3], 0.14 + 0.3 * h * h);
  }
}

// where two beams cross, if they do
function cross(a, b) {
  const [x1, y1, x2, y2] = a, [x3, y3, x4, y4] = b, d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(d) < 1e-6) return null;
  const u = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d, v = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [x1 + u * (x2 - x1), y1 + u * (y2 - y1)] : null;
}
function near(b, x, y) {
  const [x0, y0, x1, y1] = b, dx = x1 - x0, dy = y1 - y0, u = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)), ex = x0 + dx * u - x, ey = y0 + dy * u - y;
  return Math.sqrt(ex * ex + ey * ey);
}

// a steel post: a lit edge, a shaded side, a groove the emitters ride in, red light where the beams meet it
function post(p, s, H, C, t) {
  const x0 = s * PX - 4, B = SLIDE.map((b) => slideY(t, b));
  for (let y = TOP + 4; y < 0; y++) {
    const glint = Math.max(...B.map((by) => Math.exp(-(((y - by) / 2.5) ** 2))));
    for (let i = 0; i < 8; i++) {
      const x = x0 + i, inner = s < 0 ? i >= 6 : i <= 1;
      let c = i === 0 || i === 7 ? H[0] : i === 1 ? H[4] : i === 2 ? H[3] : i === 4 ? H[1] : i === 6 ? H[2] : H[3];
      if (inner && i !== 0 && i !== 7 && glint > 0.35) c = glint > 0.75 ? C[5] : C[3];
      p.px(x, y, c);
    }
  }
  // bolts down the post, the head with its lens, the foot plate
  for (let y = TOP + 12; y < -4; y += 9) p.px(x0 + 3, y, H[5]);
  for (let y = TOP; y < TOP + 10; y++)
    for (let i = -1; i < 9; i++) p.px(x0 + i, y, i === -1 || i === 8 || y === TOP || y === TOP + 9 ? H[0] : y === TOP + 1 ? H[5] : i < 3 ? H[4] : H[2]);
  p.px(s * IN, TOP + 6, WHITE);
  p.px(s * IN, TOP + 5, C[5]);
  p.px(s * IN, TOP + 7, C[4]);
  for (let i = -3; i < 11; i++) p.px(x0 + i, -2, i === -3 || i === 10 ? H[0] : H[4]), p.px(x0 + i, -1, i === -3 || i === 10 ? H[0] : H[2]), p.px(x0 + i, 0, H[1]);
  // a carriage for each sliding beam, riding the groove
  for (const by of B) {
    const y = Math.round(by);
    for (let j = -2; j <= 2; j++)
      for (let i = 0; i < 4; i++) p.px(s < 0 ? x0 + 5 + i : x0 - 1 + i, y + j, Math.abs(j) === 2 || i === (s < 0 ? 3 : 0) ? H[0] : j < 0 ? H[5] : H[3]);
    p.px(s * IN, y, WHITE);
    p.glow(s * IN, y, 7, C[4], 0.55);
  }
  p.glow(s * IN, TOP + 6, 8, C[4], 0.55);
}

const cache = new Map();
function ghosts(o, C) {
  const key = `${o.seed}:${o.palette.join()}`;
  if (cache.has(key)) return cache.get(key);
  const rn = new Rng(o.seed), g = new Ghosts(D, { ground: () => 0, sparks: [WHITE, C[6], C[4], C[3]], box: [-62, -80, 62, 7] });
  // the sweepers kick up sparks and wisps of smoke where they burn the floor
  for (let i = 0; i < 36; i++) {
    const tb = (i / 36) * D + rn.range(0, 0.05), s = i % 2 ? 1 : -1, x = sweepX(tb, s), dir = Math.sign(sweepX(tb + 0.02, s) - x) || 1, a = -Math.PI / 2 - dir * rn.range(0.2, 1.1);
    g.add(tb, P.SPARK, x, -1, Math.cos(a) * rn.range(50, 140), Math.sin(a) * rn.range(50, 140), rn.range(0.2, 0.45));
    if (i % 4 === 0) g.add(tb, P.SMOKE, x, -2, rn.range(-4, 4), -rn.range(6, 14), rn.range(0.8, 1.2), hex("#3a2a30"), rn.range(1.6, 2.4));
  }
  cache.set(key, g);
  return g;
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), H = fit(o.metal, 6), B = beams(t), S = o.seed;
  // the floor where the sweepers have just been: a scorch that cools from white to deep red
  for (const s of [-1, 1])
    for (let k = 0; k < 14; k++) {
      const ago = k * 0.025, x = sweepX(t - ago, s), c = k < 2 ? WHITE : k < 5 ? C[6] : k < 9 ? C[4] : C[3];
      p.dot(x, 0, c, 1 - k / 14);
      p.dot(x, 1, C[3], 0.6 - k / 24);
    }
  // a low red pool on the floor under it all
  for (let x = -40; x <= 40; x += 20) p.glow(x, -2, 20, C[3], 0.12);
  // haze hanging in the air, thickest low down, seen only where a beam passes through it and lights it red
  const ph = t / D;
  for (let y = -60; y < 0; y++)
    for (let x = -IN + 1; x < IN; x++) {
      let d = 99;
      for (const b of B) d = Math.min(d, near(b, x + 0.5, y + 0.5));
      if (d > 11) continue;
      const low = 0.35 + 0.65 * clamp((y + 60) / 50), n = 0.5 + 0.5 * tileFbm((x + 0.5) / 18 + ph * 3, (y + 0.5) / 7 + 0.4 * Math.sin(TAU * ph), 3, 0, S + 7, 2), dens = clamp((n - 0.42) * 2.2) * low;
      if (dens <= 0.02) continue;
      const lit = Math.exp(-d / 4.5);
      p.blend(x + 0.5, y + 0.5, lit > 0.5 ? C[4] : lit > 0.15 ? C[3] : C[1], dens * 0.8 * lit);
    }
  for (const s of [-1, 1]) post(p, s, H, C, t);
  for (const b of B) laser(p, b, C, t, S);
  // dust and haze motes, invisible until a beam catches them
  for (let i = 0; i < 90; i++) {
    const x = (rand(S, i) * 2 - 1) * (IN - 3) + 4 * Math.sin(TAU * (t / D) + i), y = -2 - rand(S, i, 1) * 62 + 3 * Math.sin(TAU * 2 * (t / D) + i * 1.7);
    let d = 9;
    for (const b of B) d = Math.min(d, near(b, x, y));
    if (d < 1.6) {
      p.px(x, y, d < 0.9 ? WHITE : C[6]);
      p.glow(x, y, 3, C[5], 0.45);
    }
  }
  // where beams cross, the haze between them flares
  for (let i = 0; i < B.length; i++)
    for (let j = i + 1; j < B.length; j++) {
      const c = cross(B[i], B[j]);
      if (!c) continue;
      p.glow(c[0], c[1], 9, C[5], 0.4);
      sparkle(p, c[0], c[1], 2, C[6], C[5], 0.3);
    }
  // the sweepers' hot spots on the floor
  for (const s of [-1, 1]) {
    const x = sweepX(t, s);
    p.px(x, -1, WHITE);
    p.px(x - 1, 0, C[6]);
    p.px(x + 1, 0, C[6]);
    p.glow(x, -1, 10, C[4], 0.55);
    p.glow(x, -1, 4, WHITE, 0.35);
  }
  ghosts(o, C).at(t).draw(p);
}
