// The slanted streaks landing with a ring and a kick of bits follow Sprite Fusion's open-source rain
// (https://www.spritefusion.com/pixel-art-vfx/rain), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, PAL, fit, band, flare, sparkle, clamp, ease, TAU, WHITE } from "../../core/index.mjs";

const N = 11, SPREAD = 46, H = 124, SLANT = 0.38, TRAIL = 0.17;

export const meta = {
  name: "Star fall",
  desc: "Stars streak down on long trails across an area, each landing with a white flash, a ring across the floor and a kick of sparks.",
  tags: ["arcane", "star", "meteor", "rain", "aoe", "magic", "ground", "one-shot"],
  size: [232, 172],
  origin: [124, 150],
  duration: 2.5,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: PAL.arcane, seed: 13 },
};

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  // where they land: spread over the area in a shuffled order, a little in front of or behind the line
  const xs = Array.from({ length: N }, (_, i) => -SPREAD + ((i + R.range(0.2, 0.8)) * 2 * SPREAD) / N);
  for (let i = N - 1; i > 0; i--) {
    const j = R.int(0, i);
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  const stars = xs.map((x, i) => {
    const y = R.range(-3, 2), h = H * R.range(0.85, 1);
    return { x, y, sx: x - h * SLANT, sy: y - h, t0: 0.04 + i * 0.105 + R.range(0, 0.05), T: R.range(0.3, 0.4), landed: false, big: R.chance(0.35), ph: R.range(0, TAU) };
  });
  const hits = [];
  let t = 0;
  const at = (s, tt) => {
    const q = clamp((tt - s.t0) / s.T), e = q * (0.35 + 0.65 * q);
    return [s.sx + (s.x - s.sx) * e, s.sy + (s.y - s.sy) * e, q];
  };

  function star(p, s) {
    const [x, y, q] = at(s, t);
    // the trail: a long tapered streak back up its path, white at the head, thinning into violet
    const n = 20;
    for (let k = n; k >= 1; k--) {
      const [ax, ay] = at(s, t - (k * TRAIL) / n), [bx, by] = at(s, t - ((k - 1) * TRAIL) / n), u = k / n;
      if (t - (k * TRAIL) / n < s.t0) continue;
      const c = u < 0.15 ? WHITE : u < 0.4 ? C[6] : u < 0.7 ? C[5] : C[4];
      // a second line beside the first near the head gives it body; the tail thins to a dithered thread
      if (u < (s.big ? 0.55 : 0.35)) p.line(ax + 1, ay, bx + 1, by, u < 0.2 ? C[6] : C[5], 1.1 - u * 1.4);
      p.line(ax, ay, bx, by, c, 1.3 - u);
      if (k % 3 === 0) p.glow(ax, ay, 7 * (1 - u) + 2, C[5], 0.3 * (1 - u));
    }
    // the head: a twinkling four-point star
    if (s.big) flare(p, x, y, 7 + 1.5 * Math.sin(t * 40 + s.ph), 0.8, C);
    else sparkle(p, x, y, 3.5 + Math.sin(t * 40 + s.ph), C[6], C[5], 0.6);
    p.circle(x, y, s.big ? 1.6 : 1.1, WHITE);
    p.glow(x, y, s.big ? 18 : 13, C[5], 0.6);
    p.glow(x, y, 5, WHITE, 0.35);
    return q;
  }

  function hit(p, h, far) {
    const k = (t - h.t) / 0.45;
    if (k < 0 || k >= 1) return;
    band(p, h.x, h.y, 3 + (h.big ? 22 : 16) * ease.outCubic(k), 0.26, Math.max(1, 2.5 * (1 - k)), 1.15 - k, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) < 0 === far, k < 0.2);
  }

  return {
    update(dt) {
      t += dt;
      for (const s of stars) {
        if (t < s.t0 || s.landed) continue;
        const [x, y, q] = at(s, t);
        if (R.chance(0.55)) ps.spawn(P.STAR, x + R.range(-1.5, 1.5), y + R.range(-1.5, 1.5), R.range(-12, 12), R.range(-8, 4), R.range(0.35, 0.7), R.pick([WHITE, C[6], C[5]]), R.chance(0.7) ? R.range(0.4, 0.9) : R.range(1.2, 1.8));
        if (q >= 1) {
          s.landed = true;
          hits.push({ x: s.x, y: s.y, t, big: s.big });
          lights.add(s.x, s.y - 12, s.big ? 46 : 38, C[5], 0.9, 0.32);
          lights.add(s.x, s.y - 3, 16, WHITE, 0.8, 0.08);
          for (let i = 0; i < (s.big ? 14 : 9); i++) {
            const a = -Math.PI / 2 + R.range(-1.35, 1.35), sp = R.range(50, 150);
            ps.spawn(P.SPARK, s.x, Math.min(-1, s.y - 1), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.5));
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.STAR, s.x + R.range(-4, 4), s.y - R.range(2, 8), R.range(-15, 15), -R.range(10, 35), R.range(0.4, 0.8), R.pick([WHITE, C[6]]), R.range(0.8, 2));
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the area lit beneath while they fall
      const k = clamp(t / 0.3) * (1 - clamp((t - 1.7) / 0.7));
      if (k > 0) for (const x of [-36, 0, 36]) p.glow(x, -1, 40, C[4], 0.14 * k);
      for (const h of hits) hit(p, h, true);
      // a glowing mark where each landed, cooling away
      for (const h of hits) {
        const k2 = 1 - (t - h.t) / 0.7;
        if (k2 <= 0) continue;
        p.dot(h.x, h.y, k2 > 0.6 ? WHITE : C[6], k2 * 1.5);
        for (const dx of [-1, 1]) p.dot(h.x + dx, h.y, C[5], k2 * 1.2);
        p.glow(h.x, h.y - 1, 10, C[5], 0.35 * k2);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      for (const s of stars) if (t >= s.t0 && !s.landed) star(p, s);
      for (const h of hits) {
        hit(p, h, false);
        const k = (t - h.t) / 0.22;
        if (k < 0 || k >= 1) continue;
        if (k < 0.35) p.circle(h.x, h.y - 2, 5 * (1 - k / 0.35) + 1, WHITE);
        flare(p, h.x, h.y - 2, (h.big ? 16 : 12) * Math.pow(1 - k, 1.5) + 2, 1 - k, C);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
