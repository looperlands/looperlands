// The bubbles (lit and shaded rims, a highlight, a dotted pop) follow Sprite Fusion's open-source bubbles
// (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rand, cycle, TAU, WHITE, hex, mix, scale } from "../../core/index.mjs";
import { Layer, blobShadow, glint, pool } from "./_lib.mjs";

export const meta = {
  name: "Potion",
  desc: "A round glass flask of glowing brew rocks in the air: the brew sloshes behind the rock, bubbles rise and pop, light glows through the glass, wisps curl off the cork.",
  tags: ["pickup", "potion", "flask", "brew", "magic", "loop"],
  size: [56, 72],
  origin: [28, 64],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#1a0516", "#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"], seed: 5 },
};

const RB = 7, HOVER = 17, NECK = 2, LIP = -12, CORK_TOP = -16;
const INK = hex("#120d1a"), GLASS = hex("#2a2236");
const CORK = ["#2a160c", "#4e2c16", "#7a4a26", "#a8703a", "#d09a5a"].map(hex);
const L = new Layer(40, 44);

// the flask hovers and rocks; the brew's surface stays level in the world and lags behind the rock
const pose = (ph) => ({ y: -HOVER - 1.4 * Math.sin(ph * TAU), tilt: 0.13 * Math.sin(ph * TAU + 0.4) });
const surface = (x, ph) => -0.5 + 0.17 * Math.sin(ph * TAU - 0.9) * x + 0.45 * Math.sin(x * 0.85 + ph * TAU * 3);

