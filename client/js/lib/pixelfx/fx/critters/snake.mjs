import { fit, hex, mix, clamp, wrap, lerp, smooth, cycle, P, TAU } from "../../core/index.mjs";
import { Grid, Swarm, shift, shadow } from "./_lib.mjs";

export const meta = {
  name: "Snake",
  desc: "A snake slithers along the floor, head raised: humps rise and roll back down its patterned body to the tail, dust puffs where it touches down, its forked tongue flicks.",
  tags: ["critter", "snake", "reptile", "ground", "loop"],
  size: [136, 56],
  origin: [68, 48],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#081410", "#123a1e", "#1d5e2a", "#2f8a36", "#5cb848", "#a8e070", "#e8ffc0"],
    belly: ["#4a3a14", "#b08a34", "#f0d878"],
    seed: 1,
  },
};

const D = meta.duration, HEAD = 30, LEN = 70, GRID = new Grid(-44, -24, 88, 26), SWARM = new Swarm();
const TONGUE = hex("#e8304a"), DUST = hex("#8a7f92");
const K = TAU / 30, W = (TAU * 2) / D;

// the body's centre height u px behind the head: humps rolling back toward the tail, the neck raised to the head
function lift(u, t) {
  const wave = Math.max(0, Math.sin(K * u - W * t)) ** 0.85, env = smooth(8, 18, u) * (1 - smooth(LEN - 14, LEN - 2, u));
  const neck = u < 12 ? 6 * (1 - u / 12) ** 2 : 0;
  return 7 * wave * env + neck;
}
const radius = (u) => (u < 6 ? 3.3 : lerp(3.4, 0.6, ((u - 6) / (LEN - 6)) ** 1.3));
// the head's bob with the rhythm, and the tongue's flicks: two bursts of three a loop
const bob = (t) => 0.8 * Math.sin(W * t);
function tongue(t) {
  for (const t0 of [0.3, 1.5]) {
    const k = (t - t0) / 0.5;
    if (k >= 0 && k < 1) return Math.max(0, Math.sin(k * Math.PI * 3)) ** 0.6;
  }
  return 0;
}

function snake(g, C, B, t) {
  g.clear();
  const hb = bob(t);
  // the body, column by column from the tail to the neck: lit along its back, a gold belly, dark diamonds, glints on the humps
  for (let u = LEN; u >= 2; u -= 0.5) {
    const x = HEAD - u, r0 = radius(u), cy = -r0 - lift(u, t) + (u < 12 ? hb * (1 - u / 12) : 0), hump = lift(u, t);
    // keep the body as thick across its slope as along the floor
    const slope = (lift(u + 0.5, t) - lift(u - 0.5, t)), r = r0 * Math.sqrt(1 + slope * slope);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const v = (y + 0.5 - cy) / r;
      if (Math.abs(v) > 1) continue;
      let c = v < -0.5 ? C[4] : v < 0.1 ? C[3] : v < 0.45 ? C[2] : v < 0.8 ? B[1] : B[0];
      const dm = Math.abs(((u + 2) % 7) - 3.5) / 3.5 + Math.abs(v + 0.25) / 0.55;
      if (dm < 0.85 && v < 0.35 && u > 4) c = dm < 0.5 ? C[1] : C[2];
      if (v < -0.62 && hump > 4.5 && dm >= 0.85) c = hump > 6 ? C[6] : C[5];
      if (v > 0.45 && v < 0.8 && Math.floor(u) % 3 === 0) c = B[2];
      g.set(x, y, c);
    }
  }
  // the head: a blunt wedge raised off the floor, lit on top, an eye with a slit pupil, a nostril, a mouth line
  const hx = HEAD + 2, hy = -9.5 + hb;
  g.shade(hx - 5, hy - 4, hx + 6, hy + 4, (x, y) => {
    const dx = (x - hx) / (x > hx ? 5.6 : 4.6), dy = (y - hy) / (3.6 - Math.max(0, x - hx) * 0.18);
    if (dx * dx + dy * dy > 1) return 0;
    if (dy > 0.55) return B[1];
    return dy < -0.3 ? (dx < 0.3 ? C[5] : C[4]) : C[3];
  });
  g.line(hx - 1, hy + 1.5, hx + 5, hy + 1.2, C[1]);
  g.set(hx + 1, hy - 2, C[0]); g.set(hx + 2, hy - 2, B[2]); g.set(hx + 1, hy - 1, B[2]); g.set(hx + 2, hy - 1, C[0]);
  g.set(hx + 1, hy - 3, C[6]);
  g.set(hx + 5, hy - 1, C[1]);
  g.outline(C[0]);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), B = fit(o.belly, 3), hb = bob(t);
  // the tongue darts out, forked, and flicks back
  const e = tongue(t), tx = HEAD + 7.5, ty = -8.2 + hb;
  if (e > 0.05) {
    const L = 7 * e, wig = Math.sin(t * 60) * 0.6 * e;
    p.line(tx, ty, tx + L, ty + wig, TONGUE);
    if (L > 3) p.px(tx + L + 1, ty + wig - 1, TONGUE), p.px(tx + L + 1, ty + wig + 1, TONGUE);
  }
  const g = GRID;
  snake(g, C, B, t);
  g.draw(p);
  // dust scuffed along the floor where each hump presses back down, drifting off low and thin
  const sw = SWARM.begin(t);
  cycle(t, D, 26, o.seed * 7 + 1, (r) => r.range(0.6, 1.1), (age, L, r) => {
    const born = wrap(t - age, D), m = r.int(0, 2), u = (Math.PI + W * born + m * TAU) / K;
    if (u < 18 || u > LEN - 10) return;
    const x = HEAD - u + r.range(-2, 2) - r.range(6, 16) * age;
    sw.add(P.SMOKE, x, -0.5 - age * r.range(3, 8), 0, 0, age, L, DUST, r.range(1.8, 3.4));
  });
  sw.draw(p);
  // a glint in its eye
  p.glow(HEAD + 3.5, -11 + hb, 4, B[2], 0.35);
}

export function drawBack(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7);

  // a shadow along its length, softer under the humps
  for (let u = 2; u <= LEN; u += 2) {
    const h = lift(u, t), r = radius(u);
    shadow(p, HEAD - u, -0.2, 2.2 + r * 0.4, 1.2, C[0], 0.5 * (1 - clamp(h / 10)) + 0.1);
  }
  shadow(p, HEAD + 2, -0.2, 5, 1.2, C[0], 0.35);
}
