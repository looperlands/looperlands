import { Particles, Lights, P, Rng, fit, sparkle, flare, band, clamp, smooth, seg, ease, rand, TAU, WHITE } from "../../core/index.mjs";
import { GREEN, plus, oval } from "./_lib.mjs";

export const meta = {
  name: "Healing ring",
  desc: "A seed of green light sinks into the floor and a soft ring rolls out from it; the floor glows where it passes and plus signs sprout and float up.",
  tags: ["holy", "heal", "aoe", "ring", "plus", "ground", "one-shot"],
  size: [256, 136],
  origin: [128, 104],
  duration: 2.9,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: GREEN, reach: 104, seed: 6 },
};

const SY = 0.2, SEED = 0.3, ROLL = 1.0;

export function create(o) {
  const C = fit(o.palette, 8), REACH = o.reach, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const lights = new Lights();
  const front = (tt) => (tt < SEED ? 0 : REACH * ease.outCubic(seg(tt, SEED, SEED + ROLL)));
  const passed = (d) => SEED + ROLL * (1 - Math.cbrt(1 - Math.min(0.999, d / REACH)));
  // where plus signs sprout: scattered over the floor, each waiting for the ring to reach it
  const sites = Array.from({ length: 26 }, (_, i) => {
    const a = R.range(0, TAU), d = REACH * Math.sqrt(R.range(0.04, 0.92)), big = i % 5 < 2;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, t0: passed(d) + R.range(0, 0.06), rise: R.range(18, 34), life: R.range(0.9, 1.3), sway: R.range(0, TAU), L: big ? 3 + (i % 5 === 0 ? 1 : 0) : i % 5 === 2 ? 1 : 2, thick: big ? 3 : 1, popped: false };
  });
  // the rolling ring carries little lights round with it
  const riders = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * TAU + R.range(-0.2, 0.2), w: R.range(0.6, 1.1) * (i % 2 ? 1 : -1) }));
  let t = 0, released = false;

  function wash(p) {
    // the floor glows behind the front and fades after it
    const fr = front(t);
    if (fr < 2 || t > 2.6) return;
    p.shade(-fr - 1, -fr * SY - 1, fr + 1, fr * SY + 1, (x, y, out) => {
      const d = Math.hypot(x, y / SY);
      if (d > fr) return;
      const age = t - passed(d), k = Math.exp(-age / 0.35) * smooth(fr, fr - 6, d) * (1 - smooth(1.4, 1.9, t));
      if (k < 0.04) return;
      out.l = C[4];
      out.k = 0.32 * k;
    });
  }

  function ring(p, back) {
    if (t < SEED) return;
    const u = seg(t, SEED, SEED + ROLL + 0.25), fr = front(t), k = u < 0.7 ? 1 : (1 - u) / 0.3;
    if (k <= 0) return;
    const keep = back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0;
    band(p, 0, 0, fr, SY, Math.max(2, 7 * (1 - u * 0.7)), k, C.slice(2), keep, t < SEED + 0.08);
    oval(p, 0, 0, fr + 1, (fr + 1) * SY, (g) => (Math.sin(g) > 0.3 ? WHITE : C[6]), k * (back ? 0.7 : 1), keep);
    // a crest of light blades flickers up along the front as it rolls
    for (let j = 0, n = Math.ceil(fr * 0.9); j < n; j++) {
      const g = (j / n) * TAU, near = Math.sin(g) >= 0;
      if (near === back || rand(j, Math.floor(t * 20)) > 0.45) continue;
      const x = Math.cos(g) * fr, y = Math.sin(g) * fr * SY, h = (1 + rand(j, 7) * 4) * k * (near ? 1 : 0.6);
      for (let i = 1; i <= h; i++) p.dot(x, y - i, i > h - 1 ? WHITE : C[6], k * (1.2 - i / (h + 1)));
    }
    // lights riding round the ring as it rolls
    for (const r of riders) {
      const g = r.a + r.w * (t - SEED) * 2.2, near = Math.sin(g) >= 0;
      if (near === back) continue;
      const x = Math.cos(g) * fr, y = Math.sin(g) * fr * SY;
      if (near) sparkle(p, x, y - 1, 2 + (Math.sin(t * 9 + r.a * 5) > 0.3 ? 1 : 0), WHITE, C[6], 0.35 * k);
      else p.dot(x, y, C[6], k);
    }
    if (!back) for (let i = 0; i < 8; i++) {
      const g = (i / 8) * TAU;
      p.glow(Math.cos(g) * fr, Math.sin(g) * fr * SY - 2, 16, C[4], 0.22 * k);
    }
  }

  function sprouts(p, back) {
    for (const s of sites) {
      const a = t - s.t0;
      if (a < 0 || a > s.life || s.z < 0 !== back) continue;
      const u = a / s.life, h = s.rise * ease.outCubic(u), x = s.x + Math.sin(a * 4 + s.sway) * 1.5 * u, y = s.z * SY - 2 - h;
      const pop = ease.outBack(clamp(a / 0.12), 2.6), end = s.life - 0.15, L = Math.max(1, Math.round(s.L * pop - (back ? 1 : 0)));
      if (a < 0.04) sparkle(p, x, y, 3, WHITE, C[6], 0.5);
      else if (a < end) plus(p, x, y, L, back && L < 3 ? 1 : s.thick, back ? C.slice(0, 7) : C, back ? 0.8 : 1, !back && Math.sin(a * 12 + s.sway * 3) > 0.8);
      else {
        const v = (a - end) / 0.15;
        for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.dot(x + dx * (2 + v * 5), y + dy * (2 + v * 5) - v * 2, v < 0.4 ? WHITE : C[6], 1 - v);
      }
      // a thread of light still ties it to the floor while it rises
      if (u < 0.5) for (let j = 1; j < h * (1 - u * 2); j += 1.5) p.dot(s.x, s.z * SY - 2 - h + j + 3, C[5], (1 - j / h) * (1 - u * 2) * (back ? 0.5 : 0.8));
      p.glow(x, y, 7 + L * 2, C[5], (back ? 0.2 : 0.34) * (a < end ? 1 : 1 - (a - end) / 0.15));
    }
  }

  return {
    update(dt) {
      t += dt;
      // the seed gathers: motes slide in over the floor to a point that brightens
      if (t < SEED - 0.04 && R.chance(0.7)) {
        const a = R.range(0, TAU), D = R.range(24, 48), x = Math.cos(a) * D, y = Math.sin(a) * D * SY - R.range(1, 8);
        const T = R.range(0.16, 0.24), l = Math.hypot(x, y + 3) || 1, v = (l * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, x, y, (-x / l) * v, ((-3 - y) / l) * v, T, R.chance(0.5) ? C[6] : C[5]);
      }
      if (!released && t >= SEED) {
        released = true;
        lights.add(0, -16, 76, C[5], 0.85, 0.55);
        lights.add(0, -6, 28, WHITE, 0.8, 0.12);
        for (let i = 0; i < 10; i++) ps.spawn(P.MOTE, R.range(-2, 2), -R.range(2, 10), R.range(-25, 25), -R.range(80, 170), R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1));
        for (let i = 0; i < 16; i++) {
          const a = R.range(Math.PI * 1.05, Math.PI * 1.95), sp = R.range(40, 120);
          ps.spawn(P.STAR, 0, -3, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 2));
        }
      }
      for (const s of sites)
        if (!s.popped && t >= s.t0) {
          s.popped = true;
          // a splash of dew where each one breaks the floor
          for (let i = 0; i < 3; i++) ps.spawn(P.STAR, s.x + R.range(-3, 3), s.z * SY - 1, R.range(-10, 10), -R.range(15, 40), R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.2), 0, s.z < 0 ? 4 : 0);
        }
      // dew rising off the glowing floor behind the ring
      if (t > SEED + 0.1 && t < 1.9 && R.chance(0.35)) {
        const fr = front(t), a = R.range(0, TAU), d = fr * Math.sqrt(R.next());
        ps.spawn(P.EMBER, Math.cos(a) * d, Math.sin(a) * d * SY - 1, R.range(-5, 5), -R.range(10, 30), R.range(0.5, 1), C[5], 1, 0, Math.sin(a) < 0 ? 4 : 0);
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      wash(p);
      ring(p, true);
      sprouts(p, true);
      ps.draw(p, "back");
    },
    draw(p) {
      ring(p, false);
      // the seed: a point of light pulsing on the floor, then a flare as it lets go
      if (t < SEED) {
        const k = t / SEED;
        sparkle(p, 0, -3, 2 + 4 * k * k, WHITE, C[6], 0.3 + 0.4 * k);
        p.glow(0, -3, 10 + 16 * k, C[4], 0.5 * k);
      } else if (t < SEED + 0.2) flare(p, 0, -3, 22 * Math.pow(1 - (t - SEED) / 0.2, 1.5), 1 - (t - SEED) / 0.2, C.slice(3));
      // as it lets go, a jet of light leaps out of the floor, lets go of it and dissolves upward
      const g = seg(t, SEED, SEED + 0.5);
      if (g > 0 && g < 1) {
        const top = -4 - 46 * ease.outCubic(Math.min(1, g * 2.2)) - 10 * g, bot = -2 - 50 * ease.inQuad(seg(g, 0.35, 1)), w = 1 + 2.4 * (1 - g);
        if (bot - top > 2) {
          p.beam(0, bot, 0, top, w * 2, (u, v) => (v < 0.45 ? WHITE : u > 0.8 ? C[5] : C[6]));
          p.glowLine(0, bot, 0, top, 12, C[5], 0.55 * (1 - g));
          sparkle(p, 0, top, 4 * (1 - g) + 1, WHITE, C[6], 0.5 * (1 - g));
        }
      }
      sprouts(p, false);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
