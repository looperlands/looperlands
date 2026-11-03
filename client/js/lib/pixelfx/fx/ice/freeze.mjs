// The crack-and-burst recipe (cracks walking out from a point, a white frame, the ice flung apart as shards
// with ice dust and glints) is adapted from Sprite Fusion's open-source ice
// (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, flare, sparkle, clamp, smooth, seg, ease, rand, mix, TAU, WHITE, READY } from "../../core/index.mjs";
import { Panes, endBy, inPoly, centroid, splitPoly, iceOf, fractures, drawFractures } from "./_lib.mjs";

export const meta = {
  name: "Freeze",
  desc: "Frost races in and climbs the character, turning it to ice; a faceted block crystallizes round it pane by pane, glints, cracks and bursts, and the character thaws free.",
  tags: ["ice", "freeze", "frozen", "status", "crowd-control", "one-shot"],
  size: [176, 128],
  origin: [88, 108],
  duration: 4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], seed: 5 },
};

const FEAR = { turn: 0.9, lean: -2, crouch: 2, fx: -8, fy: -31, bx: 9, by: -31, ffx: -3, fbx: 4 };
const FREE = { turn: 1, crouch: 5, fx: -12, fy: -18, bx: 12, by: -18, ffx: -5, fbx: 6 };
export const act = {
  onBody: true,
  poses: [
    [-0.2, READY],
    [0.05, READY],
    [0.16, FEAR, "snap"],
    [0.3, { ...FEAR, lean: -1, fx: -10, fy: -34 }],
    [0.45, { ...FEAR, lean: -3, bx: 11, by: -34, fx: -7, fy: -29 }],
    [0.62, FEAR],
    [2.52, FEAR],
    [2.54, FREE, "snap"],
    [2.9, { ...FREE, crouch: 4 }],
    [3.1, { ...FREE, crouch: 3, lean: 1 }],
    [3.3, { ...FREE, crouch: 3, lean: -1 }],
    [4, READY],
  ],
  hits: [{ t: 0.62, stop: 0.03, shake: 0.08, amp: 1 }, { t: 2.52, stop: 0.05, shake: 0.2, amp: 2 }],
};

const SNAP = 0.16; // frost lines race in along the floor to the feet
const CLIMB = [0.14, 0.62]; // and climb the character
const SEAL = 0.6; // the block crystallizes, pane by pane
const SWEEPS = [1.12, 1.82]; // light slides across the faces while it holds
const CRACK = 2.2, CRACK2 = 2.34, FLASH = 2.46, BURST = 2.52, THAW = 0.36;
const MELT = [2.95, 3.7]; // the floor frost goes
const REACH = 38, CORE = [0, -21];

// the block: a crown of three crystal points over straight sides, eleven corners round the character and
// eight inside, cut into thirteen panes. Each pane: its corners, how much light it catches (0 shadow .. 1 lit)
// and when it crystallizes after SEAL (from the floor up).
const V = {
  l0: [-15, 0], l1: [-17, -10], l2: [-17, -31], p1: [-12, -45], n1: [-6, -42], p2: [0, -52], n2: [6, -43], p3: [12, -47], r2: [17, -30], r1: [16, -9], r0: [14, 0],
  i0: [-6, -36], i1: [6, -35], i2: [-9, -21], i3: [3, -25], i4: [9, -13], i5: [-5, -8], i6: [2, 0], i7: [0, -40],
};
const FACETS = [
  ["l0 l1 i5 i6", 0.62, 0], ["i5 i4 i6", 0.42, 0.03], ["i4 r2 r1 r0 i6", 0.2, 0.05], ["l1 l2 i2 i5", 0.74, 0.08], ["i2 i3 i4 i5", 0.5, 0.1],
  ["i1 r2 i4 i3", 0.28, 0.13], ["l2 i0 i2", 0.7, 0.15], ["i0 i1 i3 i2", 0.58, 0.18], ["n1 i7 n2 i1 i0", 0.52, 0.2], ["i1 n2 p3 r2", 0.4, 0.23],
  ["l2 p1 n1 i0", 0.88, 0.25], ["p2 n2 i7", 0.66, 0.28], ["n1 p2 i7", 1, 0.31],
].map(([k, lit, at], i) => ({ pts: k.split(" ").map((v) => V[v]), lit, at: SEAL + at, i }));
const OUTLINE = "l0 l1 l2 p1 n1 p2 n2 p3 r2 r1 r0".split(" ").map((v) => V[v]);
const X0 = -18, X1 = 18, Y0 = -53, Y1 = 0, BW = X1 - X0;

