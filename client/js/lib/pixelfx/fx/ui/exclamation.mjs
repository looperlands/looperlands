import { Particles, Lights, P, Rng, fit, sparkle, clamp, seg, ease, TAU, WHITE, READY } from "../../core/index.mjs";

export const meta = {
  name: "Exclamation",
  desc: "A bold ! springs up off the hero's head, stretching as it shoots up and squashing as it lands; surprise ticks flick out, it wobbles, then pops away.",
  tags: ["ui", "alert", "surprise", "emote", "character", "one-shot"],
  size: [84, 104],
  origin: [42, 92],
  duration: 1.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#2a1405", "#6a2e06", "#b85a0a", "#f08c14", "#ffc23a", "#ffe580", "#fff6c8", "#ffffff"], seed: 3 },
};

const STARTLED = { turn: 1, y: -5, crouch: -1, fx: -14, fy: -34, bx: 15, by: -34, ffx: -3, ffy: -6, fbx: 4, fby: -6 };
export const act = {
  poses: [
    [-0.08, READY],
    [0, STARTLED, "snap"],
    [0.14, { ...STARTLED, y: 0, crouch: 4, ffy: -4, fby: -4, fy: -26, by: -26 }, "in"],
    [0.3, { turn: 1, fx: -10, fy: -23, bx: 11, by: -23, ffx: -3, fbx: 4 }],
    [1.1, { turn: 1, fx: -10, fy: -23, bx: 11, by: -23, ffx: -3, fbx: 4 }],
    [1.4, READY],
  ],
  dust: [{ t: 0.14, x: 0, n: 4 }],
};

const HEAD = -40, REST = -45, POP = 1.1;

// the mark: a bar that tapers to its foot and a round dot, with a dark outline, lit down its left side,
// turned by a about its foot
function bang(p, C, x, y, sx, sy, a, white) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const hw = (V) => 2.3 + (-V - 10) * 0.09;
  const inBar = (U, V) => V > -24 && V < -9.5 && Math.abs(U) < hw(V);
  const inDot = (U, V) => Math.hypot(U, V + 3.6) < 3.3;
  const inside = (U, V) => inBar(U, V) || inDot(U, V);
  p.shade(x - 16, y - 34, x + 16, y + 6, (px, py) => {
    const dx = px - x, dy = py - y, u = (dx * ca + dy * sa) / sx, v = (-dx * sa + dy * ca) / sy, ex = 1 / sx, ey = 1 / sy;
    if (!inside(u, v)) return inside(u - ex, v) || inside(u + ex, v) || inside(u, v - ey) || inside(u, v + ey) ? C[0] : undefined;
    if (white) return WHITE;
    if (inDot(u, v)) return Math.hypot(u + 1.2, v + 4.8) < 1.2 ? WHITE : u + v + 3.6 < -0.5 ? C[6] : u + v + 3.6 < 1.5 ? C[5] : C[4];
    const w = hw(v), q = (u + w) / (2 * w);
    if (q < 0.28) return v < -20 ? WHITE : C[7];
    if (q > 0.74) return C[4];
    return v < -18 ? C[6] : v < -13 ? C[5] : C[5];
  });
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), lights = new Lights();
  // the mark's foot: shot up off the head with a spring, so it overshoots and settles
  const m = { y: HEAD, vy: -420, sq: 0, landed: false };
  let t = 0, popped = false, sprung = false;
  const end = meta.duration - 0.05;
  return {
    update(dt) {
      t += dt;
      if (t < POP) {
        // a stiff spring pulls it to its rest above the head
        m.vy += (-(m.y - REST) * 900 - m.vy * 14) * dt;
        m.y += m.vy * dt;
        if (!m.landed && m.vy > 0) (m.landed = true), (m.sq = 1);
      }
      m.sq = Math.max(0, m.sq - dt / 0.12);
      // it leaves the head with a little burst of light
      if (!sprung && t >= 0.04) {
        sprung = true;
        lights.add(0, HEAD - 4, 26, C[5], 0.6, 0.25);
        for (let i = 0; i < 8; i++) {
          const an = -Math.PI / 2 + R.range(-1.3, 1.3), sp = R.range(40, 90);
          ps.spawn(P.STAR, R.range(-4, 4), HEAD - 2, Math.cos(an) * sp, Math.sin(an) * sp, R.range(0.2, 0.4), R.pick([C[7], C[6], C[5]]), i % 3 ? 0.6 : 1.3);
        }
      }
      if (!popped && t >= POP + 0.05) {
        popped = true;
        lights.add(0, REST - 13, 28, C[5], 0.5, 0.2);
        for (let i = 0; i < 7; i++) {
          const an = (i / 7) * TAU + R.range(-0.2, 0.2), sp = R.range(30, 60);
          ps.spawn(P.STAR, Math.cos(an) * 5, REST - 13 + Math.sin(an) * 9, Math.cos(an) * sp, Math.sin(an) * sp, Math.min(R.range(0.2, 0.35), end - t), R.pick([C[7], C[6], C[5]]), i % 3 ? 0.6 : 1.4);
        }
      }
      ps.update(dt);
      lights.update(dt);
    },

    draw(p) {
      const k = t;
      // surprise ticks: three flick out each side on the spring, and again on a second beat
      for (const [t0, len] of [[0.04, 6], [0.48, 4.5]]) {
        const u = (k - t0) / 0.24;
        if (u <= 0 || u >= 1) continue;
        for (const s of [-1, 1])
          for (let i = 0; i < 3; i++) {
            const an = -Math.PI / 2 + s * (0.55 + i * 0.42), r0 = 14 + 7 * ease.outCubic(u), L = len * Math.sin(u * Math.PI) * (i === 1 ? 1 : 0.75);
            const cx = 0, cy = REST - 13, ca = Math.cos(an), sa = Math.sin(an);
            if (L < 0.8) continue;
            p.line(cx + ca * r0, cy + sa * r0, cx + ca * (r0 + L), cy + sa * (r0 + L), (q) => (q < 0.5 ? WHITE : C[5]));
          }
      }
      // the mark: stretched while it shoots up, squashed as it lands, wobbling, white on the pop
      const pu = (k - POP) / 0.06;
      if (pu < 1) {
        const speed = Math.min(1, Math.abs(m.vy) / 420), up = m.vy < 0 ? speed : 0;
        let sx = 1 - 0.3 * up + 0.3 * m.sq, sy = 1 + 0.45 * up - 0.28 * m.sq;
        if (k < 0.05) (sx *= k / 0.05), (sy *= k / 0.05);
        if (pu > 0) (sx = sy = 1 + 0.3 * pu);
        const wob = 0.28 * Math.exp(-k * 4) * Math.sin(k * 26), white = k < 0.06 || pu > 0;
        if (sx > 0.1) bang(p, C, 0, m.y, sx, sy, wob, white);
        p.glow(0, m.y - 13, 20, C[5], 0.35 + (white ? 0.3 : 0));
        if (k > 0.6 && k < 0.85) sparkle(p, -3, m.y - 22, 3.5 * Math.sin(((k - 0.6) / 0.25) * Math.PI), C[7], C[6], 0.4);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
