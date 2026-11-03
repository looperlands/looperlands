import { Particles, Bits, P, B, Rng, rng, fit, sparkle, clamp, smooth, ease, TAU, WHITE, mix } from "../../core/index.mjs";
import { VOID, Puffs, PK, ringFast } from "./_lib.mjs";

export const meta = {
  name: "Hex sigil",
  desc: "A burning pen traces a cursed sigil in the air, its glyphs pop in one by one, then it flares white and crumbles into falling embers.",
  tags: ["shadow", "hex", "sigil", "rune", "curse", "magic", "circle", "one-shot"],
  size: [168, 128],
  origin: [84, 112],
  duration: 4.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: VOID, seed: 7 },
};

// the sigil's centre and radii; the beats: traced, glyphs pop, holds, flares, crumbles
const CY = -50, RO = 28, RI = 22, RC = 6, GLYPH = 1.62, FLARE = 2.6, BREAK = 2.74;

// the strokes, in the order the pen draws them, as points with the moment the pen passes each
function strokes(seed) {
  const paths = [], circle = (r, a0, n = 0) => Array.from({ length: (n || Math.ceil(r * TAU)) + 1 }, (_, i) => [Math.cos(a0 + (i / (n || Math.ceil(r * TAU))) * TAU) * r, CY + Math.sin(a0 + (i / (n || Math.ceil(r * TAU))) * TAU) * r]);
  paths.push(circle(RO, -Math.PI / 2));
  // a seven-pointed star, drawn in one stroke, three points round each time
  const star = [];
  for (let i = 0; i <= 7; i++) {
    const a = -Math.PI / 2 + ((i * 3) % 7) * (TAU / 7);
    star.push([Math.cos(a) * RI, CY + Math.sin(a) * RI]);
  }
  paths.push(star);
  paths.push(circle(RI, -Math.PI / 2));
  paths.push(circle(RC, Math.PI / 2));
  paths.push([[0, CY - 3.5], [2, CY], [0, CY + 3.5], [-2, CY], [0, CY - 3.5]]);
  // sample every half pixel, timing the pen along it: the outer circle fast, the star with more weight
  const pts = [], speeds = [420, 700, 550, 380, 300];
  let t = 0.12;
  paths.forEach((path, k) => {
    for (let i = 1; i < path.length; i++) {
      const [x0, y0] = path[i - 1], [x1, y1] = path[i], L = Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d < L; d += 0.5) pts.push({ x: x0 + ((x1 - x0) * d) / L, y: y0 + ((y1 - y0) * d) / L, t: t + d / speeds[k] });
      t += L / speeds[k];
    }
    t += 0.04;
  });
  return { pts, end: t };
}

