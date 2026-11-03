// The arc's halo-body-core inking, its flicker and the light that strobes as it dies follow Sprite Fusion's
// open-source lightning (https://www.spritefusion.com/pixel-art-vfx/lightning), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, clamp, smooth, rng, TAU, WHITE, hex, mix } from "../../core/index.mjs";
import { VOLT, zigzag, stroke, crackle } from "./_lib.mjs";

export const meta = {
  name: "Zap hit",
  desc: "A contact zap: an arc snaps in from the left, the hit point overloads into a knot of tiny crackling zigzags, a fern of burn marks glows outward, sparks jink away, ozone puffs.",
  tags: ["lightning", "electric", "hit", "impact", "combat", "directional", "one-shot"],
  size: [144, 112],
  origin: [76, 56],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: VOLT, seed: 3 },
};

const SNAP = 0.05, ASH = hex("#6a6680");

// the burn the current leaves on what it hit: a Lichtenberg fern, main fronds radiating, side fronds alternating
function fern(R) {
  const out = [];
  const grow = (x, y, a, len, w, d, depth) => {
    const pts = [[x, y, d]];
    let side = R.sign();
    for (let s = 0; s < len; s += 1.4) {
      a += R.range(-0.3, 0.3);
      x += Math.cos(a) * 1.4;
      y += Math.sin(a) * 1.4;
      d += 1.4;
      pts.push([x, y, d]);
      if (depth < 2 && s > 2 && R.chance(0.24)) {
        side = -side;
        grow(x, y, a + side * R.range(0.55, 1.05), (len - s) * R.range(0.3, 0.55), w * 0.6, d, depth + 1);
      }
    }
    out.push({ pts, w });
  };
  for (let i = 0; i < 6; i++) grow(0, 0, (i / 6) * TAU + R.range(-0.35, 0.35), R.range(18, 32), 1, 0, 0);
  return out;
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), ps = new Particles({ rng: R }), lights = new Lights();
  const tree = fern(R), Y0 = R.range(-14, 6);
  // sparks that jink: they fly out and jerk to a new heading every few hundredths of a second
  const kinked = Array.from({ length: 16 }, () => {
    const a = R.range(-1.2, 1.2) + (R.chance(0.7) ? 0 : Math.PI), sp = R.range(130, 250);
    return { x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: R.range(0.2, 0.36), age: -SNAP, next: R.range(0.02, 0.05), trail: [] };
  });
  let t = 0, hit = false;
  return {
    update(dt) {
      t += dt;
      if (!hit && t >= SNAP) {
        hit = true;
        lights.add(0, 0, 60, C[4], 0.7, 0.3);
        lights.add(0, 0, 14, WHITE, 0.5, 0.07);
        for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, R.range(-3, 5), R.range(-4, 2), R.range(-5, 8), -R.range(8, 16), R.range(0.55, 0.75), mix(ASH, C[4], 0.3), R.range(2.5, 3.8), R.range(0.08, 0.16));
      }
      for (const s of kinked) {
        if ((s.age += dt) < 0 || s.age >= s.life) continue;
        if ((s.next -= dt) <= 0) {
          s.next = R.range(0.025, 0.055);
          const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx) + R.sign() * R.range(0.6, 1.3);
          s.vx = Math.cos(a) * sp;
          s.vy = Math.sin(a) * sp;
          s.trail.push([s.x, s.y]);
          if (s.trail.length > 4) s.trail.shift();
        }
        s.vx -= s.vx * 3 * dt;
        s.vy -= s.vy * 3 * dt - 140 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the fern burns outward from the hit, glowing white, cooling through the palette, then fading
      if (t < SNAP) return;
      // it cools by stepping down the palette, and only the last embers dither away
      const cool = smooth(0.45, 0.85, t), fade = 1 - smooth(0.78, 0.88, t);
      for (const br of tree)
        for (let i = 1; i < br.pts.length; i++) {
          const [x0, y0] = br.pts[i - 1], [x, y, d] = br.pts[i], age = t - SNAP - d / 260;
          if (age < 0) break;
          const k = Math.exp(-age / 0.22) - cool * 0.3, c = k > 0.75 ? WHITE : k > 0.45 ? C[6] : k > 0.25 ? C[5] : k > 0.1 ? C[4] : k > -0.05 ? C[2] : C[1];
          p.line(x0, y0, x, y, c, fade);
          if (br.w >= 1 && d < 9) p.line(x0 + 1, y0, x + 1, y, k > 0.45 ? C[5] : C[2], fade);
          if ((i & 3) === 0 && k > 0) p.glow(x, y, 5, C[5], 0.35 * k * fade);
        }
      ps.draw(p, "back");
    },
    draw(p) {
      const f = Math.floor(t * 30 + 1e-4);
      // the arc snaps in from the left in two frames, holds and flickers, then lets go
      if (t < 0.32) {
        const r = rng(o.seed, 2, f), b = zigzag(r, -66, Y0, 0, 0, 0.22, 0.35), u = clamp(t / SNAP);
        const k = t < SNAP ? 1 : t < 0.2 ? (f % 2 ? 0.7 : 1) : 0.55 * (1 - (t - 0.2) / 0.12);
        stroke(p, u < 1 ? { paths: [b.paths[0]] } : b, k, C, t < SNAP + 0.034 ? 0.95 : 0.7, { upTo: u, hero: t >= SNAP && t < SNAP + 0.034 });
        if (u < 1) {
          const tp = b.paths[0].pts, [hx, hy] = tp[Math.floor(u * (tp.length - 1))];
          p.circle(hx, hy, 2, WHITE);
          p.glow(hx, hy, 14, C[5], 0.6);
        }
      }
      // the hit point overloads: a tight knot of tiny zigzags re-struck every frame round a white heart
      if (t >= SNAP && t < 0.45) {
        const a = (t - SNAP) / 0.4, r = rng(o.seed, 5, f), R0 = 8 * (1 - a * 0.6), m = Math.round(11 * (1 - a * 0.5));
        for (let i = 0; i < m; i++) {
          const ang = r.range(0, TAU), d0 = r.range(0.5, R0 * 0.5), ang2 = ang + r.range(-1.2, 1.2), d1 = r.range(R0 * 0.55, R0);
          crackle(p, zigzag(r, Math.cos(ang) * d0, Math.sin(ang) * d0, Math.cos(ang2) * d1, Math.sin(ang2) * d1, 0.5, 0), 0.75 * (1 - a) + 0.25, C, 0.25);
        }
        p.circle(0, 0, 3 * (1 - a) + 1, C[5]);
        p.circle(0, 0, 2 * (1 - a) + 0.5, WHITE);
        p.glow(0, 0, 20, C[4], 0.55 * (1 - a));
        if (t < SNAP + 0.07) p.glow(0, 0, 9, WHITE, 0.4);
      }
      // the sparks: a bright head, the zigzag behind it cooling
      for (const s of kinked) {
        if (s.age < 0 || s.age >= s.life) continue;
        const k = 1 - s.age / s.life, path = [...s.trail, [s.x, s.y]];
        for (let i = 0; i < path.length - 1; i++) p.line(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], i === path.length - 2 ? (k > 0.5 ? WHITE : C[6]) : k > 0.5 ? C[5] : C[4], 0.6 + 0.4 * (i / path.length));
        p.px(s.x, s.y, k > 0.4 ? WHITE : C[5]);
        p.glow(s.x, s.y, 4, C[5], 0.4 * k);
      }
      // the light strobes as it dies
      if (t >= SNAP) p.glow(0, 0, 40 * Math.max(0, 1 - t / 0.85), C[3], 0.45 * Math.exp(-(t - SNAP) * 5) * (f % 2 ? 0.7 : 1));
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
