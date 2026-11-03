// The flash and flare, the bolts and their flicker, the plasma spray, the scorch where bolts land and the dust
// thrown along the floor follow Sprite Fusion's open-source lightning and explosion
// (https://www.spritefusion.com/pixel-art-vfx/lightning), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, PF, Rng, fit, band, flare, sparkle, clamp, smooth, ease, rng, TAU, WHITE, hex, mix, READY } from "../../core/index.mjs";
import { VOLT, PLASMA, zigzag, stroke, crackle, scorch } from "./_lib.mjs";

export const meta = {
  name: "Thunderclap",
  desc: "A thunderclap round the caster: a white flash, forked bolts burst out and stab the floor, a heavy shock ring tears across the ground raising dust and grit, sparks streak away.",
  tags: ["lightning", "electric", "nova", "aoe", "spell", "shockwave", "one-shot"],
  size: [288, 156],
  origin: [144, 124],
  duration: 1.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: VOLT, sparks: PLASMA, reach: 104, seed: 6 },
};

const WIDE = { turn: 1.15, crouch: 5, lean: -1, fx: -15, fy: -33, bx: 15, by: -33, ffx: -7, fbx: 8 };
const CLAP_ = { turn: 1.15, y: -2, crouch: 0, fx: -1, fy: -45, bx: 1, by: -45, ffx: -3, ffy: -5, fbx: 4, fby: -5 };
export const act = {
  onBody: true,
  follow: 0,
  target: { x: 104 },
  poses: [
    [-0.46, READY],
    [-0.18, WIDE],
    [0.08, { ...WIDE, crouch: 6 }],
    [0.12, CLAP_, "snap"],
    [0.55, { ...CLAP_, y: 0, ffy: -4, fby: -4, crouch: 1 }],
    [1.05, { turn: 1, crouch: 3, fx: -10, fy: -28, bx: 11, by: -28, ffx: -4, fbx: 5 }],
    [1.7, READY],
  ],
  hits: [
    { t: 0.12, stop: 0.13, shake: 0.3, amp: 3, target: false },
    { t: 0.42, push: 2, straw: 14, y: -8, skin: "shock", shiver: 0.5 },
    { t: 1.2, push: 0, straw: 0, flash: 0, skin: null },
  ],
};

