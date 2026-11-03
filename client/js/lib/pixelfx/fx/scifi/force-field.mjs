// The hit recipe (a tracer from the right, a flash and a ripple over a hex shell mapped by longitude and
// latitude, sparks glancing off) is adapted from Sprite Fusion's open-source shield
// (https://www.spritefusion.com/pixel-art-vfx/shield), MIT License, Copyright (c) 2026 Hugo Duprez.
import { P, Rng, fit, sparkle, band, bolt, forks, clamp, smooth, rand, hex, TAU, WHITE, READY } from "../../core/index.mjs";
import { Ghosts, flash, since } from "./_lib.mjs";

export const meta = {
  name: "Force field",
  desc: "A glassy dome of hex plates over the hero: plates glint, tracers from the right slam into it, a ripple and cracks of light race across, sparks glance off.",
  tags: ["scifi", "shield", "barrier", "dome", "hex", "hit", "defense", "loop"],
  size: [184, 104],
  origin: [76, 84],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#0b1030", "#152a63", "#1d4f9e", "#2582d2", "#36b9ee", "#8ae8ff", "#d4fbff", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    radius: 44,
    seed: 5,
  },
};

const HOLD = { turn: 1, crouch: 3, lean: 1, fx: -9, fy: -38, bx: 10, by: -38, ffx: -5, fbx: 6 };
const HIT_ = { ...HOLD, x: -2, crouch: 5, lean: -3 };
export const act = {
  poses: [
    [0, HOLD],
    [0.42, HOLD],
    [0.42, HIT_, "snap"],
    [0.7, { ...HOLD, x: -1 }],
    [1.1, HOLD],
    [1.5, HOLD],
    [1.5, { ...HIT_, crouch: 4, lean: -2 }, "snap"],
    [1.75, HOLD],
    [2.4, HOLD],
  ],
  hits: [{ t: 0.42, stop: 0.07, shake: 0.16, amp: 2 }, { t: 1.5, stop: 0.03, shake: 0.08, amp: 1 }],
};

const S3 = Math.sqrt(3), SA = 0.13, CA = Math.sqrt(1 - SA * SA); // we look down on the dome a little
const G = 6.3, KY = 1.12; // hex plates per radian of longitude, and their stretch in latitude
// the shots, once a loop: a heavy one that cracks the shell, a lighter one lower down that it shrugs off
const SHOTS = [
  { t: 0.42, lon: 0.66, lat: 0.62, big: true },
  { t: 1.5, lon: 0.95, lat: 0.26, big: false },
].map((s) => ({ ...s, N: [Math.cos(s.lat) * Math.sin(s.lon), Math.sin(s.lat), Math.cos(s.lat) * Math.cos(s.lon)] }));

// the pointy-top hex (corner radius 1) under grid point (gx, gy): its axial coords and center, how near its
// edge (1 on it) and how near one of its corners (0 on it)
function cell(gx, gy) {
  const fq = (S3 / 3) * gx - gy / 3, fr = (2 / 3) * gy, fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr);
  const s = Math.round(fs), dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  const hx = S3 * (q + r / 2), hy = 1.5 * r, dx = gx - hx, dy = gy - hy, ax = Math.abs(dx);
  const e = Math.max(ax, Math.abs(ax / 2 + (dy * S3) / 2), Math.abs(ax / 2 - (dy * S3) / 2)) / (S3 / 2);
  const k = Math.round((Math.atan2(dy, dx) - Math.PI / 6) / (Math.PI / 3)), ca = Math.PI / 6 + (k * Math.PI) / 3;
  return { q, r, hx, hy, e, corner: Math.hypot(dx - Math.cos(ca), dy - Math.sin(ca)) };
}

