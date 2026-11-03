// The rays and the white-hearted glints follow Sprite Fusion's open-source sparkle
// (https://www.spritefusion.com/pixel-art-vfx/sparkle), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rand, fly, TAU, WHITE, hex } from "../../core/index.mjs";
import { Layer, glint, blobShadow } from "./_lib.mjs";

export const meta = {
  name: "Power star",
  desc: "A fat bevelled star rocks side to side and swells on each beat, rays of light turning slowly behind it, sparks spinning off its points.",
  tags: ["pickup", "star", "power-up", "invincible", "bonus", "loop"],
  size: [88, 84],
  origin: [44, 76],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#2a1604", "#5e3208", "#a05c0c", "#e09414", "#ffc626", "#ffe866", "#fff8c4", "#ffffff"], seed: 9 },
};

const L = new Layer(44, 44), HOVER = 25, RO = 11.5, RI = 5.2, INK = hex("#1a0e04");
const BEATS = [0.25, 0.75], RAYS = 10, LA = Math.atan2(-0.8, -0.6);

// a beat: it swells fast and settles slowly
const swell = (ph) => {
  let s = 0;
  for (const b of BEATS) {
    const u = (((ph - b) % 1) + 1) % 1;
    s += Math.exp(-u * 14) * (1 - u * 2.5 > 0 ? 1 : 0);
  }
  return s;
};