// seven small glyphs of our own: a spine and two or three branches on a 3x3 grid of nodes
function glyphs(seed) {
  return Array.from({ length: 7 }, (_, i) => {
    const r = rng(seed, i, 31), segs = [[[1, 0], [1, 2]]];
    for (let k = 0; k < 2 + (r.next() < 0.5 ? 1 : 0); k++) {
      const a = [r.int(0, 2), r.int(0, 2)], b = [Math.max(0, Math.min(2, a[0] + r.int(-1, 1))), Math.max(0, Math.min(2, a[1] + r.int(-1, 1)))];
      if (a[0] !== b[0] || a[1] !== b[1]) segs.push([a, b]);
    }
    const ang = -Math.PI / 2 + (i * TAU) / 7 + Math.PI / 7, rr = (RO + RI) / 2;
    return { x: Math.cos(ang) * rr, y: CY + Math.sin(ang) * rr, segs, t: GLYPH + i * 0.07 };
  });
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0, S = strokes(o.seed), G = glyphs(o.seed);
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[7], C[6], C[5]] });
  const embers = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]] });
  const puffs = new Puffs({ rng: R, flame: [WHITE, C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[0]], soot: [mix(C[3], C[2], 0.5), mix(C[2], C[1], 0.5)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor });
  const bits = new Bits({ ground: floor }), lights = [];
  let t = 0, pi = 0, flared = false, broke = false;
  const pen = () => S.pts[Math.min(S.pts.length - 1, pi)];
  return {
    update(dt) {
      t += dt;
      // the pen: it spits sparks and drips burning embers as it writes
      while (pi < S.pts.length - 1 && S.pts[pi + 1].t <= t) pi++;
      if (t > 0.12 && t < S.end) {
        const q = pen();
        if (R.chance(dt * 70)) ps.spawn(P.SPARK, q.x, q.y, R.range(-70, 70), R.range(-100, 20), R.range(0.12, 0.35));
        if (R.chance(dt * 10)) embers.spawn(P.EMBER, q.x, q.y, R.range(-12, 12), R.range(5, 25), R.range(0.5, 0.9));
      }
      // power drawn into the sigil while it's written and held: streaks racing in to its heart
      if (t > 0.2 && t < FLARE - 0.05 && R.chance(dt * (8 + 14 * smooth(0.2, FLARE, t)))) {
        const a = R.range(0, TAU), D0 = R.range(40, 60), T = R.range(0.22, 0.32), v = (D0 * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, Math.cos(a) * D0, CY + Math.sin(a) * D0, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[7] : C[6]);
      }
      for (const g of G)
        if (!g.popped && t >= g.t) {
          g.popped = true;
          lights.push({ x: g.x, y: g.y, r: 14, k: 0.7, life: 0.2, max: 0.2 });
          for (let i = 0; i < 4; i++) ps.spawn(P.SPARK, g.x, g.y, R.range(-60, 60), R.range(-70, 20), R.range(0.1, 0.25));
        }
      if (t >= FLARE && !flared) {
        flared = true;
        lights.push({ x: 0, y: CY, r: 96, k: 1.4, life: 0.45, max: 0.45 }, { x: 0, y: CY, r: 44, k: 1, life: 0.14, max: 0.14 });
        for (let i = 0; i < 24; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 130);
          ps.spawn(P.SPARK, Math.cos(a) * 13, CY + Math.sin(a) * 13, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.2, 0.45));
        }
      }
      if (t >= BREAK && !broke) {
        // it crumbles: every stroke breaks into burning fragments that tumble down and bounce
        broke = true;
        // pieces drop nearly straight at first, so the sigil's shape lingers as it falls apart
        for (let i = 0; i < S.pts.length - 1; i += 7) {
          const q = S.pts[i], n = S.pts[i + 1], a = Math.atan2(n.y - q.y, n.x - q.x);
          bits.add({ kind: B.SHARD, x: q.x, y: q.y, vx: R.range(-8, 8), vy: R.range(-12, 6), g: R.range(0.22, 0.45), drag: 0.6, bounce: 0.25, life: R.range(0.8, 1.2), a, va: R.range(-3, 3), s: R.range(2.5, 3.5), c: R.pick([C[7], C[6], C[6], C[5]]) });
          if (i % 27 === 0) embers.spawn(P.EMBER, q.x, q.y, R.range(-10, 10), -R.range(10, 40), R.range(0.6, 1.1));
        }
        for (const g of G) puffs.spawn(PK.SOOT, g.x, g.y, R.range(-6, 6), -R.range(8, 18), R.range(0.7, 1.1), R.range(3, 5));
        for (let i = 0; i < 8; i++) puffs.spawn(PK.SOOT, R.range(-20, 20), CY + R.range(-20, 20), R.range(-8, 8), -R.range(6, 16), R.range(0.8, 1.2), R.range(3, 6), R.range(0, 0.15));
      }
      for (let i = lights.length - 1; i >= 0; i--) if ((lights[i].life -= dt) <= 0) lights.splice(i, 1);
      bits.update(dt);
      ps.update(dt);
      embers.update(dt);
      puffs.update(dt);
    },
    drawBack(p) {
      puffs.draw(p, PK.SOOT, { x: 0, y: CY, k: broke ? 0.3 : 0, reach: 50 });
      const k = t < BREAK ? smooth(0.1, 0.6, t) : 1 - smooth(BREAK, BREAK + 0.6, t);
      if (k > 0) p.glow(0, CY, 52, C[4], 0.3 * k);
    },
    draw(p) {
      if (!broke) {
        // the traced lines: white where the pen just passed, cooling to violet; pulsing as it holds; white in the flare
        const hold = t > S.end ? 0.5 + 0.5 * Math.sin((t - S.end) * 9) : 0, white = t >= FLARE;
        for (const q of S.pts) {
          if (q.t > t) break;
          const age = t - q.t;
          p.px(q.x, q.y, white ? WHITE : age < 0.05 ? WHITE : age < 0.15 ? C[7] : age < 0.35 ? C[6] : hold > 0.75 ? C[6] : C[5]);
        }
        if (white) for (const q of S.pts) if (((q.x * 2) | 0) % 3 === 0) p.light(q.x, q.y, C[6], 0.5);
        // glyphs: each pops in white and settles
        for (const g of G) {
          if (t < g.t) continue;
          const age = t - g.t, col = white || age < 0.06 ? WHITE : age < 0.2 ? C[7] : hold > 0.75 ? C[7] : C[6];
          for (const [a, b] of g.segs) p.line(g.x - 2 + a[0] * 2, g.y - 2 + a[1] * 2, g.x - 2 + b[0] * 2, g.y - 2 + b[1] * 2, col);
          if (age < 0.18) ringFast(p, g.x, g.y, 2 + 4 * (age / 0.18), 1, age < 0.09 ? C[7] : C[5]);
          p.glow(g.x, g.y, 6, C[5], 0.25);
        }
        // the pen: a white-hot point with a little cross of light
        if (t > 0.12 && t < S.end + 0.05) {
          const q = pen();
          sparkle(p, q.x, q.y, 3 + Math.sin(t * 60), C[7], C[6], 0.6);
          p.glow(q.x, q.y, 16, C[6], 0.55);
        }
      }
      // the flare: a burst ring as it goes white
      const fu = (t - FLARE) / 0.35, bu = (t - FLARE) / 0.22;
      if (bu > 0 && bu < 1) sparkle(p, 0, CY, 18 * (1 - bu), C[7], C[5], 0.9 * (1 - bu));
      if (fu > 0 && fu < 1) ringFast(p, 0, CY, RO + 3 + 12 * ease.outCubic(fu), Math.max(1, 3 * (1 - fu)), fu < 0.4 ? WHITE : fu < 0.7 ? C[6] : C[4]);
      bits.draw(p);
      puffs.draw(p, PK.FLAME);
      ps.draw(p);
      embers.draw(p);
      for (const l of lights) {
        const q = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), l.k > 1 ? C[5] : C[6], l.k * q * q);
      }
    },
  };
}