// a point on the dome (longitude, latitude) to the screen: [x, y, facing (> 0 on the near side)]
function project(R, lon, lat) {
  const X = Math.cos(lat) * Math.sin(lon), Y = Math.sin(lat), Z = Math.cos(lat) * Math.cos(lon);
  return [R * X, -R * (Y * CA - Z * SA), Y * SA + Z * CA];
}

// every pixel of the near and far shell, worked out once: where it sits on the sphere and on the plates, and
// whether it's a seam (the last pixel of a plate before the next) or a plate's lit top-left edge
const shells = new Map();
function shell(R) {
  let g = shells.get(R);
  if (g) return g;
  const near = [], far = [], N = Math.ceil(R) + 1, W = 2 * N + 1, ids = [new Map(), new Map()];
  for (let y = -N; y <= Math.ceil(R * SA) + 1; y++)
    for (let x = -N; x <= N; x++) {
      const u = (x + 0.5) / R, vy = -(y + 0.5) / R, q = u * u + vy * vy;
      if (q > 1) continue;
      const vz = Math.sqrt(1 - q);
      for (const s of [1, -1]) {
        const Y = vy * CA + s * vz * SA, Z = -vy * SA + s * vz * CA;
        if (Y < 0) continue;
        const lon = Math.atan2(u, Z), lat = Math.asin(Math.min(1, Y)), c = cell(lon * G, lat * G * KY), id = c.q * 1000 + c.r;
        (s > 0 ? near : far).push({ x, y, X: u, Y, Z, lon, lat, q: c.q, r: c.r, id, e: c.e, corner: c.corner, rim: 1 - vz, sil: (1 - Math.sqrt(q)) * R });
        ids[s > 0 ? 0 : 1].set((y + N) * W + x + N, id);
      }
    }
  [near, far].forEach((list, i) => {
    const at = (x, y) => ids[i].get((y + N) * W + x + N);
    for (const q of list) {
      const r = at(q.x + 1, q.y), d = at(q.x, q.y + 1), l = at(q.x - 1, q.y), u = at(q.x, q.y - 1);
      q.seam = (r !== undefined && r !== q.id) || (d !== undefined && d !== q.id);
      q.bevel = !q.seam && ((l !== undefined && l !== q.id) || (u !== undefined && u !== q.id));
    }
  });
  shells.set(R, (g = { near, far }));
  return g;
}

// fractures: jagged forked paths from the hit across the plates, laid out by longitude and latitude so they
// bend with the dome; each point carries how far along it is, so they can race out from the hit
const crackCache = new Map();
function cracks(R, seed, s) {
  const key = `${R}:${seed}`;
  if (crackCache.has(key)) return crackCache.get(key);
  const rn = new Rng(seed * 13 + 5), out = [];
  const toScreen = (path, u0, u1) => {
    const pts = [];
    for (let i = 0; i < path.length; i++) {
      const [lon, lat] = path[i];
      if (lat < 0.03 || lat > 1.52 || Math.abs(lon) > 1.5) break;
      pts.push([...project(R, lon, lat), u0 + ((u1 - u0) * i) / (path.length - 1)]);
    }
    return pts;
  };
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rn.range(-0.35, 0.35), L = rn.range(0.42, 0.8);
    const path = bolt(rn, s.lon, s.lat, s.lon + (Math.cos(a) * L) / Math.cos(s.lat), s.lat + Math.sin(a) * L, { jag: 0.2, depth: 4 });
    out.push(toScreen(path, 0, 1));
    for (const f of forks(rn, path, { count: rn.int(0, 2), len: L * 0.5, jag: 0.25, spread: 0.9 })) {
      const j = path.findIndex((q) => q[0] === f[0][0] && q[1] === f[0][1]), u0 = Math.max(0, j) / (path.length - 1);
      out.push(toScreen(f, u0, u0 + 0.5));
    }
  }
  crackCache.set(key, out);
  return out;
}

