// The smear that trails the lash (white at its leading edge, cooling down the ramp as it thins), the glint and
// crack burst at the tip, are adapted from Sprite Fusion's open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, lerp, TAU, WHITE, rand } from "../../core/index.mjs";
import { Drops, drawLeaf, drawRock, stoneShape } from "./_lib.mjs";

export const meta = {
  name: "Vine whip",
  desc: "A thorny vine bursts from the floor, rears back coiled, then lashes out right in a whip crack that sprays sap and tears off leaves, before sliding back into the ground.",
  tags: ["nature", "vine", "plant", "whip", "melee", "directional", "one-shot"],
  size: [216, 128],
  origin: [60, 114],
  duration: 1.4,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0c1a10", "#173a1a", "#24582a", "#357a34", "#52a03e", "#86c84e", "#c4ec7a", "#f4ffd0"],
    thorn: ["#2a1410", "#5e2a1a", "#a04c2e", "#e89a6a"],
    soil: ["#120c0c", "#251917", "#3b2a24", "#553d31", "#715440", "#8f6e52", "#b8966e", "#e6d0a8"],
    seed: 3,
  },
};

const N = 24, LS = 3.3, LASH = 0.36, LAG = 0.0052, TAU_S = 0.055, OMEGA = TAU / 0.21;
const CRACK = LASH + LAG * N + (Math.PI - Math.atan(OMEGA * TAU_S)) / OMEGA;

// a damped spring's step: 0 before u = 0, swings past 1, settles
const spring = (u) => (u <= 0 ? 0 : 1 - Math.exp(-u / TAU_S) * (Math.cos(OMEGA * u) + Math.sin(OMEGA * u) / (OMEGA * TAU_S)));

// the vine's points at time t: each segment's angle blends from standing, to reared back with the tip coiled
// over, to lashed out right; the lash runs up the vine as a wave, so the tip whips through last
function pose(t) {
  const grow = ease.outCubic(clamp(t / 0.14)) * (1 - ease.inCubic(clamp((t - 1.0) / 0.3))), rear = smooth(0.1, LASH, t), relax = smooth(0.82, 1.0, t);
  const pts = [[0, (1 - grow) * (N * LS + 6)]];
  for (let i = 0; i < N; i++) {
    const s = i / N, stand = -Math.PI / 2 + 0.25 * Math.sin(s * 3 + t * 7) * s;
    const back = -Math.PI / 2 - 0.3 - 1.65 * Math.pow(s, 1.3), out = -1.0 + 0.9 * Math.pow(s, 0.6);
    let a = lerp(stand, back, rear);
    a = lerp(a, out, spring(t - LASH - LAG * i));
    a = lerp(a, stand, relax);
    const [x, y] = pts[i];
    pts.push([x + Math.cos(a) * LS, y + Math.sin(a) * LS]);
  }
  return pts;
}

// a translucent polygon: the soft body of the smear under its streaks
function haze(p, pts, c, a) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) p.blend(x, y, c, a);
    }
}

const width = (s) => 1.2 + 4.8 * Math.pow(1 - s, 0.7);

// the vine itself: a thick stroke lit on its upper side with a bright edge, dark beneath, bark notches
function vine(p, pts, C) {
  for (let i = 0; i < N; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const w0 = width(i / N) / 2, w1 = width((i + 1) / N) / 2, up = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1;
    const X0 = Math.floor(Math.min(ax, bx) - 4), X1 = Math.ceil(Math.max(ax, bx) + 4), Y0 = Math.floor(Math.min(ay, by) - 4), Y1 = Math.ceil(Math.max(ay, by) + 4);
    for (let y = Y0; y <= Y1; y++)
      for (let x = X0; x <= X1; x++) {
        if (y > 0) continue;
        const px = x + 0.5 - ax, py = y + 0.5 - ay, u = (px * dx + py * dy) / (L * L);
        if (u < -0.15 || u > 1.15) continue;
        const d = px * nx + py * ny, w = lerp(w0, w1, clamp(u)) + 0.35;
        if (Math.abs(d) > w) continue;
        const side = Math.sign(d) * up, q = Math.abs(d) / w, arc = (i + u) * LS;
        let c = q > 0.8 ? (side > 0 ? C[5] : C[1]) : side > 0 ? (q > 0.35 ? C[4] : C[3]) : q > 0.4 ? C[2] : C[3];
        if (w > 1.6 && Math.abs(((arc + d * 0.8) % 5) - 2.5) < 0.45 && q < 0.8) c = C[2];
        p.px(x, y, c);
      }
  }
}

