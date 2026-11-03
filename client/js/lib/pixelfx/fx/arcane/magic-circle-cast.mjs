// The column of light (banded across, strands wandering in it, pulses and halos climbing it, stars thrown off,
// rings shocking out across the floor) is adapted from Sprite Fusion's open-source holy light
// (https://www.spritefusion.com/pixel-art-vfx/holy-light), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, PAL, fit, band, flare, sparkle, clamp, smooth, ease, noise2, fract, TAU, WHITE } from "../../core/index.mjs";
import { floorRing, bayer, glyph } from "./_lib.mjs";

// the circle on the floor (plane px; the floor squashes depth by SY), the column, the beats
const R = 40, R2 = 35, RI = 24, RR = 30, SY = 0.3, TOP = 192, W = 11, NRUNE = 8;
const PEN = [0.04, 0.42], PEN2 = [0.1, 0.48], INNER = [0.3, 0.6], STAR = [0.52, 0.88], RUNES = [0.9, 1.3];
const FLASH = 1.52, BREAK = 2.42, GONE = 3.45, END = 3.9;

export const meta = {
  name: "Magic circle cast",
  desc: "A circle draws itself on the floor, runes ignite one by one, it flashes, and a column of light fires up and breaks apart into glints.",
  tags: ["arcane", "magic", "circle", "rune", "cast", "column", "summon", "ground", "one-shot"],
  size: [200, 220],
  origin: [100, 192],
  duration: END,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: PAL.arcane, seed: 6 },
};

const wrap = (a) => ((a % TAU) + TAU) % TAU;
const fromFront = (g) => Math.abs(Math.atan2(Math.sin(g - Math.PI / 2), Math.cos(g - Math.PI / 2)));
// when the pens pass angle g: the outer rings are drawn from the front round both sides to the back, the inner
// ring from the back all the way round
const outerAt = (g, w) => w[0] + (fromFront(g) / Math.PI) * (w[1] - w[0]);
const innerAt = (g) => INNER[0] + (wrap(g + Math.PI / 2) / TAU) * (INNER[1] - INNER[0]);
const runeAngle = (k) => -Math.PI / 2 + ((k + 0.5) * TAU) / NRUNE;
const runeLit = (k) => RUNES[0] + (k * (RUNES[1] - RUNES[0])) / (NRUNE - 1);
const runeOut = (k) => BREAK + 0.2 + k * 0.08;

// how bright the drawn circle burns: settled while it's drawn, swelling as the runes light, white at the flash
function level(t) {
  if (t < RUNES[0]) return 0.55;
  if (t < FLASH) return 0.55 + 0.4 * smooth(RUNES[0], FLASH, t);
  if (t < FLASH + 0.07) return 1.2;
  if (t < BREAK) return 0.92;
  return 0.92 * (1 - smooth(BREAK, GONE, t));
}

