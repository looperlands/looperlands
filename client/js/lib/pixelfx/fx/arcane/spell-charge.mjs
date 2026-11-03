// The charge recipe (motes spiralling in, pulse rings collapsing onto a layered ball with flickering rays, short
// crackling sparks) is adapted from Sprite Fusion's open-source energy charge
// (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { PAL, fit, cycle, rng, loopNoise, smooth, ease, sparkle, TAU, WHITE, READY } from "../../core/index.mjs";
import { mote, streak, arc, drawArc } from "./_lib.mjs";

const D = 1.6, HX = 15, HY = -22, RINGS = 4, RT = 0.5;

export const meta = {
  name: "Spell charge",
  desc: "Energy gathers in the caster's hand: streaks and motes spiral in, rings collapse into a swelling orb that crackles with arcs, ready to fire.",
  tags: ["arcane", "charge", "spell", "orb", "cast", "magic", "loop"],
  size: [120, 86],
  origin: [44, 80],
  duration: D,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: PAL.arcane, seed: 5 },
};

const HOLD = { ...READY, x: -3, crouch: 4, lean: 2, fx: 18, fy: -22, bx: 11, by: -17, ffx: 10, fbx: -8 };
export const act = {
  poses: [
    [-0.46, { ...READY, x: -3 }],
    [-0.12, { ...HOLD, crouch: 3 }],
    [0, HOLD],
    [0.4, { ...HOLD, crouch: 5 }],
    [0.8, { ...HOLD, lean: 3 }],
    [1.2, { ...HOLD, crouch: 5 }],
    [1.6, HOLD],
  ],
};

// each ring is born at k * D / RINGS and lands RT later; the times it lands, wrapped into the loop
const landings = Array.from({ length: RINGS }, (_, k) => (k * D) / RINGS + RT);
const sinceLast = (t) => Math.min(...landings.map((l) => ((((t - l) % D) + D) % D)));

function orb(p, C, x, y, r, t, ph) {
  // rays flickering round the ball, turning three steps a loop
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + ph * (TAU / 8) * 3, l = (1.5 + 4.5 * Math.abs(loopNoise(ph, 3, i * 7 + 1))) * (i % 2 ? 0.7 : 1);
    const x0 = x + Math.cos(a) * (r + 1.2), y0 = y + Math.sin(a) * (r + 1.2);
    p.line(x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, (u) => (u < 0.4 ? C[6] : i % 2 ? C[4] : C[5]), (u) => (u < 0.6 ? 1 : 1.6 - u));
  }
  // the ball: a violet rim, a bright body lit from the top left, a big white heart
  p.circle(x, y, r + 1.3, C[4]);
  p.circle(x, y, r + 0.3, C[5]);
  p.circle(x - r * 0.12, y - r * 0.12, r * 0.8, C[6]);
  p.circle(x, y, r * 0.5, WHITE);
  // filaments crackling out from the heart through the body to the shell, new ones every other frame
  const R = rng(Math.floor(t * 15), 77);
  for (let i = 0; i < 3; i++) {
    const a = R.range(0, TAU), pts = arc(R, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, x + Math.cos(a + R.range(-0.6, 0.6)) * (r + 0.6), y + Math.sin(a + R.range(-0.6, 0.6)) * (r + 0.6), { jag: 0.45, forks: 0 })[0].pts;
    p.polyline(pts, (u) => (u < 0.6 ? WHITE : C[6]));
  }
  // a glint on the shell
  p.px(x - r * 0.5, y - r * 0.62, WHITE);
}

