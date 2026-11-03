// The release (flash, rings, flare, light) and the arcs are adapted from Sprite Fusion's open-source energy
// (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, rng, fit, band, bolt, forks, flare, sparkle, clamp, smooth, ease, noise, TAU, WHITE } from "../../core/index.mjs";
import { cull } from "./_lib.mjs";

export const meta = {
  name: "Plasma explosion",
  desc: "A blue-violet energy blast with no smoke: a white flash, a ball of plasma swelling into a thinning shell, shock rings in and out of depth, lightning arcs crackling off it.",
  tags: ["explosion", "plasma", "energy", "electric", "magic", "sci-fi", "one-shot"],
  size: [224, 200],
  origin: [112, 100],
  duration: 1.7,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#0a0828", "#1a1c6e", "#2c3cc0", "#4a7cf0", "#7cc0ff", "#c8ecff", "#ffffff"],
    accent: ["#1c0a30", "#4a1a8c", "#8a3ce0", "#c48cff", "#f0d8ff"],
    seed: 7,
  },
};

const BALL = 0.55;

export function create(o) {
  const C = fit(o.palette, 7), V = fit(o.accent, 5), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [C[6], C[5], C[4], V[3]] }), lights = new Lights();
  lights.add(0, 0, 96, C[4], 1, 0.6);
  lights.add(0, 0, 40, WHITE, 0.9, 0.1);
  lights.add(0, 0, 70, V[2], 0.5, 1.1);
  for (let i = 0; i < 46; i++) {
    const a = R.range(0, TAU), sp = R.range(140, 360);
    ps.spawn(P.MOTE, Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.42), R.pick([C[6], C[5], C[4], V[3]]), R.range(0.7, 1.1));
  }
  for (let i = 0; i < 26; i++) {
    const a = R.range(0, TAU), sp = R.range(40, 140);
    ps.spawn(P.FLAKE, Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.8, 1.5), R.pick([C[5], V[3], V[4]]), R.range(0.6, 1.6));
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      // the shell sheds sparkles and motes as it thins
      if (t > 0.12 && t < 0.9 && R.chance(30 * dt)) {
        const a = R.range(0, TAU), r = shell(t);
        ps.spawn(P.STAR, Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * R.range(10, 40), Math.sin(a) * R.range(10, 40), R.range(0.3, 0.6), R.chance(0.5) ? C[5] : V[4], R.range(0.5, 1.8));
      }
      ps.update(dt);
      cull(ps, -meta.origin[0] + 3, -meta.origin[1] + 3, meta.size[0] - meta.origin[0] - 3, meta.size[1] - meta.origin[1] - 3);
      lights.update(dt);
    },
    drawBack(p) {
      // the tilted ring's far half, behind the ball
      tilted(p, t, C, V, true);
    },
    draw(p) {
      // the ball: a white heart, cyan and blue bands, a violet rim boiling at the edge; it swells, then hollows out
      if (t < BALL) {
        const u = t / BALL, r = shell(t), hollow = smooth(0.35, 1, u), boil = Math.floor(t * 20);
        p.shade(-r - 3, -r - 3, r + 3, r + 3, (x, y, out) => {
          const d = Math.hypot(x, y), a = Math.atan2(y, x), edge = r * (1 + 0.1 * noise(a * 3 + boil * 0.7, 3));
          if (d > edge) return;
          const v = d / edge;
          if (v < hollow * 0.92) return;
          // turbulent bands swirling round the heart, and bright filaments twisting through them
          const n = noise(a * 4 + d * 0.25 + boil * 0.5, 5), w = v + n * 0.14, fil = Math.abs(Math.sin(a * 5 + d * 0.32 - t * 14 + n * 2.5)) < 0.1;
          out.k = 0.25 * (1 - u);
          if (v > 0.9) return V[2];
          if (fil && v > 0.3) return u < 0.5 ? WHITE : C[5];
          return w < 0.32 - u * 0.25 ? WHITE : w < 0.52 ? C[5] : w < 0.72 ? C[4] : w < 0.86 ? (u < 0.5 ? C[3] : V[3]) : V[2];
        });
        p.glow(0, 0, r * 1.6 + 6, C[4], 0.6 * (1 - u));
      }
      if (t < 0.07) p.circle(0, 0, 9 - t * 60, WHITE);
      if (t < 0.25) flare(p, 0, 0, 52 * Math.pow(1 - t / 0.25, 1.3), 1 - t / 0.25, C);
      // shock rings: a fast bright one, a slower violet one
      const u1 = t / 0.42;
      if (u1 < 1) {
        p.ring(0, 0, 8 + 84 * ease.outCubic(u1), Math.max(1, 3 * (1 - u1)), u1 < 0.25 ? WHITE : C[5], 1.15 - u1);
        p.glowRing(0, 0, 8 + 84 * ease.outCubic(u1), 5, C[4], 0.35 * (1 - u1));
      }
      const u2 = (t - 0.06) / 0.6;
      if (u2 > 0 && u2 < 1) p.ring(0, 0, 6 + 60 * ease.outCubic(u2), Math.max(1, 2 * (1 - u2)), V[3], 1.1 - u2);
      // arcs: lightning crackling out of the heart, re-struck every few frames, shorter as the charge runs out
      const left = 1 - smooth(0.15, 0.85, t), strike = Math.floor(t * 18);
      if (left > 0) {
        const r = rng(o.seed, strike, 17), n = 2 + Math.round(4 * left);
        for (let i = 0; i < n; i++) {
          const a = r.range(0, TAU), L = r.range(26, 58) * (0.45 + 0.55 * left), path = bolt(r, 0, 0, Math.cos(a) * L, Math.sin(a) * L, { jag: 0.28, depth: 4 });
          arc(p, path, C, V, 0.8 * left);
          if (r.chance(0.5)) for (const f of forks(r, path, { count: 1, len: 14, jag: 0.35 })) arc(p, f, C, V, 0.5 * left);
        }
        // and little arcs crawling over the shell
        const rs = shell(t);
        for (let i = 0; i < 3; i++) {
          const a = r.range(0, TAU), b = a + r.range(0.3, 0.6);
          arc(p, bolt(r, Math.cos(a) * rs, Math.sin(a) * rs, Math.cos(b) * rs, Math.sin(b) * rs, { jag: 0.4, depth: 3 }), C, V, 0.6 * left);
        }
      }
      tilted(p, t, C, V, false);
      ps.draw(p);
      lights.draw(p);
    },
  };
}

// the ball's radius: punched out fast, then easing
function shell(t) {
  return 5 + 30 * ease.outCubic(clamp(t / BALL));
}

// a ring on a tilted plane racing out round the blast: far half behind, near half in front
function tilted(p, t, C, V, back) {
  const u = (t - 0.03) / 0.5;
  if (u <= 0 || u >= 1) return;
  band(p, 0, 4, 12 + 86 * ease.outCubic(u), 0.28, Math.max(1, 4 * (1 - u)), 1.15 - u, [V[1], V[2], C[4], C[5]], (g) => (Math.sin(g) < 0) === back, u < 0.15);
}

// one arc: a soft glow along it, a cyan halo line, a white core
function arc(p, path, C, V, k) {
  if (k <= 0.05) return;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i];
    p.glowLine(ax, ay, bx, by, 5, V[2], 0.18 * k);
    p.line(ax + 1, ay, bx + 1, by, C[4], k * 0.8);
    p.line(ax, ay, bx, by, i < path.length * 0.6 ? WHITE : C[5], Math.min(1, k * 1.4));
  }
}
