// The bolt's forked shape, its halo-body-core inking and its flicker follow Sprite Fusion's open-source
// lightning (https://www.spritefusion.com/pixel-art-vfx/lightning), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, rng, cycle, smooth, WHITE, hex, loopNoise, tileNoise } from "../../core/index.mjs";
import { VOLT, PLASMA, zigzag, stroke, crackle, flight, spark } from "./_lib.mjs";

export const meta = {
  name: "Storm cloud",
  desc: "A storm cloud boils overhead, billows lit from inside by flickering discharges, ragged scud under its flat dark base; rain slants down and once a loop a bolt cracks to the floor.",
  tags: ["lightning", "storm", "weather", "cloud", "rain", "ambient", "loop"],
  size: [168, 176],
  origin: [84, 164],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: VOLT, sparks: PLASMA, cloud: ["#09070f", "#120f1e", "#1b182e", "#252640", "#323758", "#464d78", "#646b9c"], rain: ["#2b3250", "#46527a", "#6d7cab", "#a5b5e0"], seed: 8 },
};

const FPS = 30, N = 90, P = 3, BASE = -100, TOP = -156, TH = 0.35, VIS = Math.sqrt(1 - Math.sqrt(TH));
// the billows: [x, y, visible radius, squash]; a tower leaning into a flat anvil sheared off to the right, big
// billows of all sizes below it, smaller shoulders, a flat run along the base
const BILLOWS = [
  [-6, -132, 17], [18, -127, 14], [-28, -122, 12], [38, -118, 10], [0, -142, 12],
  [14, -149, 19, 0.38], [40, -148, 14, 0.34],
  [-48, -113, 10], [55, -110, 9], [-17, -115, 13], [22, -113, 12],
  [-42, -104, 11], [-10, -104, 12], [20, -104, 11], [48, -103, 9], [-63, -104, 7], [66, -103, 6],
];
// discharges inside: [frame, billow, strength]; the bolt to the floor at frame BOLT, out of billow BOLT_B
const FLASHES = [[7, 2, 0.8], [8, 9, 0.55], [29, 1, 0.75], [31, 10, 1], [33, 3, 0.5], [70, 0, 0.8], [71, 4, 0.55], [72, 5, 0.35]];
const BOLT = 52, BOLT_B = 12, BK = [1, 0.7, 0.3, 0.95, 0.5, 0.75, 0.2];
const W0 = -84, H0 = TOP - 6, GW = 168, GH = BASE + 8 - H0;
const FIELD = new Float32Array(GW * GH), GX = new Float32Array(GW * GH), GY = new Float32Array(GW * GH), LIT = new Float32Array(GW * GH);

// where each billow is this frame: drifting, breathing and boiling up on its own clock, all seamless over the loop
function billows(seed, ph) {
  return BILLOWS.map(([x, y, v, sq = 1], i) => {
    const top = y < -112 && sq === 1, boil = 0.82 + 0.3 * Math.sin(Math.PI * ((ph + i * 0.37) % 1)) ** 2;
    return { sq, x: x + 3.5 * loopNoise(ph, 0.7, seed + i) + (sq < 1 ? 4 * loopNoise(ph, 0.5, seed + i + 90) : 0), y: y + 2 * loopNoise(ph, 0.7, seed + i + 30) - (top ? 4 * (boil - 0.97) : 0), r: (v * (top ? boil : 1 + 0.08 * loopNoise(ph, 0.6, seed + i + 60))) / VIS };
  });
}

