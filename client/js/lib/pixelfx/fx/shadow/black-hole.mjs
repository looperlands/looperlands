// The dithered tone ramp and the brighter, bluer approaching side are adapted from Sprite Fusion's open-source
// black-hole (https://www.spritefusion.com/pixel-art-vfx/black-hole), MIT License, Copyright (c) 2026 Hugo Duprez.
import { cycle, fit, clamp, smooth, TAU, WHITE, hex, mix } from "../../core/index.mjs";
import { VOID, halo, unlight } from "./_lib.mjs";

export const meta = {
  name: "Black hole",
  desc: "A tilted disk of banded rings turns round a black hole, its far side bent up over the top and under the bottom; debris spirals in, stretches and is swallowed.",
  tags: ["shadow", "black-hole", "void", "space", "gravity", "dark", "magic", "loop"],
  size: [184, 132],
  origin: [92, 124],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: VOID, rock: ["#120d1c", "#2e2440", "#544468", "#857399"], seed: 4 },
};

// the hole's centre, its shadow, how hard it bends light; the disk's tilt (screen angle, and how open it is)
// light bent over the top left the far side's upper face, so the arch sees the disk more face-on (SI_ARCH)
const Y = -70, RS = 13.5, E = 17.5, SI = 0.25, SI_ARCH = 0.46, TILT = -0.14, D = 4;
const CT = Math.cos(TILT), ST = Math.sin(TILT);
// rings with gaps between them, inner ones hotter and turning faster (whole turns of pattern a loop)
const BANDS = [
  { r0: 18, r1: 24, n: 5, hot: 1.35, k: 0.3 },
  { r0: 26, r1: 34, n: 3, hot: 0.92, k: 1.9 },
  { r0: 35.5, r1: 46, n: 2, hot: 0.64, k: 3.7 },
  { r0: 47.5, r1: 60, n: 1, hot: 0.42, k: 5.2 },
];
const ROUT = 60;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const ICE = hex("#e4f7ff");

// brightness of the disk at a point of its plane (X across, Z away from us), banded, streaked, turning
function disk(X, Z, t) {
  const rho = Math.sqrt(X * X + Z * Z);
  for (const b of BANDS) {
    if (rho < b.r0 || rho > b.r1) continue;
    const w = (rho - b.r0) / (b.r1 - b.r0), ph = Math.atan2(Z, X) - (TAU * b.n * t) / D;
    const streak = 0.62 + 0.22 * Math.cos(7 * ph + rho * 0.8 + b.k) + 0.16 * Math.cos(13 * ph - rho * 1.6 + b.k * 2);
    const lane = 0.72 + 0.28 * Math.cos(rho * 2.3 + b.k);
    const edge = smooth(0, 0.18, w) * (1 - smooth(0.78, 1, w));
    return { I: b.hot * streak * lane * (0.35 + 0.65 * edge), dop: -X / rho };
  }
  return null;
}

