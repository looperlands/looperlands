// The crescent and its cooling ramp are adapted from Sprite Fusion's open-source slash
// (https://www.spritefusion.com/pixel-art-vfx/slash), and the impact star, dust, grit and embers from his
// impact and explosion (https://www.spritefusion.com/pixel-art-vfx), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, sparkle, band, clamp, smooth, ease, rand, TAU, WHITE, READY } from "../../core/index.mjs";
import { swing, onSwing, smear, trace, glowAlong, stone, rock, cracks, star, sliver, along } from "./_lib.mjs";

export const meta = {
  name: "Heavy cleave",
  desc: "A glint over the head, then a thick ember arc accelerates over the top into the floor: a white slam, glowing cracks, dust rolling both ways, grit and rising embers.",
  tags: ["melee", "slash", "cleave", "axe", "heavy", "ground", "fire", "combat", "directional", "one-shot"],
  size: [208, 116],
  origin: [68, 96],
  duration: 1.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#2a0c10", "#5c1414", "#a3241a", "#e0481c", "#ff8a2a", "#ffc23d", "#fff0a0", "#ffffff"],
    stone: "#4a3f69",
    seed: 5,
  },
};

const REST_ = { ...READY, weapon: "greatsword", two: true, sa: -1, fx: 11, fy: -21 };
const OVER = { ...REST_, x: -4, crouch: 2, lean: -2, fx: 1, fy: -42, sa: -2.45, ffx: 8, fbx: -7 };
const FLOOR = { ...REST_, x: 0, crouch: 7, lean: 6, fx: 17, fy: -21, sa: 0.72, ffx: 11, fbx: -10, toeB: true };
export const act = {
  target: { x: 66 },
  poses: [
    [-0.42, { ...REST_, x: -4 }],
    [-0.3, { ...REST_, x: -3, crouch: 4, fx: 13, fy: -29, sa: -1.3 }],
    [-0.12, { ...OVER, crouch: 4 }],
    [0.2, { ...OVER, crouch: 3 }],
    [0.27, { ...REST_, x: -1, y: -2, crouch: 0, lean: 2, fx: 11, fy: -42, sa: -1.45, ffx: 10, ghost: 1 }, "snap"],
    [0.31, { ...REST_, x: 0, y: -1, crouch: 3, lean: 4, fx: 18, fy: -33, sa: -0.45, ffx: 12, ghost: 1 }, "snap"],
    [0.335, FLOOR, "snap"],
    [0.85, { ...FLOOR, crouch: 6, lean: 5 }],
    [1.3, { ...REST_, x: -2, crouch: 4, lean: 2, fx: 15, fy: -23, sa: 0.1 }],
    [1.7, { ...REST_, x: -4 }],
  ],
  hits: [{ t: 0.335, stop: 0.2, shake: 0.34, amp: 3, push: 3.2, straw: 28, y: -8 }],
  dust: [{ t: 0.335, x: 18, n: 8, dir: 1 }, { t: 0.335, x: -12, n: 5, dir: -1 }],
};

const RAISE = 0.2; // the glint over the head
const SWING = 0.135; // the arc accelerates over the top
const HIT = RAISE + SWING;
const HOLD = 0.05, TRAIL = 0.22;
const head = (t) => ease.inQuad(clamp((t - RAISE) / SWING)); // fraction of the arc the edge has made
const passedAt = (f) => RAISE + SWING * Math.sqrt(clamp(f)); // when the edge passed fraction f