function ringAt(p, C, x, y, rr, sy, rot, q) {
  const n = Math.ceil(rr * TAU * 1.4), c = Math.cos(rot), s = Math.sin(rot);
  const col = q > 0.85 ? WHITE : q > 0.55 ? C[6] : C[5], a = Math.min(1, q * 3);
  for (let j = 0; j < n; j++) {
    const g = (j / n) * TAU, lx = Math.cos(g) * rr, ly = Math.sin(g) * rr * sy, px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (py > -0.5) continue; // the floor hides the bottom of a big ring
    p.dot(px, py, col, a);
    if (j % 10 === 0) p.glow(px, py, 5, C[5], 0.12 * a);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, S = o.seed, f = Math.floor(t * 30);
  const since = sinceLast(t), swell = Math.exp(-((since / 0.07) ** 2)) + 0.5 * Math.exp(-((since / 0.18) ** 2));
  const r = 6.1 + 0.5 * Math.sin(ph * TAU * 4) + 1.4 * swell;
  // unstable: it shivers a pixel as each ring lands
  const jit = swell > 0.4 ? (f % 2 ? 1 : -1) : 0, x = HX + jit, y = HY;

  // streaks spiralling in from all round, faster as they near the hand
  cycle(t, D, 110, S * 3 + 1, (g) => g.range(0.2, 0.34), (age, life, R) => {
    // they come from the left, above and the upper right; the swirl would carry the rest into the floor
    const a0 = R.range(2.8, 5.75), d0 = R.range(20, 52), spin = R.range(0.6, 1.3);
    const pos = (q) => {
      const a = a0 + spin * q * q, d = d0 * (1 - q * q) + r;
      return [HX + Math.cos(a) * d, HY + Math.sin(a) * d * 0.92];
    };
    const q = age / life, [px, py] = pos(q), [qx, qy] = pos(Math.min(1, q + 0.02));
    // their light dies as they reach the orb, so it isn't washed out by them
    streak(p, px, py, (qx - px) / (0.02 * life), (qy - py) / (0.02 * life), R.chance(0.55) ? C[6] : C[5], Math.min(1, q * 4) * (1 - smooth(0.9, 1, q)), 7, 0.4 * (1 - smooth(0.6, 0.9, q)));
  });
  // slower motes, drifting in on the same swirl
  cycle(t, D, 56, S * 3 + 2, (g) => g.range(0.4, 0.7), (age, life, R) => {
    const a0 = R.range(2.6, 5.2), d0 = R.range(12, 32), spin = R.range(1, 2.2), size = R.range(0.6, 1);
    const pos = (q) => {
      const a = a0 + spin * q, d = d0 * (1 - ease.inQuad(q)) + r;
      return [HX + Math.cos(a) * d, HY + Math.sin(a) * d];
    };
    const q = age / life, [px, py] = pos(q), [qx, qy] = pos(Math.min(1, q + 0.02));
    mote(p, px, py, (qx - px) / (0.02 * life), (qy - py) / (0.02 * life), R.pick([C[5], C[6], C[6], WHITE]), size, Math.min(1, q * 3) * (q > 0.9 ? (1 - q) / 0.1 : 1), 0.3 * (1 - smooth(0.55, 0.85, q)));
  });

  // rings collapsing onto the orb, each tilted its own way
  for (let k = 0; k < RINGS; k++)
    for (const off of [-D, 0]) {
      const q = (t - (k * D) / RINGS - off) / RT;
      if (q < 0 || q >= 1) continue;
      const rr = r + 1.5 + 22 * (1 - ease.inQuad(q)), shape = [[1, 0], [0.38, 0.55], [1, 0], [0.42, -0.7]][k];
      ringAt(p, C, x, y, rr, shape[0], shape[1], q);
    }

  orb(p, C, x, y, r, t, ph);

  // arcs crackling off it, new ones every other frame
  const w = Math.floor(f / 2), Rw = rng(S, w, 3), n = (Rw.next() < 0.6 ? 1 : 0) + (swell > 0.3 ? 1 : 0), fresh = f % 2 === 0 ? 0.8 : 0.4;
  for (let i = 0; i < n; i++) {
    const a = Rw.range(0, TAU), L = Rw.range(5, 10) * (1 + swell * 0.4), a1 = a + Rw.range(-0.5, 0.5);
    const x0 = x + Math.cos(a) * (r + 0.5), y0 = y + Math.sin(a) * (r + 0.5), x1 = x0 + Math.cos(a1) * L, y1 = Math.min(-2, y0 + Math.sin(a1) * L);
    drawArc(p, arc(Rw, x0, y0, x1, y1, { jag: 0.35, forks: Rw.next() < 0.5 ? 1 : 0 }), { core: WHITE, body: C[5], halo: C[3], glow: C[5] }, fresh, 0.3);
  }
  // glints winking round it
  cycle(t, D, 7, S * 3 + 4, 0.22, (age, life, R) => {
    const a = R.range(0, TAU), d = R.range(r + 5, r + 15), k = Math.sin((age / life) * Math.PI);
    sparkle(p, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, 1 + 2.5 * k, C[6], C[4], 0.4 * k);
  });
  if (since < 0.07) sparkle(p, x, y, 4 + 6 * (1 - since / 0.07), C[6], C[5], 0.5);

  // light: a wide pool that lights the caster, a hot heart, the floor beneath the hand
  const pulse = 0.85 + 0.15 * Math.sin(ph * TAU * 4) + 0.2 * swell;
  p.glow(x, y, 46, C[4], 0.26 * pulse);
  p.glowRing(x, y, r + 3, 8, C[5], 0.3 * pulse);
  p.glow(x, y, r, C[6], 0.12);
  p.glow(HX, -1, 22, C[5], 0.16 * pulse);
}
