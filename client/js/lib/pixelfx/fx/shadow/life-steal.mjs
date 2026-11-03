import { Particles, P, Rng, fit, sparkle, clamp, smooth, ease, TAU, WHITE, mix, luma, READY } from "../../core/index.mjs";
import { ringFast, Drops } from "./_lib.mjs";

export const meta = {
  name: "Life steal",
  desc: "A target on the right is struck and bleeds red orbs; they hang a moment, then whip home as comet streaks and flood the caster crimson.",
  tags: ["shadow", "life-steal", "drain", "blood", "heal", "directional", "magic", "one-shot"],
  size: [184, 100],
  origin: [36, 92],
  duration: 2.2,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a", "#ffe6de"], dark: "#2a1040", seed: 11 },
};

const GRASP = { ...READY, crouch: 3, lean: 3, fx: 17, fy: -28, bx: -6, by: -21, ffx: 10, fbx: -9 };
const FED = { turn: 1.15, crouch: 0, lean: -3, hy: -1, fx: -13, fy: -37, bx: 14, by: -37, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  follow: 0,
  target: { x: 104 },
  poses: [
    [-0.46, READY],
    [-0.2, { ...READY, crouch: 4, lean: -2, fx: 3, fy: -27, bx: 8, by: -20 }],
    [0, GRASP, "snap"],
    [0.4, GRASP],
    [0.7, { ...GRASP, fx: 13, fy: -26, lean: 1 }],
    [0.8, { ...FED, crouch: 2 }, "snap"],
    [1.22, FED],
    [1.7, { turn: 1, crouch: 2, fx: -11, fy: -26, bx: 12, by: -26, ffx: -3, fbx: 4 }],
    [2.2, READY],
  ],
  hits: [
    { t: 0.01, stop: 0.07, shake: 0.12, amp: 1, push: 1.6, straw: 12, skin: "red", y: -24 },
    { t: 1.6, push: 0, straw: 0, flash: 0, skin: null },
  ],
};

