// The rubble, dust, grit, embers and smoke recipe is adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, clamp, smooth, ease, noise, rand, TAU, WHITE, hex, mix } from "../../core/index.mjs";

export const meta = {
  name: "Summon rise",
  desc: "A rune circle burns into the floor, the ground bursts, and a horned brute heaves up out of it through dust and rubble, lit from below, until its eyes flare.",
  tags: ["spawn", "summon", "demon", "rise", "runes", "dust", "rubble", "ground", "one-shot"],
  size: [176, 116],
  origin: [88, 94],
  duration: 4.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1a0608", "#3d0c0c", "#7a1a10", "#c0381a", "#f06a1e", "#ffae3a", "#ffe08a", "#ffffff"],
    body: ["#060409", "#0e0913", "#170f1e", "#211628", "#2d2036"],
    horn: ["#0c080c", "#201820", "#352a32", "#4e3f48", "#6e5c64"],
    stone: ["#1a1424", "#2b2639", "#4a4263", "#6c6488", "#9a91b4"],
    seed: 9,
  },
};

const SOOT = hex("#2a1e2a"), IGN = 0.5, RUNES = 0.78, BREAK = 1.05, EYES = 2.3, FADE = 3.4, SY = 0.3, R0 = 36, R1 = 27;

// the brute, built part by part so overlapping forms keep their own edges. Parts front to back: 1 head,
// 2 horns, 3 arms, 4 shoulders, 5 chest, 6 waist, 7 legs, 8 tail. Each pixel keeps the frontmost part over it, that
// part's surface direction (from its own blurred shape), and whether it sits on a crease over a part behind.
const PARTS = ["head", "horns", "arms", "shoulders", "chest", "waist", "legs", "tail"];
function beast() {
  const W = 46, H = 46, N = W * H, C = 22.5, parts = PARTS.map(() => new Uint8Array(N));
  let cur;
  const put = (x, y) => {
    x = Math.round(x), y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) cur[y * W + x] = 1;
  };
  const ell = (cx, cy, rx, ry) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) put(x, y);
      }
  };
  const stroke = (pts, r0, r1) => {
    const L = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += L[i - 1] = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 1, acc = 0; i < pts.length; acc += L[i - 1], i++) {
      const n = Math.ceil(L[i - 1] * 3) + 1;
      for (let j = 0; j <= n; j++) {
        const u = j / n, r = r0 + (r1 - r0) * ((acc + L[i - 1] * u) / total);
        ell(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u, r, r);
      }
    }
  };
  const [HEAD, HORNS, ARMS, SHOULDERS, CHEST, WAIST, LEGS, TAIL] = parts;
  for (const s of [-1, 1]) {
    const X = (d) => C + s * d;
    cur = HORNS;
    stroke([[X(4), 11], [X(8), 8], [X(12), 6.5], [X(15), 4], [X(16), 1.5], [X(15.2), 0]], 2.3, 0.45);
    cur = SHOULDERS;
    ell(X(10), 16, 7, 5);
    ell(X(8.5), 19.5, 5.5, 4.2);
    cur = ARMS;
    stroke([[X(14.5), 16.5], [X(17.5), 22], [X(18.5), 28]], 4, 3.2);
    stroke([[X(18.5), 28], [X(19), 33], [X(19.2), 36.5]], 3.4, 2.8);
    ell(X(19.2), 37.8, 3, 2.3);
    stroke([[X(17.2), 39], [X(16.6), 41.8]], 0.9, 0.4);
    stroke([[X(19.2), 39.5], [X(19.3), 42.6]], 0.9, 0.4);
    stroke([[X(21.2), 38.8], [X(22), 41.4]], 0.9, 0.4);
    cur = LEGS;
    stroke([[X(5.5), 31], [X(8), 37], [X(7.5), 42]], 4, 3);
    ell(X(8.5), 44.3, 4.2, 1.7);
  }
  cur = TAIL;
  stroke([[C, 30], [C + 0.5, 36], [C + 2.5, 41.5], [C + 7, 44.6], [C + 12.5, 44.2], [C + 14.5, 42.5]], 2.3, 0.6);
  cur = CHEST;
  ell(C, 22.5, 8.2, 7.5);
  cur = WAIST;
  ell(C, 29.5, 6.2, 4.5);
  cur = HEAD;
  ell(C, 12.5, 5.2, 4.6);
  ell(C, 16, 4.2, 2.8);
  const part = new Uint8Array(N);
  for (let i = 0; i < N; i++) for (let k = 0; k < parts.length; k++) if (parts[k][i]) { part[i] = k + 1; break; }
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && part[y * W + x] > 0;
  // surface direction per part: the gradient of the part blurred on its own
  const blur = (src) => {
    let a = Float32Array.from(src), b = new Float32Array(N);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          let s = 0;
          for (let d = -2; d <= 2; d++) s += x + d >= 0 && x + d < W ? a[y * W + x + d] : 0;
          b[y * W + x] = s / 5;
        }
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          let s = 0;
          for (let d = -2; d <= 2; d++) s += y + d >= 0 && y + d < H ? b[(y + d) * W + x] : 0;
          a[y * W + x] = s / 5;
        }
    }
    return a;
  };
  const amb = new Float32Array(N), down = new Float32Array(N), rim = new Float32Array(N), crease = new Uint8Array(N);
  parts.forEach((pm, k) => {
    const B = blur(pm), at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? B[y * W + x] : 0);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (part[i] !== k + 1) continue;
        const gx = at(x + 1, y) - at(x - 1, y), gy = at(x, y + 1) - at(x, y - 1), g = Math.hypot(gx, gy) || 1e-6;
        const ox = -gx / g, oy = -gy / g, e = clamp(g / 0.28);
        // a dim cool light from above and the left rounds each form; undersides fall into shadow
        amb[i] = 0.42 + e * (0.4 * Math.max(0, -oy) + 0.14 * Math.max(0, -ox) - 0.3 * Math.max(0, oy) - 0.08 * Math.max(0, ox));
        // less light reaches up into the gap between the legs, so it doesn't read as a lit doorway
        down[i] = e * Math.max(0, oy) * (Math.abs(x + 0.5 - C) < 7 && y > 27 ? 0.3 : 1);
        // a crease where this part's edge lies over a part behind it
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (y + dy) * W + x + dx;
          if (on(x + dx, y + dy) && part[j] > k + 1) crease[i] = 1;
        }
      }
  });
  // the underlight's rim: the bottom of the whole silhouette, two pixels deep; less in the gap between the legs
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      const k = !on(x, y + 1) ? 1 : !on(x, y + 2) ? 0.5 : 0;
      rim[y * W + x] = Math.abs(x + 0.5 - C) < 7 && y > 27 ? k * 0.3 : k;
    }
  const outline = [];
  for (let y = -1; y <= H; y++)
    for (let x = -1; x <= W; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) outline.push([x, y]);
  const eyes = [], tusks = [];
  for (const s of [-1, 1]) {
    eyes.push([Math.round(C + s * 2.2 - 0.5), 12], [Math.round(C + s * 3.2 - 0.5), 12]);
    tusks.push([Math.round(C + s * 3.4 - 0.5), 16], [Math.round(C + s * 3.6 - 0.5), 15]);
  }
  return { w: W, h: H, part, amb, down, rim, crease, outline, eyes, tusks, glints: [[Math.round(C - 2.7 - 0.5) - W / 2, 12 - H], [Math.round(C + 2.7 - 0.5) - W / 2, 12 - H]] };
}
const BEAST = beast();

