// The flickering outline, the white silhouette flash and the body's own pixels flying off as bits of light are
// adapted from Sprite Fusion's open-source movement (https://www.spritefusion.com/pixel-art-vfx/movement),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, band, sparkle, clamp, smooth, ease, rand, noise, noise2, TAU, WHITE, mix, scale, READY } from "../../core/index.mjs";
import { bodyOf, rimOf } from "./_lib.mjs";

export const meta = {
  name: "Disintegrate",
  desc: "The character crackles with light, flashes white, then peels away from the head down: each pixel flares white-hot and streams off on the wind as a cooling mote of light.",
  tags: ["spawn", "death", "disintegrate", "dissolve", "pixels", "energy", "light", "one-shot"],
  size: [176, 100],
  origin: [48, 86],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#120a26", "#2a1658", "#3d2f9c", "#3f68d4", "#3fa8ec", "#86e0ff", "#d6f8ff", "#ffffff"],
    accent: ["#7a3ae4", "#b682ff", "#ecd2ff"],
    wind: 1,
    seed: 5,
  },
};

const AGONY = { turn: 1.15, crouch: 0, hy: -1, fx: -14, fy: -36, bx: 15, by: -36, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [
    [-0.2, READY],
    [0.05, { turn: 1, crouch: 3, fx: -9, fy: -16, bx: 10, by: -16, ffx: -3, fbx: 4 }],
    [0.3, AGONY],
    [3.4, AGONY],
  ],
};

const FLASH = 0.42, WHITE_T = 0.07, P0 = FLASH + WHITE_T, PEEL = 1.2, CORE_Y = -20;
export const actorAlpha = (t) => (t < FLASH - 0.1 ? 1 : 0);

