// The bead swelling at the tip and the falling drop's tail follow Sprite Fusion's open-source blood
// (https://www.spritefusion.com/pixel-art-vfx/blood), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, smooth, ease, TAU, WHITE } from "../../core/index.mjs";
import { WATER, bead, ring, rock } from "./_lib.mjs";

export const meta = {
  name: "Drip",
  desc: "A bead swells under a wet stone tip and catches the light, pinches off, falls stretched by its speed and plinks into a puddle with a crown, a ring and a tiny rebound.",
  tags: ["water", "drip", "drop", "puddle", "cave", "ambient", "loop"],
  size: [72, 88],
  origin: [36, 78],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, height: 62, source: true, seed: 1 },
};

const D = meta.duration, SY = 0.28, G = 760, LET = 0.78, PRX = 20;

// the stone the water gathers on: a lump of ceiling rock tapering to a dripstone point, lit on its left, a dark
// rim, a wet streak running down to the point
function dripstone(p, H) {
  const ST = rock(), top = -H - 14;
  p.shade(-24, top, 22, -H + 0.5, (x, y, out) => {
    // a ragged underside of ceiling rock that hangs down into a short dripstone, its point at x = 0
    const under = top + 7 + Math.sin(x * 0.45) * 1.2 + Math.sin(x * 1.3 + 1) * 0.6 - Math.abs(x + 4) * 0.12, cone = -H - Math.abs(x) * 1.25;
    const bottom = Math.max(under, Math.min(cone, -H)), span = x < 0 ? 24 : 22;
    if (y > bottom || Math.abs(x) > span - Math.max(0, top + 3 - y) * 4) return;
    const rim = y > bottom - 1 || Math.abs(x) > span - 1, lx = (x + 24) / 46, v = (y - top) / 14;
    out.c = rim ? ST[0] : v < 0.25 ? ST[1] : y > under && Math.abs(x) < 6 ? (x < 0 ? ST[4] : ST[2]) : lx < 0.3 ? ST[4] : lx < 0.62 ? ST[3] : ST[2];
    if (!rim && Math.abs(x - 9 - (y - top) * 0.4) < 0.5 && v > 0.3 && v < 0.7) out.c = ST[0];
  });
  // a wet streak down to the point, catching the light
  for (let y = -H - 7; y < -H; y++) p.px(-1, y, y > -H - 3 ? C_WET[1] : C_WET[0]);
  p.px(-1, -H - 2, WHITE);
}
const C_WET = ["#5d6a86", "#9fb6d6"].map((h) => parseInt(h.slice(1, 3), 16) | (parseInt(h.slice(3, 5), 16) << 8) | (parseInt(h.slice(5, 7), 16) << 16) | 0xff000000);

// the puddle: dark see-through water with a lit far edge, the drop's light in it
function puddle(p, C) {
  const ry = PRX * SY;
  for (let Y = Math.floor(-ry); Y < ry; Y++)
    for (let X = -PRX; X < PRX; X++) {
      const x = X + 0.5, y = Y + 0.5, d = (x / PRX) ** 2 + (y / ry) ** 2;
      if (d > 1) continue;
      p.blend(x, y, C[1], 0.72 * Math.min(1, (1 - d) * 5));
    }
  // the far edge catches the light in one fine line
  for (let X = -PRX + 3; X < PRX - 3; X++) {
    const x = X + 0.5, y = -Math.sqrt(1 - (x / PRX) ** 2) * ry;
    p.dot(x, y + 0.5, Math.abs(x) < PRX * 0.5 ? C[4] : C[3], 0.95);
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8);
  puddle(p, C);
  const u = t - landAt(o.height);
  if (u >= 0) ring(p, 0, 0, 2 + 17 * ease.outCubic(u / 0.75), SY, 1.1 * (1 - u / 0.75), C, { n: 2, gap: 2.5, half: -1, seed: 1, wob: 0.4 });
  const v = t - landAt(o.height) - REBOUND - BACK;
  if (v >= 0) ring(p, 0, 0, 1.5 + 9 * ease.outCubic(v / 0.5), SY, 0.9 * (1 - v / 0.5), C, { n: 1, half: -1, seed: 2 });
}