// the hole and its disk, ray by ray: the near half straight in front, the far half seen through the bend
// (above the hole, and as a thin second image below it), the shadow, and the photon ring at its edge
function hole(p, C, t, pulse) {
  const RAMP = [C[1], C[2], C[3], C[4], C[5], C[6], C[7], WHITE], n = RAMP.length;
  const W = ROUT + 2, H = 42;
  p.shade(-W, Y - H, W, Y + H, (x, y, out) => {
    const dx = x, dy = y - Y, u = dx * CT + dy * ST, v = -dx * ST + dy * CT, r = Math.sqrt(u * u + v * v);
    let s = null;
    if (v > 0) s = disk(u, -v / SI, t);
    if (!s && r > RS) {
      const k = 1 - (E * E) / (r * r), bu = u * k, bv = v * k, si = k > 0 ? SI_ARCH : SI;
      if (-bv / si > 0) s = disk(bu, -bv / si, t);
    }
    if (!s || s.I < 0.06) {
      if (r < RS - 0.4) return C[0];
      if (r < RS + 0.7) {
        const a = Math.atan2(v, u), f = 0.5 + 0.5 * Math.cos(3 * a + (TAU * 2 * t) / D) + pulse * 0.4;
        out.k = 0.3;
        return f > 0.55 ? WHITE : C[7];
      }
      return;
    }
    // tone: dithered between ramp steps; the side turning toward us brighter and icier
    const I = s.I * 1.3 * (1 + 0.55 * s.dop) * (1 + 0.25 * pulse), f = clamp(I) * (n - 1);
    let i = Math.floor(f);
    if (f - i > BAYER[((Math.floor(y) & 3) << 2) | (Math.floor(x) & 3)]) i = Math.min(n - 1, i + 1);
    if (i === 0 && I < 0.12) return;
    let c = RAMP[i];
    if (s.dop > 0.35 && i >= n - 3) c = mix(c, ICE, Math.min(1, (s.dop - 0.35) * 2));
    if (s.dop < -0.4 && i >= 2 && i < n - 2) c = mix(c, C[3], 0.35);
    if (i >= n - 4 && ((Math.floor(x) + Math.floor(y)) & 1) === 0) out.k = 0.3 * Math.min(1, I - 0.35);
    return c;
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8);
  p.glow(0, -1, 44, C[4], 0.12);
  p.glow(0, Y, 80, C[4], 0.32);
  p.glow(0, Y, 46, mix(C[6], C[5], 0.5), 0.45);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), K = fit(o.rock, 4), S = o.seed;
  // a gulp as debris is swallowed, twice a loop
  const pulse = Math.max(0, Math.cos((TAU * 2 * t) / D)) ** 12;
  // pebbles torn off the floor, rising to join the disk
  cycle(t, D, 10, S + 3, (r) => r.range(1.6, 2.6), (age, L, r) => {
    const x0 = r.range(-60, 60), u = Math.pow(age / L, 1.5), tx = Math.sign(x0 || 1) * r.range(40, 56), ty = Y + r.range(4, 9);
    const x = x0 + (tx - x0) * u, y = -1 + (ty + 1) * u - Math.sin(Math.PI * u) * 10;
    p.px(x, y, u > 0.6 ? K[3] : K[2]);
    if (age < 0.25) p.disc(x0, -1.5, 2 + age * 8, K[2], 0.4 * (1 - age / 0.25));
  });
  hole(p, C, t, pulse);
  // motes streaking in from all round, turning with the disk as they fall
  cycle(t, D, 40, S + 7, (r) => r.range(0.5, 0.9), (age, L, r) => {
    const a0 = r.range(0, TAU), d0 = r.range(48, 76), q = Math.pow(age / L, 1.6), d = RS + 2 + (d0 - RS - 2) * (1 - q), a = a0 + 0.9 * q;
    const x = Math.cos(a) * d * 1.15, y = Y + Math.sin(a) * d * 0.75, q2 = Math.pow(Math.max(0, age - 0.09) / L, 1.6), d2 = RS + 2 + (d0 - RS - 2) * (1 - q2), a2 = a0 + 0.9 * q2;
    if (d < RS + 3 || y > -3 || y < -120 || Y + Math.sin(a2) * d2 * 0.75 < -120 || Math.abs(x) > 90) return;
    const col = r.pick([WHITE, C[7], C[6], C[5]]);
    p.line(Math.cos(a2) * d2 * 1.15, Y + Math.sin(a2) * d2 * 0.75, x, y, (u) => (u > 0.6 ? col : C[4]), Math.min(1, age * 6));
    p.glow(x, y, 3, col, 0.3);
  });
  // debris spiralling in: lumps of rock lit on the side toward the hole, stretched into hot streaks as they
  // fall, gone in a flash at the photon ring; behind the hole they're hidden by it
  cycle(t, D, 22, S, (r) => r.range(1.4, 2.4), (age, L, r) => {
    const ph0 = r.range(0, TAU), rho0 = r.range(58, 80), hgt = r.range(-8, 8), size = r.range(1.6, 2.8);
    const at = (aa) => {
      const q = clamp(aa / L), rho = RS + 1 + (rho0 - RS - 1) * (1 - Math.pow(q, 1.5)), ph = ph0 + 2.4 * Math.pow(q, 1.6) * (1 + 1.5 * q);
      const X = Math.cos(ph) * rho, Z = Math.sin(ph) * rho, sx = X, sy = -Z * SI + hgt * (1 - q);
      return { x: sx * CT - sy * ST, y: Y + sx * ST + sy * CT, Z, rho };
    };
    const a = at(age), b = at(age - 0.04), hidden = a.Z > 0 && Math.hypot(a.x, a.y - Y) < RS + 1;
    if (hidden) return;
    if (a.rho < RS + 3) {
      p.px(a.x, a.y, WHITE);
      p.glow(a.x, a.y, 6, C[6], 0.6);
      return;
    }
    const heat = 1 - smooth(16, 34, a.rho), len = 1 + heat * 7;
    if (heat > 0.05) {
      const dx = a.x - b.x, dy = a.y - b.y, l = Math.hypot(dx, dy) || 1;
      p.line(a.x - (dx / l) * len, a.y - (dy / l) * len, a.x, a.y, (u) => (u > 0.7 ? WHITE : u > 0.35 ? C[6] : C[4]));
      p.glow(a.x, a.y, 4, C[6], 0.4 * heat);
    } else {
      const lx = -a.x / (Math.hypot(a.x, a.y - Y) || 1), ly = -(a.y - Y) / (Math.hypot(a.x, a.y - Y) || 1);
      // a lump of rock: a fading wake along its orbit, a dark body, its face toward the hole lit violet
      const c = at(age - 0.09), d = at(age - 0.15);
      p.px(b.x, b.y, C[3]);
      p.dot(c.x, c.y, C[3], 0.7);
      p.dot(d.x, d.y, C[2], 0.5);
      const s2 = size > 2.2;
      p.px(a.x, a.y, K[2]);
      p.px(a.x + 1, a.y, K[1]);
      p.px(a.x, a.y + 1, K[1]);
      if (s2) (p.px(a.x + 1, a.y + 1, K[0]), p.px(a.x - 1, a.y, K[1]), p.px(a.x, a.y - 1, K[2]));
      p.px(a.x + Math.round(lx * 1.4), a.y + Math.round(ly * 1.4), s2 ? C[6] : C[5]);
      p.glow(a.x, a.y, 4, C[5], 0.15);
    }
  });
  halo(p, 0, Y, RS - 0.4, RS + 4, C[6], 0.35 + 0.3 * pulse);
  unlight(p, -RS, Y - RS, RS, Y + RS, (x, y) => {
    const dx = x, dy = y - Y, v = -dx * ST + dy * CT, u = dx * CT + dy * ST;
    return u * u + v * v < (RS - 0.6) ** 2 && !(v > 0 && disk(u, -v / SI, t));
  });
}
