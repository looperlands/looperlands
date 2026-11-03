// The rocks, grit and dust are adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, P, B, Rng, fit, band, clamp, smooth, ease, TAU, WHITE, mix, hex, READY } from "../../core/index.mjs";
import { stone, makeCracks, drawCracks, dustRing, rock, rockShape, SOOT } from "./_lib.mjs";

export const meta = {
  name: "Heavy landing",
  desc: "A character lands hard: the floor dents and cracks under their feet, two rings of dust roll out along the floor one after the other, and pebbles hop away.",
  tags: ["impact", "landing", "ground", "stomp", "dust", "rocks", "actor", "one-shot"],
  size: [176, 80],
  origin: [88, 60],
  duration: 1.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#1c1a24", "#2f2a3a", "#4a4258", "#6b6280", "#9088a4", "#bdb6cc", "#e6e1ee"], stone: "#4a3f69", seed: 14 },
};

const FALL = { turn: 0.8, y: -46, crouch: -1, lean: -1, fx: -9, fy: -42, bx: 10, by: -42, ffx: 6, ffy: -8, fbx: -3, fby: -3, toeB: true, ghost: 1 };
const HERO_ = { y: 0, crouch: 8, lean: 5, fx: 13, fy: -8, bx: -6, by: -23, ffx: 11, fbx: -10 };
export const act = {
  poses: [
    [-0.26, FALL],
    [-0.01, { ...FALL, y: -6 }, "in"],
    [0, HERO_, "snap"],
    [0.55, { ...HERO_, crouch: 7 }],
    [0.95, { ...HERO_, crouch: 5, lean: 3, fx: 13, fy: -15, bx: -5, by: -20 }],
    [1.3, READY],
    [1.6, READY],
  ],
  hits: [{ t: 0.005, stop: 0.13, shake: 0.32, amp: 3 }],
};

// the dent: the floor's edge pressed into a shallow dish, scuffed lips either side
function dent(p, st, k) {
  for (let x = -10; x <= 9; x++) {
    const q = Math.abs(x + 0.5) / 10, dep = Math.round(1.8 * (1 - q * q));
    if (q < 0.82) {
      for (let y = 0; y < dep; y++) p.dot(x, y, SOOT, k);
      p.dot(x, dep, st.lip, k);
    } else p.dot(x, -1, q > 0.92 ? st.light : st.lip, k);
  }
}