const landAt = (H) => LET + Math.sqrt((2 * H) / G);
const REBOUND = 0.06, BACK = 0.2;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), H = o.height, land = landAt(H);
  if (o.source) dripstone(p, H);
  // the bead swells at the tip, wobbling, and catches the light; its neck stretches before it lets go
  if (t < LET) {
    const k = t / LET, r = 0.7 + 2.3 * ease.inQuad(k), wob = 0.15 * Math.sin(t * 26) * k, neck = smooth(0.82, 1, k) * 2.5;
    const cy = -H + r + neck;
    if (neck > 0.2) p.line(0, -H, 0, cy - r, C[5]);
    p.ellipse(0, cy, r * (1 - wob), r * (1 + wob) + 0.3 * k, (d, a) => (d > 0.72 ? (Math.cos(a) < 0 && Math.sin(a) < 0.3 ? C[5] : C[3]) : d < 0.35 && Math.cos(a) > 0 ? C[6] : C[4]));
    if (r > 1) p.px(-r * 0.4, cy - r * 0.45, WHITE);
    p.glow(0, cy, 4 + r * 2, C[5], 0.14 + 0.14 * k);
  } else {
    // a little of it springs back up the tip after it lets go
    const s = (t - LET) / 0.15;
    if (s < 1) p.ellipse(0, -H + 0.8, 1.2 * (1 - s * 0.6), 1 + Math.sin(s * Math.PI) * 0.8, C[4]);
  }
  // the fall, stretched by its speed
  const f = t - LET;
  if (f > 0 && t < land) {
    const y = -H + 3 + 0.5 * G * f * f, vy = G * f;
    bead(p, 0, y, 0, vy, 3, C);
    p.glow(0, y, 6, C[5], 0.2);
  }
  // the plink: a white fleck, a little crown thrown up, the near half of the ring, light
  const u = t - land;
  if (u >= 0) {
    ring(p, 0, 0, 2 + 17 * ease.outCubic(u / 0.75), SY, 1.1 * (1 - u / 0.75), C, { n: 2, gap: 2.5, half: 1, hot: u < 0.08, seed: 1, wob: 0.4, glint: u < 0.5 ? 1 - u * 2 : 0 });
    if (u < 0.06) {
      p.px(0, 0, WHITE);
      p.px(-1, 0, C[6]);
      p.px(1, 0, C[6]);
      p.glow(0, -1, 10, C[5], 0.5 * (1 - u / 0.06));
    }
    // the crown: three flecks thrown out and back
    for (const [vx, vh] of [[-26, 70], [24, 64], [-6, 90]]) {
      const h = vh * u - 0.5 * G * u * u;
      if (h > 0 && u < 0.3) p.px(vx * u, -h, u < 0.1 ? WHITE : C[6]);
    }
    // the rebound: a bead pops up out of the middle and drops back
    const r = u - REBOUND, h = 52 * r - 0.5 * G * 0.5 * r * r * 2;
    if (r > 0 && h > 0) {
      p.line(0, -1, 0, -h + 1, C[5]);
      p.circle(0, -h, 1.1, C[6]);
      p.px(0, -h - 1, WHITE);
    }
    const v = u - REBOUND - BACK;
    if (v >= 0) ring(p, 0, 0, 1.5 + 9 * ease.outCubic(v / 0.5), SY, 0.9 * (1 - v / 0.5), C, { n: 1, half: 1, seed: 2, hot: v < 0.06 });
    p.glow(0, 0, 18, C[4], 0.22 * (1 - clamp(u / 0.6)));
  }
  // the tip and the drop shimmer in the puddle
  const sh = Math.sin(t * 20) > 0 ? 0 : 1;
  p.px(-1 + sh, 2, C[4]);
  if (f > 0 && t < land) {
    const ry = 2 + 0.5 * G * f * f * 0.04;
    p.px(sh, Math.min(4, ry), C[5]);
  }
  // the wet light under the tip and in the puddle
  p.glow(0, -H + 2, 8, C[5], 0.16);
  p.glow(0, 0, 26, C[3], 0.14);
}
