// The re-struck filaments, the glass shell with its specular arc and the core follow Sprite Fusion's open-source
// energy orb (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rng, TAU, WHITE, hex, mix, loopNoise } from "../../core/index.mjs";

export const meta = {
  name: "Plasma ball",
  desc: "A glass globe on a dark pedestal: wandering plasma tendrils reach from the core to the glass and fan out in bright feet where they touch it, lighting the stand and floor.",
  tags: ["lightning", "electric", "plasma", "lamp", "prop", "loop"],
  size: [112, 104],
  origin: [56, 96],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#1a0828", "#3b0f5e", "#6a1d9c", "#a03ad6", "#d46cf2", "#f2a8ff", "#ffe2ff", "#ffffff"], tendrils: 9, seed: 6 },
};

const FPS = 30, N = 90, GX = 0, GY = -55, RG = 24, BASE = ["#0d0b12", "#17131f", "#231d2d", "#342b43", "#4b3f60", "#6b5c87"].map(hex);

// a tendril at phase ph: its end wanders over the glass, front ones end on the near face, back ones on the far
function tendril(i, n, ph, seed) {
  const a = ((i + 0.5) / n) * TAU + 0.9 * loopNoise(ph, 0.9, seed + i * 7), z = loopNoise(ph, 0.7, seed + i * 7 + 3);
  const rho = RG * (0.72 + 0.28 * Math.sqrt(1 - Math.min(1, z * z * 1.6)));
  return { a, front: z > -0.15, ex: GX + Math.cos(a) * rho, ey: GY + Math.sin(a) * rho, rim: rho > RG * 0.93, w1: loopNoise(ph, 1.1, seed + i * 7 + 5), w2: loopNoise(ph, 1.3, seed + i * 7 + 6) };
}

