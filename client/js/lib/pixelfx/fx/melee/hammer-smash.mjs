// The rocks, grit, rolling dust and floor ring are adapted from Sprite Fusion's open-source explosion, and the
// dome from his ice nova (https://www.spritefusion.com/pixel-art-vfx), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, band, clamp, smooth, ease, rand, hex, TAU, WHITE, READY } from "../../core/index.mjs";
import { swing, onSwing, smear, stone, rock, cracks, along } from "./_lib.mjs";

export const meta = {
  name: "Hammer smash",
  desc: "A hammer drops in front in a wedge of motion: a white slam with rays, a dome of force, a dent with cracks, rocks thrown up that bounce and settle, and dust.",
  tags: ["melee", "smash", "hammer", "heavy", "ground", "shockwave", "debris", "combat", "directional", "one-shot"],
  size: [208, 112],
  origin: [80, 92],
  duration: 2.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#141834", "#242c5c", "#38479a", "#5a72d0", "#8fa8f0", "#c4d4ff", "#eef3ff", "#ffffff"],
    stone: "#4a3f69",
    seed: 9,
  },
};

// both hands low on the shaft, the head resting on the floor in front; it comes up, over and down
const REST_ = { ...READY, weapon: "hammer", two: true, sa: 0.62, fx: 11, fy: -21, crouch: 3 };
const TOP = { ...REST_, x: -3, crouch: 0, lean: -3, fx: 3, fy: -41, sa: -2.1, ffx: 8, ffy: -8, fbx: -5, toeB: true };
const SLAM = { ...REST_, x: -1, crouch: 7, lean: 6, fx: 14, fy: -19, sa: 0.62, ffx: 11, fbx: -10 };
export const act = {
  target: { x: 66 },
  poses: [
    [-0.72, { ...REST_, x: -3 }],
    [-0.44, { ...REST_, x: -3, crouch: 5, lean: -1, fx: 16, fy: -28, sa: -0.9 }],
    [-0.2, TOP],
    [-0.03, { ...TOP, y: -2 }],
    [0.06, { ...REST_, x: 0, y: -3, crouch: -1, lean: 2, fx: 13, fy: -41, sa: -1.2, ffx: 11, ffy: -8, ghost: 1 }, "snap"],
    [0.11, { ...REST_, x: 0, y: -1, crouch: 3, lean: 5, fx: 19, fy: -30, sa: -0.15, ffx: 13, ghost: 1 }, "snap"],
    [0.15, SLAM, "snap"],
    [0.62, { ...SLAM, crouch: 6, lean: 5 }],
    [1.02, { ...REST_, x: -2, crouch: 5, lean: 2, fx: 14, fy: -24, sa: 0.3 }],
    [1.4, { ...REST_, x: -3 }],
  ],
  hits: [{ t: 0.15, stop: 0.2, shake: 0.34, amp: 3, push: 3, straw: 26, y: -8 }],
  dust: [{ t: 0.15, x: 10, n: 8 }, { t: 0.15, x: -12, n: 5, dir: -1 }],
};

const SOOT = hex("#0d0a12"), HOT = ["#fff3a6", "#ffc23d", "#ff8a2a", "#c9281f"].map(hex);
const DROP = 0.15; // the hammer comes over and down, gathering speed
const head = (t) => {
  const x = clamp((t + 0.03) / (DROP + 0.03));
  return 0.28 * x + 0.72 * x * x;
};

