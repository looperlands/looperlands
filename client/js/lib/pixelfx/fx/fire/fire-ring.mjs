// The flame-puff, smoke and spark recipe and the floor ring are adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), and the tongue from its fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, PF, Rng, fit, band, clamp, smooth, ease, noise, rand, TAU, WHITE, hex, mix, rgb, READY } from "../../core/index.mjs";
import { hotFirst, flameTongue, simDraw, LAYERS, BACK_LAYERS } from "./_lib.mjs";

export const meta = {
  name: "Fire ring",
  desc: "A white flash at the feet, then flames race outward along the floor in a ring, flaring as the front passes and burning down behind it over a smouldering scorch.",
  tags: ["fire", "ring", "nova", "aoe", "spell", "ground", "one-shot"],
  size: [224, 128],
  origin: [112, 92],
  duration: 3.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    reach: 92,
    seed: 6,
  },
};

const HIGH = { turn: 1.15, crouch: 0, fx: -7, fy: -44, bx: 8, by: -44, ffx: -5, fbx: 6 };
const SLAM = { turn: 1.15, crouch: 8, lean: 3, fx: -9, fy: -8, bx: 11, by: -8, ffx: -8, fbx: 9 };
const EASE = { turn: 1, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17, ffx: -4, fbx: 5 };
export const act = {
  target: { x: 70 },
  poses: [
    [-0.32, READY],
    [0.02, HIGH],
    [0.27, { ...HIGH, y: -1 }],
    [0.32, SLAM, "snap"],
    [0.85, { ...SLAM, crouch: 7 }],
    [1.5, EASE],
    [2.4, READY],
    [3.9, READY],
  ],
  hits: [
    { t: 0.32, stop: 0.1, shake: 0.28, amp: 3, target: false },
    { t: 0.6, push: 1.2, straw: 10, y: -8, skin: "char" },
    { t: 3.5, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: 0.32, x: 10, n: 6, dir: 1 }, { t: 0.32, x: -10, n: 6, dir: -1 }],
};

const SY = 0.2, CHARGE = 0.32, SPREAD = 0.75, SOOT = hex("#0d0a12"), SOOT2 = hex("#17121d"), WARM = rgb(255, 176, 96);
// the dying flames: deep orange and red, no white heart
const EMBER_LAYERS = [[1, 1, 7], [0.7, 0.8, 6], [0.4, 0.55, 5]];