const CLAP = 0.12, CY = -22, BK = [1, 0.7, 0.95, 0.5, 0.8, 0.3];
const DUST = hex("#6e6382"), STONE = ["#655b7a", "#4a4263", "#342d45"].map(hex), ASH = hex("#5b5566");

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), REACH = o.reach, floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), hot = new Particles({ rng: R, ground: floor }), lights = new Lights();
  // eight bolts: the lower ones stab the floor, the upper ones tear into the air
  const bolts = Array.from({ length: 8 }, (_, i) => {
    const down = i % 2 === 0, side = i % 4 < 2 ? -1 : 1, a = down ? (side > 0 ? R.range(0.35, 0.75) : Math.PI - R.range(0.35, 0.75)) : side > 0 ? -R.range(0.15, 1.2) : Math.PI + R.range(0.15, 1.2);
    const L = down ? -CY / Math.sin(a) : R.range(40, 62), x1 = Math.cos(a) * L, y1 = down ? 0 : CY + Math.sin(a) * L;
    return { down, x1, y1, t0: CLAP + R.range(0, 0.06) };
  });
  const front = (t) => (t < CLAP ? 0 : 8 + (REACH - 8) * ease.outCubic(clamp((t - CLAP) / 0.5)));
  let t = 0, clapped = false;
  const landed = bolts.map(() => false);
  return {
    update(dt) {
      t += dt;
      // the breath before: sparks rush in to the caster's chest
      if (t < CLAP && R.chance(60 * dt)) {
        const a = R.range(0, TAU), d = R.range(16, 30), T = R.range(0.07, 0.1), v = (d * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, Math.cos(a) * d, CY + Math.sin(a) * d * 0.8, -Math.cos(a) * v, -Math.sin(a) * v * 0.8, T, R.chance(0.5) ? C[6] : C[5]);
      }
      if (t >= CLAP && !clapped) {
        clapped = true;
        lights.add(0, CY - 10, 100, C[4], 0.65, 0.45);
        lights.add(0, CY, 26, WHITE, 0.5, 0.07);
        for (let i = 0; i < 64; i++) {
          const a = R.range(0, TAU), sp = R.range(170, 380) * (Math.sin(a) > 0.4 ? 0.5 : 1);
          ps.spawn(P.SPARK, Math.cos(a) * 6, CY + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.2, 0.55));
        }
        for (let i = 0; i < 8; i++) ps.spawn(P.SMOKE, R.range(-8, 8), CY + R.range(-6, 6), R.range(-25, 25), -R.range(10, 30), R.range(0.8, 1.3), mix(ASH, C[4], 0.3), R.range(4, 7), R.range(0.05, 0.2));
      }
      for (const [i, b] of bolts.entries())
        if (b.down && !landed[i] && t >= b.t0) {
          landed[i] = true;
          lights.add(b.x1, -4, 46, C[4], 0.7, 0.25);
          for (let j = 0; j < 12; j++) {
            const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(70, 240);
            ps.spawn(P.SPARK, b.x1, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.5));
          }
          for (let j = 0; j < 5; j++) hot.spawn(P.SPARK, b.x1 + R.range(-2, 2), -1, R.range(-80, 80), -R.range(60, 180), R.range(0.4, 0.8));
        }
      // the ring tears the floor up as it passes: dust rolling out, grit tossed
      const fr = front(t);
      if (t > CLAP && t < CLAP + 0.5)
        for (const s of [-1, 1]) {
          if (R.chance(70 * dt)) ps.spawn(P.SMOKE, s * fr + R.range(-3, 3), -R.range(1, 4), s * R.range(10, 40), -R.range(5, 20), R.range(0.6, 1.1), DUST, R.range(3, 6) * (1 - 0.4 * (fr / REACH)), 0, PF.BIG);
          if (R.chance(50 * dt)) ps.spawn(P.GRIT, s * fr, -1, s * R.range(10, 60), -R.range(60, 180), R.range(0.8, 1.3), R.pick(STONE), R.chance(0.3) ? 2 : 1);
        }
      ps.update(dt);
      hot.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // scorch where the bolts struck, and the far half of the shock ring
      for (const b of bolts) if (b.down && t >= b.t0) scorch(p, b.x1, 0, 9, Math.pow(clamp(1 - (t - b.t0) / 1.1), 1.3), 1 - smooth(1.4, 1.85, t));
      const u = (t - CLAP) / 0.5;
      if (u > 0 && u < 1) band(p, 0, 0.5, front(t), 0.18, Math.max(2, 16 * (1 - u)), 1.25 - u, [C[1], C[2], C[4], C[6]], (g) => Math.sin(g) < 0, u < 0.15);
      ps.draw(p, "back");
      hot.draw(p, "back");
    },
    draw(p) {
      const f = Math.floor(t * 30 + 1e-4), u = (t - CLAP) / 0.5, A = o.actor;
      // the flash: the caster lit white for a frame, a flare, a core
      const a = t - CLAP;
      if (a >= 0 && a < 0.07) p.mask(A.mask, A.x, A.y, a < 0.035 ? WHITE : C[6]);
      if (a >= 0 && a < 0.2) {
        const q = a / 0.2;
        flare(p, 0, CY, 44 * Math.pow(1 - q, 1.4), 1 - q, C);
        if (q < 0.35) p.circle(0, CY, 10 * (1 - q * 2) + 2, WHITE);
        p.glow(0, CY, 44, C[5], 0.32 * (1 - q));
      }
      // the bolts: struck, flickering, re-struck every other frame
      for (const [i, b] of bolts.entries()) {
        const ba = Math.floor((t - b.t0) * 30 + 1e-4);
        if (t < b.t0 || ba >= BK.length) continue;
        const r = rng(o.seed, 3, i, ba >> 1);
        stroke(p, zigzag(r, 0, CY, b.x1, b.y1, 0.25, b.down ? 0.5 : 0.8), BK[ba], C, ba === 0 ? 1 : 0.8, { hero: ba === 0 });
        if (b.down) {
          p.circle(b.x1, -1, 3 * BK[ba] + 1, C[5]);
          p.px(b.x1, -1, WHITE);
          p.glow(b.x1, -3, 20, C[5], 0.5 * BK[ba]);
        } else if (ba < 2) sparkle(p, b.x1, b.y1, 4, C[6], C[4], 0.4);
      }
      // the shock: the near half of the floor ring, and a ring in the air that bursts out from the clap
      if (u > 0 && u < 1) {
        band(p, 0, 0.5, front(t), 0.18, Math.max(2, 16 * (1 - u)), 1.25 - u, [C[1], C[2], C[4], C[6]], (g) => Math.sin(g) >= 0, u < 0.15);
        for (const s of [-1, 1]) p.glow(s * front(t), -3, 28, C[4], 0.45 * (1 - u));
        const ua = (t - CLAP) / 0.26;
        const ra = 8 + 60 * ease.outCubic(ua);
        if (ua < 1) p.ring(0, CY, ra, Math.max(1, 2 * (1 - ua)), ua < 0.25 ? C[5] : ua < 0.6 ? C[4] : C[3], (v, g) => (CY + Math.sin(g) * ra > -1 ? 0 : 0.85 - 0.85 * ua));
      }
      // the hum after: small arcs crackle round the caster as the charge bleeds away
      if (a > 0.2 && a < 0.9) {
        const r = rng(o.seed, 9, f), k = 1 - (a - 0.2) / 0.7;
        if (r.next() < 0.8) {
          const x0 = r.range(-14, 14), y0 = r.range(-34, -4), b = r.range(0, TAU), l = r.range(6, 13);
          crackle(p, zigzag(r, x0, y0, x0 + Math.cos(b) * l, y0 + Math.sin(b) * l, 0.4, 0.3), 0.85 * k + 0.1, C, 0.35);
        }
      }
      ps.draw(p, "front");
      hot.draw(p, "front");
      lights.draw(p);
    },
  };
}