// thorns along it, alternating sides, hooked back toward the root; leaves on short stalks
function thorns(p, pts, T, C, t, R) {
  for (let i = 2; i < N - 1; i += 2) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, side = (i / 2) % 2 ? 1 : -1;
    const nx = (-dy / L) * side, ny = (dx / L) * side, w = width(i / N) / 2, len = 1.8 + 2.4 * (1 - i / N), tx0 = dx / L, ty0 = dy / L;
    const x0 = ax + nx * (w - 0.5), y0 = ay + ny * (w - 0.5), tx = x0 + nx * len - tx0 * len * 0.7, ty = y0 + ny * len - ty0 * len * 0.7;
    if (y0 > 0) continue;
    // a hooked thorn: a broad foot on the stem, a sharp lit point raking back toward the root
    p.tri(x0 - tx0 * 1.6, y0 - ty0 * 1.6, x0 + tx0 * 1.4, y0 + ty0 * 1.4, tx, ty, T[1]);
    p.line(x0 + tx0 * 0.8, y0 + ty0 * 0.8, tx, ty, T[2]);
    p.px(tx, ty, T[3]);
  }
  for (const k of [7, 13, 18]) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], a = Math.atan2(by - ay, bx - ax), side = k % 2 ? 1 : -1;
    if (ay > -2) continue;
    const la = a + side * 1.1 + Math.sin(t * 9 + k) * 0.2, lx = ax + Math.cos(la) * 4, ly = ay + Math.sin(la) * 4;
    drawLeaf(p, lx, ly, 7, 2.2, la, 0.3 + Math.sin(t * 5 + k) * 0.4, [C[1], C[3], C[5], C[6]]);
  }
}