export function create(o) {
  const F = fit(o.palette, 9), H = hotFirst(F), REACH = o.reach, R = new Rng(o.seed), floor = () => 0, S = o.seed * 7;
  const ps = new Particles({ rng: R, ground: floor, sparks: [H[1], H[2], H[4], H[5]] }), lights = new Lights();
  const GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25);
  const front = (t) => REACH * ease.outCubic(clamp((t - CHARGE) / SPREAD));
  const reachedAt = (d) => CHARGE + SPREAD * (1 - Math.cbrt(1 - Math.min(1, d / REACH)));
  // the flames: rings of tongues on the floor, each lit as the front reaches it, flaring then burning down
  const sites = [];
  for (let r = 10; r <= REACH; r += 9) {
    const per = TAU * Math.sqrt((r * r + (r * SY) ** 2) / 2), n = Math.max(5, Math.round(per / 8.5));
    for (let k = 0; k < n; k++) {
      const a = ((k + R.range(0.15, 0.85)) / n) * TAU, rr = r + R.range(-3, 3), q = Math.min(1, rr / REACH);
      // near the middle they flash and go out as the front passes; the rim, where it stops, burns on and down
      sites.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * SY, back: Math.sin(a) < 0, t0: reachedAt(rr) + R.range(0, 0.04), life: (0.3 + 1.0 * q * q) * R.range(0.85, 1.2), h: R.range(9, 15) * (0.6 + 0.55 * q), w: R.range(1.8, 2.7) * (0.75 + 0.3 * q), n: R.int(0, 1e5) });
    }
  }
  sites.sort((a, b) => a.y - b.y);
  let t = 0, burst = false;

  const flames = (p, back) => {
    const NZ = (rate, seed = 0, off = 0) => noise(t * rate + off, seed);
    for (const s of sites) {
      if (s.back !== back) continue;
      const age = t - s.t0;
      if (age < 0 || age > s.life) continue;
      const u = age / s.life, rise = ease.outBack(clamp(age / 0.08), 2), fade = 1 - Math.pow(Math.max(0, (u - 0.1) / 0.9), 1.3);
      const h = s.h * rise * fade * (0.85 + 0.15 * noise(t * 3.3, s.n)) * (1 + 0.5 * Math.max(0, noise(t * 2.6, s.n + 70) - 0.55));
      if (h < 1) continue;
      // fresh flames white-hot, then cooling as they burn down; the far ones a step dimmer
      const L = u < 0.3 ? (back ? BACK_LAYERS : LAYERS) : u < 0.65 ? BACK_LAYERS : EMBER_LAYERS;
      flameTongue(p, s.x, s.y, h, s.w * (0.6 + 0.4 * fade), NZ(2.2, s.n + 40) * 1.5 - s.x * 0.02, NZ, s.n, H, L);
    }
  };
  // the scorch: a translucent stain of soot where the fire has crossed, sparse embers cooling in it
  const scorch = (p) => {
    const fr = front(t), end = 1 - smooth(meta.duration - 1.2, meta.duration - 0.15, t);
    if (fr < 1 || end <= 0) return;
    for (let y = Math.floor(-fr * SY); y <= Math.ceil(fr * SY); y++)
      for (let x = Math.floor(-fr); x <= Math.ceil(fr); x++) {
        const d = Math.hypot(x + 0.5, (y + 0.5) / SY);
        if (d > fr) continue;
        const since = t - reachedAt(d), h = rand(x, y, S), hot = 1 - since / (1.2 + h * 0.9);
        if (hot > 0 && h < 0.03 + 0.06 * hot) {
          p.px(x, y, hot > 0.7 ? H[3] : hot > 0.45 ? H[4] : hot > 0.2 ? H[5] : H[6]);
          p.light(x, y, H[4], 0.3 * hot);
          continue;
        }
        p.blend(x, y, h < 0.5 ? SOOT : SOOT2, Math.min(1, since * 3) * (0.55 - (d / REACH) * 0.25) * end);
      }
  };
  const ring = (p, back) => {
    const k = (t - CHARGE) / (SPREAD + 0.1);
    if (k < 0 || k >= 1) return;
    band(p, 0, 0, front(t) + 1.5, SY, Math.max(1.5, 6 * (1 - k)), k < 0.75 ? 1 : (1 - k) / 0.25, [H[6], H[4], H[2], H[1]], (g) => Math.sin(g) < 0 === back, k < 0.12);
  };

  return {
    update(dt) {
      t += dt;
      // the charge: streaks of fire spiral in to the feet, heat building there
      if (t < CHARGE - 0.05 && R.chance(0.9 * dt * 60)) {
        const a = R.range(0, TAU), d = R.range(26, 54), T = R.range(0.18, 0.26), v = (d * 3) / (Math.exp(3 * T) - 1);
        const x = Math.cos(a) * d, y = Math.min(-2, -6 + Math.sin(a) * d * 0.45), l = Math.hypot(x, y + 4) || 1;
        ps.spawn(P.STREAK, x, y, (-x / l) * v, ((-4 - y) / l) * v, T, R.chance(0.5) ? H[2] : H[3]);
      }
      if (t < CHARGE && R.chance(0.5 * dt * 60 * (t / CHARGE))) ps.spawn(P.FIRE, R.range(-4, 4), -1, R.range(-8, 8), -R.range(20, 40), R.range(0.12, 0.24), 0, R.range(1, 2.2));
      if (!burst && t >= CHARGE) {
        burst = true;
        lights.add(0, -18, 64, WARM, 0.85, 0.5);
        lights.add(0, -6, 30, WHITE, 0.8, 0.08);
        for (let i = 0; i < 40; i++) {
          const a = R.range(0, TAU), sp = R.range(80, 220);
          ps.spawn(P.SPARK, Math.cos(a) * 3, -2, Math.cos(a) * sp, Math.sin(a) * sp * 0.4 - R.range(40, 120), R.range(0.2, 0.5));
        }
      }
      // fire shed off the burning ring: puffs that rise and some cool into smoke, and embers
      if (t > CHARGE && t < CHARGE + SPREAD + 1.2)
        for (let i = 0; i < 3; i++) {
          if (!R.chance(0.75 * dt * 60)) continue;
          const s = R.pick(sites), age = t - s.t0;
          if (age < 0 || age > s.life * 0.7) continue;
          ps.spawn(P.FIRE, s.x + R.range(-1, 1), s.y - s.h * 0.6, R.range(-5, 5), -R.range(20, 40), R.range(0.2, 0.4), 0, R.range(1.2, 2.4), 0, R.chance(0.5) ? PF.SMOKES | (s.back ? PF.BACK : 0) : s.back ? PF.BACK : 0);
          if (R.chance(0.12)) ps.spawn(P.EMBER, s.x, s.y - s.h * 0.5, R.range(-15, 15), -R.range(30, 70), R.range(0.6, 1.3), H[3], 1, 0, s.back ? PF.BACK : 0);
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      scorch(p);
      ring(p, true);
      flames(p, true);
      simDraw(p, ps, H, "back");
      // light on the floor running with the front
      const fr = front(t), k = t < CHARGE ? 0 : 1 - smooth(CHARGE + SPREAD, CHARGE + SPREAD + 1.4, t);
      if (k > 0) for (let i = 0; i < 16; i++) p.glow(Math.cos((i / 16) * TAU) * fr, Math.sin((i / 16) * TAU) * fr * SY - 3, 16, GLOW, 0.2 * k);
    },
    draw(p) {
      ring(p, false);
      flames(p, false);
      simDraw(p, ps, H, "front");
      // the charge glowing at the feet, then the white flash as it goes
      if (t < CHARGE) p.glow(0, -3, 8 + 22 * (t / CHARGE), GLOW, 0.6 * (t / CHARGE));
      if (t >= CHARGE && t < CHARGE + 0.1) {
        const k = 1 - (t - CHARGE) / 0.1;
        p.ellipse(0, -1, 14 * (0.6 + 0.4 * k), 4, H[2]);
        p.ellipse(0, -1, 9 * (0.6 + 0.4 * k), 2.6, k > 0.5 ? WHITE : H[1]);
      }
      const k = smooth(CHARGE - 0.05, CHARGE, t) * (1 - smooth(CHARGE + SPREAD * 0.5, CHARGE + SPREAD + 1.2, t));
      if (k > 0) p.glow(0, -6, 92, GLOW, 0.3 * k);
      lights.draw(p);
    },
  };
}