export function create(o) {
  const C = fit(o.palette, 8), S = o.seed, Rg = new Rng(S);
  const ps = new Particles({ rng: Rg, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  const COL = [WHITE, C[6], C[5], C[4], C[3]];
  const strands = Array.from({ length: 9 }, () => ({ o: Rg.range(-0.85, 0.85), w: Rg.range(0.04, 0.1), f: Rg.range(1, 3) }));
  // the hexagram: two triangles inside the inner ring, each drawn edge by edge
  const tri = (a0) => [0, 1, 2].map((k) => a0 + (k * TAU) / 3).map((a) => [Math.cos(a) * RI, Math.sin(a) * RI]);
  const A = tri(-Math.PI / 2), Bt = tri(Math.PI / 2), edges = [];
  for (let k = 0; k < 3; k++)
    for (const T of [A, Bt]) edges.push({ p0: T[k], p1: T[(k + 1) % 3], t0: STAR[0] + (k * (STAR[1] - STAR[0])) / 3, dur: (STAR[1] - STAR[0]) / 3 });
  let t = 0, flashed = false, broke = false;
  const out = new Array(NRUNE).fill(false);

  const lineCol = (lvl, age) => (age < 0.05 ? WHITE : age < 0.16 ? C[6] : lvl > 1 ? WHITE : lvl > 0.8 ? C[6] : lvl > 0.45 ? C[5] : lvl > 0.28 ? C[4] : C[3]);
  const lineA = (lvl) => clamp(lvl / 0.3);

  // a straight line on the floor plane, drawn by a pen from p0 to p1 over [t0, t0 + dur]; only the far (v < 0) or near part
  function planeLine(p, p0, p1, t0, dur, lvl, far) {
    const s = clamp((t - t0) / dur);
    if (s <= 0) return;
    let u0 = 0, u1 = s;
    const v0 = p0[1], v1 = p1[1];
    if ((v0 < 0) !== (v1 < 0)) {
      const uc = v0 / (v0 - v1);
      if ((v0 < 0) === far) u1 = Math.min(u1, uc);
      else u0 = uc;
    } else if ((v0 < 0) !== far) return;
    if (u1 <= u0) return;
    const P = (u) => [p0[0] + (p1[0] - p0[0]) * u, (v0 + (v1 - v0) * u) * SY];
    const [xa, ya] = P(u0), [xb, yb] = P(u1);
    p.line(xa, ya, xb, yb, (q) => lineCol(lvl, t - (t0 + (u0 + (u1 - u0) * q) * dur)), lineA(lvl));
  }

  function circle(p, far) {
    if (t >= GONE) return;
    const lvl = level(t), keep = far ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0, a = lineA(lvl);
    const ring = (r, when, chase) => floorRing(p, 0, 0, r, SY, (g) => (chase && chase(g) ? WHITE : lineCol(lvl, t - when(g))), (g) => (t < when(g) ? 0 : a), keep);
    // from the moment the runes start to light, two sparks of light chase round the outer ring, faster and faster
    const run = t > RUNES[0] && t < BREAK ? (t - RUNES[0]) * 5 + (t - RUNES[0]) ** 2 * 4 : null;
    const chase = run === null ? null : (g) => [0, Math.PI].some((o) => Math.abs(Math.atan2(Math.sin(g - run - o), Math.cos(g - run - o))) < 0.22);
    ring(R, (g) => outerAt(g, PEN), chase);
    ring(R2, (g) => outerAt(g, PEN2));
    ring(RI, innerAt);
    // ticks across the band between the two outer rings
    for (let j = 0; j < 32; j++) {
      const g = ((j + 0.5) * TAU) / 32;
      if (Math.sin(g) < 0 !== far) continue;
      const when = outerAt(g, PEN2) + 0.03;
      if (t < when) continue;
      p.line(Math.cos(g) * R2, Math.sin(g) * R2 * SY, Math.cos(g) * R, Math.sin(g) * R * SY, lineCol(lvl, t - when), a * (j % 2 ? 0.6 : 1));
    }
    for (const e of edges) planeLine(p, e.p0, e.p1, e.t0, e.dur, lvl, far);
  }

  // the runes stand on the circle; dim when the inner pen passes, lit one by one, out one by one
  function runes(p, far) {
    for (let k = 0; k < NRUNE; k++) {
      const g = runeAngle(k);
      if (Math.sin(g) < 0 !== far) continue;
      const x = Math.cos(g) * RR, y0 = Math.sin(g) * RR * SY, lit = t - runeLit(k), gone = clamp((t - runeOut(k)) / 0.25);
      if (t < innerAt(g) || gone >= 1) continue;
      if (lit < 0) {
        glyph(p, k, x, y0 - 1, C[3]);
        continue;
      }
      const rise = 3 * ease.outBack(clamp(lit / 0.2), 2.4), bob = lit > 0.2 ? Math.sin(t * 5 + k) * 0.5 : 0, y = y0 - 1 - rise + bob;
      const hot = lit < 0.07 || (t > FLASH && t < FLASH + 0.07), lvl = level(t);
      glyph(p, k, x, y, hot ? WHITE : lvl > 0.8 ? WHITE : C[6], 1 - gone, hot ? C[6] : C[4]);
      if (lit < 0.1) sparkle(p, x, y - 2, 4 * (1 - lit / 0.1) + 1, C[6], C[5], 0.5);
      p.glow(x, y - 2, 8, C[5], (0.3 + 0.3 * lvl) * (1 - gone));
      p.glow(x, y0, 6, C[4], 0.2 * (1 - gone));
    }
  }

  // the column of light: the thread that climbs first, then the beam that fires up, holds and breaks apart
  function column(p) {
    if (t < FLASH - 0.22 || t > BREAK + 0.6) return;
    if (t < FLASH) {
      const a = smooth(FLASH - 0.22, FLASH - 0.04, t), top = -(TOP - 10) * ease.outCubic(a);
      for (let y = -1; y >= top; y--) p.dot(0, y, y > top + 6 ? C[6] : WHITE, a * (0.35 + 0.65 * (1 + y / TOP)));
      p.glow(0, top, 9, C[6], 0.5 * a);
      p.glow(0, -6, 24, C[5], 0.4 * a);
      return;
    }
    const u = t - FLASH, brk = clamp((t - BREAK) / 0.45), top = -TOP * ease.outExpo(clamp(u / 0.09));
    const w = t < BREAK ? W * (1 + 0.38 * Math.exp(-u * 9)) : W * (1 - ease.outCubic(brk) * 0.85);
    const fade = 1 - smooth(BREAK + 0.25, BREAK + 0.55, t), white = u < 0.067;
    if (fade <= 0) return;
    for (let y = 3; y >= Math.ceil(top); y--) {
      const h = -y, ww = w * (1 + 0.5 * Math.exp(-Math.max(0, h) / 6)), pulse = fract(h * 0.022 - u * 2.6) < 0.07 ? 1 : 0;
      for (let x = Math.floor(-ww * 1.3); x <= Math.ceil(ww * 1.3); x++) {
        const q = Math.abs(x + 0.5) / ww;
        // as it breaks, holes open and grow and drift upward until only shards are left
        if (brk > 0 && noise2(x * 0.32, h * 0.11 - (t - BREAK) * 6, S) * 0.5 + 0.5 < brk * 1.25 - 0.1) continue;
        let lv = q < 0.2 ? 0 : q < 0.42 ? 1 : q < 0.66 ? 2 : q < 0.88 ? 3 : 4;
        for (const s of strands) if (Math.abs((x + 0.5) / ww - s.o - 0.05 * Math.sin(t * s.f + s.o * 9)) < s.w) lv = Math.max(0, lv - 1);
        lv = white ? 0 : Math.max(0, lv - pulse);
        const a = (q < 0.88 ? 1 : (1.3 - q) / 0.42) * fade;
        if (a <= bayer(x, y) * (q < 0.66 ? 0.2 : 1)) continue;
        p.px(x, y, COL[lv]);
      }
      if ((h & 7) === 0 && h < TOP - ww * 2.4 - 8) p.glow(0, y, ww * 2.4 + 6, C[5], 0.3 * fade);
    }
    // halos climbing it
    for (let i = 0; i < 6; i++) {
      const k = (t - (FLASH + 0.08 + i * 0.16)) / 0.8;
      if (k < 0 || k > 1) continue;
      const rx = w * 1.4 * (1 + k * 0.35), ry = rx * 0.3, yc = -3 - ease.outQuad(k) * 120, n = Math.ceil(rx * 7);
      for (let j = 0; j < n; j++) {
        const g = (j / n) * TAU;
        p.dot(Math.cos(g) * rx, yc + Math.sin(g) * ry, k < 0.3 ? WHITE : C[6], (1 - k) * fade * (Math.sin(g) < 0 ? 0.6 : 1));
      }
    }
    // white-hot where it meets the floor
    p.glow(0, -4, 34, C[6], 0.45 * fade);
    p.glow(0, -60, 70, C[4], 0.25 * fade);
  }

  function shock(p, far) {
    for (const [d, r0, r1, th, dur] of [[0, R * 0.6, R * 2, 6, 0.5], [0.08, R * 0.4, R * 1.4, 3, 0.4]]) {
      const k = (t - FLASH - d) / dur;
      if (k < 0 || k >= 1) continue;
      band(p, 0, 0, r0 + (r1 - r0) * ease.outCubic(k), SY, Math.max(1, th * (1 - k)), 1.15 - k, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) < 0 === far, k < 0.2);
    }
  }

  return {
    update(dt) {
      t += dt;
      // the pens shed glitter as they write
      if (t > PEN[0] && t < STAR[1] && Rg.chance(0.5)) {
        let x, y;
        if (t < PEN[1]) {
          const g = Math.PI / 2 + Rg.sign() * ((t - PEN[0]) / (PEN[1] - PEN[0])) * Math.PI;
          (x = Math.cos(g) * R), (y = Math.sin(g) * R * SY);
        } else if (t < INNER[1]) {
          const g = -Math.PI / 2 + ((t - INNER[0]) / (INNER[1] - INNER[0])) * TAU;
          (x = Math.cos(g) * RI), (y = Math.sin(g) * RI * SY);
        } else {
          const e = Rg.pick(edges.filter((e) => t >= e.t0 && t < e.t0 + e.dur)) ?? edges[0], s = clamp((t - e.t0) / e.dur);
          (x = e.p0[0] + (e.p1[0] - e.p0[0]) * s), (y = (e.p0[1] + (e.p1[1] - e.p0[1]) * s) * SY);
        }
        ps.spawn(P.EMBER, x, y - 1, Rg.range(-12, 12), Rg.range(-30, -8), Rg.range(0.25, 0.55), C[6], 1);
      }
      // gathering: light rushes in along the floor to the heart of the circle
      if (t > RUNES[1] - 0.1 && t < FLASH - 0.05 && Rg.chance(0.7)) {
        const g = Rg.range(0, TAU), D = Rg.range(R * 0.7, R * 1.1), T = Rg.range(0.16, 0.24), v = (D * 3) / (Math.exp(3 * T) - 1);
        const x = Math.cos(g) * D, y = Math.sin(g) * D * SY - 1, l = Math.hypot(x, y + 2) || 1;
        ps.spawn(P.STREAK, x, y, (-x / l) * v, ((-2 - y) / l) * v, T, Rg.chance(0.5) ? C[6] : C[5]);
      }
      if (!flashed && t >= FLASH) {
        flashed = true;
        lights.add(0, -56, 104, C[5], 0.9, 0.6);
        lights.add(0, -5, 36, WHITE, 0.8, 0.14);
        for (let i = 0; i < 36; i++) {
          const s = Rg.sign(), sp = Rg.range(80, 175);
          ps.spawn(P.SPARK, s * Rg.range(0, R * 0.5), -1, s * sp, -Rg.range(30, 180), Rg.range(0.25, 0.7));
        }
        for (let i = 0; i < 26; i++)
          ps.spawn(P.STAR, Rg.range(-R, R), -Rg.range(1, 6), Rg.range(-20, 20), -Rg.range(40, 130), Rg.range(0.5, 1.1), Rg.pick([WHITE, C[6], C[5]]), Rg.range(0.8, 2.3));
        // and a spray of twinkles flung out low across the floor
        for (let i = 0; i < 34; i++) {
          const s = Rg.sign();
          ps.spawn(P.STAR, s * Rg.range(0, 14), -Rg.range(1, 4), s * Rg.range(50, 140), -Rg.range(10, 90), Rg.range(0.4, 0.95), Rg.pick([WHITE, C[6], C[6], C[5]]), Rg.range(0.7, 2.2));
        }
      }
      // glints pop along the burning circle
      if (t > RUNES[0] && t < BREAK + 0.2 && Rg.chance(0.12)) {
        const g = Rg.range(0, TAU), r = Rg.pick([R, R2, RI]);
        ps.spawn(P.STAR, Math.cos(g) * r, Math.sin(g) * r * SY - 0.5, 0, -Rg.range(2, 8), Rg.range(0.25, 0.45), Rg.pick([WHITE, C[6]]), Rg.range(0.8, 2));
      }
      // the column throws off stars, and light streams up inside it
      if (t > FLASH && t < BREAK) {
        if (Rg.chance(0.5)) ps.spawn(P.STAR, Rg.range(-1, 1) * W * 1.5, -Rg.range(0, 120), Rg.range(-10, 10), -Rg.range(30, 85), Rg.range(0.5, 1.1), Rg.pick([WHITE, C[6], C[5]]), Rg.range(0.7, 2));
        if (Rg.chance(0.35)) ps.spawn(P.MOTE, Rg.range(-1, 1) * W * 0.8, -Rg.range(0, 50), 0, -Rg.range(160, 300), Rg.range(0.2, 0.35), Rg.chance(0.5) ? WHITE : C[6], 0.8);
      }
      // it breaks apart into glints that twinkle as they drift up
      if (!broke && t >= BREAK) {
        broke = true;
        for (let i = 0; i < 46; i++)
          ps.spawn(P.STAR, Rg.range(-1, 1) * W * 0.9, -Rg.range(2, TOP * 0.8), Rg.range(-12, 12), -Rg.range(8, 40), Rg.range(0.5, 1.15), Rg.pick([WHITE, WHITE, C[6], C[5]]), Rg.range(0.6, 2.4));
      }
      if (t > BREAK && t < BREAK + 0.4 && Rg.chance(0.8)) {
        ps.spawn(P.STAR, Rg.range(-1, 1) * W * 0.7, -Rg.range(2, TOP * 0.78), Rg.range(-8, 8), -Rg.range(10, 50), Rg.range(0.4, 0.9), Rg.pick([WHITE, C[6], C[5]]), Rg.range(0.6, 1.8));
        if (Rg.chance(0.4)) ps.spawn(P.MOTE, Rg.range(-1, 1) * W * 0.5, -Rg.range(2, TOP * 0.7), 0, -Rg.range(60, 140), Rg.range(0.2, 0.4), C[6], 0.7);
      }
      // the runes go out one by one, each in a little puff of glints
      for (let k = 0; k < NRUNE; k++)
        if (!out[k] && t >= runeOut(k)) {
          out[k] = true;
          const g = runeAngle(k), x = Math.cos(g) * RR, y = Math.sin(g) * RR * SY - 5;
          for (let i = 0; i < 4; i++) ps.spawn(P.STAR, x + Rg.range(-2, 2), y + Rg.range(-2, 2), Rg.range(-14, 14), -Rg.range(10, 40), Rg.range(0.3, 0.55), Rg.pick([WHITE, C[6]]), Rg.range(0.6, 1.6));
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const lvl = level(t);
      if (t < GONE) {
        const k = lvl * smooth(PEN[0], PEN[1] + 0.2, t);
        p.glow(0, 0, R * 1.3, C[4], 0.28 * k);
        for (const s of [-1, 1]) p.glow(s * R * 0.6, 1, R * 0.7, C[5], 0.12 * k);
      }
      shock(p, true);
      circle(p, true);
      runes(p, true);
      column(p);
      ps.draw(p, "back");
    },
    draw(p) {
      shock(p, false);
      circle(p, false);
      runes(p, false);
      // the pens: white points running round, writing light
      const pen = (x, y) => {
        sparkle(p, x, y, 2, C[6], C[5], 0.5);
        p.glow(x, y, 7, C[6], 0.45);
      };
      if (t > PEN[0] && t < PEN[1]) for (const s of [-1, 1]) {
        const g = Math.PI / 2 + s * ((t - PEN[0]) / (PEN[1] - PEN[0])) * Math.PI;
        pen(Math.cos(g) * R, Math.sin(g) * R * SY);
      }
      if (t > INNER[0] && t < INNER[1]) {
        const g = -Math.PI / 2 + ((t - INNER[0]) / (INNER[1] - INNER[0])) * TAU;
        pen(Math.cos(g) * RI, Math.sin(g) * RI * SY);
      }
      for (const e of edges)
        if (t > e.t0 && t < e.t0 + e.dur) {
          const s = (t - e.t0) / e.dur;
          pen(e.p0[0] + (e.p1[0] - e.p0[0]) * s, (e.p0[1] + (e.p1[1] - e.p0[1]) * s) * SY);
        }
      // the flash
      if (t >= FLASH && t < FLASH + 0.24) {
        const a = (t - FLASH) / 0.24;
        flare(p, 0, -8, 34 * Math.pow(1 - a, 1.5), 1 - a, C);
        p.glow(0, -26, 56, WHITE, 0.5 * (1 - a));
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