// what the shots throw off and the glints on the plates, born once a loop
const ghostCache = new Map();
function ghosts(o, C, R) {
  const key = `${R}:${o.seed}:${o.sparks.join()}:${o.palette.join()}`;
  if (ghostCache.has(key)) return ghostCache.get(key);
  const W = meta.size[0] - meta.origin[0], rn = new Rng(o.seed), D = meta.duration;
  const g = new Ghosts(D, { ground: () => 0, sparks: o.sparks, box: [-70, -80, W - 6, 14] });
  for (const s of SHOTS) {
    const [hx, hy] = project(R, s.lon, s.lat), n = s.big ? 1 : 0.55;
    // glancing off the curve: up and away to the right, the way the shot was going when it was turned
    for (let i = 0; i < 24 * n; i++) {
      const a = (s.big ? -0.9 : -0.55) + rn.range(-0.7, 0.65), sp = rn.range(100, 280) * (0.7 + 0.3 * n);
      g.add(s.t + rn.range(0, 0.02), P.SPARK, hx, hy, Math.cos(a) * sp, Math.sin(a) * sp - 30, rn.range(0.25, 0.75));
    }
    for (let i = 0; i < 7 * n; i++) {
      const a = -0.9 + rn.range(-1.2, 1.2), sp = rn.range(30, 90);
      g.add(s.t + rn.range(0, 0.05), P.MOTE, hx, hy, Math.cos(a) * sp, Math.sin(a) * sp - 15, rn.range(0.3, 0.6), rn.pick([C[5], C[6], C[4]]), 0.7);
    }
    for (let i = 0; i < 3 * n; i++) g.add(s.t + 0.04 + i * 0.07, P.STAR, hx + rn.range(-6, 6), hy + rn.range(-5, 5), 0, -4, rn.range(0.3, 0.5), C[6], rn.range(1, 2));
    for (let i = 0; i < 3 * n; i++) g.add(s.t + 0.03 + i * 0.04, P.SMOKE, hx + 2 + rn.range(-2, 2), hy - 1, rn.range(8, 22), rn.range(-14, -4), rn.range(0.9, 1.3), hex("#5b5f78"), rn.range(2.2, 3.4));
  }
  // a star on each plate as it glints
  for (let r = 0; r < 12; r++)
    for (let q = -14; q <= 14; q++) {
      if (!glints(o.seed, q, r)) continue;
      const lon = (S3 * (q + r / 2)) / G, lat = (1.5 * r) / (G * KY), [x, y, f] = project(R, lon, lat);
      if (f < 0.25 || lat < 0.15 || lat > 1.45 || Math.abs(lon) > 1.3) continue;
      g.add(glintAt(o.seed, q, r) + 0.03, P.STAR, x, y, 0, -3, 0.4, C[6], 1.4 + rand(q, r, 9));
    }
  ghostCache.set(key, g);
  return g;
}
const glints = (S, q, r) => rand(S, q, r, 3) < 0.2;
// when a plate glints: only in the quiet part of the loop, so nothing competes with the big hit
const glintAt = (S, q, r) => {
  const g = rand(S, q, r) * 1.7;
  return g < 1.4 ? 1 + g : g - 1.4;
};

