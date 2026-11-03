// The flame tongues, embers and thin smoke are
// adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { cycle, fit, hex, mix, rand, Rng, clamp, WHITE } from "../../core/index.mjs";
import { shape, colorAt, tnoise, travel, tongue, smoke, ember } from "./_lib.mjs";
import { luma } from "../../core/index.mjs";

export const meta = {
  name: "Burning",
  desc: "Burning over time: small flames lick from four hot spots, trailing sparks and thin smoke; every 0.6 s they flare, the body flashes white then orange, scorch marks spread.",
  tags: ["status", "fire", "burn", "dot", "debuff", "loop"],
  size: [72, 80],
  origin: [36, 70],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    char: ["#120c0a", "#2a1a14", "#4a2c1c"],
    smoke: "#5b5566",
    seed: 3,
  },
};

const A_ = { turn: 1, crouch: 2, lean: 2, fx: -13, fy: -38, bx: 12, by: -17, ffx: -3, ffy: -7, fbx: 5 };
const B_ = { turn: 0.9, crouch: 3, lean: -2, fx: -12, fy: -17, bx: 13, by: -38, ffx: -4, fbx: 4, fby: -7 };
export const act = {
  onBody: true,
  poses: [[0, A_], [0.15, B_, "snap"], [0.3, A_, "snap"], [0.45, B_, "snap"], [0.6, A_, "snap"], [0.75, B_, "snap"], [0.9, A_, "snap"], [1.05, B_, "snap"], [1.2, A_, "snap"]],
};

const D = meta.duration, TICK = 0.6, WIND = -14;
const since = (t) => (((t % TICK) + TICK) % TICK);
const flare = (t) => Math.exp(-since(t) / 0.12);
/** The stand-in is hidden for the one white frame of each tick (the effect draws the body then). */
export const actorAlpha = (t) => (since(t) < 0.034 ? 0 : 1);

// the hot spots on the outline: the hair tips, a shoulder, the back, a sleeve; scorch spots near them per tick
const SPOTS = new WeakMap();
function spots(a, seed) {
  let s = SPOTS.get(a.mask);
  if (!s) SPOTS.set(a.mask, (s = new Map()));
  if (s.has(seed)) return s.get(seed);
  const S = shape(a), H = S.h, W = S.w, R = new Rng(seed * 13 + 5);
  const at = (q, side) => {
    const my = Math.round(H * q), [l, r] = S.rows[my];
    return [side < 0 ? l : r, my];
  };
  const hair = S.up.filter(([x]) => x < W * 0.42).sort((p, q) => p[1] - q[1] || p[0] - q[0])[0];
  const shoulder = S.up.filter(([x, y]) => x > W / 2 && y > H * 0.4 && y < H * 0.62).sort((p, q) => p[1] - q[1])[0] ?? at(0.5, 1);
  const list = [
    { at: hair, side: -1, n: 3, h: 4.5 },
    { at: shoulder, side: 1, n: 2, h: 4 },
    { at: at(0.62, -1), side: -1, n: 2, h: 3.5 },
    { at: at(0.6, 1), side: 1, n: 2, h: 3.5 },
  ].map((sp, i) => ({ ...sp, x: a.x + sp.at[0] + 0.5, y: a.y + sp.at[1] + 1.5, tongues: Array.from({ length: sp.n }, (_, j) => ({ dx: (j - (sp.n - 1) / 2) * 1.6 + R.range(-0.4, 0.4), h: sp.h * R.range(0.8, 1.2), n: i * 17 + j * 5 + seed })) }));
  // scorch marks: each tick chars two patches on the clothes near the spots
  const scorch = [0, 1].map((tick) =>
    [0, 1].map((k) => {
      // on the clothes (mid-tones, where char shows), near a hot spot
      const sp = list[(tick * 2 + k + 1) % list.length], lum = (x, y) => luma(colorAt(a, x, y));
      let cand = S.body.filter(([x, y]) => Math.hypot(a.x + x + 0.5 - sp.x, a.y + y + 0.5 - sp.y) < 9 && y > H * 0.42 && lum(x, y) > 0.3 && lum(x, y) < 0.6);
      if (!cand.length) cand = S.body.filter(([, y]) => y > H * 0.45);
      const [x, y] = cand[Math.floor(R.next() * cand.length)];
      return { x: a.x + x + 0.5, y: a.y + y + 0.5, r: R.range(3.2, 4.4) };
    }));
  const out = { list, scorch };
  s.set(seed, out);
  return out;
}