// the pedestal: a flared stand lit from above by the globe, a collar under the glass
function pedestal(p, C, glow) {
  p.shade(-18, -32, 18, 0, (x, y, o) => {
    const hw = y < -27 ? 7 : y < -2 ? 9 + ((y + 27) / 25) * 6 : 16;
    if (Math.abs(x) > hw) return;
    const u = (x / hw + 1) / 2;
    if (y < -27) return (o.c = y < -30 ? (u < 0.6 ? C[4] : BASE[5]) : u < 0.3 ? BASE[5] : u < 0.75 ? BASE[3] : BASE[1]);
    if (y >= -2) return (o.c = y < -1 ? (u < 0.55 ? BASE[4] : BASE[2]) : BASE[1]);
    // glossy body: a lit flank, a specular stripe, the far side in shadow, plasma light on the upper rim
    const i = u < 0.1 ? 2 : u < 0.2 ? 3 : u < 0.3 ? 5 : u < 0.42 ? 4 : u < 0.6 ? 3 : u < 0.8 ? 2 : u < 0.92 ? 1 : 0;
    o.c = y < -24 && u < 0.5 ? mix(BASE[i], C[4], 0.3 * glow) : y > -5 ? BASE[Math.max(0, i - 1)] : BASE[i];
  });
  p.px(9, -9, C[5]);
  p.glow(9, -9, 3, C[5], 0.5);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), f = Math.floor(t * FPS + 1e-6) % N, ph = f / N, n = o.tendrils, R = rng(o.seed, 3, f);
  const pulse = 0.85 + 0.15 * Math.sin(ph * TAU * 6) + 0.1 * (R.next() - 0.5), ts = Array.from({ length: n }, (_, i) => tendril(i, n, ph, o.seed));
  // light the floor and the stand, then the stand
  p.glow(0, -6, 52, C[3], 0.22 * pulse);
  pedestal(p, C, pulse);
  // the glass: a faint tint over what's behind, the plasma's glow inside it
  p.shade(GX - RG, GY - RG, GX + RG, GY + RG, (x, y) => {
    const d = Math.hypot(x - GX, y - GY);
    if (d < RG - 0.5) p.blend(x, y, d > RG - 4 ? C[1] : C[0], 0.22 + 0.4 * (d / RG) ** 4);
  });
  p.glow(GX, GY, RG + 14, C[3], 0.32 * pulse);
  p.glowRing(GX, GY, RG - 1, 5, C[3], 0.22 * pulse);
  const drawTendril = (q, i, bright) => {
    const sx = GX + Math.cos(q.a) * 4.5, sy = GY + Math.sin(q.a) * 4.5, dx = q.ex - sx, dy = q.ey - sy, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const r = rng(o.seed, 17, i, f), pts = [], m = Math.max(4, Math.round(L / 2.2));
    for (let j = 0; j <= m; j++) {
      const u = j / m, w = 3.2 * q.w1 * Math.sin(Math.PI * u) + 1.6 * q.w2 * Math.sin(TAU * u + i), jit = j && j < m ? r.range(-0.7, 0.7) : 0;
      pts.push([sx + dx * u + nx * (w + jit), sy + dy * u + ny * (w + jit)]);
    }
    // the foot: the filament fans into short fingers where it meets the glass
    const paths = [{ pts, w: 1 }];
    for (let k = 0; k < 3; k++) {
      const [bx, by] = pts[m - 2], a = q.a + (k - 1) * r.range(0.25, 0.45), l = r.range(2.5, 5);
      paths.push({ pts: [[bx, by], [bx + Math.cos(a) * l * 0.5 + r.range(-0.6, 0.6), by + Math.sin(a) * l * 0.5 + r.range(-0.6, 0.6)], [bx + Math.cos(a) * l, by + Math.sin(a) * l]], w: 0.5 });
    }
    const hot = r.next() < 0.2;
    for (const q2 of paths)
      for (let j = 0; j < q2.pts.length - 1; j++) {
        const [ax, ay] = q2.pts[j], [bx, by] = q2.pts[j + 1], u = j / (q2.pts.length - 1);
        if (bright && q2.w >= 1) p.line(ax + 1, ay + 1, bx + 1, by + 1, C[3]);
        const c = !bright ? (q2.w >= 1 ? C[3] : C[2]) : q2.w < 1 ? C[6] : hot || u > 0.75 ? C[6] : u < 0.2 ? C[6] : C[5];
        p.line(ax, ay, bx, by, c);
        if (q2.w >= 1 && j % 3 === 0) p.glow(ax, ay, bright ? 6 : 4, C[4], bright ? (hot ? 0.4 : 0.24) : 0.12);
      }
    // where it touches, the glass flares
    if (bright) {
      p.circle(q.ex, q.ey, 1.6, C[6]);
      p.px(q.ex, q.ey, WHITE);
      p.glow(q.ex, q.ey, 9, C[5], 0.55);
      if (q.rim) for (let s = -1; s <= 1; s += 2) p.px(GX + Math.cos(q.a + s * 0.09) * (RG - 0.5), GY + Math.sin(q.a + s * 0.09) * (RG - 0.5), C[6]);
    } else p.glow(q.ex, q.ey, 6, C[4], 0.25);
  };
  ts.forEach((q, i) => !q.front && drawTendril(q, i, false));
  // the core: an electrode ball, pulsing
  const cr = 3.6 + 0.5 * pulse;
  p.circle(GX, GY, cr + 1.3, C[3]);
  p.circle(GX, GY, cr, C[5]);
  p.circle(GX - 0.6, GY - 0.6, cr * 0.55, C[6]);
  p.circle(GX - 0.8, GY - 0.8, cr * 0.25, WHITE);
  p.glow(GX, GY, 16, C[5], 0.65 * pulse);
  ts.forEach((q, i) => q.front && drawTendril(q, i, true));
  // the glass shell: a thin rim, a bright specular arc upper left, a faint reflection lower right
  p.ring(GX, GY, RG + 1.6, 1, C[1]);
  p.ring(GX, GY, RG + 0.6, 1.1, (v, a) => (a > 2.2 && a < 3.3 ? C[5] : a > 0.3 && a < 1.3 ? C[4] : C[3]));
  p.arc(GX, GY, RG - 1.6, 1.3, 3.55, 4.55, (u) => (u > 0.25 && u < 0.7 ? WHITE : C[6]));
  for (let a = 0.35; a < 1.15; a += 0.045) p.dot(GX + Math.cos(a) * (RG - 2.6), GY + Math.sin(a) * (RG - 2.6), C[4], 0.85);
  p.px(GX - RG * 0.42, GY - RG * 0.62, WHITE);
}