function drawShell(p, t, o, C, near) {
  const R = o.radius, D = meta.duration, S = o.seed, ph = t / D, { near: N, far: F } = shell(R);
  const ages = SHOTS.map((s) => since(t, s.t, D));
  // the scan: a band of light climbing the dome once a loop
  const sk = clamp((ph - 0.72) / 0.26), scanLat = -0.2 + sk * 2, scanK = Math.sin(Math.PI * sk);
  for (const q of near ? N : F) {
    const ff = q.rim * q.rim;
    // the ripples: a front racing out over the sphere from each hit, the plates behind it still humming
    let rp = 0, hot = 0;
    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i], age = ages[i];
      if (age >= 1) continue;
      const d = Math.acos(clamp(q.X * s.N[0] + q.Y * s.N[1] + q.Z * s.N[2], -1, 1)), f = 0.06 + 3.1 * age, k = (1 - age) * (s.big ? 1 : 0.7);
      rp = Math.max(rp, Math.exp(-(((d - f) / 0.15) ** 2)) * k, d < f ? 0.22 * k * k * (1 - d / f) : 0);
      const hr = s.big ? 0.3 : 0.17;
      if (age < 0.55 && d < hr) hot = Math.max(hot, age < 0.07 && d < hr * 0.75 ? 2 : (1 - age / 0.55) ** 1.5 * (1.1 - (0.6 * d) / hr));
    }
    // plates glint now and then
    let gl = 0;
    if (glints(S, q.q, q.r)) {
      const a = since(t, glintAt(S, q.q, q.r), D);
      if (a < 0.45) gl = 1 - a / 0.45;
    }
    const sc = scanK * Math.exp(-(((q.lat - scanLat) / 0.09) ** 2));
    if (!near) {
      // the far side, seen through the glass: dim seams, a breath of tint
      if (q.seam) p.blend(q.x + 0.5, q.y + 0.5, rp > 0.3 ? C[5] : C[3], clamp(0.18 + 0.25 * ff + 0.6 * rp + 0.3 * sc));
      else p.blend(q.x + 0.5, q.y + 0.5, C[2], 0.04 + 0.06 * ff + 0.15 * rp);
      continue;
    }
    if (q.sil < 1.15) {
      // the rim: a hard bright edge, whiter where the light catches it
      const lit = -q.X * 0.55 + q.Y * 0.85;
      p.px(q.x, q.y, rp > 0.4 || lit > 0.8 ? WHITE : lit > 0.3 ? C[6] : C[5]);
      p.light(q.x, q.y, C[4], 0.3);
      continue;
    }
    if (hot >= 2) {
      // the hero frame: the struck plates go white
      p.px(q.x, q.y, q.seam ? C[6] : WHITE);
      continue;
    }
    if (q.seam) {
      const I = 0.12 + 0.5 * ff + 0.08 * Math.sin(q.lon * 2.3 + q.lat * 3 - ph * TAU) + (q.corner < 0.32 ? 0.18 : 0) + 0.9 * gl + 0.7 * sc + 1.3 * rp + hot;
      const c = gl > 0.6 || rp > 0.55 || hot > 0.5 ? WHITE : I > 0.8 ? C[6] : I > 0.55 ? C[5] : C[4];
      if (I > 0.36) p.px(q.x, q.y, c);
      else p.blend(q.x + 0.5, q.y + 0.5, c, 0.3 + I);
      p.light(q.x, q.y, C[4], 0.04 + 0.08 * I);
    } else {
      // the glass: thin face-on, thicker toward the rim, a lit top-left edge on every plate
      const a = 0.05 + 0.34 * ff * q.rim + 0.1 * q.e ** 4 + (q.bevel ? 0.12 + 0.2 * ff : 0) + 0.35 * gl + 0.1 * sc + 0.3 * rp + 0.6 * hot;
      const c = hot > 0.6 ? WHITE : hot > 0.3 || gl > 0.5 ? C[6] : rp > 0.4 || q.bevel ? C[5] : ff > 0.5 ? C[4] : C[3];
      p.blend(q.x + 0.5, q.y + 0.5, c, clamp(a));
      if (rp > 0.1 || hot > 0 || gl > 0) p.light(q.x, q.y, C[4], 0.06 * (rp + hot + gl));
    }
  }
}

