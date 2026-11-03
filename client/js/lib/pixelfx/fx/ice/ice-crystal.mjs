// A floating pickup that bobs, glints, glows and has motes circling in front and behind follows the recipe
// in Sprite Fusion's open-source pickup gem (https://www.spritefusion.com/pixel-art-vfx/pickup),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, sparkle, clamp, TAU, WHITE } from "../../core/index.mjs";

export const meta = {
  name: "Ice crystal",
  desc: "A floating ice crystal turning slowly in its own cold light: its facets brighten and darken as they turn, glints flash on them, frost motes circle it.",
  tags: ["ice", "crystal", "gem", "pickup", "float", "magic", "loop"],
  size: [96, 100],
  origin: [48, 92],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], height: 34, seed: 21 },
};

const TIP = 0.28; // how far it leans toward us, so the upper facets show
const LIGHT = norm([-0.55, -0.75, -0.45]); // toward the light: upper left, in front
function norm([x, y, z]) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

// the crystal: a hexagonal prism with a tall point above and a shorter one below, turned by th, tipped toward
// the viewer. Returns the visible faces (projected corners, brightness, glint) and the silhouette.
function crystalFaces(th, R) {
  const ct = Math.cos(TIP), st = Math.sin(TIP);
  const P = (x, y, z) => [x, y * ct - z * st, y * st + z * ct]; // tip toward the viewer (z toward us is negative)
  const ring = (y) => Array.from({ length: 6 }, (_, k) => P(Math.cos(th + (k * TAU) / 6) * R, y, Math.sin(th + (k * TAU) / 6) * R));
  const top = ring(-R * 0.45), bot = ring(R * 0.45), A = P(0, -R * 2.2, 0), Z = P(0, R * 1.7, 0);
  const faces = [];
  for (let k = 0; k < 6; k++) {
    const j = (k + 1) % 6;
    faces.push([A, top[j], top[k]], [top[k], top[j], bot[j], bot[k]], [bot[k], bot[j], Z]);
  }
  const out = [];
  for (const f of faces) {
    const [a, b, c] = f, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
    const cx = f.reduce((s, q) => s + q[0], 0) / f.length, cy = f.reduce((s, q) => s + q[1], 0) / f.length, cz = f.reduce((s, q) => s + q[2], 0) / f.length;
    if (n[0] * cx + n[1] * cy + n[2] * cz < 0) n = n.map((q) => -q); // outward
    if (n[2] >= -0.02) continue; // facing away
    const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    // a glint where the face mirrors the light toward the viewer (half way between the light and the eye)
    const h = norm([LIGHT[0], LIGHT[1], LIGHT[2] - 1]), spec = Math.max(0, n[0] * h[0] + n[1] * h[1] + n[2] * h[2]);
    out.push({ pts: f.map((q) => [q[0], q[1]]), lit, spec, cx, cy });
  }
  return out;
}

// the convex hull of a set of points (monotone chain), for the crystal's silhouette
function hullOf(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of P) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of P.reverse()) {
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop();
    hi.push(q);
  }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = t / meta.duration, bob = Math.sin(TAU * ph) * 2.5, Y = -o.height + bob;
  // its shadow on the floor, smaller and darker as it dips, and a cold pool of light
  const s = 1 - bob / 12, rx = 11 * s;
  for (let x = Math.floor(-rx); x <= rx; x++) {
    const f = 1 - (x / rx) ** 2;
    p.blend(x + 0.5, 0, C[0], 0.65 * f);
    if (Math.abs(x) < rx * 0.6) p.blend(x + 0.5, 1, C[0], 0.4 * f);
  }
  p.glow(0, -1, 24, C[4], 0.2 + 0.05 * Math.sin(TAU * ph * 2));
  motes(p, C, t, o, Y, false);
}

function motes(p, C, t, o, Y, front) {
  const D = meta.duration;
  cycle(t, D, 16, o.seed, (g) => g.range(1.6, 2.6), (age, life, r, i) => {
    const th = r.range(0, TAU) + age * r.range(1.6, 2.6), R = r.range(14, 22), y = Y + r.range(-14, 12) - age * r.range(3, 7), s = Math.sin(th), k = age / life;
    if (s >= 0 !== front) return;
    const x = Math.cos(th) * R, yy = y + s * R * 0.3, a = Math.min(1, age / 0.2) * (k > 0.75 ? (1 - k) / 0.25 : 1);
    if (front) {
      p.dot(x, yy, i % 4 === 0 ? WHITE : C[6], a);
      if (i % 4 === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, yy + dy, C[5], a);
      p.glow(x, yy, 4, C[5], 0.3 * a);
    } else p.dot(x, yy, C[4], a * 0.9);
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / meta.duration, bob = Math.sin(TAU * ph) * 2.5, Y = -o.height + bob, R = 8;
  // its own cold light
  p.glow(0, Y, 34, C[3], 0.26);
  p.glow(0, Y, 14, C[5], 0.18 + 0.08 * Math.sin(TAU * ph * 3));
  // a sixth of a turn a loop: a hexagon looks the same after it, so the loop never seams
  const faces = crystalFaces((TAU / 6) * ph, R);
  // a dark rim round the silhouette, then the facets: deep in shadow, pale toward the light, white in a glint
  const hull = hullOf(faces.flatMap((f) => f.pts));
  let mx = 0, my = 0;
  for (const [x, y] of hull) (mx += x), (my += y);
  (mx /= hull.length), (my /= hull.length);
  p.poly(hull.map(([x, y]) => { const d = Math.hypot(x - mx, y - my) || 1; return [x + ((x - mx) / d) * 1.2, y + Y + ((y - my) / d) * 1.2]; }), C[1]);
  for (const f of faces) {
    const c = f.spec > 0.985 ? WHITE : C[clamp(Math.round(1 + Math.pow(f.lit, 1.4) * 6.6), 1, 7)];
    p.poly(f.pts.map(([x, y]) => [x, y + Y]), c);
  }
  // edges: pale where two faces meet, a dark rim round the outside, a white ridge on the lit side
  for (const f of faces)
    for (let i = 0; i < f.pts.length; i++) {
      const [x0, y0] = f.pts[i], [x1, y1] = f.pts[(i + 1) % f.pts.length];
      p.line(x0, y0 + Y, x1, y1 + Y, f.lit > 0.6 ? C[7] : f.lit > 0.3 ? C[6] : C[4]);
    }
  // glints: a star flashes on a face as it turns into the light
  for (const f of faces) if (f.spec > 0.96) sparkle(p, f.cx, f.cy + Y, Math.round(2 + (f.spec - 0.96) * 150), C[6], C[4], 0.5);
  // a glint at the tip now and then
  const g = (ph * 2) % 1;
  if (g < 0.12) sparkle(p, 0, Y - R * 2.2 * Math.cos(TIP), Math.round(5 * Math.sin((g / 0.12) * Math.PI)), C[6], C[4], 0.6);
  motes(p, C, t, o, Y, true);
}