// rune glyphs: little strokes in (along, across) units, set round the circle between its two rings
const GLYPHS = [
  [[[0, -2], [0, 2]], [[-1.5, -1], [1.5, 1]]],
  [[[-1.5, 2], [0, -2], [1.5, 2]], [[-0.8, 0.4], [0.8, 0.4]]],
  [[[-1.5, -2], [-1.5, 2], [1.5, 2]], [[0, -2], [1.5, -0.5]]],
  [[[0, -2], [0, 2]], [[0, -2], [1.6, -0.6], [0, 0.6]]],
  [[[-1.5, -2], [1.5, 2]], [[1.5, -2], [-1.5, 2]], [[-1.5, 0], [1.5, 0]]],
  [[[-1.4, -2], [1.4, -2], [-1.4, 2], [1.4, 2]]],
];

export function create(o) {
  const C = fit(o.palette, 8), SH = fit(o.body, 5), HR = fit(o.horn, 5), ST = fit(o.stone, 5), DUST = mix(ST[2], hex("#7a6c78"), 0.45), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[3]] });
  // rubble: the floor's own stone, its faces lit warm by the fire underneath
  const RUB = [ST[0], ST[1], mix(ST[2], C[2], 0.3), mix(ST[3], C[4], 0.3), mix(ST[4], C[5], 0.35)];
  const rocks = new Bits({ ground: floor }), lights = new Lights();
  const runes = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * TAU + 0.13, g: GLYPHS[(i * 5 + 2) % GLYPHS.length] }));
  // cracks radiating from the middle of the circle, on the floor plane
  const cracks = [];
  for (let i = 0; i < 7; i++) {
    let a = (i / 7) * TAU + R.range(-0.25, 0.25), r = 3;
    const pts = [[0, 0]];
    const len = R.range(R1 * 0.6, R1 * 1.05);
    while (r < len) {
      r += R.range(2, 4);
      a += R.range(-0.3, 0.3);
      pts.push([Math.cos(a) * r, Math.sin(a) * r * SY]);
    }
    cracks.push(pts);
  }
  // the rise: two heaves with a sag between, a little overshoot at the top
  const rise = (t) => {
    if (t < BREAK) return 0;
    const a = ease.outCubic(clamp((t - BREAK) / 0.4)) * 0.56, sag = 0.04 * Math.sin(Math.PI * clamp((t - BREAK - 0.42) / 0.3));
    const b = ease.outBack(clamp((t - BREAK - 0.62) / 0.45), 1.4) * 0.44;
    return a - sag + b;
  };
  // the circle's fire: lights up, flares at the break and when the eyes open, dies in the fade
  const heat = (t) => smooth(0, IGN, t) * (1 - smooth(FADE, FADE + 0.8, t)) * (1 - 0.25 * smooth(EYES + 0.2, EYES + 0.9, t)) * (0.85 + 0.15 * noise(t * 9, 3) + 0.5 * Math.exp(-((t - BREAK) ** 2) / 0.02) + 0.3 * Math.exp(-((t - EYES) ** 2) / 0.01));
  let t = 0;
  const done = {};
  // a life that ends before the effect does
  const left = (a, b) => Math.max(0.05, Math.min(R.range(a, b), meta.duration - 0.1 - t));
  const once = (k, at) => !done[k] && t >= at && (done[k] = true);
  const topEdge = () => {
    const off = BEAST.h * (1 - rise(t)), pts = [];
    for (let x = 0; x < BEAST.w; x++)
      for (let y = 0; y < BEAST.h; y++)
        if (BEAST.part[y * BEAST.w + x]) {
          const ly = y - BEAST.h + off;
          if (ly < 0) pts.push([x - BEAST.w / 2, ly]);
          break;
        }
    return pts;
  };

  return {
    update(dt) {
      t += dt;
      const h = heat(t);
      // the rings smoulder: embers and thin smoke off the lines, sparks at the burning front
      if (t < IGN) {
        const ph = (t / IGN) * Math.PI;
        for (const s of [-1, 1]) {
          const a = Math.PI / 2 + s * ph;
          const y = Math.sin(a) * R0 * SY;
          if (R.chance(0.5)) y < -0.5 ? ps.spawn(P.SPARK, Math.cos(a) * R0, y, R.range(-40, 40), -R.range(40, 130), R.range(0.2, 0.45)) : ps.spawn(P.EMBER, Math.cos(a) * R0, y, R.range(-20, 20), -R.range(30, 70), R.range(0.3, 0.6), C[6], 1.4);
        }
      }
      if (t > 0.2 && t < FADE + 0.6 && R.chance(0.2 * h)) {
        const a = R.range(0, TAU), r = R.pick([R0, R1, R0]);
        ps.spawn(P.EMBER, Math.cos(a) * r, Math.sin(a) * r * SY, R.range(-10, 10), -R.range(20, 50), left(0.8, 1.6), C[5], R.range(1, 1.8));
      }
      if (t > 0.15 && R.chance(0.4 * Math.min(1, h))) {
        const a = R.range(0, TAU), r = R.chance(0.7) ? R0 : R1;
        if (t < IGN ? Math.abs(((a - Math.PI / 2 + Math.PI * 3) % TAU) - Math.PI) < (t / IGN) * Math.PI : true)
          ps.spawn(P.FIRE, Math.cos(a) * r, Math.sin(a) * r * SY - 0.5, R.range(-4, 4), -R.range(6, 16), R.range(0.18, 0.4), 0, R.range(0.8, 1.6) * Math.min(1, h), 0, R.chance(0.25) ? PF.SMOKES : 0);
      }
      if (t > 0.3 && t < FADE + 0.4 && R.chance(0.05 * h)) {
        const a = R.range(0, TAU);
        ps.spawn(P.SMOKE, Math.cos(a) * R0 * 0.9, Math.sin(a) * R0 * SY - 1, R.range(-4, 4), -R.range(12, 24), left(1.4, 2.2), 0, R.range(2.2, 3.4));
      }
      if (once("ign", IGN)) lights.add(0, -4, 60, C[4], 0.55, 0.5);
      if (once("runes", RUNES)) lights.add(0, -4, 50, C[5], 0.5, 0.35);
      // the rumble: grit jumps on the floor, dust stirs
      if (t > RUNES && t < BREAK && R.chance(0.35)) ps.spawn(P.GRIT, R.range(-R1, R1), -0.5, R.range(-20, 20), -R.range(40, 120), R.range(0.5, 0.9), R.pick([ST[2], ST[3], ST[4]]), 1);
      if (t > RUNES && t < BREAK && R.chance(0.1)) ps.spawn(P.DUST, R.range(-R1, R1), -1, R.range(-12, 12), -R.range(4, 12), R.range(0.4, 0.7), DUST, R.range(1.5, 2.5));
      // the break: the floor bursts open
      if (once("break", BREAK)) {
        lights.add(0, -18, 64, C[4], 0.9, 0.6);
        lights.add(0, -8, 26, C[6], 0.8, 0.14);
        for (let i = 0; i < 18; i++)
          rocks.add({ kind: B.CHUNK, x: R.range(-14, 14), y: -2, vx: R.range(-75, 75), vy: -R.range(170, 320), g: 1, drag: 0.7, bounce: 0.32, life: R.range(1.6, 2.4), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1.3, 3), ramp: RUB });
        for (let i = 0; i < 60; i++) {
          const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.7, sp = R.range(80, 230) * (1 - 0.4 * Math.abs(u));
          ps.spawn(P.GRIT, u * 10, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.8), R.pick([ST[2], ST[3], ST[3], ST[4]]), R.chance(0.4) ? 2 : 1);
        }
        for (let i = 0; i < 12; i++) {
          const s = R.sign();
          ps.spawn(P.SMOKE, s * R.range(2, 14), -R.range(1, 5), s * R.range(35, 100), -R.range(4, 24), R.range(1.2, 2), DUST, R.range(3.5, 6), R.range(0, 0.1), PF.BIG);
        }
        for (let i = 0; i < 4; i++) {
          const s = R.sign();
          ps.spawn(P.SMOKE, s * R.range(10, 18), -R.range(2, 8), s * R.range(10, 30), -R.range(40, 90), R.range(1.4, 2.2), DUST, R.range(4, 6.5), R.range(0, 0.12), PF.BIG);
        }
        for (let i = 0; i < 24; i++) {
          const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(150, 360);
          ps.spawn(P.SPARK, R.range(-6, 6), -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.65));
        }
      }
      // the heave: earth slides off its shoulders, dust rolls out round its feet
      const rv = rise(t) - rise(t - dt);
      if (t > BREAK && t < BREAK + 1.2 && rv > 0) {
        if (R.chance(Math.min(0.9, rv * 140))) {
          const e = topEdge();
          if (e.length) {
            const [x, y] = R.pick(e);
            ps.spawn(P.GRIT, x, y, R.range(-25, 25), -R.range(10, 60), R.range(0.8, 1.4), R.pick([ST[2], ST[3], ST[4]]), R.chance(0.3) ? 2 : 1);
          }
        }
        if (R.chance(Math.min(0.8, rv * 70))) {
          const s = R.sign();
          ps.spawn(P.SMOKE, s * R.range(10, 22), -R.range(1, 4), s * R.range(30, 80), -R.range(2, 12), R.range(1, 1.8), DUST, R.range(3, 5.5), 0, PF.BIG);
        }
      }
      if (once("heave2", BREAK + 0.64)) {
        lights.add(0, -10, 56, C[4], 0.6, 0.4);
        for (let i = 0; i < 8; i++)
          rocks.add({ kind: B.CHUNK, x: R.sign() * R.range(10, 22), y: -2, vx: R.sign() * R.range(25, 70), vy: -R.range(90, 180), g: 1, drag: 0.7, bounce: 0.3, life: R.range(1.2, 1.8), a: R.range(0, TAU), va: R.range(-12, 12), s: R.range(1.2, 2.4), ramp: RUB });
      }
      // the eyes flare
      if (once("eyes", EYES)) {
        for (const [ex, ey] of BEAST.glints) {
          lights.add(ex, ey, 14, C[6], 0.7, 0.3);
          for (let i = 0; i < 5; i++) ps.spawn(P.SPARK, ex, ey, R.range(-90, 90), R.range(-90, 20), R.range(0.15, 0.35));
        }
        for (let i = 0; i < 10; i++) {
          const s = R.sign();
          ps.spawn(P.DUST, s * R.range(8, 20), -1, s * R.range(30, 80), -R.range(3, 10), R.range(0.4, 0.8), DUST, R.range(1.5, 3));
        }
      }
      if (t > FADE + 0.05 && t < FADE + 0.75 && R.chance(0.45)) {
        const x = R.int(4, BEAST.w - 5), y = R.int(2, BEAST.h - 4);
        if (BEAST.part[y * BEAST.w + x]) {
          const lx = x - BEAST.w / 2, ly = y - BEAST.h;
          ps.spawn(P.SMOKE, lx, ly, R.range(-6, 6), -R.range(10, 26), left(0.9, 1.5), SOOT, R.range(2, 3.4));
          if (R.chance(0.3)) ps.spawn(P.EMBER, lx, ly, R.range(-10, 10), -R.range(15, 40), left(0.6, 1.2), C[4], 1);
        }
      }
      rocks.update(dt);
      for (const b of rocks.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(6, 30), -R.range(2, 12), R.range(0.3, 0.6), DUST, R.range(1.2, 2.4));
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const h = heat(t);
      if (h <= 0.01) return;
      // the warm pool on the floor
      p.glow(0, -2, 52, C[4], 0.28 * h);
      p.glow(0, -22, 72, C[4], 0.1 * h);
      p.glow(0, -1, 22, C[5], 0.2 * h);
      // the cracks open under it and glow
      const ck = smooth(RUNES, BREAK, t) * (1 - smooth(FADE, FADE + 0.7, t));
      if (ck > 0)
        for (const pts of cracks)
          for (let i = 1; i < pts.length; i++) {
            const u = i / pts.length;
            if (u > ck * 1.1) break;
            const cool = smooth(BREAK + 0.1, BREAK + 1.1, t), ci = Math.round(6 - u * 2 - cool * 2.6);
            p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], C[clamp(ci, 2, 6)], 1);
          }
      // the rings: burnt in from the front round to the back, flickering
      const n = 220, prog = clamp(t / IGN) * Math.PI;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * TAU, d = Math.abs(((a - Math.PI / 2 + Math.PI * 3) % TAU) - Math.PI);
        if (d > prog) continue;
        const fresh = prog - d < 0.25 && t < IGN + 0.1, f = noise(a * 6 + t * 5, 4) * 0.5 + 0.5, k = h * (0.7 + 0.5 * f);
        const ca = Math.cos(a), sa = Math.sin(a);
        p.dot(ca * R0, sa * R0 * SY, fresh ? WHITE : k > 0.95 ? C[6] : k > 0.6 ? C[5] : k > 0.35 ? C[4] : C[3]);
        p.dot(ca * (R0 + 2.2), sa * (R0 + 2.2) * SY, k > 0.8 ? C[4] : C[3], 0.9);
        if (t > RUNES - 0.15) p.dot(ca * R1, sa * R1 * SY, k > 0.9 ? C[5] : k > 0.5 ? C[4] : C[3], smooth(RUNES - 0.15, RUNES + 0.05, t));
        if (j % 11 === 0) p.glow(ca * R0, sa * R0 * SY, 9, C[4], 0.22 * k);
      }
      // the runes between the rings
      const rk = smooth(RUNES - 0.1, RUNES + 0.15, t);
      if (rk > 0)
        for (const r of runes) {
          const k = h * rk * (0.75 + 0.35 * noise(t * 4 + r.a * 5, 8)), mid = (R0 + R1) / 2 + 0.5, ta = [-Math.sin(r.a), Math.cos(r.a)], na = [Math.cos(r.a), Math.sin(r.a)];
          const proj = ([u, v]) => [(na[0] * mid + ta[0] * u * 1.1 + na[0] * v) , (na[1] * mid + ta[1] * u * 1.1 + na[1] * v) * SY];
          for (const stroke of r.g)
            for (let i = 1; i < stroke.length; i++) {
              const [x0, y0] = proj(stroke[i - 1]), [x1, y1] = proj(stroke[i]);
              p.line(x0, y0, x1, y1, k > 0.9 ? C[6] : k > 0.55 ? C[5] : C[4], Math.min(1, k * 1.5));
            }
        }
      // the hole the brute climbs out of: a glowing gash
      const hole = smooth(BREAK - 0.05, BREAK + 0.15, t) * (1 - smooth(BREAK + 0.95, BREAK + 1.5, t));
      if (hole > 0) {
        const hw = 15 * hole;
        p.shade(-hw - 1, -1, hw + 1, 4, (x, y, out) => {
          const d = Math.hypot(x / hw, (y - 0.5) / 3.2);
          if (d > 1) return;
          out.c = d > 0.86 ? C[4] : d > 0.62 ? C[1] : C[0];
        });
        p.glow(0, 0, 24, C[5], 0.3 * hole * h);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      const r = rise(t), off = BEAST.h * (1 - r), h = heat(t), fade = smooth(FADE + 0.1, FADE + 0.8, t);
      if (r > 0) {
        const W = BEAST.w, H = BEAST.h, x0 = -W / 2, oy = off - H, k = Math.min(1, h);
        const gone = (x, y) => fade > 0 && fade > 0.06 + 0.86 * (0.55 * (1 - y / H) + 0.45 * rand(x, y, 3));
        // a dark edge all round, so the bulk reads against the night
        for (const [x, y] of BEAST.outline) if (y + oy < 0 && !gone(x, Math.min(H - 1, Math.max(0, y)))) p.px(x0 + x, y + oy, SH[0]);
        for (let y = 0; y < H; y++) {
          const ly = y + oy;
          if (ly >= 0) break;
          // the fire below lights the undersides: rims strongest by the floor, broad planes higher up
          const upRim = Math.exp(ly / 17) * k, upPlane = Math.exp(ly / 19) * k;
          for (let x = 0; x < W; x++) {
            const i = y * W + x, pt = BEAST.part[i];
            if (!pt || gone(x, y)) continue;
            const ramp = pt === 2 ? HR : SH, a = BEAST.amb[i];
            let si = BEAST.crease[i] ? 0 : a > 0.74 ? 4 : a > 0.56 ? 3 : a > 0.36 ? 2 : 1;
            if (pt === 2 && si > 0) si = Math.min(4, si + (y < 3 ? 2 : 1)); // horns are paler, tips palest
            // rims can run hot; the broad planes only ever warm up to deep red
            const Lr = BEAST.rim[i] * upRim, Lp = BEAST.down[i] * upPlane * 0.6;
            let c = ramp[si];
            if (Lr > 0.7) c = C[5];
            else if (Lr > 0.48) c = C[4];
            else if (Lr > 0.3 || Lp > 0.42) c = C[3];
            else if (Lr > 0.17 || Lp > 0.26) c = mix(C[2], ramp[si], 0.3);
            else if (Lr > 0.08 || Lp > 0.12) c = mix(ramp[si], C[1], 0.6);
            p.px(x0 + x, ly, c);
          }
        }
        // tusks catch the light; the eye sockets smoulder until the eyes open
        for (const [x, y] of BEAST.tusks) if (y + oy < 0 && !gone(x, y)) p.px(x0 + x, y + oy, mix(HR[4], C[4], 0.35 * k));
        for (const [x, y] of BEAST.eyes) if (y + oy < 0 && !gone(x, y)) p.px(x0 + x, y + oy, t > EYES - 0.05 ? (t < EYES + 0.1 ? WHITE : C[6]) : t > BREAK + 0.5 ? C[2] : SH[0]);
        // the eyes: a flare as they open, then a steady burn that outlasts the body
        if (t > EYES - 0.05) {
          const k = (1 - smooth(FADE + 0.6, FADE + 1.0, t)) * (0.85 + 0.15 * Math.sin(t * 13));
          for (const [ex, ey0] of BEAST.glints) {
            const ey = ey0 + off;
            if (ey >= 0) continue;
            p.glow(ex + 0.5, ey, 6, C[5], 0.5 * k);
            const g = (t - EYES) / 0.3;
            if (g > 0 && g < 1) {
              const L = 9 * Math.pow(1 - g, 1.5);
              p.line(ex - L, ey, ex + L, ey, (u) => (Math.abs(u - 0.5) < 0.18 ? WHITE : Math.abs(u - 0.5) < 0.35 ? C[6] : C[5]));
              if (g < 0.4) p.line(ex, ey - 2 * (1 - g), ex, ey + 2 * (1 - g), C[6]);
            } else if (fade > 0.6 && k > 0.05) p.px(ex, ey, C[6]);
          }
        }
        // the light that rakes up its front
        p.glow(0, -6, 30, C[4], 0.25 * h * r);
      }
      rocks.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