// frost on the floor: a crust on the floor line, rime ferns standing up from it, a cold bloom under the surface
function floorFrost(p, C, t, out) {
  for (let x = -REACH; x <= REACH; x++) {
    const d = Math.abs(x + 0.5) / REACH, arrive = SNAP * (1 - d), age = t - arrive;
    if (age < 0) continue;
    const a = out * clamp((1.12 - d) / 0.2), g = smooth(0, 0.4, age), h = rand(x, 31), s = x < 0 ? -1 : 1;
    if (a <= 0) continue;
    p.dot(x, 0, age < 0.05 || h < 0.3 ? WHITE : C[6], a);
    if (h < 0.55) {
      const L = Math.round(g * (1 + rand(x, 7) * 3.4) * (1 - d * 0.55));
      for (let j = 1; j <= L; j++) p.dot(x, -j, j === L ? WHITE : C[5], a);
      if (L >= 2) p.dot(x + s, -L + 1, C[6], a);
      if (L >= 4) p.dot(x - s, -L + 2, C[5], a);
    }
    const D = g * (2 + rand(x, 11) * 4) * (1 - d * 0.5);
    for (let j = 1; j <= D; j++) p.dot(x, j, rand(x * 13 + j, 5) < 0.07 ? WHITE : j < 2 ? C[5] : j < 4 ? C[4] : C[3], a * (1.05 - j / (D + 1)));
  }
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), A = o.actor, floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  const panes = new Panes({
    ground: floor,
    onLand: (q, x, y, v) => {
      // a pane that lands breaks into splinters that skip along the floor, with a puff of ice dust and a glint
      for (let i = 0; i < 3; i++) bits.add({ kind: B.SHARD, x: x + R.range(-2, 2), y: y - 1, vx: q.vx * 0.6 + R.range(-50, 50), vy: -R.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R.range(0.4, 0.8), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 2.4), c: C[R.int(5, 7)] });
      ps.spawn(P.VAPOUR, x, y - 1, R.range(-25, 25), -R.range(2, 10), R.range(0.4, 0.7), C[6], R.range(1.4, 2.4));
      if (R.chance(0.4)) ps.spawn(P.STAR, x, y - 2, 0, -6, R.range(0.2, 0.4), WHITE, R.range(0.8, 1.6));
    },
  });

  // ---- the character: each pixel's frozen color and when the frost reaches it. A randomized flood up from the
  // feet, quicker round the outline, so the front creeps up the edges first in ragged fingers.
  const W = A.w, H = A.h, N = W * H, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && A.mask.data[y * W + x] > 0;
  const dist = new Float32Array(N).fill(Infinity), ice = new Uint32Array(N), rim = new Uint8Array(N);
  const open = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      const i = y * W + x;
      rim[i] = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) ? 1 : 0;
      const up = !on(x - 1, y) || !on(x, y - 1);
      ice[i] = mix(up ? C[Math.min(7, C.indexOf(iceOf(A.pixels[i], C)) + 1)] : iceOf(A.pixels[i], C), C[6], 0.2);
      if (y === H - 1 || !on(x, y + 1)) if (y >= H - 4) (dist[i] = R.range(0, 1.5)), open.push(i);
    }
  const done = new Uint8Array(N);
  while (open.length) {
    let bi = 0;
    for (let j = 1; j < open.length; j++) if (dist[open[j]] < dist[open[bi]]) bi = j;
    const i = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (done[i]) continue;
    done[i] = 1;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (!on(nx, ny)) continue;
      const j = ny * W + nx, w = (rim[j] ? 0.55 : 1) * (dy < 0 ? 1 : 1.3) + R.range(0, 1.5);
      if (dist[i] + w < dist[j]) (dist[j] = dist[i] + w), open.push(j);
    }
  }
  let maxD = 0;
  for (let i = 0; i < N; i++) if (dist[i] < Infinity) maxD = Math.max(maxD, dist[i]);
  const reach = new Float32Array(N), order = [];
  for (let i = 0; i < N; i++)
    if (dist[i] < Infinity) {
      reach[i] = CLIMB[0] + (CLIMB[1] - CLIMB[0]) * Math.pow(dist[i] / maxD, 0.85);
      order.push(i);
    }
  order.sort((a, b) => reach[a] - reach[b]);
  // rime feathers: little ticks of frost standing out from the outline once the frost has passed
  const feathers = [];
  for (const i of order) {
    const x = i % W, y = (i / W) | 0;
    if (!rim[i] || rand(i, o.seed, 3) > 0.42 || y > H - 3) continue;
    const dx = !on(x - 1, y) ? -1 : !on(x + 1, y) ? 1 : rand(i, 9) < 0.5 ? -1 : 1, dy = !on(x, y - 1) ? -1 : rand(i, 4) < 0.5 ? -1 : 0;
    feathers.push({ x: A.x + x + dx, y: A.y + y + dy, dx, dy, L: 1 + Math.floor(rand(i, 7) * 2.6), at: reach[i] + 0.04 });
  }

  // ---- the block: which pane every pixel belongs to, the panes' looks, the edges they share
  const fid = new Int8Array(BW * (Y1 - Y0)).fill(-1), inBlock = (x, y) => inPoly(OUTLINE, x, y);
  for (let y = Y0; y < Y1; y++)
    for (let x = X0; x < X1; x++) {
      if (!inBlock(x + 0.5, y + 0.5)) continue;
      let f = FACETS.findIndex((F) => inPoly(F.pts, x + 0.5, y + 0.5));
      if (f < 0) f = FACETS.reduce((b, F, k) => (Math.hypot(centroid(F.pts).x - x, centroid(F.pts).y - y) < Math.hypot(centroid(FACETS[b].pts).x - x, centroid(FACETS[b].pts).y - y) ? k : b), 0);
      fid[(y - Y0) * BW + (x - X0)] = f;
    }
  const at = (x, y) => (x < X0 || x >= X1 || y < Y0 || y >= Y1 ? -1 : fid[(y - Y0) * BW + (x - X0)]);
  for (const F of FACETS) {
    F.c = centroid(F.pts);
    F.tint = C[3 + Math.round(F.lit * 3)];
    F.alpha = 0.2 + 0.24 * F.lit;
    F.d = clamp((F.c.x + 0.55 * F.c.y + 36) / 46);
    F.len = F.pts.reduce((s, q, k) => s + Math.hypot(F.pts[(k + 1) % F.pts.length][0] - q[0], F.pts[(k + 1) % F.pts.length][1] - q[1]), 0);
  }
  // every edge once: its ends, the panes it borders, whether it's on the outline and how it faces the light
  const EDGES = [];
  for (const F of FACETS)
    F.pts.forEach((a, k) => {
      const b = F.pts[(k + 1) % F.pts.length];
      let e = EDGES.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
      if (!e) EDGES.push((e = { a, b, fs: [] }));
      e.fs.push(F);
    });
  for (const e of EDGES) {
    const [x0, y0] = e.a, [x1, y1] = e.b, c = e.fs[0].c;
    let nx = y1 - y0, ny = x0 - x1;
    if (nx * ((x0 + x1) / 2 - c.x) + ny * ((y0 + y1) / 2 - c.y) < 0) (nx = -nx), (ny = -ny);
    e.outer = e.fs.length === 1;
    e.lit = (-nx * 0.55 - ny * 0.84) / Math.hypot(nx, ny);
    e.floor = y0 === 0 && y1 === 0;
    e.at = Math.min(...e.fs.map((F) => F.at));
  }
  const VERTS = Object.values(V);
  const cracks = fractures(R, (x, y) => inBlock(x, y), CORE[0], CORE[1], 3, { len: 9, a0: -2.2, spread: 3.6 });
  const cracks2 = fractures(R, (x, y) => inBlock(x, y), CORE[0] + 1, CORE[1] - 2, 6, { len: 16, fork: 0.22 });

  let t = 0, formed = 0, sealed = false, struck = 0, burst = false, white = false;
  const jolt = () => (t >= CRACK && t < CRACK + 0.06 ? 1 : t >= CRACK2 && t < FLASH ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0);

  // the frozen character: each pixel turns as the frost reaches it, white at the front; after the burst the
  // ice runs off it from the top down
  const drawCharacter = (p) => {
    const thaw = t >= BURST ? ease.inQuad(seg(t, BURST, BURST + THAW)) * (H + 2) - 2 : -1;
    for (const i of order) {
      const age = t - reach[i];
      if (age < 0) break;
      const x = i % W, y = (i / W) | 0;
      if (y < thaw) continue;
      p.px(A.x + x, A.y + y, y < thaw + 1.2 && t >= BURST ? C[7] : age < 0.016 ? WHITE : age < 0.045 ? C[6] : ice[i]);
      if (age < 0.03) p.light(A.x + x, A.y + y, C[6], 0.3);
    }
    if (t >= BURST) return;
    for (const f of feathers) {
      const g = clamp((t - f.at) / 0.08);
      if (g <= 0) continue;
      const L = Math.round(f.L * g);
      for (let j = 0; j < L; j++) p.px(f.x + f.dx * j, f.y + f.dy * j, j === L - 1 ? WHITE : C[6]);
    }
  };

  // the block: panes fill in as they crystallize (edges traced in white, a white flash, then glassy), a light
  // sweep that breaks at every facet, cracks, the white frame before it bursts
  const drawBlock = (p) => {
    if (t >= BURST || t < SEAL - 0.08) return;
    const jx = jolt(), wh = t >= FLASH;
    // light slides across the block: each facet flashes whole as the light passes it, the lit ones brightest
    for (const F of FACETS) F.g = SWEEPS.reduce((g, s0) => Math.max(g, Math.sin(Math.PI * clamp((t - s0 - F.d * 0.32) / 0.13))), 0) * (0.35 + 0.65 * F.lit);
    for (let y = Y0; y < Y1; y++)
      for (let x = X0; x < X1; x++) {
        const f = at(x, y);
        if (f < 0) continue;
        const F = FACETS[f], age = t - F.at;
        if (age < 0) continue;
        if (wh) {
          p.px(x + jx, y, WHITE);
          continue;
        }
        if (age < 0.03) {
          p.blend(x + jx, y, C[7], 0.55);
          continue;
        }
        const fresh = 1 - clamp((age - 0.03) / 0.1), g = F.g;
        p.blend(x + jx, y, fresh > 0.5 || g > 0.5 ? C[6] : F.tint, F.alpha + 0.25 * fresh + 0.15 * g);
        if (g > 0.05) p.light(x + jx, y, C[5], 0.42 * g);
      }
    // edges: the outline lit where it faces up and left, cool on the shadow side with a deep rim outside it;
    // inner edges pale; any pane that has just set rings white
    for (const e of EDGES) {
      if (e.floor || t < e.at) continue;
      const [x0, y0] = e.a, [x1, y1] = e.b, fresh = e.fs.some((F) => t - F.at < 0.1 || F.g > 0.6);
      if (e.outer && e.lit < 0 && !wh) p.line(x0 + jx + 1, y0, x1 + jx + 1, y1, C[1]);
      if (e.outer) p.glowLine(x0 + jx, y0, x1 + jx, y1, 5, C[4], 0.1);
      p.line(x0 + jx, y0, x1 + jx, y1, wh ? C[6] : fresh ? WHITE : e.outer ? (e.lit > 0.3 ? WHITE : e.lit > -0.2 ? C[6] : C[4]) : (y0 + y1) / 2 < -30 ? C[6] : C[5]);
    }
    // a pane about to set: its edges traced in white from its first corner round, a bead of light at the head
    for (const F of FACETS) {
      const age = t - F.at;
      if (age < -0.07 || age >= 0) continue;
      let left = ((age + 0.07) / 0.07) * F.len;
      for (let k = 0; k < F.pts.length && left > 0; k++) {
        const [x0, y0] = F.pts[k], [x1, y1] = F.pts[(k + 1) % F.pts.length], L = Math.hypot(x1 - x0, y1 - y0), v = Math.min(1, left / L);
        left -= L;
        p.line(x0 + jx, y0, x0 + jx + (x1 - x0) * v, y0 + (y1 - y0) * v, WHITE);
        if (v < 1) p.glow(x0 + jx + (x1 - x0) * v, y0 + (y1 - y0) * v, 6, C[6], 0.6);
      }
    }
    if (t >= CRACK && !wh) drawFractures(p, cracks, (t - CRACK) * 150, C, { ox: jx });
    if (t >= CRACK2 && !wh) drawFractures(p, cracks2, (t - CRACK2) * 190, C, { ox: jx });
  };

  return {
    update(dt) {
      t += dt;
      // frost lines race in along the floor from both sides, vapour riding them
      if (t < SNAP)
        for (const s of [-1, 1]) {
          const x = s * REACH * (1 - t / SNAP);
          if (R.chance(0.12)) ps.spawn(P.VAPOUR, x, -R.range(0, 2), -s * R.range(40, 90), -R.range(0, 5), R.range(0.3, 0.5), C[6], R.range(1.4, 2.4));
          if (R.chance(0.45)) ps.spawn(P.STREAK, x + s * R.range(0, 6), -R.range(1, 4), -s * R.range(50, 90), 0, R.range(0.1, 0.16), R.chance(0.5) ? C[6] : C[5]);
        }
      // stars and motes kicked off the climbing front
      if (t > CLIMB[0] && t < CLIMB[1] + 0.03) {
        let lo = 0;
        while (lo < order.length && reach[order[lo]] < t - 0.06) lo++;
        let hi = lo;
        while (hi < order.length && reach[order[hi]] <= t) hi++;
        if (hi > lo && R.chance(0.45)) {
          const i = order[R.int(lo, hi - 1)];
          ps.spawn(P.STAR, A.x + (i % W) + 0.5, A.y + ((i / W) | 0), R.range(-8, 8), -R.range(0, 18), R.range(0.2, 0.42), R.chance(0.5) ? C[6] : WHITE, R.range(0.6, 1.9));
        }
        if (hi > lo && R.chance(0.12)) {
          const i = order[R.int(lo, hi - 1)];
          ps.spawn(P.FLAKE, A.x + (i % W), A.y + ((i / W) | 0), R.range(-20, 20), -R.range(10, 30), R.range(0.5, 0.9), C[6], R.range(0.5, 1.2));
        }
      }
      // each pane snaps into place with a chip of shards, a puff and a glint
      while (formed < FACETS.length && t >= FACETS[formed].at) {
        const F = FACETS[formed++], c = centroid(F.pts);
        for (let i = 0; i < 3; i++) {
          const a = Math.atan2(c.y - CORE[1], c.x - CORE[0]) + R.range(-0.7, 0.7), sp = R.range(50, 120);
          bits.add({ kind: B.SHARD, x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 0.8, drag: 0.8, bounce: 0.3, life: R.range(0.35, 0.7), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1, 2.2), c: C[R.int(5, 7)] });
        }
        if (c.y > -14) ps.spawn(P.VAPOUR, c.x, -1, Math.sign(c.x || 1) * R.range(10, 30), -R.range(2, 8), R.range(0.5, 0.8), C[6], R.range(2.2, 3.4));
        ps.spawn(P.STAR, c.x + R.range(-2, 2), c.y + R.range(-2, 2), 0, -4, R.range(0.25, 0.45), WHITE, R.range(1.2, 2.2));
        lights.add(c.x, c.y, 16, C[6], 0.4, 0.12);
      }
      if (!sealed && formed === FACETS.length) {
        sealed = true;
        lights.add(0, -26, 70, C[5], 0.6, 0.4);
        for (let i = 0; i < 5; i++) ps.spawn(P.STAR, R.range(-15, 15), -R.range(6, 44), R.range(-6, 6), -R.range(0, 8), R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.2));
      }
      // while it holds: glints wink on the corners, cold vapour rolls off the foot, a little snow
      if (sealed && t < CRACK2) {
        if (R.chance(0.035)) {
          const [x, y] = R.pick(VERTS);
          ps.spawn(P.STAR, x + R.range(-1, 1), y + R.range(-1, 1), 0, -2, R.range(0.3, 0.6), R.chance(0.6) ? C[6] : WHITE, R.range(0.8, 2.2));
        }
        if (R.chance(0.025)) {
          const s = R.sign();
          ps.spawn(P.VAPOUR, s * R.range(12, 18), -R.range(1, 3), s * R.range(8, 24), -R.range(1, 5), R.range(0.7, 1.1), C[6], R.range(1.8, 3));
        }
        if (R.chance(0.012)) ps.spawn(P.FLAKE, R.range(-30, 30), -R.range(56, 76), R.range(-4, 4), R.range(4, 10), R.range(1.2, 1.8), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.4));
      }
      // it cracks: a jolt, chips spall off, light leaks from the cracks
      if (struck === 0 && t >= CRACK) {
        struck = 1;
        lights.add(CORE[0], CORE[1], 26, WHITE, 0.4, 0.1);
        for (let i = 0; i < 4; i++) bits.add({ kind: B.SHARD, x: R.range(-14, 14), y: -R.range(10, 40), vx: R.range(-40, 40), vy: -R.range(10, 60), g: 0.9, drag: 0.6, bounce: 0.3, life: R.range(0.5, 0.9), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1, 2), c: C[R.int(5, 7)] });
      }
      if (struck === 1 && t >= CRACK2) {
        struck = 2;
        lights.add(CORE[0], CORE[1], 40, C[6], 0.35, 0.16);
        for (let i = 0; i < 3; i++) ps.spawn(P.STAR, R.range(-12, 12), -R.range(8, 40), 0, -3, R.range(0.15, 0.3), WHITE, R.range(1, 2));
      }
      if (!white && t >= FLASH) {
        white = true;
        lights.add(CORE[0], CORE[1], 60, WHITE, 0.9, 0.1);
      }
      // it bursts: the panes fly off tumbling, shards and ice dust, glints, a flurry, a flash of light
      if (!burst && t >= BURST) {
        burst = true;
        lights.add(CORE[0], CORE[1], 64, WHITE, 0.85, 0.14);
        lights.add(CORE[0], CORE[1] - 4, 72, C[4], 0.55, 0.6);
        const chop = (pts, depth) => {
          const c = centroid(pts);
          return c.area < 20 || depth > 2 ? [pts] : splitPoly(pts, c.x, c.y, R.range(0, Math.PI)).flatMap((q) => chop(q, depth + 1));
        };
        for (const F of FACETS) {
          for (const part of chop(F.pts, 0)) {
            const m = centroid(part), dx = m.x - CORE[0], dy = m.y - CORE[1], d = Math.hypot(dx, dy) || 1, sp = R.range(40, 85) * (1.2 - Math.min(0.5, m.area / 120));
            panes.add({
              pts: part.map(([x, y]) => [x - m.x, y - m.y]), x: m.x, y: m.y, vx: (dx / d) * sp + R.range(-15, 15), vy: (dy / d) * sp * 0.6 - R.range(90, 190),
              a: 0, va: R.range(-9, 9), f: R.range(-0.8, 0.8), vf: R.sign() * R.range(5, 13), lit: F.lit, g: 0.85, drag: 0.7, brittle: true, life: R.range(1, 1.45),
            });
          }
        }
        for (let i = 0; i < 50; i++) {
          let x = 0, y = 0;
          for (let k = 0; k < 12 && at(x, y) < 0; k++) (x = R.int(X0, X1 - 1)), (y = R.int(Y0, Y1 - 1));
          const dx = x - CORE[0], dy = y - CORE[1], d = Math.hypot(dx, dy) || 1, sp = R.range(50, 130);
          bits.add({ kind: B.SHARD, x, y, vx: (dx / d) * sp, vy: (dy / d) * sp * 0.7 - R.range(60, 170), g: 0.85, drag: 0.9, bounce: 0.3, life: R.range(0.8, 1.4), a: R.range(0, TAU), va: R.range(-22, 22), s: R.range(1.5, 3.2), c: C[R.int(4, 7)] });
        }
        for (const f of feathers)
          if (R.chance(0.5)) bits.add({ kind: B.SHARD, x: f.x, y: f.y, vx: f.dx * R.range(20, 70), vy: -R.range(20, 90), g: 0.8, drag: 0.8, bounce: 0.3, life: R.range(0.4, 0.8), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1, 1.8), c: WHITE });
        for (let i = 0; i < 12; i++) {
          const s = R.sign();
          ps.spawn(P.VAPOUR, s * R.range(2, 16), -R.range(1, 6), s * R.range(30, 90), -R.range(4, 16), R.range(0.6, 1.1), C[6], R.range(2.2, 4));
        }
        for (let i = 0; i < 8; i++) ps.spawn(P.VAPOUR, R.range(-14, 14), -R.range(8, 40), R.range(-30, 30), -R.range(10, 30), R.range(0.6, 1), C[6], R.range(3, 5));
        for (let i = 0; i < 18; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(40, 130);
          ps.spawn(P.FLAKE, R.range(-10, 10), CORE[1] + R.range(-12, 12), Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.5), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.6));
        }
        for (let i = 0; i < 7; i++) ps.spawn(P.STAR, R.range(-26, 26), -R.range(6, 52), R.range(-12, 12), -R.range(4, 16), R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.4));
      }
      // glints wink on the debris as it settles
      if (burst && t < BURST + 0.9 && R.chance(0.07)) {
        const b = R.pick(bits.list.length ? bits.list : [{ x: 0, y: -10 }]);
        ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.6));
      }
      // the last of the ice runs off the character
      if (burst && t < BURST + THAW && R.chance(0.12)) {
        const y = -H + ease.inQuad(seg(t, BURST, BURST + THAW)) * H;
        bits.add({ kind: B.DRIP, x: R.range(-9, 9), y, vy: 10, g: 0.5, life: 0.8, c: C[5] });
      }
      ps.update(dt);
      bits.update(dt);
      panes.update(dt);
      lights.update(dt);
      endBy(t, meta.duration, ps, bits, panes);
    },
    drawBack(p) {
      const out = 1 - smooth(MELT[0], MELT[1], t);
      if (out > 0) floorFrost(p, C, t, out);
      ps.draw(p, "back");
    },
    draw(p) {
      drawCharacter(p);
      drawBlock(p);
      // the cold light: a pool under the ice, a glow in it that brightens as it cracks, the climbing front's light
      const hold = smooth(CLIMB[0], SEAL, t) * (1 - smooth(BURST, BURST + 0.6, t)), crk = smooth(CRACK, FLASH, t);
      if (hold > 0) {
        p.glow(0, -2, 34, C[4], 0.22 * hold * (0.85 + 0.15 * Math.sin(t * 3)));
        p.glow(CORE[0], CORE[1] - 4, 40, C[3], (0.22 + 0.1 * crk) * hold);
      }
      if (t > CLIMB[0] && t < CLIMB[1]) p.glow(0, -38 * ease.outQuad(seg(t, CLIMB[0], CLIMB[1])), 18, C[5], 0.28);
      // the seal: a star at the crown as the last pane sets
      const top = FACETS[FACETS.length - 1].at, g = t - top;
      if (g > 0 && g < 0.3) sparkle(p, V.p2[0], V.p2[1], 8 * ease.outBack(Math.min(1, g / 0.06)) * (1 - g / 0.3), C[6], C[4], 0.6);
      if (t >= FLASH && t < BURST + 0.16) {
        const a = clamp((t - FLASH) / 0.22);
        flare(p, CORE[0], CORE[1], 34 * Math.pow(1 - a, 1.4), 1 - a, C);
      }
      panes.draw(p, C);
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
