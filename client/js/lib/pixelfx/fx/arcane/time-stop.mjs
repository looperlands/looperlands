// The cracks walking out from a point and the burst into tumbling shards, glints and light are adapted from
// Sprite Fusion's open-source ice shatter (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, PAL, fit, flare, clamp, smooth, ease, luma, rgb, TAU, WHITE } from "../../core/index.mjs";

const CY = -42, RC = 26, OPEN = 0.3, FREEZE = 1.75, CRACK = 2.2, SHATTER = 2.42;
// the second hand ticks, each wait longer than the last, until time stops
const TICKS = [0.36, 0.46, 0.57, 0.7, 0.85, 1.03, 1.24, 1.49];

export const meta = {
  name: "Time stop",
  desc: "A clock face springs open, ticks slower and slower, freezes drained of colour, cracks, then shatters into falling shards.",
  tags: ["arcane", "time", "clock", "freeze", "stop", "shatter", "magic", "one-shot"],
  size: [196, 136],
  origin: [98, 118],
  duration: 3.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: PAL.arcane, seed: 14 },
};

// how far the hand has gone: a snap with a little overshoot at each tick
function hand(t) {
  let a = 0;
  for (const tk of TICKS) if (t > tk) a += ease.outBack(clamp((t - tk) / 0.07), 3);
  return -Math.PI / 2 + a * (TAU / 12);
}
// how fast time flows: full speed, slowing to nothing at the freeze
const flow = (t) => (t < OPEN ? 1 : Math.max(0, 1 - (t - OPEN) / (FREEZE - OPEN)) ** 1.6);
// the motes' clock: time itself, slowing down (integrated flow)
function clockTime(t) {
  let s = 0;
  for (let u = 0; u < Math.min(t, FREEZE); u += 1 / 120) s += flow(u) / 120;
  return s;
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  // the drained ramp: each step's own lightness, cold grey
  const G = C.map((c) => {
    const l = luma(c) * 255;
    return rgb(l * 0.92, l * 0.96, Math.min(255, l * 1.06));
  });
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), bits = new Bits({ ground: () => 0 }), lights = new Lights();
  const motes = Array.from({ length: 14 }, (_, i) => ({ a: R.range(0, TAU), r: RC + R.range(5, 14), w: R.range(1.4, 2.6) * (i % 2 ? 1 : -1), tilt: R.range(-0.5, 0.5), c: R.pick([WHITE, C[6], C[5]]) }));
  // cracks: jagged walks out from a point on the face
  const ix = R.range(-6, 6), iy = R.range(-6, 6), cracks = [];
  const walk = (x, y, a, len, depth) => {
    const pts = [[x, y]];
    for (let s = 0; s < len; s++) {
      a += R.range(-0.55, 0.55);
      x += Math.cos(a) * R.range(1.6, 2.6);
      y += Math.sin(a) * R.range(1.6, 2.6);
      if (Math.hypot(x, y) > RC - 0.5) break;
      pts.push([x, y]);
      if (depth < 1 && pts.length > 3 && R.chance(0.14)) walk(x, y, a + R.sign() * R.range(0.6, 1.1), len / 2, depth + 1);
    }
    cracks.push(pts);
  };
  for (let i = 0; i < 7; i++) walk(ix, iy, (i / 7) * TAU + R.range(-0.3, 0.3), 16, 0);
  let t = 0, tc = 0, ticked = 0, shattered = false, frozen = false;

  // the face, in ramp K: glass, rims, ticks and dots, hands, hub
  function face(p, K, s, cracked) {
    const cy = CY, r = RC * s;
    if (r < 1) return;
    p.disc(0, cy, r, K[1], (d) => 0.3 + 0.35 * d * d);
    p.ring(0, cy, r + 0.5, 1, K[6]);
    p.ring(0, cy, r - 1.5, 1, K[4]);
    p.ring(0, cy, r + 2, 1, K[3], 0.6);
    // minute dots and hour ticks; the quarters long and bright
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      if (i % 5) p.dot(Math.cos(a) * (r - 3.5), cy + Math.sin(a) * (r - 3.5), K[4], 0.8);
      else {
        const q = i % 15 === 0, r0 = r - (q ? 8 : 6.5);
        p.line(Math.cos(a) * r0, cy + Math.sin(a) * r0, Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), q ? K[7] : K[6]);
      }
    }
    p.ring(0, cy, r * 0.3, 1, K[4], 0.8);
    // the hour hand, then the second hand with its tail, then the hub
    const ha = -Math.PI / 2 + (hand(t) + Math.PI / 2) / 12 + 0.9, sa = hand(t) + (frozen ? Math.sin(t * 70) * 0.012 : 0);
    p.beam(0, cy, Math.cos(ha) * r * 0.48, cy + Math.sin(ha) * r * 0.48, 2.6, (u, v) => (v < 0.5 ? K[6] : K[4]));
    p.line(-Math.cos(sa) * 5, cy - Math.sin(sa) * 5, Math.cos(sa) * (r - 4), cy + Math.sin(sa) * (r - 4), (u) => (u > 0.75 ? K[7] : K[6]));
    p.line(-Math.cos(sa) * 5 + 0.5, cy - Math.sin(sa) * 5, -Math.cos(sa) * 2, cy - Math.sin(sa) * 2, K[5]);
    p.circle(0, cy, 2.2, K[5]);
    p.circle(0, cy, 1.2, K[7]);
    if (cracked > 0)
      for (const pts of cracks)
        for (let i = 0, n = Math.floor(pts.length * cracked); i < n; i++) {
          const [x, y] = pts[i], fresh = i > n - 3 && cracked < 1;
          p.px(x, cy + y, fresh ? WHITE : K[7]);
          if (!fresh) p.px(x, cy + y - 1, K[2]);
        }
  }

  return {
    update(dt) {
      t += dt;
      tc = clockTime(t);
      // each tick sends a ripple and a spark off the hand's tip
      while (ticked < TICKS.length && t >= TICKS[ticked]) {
        ticked++;
        const a = hand(t + 0.1);
        lights.add(Math.cos(a) * (RC - 4), CY + Math.sin(a) * (RC - 4), 22, C[6], 0.6, 0.12);
        for (let i = 0; i < 3; i++) ps.spawn(P.STAR, Math.cos(a) * (RC + 1), CY + Math.sin(a) * (RC + 1), Math.cos(a) * 30 + R.range(-15, 15), Math.sin(a) * 30 + R.range(-15, 15), R.range(0.2, 0.4), R.pick([WHITE, C[6]]), R.range(0.7, 1.3));
      }
      if (!frozen && t >= FREEZE) {
        frozen = true;
        lights.add(0, CY, 70, WHITE, 0.7, 0.2);
      }
      if (!shattered && t >= SHATTER) {
        shattered = true;
        lights.add(0, CY, 80, WHITE, 0.8, 0.16);
        lights.add(0, CY, 100, C[5], 0.6, 0.6);
        // the face bursts into shards and chunks, cold grey; colour sparks back into the world around them
        for (let i = 0; i < 64; i++) {
          const a = R.range(0, TAU), d = R.range(0, RC), x = Math.cos(a) * d, y = CY + Math.sin(a) * d, sp = R.range(40, 140);
          const dx = x - ix, dy = y - CY - iy, l = Math.hypot(dx, dy) || 1;
          bits.add({ kind: B.SHARD, x, y, vx: (dx / l) * sp + R.range(-25, 25), vy: (dy / l) * sp * 0.7 - R.range(40, 120), g: 0.9, drag: 0.5, bounce: 0.25, life: R.range(0.8, 1.15), a: R.range(0, TAU), va: R.range(-22, 22), s: R.range(1.5, 3.6), c: R.pick([G[7], G[6], G[6], G[5]]) });
        }
        for (let i = 0; i < 10; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 110);
          bits.add({ kind: B.CHUNK, x: Math.cos(a) * RC * 0.6, y: CY + Math.sin(a) * RC * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - R.range(60, 130), g: 1, drag: 0.4, bounce: 0.3, life: R.range(0.9, 1.15), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1.6, 3), ramp: [G[1], G[3], G[4], G[6], G[7]] });
        }
        for (let i = 0; i < 26; i++) {
          const a = R.range(0, TAU), sp = R.range(30, 110);
          ps.spawn(i % 2 ? P.STAR : P.MOTE, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.4, 0.8), R.pick([WHITE, C[6], C[5]]), R.range(0.8, 1.8));
        }
        for (let i = 0; i < 18; i++) {
          const a = R.range(0, TAU), sp = R.range(90, 200);
          ps.spawn(P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.45));
        }
        // the stopped time it held lifts away as a cold vapour
        for (let i = 0; i < 12; i++) {
          const a = R.range(0, TAU), d = R.range(0, RC * 0.8);
          ps.spawn(P.VAPOUR, Math.cos(a) * d, CY + Math.sin(a) * d, Math.cos(a) * R.range(10, 40), Math.sin(a) * R.range(10, 30) - R.range(5, 20), R.range(0.6, 1), R.chance(0.5) ? G[5] : C[4], R.range(3, 6));
        }
      }
      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the floor lit beneath the clock while it stands
      const k = smooth(0, OPEN, t) * (1 - smooth(SHATTER, SHATTER + 0.5, t)), cold = t >= FREEZE;
      if (k > 0) p.glow(0, -1, 40, cold ? G[5] : C[4], 0.25 * k);
      // the motes behind the face
      if (t < SHATTER) for (const m of motes) drawMote(p, m, true);
    },
    draw(p) {
      const cold = t >= FREEZE, s = t < OPEN ? ease.outBack(t / OPEN, 2.6) : 1;
      if (t < SHATTER) {
        // white for a beat as it freezes, then cold grey; white again in the moment it bursts
        const white = (t >= FREEZE && t < FREEZE + 0.06) || t >= SHATTER - 0.05;
        face(p, white ? G.map(() => WHITE) : cold ? G : C, s, clamp((t - CRACK) / 0.18));
        p.glow(0, CY, RC * 1.9, cold ? G[5] : C[4], 0.32 * s);
        p.glowRing(0, CY, RC, 7, cold ? G[6] : C[5], 0.28 * s);
        for (const m of motes) drawMote(p, m, false);
      }
      // springing open: a ring thrown out and a flare
      if (t < 0.35) {
        const q = t / 0.35;
        p.ring(0, CY, RC * (0.4 + 1.2 * ease.outCubic(q)), Math.max(1, 3 * (1 - q)), q < 0.3 ? WHITE : C[6], 1.2 - q);
        if (q < 0.5) flare(p, 0, CY, 26 * (1 - q * 2) + 2, 1 - q * 2, C);
      }
      // a ripple of time off each tick; ripples run on the clock's own slowing time, so they drag to a halt and
      // hang there, drained, until it all breaks
      if (t < SHATTER)
        for (const tk of TICKS) {
          if (t < tk) continue;
          const q = (tc - clockTime(tk)) / 0.32;
          if (q >= 1) continue;
          p.ring(0, CY, RC + 3 + 24 * ease.outCubic(q), 1, cold ? G[5] : C[5], (cold ? 0.6 : 0.8) * Math.pow(1 - q, 1.6));
        }
      if (t >= SHATTER && t < SHATTER + 0.2) {
        const q = (t - SHATTER) / 0.2;
        flare(p, 0, CY, 34 * (1 - q) + 2, 1 - q, C);
        p.ring(0, CY, RC + 30 * ease.outCubic(q), Math.max(1, 3 * (1 - q)), WHITE, 1.2 - q);
      }
      bits.draw(p);
      ps.draw(p);
      lights.draw(p);
    },
  };

  // a mote circling the clock on a tilted orbit, slowing with time; drained and still once it stops
  function drawMote(p, m, back) {
    const a = m.a + m.w * tc, z = Math.sin(a);
    if (z < 0 !== back) return;
    const x = Math.cos(a) * m.r, y = CY + Math.cos(a) * m.r * m.tilt + z * m.r * 0.3, cold = t >= FREEZE, v = flow(t) * m.w;
    const c = cold ? G[6] : m.c;
    p.dot(x, y, c, back ? 0.6 : 1);
    // a tail while it still moves
    if (Math.abs(v) > 0.2) for (let k = 1; k <= 3; k++) {
      const b = a - Math.sign(m.w) * k * 0.05 * Math.min(1, Math.abs(v));
      p.dot(Math.cos(b) * m.r, CY + Math.cos(b) * m.r * m.tilt + Math.sin(b) * m.r * 0.3, k < 2 ? C[5] : C[4], (back ? 0.5 : 0.9) * (1 - k / 4));
    }
    if (!back) p.glow(x, y, 5, cold ? G[6] : C[6], 0.3);
  }
}
