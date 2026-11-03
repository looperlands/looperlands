// Arcs leaping between points of the silhouette's edge, re-struck every other frame, grounding to the floor, and
// the periodic jolt that throws sparks follow Sprite Fusion's open-source lightning crackle
// (https://www.spritefusion.com/pixel-art-vfx/lightning), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rng, cycle, TAU, WHITE, hex, luma } from "../../core/index.mjs";
import { VOLT, PLASMA, zigzag, crackle, flight, spark } from "./_lib.mjs";

export const meta = {
  name: "Electrified",
  desc: "Current runs through a character: arcs crawl over and leap across the body, sparks spit off, the body flares to an electric silhouette on each jolt, and the feet ground out.",
  tags: ["lightning", "electric", "status", "shock", "stun", "actor", "loop"],
  size: [108, 92],
  origin: [54, 76],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: VOLT, sparks: PLASMA, seed: 5 },
};

const TENSE = { turn: 0.9, crouch: 3, fx: -8, fy: -17, bx: 9, by: -17, ffx: -3, fbx: 4 };
const JOLT_A = { turn: 1.1, crouch: 0, y: -1, fx: -13, fy: -36, bx: 13, by: -17, ffx: -4, fbx: 5 };
const JOLT_B = { turn: 0.7, crouch: 1, y: -1, fx: -13, fy: -16, bx: 13, by: -36, ffx: -4, fbx: 5 };
export const act = {
  onBody: true,
  poses: [
    [0, TENSE],
    [0.1, JOLT_A, "snap"],
    [0.17, JOLT_B, "snap"],
    [0.3, TENSE, "snap"],
    [0.733, TENSE],
    [0.733, JOLT_B, "snap"],
    [0.8, JOLT_A, "snap"],
    [0.93, TENSE, "snap"],
    [1.367, TENSE],
    [1.367, JOLT_A, "snap"],
    [1.45, JOLT_B, "snap"],
    [1.58, TENSE, "snap"],
    [2, TENSE],
  ],
};

const FPS = 30, N = 60, P = 2, JOLTS = [[3, 1], [22, 0.7], [41, 0.9]];
const edges = new WeakMap();
// the silhouette's edge pixels, in local space
function edgeOf(A) {
  let e = edges.get(A.mask);
  if (e) return e;
  const m = A.mask, on = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.data[y * m.w + x];
  e = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))) e.push([A.x + x + 0.5, A.y + y + 0.5]);
  edges.set(A.mask, e);
  return e;
}
const jolt = (f) => {
  for (const [f0, k] of JOLTS) if (f >= f0 && f < f0 + 3) return { a: f - f0, k };
  return null;
};

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), A = o.actor, f = Math.floor(t * FPS + 1e-6) % N, j = jolt(f), r = rng(o.seed, 4, f);
  // a cold aura: a broken outline that flickers round the body, light pooling at the feet
  p.outline(A.mask, A.x, A.y, j ? C[4] : r.next() < 0.5 ? C[2] : C[1]);
  p.glow(0, -18, 30, C[3], (j ? 0.55 * j.k : 0.16 + 0.1 * r.next()));
  p.glow(0, -2, 22, C[4], 0.18);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.sparks.map(hex), A = o.actor, E = edgeOf(A), f = Math.floor(t * FPS + 1e-6) % N, j = jolt(f);
  // the jolt: the body flares to an electric silhouette, then fades back through its own shading
  if (j) {
    const lift = [1.1, 0.6, -0.2][j.a] * j.k, ramp = [C[1], C[2], C[3], C[4], C[5], C[6], C[7]];
    for (let y = 0; y < A.h; y++)
      for (let x = 0; x < A.w; x++) {
        const c = A.pixels[y * A.w + x];
        if (c) p.px(A.x + x, A.y + y, ramp[clamp(Math.round(0.4 + luma(c) * 6 + lift), 0, 6)]);
      }
    p.glow(0, -19, 26, C[5], 0.5 * j.k * (1 - j.a / 3));
  }
  // arcs: two or three at a time, re-struck every other frame, leaping between nearby points of the edge
  const r = rng(o.seed, 7, f >> 1), n = 2 + (j ? 2 : r.int(0, 1));
  for (let i = 0; i < n; i++) {
    const a = r.pick(E), ang = r.range(0, TAU), d = r.range(6, 14);
    let b = [a[0] + Math.cos(ang) * d, a[1] + Math.sin(ang) * d];
    for (let k = 0; k < 10; k++) {
      const c = r.pick(E);
      if (Math.hypot(c[0] - b[0], c[1] - b[1]) < 5 && Math.hypot(c[0] - a[0], c[1] - a[1]) > 4) b = c;
    }
    const k = (f & 1 ? 0.75 : 0.95) * r.range(0.6, 1);
    crackle(p, zigzag(rng(o.seed, 8, f, i), a[0], a[1], b[0], b[1], 0.42, 0.35), k, C, 0.4);
    // the edge catches the light where an arc touches it
    for (const [x, y] of E) if (Math.hypot(x - a[0], y - a[1]) < 3.5 || Math.hypot(x - b[0], y - b[1]) < 3) p.px(x - 0.5, y - 0.5, C[5]);
  }
  // the feet ground out to the floor now and then
  if (r.next() < (j ? 0.9 : 0.35)) {
    const s = r.sign(), x0 = s * r.range(3, 8);
    crackle(p, zigzag(rng(o.seed, 9, f), x0, -1.5, x0 + s * r.range(5, 12), -0.5, 0.45, 0.3), 0.7, C, 0.35);
    p.glow(x0, -1, 10, C[5], 0.35);
  }
  // sparks: a spray off the edge with every jolt, and a few spat out between them
  for (const [f0, k] of JOLTS) {
    const age = (((t - f0 / FPS) % P) + P) % P;
    for (let i = 0; i < 9; i++) {
      const q = rng(o.seed, 21, f0, i), life = q.range(0.18, 0.4);
      if (age >= life) continue;
      const [x0, y0] = E[Math.floor(q.next() * E.length)], ang = Math.atan2(y0 + 19, x0) + q.range(-0.7, 0.7), sp = q.range(60, 150) * k;
      const [x, y, vx, vy] = flight(x0, y0, Math.cos(ang) * sp, Math.sin(ang) * sp - 30, age, { floor: 0 });
      spark(p, x, y, vx, vy, 1 - age / life, S);
    }
  }
  cycle(t, P, 8, o.seed + 3, (g) => g.range(0.15, 0.3), (age, life, q) => {
    const [x0, y0] = E[Math.floor(q.next() * E.length)], ang = Math.atan2(y0 + 19, x0) + q.range(-0.6, 0.6), sp = q.range(50, 110);
    const [x, y, vx, vy] = flight(x0, y0, Math.cos(ang) * sp, Math.sin(ang) * sp - 20, age, { floor: 0 });
    spark(p, x, y, vx, vy, 1 - age / life, S);
  });
}
