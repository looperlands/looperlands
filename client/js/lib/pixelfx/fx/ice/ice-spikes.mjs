// The eruption recipe (a frost line racing ahead, each spike punching up white with a spray of shards, a puff
// and a glint, the floor frosting behind) is adapted from Sprite Fusion's open-source ice
// (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, clamp, smooth, seg, ease, rand, TAU, WHITE } from "../../core/index.mjs";
import { Panes, endBy, blade, splitPoly } from "./_lib.mjs";

export const meta = {
  name: "Ice spikes",
  desc: "A frost line races along the floor and clusters of jagged ice blades burst up behind it in a rising wave, glint, flash white together and shatter into toppling shards.",
  tags: ["ice", "spikes", "ground", "wave", "directional", "magic", "one-shot"],
  size: [264, 112],
  origin: [24, 96],
  duration: 3,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], reach: 172, height: 56, seed: 3 },
};

const START = 0.04, RUN = 0.44; // the frost line runs out
const SHIMMER = 0.74; // a glint runs down the line
const TREMBLE = 1.2, FLASH = 1.36, SHATTER = 1.42; // they shiver, flash white together and break
const MELT = 1.75; // the frost goes, oldest first

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), REACH = o.reach, floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  const splinter = (x, y, vx, n) => {
    for (let i = 0; i < n; i++) bits.add({ kind: B.SHARD, x: x + R.range(-2, 2), y: y - 1, vx: vx * 0.5 + R.range(-45, 45), vy: -R.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R.range(0.4, 0.75), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 2.4), c: C[R.int(4, 7)] });
  };
  const panes = new Panes({
    ground: floor,
    onCrumble: (q) => {
      splinter(q.x, 0, 0, 3);
      ps.spawn(P.VAPOUR, q.x, -1, R.range(-12, 12), -R.range(2, 8), R.range(0.4, 0.7), C[6], R.range(1.4, 2.2));
    },
    onLand: (q, x, y, v) => {
      if (v < 110) return;
      ps.spawn(P.VAPOUR, x, y - 1, R.range(-20, 20), -R.range(2, 8), R.range(0.4, 0.7), C[6], R.range(1.4, 2.4));
      splinter(x, y, q.vx, 3);
      if (R.chance(0.3)) ps.spawn(P.STAR, x, y - 2, 0, -5, R.range(0.2, 0.4), WHITE, R.range(0.8, 1.6));
    },
  });
  const front = (t) => REACH * (1 - Math.pow(1 - seg(t, START, START + RUN), 1.7));
  const reachedAt = (x) => START + RUN * (1 - Math.pow(1 - clamp(x / REACH), 1 / 1.7));

  // clusters along the line: a main blade leaning into the wave and two to four splayed round it, heights
  // swelling to a crest past the middle and falling off at the end
  const env = (q) => 0.28 + 0.72 * Math.exp(-(((q - 0.64) / 0.3) ** 2));
  const clusters = [];
  for (let x = 10; x < REACH - 2; x += R.range(20, 26)) {
    const q = x / REACH, H = o.height * env(q) * R.range(0.88, 1.06), W = clamp(H * 0.36, 5, 14), lean = H * R.range(0.2, 0.34);
    // a big blade leaning into the wave, a smaller one behind it leaning further, a stub in front of its foot
    const list = [
      { dx: W * R.range(0.35, 0.6), h: H * R.range(0.5, 0.7), w: W * 0.7, lean: H * R.range(0.4, 0.6), back: true, delay: R.range(0.02, 0.05), jag: R.chance(0.5) ? R.range(0.35, 0.6) : -1 },
      { dx: 0, h: H, w: W, lean, back: false, delay: 0, jag: R.chance(0.7) ? R.range(0.32, 0.58) : -1, main: true },
    ];
    if (H > 14) list.push({ dx: -W * R.range(0.35, 0.55), h: H * R.range(0.24, 0.4), w: W * 0.55, lean: -H * R.range(0, 0.12), back: false, delay: R.range(0.03, 0.07), jag: -1 });
    clusters.push({ x, q, H, W, blades: list, main: list[1], t0: reachedAt(x) + 0.012, up: false });
  }
  const crest = clusters.reduce((a, c) => (c.H > a.H ? c : a), clusters[0]);
  let t = 0, broke = false, trembled = false;

  // a blade's base, tip and look right now
  const pose = (c, b) => {
    const g = ease.outBack(clamp((t - c.t0 - b.delay) / 0.09), 2.2), x = c.x + b.dx;
    return { g, x, tx: x + b.lean * g, ty: -b.h * g, white: t - c.t0 - b.delay < 0.03 || (t >= FLASH && t < SHATTER) };
  };
  const drawClusters = (p) => {
    if (t >= SHATTER) return;
    for (const pass of [0, 1, 2])
      for (const c of clusters) {
        if (t < c.t0) continue;
        const jx = t >= TREMBLE && t < FLASH ? ((Math.floor(t * 40) + Math.round(c.x)) % 2 ? 1 : 0) : 0;
        for (const b of c.blades) {
          if ((pass === 0) !== b.back || (pass === 1) !== !!b.main) continue;
          const s = pose(c, b);
          if (s.g <= 0) continue;
          const gl = (t - SHIMMER - c.q * 0.34) / 0.2;
          blade(p, s.x + jx, 0, s.tx + jx, s.ty, b.w, C, { white: s.white, jag: b.jag, dim: b.back ? 1 : 0, glint: gl >= 0 && gl <= 1 ? gl : -1 });
        }
        if (pass === 2) {
          // light: a pop at the base as it bursts, a cold glow up its length while it stands
          const pop = clamp(1 - (t - c.t0) / 0.15), wh = t >= FLASH;
          p.glow(c.x + c.main.lean * 0.4, -c.H * 0.45, c.H * 0.9 + 10, C[4], (0.16 + 0.42 * pop + (wh ? 0.4 : 0)) * (0.85 + 0.15 * Math.sin(t * 3 + c.x)));
          if (pop > 0) p.glow(c.x, -2, 14, WHITE, 0.55 * pop);
        }
      }
  };

  // the frosted floor: a crust with rime tufts, a bloom under the surface, a white-hot head while it runs
  const drawFrost = (p) => {
    const fr = front(t);
    for (let x = -3; x <= Math.min(fr, REACH + 6); x++) {
      const q = clamp(x / REACH), age = t - reachedAt(Math.max(0, x)), a = 1 - smooth(MELT + q * 0.35, MELT + q * 0.35 + 0.6, t);
      if (a <= 0 || age < 0) continue;
      const h = rand(x, 17), grow = smooth(0, 0.3, age), head = fr - x < 3 && fr < REACH;
      p.dot(x, 0, head || age < 0.06 || h < 0.3 ? WHITE : C[6], a);
      const L = h < 0.45 ? Math.round(grow * (1 + rand(x, 5) * 2.6)) : 0;
      for (let j = 1; j <= L; j++) p.dot(x, -j, j === L ? WHITE : C[5], a);
      if (L > 1 && rand(x, 9) < 0.5) p.dot(x + 1, -L + 1, C[6], a);
      const D = grow * (2 + rand(x, 11) * 4) * (1 - q * 0.3);
      for (let j = 1; j <= D; j++) p.dot(x, j, rand(x * 31 + j, 7) < 0.06 ? WHITE : j < 2 ? C[5] : j < 4 ? C[4] : C[3], a * (1.1 - j / (D + 1)));
      if (head) p.dot(x, -1, WHITE);
    }
    if (fr < REACH && t > START) {
      p.glow(fr, -2, 16, C[6], 0.6);
      p.glow(fr, -1, 7, WHITE, 0.6);
    }
  };

  const breakBlade = (c, b) => {
    const s = pose(c, b), ax = s.tx - s.x, ay = s.ty, L = Math.hypot(ax, ay) || 1, nx = -ay / L, ny = ax / L, hw = b.w / 2;
    const tri = [[s.x - nx * hw, -ny * hw], [s.tx, s.ty], [s.x + nx * hw, ny * hw]];
    const ang = Math.atan2(ay, ax) + Math.PI / 2;
    let parts = [tri];
    if (b.h > 9) parts = parts.flatMap((poly) => splitPoly(poly, s.x + ax * 0.4, ay * 0.4, ang));
    if (b.h > 22) parts = parts.flatMap((poly) => (poly.some(([, y]) => y < ay * 0.5) ? splitPoly(poly, s.x + ax * 0.72, ay * 0.72, ang) : [poly]));
    for (const part of parts) {
      let mx = 0, my = 0;
      for (const [x, y] of part) (mx += x), (my += y);
      (mx /= part.length), (my /= part.length);
      const up = clamp(-my / 40);
      panes.add({
        pts: part.map(([x, y]) => [x - mx, y - my]), x: mx, y: my, vx: R.range(-25, 60), vy: -R.range(40, 130) * (0.5 + up), a: 0, va: R.range(-8, 8), f: R.range(-0.7, 0.7), vf: R.range(-6, 6),
        lit: b.back ? 0.45 : 0.75, g: 0.9, drag: 0.6, bounce: 0.3, solid: true, ridge: Math.atan2(ay, ax), brittle: b.h > 30 ? 2 : 1, crumble: R.range(0.12, 0.4), life: R.range(1, 1.4),
      });
    }
    for (let i = 0; i < 2 + b.h / 7; i++) {
      const u = R.next();
      bits.add({ kind: R.chance(0.15) ? B.CHUNK : B.SHARD, x: s.x + ax * u + R.range(-1.5, 1.5), y: ay * u, vx: R.range(-60, 90), vy: -R.range(60, 230), g: 0.9, drag: 0.6, bounce: 0.3, life: R.range(0.7, 1.3), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.2, 3.2), c: C[R.int(4, 7)], ramp: [C[1], C[3], C[4], C[6], C[7]] });
    }
  };

  return {
    update(dt) {
      t += dt;
      // the cast: a puff and a spray where the line starts
      if (t - dt <= START && t > START) {
        for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, R.range(0, 6), -R.range(0, 3), R.range(10, 60), -R.range(2, 12), R.range(0.4, 0.7), C[6], R.range(2, 3.2));
        lights.add(4, -4, 26, C[5], 0.6, 0.25);
      }
      // the running front throws frost: streaks along the floor, motes, vapour
      const fr = front(t);
      if (t > START && fr < REACH - 1) {
        if (R.chance(0.5)) ps.spawn(P.STREAK, fr - R.range(4, 12), -R.range(1, 3), R.range(40, 80), -R.range(0, 6), R.range(0.08, 0.14), R.chance(0.5) ? C[6] : WHITE);
        if (R.chance(0.3)) ps.spawn(P.FLAKE, fr, -1, R.range(10, 50), -R.range(20, 70), R.range(0.5, 0.9), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.2));
        if (R.chance(0.12)) ps.spawn(P.VAPOUR, fr, -R.range(0, 3), R.range(20, 60), -R.range(2, 10), R.range(0.4, 0.7), C[6], R.range(1.6, 2.8));
      }
      for (const c of clusters) {
        if (c.up || t < c.t0) continue;
        c.up = true;
        // each cluster bursts up: shards sprayed forward, a puff, motes, a glint at the tip once it stands
        const big = c === crest, n = 3 + Math.round(c.H / 8);
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + R.range(-1.1, 1.0), sp = R.range(60, 190) * (0.45 + c.H / 44);
          bits.add({ kind: B.SHARD, x: c.x + R.range(-3, 3), y: -1, vx: Math.cos(a) * sp + 25, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.6, 1.1), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 3), c: C[R.int(5, 7)] });
        }
        ps.spawn(P.VAPOUR, c.x, -1, R.range(-10, 40), -R.range(2, 10), R.range(0.5, 0.9), C[6], R.range(2.2, 3.4) * (0.6 + c.H / 60));
        for (let i = 0; i < 2; i++) ps.spawn(P.FLAKE, c.x + R.range(-4, 4), -R.range(2, c.H * 0.5), R.range(-20, 40), -R.range(20, 60), R.range(0.6, 1.1), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.3));
        if (c.H > 16) ps.spawn(P.STAR, c.x + c.main.lean, -c.H * 0.96, 0, -4, R.range(0.3, 0.5), WHITE, R.range(1.4, 2.6), 0.08);
        lights.add(c.x, -c.H * 0.4, 16 + c.H * 0.6, C[5], 0.5, 0.18);
        if (big) {
          lights.add(c.x, -c.H * 0.5, 54, WHITE, 0.5, 0.14);
          for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, c.x + R.range(-6, 6), -R.range(0, 4), R.range(-40, 60), -R.range(4, 16), R.range(0.6, 1), C[6], R.range(3, 4.5));
        }
      }
      // while they stand: glints wink on the blades
      if (t > START + RUN && t < TREMBLE && R.chance(0.09)) {
        const c = R.pick(clusters), b = R.pick(c.blades), s = pose(c, b), u = R.range(0.3, 0.95);
        ps.spawn(P.STAR, s.x + (s.tx - s.x) * u, s.ty * u, 0, -3, R.range(0.25, 0.5), R.chance(0.6) ? WHITE : C[6], R.range(0.6, 2));
      }
      // they shiver: chips fall
      if (!trembled && t >= TREMBLE) {
        trembled = true;
        for (const c of clusters)
          for (let i = 0; i < 2; i++) bits.add({ kind: B.SHARD, x: c.x + R.range(-4, 4), y: -R.range(4, c.H * 0.8), vx: R.range(-20, 20), vy: -R.range(0, 30), g: 0.8, drag: 0.5, bounce: 0.3, life: R.range(0.3, 0.6), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1, 1.8), c: C[R.int(5, 7)] });
      }
      if (!broke && t >= SHATTER) {
        broke = true;
        // all at once: every blade breaks into toppling pieces, splinters and ice dust, light along the line
        for (const c of clusters) {
          for (const b of c.blades) breakBlade(c, b);
          for (let i = 0; i < 2; i++) ps.spawn(P.VAPOUR, c.x + R.range(-6, 6), -R.range(1, 8), R.range(-30, 50), -R.range(4, 18), R.range(0.6, 1.1), C[6], R.range(2.4, 4) * (0.7 + c.H / 60));
          if (R.chance(0.7)) ps.spawn(P.STAR, c.x + R.range(-6, 6), -R.range(4, c.H), R.range(-10, 10), -R.range(6, 20), R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.2));
          for (let i = 0; i < 2; i++) ps.spawn(P.FLAKE, c.x + R.range(-6, 6), -R.range(4, c.H), R.range(-30, 60), -R.range(30, 90), R.range(0.9, 1.5), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.5));
          lights.add(c.x, -c.H * 0.5, 22 + c.H, WHITE, 0.45, 0.12);
        }
        for (let i = 0; i < 5; i++) lights.add((REACH * (i + 0.5)) / 5, -18, 40, C[4], 0.4, 0.5);
      }
      // the shatter's dust settles; glints on the debris
      if (broke && t < SHATTER + 0.8 && R.chance(0.1) && bits.list.length) {
        const b = R.pick(bits.list);
        ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.5));
      }
      ps.update(dt);
      bits.update(dt);
      panes.update(dt);
      lights.update(dt);
      endBy(t, meta.duration, ps, bits, panes);
    },
    drawBack(p) {
      drawFrost(p);
      ps.draw(p, "back");
    },
    draw(p) {
      drawClusters(p);
      // the cold light the frosted floor gives off
      const k = (1 - smooth(MELT, MELT + 0.9, t)) * smooth(START, START + 0.3, t), fr = front(t);
      for (let i = 0; i < 6; i++) p.glow((fr * (i + 0.5)) / 6, -3, 26, C[4], 0.15 * k);
      if (t >= FLASH && t < SHATTER + 0.1) for (const c of clusters) sparkle(p, c.x + c.main.lean, -c.H, 6 * (1 - clamp((t - FLASH) / 0.16)), C[6], C[4], 0.4);
      panes.draw(p, C);
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