// the target point on the right, the caster's heart; when the orbs turn for home
const TX = 104, TY = -24, HX = 1, HY = -20, N = 7;

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), A = o.actor, floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[7], C[6], C[5]] });
  const drops = new Drops({ onLand: (x) => stains.push({ x, t0: t }) }), stains = [], lights = [];
  const orbs = [];
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i - (N - 1) / 2) * 0.4 + R.range(-0.12, 0.12), sp = R.range(100, 170);
    orbs.push({ x: TX, y: TY, vx: Math.cos(a) * sp + 10, vy: Math.sin(a) * sp, home: 0.36 + i * 0.05 + R.range(0, 0.04), trail: [], done: false, at: 0, size: R.range(1.6, 2.4) });
  }
  let t = 0, hit = false, flush = 0;
  const light = (x, y, r, c, k, life) => lights.push({ x, y, r, c, k, life, max: life });

  return {
    update(dt) {
      t += dt;
      if (!hit) {
        hit = true;
        light(TX, TY, 54, C[5], 1, 0.35);
        light(TX, TY, 18, WHITE, 1, 0.08);
        for (let i = 0; i < 14; i++) drops.add(TX + R.range(-3, 3), TY + R.range(-3, 3), R.range(-40, 90), R.range(-140, -20), R.chance(0.4) ? 2 : 1);
        for (let i = 0; i < 12; i++) {
          const a = R.range(0, TAU), sp = R.range(80, 170);
          ps.spawn(P.SPARK, TX, TY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.35));
        }
      }
      for (const b of orbs) {
        if (b.done) continue;
        if (t < b.home) {
          // burst out, slowing to a hover
          b.vx -= b.vx * 5 * dt;
          b.vy -= b.vy * 5 * dt;
        } else {
          // whip home: steer hard at the caster's heart, faster and faster
          const dx = HX - b.x, dy = HY - b.y, d = Math.hypot(dx, dy) || 1, pull = 2600 * Math.min(1, (t - b.home) * 3);
          b.vx += (dx / d) * pull * dt;
          b.vy += (dy / d) * pull * dt;
          b.vx -= b.vx * 2.2 * dt;
          b.vy -= b.vy * 2.2 * dt;
          if (d < 6) {
            b.done = true;
            b.at = t;
            flush = Math.min(1.5, flush + 0.45);
            light(HX, HY, 30, C[5], 0.8, 0.25);
            for (let i = 0; i < 6; i++) {
              const a = R.range(0, TAU), sp = R.range(40, 100);
              ps.spawn(P.SPARK, HX, HY, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.12, 0.3));
            }
            for (let i = 0; i < 3; i++) ps.spawn(P.EMBER, HX + R.range(-8, 8), HY + R.range(-6, 14), R.range(-10, 10), -R.range(15, 35), R.range(0.6, 1.1), C[6]);
          }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.trail.unshift([b.x, b.y]);
        if (b.trail.length > 26) b.trail.pop();
      }
      flush -= flush * 2.6 * dt;
      for (let i = lights.length - 1; i >= 0; i--) if ((lights[i].life -= dt) <= 0) lights.splice(i, 1);
      for (let i = stains.length - 1; i >= 0; i--) if (t - stains[i].t0 > 0.8) stains.splice(i, 1);
      drops.update(dt);
      ps.update(dt);
    },
    drawBack(p) {
      // the wound: a dark red bloom where the target was struck, thinning away
      const k = 1 - smooth(0.1, 0.9, t);
      if (k > 0) {
        p.disc(TX, TY, 6 + t * 10, C[2], 0.5 * k);
        p.glow(TX, TY, 30, C[4], 0.35 * k);
      }
      for (const s of stains) p.dot(s.x, -0.5, C[3], 1 - (t - s.t0) / 0.8);
    },
    draw(p) {
      // the caster flushes crimson as the orbs land: its own colours pushed toward blood-red, a hot outline
      const fk = Math.min(1, flush) * (1 - smooth(1.5, 2.05, t));
      if (A && fk > 0.03) {
        for (let my = 0; my < A.h; my++)
          for (let mx = 0; mx < A.w; mx++) {
            const c0 = A.pixels[my * A.w + mx];
            if (!c0) continue;
            const l = luma(c0);
            p.blend(A.x + mx, A.y + my, l > 0.6 ? C[6] : l > 0.4 ? C[5] : l > 0.2 ? C[4] : C[3], 0.45 * fk);
          }
        if (fk > 0.12) p.outline(A.mask, A.x, A.y, fk > 0.6 ? C[6] : fk > 0.3 ? C[5] : C[3]);
        p.glow(HX, HY, 28, C[5], 0.45 * fk);
      }
      // the hit on the target
      if (t < 0.12) sparkle(p, TX, TY, 10 * (1 - t / 0.12), C[7], C[5], 0.6);
      const ru = t / 0.28;
      if (ru < 1) ringFast(p, TX, TY, 4 + 16 * ease.outCubic(ru), Math.max(1, 2 * (1 - ru)), ru < 0.4 ? C[7] : C[5]);
      drops.draw(p, C[3], C[6]);
      // the orbs: comet tails tapering from a hot head through blood-red to a dark wine thread
      for (const b of orbs) {
        if (b.done && t - b.at > 0.2) continue;
        // the tail is swallowed after the head: it shortens rather than fades
        const n = b.done ? Math.floor(b.trail.length * (1 - (t - b.at) / 0.2)) : b.trail.length;
        for (let i = n - 1; i >= 1; i--) {
          const u = i / 25, [x0, y0] = b.trail[i - 1], [x1, y1] = b.trail[i];
          p.line(x1, y1, x0, y0, u < 0.15 ? C[7] : u < 0.35 ? C[6] : u < 0.6 ? C[5] : u < 0.8 ? C[4] : C[2]);
          if (i < 7) p.disc(x1, y1, (b.size + 0.4) * (1 - i / 7), u < 0.12 ? C[6] : C[5], 0.8);
          if (i % 6 === 3) p.glow(x1, y1, 6, C[5], 0.2 * (1 - u));
        }
        if (b.done) continue;
        const pulse = t < b.home ? 0.8 + 0.2 * Math.sin(t * 30 + b.size * 9) : 1;
        p.circle(b.x, b.y, b.size + 0.9, C[4]);
        p.circle(b.x, b.y, b.size * pulse, C[6]);
        p.px(b.x - 0.5, b.y - 0.5, WHITE);
        p.glow(b.x, b.y, 9, C[5], 0.5);
      }
      ps.draw(p);
      for (const l of lights) {
        const q = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), l.c, l.k * q * q);
      }
    },
  };
}
