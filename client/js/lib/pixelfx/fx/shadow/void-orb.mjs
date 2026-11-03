import { cycle, fit, clamp, smooth, ease, fbm, TAU, WHITE, mix } from "../../core/index.mjs";
import { VOID, halo, ringLight, ringFast, unlight } from "./_lib.mjs";

export const meta = {
  name: "Void orb",
  desc: "A black orb hangs in the air, a pale rim crawling round it; a dark vortex winds into it, motes and streaks are pulled in, and light bends round its edge.",
  tags: ["shadow", "void", "orb", "vortex", "dark", "magic", "loop"],
  size: [168, 160],
  origin: [84, 150],
  duration: 3.2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: VOID, seed: 5 },
};

// the orb's centre and radius, the vortex's reach, the radius light bends to (Einstein ring), the loop
// matter can't orbit inside GAP: there the dark is empty but for light bent round the orb
const Y = -62, R = 12, VR = 48, GAP = R + 9, E = R + 4.5, D = 3.2, ARMS = 3, K = 7, WIND = (TAU * 2) / D;
// two gulps a loop: the rim flares, the vortex brightens, a ring is drawn in
const GULPS = [0.2, 0.68];
const wrap = (x) => x - Math.floor(x);
const gulp = (t) => GULPS.reduce((s, g) => s + Math.exp(-((((wrap(t / D - g + 0.5) - 0.5) * D) / 0.07) ** 2)), 0);

// specks of light behind the orb on looping paths; we see them through the lens: far off, a speck; passing
// behind, smeared into an arc hugging the rim, with a faint second image on the far side
const SOURCES = [
  { cx: 0, cy: 0, rho: 6, n: 1, ph: 0, s: 2.6, sy: 0.75 },
  { cx: 1, cy: -1, rho: 8, n: -1, ph: 2.2, s: 2, sy: 0.6 },
  { cx: 18, cy: -6, rho: 24, n: 1, ph: 0.4, s: 2.4, sy: 0.7 },
  { cx: -26, cy: 10, rho: 30, n: 1, ph: 2.6, s: 2, sy: 0.55 },
  { cx: 8, cy: 22, rho: 20, n: 2, ph: 4.1, s: 1.6, sy: 0.8 },
  { cx: -12, cy: -26, rho: 34, n: 1, ph: 5.3, s: 1.8, sy: 0.6 },
  { cx: 34, cy: 18, rho: 16, n: 2, ph: 1.2, s: 1.4, sy: 0.9 },
];

// tables round the orb, built once: radius, angle, log radius, and lumpy turbulence for the vortex
let TAB = null;
function tables() {
  if (TAB) return TAB;
  const n = VR * 2, N = n * n, r = new Float32Array(N), th = new Float32Array(N), ln = new Float32Array(N), nz = new Float32Array(N);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = i - VR + 0.5, y = j - VR + 0.5, k = j * n + i, a = Math.atan2(y, x), d = Math.hypot(x, y), l = Math.log(Math.max(1, d));
      r[k] = d;
      th[k] = a;
      ln[k] = l;
      nz[k] = fbm(Math.cos(a) * 2.5 + l * 2.4, Math.sin(a) * 2.5 + l * 2.4, 17, 3);
    }
  return (TAB = { n, r, th, ln, nz });
}

