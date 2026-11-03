// The pop (a white disc, a fast ring, sparks bursting, short arcs crawling the area as it dies away) follows
// Sprite Fusion's open-source lightning impact (https://www.spritefusion.com/pixel-art-vfx/lightning),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, bolt, sparkle, band, clamp, smooth, lerp, ease, rand, hex, mix, TAU, WHITE } from "../../core/index.mjs";
import { strokeArc } from "./_lib.mjs";

export const meta = {
  name: "EMP blast",
  desc: "A disc charge ticks, pops white, and a bubble of rolling scanlines swells out with arcs crawling its skin; it strobes, tears and shorts out into falling dead pixels.",
  tags: ["scifi", "emp", "pulse", "shockwave", "electric", "grenade", "glitch", "one-shot"],
  size: [152, 116],
  origin: [76, 84],
  duration: 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0d0820", "#1c1658", "#2d2aa0", "#3f55e8", "#5a8eff", "#9cc4ff", "#dceaff", "#ffffff"],
    fringe: "#ff5ad8",
    radius: 56,
    seed: 33,
  },
};

// the beats: it ticks, pops, the bubble swells and holds, strobes, breaks
const POP = 0.42, GROW = 0.32, STROBE = 1.25, BREAK = 1.58;

export function create(o) {
  const C = fit(o.palette, 8), F = hex(o.fringe), RM = o.radius, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]], haze: C[5] }), lights = new Lights();
  const arcs = [], dead = [];
  let t = 0, popped = false, broke = false, nextArc = 0, star = [], starAt = -1;
  const radius = () => (t < POP ? 0 : RM * (0.12 + 0.88 * ease.outExpo(clamp((t - POP) / GROW))) * (1 + 0.04 * clamp((t - POP - GROW) / 0.8)));
  // which frames the bubble cuts out in while it fails
  const off = () => t > STROBE && t < BREAK && rand(o.seed, Math.floor(t * 30)) < 0.2 + 0.5 * ((t - STROBE) / (BREAK - STROBE));

  // the charge: a mote of light just off the floor, swelling, blinking faster, crackling
  const charge = (p) => {
    if (t >= POP) return;
    const k = t / POP, r = 1 + 3.2 * k * k, tick = Math.sin(TAU * (2 * t + 10 * t * t)) > 0;
    p.circle(0, -7, r + 1, C[4]);
    p.circle(0, -7, r, tick ? WHITE : C[6]);
    const f = Math.floor(t * 30), rr = new Rng(o.seed * 97 + f);
    for (let i = 0; i < 1 + Math.floor(k * 3); i++) {
      const a = rr.range(0, TAU), l = r + 2 + rr.range(2, 6) * k;
      strokeArc(p, bolt(rr, Math.cos(a) * r, -7 + Math.sin(a) * r, Math.cos(a) * l, -7 + Math.sin(a) * l, { jag: 0.4, depth: 2 }), [C[2], C[5], C[4]], 0.7, 0.5);
    }
    p.glow(0, -7, 8 + 16 * k, C[4], 0.4 + 0.5 * k * (tick ? 1 : 0.6));
  };

  // the bubble: thin glass, brighter toward its rim, interference lines rolling down it, tears across it
  const bubble = (p, near) => {
    const r = radius();
    if (r <= 1 || t >= BREAK || off()) return;
    const age = t - POP, slot = Math.floor(t * 30), roll = age * 40, ry = r * 0.16;
    // the tears: a few rows this frame shifted sideways and burning bright
    const tears = new Map();
    for (let i = 0; i < 2 + (t > STROBE ? 4 : 0); i++) tears.set(Math.floor(-rand(o.seed, slot, i) * r), (rand(o.seed, slot, i, 1) < 0.5 ? -1 : 1) * (2 + Math.floor(rand(o.seed, slot, i, 2) * 4)));
    for (let y = Math.floor(-r); y <= Math.ceil(ry); y++) {
      const shift = tears.get(y) ?? 0;
      for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
        const sx = x - shift, d = Math.hypot(sx + 0.5, y < 0 ? y + 0.5 : 0) / r;
        // a split edge just outside the rim, as if the signal's colors had slipped
        if (d > 1) {
          if (near && y < 0 && d < 1 + 1.4 / r && (x + y) % 2 === 0) p.px(x, y, F);
          continue;
        }
        // the dome above the floor, the floor disc below it only as its rim
        if (y >= 0) {
          const e = Math.hypot((sx + 0.5) / r, (y + 0.5) / ry);
          if (e > 1 || e < 0.92 || (y > 0) !== near) continue;
          p.px(x, y, e > 0.97 ? C[6] : C[4]);
          continue;
        }
        if (!near) continue;
        const rim = d ** 6, line = ((((y - roll) % 4) + 4) % 4) < 1, band = ((((y - roll * 0.5) % 22) + 22) % 22) < 4;
        if (d > 0.965) p.px(x, y, shift ? WHITE : -y > r * 0.55 && sx < 0 ? WHITE : C[6]);
        else if (d > 0.93) p.px(x, y, C[4]);
        else if (shift) p.px(x, y, Math.abs(sx) > r * 0.8 ? F : (x & 1) ? C[6] : C[5]);
        else p.blend(x + 0.5, y + 0.5, line && band ? C[6] : line ? C[5] : band ? C[4] : C[3], 0.06 + 0.42 * rim + (line ? 0.14 + 0.24 * rim : 0) + (band ? 0.16 : 0));
      }
      if (shift && near) p.glowLine(-r, y, r, y, 4, C[5], 0.3);
    }
    if (near) {
      for (let a = 0.15; a < Math.PI - 0.1; a += 0.35) p.glow(Math.cos(a) * r, -Math.sin(a) * r, 8, C[4], 0.12);
      // junk blocks flicker on inside it
      for (let i = 0; i < 3; i++) {
        const k = rand(o.seed, slot, i, 7);
        if (k > 0.5) continue;
        const a = rand(o.seed, slot, i, 8) * Math.PI, d = rand(o.seed, slot, i, 9) * r * 0.85, bx = Math.round(Math.cos(a) * d), by = Math.round(-Math.sin(a) * d);
        p.rect(bx, by, 2 + Math.floor(k * 8), 1 + Math.floor(k * 4), k < 0.2 ? WHITE : C[5]);
      }
    }
  };

  return {
    update(dt) {
      t += dt;
      // charging: energy streaks in to the puck
      if (t < POP - 0.05 && R.chance(0.6)) {
        const a = R.range(-Math.PI, 0), D = R.range(16, 40), T = R.range(0.14, 0.22), v = (D * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, Math.cos(a) * D, -5 + Math.sin(a) * D * 0.7, -Math.cos(a) * v, -Math.sin(a) * v * 0.7, T, R.chance(0.5) ? C[6] : C[5]);
      }
      // the discharge: a star of thick arcs out of the pop, jittering each frame as it shrinks
      const sa = t - POP, sf = Math.floor(t * 30);
      if (sa >= 0 && sa < 0.26 && sf !== starAt) {
        starAt = sf;
        const len = sa < 0.05 ? ease.outBack(sa / 0.05, 2) : 1 - (sa - 0.05) / 0.26;
        star = [];
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI + (i / 6) * Math.PI + rand(o.seed, i, 3) * 0.3 - 0.15 + R.range(-0.1, 0.1), L = (20 + 16 * rand(o.seed, i, 5)) * Math.max(0.15, len);
          star.push(bolt(R, 0, -7, Math.cos(a) * L, Math.min(-1, -7 + Math.sin(a) * L), { jag: 0.28, depth: 4 }));
        }
      }
      if (sa >= 0.26) star = [];
      if (t >= POP && !popped) {
        popped = true;
        for (let i = 0; i < 16; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(50, 150);
          ps.spawn(P.MOTE, 0, -7, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.3, 0.6), R.pick([WHITE, C[6], C[5]]), 0.8);
        }
        lights.add(0, -20, 72, C[4], 0.9, 0.5);
        lights.add(0, -7, 30, WHITE, 0.9, 0.12);
        for (let i = 0; i < 60; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(90, 220);
          ps.spawn(P.SPARK, 0, -7, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.6));
        }
        for (let i = 0; i < 6; i++) ps.spawn(P.SMOKE, R.range(-3, 3), -4, R.range(-12, 12), -R.range(10, 24), R.range(1, 1.6), hex("#3c3a52"), R.range(2.5, 4), R.range(0.05, 0.3));
      }
      // arcs crawl over the bubble's skin, faster as it fails
      if (popped && !broke && t >= nextArc) {
        nextArc = t + (t > STROBE ? R.range(0.02, 0.05) : R.range(0.05, 0.11));
        const r = radius(), a0 = R.range(0.1, Math.PI - 0.1), a1 = a0 + R.sign() * R.range(0.25, 0.6), rr = r * R.range(0.92, 1);
        arcs.push({ t, pts: bolt(R, Math.cos(a0) * rr, -Math.sin(a0) * rr, Math.cos(a1) * rr, -Math.max(0.05, Math.sin(a1)) * rr, { jag: 0.3, depth: 4 }), life: R.range(0.05, 0.1) });
        if (R.chance(0.35)) ps.spawn(P.SPARK, Math.cos(a1) * rr, -Math.max(0.05, Math.sin(a1)) * rr, R.range(-80, 80), R.range(-90, 10), R.range(0.15, 0.3));
      }
      if (t >= BREAK && !broke) {
        broke = true;
        // it shorts out: the skin bursts into dead pixels, a last crackle, the charge smokes
        const r = radius();
        lights.add(0, -r * 0.4, r * 1.3, C[5], 0.8, 0.3);
        for (let i = 0; i < 70; i++) {
          const a = R.range(0.05, Math.PI - 0.05), d = r * R.range(0.6, 1);
          dead.push({ x: Math.cos(a) * d, y: -Math.sin(a) * d, vx: Math.cos(a) * R.range(5, 25), vy: -R.range(0, 20), life: R.range(0.4, 1), max: 1, s: R.chance(0.3) ? 2 : 1, c: R.pick([WHITE, C[6], C[5], C[4]]), ph: R.range(0, 9) });
        }
        for (let i = 0; i < 6; i++) {
          const a0 = R.range(0.1, Math.PI - 0.1), a1 = a0 + R.range(-0.5, 0.5);
          arcs.push({ t, pts: bolt(R, Math.cos(a0) * r, -Math.sin(a0) * r, Math.cos(a1) * r * 0.6, -Math.max(0.05, Math.sin(a1)) * r * 0.6, { jag: 0.35, depth: 4 }), life: 0.1 });
        }
        for (let i = 0; i < 8; i++) ps.spawn(P.SMOKE, R.range(-3, 3), -4, R.range(-6, 6), -R.range(8, 18), R.range(0.8, 1.2), hex("#2f2c3c"), R.range(2, 3.4), R.range(0, 0.35));
      }
      // the dead charge fizzes now and then
      if (broke && t < meta.duration - 0.8 && R.chance(0.05)) ps.spawn(P.SPARK, R.range(-3, 3), -3, R.range(-60, 60), -R.range(40, 120), R.range(0.15, 0.3));
      for (let i = arcs.length - 1; i >= 0; i--) if (t - arcs[i].t > arcs[i].life) arcs.splice(i, 1);
      for (let i = dead.length - 1; i >= 0; i--) {
        const d = dead[i];
        if ((d.life -= dt) <= 0) dead.splice(i, 1);
        d.vy += 60 * dt;
        d.x += d.vx * dt;
        d.y = Math.min(-1, d.y + d.vy * dt);
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      bubble(p, false);
      ps.draw(p, "back");
    },
    draw(p) {
      charge(p);
      bubble(p, true);
      // the pop: a white disc, a ring racing out ahead of the bubble, a flare
      const a = t - POP;
      if (a >= 0 && a < 0.06) {
        p.circle(0, -7, 12 * (1 - a / 0.06) + 3, C[6]);
        p.circle(0, -7, 9 * (1 - a / 0.06) + 1, WHITE);
      }
      if (a >= 0 && a < 0.4) {
        const k = a / 0.4, rr = 6 + (RM + 14) * ease.outCubic(k);
        band(p, 0, 0, rr, 0.16, Math.max(1, 3 * (1 - k)), 1.2 - k, [C[3], C[5], C[6], WHITE], () => true, k < 0.3);
      }
      if (a >= 0 && a < 0.16) sparkle(p, 0, -7, 10 * (1 - a / 0.16), C[6], C[5], 0.6);
      for (const b of star) strokeArc(p, b, [C[3], C[6], C[5]], 1 - (t - POP) / 0.3, 1.3);
      for (const c of arcs) strokeArc(p, c.pts, [C[2], C[5], C[4]], 1 - (t - c.t) / (c.life + 0.03), 0.8);
      // dead pixels: drifting down, blinking, going out
      for (const d of dead) {
        if (Math.sin(t * 40 + d.ph) < -0.3 && d.life < 0.6) continue;
        p.rect(d.x, d.y, d.s, d.s, d.life > 0.5 ? d.c : C[3]);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