// the dome's foot: a ring on the floor with emitters round it, chasing
function drawFoot(p, t, C, R, near) {
  const D = meta.duration, keep = (g) => (Math.sin(g) >= 0) === near;
  band(p, 0, 0, R + 1, SA, 2, 1, [C[1], C[3], C[5], C[6]], keep);
  for (let i = 0; i < 10; i++) {
    const g = (i / 10) * TAU + 0.31;
    if (!keep(g)) continue;
    const x = Math.cos(g) * (R - 0.5), y = Math.sin(g) * R * SA, k = 0.5 + 0.5 * Math.cos(TAU * (2 * (t / D) - i / 10));
    p.px(x - 1, y, C[2]);
    p.px(x + 1, y, C[2]);
    p.px(x, y, k > 0.6 ? WHITE : C[5]);
    p.glow(x, y, 6 + 4 * k, C[4], (near ? 0.25 : 0.15) * (0.4 + k));
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius;
  for (let x = -R; x <= R; x += R / 3) p.glow(x, -1, 22, C[3], 0.1);
  drawFoot(p, t, C, R, false);
  drawShell(p, t, o, C, false);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), SP = fit(o.sparks, 4), R = o.radius, D = meta.duration, W = meta.size[0] - meta.origin[0];
  drawShell(p, t, o, C, true);
  drawFoot(p, t, C, R, true);
  for (const s of SHOTS) {
    const age = since(t, s.t, D), [hx, hy] = project(R, s.lon, s.lat), n = s.big ? 1 : 0.6;
    // the fractures: race out from the hit white-hot, then cool down the ramp and fade
    if (s.big && age < 0.9) {
      const fade = 1 - smooth(0.35, 0.9, age), reach = clamp(age / 0.09);
      for (const pass of [0, 1])
        for (const c of cracks(R, o.seed, s))
          for (let i = 1; i < c.length; i++) {
            const [x0, y0, f0] = c[i - 1], [x1, y1, f1, u] = c[i];
            if (u > reach || f0 < 0.05 || f1 < 0.05) continue;
            const k = fade * (1.2 - u * 0.4);
            if (pass === 0) {
              if (age < 0.32) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, age < 0.12 ? C[6] : C[5], k * (1 - age / 0.32));
              continue;
            }
            p.line(x0, y0, x1, y1, age < 0.12 + u * 0.08 ? WHITE : age < 0.3 + u * 0.1 ? C[6] : C[5], k);
            if (i % 3 === 0) p.glow(x1, y1, 6, C[4], 0.35 * fade * (1 - u * 0.5));
          }
    }
    // the tracer, in from the right: a streak that comes out of the edge, its tail never past where it entered
    const tk = (t - (s.t - 0.1)) / 0.1;
    if (tk >= 0 && tk < 1) {
      const sx = W - 3, sy = hy - 12, L = Math.hypot(sx - hx, sy - hy), at = (d) => [sx + ((hx - sx) * Math.max(0, d)) / L, sy + ((hy - sy) * Math.max(0, d)) / L];
      const h = L * tk, [x, y] = at(h), [x2, y2] = at(h - 2), [x7, y7] = at(h - 7), [x16, y16] = at(h - 16);
      p.line(x16, y16, x7, y7, SP[3]);
      p.line(x7, y7, x2, y2, SP[1]);
      p.line(x2, y2, x, y, SP[0]);
      p.px(x, y, WHITE);
      p.glow(x, y, 9, SP[1], 0.55);
    }
    // the impact: a white star, light that flares and dies
    if (age < 0.14) sparkle(p, hx, hy, (7 * (1 - age / 0.14) + 1) * n, C[6], C[5], 0.4);
    flash(p, t, s.t, hx, hy, 56 * n, C[4], 0.45, 0.45);
    flash(p, t, s.t, hx, hy, 12, WHITE, 0.5 * n, 0.08);
    flash(p, t, s.t, hx + 3, hy, 22, SP[1], 0.4 * n, 0.15);
  }
  // the dome's own light, and what glances off
  const a0 = since(t, SHOTS[0].t, D);
  p.glow(0, -R * 0.45, R * 1.3, C[3], 0.11 + 0.1 * Math.max(0, 1 - a0 * 2));
  ghosts(o, C, R).at(t).draw(p);
}