export function create(o) {
  const C = fit(o.palette, 7), st = stone(o.stone), R = new Rng(o.seed), floor = () => 0, D = meta.duration;
  // the rings' far halves go behind the character, the near halves and all the debris in front
  const back = new Particles({ rng: R, ground: floor }), front = new Particles({ rng: R, ground: floor });
  const bits = new Bits({ ground: floor }), cracks = makeCracks(R, 6, { len: [8, 20], dive: 0.7, maxY: 12, forks: 0.4, x0: [2, 6] });
  const DUST = mix(st.dust, C[5], 0.4), LIT = mix(DUST, WHITE, 0.3), PH = R.range(0, TAU);
  // puffs riding each ring out along the floor
  const ring = (n, v0, v1, size, delay) => {
    for (let i = 0; i < n; i++) {
      const g = (i / n) * TAU + R.range(-0.1, 0.1), v = R.range(v0, v1), far = Math.sin(g) < 0;
      (far ? back : front).spawn(P.DUST, Math.cos(g) * 4, Math.sin(g) * 0.7 - 1, Math.cos(g) * v, Math.sin(g) * v * 0.16 - R.range(2, 10), R.range(0.45, 0.8), R.chance(0.45) ? LIT : DUST, R.range(size[0], size[1]), delay + R.range(0, 0.03));
    }
  };
  ring(20, 140, 190, [2.2, 3.4], 0.01);
  ring(18, 70, 110, [3.4, 5.4], 0.12);
  // and a low cloud at the feet that rises a little and hangs
  for (let i = 0; i < 12; i++) {
    const s = R.sign(), up = i < 6;
    (i % 2 ? front : back).spawn(P.DUST, s * R.range(2, 10), -R.range(1, 4), s * R.range(10, 35) * (up ? 0.6 : 1), -(up ? R.range(25, 60) : R.range(4, 12)), R.range(0.55, 0.9), R.chance(0.5) ? LIT : DUST, R.range(3, 5), R.range(0.02, 0.1));
  }
  // pebbles that hop away along the floor, and grit
  for (let i = 0; i < 12; i++) {
    const s = R.sign(), v = R.range(50, 130);
    bits.add({ kind: B.CHUNK, x: s * R.range(3, 8), y: -1, vx: s * v, vy: -R.range(140, 230), g: 1, drag: 0.5, bounce: 0.55, life: R.range(1, 1.45), a: R.range(0, TAU), va: s * R.range(8, 16), s: R.chance(0.3) ? 2 : 1, pts: rockShape(R) });
  }
  for (let i = 0; i < 24; i++) {
    const s = R.sign(), a = -Math.PI / 2 + s * R.range(0.3, 1.2), v = R.range(60, 170);
    front.spawn(P.GRIT, s * R.range(2, 7), -1, Math.cos(a) * v, Math.sin(a) * v, R.range(0.6, 1.1), R.pick([st.light, st.body, st.lip]), R.chance(0.3) ? 2 : 1);
  }

  let t = 0;
  // the two dust rings themselves: soft bands on the floor, the second slower, lumpier and later
  const rings = (p, far) => {
    for (const [t0, dur, r1, w, k0, edge] of [[0.01, 0.45, 58, 4.5, 0.75, 1], [0.12, 0.85, 42, 6, 0.8, 0]]) {
      const g = (t - t0) / dur;
      if (g <= 0 || g >= 1) continue;
      const r = 6 + r1 * ease.outCubic(g);
      dustRing(p, 0, 0, r, w * (1 + g), k0 * Math.pow(1 - g, 1.2) * Math.min(1, g / 0.06), DUST, { sy: 0.2, ph: PH + t0 * 10, brk: g * 0.8, half: far ? -1 : 1 });
      // the fast ring's leading edge: a crisp lit band on the floor
      if (edge && g < 0.75) band(p, 0, 0.5, r + 2, 0.2, Math.max(1, 2.5 * (1 - g)), 1.1 - g / 0.75, [st.body, st.light, LIT, WHITE], (a) => Math.sin(a) < 0 === far);
    }
  };
  return {
    update(dt) {
      t += dt;
      for (const b of bits.list) b.pvy = b.vy;
      bits.update(dt);
      for (const b of bits.list)
        if (b.pvy > 80 && b.vy <= 0) {
          front.spawn(P.DUST, b.x, -0.5, R.sign() * R.range(6, 20), -R.range(2, 10), R.range(0.25, 0.45), DUST, R.range(1, 1.8));
          b.pvy = 0;
        }
      back.update(dt);
      front.update(dt);
    },
    drawBack(p) {
      const fade = 1 - smooth(D - 0.5, D - 0.1, t);
      dent(p, st, fade);
      drawCracks(p, cracks, (c) => c.len * ease.outCubic(clamp((t - c.t0) / 0.08)), () => 0, [WHITE, WHITE, WHITE, WHITE], SOOT, st.light, fade);
      rings(p, true);
      back.draw(p);
    },
    draw(p) {
      rings(p, false);
      front.draw(p);
      for (const b of bits.list) rock(p, b, st);
      // the thud: a flat streak of light along the floor for a frame or two
      if (t < 0.035) p.ellipse(0, 0, 15, 2.5, (d) => (d < 0.55 ? WHITE : C[6]));
      else if (t < 0.07) for (let x = -22; x <= 22; x++) p.dot(x, 0, Math.abs(x) < 10 ? WHITE : C[5], 1 - Math.abs(x) / 24);
      if (t < 0.12) p.glowLine(-20, 0, 20, 0, 8, C[6], 0.45 * (1 - t / 0.12));
    },
  };
}
