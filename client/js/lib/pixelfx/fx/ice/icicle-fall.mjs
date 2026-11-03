// The break recipe (a white frame, the ice flung apart as shards with ice dust and glints) is adapted from
// Sprite Fusion's open-source ice (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, band, clamp, smooth, seg, ease, rand, TAU, WHITE, GRAVITY } from "../../core/index.mjs";
import { Panes, splitPoly, centroid, endBy } from "./_lib.mjs";

export const meta = {
  name: "Icicle fall",
  desc: "An icicle drips and trembles, snaps off its frosted root, drops, stabs the floor and bursts into skidding shards, splinters and rolling frost.",
  tags: ["ice", "icicle", "fall", "trap", "shatter", "one-shot"],
  size: [152, 120],
  origin: [76, 100],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], seed: 4 },
};

const ROOT = -80, LEN = 36, W = 12; // where it hangs, how long, how wide at the root
const DRIP = 0.16, TREMBLE = 0.3, SNAP = 0.6, FREE = SNAP + 0.04;
const FALL_T = Math.sqrt((2 * (-ROOT - LEN)) / GRAVITY), IMPACT = FREE + FALL_T;

// the icicle: a rippled taper hanging from (x, top), lit down its left side with a bright core streak, rings of
// light at the ripples, deep on the right, a dark rim. white flashes it; cut hides the top rows (snapped root).
function icicle(p, C, x, top, len, w, opts = {}) {
  const hw = (u) => (w / 2) * Math.pow(1 - u, 0.75) * (1 + 0.14 * Math.sin(u * 13 + 0.5)) * (u < 0.08 ? 1.15 : 1) + 0.3;
  const tilt = opts.tilt ?? 0, cut = opts.cut ?? 0;
  p.shade(x - w / 2 - 4, top - 1, x + w / 2 + 4 + Math.abs(tilt) * len, top + len + 1, (px, py, o) => {
    const u = (py - top) / len, cx = x + tilt * len * u + 0.7 * Math.sin(u * 6 + 1), s = px - cx;
    if (u < cut || u > 1) return;
    const h = hw(u);
    if (Math.abs(s) > h + 1) return;
    if (Math.abs(s) > h) {
      o.c = C[1];
      return;
    }
    if (opts.white) return (o.c = WHITE);
    const q = s / h, ring = Math.sin(u * 13 + 0.5) > 0.7;
    let c = u > 0.88 ? WHITE : q < -0.72 ? C[6] : q < -0.2 ? (ring ? C[7] : C[5]) : q < 0.18 ? (u < 0.72 ? C[7] : C[6]) : q > 0.8 ? C[2] : Math.abs(q - 0.45) < 0.1 && u > 0.15 && u < 0.6 ? C[5] : q < 0.6 ? C[4] : C[3];
    if (opts.glint >= 0 && q < 0.25 && Math.abs(u - opts.glint) < 0.06) c = WHITE;
    o.c = c;
  });
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  const splinter = (x, y, vx, n) => {
    for (let i = 0; i < n; i++) bits.add({ kind: B.SHARD, x: x + R.range(-2, 2), y: y - 1, vx: vx * 0.5 + R.range(-45, 45), vy: -R.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R.range(0.4, 0.75), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 2.4), c: C[R.int(4, 7)] });
  };
  const panes = new Panes({
    ground: floor,
    onLand: (q, x, y, v) => {
      if (v < 100) return;
      ps.spawn(P.VAPOUR, x, y - 1, R.range(-15, 15), -R.range(2, 8), R.range(0.4, 0.6), C[6], R.range(1.4, 2.2));
      splinter(x, y, q.vx, 2);
    },
    onCrumble: (q) => splinter(q.x, 0, q.vx, 3),
  });
  // the rime it hangs from: a frosted crust with stubs of older icicles
  const rime = [];
  for (let x = -18; x <= 18; x++) {
    const h = rand(x, o.seed, 2), d = Math.abs(x) / 18;
    rime.push({ x, h: 1 + Math.round((0.6 + h * 1.8) * (1 - d * 0.7)), stub: h < 0.3 && Math.abs(x) > 7 ? 2 + Math.round(rand(x, 5) * 5 * (1 - d * 0.5)) : 0 });
  }
  let t = 0, snapped = false, landed = false, dripped = false, y = 0;
  const top = () => ROOT + (t < FREE ? 0 : 0.5 * GRAVITY * (t - FREE) ** 2);

  return {
    update(dt) {
      t += dt;
      // a drop of meltwater swells at the tip and falls
      if (!dripped && t >= DRIP) {
        dripped = true;
        bits.add({ kind: B.DRIP, x: 0.5, y: ROOT + LEN + 1, vy: 20, g: 0.9, life: 1.2, c: C[6] });
      }
      // it trembles: frost sifts down from the root
      if (t > TREMBLE && t < SNAP && R.chance(0.25)) ps.spawn(P.FLAKE, R.range(-6, 6), ROOT + R.range(0, 3), R.range(-8, 8), R.range(5, 20), R.range(0.6, 1.1), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.1));
      // it snaps: a crack flashes across the root, chips and a puff burst off
      if (!snapped && t >= SNAP) {
        snapped = true;
        lights.add(0, ROOT + 4, 24, WHITE, 0.6, 0.1);
        lights.add(0, ROOT + 4, 32, C[5], 0.4, 0.3);
        for (let i = 0; i < 7; i++) {
          const a = R.range(0, TAU), sp = R.range(30, 110);
          bits.add({ kind: B.SHARD, x: R.range(-4, 4), y: ROOT + 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, g: 0.8, drag: 0.8, bounce: 0.3, life: R.range(0.5, 0.9), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1, 2), c: C[R.int(5, 7)] });
        }
        for (let i = 0; i < 3; i++) ps.spawn(P.VAPOUR, R.range(-5, 5), ROOT + 2, R.range(-25, 25), R.range(-5, 5), R.range(0.4, 0.7), C[6], R.range(1.6, 2.6));
        for (let i = 0; i < 5; i++) ps.spawn(P.FLAKE, R.range(-6, 6), ROOT + 2, R.range(-30, 30), R.range(-20, 20), R.range(0.6, 1.2), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.3));
      }
      // falling: it sheds frost motes that hang in the air behind it
      if (t > FREE && t < IMPACT && R.chance(0.5)) {
        const tp = top();
        ps.spawn(P.MOTE, R.range(-3, 3), tp + R.range(0, LEN * 0.6), R.range(-10, 10), R.range(-40, -10), R.range(0.2, 0.35), R.chance(0.5) ? C[6] : C[5], 0.6);
      }
      // it stabs the floor and bursts
      if (!landed && t >= IMPACT) {
        landed = true;
        const tp = -LEN;
        lights.add(0, -16, 46, WHITE, 0.85, 0.12);
        lights.add(0, -16, 58, C[4], 0.5, 0.5);
        // the icicle in pieces: cut across its length, then down the middle
        let parts = [[[-W / 2, tp], [W / 2, tp], [0.5, 0]]];
        for (const v of [0.3, 0.58, 0.8]) parts = parts.flatMap((poly) => splitPoly(poly, 0, tp + LEN * v + R.range(-2, 2), R.range(-0.4, 0.4)));
        parts = parts.flatMap((poly) => (centroid(poly).area > 22 ? splitPoly(poly, centroid(poly).x, centroid(poly).y, Math.PI / 2 + R.range(-0.5, 0.5)) : [poly]));
        for (const part of parts) {
          const m = centroid(part), side = m.x < 0.5 ? -1 : 1, low = clamp(-m.y / LEN);
          panes.add({
            pts: part.map(([x, y]) => [x - m.x, y - m.y]), x: m.x, y: m.y, vx: side * R.range(30, 110) + R.range(-15, 15), vy: -R.range(70, 200) * (0.4 + low), a: 0, va: R.range(-12, 12), f: R.range(-0.7, 0.7), vf: R.range(-8, 8),
            lit: 0.75, g: 0.9, drag: 0.6, bounce: 0.35, solid: true, ridge: Math.PI / 2, brittle: 2, crumble: R.range(0.15, 0.45), life: R.range(1, 1.4),
          });
        }
        for (let i = 0; i < 52; i++) {
          const a = -Math.PI / 2 + R.range(-1.25, 1.25), sp = R.range(60, 230);
          bits.add({ kind: R.chance(0.15) ? B.CHUNK : B.SHARD, x: R.range(-3, 3), y: -R.range(1, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.85, drag: 0.6, bounce: 0.32, life: R.range(0.6, 1.2), a: R.range(0, TAU), va: R.range(-22, 22), s: R.range(1.2, 3), c: C[R.int(4, 7)], ramp: [C[1], C[3], C[4], C[6], C[7]] });
        }
        for (let i = 0; i < 10; i++) {
          const s = R.sign();
          ps.spawn(P.VAPOUR, s * R.range(0, 8), -R.range(1, 6), s * R.range(25, 90), -R.range(2, 14), R.range(0.6, 1.1), C[6], R.range(2.2, 3.8));
        }
        for (let i = 0; i < 12; i++) ps.spawn(P.FLAKE, R.range(-6, 6), -R.range(2, 16), R.range(-70, 70), -R.range(30, 110), R.range(1, 1.5), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.5));
        for (let i = 0; i < 6; i++) ps.spawn(P.STAR, R.range(-24, 24), -R.range(4, 34), R.range(-10, 10), -R.range(4, 14), R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.2));
      }
      if (landed && t < IMPACT + 0.9 && R.chance(0.08) && bits.list.length) {
        const b = R.pick(bits.list);
        ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.4));
      }
      ps.update(dt);
      bits.update(dt);
      panes.update(dt);
      lights.update(dt);
      endBy(t, meta.duration, ps, bits, panes);
    },
    drawBack(p) {
      // its shadow gathers on the floor as it comes down
      if (t > TREMBLE && t < IMPACT + 0.05) {
        const k = t < FREE ? seg(t, TREMBLE, FREE) * 0.35 : 0.35 + 0.65 * seg(t, FREE, IMPACT), rx = 3 + 7 * k;
        for (let x = Math.floor(-rx); x <= rx; x++) {
          const f = 1 - (x / rx) ** 2;
          p.blend(x + 0.5, 0, C[0], 0.7 * k * f);
          if (Math.abs(x) < rx * 0.7) p.blend(x + 0.5, 1, C[0], 0.45 * k * f);
        }
      }
      // frost splashed across the floor where it struck, melting away
      if (t >= IMPACT) {
        const g = ease.outCubic(seg(t, IMPACT, IMPACT + 0.25)), out = 1 - smooth(IMPACT + 0.8, IMPACT + 1.5, t);
        for (let x = -26; x <= 26; x++) {
          const d = Math.abs(x + 0.5) / 26, h = rand(x, 23), a = out * clamp((g * 1.15 - d) / 0.15);
          if (a <= 0) continue;
          p.dot(x, 0, h < 0.35 || d > g - 0.12 ? WHITE : C[6], a);
          if (h < 0.4) for (let j = 1; j <= Math.round((1 + rand(x, 3) * 2.5) * (1 - d)); j++) p.dot(x + Math.sign(x) * (j > 1 ? 1 : 0), -j, j > 1 ? WHITE : C[5], a);
          for (let j = 1; j <= Math.round((2 + rand(x, 7) * 3) * (1 - d * 0.6)); j++) p.dot(x, j, j < 2 ? C[5] : C[4], a * (1.1 - j / 6));
        }
        const k = seg(t, IMPACT, IMPACT + 0.35);
        if (k < 1) band(p, 0, 0.5, 6 + 34 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.1 - k, [C[3], C[4], C[5], C[6]], (a) => Math.sin(a) < 0);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      // the rime it hangs from, fading at the end
      const ra = 1 - smooth(meta.duration - 0.7, meta.duration - 0.2, t);
      for (const r of rime) {
        // a lumpy crust: white on top, pale below, a deep underside; little icicles hang off it
        for (let j = 0; j < r.h + 1; j++) p.dot(r.x, ROOT - 1 - j, j === r.h ? WHITE : j === r.h - 1 ? C[6] : j === 0 ? C[3] : C[5], ra);
        for (let j = 0; j < r.stub; j++) p.dot(r.x, ROOT + j, j === r.stub - 1 ? WHITE : j === 0 ? C[5] : C[4], ra);
        if (r.stub > 4) p.dot(r.x + 1, ROOT, C[3], ra);
      }
      // the snapped root: a jagged stub left behind
      if (snapped)
        for (let x = -W / 2 + 1; x <= W / 2 - 1; x++) {
          const L = 1 + Math.round(rand(x, 77) * 2.5);
          for (let j = 0; j < L; j++) p.dot(x, ROOT + j, j === L - 1 ? (t < SNAP + 0.15 ? WHITE : C[6]) : x < 0 ? C[5] : C[3], ra);
        }
      p.glow(0, ROOT, 18, C[4], 0.3 * ra);
      if (t >= IMPACT) {
        const k = seg(t, IMPACT, IMPACT + 0.35);
        if (k < 1) band(p, 0, 0.5, 6 + 34 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.1 - k, [C[3], C[4], C[5], C[6]], (a) => Math.sin(a) >= 0, k < 0.15);
        if (t < IMPACT + 0.22) sparkle(p, 0.5, -3, 10 * ease.outBack(Math.min(1, (t - IMPACT) / 0.05)) * (1 - (t - IMPACT) / 0.22), C[6], C[4], 0.7);
      }
      if (t < IMPACT) {
        // the icicle: trembling before it snaps, then falling with a streak of air behind it
        const tp = top(), jx = t > TREMBLE && t < SNAP ? (Math.floor(t * 36) % 2 ? 1 : 0) * Math.round(seg(t, TREMBLE, SNAP) * 1.4 + 0.4) : 0;
        const falling = t >= FREE, sp = falling ? GRAVITY * (t - FREE) : 0;
        if (falling)
          for (const [dx, k] of [[-3, 0.7], [0.5, 1], [4, 0.6]]) {
            const L = Math.min(30, sp * 0.07) * k;
            if (L > 2) p.line(dx, tp - L, dx, tp + 3, (u) => (u > 0.75 ? C[6] : u > 0.4 ? C[4] : C[3]));
          }
        const gl = (t - 0.04) / 0.3;
        icicle(p, C, jx + 0.5, tp, LEN, W, { white: t >= IMPACT - 0.025 || (t >= SNAP && t < SNAP + 0.03), glint: gl >= 0 && gl <= 1 ? gl : -1 });
        if (snapped && t < SNAP + 0.12) p.line(-W / 2 - 1, ROOT + 1, W / 2 + 1, ROOT + 1, WHITE);
        p.glow(0.5, tp + LEN * 0.5, 20, C[4], 0.28);
        // the drop of meltwater swelling at the tip
        if (t < DRIP) {
          const s = seg(t, 0, DRIP);
          p.dot(0.5, ROOT + LEN + 1, C[6], s);
          if (s > 0.6) p.px(0.5, ROOT + LEN + 2, WHITE);
        }
      }
      panes.draw(p, C);
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