// the star: five arms, each with a ridge down its middle, the two halves catching the light differently
function star(p, C, cx, cy, rot, sc) {
  L.begin(Math.floor(cx) - 21, Math.floor(cy) - 21);
  L.fill(Math.floor(cx) - 21, Math.floor(cy) - 21, Math.floor(cx) + 20, Math.floor(cy) + 20, (px, py) => {
    const dx = (px - cx) / sc, dy = (py - cy) / sc, r = Math.hypot(dx, dy);
    if (r > RO + 0.5) return 0;
    let a = Math.atan2(dy, dx) - rot + Math.PI / 2;
    a = ((a % TAU) + TAU) % TAU;
    const k = Math.floor(a / (Math.PI / 5)), half = k % 2, tip = (Math.floor(k / 2) + half) * ((2 * Math.PI) / 5);
    // inside the edge from this arm's tip to the inner corner beside it
    const tA = tip - Math.PI / 2 + rot, iA = tA + (half ? -1 : 1) * (Math.PI / 5);
    const tx = Math.cos(tA) * RO, ty = Math.sin(tA) * RO, ix = Math.cos(iA) * RI, iy = Math.sin(iA) * RI;
    const ex = ix - tx, ey = iy - ty, side = (dx - tx) * ey - (dy - ty) * ex, cside = -tx * ey + ty * ex;
    if (side * cside < 0) return 0;
    // the facet slopes down from the ridge towards the inner corner: light it by that direction
    const n = tA + (half ? -1 : 1) * (Math.PI / 2), l = Math.cos(n - LA), ridge = Math.abs(Math.sin(Math.atan2(dy, dx) - tA)) * r < 0.6;
    if (r < 1.2) return WHITE;
    const toLight = Math.cos(tA - LA);
    if (ridge) return toLight > 0.3 ? WHITE : toLight > -0.4 ? C[6] : C[5];
    return C[l > 0.6 ? 6 : l > 0.15 ? 5 : l > -0.35 ? 4 : l > -0.75 ? 3 : 2];
  });
  L.outline(INK).draw(p);
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = t / meta.duration, y = -HOVER - 1.5 * Math.sin(ph * TAU * 2), sw = swell(ph);
  blobShadow(p, 0, 9 + 2 * sw, 0.7);
  // rays turning behind it: long and short by turns, one ray's width a loop, swelling with the beat
  const spin = ph * ((TAU / RAYS) * 2);
  for (let i = 0; i < RAYS; i++) {
    const a = spin + (i * TAU) / RAYS, len = (i % 2 ? 22 : 34) * (1 + 0.18 * sw), ca = Math.cos(a), sa = Math.sin(a), w = i % 2 ? 0.06 : 0.09;
    p.shade(-len - 2, y - len - 2, len + 2, y + len + 2, (x, yy, out) => {
      const rx = x, ry = yy - y, d = rx * ca + ry * sa;
      if (d < 8 || d > len) return;
      const q = Math.abs(rx * sa - ry * ca), hw = 0.5 + d * w;
      if (q > hw + 1.5) return;
      out.l = q < hw * 0.5 ? C[6] : C[5];
      out.k = (0.32 + 0.22 * sw) * (q < hw ? 1 : 1 - (q - hw) / 1.5) * Math.pow(1 - d / len, 1.2) * Math.min(1, (d - 8) / 4);
    });
    // a fine bright line down each long ray
    if (i % 2 === 0) {
      // (clipped at the floor)
      const d0 = RO + 3, d1 = Math.min(len * 0.88, sa > 0.05 ? (-2 - y) / sa : Infinity);
      if (d1 > d0) p.line(ca * d0, y + sa * d0, ca * d1, y + sa * d1, (u) => (u < 0.35 ? C[6] : C[5]), (u) => (u < 0.5 ? 1 : 1.6 - u * 1.4) * (0.75 + 0.35 * sw));
    }
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / meta.duration, y = -HOVER - 1.5 * Math.sin(ph * TAU * 2), sw = swell(ph);
  const rot = 0.22 * Math.sin(ph * TAU), sc = 1 + 0.13 * sw;
  p.glowRing(0, y, RO * sc + 3, 13, C[4], 0.32 + 0.25 * sw);
  p.glow(0, y, 6, C[6], 0.12 + 0.2 * sw);
  star(p, C, 0, y, rot, sc);
  // on each beat a spark spins off every point
  for (const b of BEATS) {
    const age = ((((ph - b) % 1) + 1) % 1) * meta.duration;
    if (age > 0.45) continue;
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * TAU) / 5 - Math.PI / 2, sp = 70 + rand(i, b * 10, 3) * 30, tan = 35;
      const vx = Math.cos(a) * sp - Math.sin(a) * tan, vy = Math.sin(a) * sp + Math.cos(a) * tan;
      const [x, yy] = fly(Math.cos(a) * RO * sc, y + Math.sin(a) * RO * sc, vx, vy, age, 60, 4), k = 1 - age / 0.45;
      glint(p, x, yy, Math.round(2 * k), k > 0.5 ? WHITE : C[6], 0.45 * k);
    }
  }
  // specks of light winking round it, and small stars popping one after another
  const f = Math.floor(ph * 24);
  for (let i = 0; i < 18; i++) {
    if (rand(f + i * 3, i, o.seed) > 0.32) continue;
    const a = rand(i, 1, o.seed) * TAU, d = 13 + rand(i, 2, o.seed) * 20, sy = y + Math.sin(a) * d * 0.85;
    if (sy < -2) p.px(Math.cos(a) * d, sy, rand(f, i, 5) < 0.5 ? WHITE : C[6]);
  }
  for (let i = 0; i < 4; i++) {
    const life = 0.3, age = (((t - ((i + 0.3) / 4) * meta.duration) % meta.duration) + meta.duration) % meta.duration;
    if (age > life) continue;
    const a = rand(i, 7, o.seed) * TAU, d = 15 + rand(i, 8, o.seed) * 12, k = Math.sin((age / life) * Math.PI);
    glint(p, Math.cos(a) * d, y + Math.sin(a) * d * 0.85, Math.round(2.5 * k), i % 2 ? C[6] : WHITE, 0.4 * k);
  }
  // a glint on the top arm now and then
  const g = ((ph + 0.1) % 0.5) / 0.5;
  if (g < 0.14) glint(p, -2 + rot * 4, y - 6, 3 * Math.sin((g / 0.14) * Math.PI), WHITE, 0.5);
}