export function drawBack(p, t, o) {
  const F = fit(o.palette, 9).reverse(), a = o.actor, fl = flare(t), flick = 0.8 + 0.2 * tnoise(t, D, 7.5, 3);
  // warm flicker on the floor
  p.shade(-30, -3, 30, 7, (x, y, out) => {
    const d = Math.hypot(x / 26, (y - 0.5) / 4.5);
    if (d < 1) (out.l = mix(F[3], F[4], 0.5)), (out.k = (0.16 + 0.22 * fl) * flick * (1 - d) * (1 - d));
  });
  // thin smoke drifting up and away from each spot
  const smokeC = mix(hex(o.smoke), F[6], 0.2), { list } = spots(a, o.seed);
  cycle(t, D, 16, o.seed + 4, (r) => r.range(0.8, 1.2), (age, life, r, i) => {
    const sp = list[i % list.length], x = sp.x + travel(WIND * 0.6, WIND * 0.5, 0.8, age) + Math.sin(age * 4 + i) * 1.2, y = sp.y - 3 - travel(18, 6, 1, age);
    smoke(p, x, y, r.range(1.1, 1.9), age / life, smokeC, 0.9);
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9).reverse(), CH = fit(o.char, 3), a = o.actor, S = shape(a), { list, scorch } = spots(a, o.seed);
  const ph = since(t), tick = Math.floor(t / TICK) % 2, fl = flare(t);
  // the tick: the body's own pixels flash white for a frame, then orange, fading
  if (ph < 0.034) for (const [mx, my] of S.body) p.px(a.x + mx, a.y + my, WHITE);
  else if (ph < 0.22) {
    const k = 1 - (ph - 0.034) / 0.186;
    for (const [mx, my] of S.body) p.blend(a.x + mx, a.y + my, F[4], 0.55 * k);
  }
  // scorch marks spreading over the clothes from this tick, ember-edged, cooling and fading by the next
  for (const sc of scorch[tick]) {
    const grow = clamp(ph / 0.14), fade = 1 - clamp((ph - 0.25) / 0.33), r = sc.r * (0.4 + 0.6 * grow);
    if (fade <= 0) continue;
    for (const [mx, my] of S.body) {
      const x = a.x + mx + 0.5, y = a.y + my + 0.5, d = Math.hypot(x - sc.x, (y - sc.y) * 1.2) + rand(mx, my, 7) * 0.9;
      if (d > r) continue;
      const edge = d > r - 1;
      if (edge) p.dot(x - 0.5, y - 0.5, rand(mx, my, Math.floor(t * 20)) < 0.5 ? F[3] : F[4], fade * 1.2);
      else p.dot(x - 0.5, y - 0.5, d < r * 0.5 ? CH[0] : CH[1], fade * 1.1);
    }
    p.glow(sc.x, sc.y, 6, F[4], 0.3 * fade);
  }
  // the hot spots: little tongues licking up, flaring on the tick
  for (const sp of list) {
    for (const tg of sp.tongues) {
      const h = tg.h * (0.85 + 0.25 * tnoise(t, D, 5, tg.n)) * (1 + 1.6 * fl);
      tongue(p, sp.x + tg.dx, sp.y, h, 1.1 + 0.3 * fl, WIND * 0.08 * h / 4 + tnoise(t, D, 3, tg.n + 9) * 0.8, F, t, D, tg.n);
    }
    p.glow(sp.x, sp.y - 2, 9 + 6 * fl, F[4], 0.22 + 0.35 * fl);
  }
  // sparks streaming up and away
  cycle(t, D, 20, o.seed + 6, (r) => r.range(0.5, 0.9), (age, life, r, i) => {
    const sp = list[i % list.length], x = sp.x + r.range(-1.5, 1.5) + travel(WIND + r.range(-10, 6), WIND * 0.6, 1.2, age) + Math.sin(age * 9 + i) * 1.2 * age;
    const y = sp.y - 2 + travel(-r.range(25, 55), -18, 1.4, age);
    ember(p, x, y, age / life, [F[1], F[3], F[5]], age + i);
  });
  // the tick throws a burst of sparks off every spot
  if (ph < 0.3)
    for (const [k, sp] of list.entries())
      for (let j = 0; j < 4; j++) {
        const an = -Math.PI / 2 + (rand(k, j, tick) - 0.5) * 2.2, v = 50 + 50 * rand(k, j, 2), x = sp.x + Math.cos(an) * travel(v, 0, 3, ph), y = sp.y - 2 + Math.sin(an) * travel(v, 0, 3, ph) + 60 * ph * ph;
        p.px(x, y, ph < 0.12 ? F[1] : F[3]);
        p.light(x, y, F[3], 0.4 * (1 - ph / 0.3));
      }
}