// the cloud as one field: billows summed so they fuse, clipped flat at the base, its edge ragged with drifting
// noise; shaded as one mass (a lit top, a cool middle, a dark belly), discharges lighting whole billows from inside
function cloud(p, B, ph, seed, K, C, flashes) {
  FIELD.fill(0);
  GX.fill(0);
  GY.fill(0);
  LIT.fill(0);
  for (const [i, b] of B.entries()) {
    const k = flashes.get(i) ?? 0, r2 = b.r * b.r, ry = b.r * b.sq;
    for (let y = Math.max(0, Math.floor(b.y - ry - H0)); y < Math.min(GH, Math.ceil(b.y + ry - H0)); y++)
      for (let x = Math.max(0, Math.floor(b.x - b.r - W0)); x < Math.min(GW, Math.ceil(b.x + b.r - W0)); x++) {
        const dx = x + W0 + 0.5 - b.x, dy = (y + H0 + 0.5 - b.y) / b.sq, d2 = (dx * dx + dy * dy) / r2;
        if (d2 >= 1) continue;
        const j = y * GW + x, u = 1 - d2, c = u * u;
        FIELD[j] += c;
        GX[j] += (-4 * u * dx) / r2;
        GY[j] += (-4 * u * dy) / (r2 * b.sq);
        if (k) LIT[j] += k * (0.25 + 0.75 * c) * (d2 < 1 ? 1 : 0);
      }
  }
  const ramp = [...K, C[3], C[4], C[5], C[6]], n = K.length;
  for (let y = 0; y < GH; y++) {
    const cy = y + H0 + 0.5;
    for (let x = 0; x < GW; x++) {
      const j = y * GW + x;
      if (FIELD[j] < TH - 0.06) continue;
      const cx = x + W0 + 0.5, base = BASE + 1.5 * tileNoise(cx * 0.12 + 9 * ph, 3, 9, 0, seed + 5);
      const F = FIELD[j] * (1 - smooth(base - 3, base, cy)) + 0.05 * tileNoise(cx * 0.21 + 18 * ph, cy * 0.21, 18, 0, seed);
      if (F < TH) continue;
      // the field's slope rounds each billow's top; height does the rest: lit above, cool in the middle, dark below
      const gl = Math.hypot(GX[j], GY[j]) || 1, lam = -(GX[j] * 0.42 + GY[j] * 0.9) / gl, edge = Math.min(1, gl * 5) * (F < TH + 0.08 ? 1 : 0.55);
      const h = 1 - 2 * clamp((cy - TOP) / (BASE - TOP));
      let i = 2.7 + 2.2 * h + 1.3 * lam * edge + 0.4 * tileNoise(cx * 0.16 + 12 * ph, cy * 0.16, 12, 0, seed + 9);
      if (F < TH + 0.05 && lam > 0.3 && h > -0.5) i += 1;
      if (cy > base - 6) i -= 1;
      i = clamp(Math.round(i), 0, n - 1);
      // lit from inside: brightest deep in the billow, breaking up through the cloud's own lumps toward its edges
      const L = LIT[j] * (0.7 + 0.6 * tileNoise(cx * 0.2 - 14 * ph, cy * 0.2, 14, 0, seed + 3));
      if (L > 0.12) i = Math.min(ramp.length - 1, i + Math.round(L * 5.5));
      p.px(cx, cy, ramp[i]);
    }
  }
}

