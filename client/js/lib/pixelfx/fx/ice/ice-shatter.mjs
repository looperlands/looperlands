// The crack-and-burst recipe (cracks walking out from the point of impact, a white frame, the ice flung apart
// as shards with ice dust and glints) is adapted from Sprite Fusion's open-source ice
// (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, flare, clamp, smooth, seg, ease, rand, TAU, WHITE } from "../../core/index.mjs";
import { Panes, endBy, inPoly, centroid, splitPoly, fractures, drawFractures } from "./_lib.mjs";

export const meta = {
  name: "Ice shatter",
  desc: "A block of ice takes a hit from the left: it jolts, cracks race over its faces, it flashes white and bursts into chunks that tumble, bounce and skid off in a roll of ice dust.",
  tags: ["ice", "shatter", "break", "destroy", "impact", "directional", "one-shot"],
  size: [224, 112],
  origin: [68, 90],
  duration: 2.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], seed: 6 },
};

const HIT = 0.26, CRACK2 = 0.4, SHIVER = 0.54, FLASH = 0.62, BURST = 0.68;
// the block, seen from the front and a little above: a front face, a top, a side in shadow
const FRONT = [[-16, 0], [-16, -28], [12, -28], [12, 0]];
const TOP = [[-16, -28], [-8, -34], [20, -34], [12, -28]];
const SIDE = [[12, 0], [12, -28], [20, -34], [20, -6]];
const SIL = [[-16, 0], [-16, -28], [-8, -34], [20, -34], [20, -6], [12, 0]];
const HIT_AT = [-16, -15];
const PLANE = [[-16, -21], [-5, -28], [3, -13], [-16, -9]]; // a fracture plane inside, lighter
const SHADE = [[5, -28], [12, -28], [12, -10]]; // the far corner in shadow

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor }), lights = new Lights(), scuffs = [];
  const splinter = (x, y, vx, n) => {
    for (let i = 0; i < n; i++) bits.add({ kind: B.SHARD, x: x + R.range(-2, 2), y: y - 1, vx: vx * 0.6 + R.range(-35, 45), vy: -R.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R.range(0.4, 0.8), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 2.4), c: C[R.int(4, 7)] });
  };
  const panes = new Panes({
    ground: floor,
    onLand: (q, x, y, v) => {
      // a chunk hitting the floor: a puff of ice dust, a few splinters, sometimes a glint
      if (v < 100) return;
      ps.spawn(P.VAPOUR, x, y - 1, q.vx * 0.3 + R.range(-15, 15), -R.range(2, 10), R.range(0.4, 0.7), C[6], R.range(1.6, 2.8));
      splinter(x, y, q.vx, 2);
      if (R.chance(0.3)) ps.spawn(P.STAR, x, y - 3, 0, -5, R.range(0.2, 0.4), WHITE, R.range(0.8, 1.6));
    },
    onSkid: (q, x) => {
      // sliding chunks scuff frost onto the floor
      if (R.chance(0.5)) scuffs.push({ x: Math.round(x + R.range(-1, 1)), t: 0 });
    },
    onCrumble: (q) => {
      splinter(q.x, 0, q.vx, 3);
      ps.spawn(P.VAPOUR, q.x, -1, R.range(-10, 14), -R.range(2, 6), R.range(0.4, 0.7), C[6], R.range(1.2, 2));
    },
  });

  // the ice's insides: veins of frost and trapped bubbles in the front face
  const veins = [], bubbles = [];
  for (let k = 0; k < 3; k++) {
    let x = R.range(-12, 8), y = R.range(-24, -6), a = R.range(0, TAU);
    for (let i = 0; i < 9; i++) {
      a += R.range(-0.6, 0.6);
      x += Math.cos(a) * 1.5;
      y += Math.sin(a) * 1.2;
      if (x < -14 || x > 10 || y < -26 || y > -2) break;
      veins.push([Math.floor(x), Math.floor(y)]);
    }
  }
  for (let k = 0; k < 5; k++) bubbles.push([R.int(-12, 8), R.int(-23, -4), R.chance(0.4) ? 1 : 0]);
  const inside = (x, y) => inPoly(SIL, x, y);
  const cracks = fractures(R, inside, HIT_AT[0] + 1, HIT_AT[1], 4, { len: 8, a0: -0.9, spread: 1.9 });
  const cracks2 = fractures(R, inside, HIT_AT[0] + 1, HIT_AT[1], 6, { len: 18, a0: -1.3, spread: 2.7, fork: 0.16 });

  let t = 0, struck = false, burst = false, wave2 = false, white = false;
  const jolt = () => (t >= HIT && t < HIT + 0.05 ? 2 : t >= HIT + 0.05 && t < HIT + 0.12 ? 1 : t >= SHIVER && t < FLASH ? (Math.floor(t * 40) % 2 ? 1 : 0) : 0);

  // the block: shaded faces, frost veins and bubbles inside, lit edges, a dark rim
  const drawBlock = (p) => {
    if (t >= BURST) return;
    const jx = jolt(), wh = t >= FLASH, sweep = -40 + 70 * seg(t, 0.04, 0.3);
    const sh = (pts) => pts.map(([x, y]) => [x + jx, y]);
    // rim
    p.poly(sh([[-17, 1], [-17, -28.5], [-8.3, -35.2], [21, -35.2], [21, -5.6], [12.5, 1]]), C[0]);
    if (wh) {
      p.poly(sh(SIL), WHITE);
      return;
    }
    // the front: lit at the top, deep at the foot, the far edges showing through, a fracture plane catching
    // light, reflections streaked across the upper left
    p.poly(sh(FRONT), (x, y) => {
      const lx = x - jx, d = lx + y * 0.8;
      if (Math.abs(d - sweep) < 1.3 && y < -6) return WHITE;
      if (y < -9 && (Math.abs(d + 21) < 1.1 || Math.abs(d + 16.5) < 0.6)) return C[6];
      if (((Math.abs(lx + 7.5) < 0.5 && y < -6) || (Math.abs(y + 5.5) < 0.5 && lx > -8)) && (Math.floor(lx) + Math.floor(y)) % 2 === 0) return C[5];
      if (inPoly(PLANE, lx, y)) return y < -25.5 ? C[6] : C[5];
      if (inPoly(SHADE, lx, y)) return C[3];
      return y < -25.5 ? C[5] : y < -8 ? C[4] : y < -2.5 ? C[3] : C[2];
    });
    p.poly(sh(TOP), (x, y) => (y > -29.5 ? C[7] : y < -32.5 ? C[5] : rand(Math.floor(x), Math.floor(y), 3) < 0.08 ? C[7] : C[6]));
    p.poly(sh(SIDE), (x, y) => {
      const lx = x - jx;
      return lx < 13.5 ? C[3] : Math.abs(lx - 16.5) < 0.6 && y < -8 ? C[3] : y > (lx - 12) * -0.75 - 3 ? C[1] : C[2];
    });
    for (const [x, y] of veins) p.px(x + jx, y, C[5]);
    for (const [x, y, big] of bubbles) {
      p.px(x + jx, y, C[6]);
      if (big) p.px(x + jx + 1, y, C[5]), p.px(x + jx, y + 1, C[5]);
    }
    const E = (a, b, c) => p.line(a[0] + jx, a[1], b[0] + jx, b[1], c);
    E([-16, -28], [12, -28], WHITE);
    E([-16, -28], [-8, -34], C[6]);
    E([-8, -34], [20, -34], C[5]);
    E([12, -28], [20, -34], C[7]);
    E([-16, -1], [-16, -28], C[5]);
    E([12, -1], [12, -28], C[6]);
    E([20, -6], [20, -34], C[3]);
    E([13, -1], [20, -6], C[1]);
    if (t >= HIT) drawFractures(p, cracks, (t - HIT) * 170, C, { ox: jx });
    if (t >= CRACK2) drawFractures(p, cracks2, (t - CRACK2) * 200, C, { ox: jx });
  };

  // the floor: a frost patch where the block stands, frost scuffed along by sliding chunks
  const drawFloor = (p) => {
    const out = 1 - smooth(BURST + 0.6, BURST + 1.5, t);
    if (out > 0)
      for (let x = -22; x <= 26; x++) {
        const d = Math.abs(x - 2) / 24, h = rand(x, 41), a = out * clamp((1.1 - d) / 0.25);
        if (a <= 0) continue;
        p.dot(x, 0, h < 0.35 ? WHITE : C[6], a);
        if (h < 0.4 && (x < -16 || x > 20)) p.dot(x, -1, C[5], a);
        for (let j = 1; j <= 1 + Math.round(rand(x, 7) * 3 * (1 - d)); j++) p.dot(x, j, j < 2 ? C[5] : C[4], a * (1 - j / 5));
      }
    for (const s of scuffs) {
      const a = 1 - s.t / 0.9;
      if (a > 0) p.dot(s.x, 0, s.t < 0.15 ? WHITE : C[6], a), p.dot(s.x, 1, C[4], a * 0.6);
    }
  };

  const explode = () => {
    // chunks of each face, cut at random, flung away from the hit, mostly right and up
    const chop = (pts, max, depth) => {
      const c = centroid(pts);
      return c.area < max || depth > 4 ? [pts] : splitPoly(pts, c.x + R.range(-1, 1), c.y + R.range(-1, 1), R.range(0, Math.PI)).flatMap((q) => chop(q, max, depth + 1));
    };
    for (const [face, tone, max] of [[FRONT, 0.6, 46], [TOP, 1, 40], [SIDE, 0.3, 46]])
      for (const part of chop(face, max, 0)) {
        const m = centroid(part), dx = m.x - HIT_AT[0], dy = m.y - HIT_AT[1], d = Math.hypot(dx, dy) || 1, sp = R.range(50, 150) * (0.7 + 0.3 * (1 - d / 40));
        panes.add({
          pts: part.map(([x, y]) => [x - m.x, y - m.y]), x: m.x, y: m.y, vx: (dx / d) * sp * 0.9 + R.range(40, 110), vy: (dy / d) * sp * 0.4 - R.range(60, 200),
          a: 0, va: R.range(-10, 10), f: R.range(-0.9, 0.9), vf: R.range(-7, 7), tone, lit: tone, g: 0.9, drag: 0.5, bounce: 0.38, solid: true, brittle: 3, crumble: R.range(0.25, 0.6), life: R.range(1.5, 1.9),
        });
      }
    for (let i = 0; i < 46; i++) {
      const x = R.range(-15, 19), y = -R.range(1, 33), dx = x - HIT_AT[0], dy = y - HIT_AT[1], d = Math.hypot(dx, dy) || 1, sp = R.range(60, 200);
      if (!inside(x, y)) continue;
      bits.add({ kind: R.chance(0.15) ? B.CHUNK : B.SHARD, x, y, vx: (dx / d) * sp * 0.8 + R.range(20, 90), vy: (dy / d) * sp * 0.4 - R.range(60, 240), g: 0.85, drag: 0.6, bounce: 0.32, life: R.range(0.8, 1.4), a: R.range(0, TAU), va: R.range(-22, 22), s: R.range(1.2, 3.4), c: C[R.int(4, 7)], ramp: [C[1], C[3], C[4], C[6], C[7]] });
    }
    // ice dust rolls out along the floor, vapour hangs where it stood, a flurry, glints, a flash of light
    for (let i = 0; i < 9; i++) ps.spawn(P.VAPOUR, R.range(-6, 18), -R.range(1, 6), R.range(10, 130), -R.range(2, 12), R.range(0.6, 1.1), C[6], R.range(2.2, 3.8));
    for (let i = 0; i < 5; i++) ps.spawn(P.DUST, R.range(-6, 16), -R.range(1, 4), R.range(30, 110), -R.range(2, 8), R.range(0.5, 0.9), C[5], R.range(1.6, 2.8));
    for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, R.range(-8, 18), -R.range(8, 28), R.range(-10, 50), -R.range(8, 24), R.range(0.6, 1), C[6], R.range(2.6, 4));
    for (let i = 0; i < 16; i++) {
      const a = R.range(-Math.PI * 0.9, -0.1), sp = R.range(40, 140);
      ps.spawn(P.FLAKE, R.range(-8, 16), -R.range(6, 28), Math.cos(a) * sp + 20, Math.sin(a) * sp, R.range(1, 1.6), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.6));
    }
    for (let i = 0; i < 7; i++) ps.spawn(P.STAR, R.range(-14, 40), -R.range(4, 40), R.range(-8, 16), -R.range(4, 16), R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.4));
    lights.add(2, -17, 64, WHITE, 0.85, 0.14);
    lights.add(16, -18, 86, C[4], 0.5, 0.55);
  };

  return {
    update(dt) {
      t += dt;
      // the hit: a flash on the left face, chips and sparks thrown back, the block jolts
      if (!struck && t >= HIT) {
        struck = true;
        lights.add(HIT_AT[0], HIT_AT[1], 24, WHITE, 0.6, 0.08);
        lights.add(HIT_AT[0] + 6, HIT_AT[1], 40, C[5], 0.4, 0.3);
        for (let i = 0; i < 12; i++) {
          const a = Math.PI + R.range(-0.9, 0.9), sp = R.range(50, 120);
          ps.spawn(P.SPARK, HIT_AT[0] - 1, HIT_AT[1], Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.4));
        }
        for (let i = 0; i < 6; i++) {
          const a = Math.PI + R.range(-1, 0.8), sp = R.range(40, 100);
          bits.add({ kind: B.SHARD, x: HIT_AT[0] - 1, y: HIT_AT[1] + R.range(-2, 2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 0.85, drag: 0.6, bounce: 0.3, life: R.range(0.5, 0.9), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.2, 2.4), c: C[R.int(5, 7)] });
        }
      }
      if (!wave2 && t >= CRACK2) {
        wave2 = true;
        lights.add(0, -16, 36, C[6], 0.35, 0.15);
        for (let i = 0; i < 3; i++) bits.add({ kind: B.SHARD, x: R.range(-14, 18), y: -R.range(4, 30), vx: R.range(-30, 30), vy: -R.range(10, 50), g: 0.85, drag: 0.6, bounce: 0.3, life: R.range(0.4, 0.7), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1, 2), c: C[R.int(5, 7)] });
      }
      if (!white && t >= FLASH) {
        white = true;
        lights.add(2, -17, 44, WHITE, 0.7, 0.08);
      }
      if (!burst && t >= BURST) {
        burst = true;
        explode();
      }
      // glints wink on the settling debris
      if (burst && t < BURST + 1 && R.chance(0.08) && bits.list.length) {
        const b = R.pick(bits.list);
        ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.5));
      }
      for (let i = scuffs.length - 1; i >= 0; i--) if ((scuffs[i].t += dt) > 0.9) scuffs.splice(i, 1);
      ps.update(dt);
      bits.update(dt);
      panes.update(dt);
      lights.update(dt);
      endBy(t, meta.duration, ps, bits, panes);
    },
    drawBack(p) {
      drawFloor(p);
      ps.draw(p, "back");
    },
    draw(p) {
      drawBlock(p);
      // the hit: a star and a short flare on the left face
      const h = t - HIT;
      if (h >= 0 && h < 0.2) {
        sparkle(p, HIT_AT[0] - 1, HIT_AT[1], 9 * ease.outBack(Math.min(1, h / 0.04)) * (1 - h / 0.2), C[6], C[4], 0.7);
        if (h < 0.08) flare(p, HIT_AT[0] - 1, HIT_AT[1], 14 * (1 - h / 0.08), 1 - h / 0.08, C);
      }
      // cold light in the ice, brighter as it cracks; a pool on the floor
      const k = 1 - smooth(BURST, BURST + 0.4, t), crk = smooth(HIT, FLASH, t);
      if (k > 0) {
        p.glow(2, -17, 34, C[4], (0.16 + 0.22 * crk) * k);
        p.glow(2, -2, 30, C[4], 0.14 * k);
      }
      if (t >= FLASH && t < BURST + 0.12) flare(p, 2, -17, 26 * (1 - clamp((t - FLASH) / 0.18)), 1 - clamp((t - FLASH) / 0.18), C);
      panes.draw(p, C);
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