export function create(o) {
  const C = fit(o.palette, 8), n = C.length, R = new Rng(o.seed), st = stone(o.stone), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights();
  // the arc: from behind the head, over the top, down into the floor in front
  const A = swing({ cx: 3, cy: -22, R: 37, sy: 0.88, rot: 0.32, a0: -2.45, dir: 1 });
  let U1 = 0;
  while (onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4) U1 += 0.005;
  const E = { ...A, R: A.R * 0.76 }, W = 16, WE = 5;
  const [X] = onSwing(A, A.R - 2, U1), GLINT = onSwing(A, A.R - 3, 0);
  const lines = cracks(R, X, 4, 40, 7, 0.4);
  // the impact star: long spikes along the floor, shorter ones up
  const spikes = [-Math.PI, -2.7, -2.15, -1.62, -1.05, -0.45, 0].map((a, i) => ({ a: a + R.range(-0.08, 0.08), len: (i === 0 || i === 6 ? 20 : i === 3 ? 15 : 9) + R.range(0, 4), w: 1.6 + R.range(0, 0.6) }));
  const shards = [-2.5, -1.9, -1.2, -0.6].map((a) => ({ a: a + R.range(-0.15, 0.15), r: 8 + R.range(0, 3), v: R.range(80, 130), arc: R.range(0.35, 0.6) }));
  let t = 0, hit = false;

  const arc = (p, s, w0, lag, rim) => {
    const tt = t - lag, U = U1 * head(tt), T = U1 * smooth(HIT + HOLD, HIT + HOLD + TRAIL, tt);
    if (U < 0.02 || T >= U - 0.02) return;
    const gone = smooth(HIT + HOLD, HIT + HOLD + TRAIL, tt), shrink = 1 - 0.75 * gone;
    smear(p, s, T, U, w0, (u, r, out) => {
      const age = Math.max(0, tt - passedAt(u / U1)), v = (u - T) / (U - T);
      const w = w0 * shrink * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
      if (w < 0.4) return;
      const q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      const ci = rim && q < 0.22 && age < 0.12 ? 0 : Math.round(q * (n - 1) * 0.62 + age * 7 + Math.max(0, tt - HIT) * 10 - v * 0.8 + (rim ? 0.7 : 1.7));
      out.c = C[n - 1 - clamp(ci, 0, n - 1)];
      out.a = Math.min(1, v / 0.35) * (1.2 - gone);
    });
    if (rim) glowAlong(p, s, s.R - w0 * 0.4, T, U, 7 + w0 * 0.5, C[4], (u) => 0.26 * Math.exp(-Math.max(0, tt - passedAt(u / U1)) / 0.2) * ((u - T) / (U - T)));
  };

  return {
    update(dt) {
      t += dt;
      // heat gathers to the raised blade
      if (t < RAISE - 0.04 && R.chance(0.35)) {
        const a = R.range(0, TAU), D = R.range(14, 26), T = R.range(0.14, 0.2), v = (D * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, GLINT[0] + Math.cos(a) * D, GLINT[1] + Math.sin(a) * D, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[5] : C[4]);
      }
      // embers shed off the edge as it comes over
      if (t > RAISE && t < HIT && R.chance(0.7)) {
        const u = U1 * head(t) * R.range(0.6, 1), [x, y] = onSwing(A, A.R - R.range(0, 6), u);
        ps.spawn(P.EMBER, x, y, R.range(-20, 20), R.range(-40, -10), R.range(0.5, 1.1), C[4], R.range(1, 2));
      }
      if (!hit && t >= HIT) {
        hit = true;
        lights.add(X, -6, 26, WHITE, 0.9, 0.1);
        lights.add(X, -12, 64, C[4], 0.5, 0.8);
        // sparks fan up off the floor, most of them forward
        for (let i = 0; i < 26; i++) {
          const a = -Math.PI / 2 + R.range(-1.2, 1.35), sp = R.range(140, 360);
          ps.spawn(P.SPARK, X, -1, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.5));
        }
        // dust rolls out both ways along the floor
        for (let i = 0; i < 20; i++) {
          const s = i % 2 ? -1 : 1;
          ps.spawn(P.SMOKE, X + s * R.range(0, 8), -R.range(2, 6), s * R.range(45, 135), -R.range(2, 12), R.range(1.0, 1.45), st.dust, R.range(5, 8.5), R.range(0, 0.07), PF.BIG);
        }
        for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, X + R.range(-4, 4), -R.range(3, 8), R.range(-15, 15), -R.range(40, 90), R.range(1.0, 1.45), st.dust, R.range(4, 6.5), R.range(0.02, 0.1), PF.BIG);
        for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R.range(-4, 4), -R.range(1, 4), R.range(-60, 60), -R.range(8, 30), R.range(0.35, 0.7), st.dust, R.range(2, 3.5));
        // grit and a few stones thrown up, forward
        for (let i = 0; i < 44; i++) {
          const a = -Math.PI / 2 + R.range(-0.7, 1.0), sp = R.range(60, 230);
          ps.spawn(P.GRIT, X + R.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.0, 1.5), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.35) ? 2 : 1);
        }
        for (let i = 0; i < 6; i++)
          bits.add({ kind: B.CHUNK, x: X + R.range(-3, 3), y: -2, vx: R.range(-50, 110), vy: -R.range(120, 260), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.15, 1.5), a: R.range(0, TAU), va: R.range(-14, 14), s: R.int(1, 2) });
        // embers lift off the cut
        for (let i = 0; i < 16; i++) ps.spawn(P.EMBER, X + R.range(-8, 8), -R.range(1, 6), R.range(-50, 60), -R.range(30, 110), R.range(0.7, 1.5), C[4], R.range(1, 2));
      }
      // the cracks breathe embers while they're hot
      if (hit && t < HIT + 0.6 && R.chance(0.12)) {
        const c = R.pick(lines), pt = R.pick(c.pts);
        ps.spawn(P.EMBER, pt[0], pt[1] - 1, R.range(-12, 12), -R.range(20, 50), R.range(0.5, 0.9), C[4], 1);
      }
      bits.update(dt);
      for (const b of bits.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 30), -R.range(2, 12), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.4));
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const q = t - HIT;
      if (q >= 0) {
        // the floor under the blade: white hot, cooling through the ramp to soot
        const fade = 1 - smooth(1.0, 1.5, q);
        for (let y = 0; y <= 2; y++)
          for (let x = -9; x <= 9; x++) {
            const d = Math.hypot((x + 0.5) / 9, (y + 0.5) / 3.5);
            if (d > 1) continue;
            const T = Math.pow(clamp(1 - q / 0.8), 1.4) * (1.2 - d) - rand(x, y, 3) * 0.3;
            if (T > 0.08) p.dot(X + x, y, C[clamp(Math.round(T * 9), 1, 7)], fade);
            else p.dot(X + x, y, d < 0.5 ? st.dark : st.shade, (d < 0.9 - rand(x, y, 9) * 0.3 ? 1 : 1 - d) * fade);
          }
        // the shock runs out along the floor: the far half behind the fighter
        const k = q / 0.45;
        if (k < 1) band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) < 0);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      const q = t - HIT;
      // the glint over the head: the raised blade catching the light
      if (t < RAISE + 0.03) {
        const g = ease.outBack(clamp(t / 0.1)) * (1 + 0.15 * Math.sin(t * 60)) * (t > RAISE ? 1 - (t - RAISE) / 0.03 : 1);
        sparkle(p, GLINT[0], GLINT[1], 1 + 7 * g, C[6], C[4], 0.5);
        p.glow(GLINT[0], GLINT[1], 22, C[4], 0.3 * g);
      }
      if (q >= 0) {
        // cracks race out from the cut and split down into the floor: white hot, cooling down the ramp to dark
        const heat = Math.pow(clamp(1 - q / 1.2), 1.2), fade = 1 - smooth(1.15, 1.5, q);
        for (const c of lines) {
          const reach = 40 * ease.outCubic(clamp((q - c.at * 0.1) / 0.13)) * (c.fork ? 0.3 : 1);
          if (reach <= 0) continue;
          along(c.pts, reach, (x0, y0, x1, y1, d) => {
            const h = heat * (1 - d / 46) - (c.fork ? 0.12 : 0), col = h > 0.72 ? WHITE : h > 0.08 ? C[clamp(Math.round(h * 8), 1, 6)] : st.dark;
            if (y1 > 0.5) p.line(x0 + 1, y0, x1 + 1, y1, st.dark, fade);
            p.line(x0, y0, x1, y1, col, fade);
            if (h > 0.25 && (d | 0) % 6 < 2) p.glow(x1, y1, 6, C[4], 0.2 * h * fade);
          });
        }
        if (heat > 0) p.glow(X, -2, 34, C[4], 0.32 * heat * fade);
        // the near half of the shock ring
        const k = q / 0.45;
        if (k < 1) band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) >= 0);
      }
      // the arc and its echo, then a dotted trace of embers where it has been
      arc(p, E, WE, 0.02, false);
      arc(p, A, W, 0, true);
      const tail = U1 * smooth(HIT + HOLD, HIT + HOLD + TRAIL, t), th = 0.8 * (1 - clamp((t - HIT - HOLD) / (TRAIL + 0.25)));
      if (tail > 0.02 && th > 0) trace(p, A, A.R - 0.5, 0, tail, C[3], (u) => th * (0.4 + 0.6 * u / U1));
      if (t > RAISE && t < HIT + 0.05) {
        const [x, y] = onSwing(A, A.R - 5, U1 * head(t));
        p.glow(x, y, 40, C[4], 0.5);
      }
      // the white slam: an impact star flat on the floor, then slivers flying off and a hot pool
      if (q >= 0 && q < 0.035) star(p, X, -1, spikes, 1, 1, WHITE, C[6], C[7], C[5]);
      else if (q >= 0.035 && q < 0.07) star(p, X, -1, spikes, 1.25, 0.55, C[7], C[6], C[6], C[4]);
      if (q >= 0.05 && q < 0.16) {
        const k = (q - 0.05) / 0.11;
        for (const s of shards) sliver(p, X, -1, s.a, s.r + s.v * (q - 0.05), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
      }
      if (q >= 0 && q < 0.2) {
        const pop = Math.exp(-q / 0.05);
        p.glow(X, -6, 30, C[5], 0.8 * pop);
        p.glow(X, -2, 10, WHITE, 0.7 * pop);
      }
      for (const b of bits.list) rock(p, b, st);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