export function create(o) {
  const C = fit(o.palette, 8), A = fit(o.accent, 3), R = new Rng(o.seed), W = o.wind, floor = () => 0;
  // what a mote cools through after its white flare: the main ramp, or the accent for variety
  const COOL = [[C[6], C[5], C[5], C[4]], [A[2], A[1], A[1], A[0]], [WHITE, C[6], C[5], C[5]]];
  const body = bodyOf(o.actor, C), rim = rimOf(body), top = body.y, H = body.h;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[3]] }), lights = new Lights();
  // when each pixel lets go: row by row from the crown, a ragged front, the rim a beat before the middle
  for (const b of body.list) {
    const u = (b.y - top) / H;
    b.key = u + 0.14 * (rand(b.mx, b.my, 3) - 0.5) + 0.05 * noise(b.mx * 0.45, 7) - (b.edge ? 0.03 : 0);
    b.gone = false;
  }
  const front = (t) => -0.06 + 1.14 * ease.inOutSine(clamp((t - P0) / PEEL));
  const motes = [];
  // the wind: a steady push with gusts, and a slow swirl so neighbouring motes travel in sheets
  const gust = (t) => 0.7 + 0.5 * (noise(t * 1.6, 11) * 0.5 + 0.5);
  let t = 0, flashed = false;

  function letGo(b) {
    b.gone = true;
    const lo = b.y > -9 && R.chance(0.22), kind = lo ? 2 : R.chance(0.42) ? 1 : R.chance(0.07) ? 3 : 0;
    if (kind === 3) {
      ps.spawn(P.STAR, b.x, b.y, R.range(-6, 14) * W, R.range(-26, -8), R.range(0.6, 1.1), R.chance(0.5) ? C[6] : WHITE, R.range(1, 2.2));
      return;
    }
    const life = kind === 2 ? R.range(0.7, 1.2) : kind === 1 ? R.range(0.25, 0.5) : R.range(0.9, 1.7);
    // a pop off the body, outward from its middle and up, before the wind takes it
    const out = (b.x + 0.5) * R.range(2, 6);
    motes.push({
      x: b.x + 0.5, y: b.y + 0.5, vx: (out + R.range(-6, 16)) * (kind === 2 ? 0.4 : 1), vy: kind === 2 ? R.range(-30, -8) : R.range(-46, -8),
      life, max: life, c: b.c, kind, lift: R.range(0.4, 1.4), cool: COOL[R.chance(0.3) ? 1 : R.chance(0.3) ? 2 : 0], own: R.chance(0.2), rest: false, seed: R.range(0, 100),
    });
  }

  return {
    update(dt) {
      t += dt;
      // the charge: light gathers into the body in streaks
      if (t < FLASH - 0.05 && R.chance(0.55)) {
        const a = R.range(0, TAU), D = R.range(22, 44), T = R.range(0.16, 0.26), v = (D * 3) / (Math.exp(3 * T) - 1);
        const x = Math.cos(a) * D, y = Math.min(CORE_Y + Math.sin(a) * D * 0.9, -3), l = Math.hypot(x, y - CORE_Y) || 1;
        ps.spawn(P.STREAK, x, y, (-x / l) * v, ((CORE_Y - y) / l) * v, T, R.chance(0.5) ? C[6] : C[5]);
      }
      if (!flashed && t >= FLASH) {
        flashed = true;
        lights.add(0, CORE_Y, 64, C[4], 0.85, 0.6);
        lights.add(0, CORE_Y, 30, WHITE, 0.8, 0.14);
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(50, 150);
          ps.spawn(P.STAR, R.range(-6, 6), CORE_Y + R.range(-10, 10), Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 25, R.range(0.35, 0.8), R.pick([WHITE, C[6], C[5]]), R.range(0.6, 1.8));
        }
      }
      // the peel front eats the body
      if (t >= P0) {
        const f = front(t);
        for (const b of body.list) if (!b.gone && b.key < f) letGo(b);
      }
      // the wind drops once the body is gone, and the last motes hang in the air
      const g = gust(t) * (1 - 0.55 * smooth(P0 + PEEL, P0 + PEEL + 1.2, t));
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        if ((m.life -= dt) <= 0) {
          motes.splice(i, 1);
          continue;
        }
        if (m.kind === 2) {
          // heavier ash: drifts a little, falls, settles on the floor and glows out
          if (m.rest) continue;
          m.vx += (W * 30 * g - m.vx * 1.2) * dt;
          m.vy += 260 * dt - m.vy * 1.2 * dt;
          m.x += m.vx * dt;
          const ny = m.y + m.vy * dt;
          if (m.vy > 0 && ny >= -0.5) {
            if (m.vy > 50) (m.vy *= -0.35), (m.vx *= 0.6), (m.y = -0.6);
            else (m.rest = true), (m.y = -0.5);
          } else m.y = ny;
          continue;
        }
        const age = m.max - m.life, k = Math.min(1, age / 0.15);
        const fx = W * (100 * g + 30 * noise2(m.x * 0.07, m.y * 0.07 - t * 0.8, 3)) * k;
        const fy = (-30 * m.lift + 42 * noise2(m.x * 0.06 + 40, m.y * 0.06 - t * 1.1, 5)) * k;
        const drag = m.kind === 1 ? 3 : 1.5;
        m.vx += (fx - m.vx * drag) * dt;
        m.vy += (fy - m.vy * drag) * dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the floor ring from the flash, far half
      const k = (t - FLASH) / 0.5;
      if (k > 0 && k < 1) band(p, 0, 0, 6 + 30 * ease.outCubic(k), 0.18, Math.max(1, 3.5 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) < 0, k < 0.12);
      // a cold pool on the floor while the body burns away
      const pool = smooth(0.1, FLASH, t) * (1 - smooth(P0 + PEEL * 0.8, P0 + PEEL + 0.6, t));
      if (pool > 0) p.glow(0, -1, 30, C[4], 0.22 * pool);
    },
    draw(p) {
      const f = front(t);
      // charge: a crackling outline that thickens, the rim of the body catching light
      if (t < FLASH) {
        const k = t / FLASH, fr = Math.floor(t * 30);
        for (const c of rim) {
          const h = rand(c.mx * 61 + c.my, fr, 7);
          if (h < 0.12 + 0.62 * k * k) p.px(c.x, c.y, k > 0.72 && rand(c.mx, c.my, fr) < 0.5 ? WHITE : h < 0.2 ? C[6] : C[5]);
        }
        p.glow(0, CORE_Y, 26, C[4], 0.42 * k);
        p.glow(0, CORE_Y, 12, C[6], 0.25 * k * k);
      }
      // the body: drawn by us from the shudder on, flashing white, then charged, glowing hot at the front
      if (t >= FLASH - 0.1) {
        const shake = t < FLASH ? (Math.floor(t * 60) % 2 ? 1 : -1) * 0.6 : 0, white = t >= FLASH && t < P0;
        for (const b of body.list) {
          if (b.gone) continue;
          let c;
          if (white) c = b.edge ? C[6] : WHITE;
          else if (t < FLASH) c = b.edge ? mix(b.c, C[6], 0.7) : mix(b.c, C[5], 0.25);
          else {
            const d = b.key - f, above = !body.on(b.mx, b.my - 1) || body.cell(b.mx, b.my - 1).gone;
            c = above && d < 0.06 ? WHITE : d < 0.03 ? mix(b.c, C[6], 0.7) : d < 0.1 ? mix(b.c, C[5], 0.4) : b.edge ? mix(b.c, C[5], 0.5) : mix(b.c, C[4], 0.16);
          }
          p.px(b.x + shake, b.y, c);
        }
        if (white) {
          p.glow(0, CORE_Y, 34, C[5], 0.7);
          sparkle(p, 0, CORE_Y - 3, 9, C[6], C[4], 0.5);
        }
      }
      // light rides the peel front down the body
      if (t >= P0 && f < 1.05) {
        const fy = top + clamp(f) * H, k = 1 - smooth(0.85, 1.05, f);
        p.glowLine(-10, fy, 10, fy, 8, C[5], 0.32 * k);
        p.glow(0, fy, 22, C[4], 0.2 * k);
      }
      // the floor ring, near half
      const k = (t - FLASH) / 0.5;
      if (k > 0 && k < 1) band(p, 0, 0, 6 + 30 * ease.outCubic(k), 0.18, Math.max(1, 3.5 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) >= 0, k < 0.12);
      // the motes: flare white, cool down the ramp, leave a short tail, dither out
      for (const m of motes) {
        const age = m.max - m.life, k2 = m.life / m.max, a = k2 < 0.35 ? k2 / 0.35 : 1;
        let c;
        if (age < 0.034) c = mix(m.c, WHITE, 0.55);
        else if (age < 0.06) c = WHITE;
        else if (age < 0.15) c = m.cool[0];
        else {
          const u = (age - 0.15) / Math.max(0.05, m.max - 0.15), cc = m.cool[1 + Math.min(2, Math.floor(u * 3))];
          c = m.own && u < 0.5 ? mix(m.c, cc, 0.55) : cc;
          if (m.kind === 0 && Math.sin(t * 21 + m.seed) > 0.8) c = m.cool[0];
        }
        if (m.kind === 2) {
          p.dot(m.x, m.y, c, a);
          p.glow(m.x, m.y, 3, C[5], 0.3 * k2);
          continue;
        }
        const sp = Math.hypot(m.vx, m.vy), ux = m.vx / (sp || 1), uy = m.vy / (sp || 1);
        if (sp > 30 && m.kind === 0) p.dot(m.x - ux * 1.2, m.y - uy * 1.2, scale(c, 0.6), a * 0.85);
        if (sp > 85 && m.kind === 0) p.dot(m.x - ux * 2.4, m.y - uy * 2.4, scale(c, 0.4), a * 0.6);
        p.dot(m.x, m.y, c, a);
        if (k2 > 0.15) p.glow(m.x, m.y, 2.5, c, (m.kind === 1 ? 0.16 : 0.11) * k2);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