// the vortex: three arms of dark dust winding inward, a dithered veil threaded with thin bright filaments that
// stream in along them faster than the arms turn, a lit leading edge, all heating to pale violet near the rim
function vortex(p, C, t, g) {
  const T = tables(), n = T.n, wf = (TAU * 12) / D;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i, r = T.r[k];
      if (r < GAP || r > VR) continue;
      const env = smooth(VR, VR * 0.42, r) * smooth(GAP, GAP + 4, r);
      const ph = ARMS * T.th[k] + K * T.ln[k] + WIND * t + T.nz[k] * 2.6, cs = Math.cos(ph);
      const A = (0.5 + 0.5 * cs) * env * (1 + 0.4 * g);
      if (A < 0.16) continue;
      const x = i - VR + 0.5, y = Y + j - VR + 0.5, hot = 1 - smooth(GAP, GAP + 16, r);
      const fil = Math.cos(12 * T.th[k] + 28 * T.ln[k] + wf * t + T.nz[k] * 1.6);
      // streams break into dashes that run inward with them
      const dash = Math.cos(9 * T.ln[k] * 2.2 + 2.2 * T.th[k] + wf * 0.75 * t);
      if (fil > 0.86 && A > 0.3 && dash > -0.55) {
        const c = hot > 0.6 ? C[7] : (hot > 0.25 || fil > 0.97) && dash > 0 ? C[6] : C[5];
        p.px(x, y, c);
        p.light(x, y, c, 0.1 + 0.2 * hot);
        continue;
      }
      // the arm's leading edge, where it turns into the light
      if (A > 0.36 && A < 0.46 && Math.sin(ph) > 0) {
        p.px(x, y, hot > 0.4 ? C[6] : C[4]);
        continue;
      }
      // the veil: translucent dark dust, denser in the arm's heart
      p.blend(x, y, A > 0.6 ? C[3] : C[2], Math.min(0.75, (A - 0.16) * 1.4));
    }
}

// what the orb's gravity does to light from behind it
function lensing(p, C, t, g) {
  // the Einstein ring itself, faint, brightening as it gulps
  for (let a = 0, st = 0.7 / E; a < TAU; a += st) {
    const f = 0.5 + 0.5 * Math.cos(5 * a - (TAU * 2 * t) / D) + 0.5 * g;
    p.px(Math.cos(a) * E, Y + Math.sin(a) * E, f > 0.85 ? C[5] : f > 0.45 ? C[4] : C[3]);
  }
  for (const s of SOURCES) {
    const q = (TAU * s.n * t) / D + s.ph, sx = s.cx + s.rho * Math.cos(q), sy = s.cy + s.rho * Math.sin(q) * s.sy;
    const b = Math.max(0.3, Math.hypot(sx, sy)), al = Math.atan2(sy, sx), root = Math.sqrt(b * b + 4 * E * E);
    const images = [[(b + root) / 2, al, 1], [(root - b) / 2, al + Math.PI, 0.55]];
    for (const [r, a0, w] of images) {
      if (r < R + 1.5) continue;
      const mag = (r / b) * w, hw = Math.min(Math.PI, (s.s * 1.6) / (2 * b)), step = 0.6 / r;
      for (let a = a0 - hw; a <= a0 + hw + 1e-6; a += step) {
        const u = hw > 0 ? Math.abs(a - a0) / hw : 0, x = Math.cos(a) * r, y = Y + Math.sin(a) * r;
        p.dot(x, y, u < 0.3 && mag > 0.8 ? WHITE : u < 0.65 ? C[7] : C[5], Math.min(1, mag * 1.4) * (1.15 - u));
        if (mag > 1.2 && u < 0.6) p.dot(x + Math.cos(a), y + Math.sin(a), C[6], 0.8);
      }
      p.glow(Math.cos(a0) * r, Y + Math.sin(a0) * r, 4 + Math.min(10, hw * r), C[6], Math.min(0.5, 0.18 * mag));
    }
  }
}

