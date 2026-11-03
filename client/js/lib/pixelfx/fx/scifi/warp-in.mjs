// The column (bands of the ramp across it, strands, pulses scrolling along it, a guide thread before it lands,
// rings riding it) is adapted from Sprite Fusion's open-source holy light
// (https://www.spritefusion.com/pixel-art-vfx/holy-light), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, band, sparkle, clamp, smooth, lerp, ease, rand, mix, TAU, WHITE, READY } from "../../core/index.mjs";

export const meta = {
  name: "Warp in",
  desc: "A beam slams down, rings run down it and a scanline paints the hero in from head to toe, white-hot pixels cooling to their own colors; the beam pinches shut in sparks.",
  tags: ["scifi", "teleport", "warp", "beam", "spawn", "arrive", "one-shot"],
  size: [192, 168],
  origin: [96, 128],
  duration: 3,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#0b1030", "#152a63", "#1d4f9e", "#2582d2", "#36b9ee", "#8ae8ff", "#d4fbff", "#ffffff"], width: 15, seed: 3 },
};

const IN = { crouch: 7, lean: 3, fx: 9, fy: -12, bx: 12, by: -12, ffx: 8, fbx: -6 };
export const act = {
  onBody: true,
  follow: 0,
  poses: [
    [0, IN],
    [1.82, IN],
    [2.05, { crouch: 3, fx: 8, fy: -19, bx: 8, by: -18, ffx: 4, fbx: -3 }],
    [2.5, READY],
    [3, READY],
  ],
};

// the beats: the guide thread, the slam, the tube opens, the scan, the cooling, the beam narrows, it snaps shut
const SLAM = 0.34, OPEN = 0.52, SCAN0 = 0.62, SCAN1 = 1.4, COOL = 0.42, DONE = SCAN1 + COOL, CLOSE = 1.9, SNAP = 2.16;
const TOP = -meta.origin[1];

export const actorAlpha = (t) => (t >= DONE ? 1 : 0);

// when the scanline crosses row y (top to bottom, easing in and out), for a body from y0 to the floor
const scanY = (t, y0) => lerp(y0 - 2, 1, ease.inOutSine(clamp((t - SCAN0) / (SCAN1 - SCAN0))));
const scanT = (y, y0) => SCAN0 + ((SCAN1 - SCAN0) * Math.acos(1 - 2 * clamp((y + 0.5 - (y0 - 2)) / (3 - y0)))) / Math.PI;

// the beam's half width over time: overshoots as it lands, hums, narrows to a thread
function widthAt(t, W) {
  if (t < SLAM) return 0;
  if (t < CLOSE) return W * (1 + 0.45 * Math.exp(-(t - SLAM) * 14) + 0.03 * Math.sin(t * 31));
  return lerp(W, 0.7, ease.outCubic(clamp((t - CLOSE) / (SNAP - CLOSE))));
}