export function create(o) {
  const C = fit(o.palette, 8), n = C.length, R = new Rng(o.seed), st = stone(o.stone), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor }), bits = new Bits({ ground: floor }), chips = new Bits({ ground: floor }), lights = new Lights();
  // the hammer head's path: round the shoulders, from overhead down to the floor in front
  const A = swing({ cx: 5, cy: -25, R: 32, sy: 1, rot: 0, a0: -2.25, dir: 1 });
  let U1 = 0;
  while (onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4) U1 += 0.005;
  const HW = 13, [X] = onSwing(A, A.R - HW / 2, U1);
  const lines = cracks(R, X, 5, 24, 6, 0);
  const rays = [-0.95, -0.6, -0.3, -0.05, 0.22, 0.5, 0.85].map((d, i) => ({ a: -Math.PI / 2 + d + R.range(-0.06, 0.06), L: (i === 3 ? 34 : i === 2 || i === 4 ? 26 : i === 1 || i === 5 ? 18 : 12) * R.range(0.9, 1.1) }));
  let t = 0, hit = false;

  // the smear: the hammer head's path as a comet, a hard white leading face, tapering to a hair behind it,
  // cooling along the taper (edges first), with speed lines trailing along the arc
  const Rm = A.R - HW / 2;
  const wedge = (p) => {
    const h = head(t), U = U1 * h, after = smooth(DROP, DROP + 0.07, t), lagU = Math.max(0, U - (0.3 + 1.05 * h)), T = lagU + (U - lagU) * after * 0.8;
    if (U - T < 0.03 || after >= 1) return;
    const len = (U - T) * Rm;
    smear(p, A, T, U, HW + 1, (u, r, out) => {
      const lead = (U - u) * Rm, f = lead / len, w = HW * (lead < 3 ? 1 : Math.pow(1 - (lead - 3) / Math.max(1, len - 3), 0.85)) * (1 - after * 0.5);
      const off = (r - Rm) / (w / 2 + 0.01);
      if (w < 0.6 || Math.abs(off) > 1) return;
      let ci = lead < 2 ? 0 : Math.round(1 + f * 3.4 + Math.abs(off) * 1.4 - (off > 0.55 ? 1 : 0) + after * 3);
      if (ci > n - 3) return;
      out.c = C[n - 1 - Math.max(0, ci)];
    });
    // speed lines trail the head along the arc, dotted out at their ends
    if (after < 0.6)
      for (const [dr, l0, L] of [[-HW / 2 - 2, 3, 26], [-HW / 2 - 5, 9, 16], [HW / 2 + 2, 2, 30], [HW / 2 + 5, 8, 18], [-1, len + 2, 14], [3, len + 4, 9]]) {
        const r = Rm + dr;
        for (let d = l0; d < l0 + L * (1 - after); d += 0.5) {
          const u = U - d / r, k = (d - l0) / L;
          if (u < 0) break;
          p.dot(...onSwing(A, r, u), k < 0.25 ? C[6] : k < 0.6 ? C[5] : C[4], (1 - k) * (1 - after));
        }
      }
    const [hx, hy] = onSwing(A, Rm, U);
    p.glow(hx, hy, 34, C[4], 0.5 * (1 - smooth(DROP - 0.03, DROP, t)));
  };

  return {
    update(dt) {
      t += dt;
      if (!hit && t >= DROP) {
        hit = true;
        lights.add(X, -5, 16, WHITE, 0.35, 0.08);
        lights.add(X, -10, 64, C[4], 0.42, 0.6);
        // rocks thrown up out of the dent: they tumble, land, bounce and settle
        for (let i = 0; i < 15; i++) {
          const s = R.sign();
          bits.add({ kind: B.CHUNK, x: X + s * R.range(0, 5), y: -2, vx: s * R.range(20, 105), vy: -R.range(110, 300), g: 1, drag: 0.35, bounce: 0.38, life: R.range(1.25, 1.65), a: R.range(0, TAU), va: R.range(-16, 16), s: R.pick([1, 1, 2, 2, 3]) });
        }
        // hot chips struck off the stone: they bounce, settle and cool through the ramp
        for (let i = 0; i < 11; i++) {
          const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(90, 230);
          chips.add({ kind: B.SHARD, x: X + R.range(-4, 4), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.9, drag: 0.5, bounce: 0.35, life: R.range(0.9, 1.5), s: 1 });
        }
        for (let i = 0; i < 40; i++) {
          const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(50, 210);
          ps.spawn(P.GRIT, X + R.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.9, 1.5), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.4) ? 2 : 1);
        }
        // force motes skid out along the floor, sparks off the stone
        for (let i = 0; i < 14; i++) {
          const s = i % 2 ? -1 : 1, sp = R.range(120, 260);
          ps.spawn(P.MOTE, X + s * 6, -R.range(1, 4), s * sp, -R.range(0, 30), R.range(0.18, 0.34), R.chance(0.5) ? C[6] : C[5], 0.8, R.range(0.02, 0.05));
        }
        for (let i = 0; i < 24; i++) {
          const a = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(150, 380);
          ps.spawn(P.SPARK, X + Math.cos(a) * 6, -2 + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.12, 0.42), 0, 1, R.range(0.035, 0.08));
        }
        // dust rolls out both ways along the floor, and a puff lifts off the dent
        for (let i = 0; i < 20; i++) {
          const s = i % 2 ? -1 : 1;
          ps.spawn(P.SMOKE, X + s * R.range(2, 10), -R.range(2, 7), s * R.range(40, 125), -R.range(2, 14), R.range(0.95, 1.5), st.dust, R.range(6, 9), R.range(0.02, 0.08), PF.BIG);
        }
        for (let i = 0; i < 7; i++) ps.spawn(P.SMOKE, X + R.range(-6, 6), -R.range(3, 9), R.range(-20, 20), -R.range(30, 80), R.range(1.0, 1.4), st.dust, R.range(5, 7.5), R.range(0.04, 0.14), PF.BIG);
        for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R.range(-6, 6), -R.range(1, 4), R.range(-70, 70), -R.range(8, 30), R.range(0.35, 0.7), st.dust, R.range(2, 3.5));
      }
      bits.update(dt);
      chips.update(dt);
      // settled rocks catch the light now and then
      if (hit && t > DROP + 0.4 && t < DROP + 1.2 && R.chance(0.08)) {
        const b = R.pick(bits.list);
        if (b && b.rest) ps.spawn(P.STAR, b.x + R.range(-1, 1), b.y - 1.5 - b.s, 0, -2, R.range(0.25, 0.45), R.chance(0.5) ? HOT[0] : WHITE, R.range(0.6, 1.6));
      }
      // rocks that land kick up a little dust
      for (const b of bits.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 14), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.6));
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const q = t - DROP;
      if (q >= 0) {
        // the dent: the floor's top knocked down into a shallow pit, its surface lit at the bottom, chipped lips
        const fade = 1 - smooth(1.3, 1.7, q);
        for (let x = -11; x <= 11; x++) {
          const u = x / 10, d = Math.abs(x) > 10 ? 0 : Math.round(3.2 * (1 - u * u) + (rand(x, 4) - 0.5) * 0.8);
          for (let y = 0; y < d; y++) p.dot(X + x, y, y === 0 ? SOOT : st.dark, fade);
          if (d > 0) p.dot(X + x, d, Math.abs(x) < 7 ? st.light : st.body, fade);
          if (Math.abs(x) >= 8) p.dot(X + x, -1, Math.abs(x) >= 10 ? st.body : st.light, fade);
          if (Math.abs(x) === 9 && rand(x, 7) < 0.7) p.dot(X + x, -2, st.body, fade);
        }
        // the floor ring's far half
        const k = q / 0.5;
        if (k < 1) band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) < 0);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      const q = t - DROP;
      wedge(p);
      if (q >= 0) {
        // cracks split out of the dent: a white flash, then dark lines that fade with the dent
        const fade = 1 - smooth(1.3, 1.7, q);
        for (const c of lines) {
          const reach = 30 * ease.outCubic(clamp((q - c.at * 0.06) / 0.08)) * (c.fork ? 0.3 : 1);
          if (reach > 0)
            along(c.pts, reach, (x0, y0, x1, y1) => {
              if (q >= 0.12) p.line(x0, y0 + 3, x1, y1 + 3, st.shade, fade);
              p.line(x0, y0 + 2, x1, y1 + 2, q < 0.05 ? WHITE : q < 0.12 ? C[5] : SOOT, fade);
            });
        }
        // the near half of the floor ring
        const k = q / 0.5;
        if (k < 1) band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) >= 0);
        // the dome of force swells off the floor, thins to dots and fades
        const d = (q - 0.045) / 0.4;
        if (d >= 0 && d < 1) {
          // solid steps through the shell (white rim, two blues inside); it dissolves as a whole at the end
          const r = 12 + 30 * ease.outCubic(d), th = Math.max(1, 3.6 * Math.pow(1 - d, 0.8)), a = d < 0.6 ? 1 : (1 - d) / 0.4;
          p.shade(X - r - 1, -r - 1, X + r + 1, 0, (x, y, out) => {
            const e = r - Math.hypot(x - X, y);
            if (e < 0 || e > th || y > -0.5) return;
            const v = e / th;
            out.c = d < 0.1 ? (v < 0.6 ? WHITE : C[6]) : v < 0.34 ? (d < 0.45 ? WHITE : C[6]) : v < 0.67 ? C[5] : C[4];
            out.a = a;
          });
          for (let i = 0; i < 7; i++) {
            const g = -Math.PI * (0.08 + (i / 6) * 0.84);
            p.glow(X + Math.cos(g) * r, Math.sin(g) * r, 14, C[4], 0.36 * (1 - d));
          }
        }
        // rays of light shoot up out of the slam
        if (q < 0.2)
          for (const ry of rays) {
            const d1 = ry.L * ease.outCubic(Math.min(1, q / 0.05)), d0 = ry.L * smooth(0.04, 0.2, q), ca = Math.cos(ry.a), sa = Math.sin(ry.a);
            if (d1 - d0 < 1) continue;
            p.line(X + ca * (2 + d0), -1 + sa * (2 + d0), X + ca * d1, -1 + sa * d1, (u) => (u < 0.5 ? WHITE : u < 0.8 ? C[6] : C[5]));
            p.glowLine(X + ca * d0, -1 + sa * d0, X + ca * d1, -1 + sa * d1, 4, C[5], 0.18 * (1 - q / 0.2));
          }
        // the white slam: a flat flash on the floor for two frames
        if (q < 0.07) {
          const hot = q < 0.035, rx = hot ? 16 : 12, ry = hot ? 3 : 2;
          p.ellipse(X, 0, rx + 2, ry + 1, hot ? C[6] : C[5]);
          p.ellipse(X, 0, rx, ry, hot ? WHITE : C[7]);
        }
        if (q < 0.2) {
          const pop = Math.exp(-q / 0.05);
          p.glow(X, -5, 26, C[5], 0.3 * pop);
        }
        // the struck stone stays warm for a moment
        p.glow(X, -1, 16, HOT[2], 0.28 * Math.exp(-q / 0.35));
      }
      for (const b of bits.list) rock(p, b, st);
      for (const b of chips.list) {
        const k = b.life / b.max, c = k > 0.7 ? HOT[0] : k > 0.45 ? HOT[1] : k > 0.25 ? HOT[2] : HOT[3];
        p.dot(b.x, b.y, c, Math.min(1, k * 4));
        if (!b.rest) p.dot(b.x - b.vx * 0.012, b.y - b.vy * 0.012, HOT[3], Math.min(1, k * 4));
        p.glow(b.x, b.y, 4, c, 0.35 * k);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