// the orb: void black, a dull glint and a crescent of reflected light inside, and a pale rim crawling round
function orb(p, C, t, g) {
  p.shade(-R - 1, Y - R - 1, R + 1, Y + R + 1, (x, y) => {
    const dx = x, dy = y - Y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > R + 0.5) return;
    const a = Math.atan2(dy, dx);
    if (d > R - 0.6) {
      const f = 0.5 * Math.cos(3 * a - (TAU * 2 * t) / D) + 0.3 * Math.cos(7 * a + (TAU * 3 * t) / D + 1) + 0.25 * Math.cos(13 * a - (TAU * 5 * t) / D + 2) + g;
      return f > 0.5 ? WHITE : f > 0.05 ? C[6] : f > -0.4 ? C[5] : C[4];
    }
    if (R - d < 1.4 && Math.cos(a - 0.8) > 0.6) return C[2];
    if ((dx + R * 0.42) ** 2 + (dy + R * 0.45) ** 2 < 1.6) return C[3];
    return C[0];
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), g = gulp(t);
  p.glow(0, -1, 52, C[4], 0.22 + 0.1 * g);
  vortex(p, C, t, g);
  lensing(p, C, t, g);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), g = gulp(t), S = o.seed;
  // dust drawn up off the floor, curving into the orb
  cycle(t, D, 14, S + 2, (r) => r.range(1.6, 2.4), (age, L, r) => {
    const x0 = r.range(-44, 44), u = Math.pow(age / L, 1.7), side = Math.sign(x0) || 1, ea = Math.PI / 2 + side * r.range(0.3, 1);
    const ex = Math.cos(ea) * R, ey = Y + Math.sin(ea) * R, mx = x0 * 0.2, my = -18 - r.range(0, 12);
    const x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * ex, y = (1 - u) * (1 - u) * -1 + 2 * (1 - u) * u * my + u * u * ey;
    if (age < 0.5) p.disc(x0, -1.5, 2 + age * 6, C[3], 0.4 * (1 - age / 0.5));
    p.dot(x, y, u > 0.6 ? C[7] : u > 0.25 ? C[6] : C[5], Math.min(1, age * 4));
    if (u > 0.3) p.glow(x, y, 3, C[5], 0.25);
  });
  // motes swirl in along the arms, faster as they fall, and spark on the rim where they're swallowed
  cycle(t, D, 30, S, (r) => r.range(1.1, 1.8), (age, L, r) => {
    let th0 = r.range(0, TAU);
    if (Math.sin(th0) > 0.75) th0 = -th0;
    const r0 = r.range(30, 64), sw = r.range(1.4, 2.6), col = r.pick([WHITE, C[7], C[6], C[6], C[5]]);
    const pos = (aa) => {
      const u = clamp(aa / L), k = Math.pow(u, 1.8), rr = R + 1 + (r0 - R - 1) * (1 - k), th = th0 - sw * (k + 0.5 * u);
      return [Math.cos(th) * rr, Y + Math.sin(th) * rr, rr];
    };
    const [x, y, rr] = pos(age), [tx, ty] = pos(age - 0.05), a = Math.min(1, age * 5);
    if (rr < R + 3) {
      p.px(x, y, WHITE);
      p.glow(x, y, 5, C[6], 0.5);
      return;
    }
    p.line(tx, ty, (tx + x) / 2, (ty + y) / 2, C[4], a * 0.8);
    p.line((tx + x) / 2, (ty + y) / 2, x, y, col, a);
    p.glow(x, y, 3, col, 0.3 * a);
  });
  // streaks: long dotted lines shot in from further out, white at the head (never from under the floor)
  cycle(t, D, 9, S + 1, 0.42, (age, L, r) => {
    let th = r.range(0, TAU);
    if (Math.sin(th) > 0.45) th = -th;
    const r0 = r.range(56, 74), u = age / L, k = (Math.exp(3 * u) - 1) / (Math.exp(3) - 1), rr = r0 - (r0 - R - 1) * k;
    const len = 2 + 10 * k, ca = Math.cos(th), sa = Math.sin(th);
    for (let d = 0; d <= len; d += 0.5) p.dot(ca * (rr + d), Y + sa * (rr + d), d < 1 ? WHITE : d < len * 0.5 ? C[6] : C[4], d < len * 0.5 ? 1 : 1.2 - d / len);
    p.glow(ca * rr, Y + sa * rr, 4, C[6], 0.4);
  });
  // a gulp draws a faint ring in after it
  for (const gp of GULPS) {
    const u = wrap(t / D - gp) / (0.4 / D);
    if (u >= 1) continue;
    const rr = R + 2 + (VR - R) * (1 - ease.inQuad(u));
    ringFast(p, 0, Y, rr, 1, C[4], 0.35 * (1 - u));
    ringLight(p, 0, Y, rr, 4, C[5], 0.3 * (1 - u));
  }
  orb(p, C, t, g);
  halo(p, 0, Y, R - 0.5, R + 7, C[6], 0.6 + 0.3 * g);
  halo(p, 0, Y, R - 0.5, R + 46, C[4], 0.38 + 0.15 * g);
  unlight(p, -R, Y - R, R, Y + R, (x, y) => x * x + (y - Y) ** 2 < (R - 0.6) ** 2);
}
