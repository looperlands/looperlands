import { cycle, fit, clamp, smooth, rand, TAU, WHITE, mix } from "../../core/index.mjs";
import { VOID, halo, unlight } from "./_lib.mjs";

export const meta = {
  name: "Eclipse",
  desc: "A black moon over the sun: a breathing pearl corona with long streamers, a thin white rim, and one diamond bead blazing on its edge.",
  tags: ["shadow", "eclipse", "moon", "sun", "corona", "sky", "magic", "loop"],
  size: [160, 144],
  origin: [80, 72],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "sky",
  options: { palette: VOID, pearl: ["#5a4f8a", "#a99be0", "#e6defa", "#fffaf2"], seed: 3 },
};

// the moon's radius, the loop, where the bead blazes on the rim (radians, 0 = right, up is negative)
const R = 19, D = 4, BEAD = -0.72;
const breathe = (t, k, ph) => Math.sin((TAU * k * t) / D + ph);
// streamers: crowded toward the equator (left and right), longer there, each curving off as it goes out
const STREAMS = Array.from({ length: 30 }, (_, i) => {
  const side = i % 2 ? 0 : Math.PI, spread = (rand(i, 1) - 0.5) * (rand(i, 2) < 0.7 ? 1.3 : 3.1);
  const a = side + spread, eq = Math.abs(Math.cos(a));
  return { a, len: (10 + rand(i, 3) * 28) * (0.45 + 0.75 * eq), curl: (rand(i, 4) - 0.5) * 0.00018, k: 1 + (i % 3), ph: rand(i, 5) * TAU, w: rand(i, 6) };
});

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), Q = fit(o.pearl, 4), S = o.seed;
  // stars twinkling in the dark sky round it
  cycle(t, D, 26, S, (r) => r.range(1.2, 2.6), (age, L, r) => {
    const x = r.range(-78, 78), y = r.range(-70, 70);
    if (Math.hypot(x, y) < R + 22) return;
    const k = Math.sin((Math.PI * age) / L);
    p.dot(x, y, k > 0.7 ? WHITE : Q[1], k * 1.2);
    if (k > 0.85 && r.next() < 0.4) (p.dot(x - 1, y, Q[0], 0.8), p.dot(x + 1, y, Q[0], 0.8));
  });
  // the outer corona's light: a wide pearly bloom, breathing
  const b = 1 + 0.08 * breathe(t, 1, 0);
  p.glow(0, 0, 72 * b, C[4], 0.38);
  p.glow(0, 0, 46 * b, Q[1], 0.34);
  // streamers: fine rays of pearl, white at the root, thinning to violet, curling as they go out
  for (const s of STREAMS) {
    const L = s.len * (1 + 0.18 * breathe(t, s.k, s.ph));
    for (let d = 4; d <= L; d += 0.5) {
      const u = d / L, a = s.a + s.curl * d * d, r = R + 1 + d, x = Math.cos(a) * r, y = Math.sin(a) * r;
      p.dot(x, y, u < 0.3 ? Q[2] : u < 0.65 ? Q[1] : C[5], u < 0.75 ? 1 : (1 - u) * 4);
    }
    p.glowLine(Math.cos(s.a) * (R + 4), Math.sin(s.a) * (R + 4), Math.cos(s.a) * (R + L * 0.6), Math.sin(s.a) * (R + L * 0.6), 3, Q[1], 0.12);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), Q = fit(o.pearl, 4), b = 1 + 0.08 * breathe(t, 1, 0);
  // the inner corona: a bright collar hugging the moon, finely streaked, fading out through pearl to violet
  const W = R + 10;
  p.shade(-W, -W, W, W, (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    if (r < R - 0.5 || r > R + 9 * b) return;
    const a = Math.atan2(y, x), e = (r - R) / (9 * b);
    const streak = 0.55 + 0.3 * Math.cos(a * 23 + Math.sin(a * 5) * 2) + 0.15 * Math.cos(a * 41 - (TAU * t) / D);
    const I = (1 - e) ** 2.2 * streak * (0.75 + 0.4 * Math.abs(Math.cos(a)));
    if (r < R + 0.9) return Q[3];
    if (I < 0.1) return;
    if (I > 0.45 && ((Math.floor(x) + Math.floor(y)) & 1) === 0) out.k = 0.2 * I;
    return I > 0.72 ? Q[2] : I > 0.42 ? Q[1] : I > 0.22 ? C[5] : C[4];
  });
  // the moon: black, a whisper of earthshine on its left limb
  p.shade(-R, -R, R, R, (x, y) => {
    const r = Math.sqrt(x * x + y * y);
    if (r >= R - 0.5) return;
    return r > R - 2.2 && x < -R * 0.45 ? C[1] : C[0];
  });
  // the diamond bead: a blazing point on the rim, rays flaring out and breathing
  const bx = Math.cos(BEAD) * (R + 0.4), by = Math.sin(BEAD) * (R + 0.4), k = 0.75 + 0.25 * breathe(t, 2, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.12, len = (i % 2 ? 7 : 22) * k * (i === 1 || i === 5 ? 1.6 : 1);
    for (let d = 1; d <= len; d += 0.5) {
      const u = d / len, x = bx + Math.cos(a) * d, y = by + Math.sin(a) * d;
      if (x * x + y * y < (R - 0.5) ** 2) break;
      p.dot(x, y, u < 0.35 ? WHITE : u < 0.7 ? Q[2] : Q[1], u < 0.5 ? 1 : (1 - u) * 2.2);
    }
  }
  p.circle(bx, by, 3 * k, Q[2]);
  p.circle(bx, by, 2.2 * k, Q[3]);
  p.circle(bx, by, 1.4, WHITE);
  p.glow(bx, by, 46 * k, Q[2], 0.8 * k);
  p.glow(bx, by, 14, WHITE, 0.8);
  halo(p, 0, 0, R - 0.5, R + 16, Q[2], 0.35 * b);
  unlight(p, -R, -R, R, R, (x, y) => x * x + y * y < (R - 0.6) ** 2);
}