function flask(p, C, t, ph, cy, tilt, seed) {
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  L.begin(-20, Math.floor(cy) - 22);
  L.fill(-20, Math.floor(cy) - 22, 19, Math.floor(cy) + 12, (px, py) => {
    const wx = px, wy = py - cy, fx = wx * ct + wy * st, fy = -wx * st + wy * ct, d = Math.hypot(fx, fy);
    // the cork, the lip, the neck and the bulb, in the flask's own frame
    if (fy < LIP - 0.5 && fy >= CORK_TOP && Math.abs(fx) <= NECK + 0.2) return CORK[fy < CORK_TOP + 1 ? 4 : fx < -0.6 ? 3 : fx > 1 ? 1 : 2];
    if (fy >= LIP - 0.5 && fy < LIP + 1 && Math.abs(fx) <= NECK + 1.4) return fx < 0 ? mix(WHITE, C[6], 0.4) : mix(GLASS, C[5], 0.45);
    const inNeck = fy >= LIP + 1 && fy < -RB + 2 && Math.abs(fx) <= NECK + 0.6;
    if (d > RB && !inNeck) return 0;
    const wall = inNeck ? Math.abs(fx) > NECK - 0.5 : d > RB - 1;
    // the brew: below its sloshing surface, glowing from within, a bright skin on top
    const s = surface(wx, ph), depth = wy - s;
    if (!wall && !inNeck && depth > 0) {
      // dark at the bottom and the edges, a lit heart, a bright skin with a sheen on its left
      const core = 1 - Math.hypot(wx * 0.85, wy - 1.8) / RB;
      if (depth < 0.9) return wx < -1.5 && wx > -4.5 ? WHITE : C[6];
      let k = core > 0.62 ? 5 : core > 0.38 ? 4 : core > 0.18 ? 3 : 2;
      if (depth < 1.9 && k < 5) k++;
      if (wx > 1.5 && wy > 2) k--;
      return C[Math.max(2, Math.min(6, k))];
    }
    if (wall) {
      // the glass: catching light on its left, showing the brew through its lower half
      const lit = (-fx * 0.75 - fy * 0.66) / Math.max(1, d);
      if (inNeck) return fx < 0 ? mix(GLASS, C[6], 0.55) : mix(GLASS, C[5], 0.3);
      if (lit > 0.82) return mix(WHITE, C[6], 0.3);
      if (lit > 0.3) return mix(GLASS, C[6], 0.5);
      return depth > 0 ? C[3] : mix(GLASS, C[5], 0.28);
    }
    // empty glass above the brew
    return GLASS;
  });
  L.outline(INK).draw(p);
  // a curved streak of light on the glass, and a pin-point
  for (let a = 3.45; a < 4.35; a += 0.04) {
    const lx = Math.cos(a + tilt) * (RB - 2.2), ly = Math.sin(a + tilt) * (RB - 2.2);
    p.px(lx, cy + ly, a > 3.7 && a < 4.1 ? WHITE : mix(WHITE, C[6], 0.5));
  }
  p.px(Math.round(2 * Math.cos(tilt) + 3 * Math.sin(tilt)), Math.round(cy - 3), WHITE);
  // bubbles rising through the brew and popping at its surface
  cycle(t, meta.duration, 10, seed, (g) => g.range(0.7, 1.3), (age, life, r) => {
    const x0 = r.range(-4, 4), r0 = r.range(0.6, 1.7), vy = r.range(7, 13);
    const x = x0 + Math.sin(age * r.range(5, 9) + r.range(0, TAU)) * 0.7, y = cy + 5.5 - vy * age, ph2 = (t + age) / meta.duration;
    const top = cy + surface(x, ph2);
    if (y > top + 0.8) {
      const rr = r0 * (0.7 + 0.5 * (age / life));
      if (Math.hypot(x, y - cy) > RB - 1.5) return;
      if (rr < 0.95) p.px(x, y, C[6]);
      else {
        p.px(x, y, C[3]), p.px(x + 1, y, C[6]), p.px(x, y - 1, WHITE), p.px(x + 1, y - 1, C[6]);
        if (rr > 1.4) p.px(x - 1, y, C[5]), p.px(x, y + 1, C[4]);
      }
      p.glow(x + 0.5, y, 3, C[6], 0.15);
    } else {
      // the pop: a little arc of light and two flecks thrown up
      const k = clamp((top + 0.8 - y) / 3);
      if (k >= 1) return;
      for (let a = Math.PI; a < TAU; a += 0.6) p.dot(x + Math.cos(a) * (1 + k * 2), top - 0.5 + Math.sin(a) * (1 + k * 2) * 0.5, k < 0.5 ? WHITE : C[6], 1.2 - k);
      p.dot(x - 1, top - 1.5 - k * 3, C[6], 1 - k), p.dot(x + 1.5, top - 2 - k * 4, WHITE, 1 - k);
    }
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = t / meta.duration, { y } = pose(ph);
  blobShadow(p, 0, 7.5, 0.8 - (-y - HOVER + 1.4) * 0.06);
  // light thrown on the floor through the brew
  pool(p, 0, 0.5, 18, 3, C[5], 0.3);
  // wisps curling up off the cork: thin trails of light that sway wider as they rise and fade
  cycle(t, meta.duration, 7, o.seed + 1, (g) => g.range(1.2, 1.8), (age, life, r) => {
    const side = r.sign(), f = r.range(3, 4.5), ph0 = r.range(0, TAU), vy = r.range(11, 16), x0 = r.range(-1, 1);
    const at = (a) => [x0 + Math.sin(a * f + ph0) * (0.8 + a * 3.2) * side, y + CORK_TOP - 1 - a * vy];
    for (let i = 0; i < 9; i++) {
      const a = age - i * 0.04;
      if (a < 0) break;
      const [x, yy] = at(a), k = (1 - a / life) * Math.min(1, a / 0.15) * (1 - i / 9);
      p.dot(x, yy, i === 0 ? WHITE : i < 3 ? C[6] : C[5], k * 1.4);
      if (i === 0) p.glow(x, yy, 4, C[5], 0.3 * k);
    }
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / meta.duration, { y, tilt } = pose(ph);
  // the brew glows through the glass
  p.glow(0, y + 1.5, 26, C[4], 0.22);
  flask(p, C, t, ph, y, tilt, o.seed);
  p.glow(0, y + 2, 10, C[5], 0.38 + 0.08 * Math.sin(ph * TAU * 2));
  // a glint on the glass now and then
  const g = ((ph + 0.2) % 0.5) / 0.5;
  if (g < 0.16) glint(p, -4, y - 4, 2.6 * Math.sin((g / 0.16) * Math.PI), WHITE, 0.4);
}