export function create(o) {
  const C = fit(o.palette, 8), T = fit(o.thorn, 4), S = fit(o.soil, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]] });
  const drops = new Drops(floor), lights = new Lights(), chips = [], torn = [], spots = [];
  let t = 0, burst = false, cracked = false, sunk = false;
  const dirt = (n, sp) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + R.range(-1.2, 1.2), v = R.range(60, 200) * sp;
      chips.push({ x: R.range(-3, 3), y: -1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: R.range(0, TAU), va: R.range(-15, 15), s: R.range(1.4, 2.6), pts: stoneShape(R), life: Math.min(R.range(0.6, 0.9), meta.duration - 0.05 - t) });
    }
    for (let i = 0; i < n * 3; i++) {
      const a = -Math.PI / 2 + R.range(-1, 1), v = R.range(50, 200) * sp;
      ps.spawn(P.GRIT, R.range(-3, 3), -1, Math.cos(a) * v, Math.sin(a) * v, Math.min(R.range(0.5, 0.9), meta.duration - 0.05 - t), R.pick([S[5], S[4], S[3]]), R.chance(0.3) ? 2 : 1);
    }
    for (let i = 0; i < n; i++) ps.spawn(P.DUST, R.range(-4, 4), -R.range(0, 3), R.sign() * R.range(15, 60), -R.range(4, 20), Math.min(R.range(0.4, 0.8), meta.duration - 0.05 - t), S[5], R.range(2, 4));
  };
  return {
    update(dt) {
      t += dt;
      if (!burst) (burst = true), dirt(6, 1);
      if (!cracked && t >= CRACK) {
        cracked = true;
        const a = pose(t), b = pose(t - 0.01), [x, y] = a[N], vx = (x - b[N][0]) / 0.01, vy = (y - b[N][1]) / 0.01, sp = Math.hypot(vx, vy) || 1;
        lights.add(x, y, 22, WHITE, 0.5, 0.08);
        lights.add(x, y, 50, C[5], 0.35, 0.4);
        for (let i = 0; i < 18; i++) {
          const ang = Math.atan2(vy, vx) + R.range(-0.7, 0.7), v = R.range(80, 260);
          drops.add(x, y, Math.cos(ang) * v, Math.sin(ang) * v - R.range(0, 60), R.chance(0.3) ? 2 : 1);
        }
        for (let i = 0; i < 4; i++) torn.push({ x, y, vx: (vx / sp) * R.range(40, 120) + R.range(-30, 30), vy: R.range(-90, -20), a: R.range(0, TAU), va: R.range(-12, 12), fl: R.range(0, TAU), vf: R.range(8, 16), life: R.range(0.65, 0.8), max: 0 });
        for (const l of torn) l.max = l.life;
        for (let i = 0; i < 8; i++) ps.spawn(P.STAR, x + R.range(-6, 6), y + R.range(-6, 6), R.range(-20, 20), R.range(-20, 20), R.range(0.15, 0.35), C[7], R.range(0.6, 1.6));
      }
      if (!sunk && t >= 1.08) (sunk = true), dirt(3, 0.5);
      drops.update(dt, (d) => spots.push({ x: d.x, t0: t, w: d.s * 0.7 + R.range(0.2, 1) }));
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        if ((c.life -= dt) <= 0) chips.splice(i, 1);
        c.vy += 950 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.a += c.va * dt;
        if (c.y > 0) (c.y = 0), (c.vy *= -0.3), (c.vx *= 0.6);
      }
      for (let i = torn.length - 1; i >= 0; i--) {
        const l = torn[i];
        if ((l.life -= dt) <= 0) torn.splice(i, 1);
        l.vy += 160 * dt;
        l.vx -= l.vx * 2.5 * dt;
        l.vy -= l.vy * 2 * dt;
        l.x += l.vx * dt + Math.sin(l.fl) * 20 * dt;
        l.y += l.vy * dt;
        l.a += l.va * dt;
        l.fl += l.vf * dt;
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // a hole torn in the floor where it comes up, sap spots where it sprays
      const k = 1 - smooth(1.15, 1.35, t);
      for (let x = -5; x <= 5; x++) p.dot(x, 0, Math.abs(x) < 3 ? S[0] : S[1], k * (1 - Math.abs(x) / 7));
      for (const s of spots) {
        const a = (1 - smooth(0.25, 0.6, t - s.t0)) * (1 - smooth(1.2, 1.35, t));
        for (let x = Math.floor(s.x - s.w); x <= Math.ceil(s.x + s.w); x++) p.dot(x, 0, t - s.t0 < 0.1 ? C[6] : C[4], a);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      const pts = pose(t);
      // the smear: a fan of streaks, each the path one point of the outer vine just swept, the tip's white,
      // the ones further in cooling down the ramp, all fading back along their length
      if (t > LASH + 0.04 && t < CRACK + 0.1) {
        const age = clamp((t - CRACK + 0.02) / 0.12), hist = [];
        for (let k = 0; k < 12; k++) hist.push(pose(t - k * 0.0045));
        for (let k = 0; k < 6; k++) haze(p, [hist[k][N], hist[k + 1][N], hist[k + 1][N - 12], hist[k][N - 12]], k < 2 ? C[6] : C[5], 0.4 * (1 - k / 6) * (1 - age));
        for (let i = N - 12; i <= N; i += 2) {
          const q = (N - i) / 12, col = q < 0.1 ? WHITE : q < 0.3 ? C[7] : q < 0.55 ? C[6] : q < 0.8 ? C[5] : C[4], len = Math.round(11 * (1 - q * 0.6));
          for (let k = 0; k < len; k++) p.line(hist[k][i][0], hist[k][i][1], hist[k + 1][i][0], hist[k + 1][i][1], k < 2 && q < 0.1 ? WHITE : col, (1 - age) * (k < len * 0.5 ? 1 : 2 * (1 - k / len)));
        }
        p.glowLine(hist[0][N][0], hist[0][N][1], hist[6][N][0], hist[6][N][1], 14, C[5], 0.35 * (1 - age));
      }
      vine(p, pts, C);
      thorns(p, pts, T, C, t, null);
      const lk = smooth(LASH, CRACK, t) * (1 - smooth(CRACK, CRACK + 0.35, t));
      if (lk > 0) for (let i = 6; i <= N; i += 6) p.glow(pts[i][0], pts[i][1], 12, C[5], 0.18 * lk);
      // the crack: a white burst of air lines and a glint at the tip
      const e = t - CRACK;
      if (e >= 0 && e < 0.12) {
        const [x, y] = pts[N], k = 1 - e / 0.12;
        for (let j = 0; j < 7; j++) {
          const a = (j / 7) * TAU + 0.3, r0 = 4 + 10 * (1 - k), r1 = r0 + 5 * k;
          p.line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, k > 0.5 ? WHITE : C[6]);
        }
        p.ring(x, y, 3 + 8 * (1 - k), 1, C[7], k);
        sparkle(p, x, y, 7 * k, C[7], C[5], 0.4);
      }
      for (const c of chips) drawRock(p, c.x, c.y, c.s, c.a, c.pts, S, Math.min(1, c.life / 0.25));
      for (const l of torn) drawLeaf(p, l.x, l.y, 6, 2, l.a, l.fl, [C[1], C[3], C[5], C[6]], Math.min(1, l.life / 0.3));
      drops.draw(p, C);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