export function create(o) {
  const C = fit(o.palette, 8), W = o.width, R = new Rng(o.seed), A = o.actor;
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[5] }), lights = new Lights();
  // the body: each filled pixel, its own color, whether it's on the outline, and each row's extent
  const body = [], rows = new Map();
  for (let my = 0; my < A.h; my++)
    for (let mx = 0; mx < A.w; mx++) {
      const i = my * A.w + mx;
      if (!A.mask.data[i]) continue;
      const on = (x, y) => x >= 0 && y >= 0 && x < A.w && y < A.h && A.mask.data[y * A.w + x];
      const x = A.x + mx, y = A.y + my, edge = !on(mx - 1, my) || !on(mx + 1, my) || !on(mx, my - 1) || !on(mx, my + 1);
      body.push({ x, y, c: A.pixels[i] || C[2], edge, ts: scanT(y, A.y), j: rand(o.seed, mx, my) });
      const r = rows.get(y) ?? [x, x];
      rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]);
    }
  const rings = [];
  let t = 0, slammed = false, snapped = false, nextRing = SLAM + 0.08, lastRow = A.y - 3;

  const column = (p) => {
    const w = widthAt(t, W);
    if (w <= 0.05 || t > SNAP + 0.14) return;
    // it falls from the sky as it lands, and snaps back up into it at the end
    const bottom = t - SLAM < 0.06 ? lerp(TOP, 0, ease.inCubic(clamp((t - SLAM) / 0.06) * 0.5 + 0.5)) : t > SNAP ? lerp(0, TOP, ease.outExpo((t - SNAP) / 0.14)) : 0;
    // the core hollows out from the middle into a tube of light, and the tube's walls close into a thread
    const hero = t - SLAM < 0.07, hollow = 0.78 * smooth(OPEN - 0.16, OPEN, t), thin = 1 - clamp((w - 1.5) / (W - 1.5));
    for (let y = Math.floor(TOP); y < bottom; y++) {
      const pulse = ((((y - TOP) * 0.028 - t * 2.6) % 1) + 1) % 1 < 0.09 ? 1 : 0;
      for (let x = Math.floor(-w * 1.35); x <= Math.ceil(w * 1.35); x++) {
        const q = Math.abs(x + 0.5) / w;
        if (q > 1.35) continue;
        if (hero) {
          p.dot(x, y, q < 0.55 ? WHITE : q < 0.8 ? C[6] : q < 1 ? C[5] : C[4], q < 1 ? 1 : (1.35 - q) / 0.35);
          continue;
        }
        if (w < 2.4) {
          p.dot(x, y, q < 0.7 ? WHITE : C[6], q < 1 ? 1 : (1.35 - q) / 0.35);
          continue;
        }
        // strands: thin bright threads drifting inside the beam
        let strand = 0;
        for (let s = 0; s < 5; s++) if (Math.abs((x + 0.5) / w - (rand(o.seed, s) - 0.5) * 1.3 - 0.06 * Math.sin(t * (1.5 + s) + s * 2)) < 0.05) strand = 1;
        if (q < hollow) p.blend(x + 0.5, y + 0.5, strand || pulse ? C[6] : C[5], clamp(0.12 + 0.3 * q * q + 0.3 * strand + 0.25 * pulse + 0.7 * thin));
        else if (q < 0.78) {
          const lvl = Math.max(0, (q < 0.22 ? 0 : q < 0.45 ? 1 : 2) - pulse - strand);
          p.px(x, y, lvl === 0 ? WHITE : C[7 - lvl]);
        } else if (q < 0.96) p.px(x, y, q > 0.86 && q < 0.93 ? WHITE : C[6]);
        else p.dot(x, y, q < 1.1 ? C[5] : C[4], (1.35 - q) / 0.39);
      }
      // light rides the walls, not the middle, so the body being built inside stays readable
      if ((y & 7) === 0) {
        const r = Math.min(w + 8, y - TOP + 2);
        if (hollow < 0.4) p.glow(0, y, Math.min(w * 2.6 + 6, y - TOP + 2), C[4], hero ? 0.55 : 0.32);
        else for (const s of [-1, 1]) p.glow(s * (w + 3), y, r, C[4], 0.24);
      }
    }
  };

  // a ring riding down the beam: the near half in front, the far half behind
  const ring = (p, near) => {
    const w = widthAt(t, W);
    for (const r of rings) {
      const k = (t - r.t0) / 0.5;
      if (k < 0 || k >= 1) continue;
      const y = lerp(TOP + 6, -1, ease.inQuad(k)), rx = w * 1.18 + 1, c = k < 0.25 ? WHITE : C[6];
      band(p, 0, y, rx, 2.6 / rx, 1.5, 1, [C[3], C[5], c, WHITE], (g) => Math.sin(g) >= 0 === near);
      if (near) p.glow(0, y, rx + 6, C[5], 0.25);
    }
  };

  // the floor where the beam stands: a pool of light, ripples where rings land, the slam's shockwave
  const floor = (p, near) => {
    const on = t < SLAM ? smooth(0, SLAM, t) * 0.5 : 1 - smooth(SNAP, SNAP + 0.5, t);
    if (!near && on > 0.01) {
      const rx = W * 1.9 + (t < SLAM ? 0 : 2 * Math.sin(t * 6)), ry = 4;
      for (let y = -4; y <= 4; y++)
        for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
          const d = Math.hypot((x + 0.5) / rx, (y + 0.5) / ry);
          if (d > 1) continue;
          p.dot(x, y, d < 0.35 ? C[7] : d < 0.6 ? C[6] : d < 0.85 ? C[5] : C[4], on * clamp((1.05 - d) * 2.4));
        }
      for (const x of [-rx * 0.6, 0, rx * 0.6]) p.glow(x, -1, rx * 1.3, C[4], 0.3 * on);
    }
    const keep = (g) => Math.sin(g) >= 0 === near;
    for (const r of rings) {
      const k = (t - r.t0 - 0.5) / 0.35;
      if (k >= 0 && k < 1) band(p, 0, 0, W * (1.2 + 1.3 * ease.outCubic(k)), 0.16, 1.5, 1 - k, [C[3], C[4], C[5], C[6]], keep);
    }
    for (const [d, s] of [[0, 1], [0.08, 0.65]]) {
      const k = (t - SLAM - d) / 0.55;
      if (k >= 0 && k < 1) band(p, 0, 0.5, 92 * s * ease.outCubic(k), 0.16, Math.max(1, 5 * (1 - k)), 1.15 - k, [C[3], C[5], C[6], WHITE], keep, k < 0.25);
    }
    const k = (t - SNAP) / 0.45;
    if (k >= 0 && k < 1) band(p, 0, 0, 10 + 26 * ease.outCubic(k), 0.16, 2 * (1 - k) + 0.5, 1.1 - k, [C[4], C[5], C[6], WHITE], keep, k < 0.3);
  };

  // the hero, built out of light: the blueprint first, then each row as the scanline crosses it, white-hot
  // and cooling through the beam's color to its own
  const hero = (p) => {
    if (t >= DONE || t < SCAN0 - 0.2) return;
    const blink = Math.floor(t * 24);
    for (const b of body) {
      const a = t - b.ts;
      if (a < 0) {
        if (b.edge && rand(b.x, b.y, blink) < 0.6) p.dot(b.x, b.y, C[1], 0.8 * smooth(SCAN0 - 0.25, SCAN0 - 0.05, t));
        continue;
      }
      const k = a / COOL;
      // the newest rows jitter sideways a pixel, as if still arriving
      const dx = a < 0.06 && b.j < 0.3 ? (b.j < 0.15 ? -1 : 1) : 0;
      p.px(b.x + dx, b.y, k < 0.18 ? WHITE : k < 0.45 ? mix(b.c, C[6], 0.72) : k < 0.75 ? mix(b.c, C[5], 0.38) : b.c);
      if (k < 0.5) p.light(b.x + dx, b.y, C[5], 0.22 * (1 - k / 0.5));
    }
  };

  // the scanline: a white rule across the beam, hottest where it crosses the body, sparking at its edges
  const scanline = (p) => {
    if (t < SCAN0 || t > SCAN1) return;
    const y = Math.floor(scanY(t, A.y)), w = widthAt(t, W) * 1.5, r = rows.get(y);
    for (let x = Math.floor(-w); x <= Math.ceil(w); x++) {
      const inside = r && x >= r[0] && x <= r[1];
      p.dot(x, y, inside ? WHITE : C[6], inside ? 1 : 1 - Math.abs(x + 0.5) / (w + 1));
    }
    p.glowLine(-w, y, w, y, 5, C[5], 0.5);
    if (r) for (const x of r) sparkle(p, x + 0.5, y, 2, C[6], C[5], 0.3);
  };

  return {
    update(dt) {
      t += dt;
      // gathering: energy streaks in toward the spot, vapour slides along the floor
      if (t < SLAM - 0.04) {
        if (R.chance(0.8)) {
          const a = R.range(-Math.PI * 0.95, -Math.PI * 0.05), D = R.range(30, 64), T = R.range(0.18, 0.28), v = (D * 3) / (Math.exp(3 * T) - 1);
          const x = Math.cos(a) * D, y = Math.sin(a) * D * 0.8 - 2, l = Math.hypot(x, y + 2) || 1;
          ps.spawn(P.STREAK, x, y, (-x / l) * v, (-(y + 2) / l) * v, T, R.chance(0.5) ? C[6] : C[5]);
        }
        if (R.chance(0.12)) {
          const s = R.sign();
          ps.spawn(P.VAPOUR, s * R.range(30, 56), -R.range(0, 2), -s * R.range(40, 70), -R.range(0, 4), R.range(0.3, 0.45), C[5], R.range(2, 3));
        }
      }
      if (t >= SLAM && !slammed) {
        slammed = true;
        lights.add(0, -40, 120, C[4], 1, 0.55);
        lights.add(0, -10, 44, WHITE, 0.9, 0.14);
        for (let i = 0; i < 34; i++) {
          const a = -Math.PI / 2 + R.sign() * R.range(0.35, 1.45), sp = R.range(110, 270);
          ps.spawn(P.SPARK, R.range(-W, W) * 0.6, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.75));
        }
        for (let i = 0; i < 18; i++) {
          const s = R.sign();
          ps.spawn(P.VAPOUR, s * R.range(4, 18), -R.range(0, 4), s * R.range(40, 150), -R.range(2, 18), R.range(0.5, 0.95), R.chance(0.6) ? C[6] : C[5], R.range(3, 6));
        }
        for (let i = 0; i < 10; i++) ps.spawn(P.STAR, R.range(-W, W) * 1.3, -R.range(2, 40), R.range(-20, 20), -R.range(10, 40), R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.2));
      }
      if (slammed && t < CLOSE) {
        // rings ride down, light falls down the beam, glints wink at its walls
        if (t >= nextRing) rings.push({ t0: nextRing }), (nextRing += 0.17);
        const w = widthAt(t, W);
        if (R.chance(0.5)) ps.spawn(P.STREAK, R.range(-0.8, 0.8) * w, TOP + R.range(9, 36), 0, R.range(60, 110), R.range(0.3, 0.45), R.chance(0.5) ? WHITE : C[6]);
        if (R.chance(0.18)) ps.spawn(P.STAR, R.sign() * w * R.range(0.8, 1.3), -R.range(4, 70), 0, -R.range(5, 20), R.range(0.3, 0.6), C[6], R.range(0.6, 1.8));
        if (R.chance(0.1)) {
          const s = R.sign();
          ps.spawn(P.VAPOUR, s * R.range(8, 16), -R.range(0, 3), s * R.range(20, 50), -R.range(2, 8), R.range(0.5, 0.8), C[5], R.range(2.5, 4));
        }
      }
      // the scanline spits light off the edges of the body as it crosses
      if (t > SCAN0 && t < SCAN1) {
        const y = Math.floor(scanY(t, A.y));
        if (y !== lastRow) {
          lastRow = y;
          const r = rows.get(y);
          if (r && R.chance(0.7)) for (const [x, s] of [[r[0], -1], [r[1] + 1, 1]]) if (R.chance(0.6)) ps.spawn(P.MOTE, x, y, s * R.range(40, 90), R.range(-20, 10), R.range(0.15, 0.3), R.chance(0.5) ? WHITE : C[6], 0.6);
        }
      }
      if (t >= DONE && t - dt < DONE) {
        // set: a glint or two on the new body
        for (let i = 0; i < 6; i++) {
          const b = body[Math.floor(R.next() * body.length)];
          ps.spawn(P.STAR, b.x + 0.5, b.y + 0.5, R.range(-6, 6), -R.range(6, 20), R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(1, 2));
        }
      }
      if (t >= SNAP && !snapped) {
        snapped = true;
        lights.add(0, -1, 32, C[4], 0.5, 0.25);
        lights.add(0, -1, 10, WHITE, 0.5, 0.08);
        for (let i = 0; i < 22; i++) {
          const a = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(90, 260);
          ps.spawn(P.SPARK, R.range(-2, 2), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.6));
        }
        for (let i = 0; i < 12; i++) ps.spawn(P.STAR, R.range(-16, 16), -R.range(0, 46), R.range(-10, 10), -R.range(8, 26), R.range(0.5, 0.9), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.8));
        // where the beam stood, motes keep rising for a while
        for (let i = 0; i < 18; i++) ps.spawn(R.chance(0.6) ? P.STAR : P.MOTE, R.range(-6, 6), -R.range(10, 100), R.range(-6, 6), -R.range(14, 40), R.range(0.5, 0.75), R.chance(0.4) ? WHITE : R.chance(0.5) ? C[6] : C[5], R.range(0.5, 1.4), R.range(0, 0.25));
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      floor(p, false);
      ring(p, false);
      column(p);
      // the guide thread: a dotted line pricking down to the spot, brightening
      if (t < SLAM) {
        const a = smooth(0, SLAM * 0.8, t) * 0.8, head = lerp(TOP, 0, ease.outCubic(clamp(t / (SLAM * 0.6))));
        for (let y = TOP; y < head; y++) p.dot(0, y, (y & 1) === 0 ? C[6] : C[5], a * (0.35 + 0.65 * ((y - TOP) / -TOP)));
        p.glow(0, head, 10, C[5], 0.5 * a);
        // a target on the floor, closing in
        const rx = lerp(34, 12, ease.outCubic(t / SLAM)), k = smooth(0, 0.15, t);
        for (let i = 0; i < 48; i++) {
          const g = (i / 48) * TAU + t * 3;
          if (Math.floor(i / 4) % 2) continue;
          p.dot(Math.cos(g) * rx, Math.sin(g) * rx * 0.16, i % 4 === 0 ? WHITE : C[5], k);
        }
      }
      ps.draw(p, "back");
    },
    draw(p) {
      hero(p);
      scanline(p);
      ring(p, true);
      floor(p, true);
      // the set body's outline flares as it lands, then fades
      if (t >= DONE && t < DONE + 0.3) p.outline(A.mask, A.x, A.y, C[6], 1 - (t - DONE) / 0.3);
      if (t > SLAM && t < SLAM + 0.16) sparkle(p, 0, -2, 12 * (1 - (t - SLAM) / 0.16), C[6], C[5], 0.6);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