// scud: ragged wisps that form under the base, drift off on the wind and fray away
function scud(p, ph, seed, K) {
  const r = rng(seed, 13);
  for (let w = 0; w < 6; w++) {
    const x0 = r.range(-60, 60), y0 = BASE + r.range(3, 9), rx = r.range(10, 20), ry = r.range(1.3, 2.2), off = r.next(), u = (ph + off) % 1, a = Math.sin(Math.PI * u) ** 0.8;
    const xc = x0 + 16 * (u - 0.5);
    for (let y = Math.floor(y0 - ry - 1); y <= y0 + ry + 1; y++)
      for (let x = Math.floor(xc - rx - 1); x <= xc + rx + 1; x++) {
        const dx = (x + 0.5 - xc) / rx, dy = (y + 0.5 - y0) / ry, nz = tileNoise((x + 0.5) * 0.35 + 10 * ph + w * 7, (y + 0.5) * 0.5, 10, 0, seed + 20 + w);
        const v = (1 - dx * dx - dy * dy) * a + 0.6 * nz - 0.25;
        if (v > 0) p.blend(x + 0.5, y + 0.5, v > 0.4 ? K[2] : K[3], Math.min(0.6, 0.2 + v * 0.7));
      }
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), K = fit(o.cloud, 7), RN = fit(o.rain, 4), S = o.sparks.map(hex), f = Math.floor(t * FPS + 1e-6) % N, ph = f / N;
  const B = billows(o.seed, ph), br = rng(o.seed, 5, BOLT), ba = f - BOLT;
  const bx0 = BILLOWS[BOLT_B][0] + br.range(-4, 4), bx1 = br.range(-24, 24);
  // what's lighting the cloud this frame: discharges inside billows, and the billow the bolt leaves from
  const flashes = new Map(FLASHES.filter(([ff]) => ff === f).map(([, b, k]) => [b, k]));
  if (ba >= 0 && ba < BK.length) flashes.set(BOLT_B, Math.max(flashes.get(BOLT_B) ?? 0, BK[ba]));
  const lights = [...flashes].map(([b, k]) => ({ x: B[b].x, y: B[b].y, k, r: B[b].r * VIS * (B[b].sq < 1 ? 1.6 : 2.2) }));
  const flash = lights.reduce((s, l) => Math.max(s, l.k), 0);

  // rain: slanting streaks from the belly, splashing on the floor, lit when the sky flashes
  cycle(t, P, 150, o.seed + 11, (g) => g.range(0.5, 0.62), (age, life, r) => {
    const x0 = r.range(-62, 62), vy = r.range(190, 240), vx = -vy * 0.18, tf = (0 - (BASE + 4)) / vy;
    if (age < tf) {
      const x = x0 + vx * age, y = BASE + 4 + vy * age, l = r.range(4, 6.5);
      p.line(x - vx * 0.018 * (l / 4), y - l, x, y, (u) => (u > 0.7 ? (flash > 0.5 ? C[5] : RN[3]) : flash > 0.5 ? C[3] : RN[u > 0.35 ? 2 : 1]));
    } else if (age < tf + 0.12) {
      const x = x0 + vx * tf, a = (age - tf) / 0.12;
      for (const s of [-1, 1]) p.px(x + s * (1 + a * 2.5), -1 - Math.sin(a * Math.PI) * 2.5, a < 0.5 ? RN[3] : RN[2]);
      if (a < 0.4) p.px(x, 0, RN[3]);
    }
  });
  // the scud hanging under the base, the cloud, then the light of whatever burns inside it
  scud(p, ph, o.seed, K);
  cloud(p, B, ph, o.seed, K, C, flashes);
  for (const l of lights) p.glow(l.x, l.y, l.r, C[4], 0.4 * l.k);
  p.glow(0, -122, 80, C[2], 0.05 + 0.22 * flash);
  // a discharge crawls along the belly now and then
  for (const [ff, b, k] of FLASHES)
    if (ff === f && k > 0.6) {
      const r = rng(o.seed, 7, ff), x = B[b].x;
      crackle(p, zigzag(r, x - r.range(12, 22), BASE - r.range(2, 6), x + r.range(12, 22), BASE - r.range(1, 5), 0.25, 0.5), 0.6, C, 0.4);
    }
  // the bolt: struck once a loop, forked, flickering, the floor lit and sparks thrown where it lands
  if (ba >= 0 && ba < BK.length) {
    const k = BK[ba];
    stroke(p, zigzag(rng(o.seed, 9, BOLT), bx0, BASE - 3, bx1, 0, 0.22, 0.7), k, C, ba === 0 ? 1.15 : 1, { hero: ba === 0 });
    p.circle(bx1, -1, 3 * k + 1.5, C[2]);
    p.circle(bx1, -1, 3 * k + 0.5, C[5]);
    p.circle(bx1, -1, 2 * k, WHITE);
    p.glow(bx1, -22, 78, C[3], 0.5 * k);
    p.glow(bx1, -3, 18, C[5], 0.45 * k);
    p.glow(bx0, BASE, 84, C[4], 0.3 * k);
  }
  const sa = (((t - BOLT / FPS) % P) + P) % P;
  for (let j = 0; j < 16; j++) {
    const q = rng(o.seed, 31, j), life = q.range(0.25, 0.6);
    if (sa >= life) continue;
    const a = -Math.PI / 2 + q.range(-1.3, 1.3), sp = q.range(60, 200), [x, y, vx, vy] = flight(bx1, -1, Math.cos(a) * sp, Math.sin(a) * sp, sa, { floor: 0 });
    spark(p, x, y, vx, vy, 1 - sa / life, S);
  }
}
