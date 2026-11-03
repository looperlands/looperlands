// The layered flame tongues and the licks, embers and smoke shed off a burning edge follow Sprite Fusion's
// open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, hex, mix, clamp, smooth, ease, fbm, noise, noise2, rand, TAU, WHITE, SMOKE_RAMP } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, field, pixels, lifeLeft, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "Burn away",
  desc: "The screen burns in from its edges behind a ragged ember line of licking flames, embers and smoke; then the black smoulders and burns open from the middle.",
  tags: ["burn", "fire", "embers", "smoke", "wipe"],
  duration: 3,
  options: { palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"], seed: 3 },
});

const D = meta.duration, CLOSE = 1.18, COVER = 1.35, SMOULDER = 1.5, POP = 1.8, OPEN = 2.62, SC = 90, HALO = 24, POOL = 48;
const ASH = ["#a39cab", "#7b7484", "#5c5664", "#433e4b"];
// a tongue's layers: [width, height, palette step], outermost (red) to the white core
const LAYERS = [[1, 1, 2], [0.76, 0.86, 4], [0.54, 0.68, 6], [0.3, 0.42, 8]];

// where the fire reaches when: rising from the edges' midpoints (the corners go first), ragged at two scales,
// and the bottom burns a little faster because fire climbs
function inField(seed) {
  return field((x, y) => {
    const ux = (x - W / 2) / (W / 2), uy = (y - H / 2) / (H / 2), m = Math.pow(ux ** 4 + uy ** 4, 0.25);
    return (1 - m) * SC + 14 * fbm(x / 44, y / 44, seed, 3) + 2.4 * fbm(x / 7, y / 7, seed + 9, 2) + 7 * (0.5 - y / H);
  });
}
// the hole: from a spot near the middle (and two smaller ones that catch a beat later) out to the corners
function outField(seed) {
  const R = new Rng(seed * 31 + 5), ox = W / 2 + R.range(-26, 26), oy = H / 2 + R.range(-14, 6);
  const sats = [-1, 1].map((s) => ({ x: ox + s * R.range(70, 110), y: oy + R.range(-40, 40), d: R.range(30, 44) }));
  const f = field((x, y) => {
    let v = Math.hypot((x - ox) / (W / 2), (y - oy) / (H / 2)) * SC;
    for (const s of sats) v = Math.min(v, s.d + Math.hypot((x - s.x) / (W / 2), (y - s.y) / (H / 2)) * SC * 1.15);
    return v + 13 * fbm(x / 40, y / 40, seed + 21, 3) + 2.4 * fbm(x / 7, y / 7, seed + 33, 2);
  });
  f.ox = ox;
  f.oy = oy;
  return f;
}

// a flame standing on (x, y): four layers of the ramp, each narrower, shorter and hotter, swaying at the tip
function tongue(p, F, x, y, h, w, sway, t, n) {
  for (const [lw, lh, ri] of LAYERS) {
    const Ht = h * lh, col = F[ri];
    for (let r = 0; r <= Ht; r++) {
      const u = r / Math.max(1, Ht), half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + noise(t * 9 + r * 0.45, n) * 0.5;
      if (half < 0.3) continue;
      const cx = x + sway * u * u * lh + noise(t * 4 + r * 0.2, n + 7) * u * 1.1;
      for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) p.px(px, Math.round(y - r), col);
    }
  }
}

export function create(o) {
  const F = fit(o.palette, 9), ink = hex(o.color), R = new Rng(o.seed), seed = o.seed * 13;
  const CHAR = mix(ink, F[0], 0.45), SCORCH = mix(ink, hex("#3a2216"), 0.6), WARM = mix(F[4], F[5], 0.4);
  const SMOKE = mix(hex("#8a7276"), F[2], 0.2);
  const A = inField(seed), B = outField(seed + 1);
  // per pixel: how hot the ember line burns there (two smooth fields), and the odd fleck that glows on
  // (ph: a smooth phase 0..63 that the flicker tables are read with; jit: a ragged char rim)
  // (vein: near 0 along a web of thin curving cracks, where the char smoulders before it burns open)
  const heat = new Float32Array(W * H), ph = new Uint8Array(W * H), fleck = new Float32Array(W * H), jit = new Float32Array(W * H), vein = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i / W) | 0;
    heat[i] = 0.5 + 0.5 * noise2(x / 13, y / 13, seed + 41);
    ph[i] = Math.min(63, Math.floor((0.5 + 0.5 * noise2(x / 23, y / 23, seed + 43)) * 64));
    fleck[i] = rand(x, y, seed + 45) < 0.04 ? 9 + 22 * rand(x, y, seed + 47) : 0;
    jit[i] = (rand(x, y, seed + 49) - 0.5) * 1.5;
    const rx = x * 0.8 + y * 0.6, ry = y * 0.8 - x * 0.6; // off the pixel grid, so cracks don't run square
    vein[i] = Math.min(Math.abs(noise2(rx / 11, ry / 9, seed + 61)), Math.abs(noise2(ry / 5.5, rx / 5, seed + 63)) * 1.5);
  }
  const FL = new Float32Array(64), HV = new Float32Array(64), TW = new Uint8Array(64);
  const kIn = (t) => A.lo - 8 + (A.hi - A.lo + 8) * Math.pow(Math.max(0, t) / CLOSE, 1.25);
  const kOut = (t) =>
    t < POP ? B.lo - 24 + 24 * ease.inQuad(clamp((t - SMOULDER) / (POP - SMOULDER))) : B.lo + (B.hi - B.lo + 16) * ease.outQuad(clamp((t - POP) / (OPEN - POP)));

  const ps = new Particles({ rng: R, sparks: [F[7], F[6], F[4], F[2]] });
  const ash = new Particles({ rng: R, sparks: ASH });
  const lights = new Lights();
  const line = []; // the white-hot line's pixels this frame: where flames stand
  let t = 0, pin = 0, pout = 0, closed = false, popped = false;

  // what a patch of edge gives off as the front crosses it: licks of flame, embers, ash, now and then a cloud
  // of smoke (a run of puffs from one spot, so it rolls up as a wisp, not a dot) and a flicker of light. Per
  // pixel crossed: [flame, ember, smoke, smoke on the hottest stretches, ash, light]. The black burning open
  // sheds fewer embers and less ash, so the picture it uncovers stays clear.
  const RATE = { in: [0.006, 0.0014, 0.0006, 0.0024, 0.0012, 0.0004], out: [0.006, 0.0005, 0.0004, 0.0012, 0.0004, 0.0004] };
  const shed = (i, inA) => {
    // what burns in is gone before the black burns open, so the uncovered picture starts clean
    const [fl, em, sm, sh, as, li] = inA ? RATE.in : RATE.out, x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5, end = inA ? POP + 0.1 : D - 0.05;
    let r = R.next();
    if ((r -= fl) < 0) {
      const life = lifeLeft(R.range(0.18, 0.4), t, end);
      if (life > 0.08) ps.spawn(P.FIRE, x, y - 3, R.range(-8, 8), -R.range(25, 50), life, 0, R.range(0.8, 1.7));
    } else if ((r -= em) < 0) {
      const life = lifeLeft(inA ? R.range(0.6, 1.3) : R.range(0.5, 1), t, end);
      if (life > 0.2) ps.spawn(P.EMBER, x, y - 2, R.range(-30, 30), -R.range(40, 100), life, 0, R.chance(0.25) ? 2 : 1);
    } else if ((r -= sm + sh * heat[i] ** 2) < 0) {
      // smoke lives long only where the front chases it upward; elsewhere the front leaves it, so it's a wisp
      const n = R.int(4, 6), vx = R.range(-6, 6), up = (inA ? A : B).ny[i] < -0.25;
      for (let j = 0; j < n; j++) {
        const life = lifeLeft(up ? R.range(0.8, 1.3) : R.range(0.35, 0.65), t + j * 0.05, end);
        if (life > 0.4) ps.spawn(P.SMOKE, x + R.range(-3.5, 3.5), y - 4 - j * 1.2, vx + R.range(-3, 3), -R.range(18, 34), life, SMOKE, R.range(2.8, 4.8), j * 0.05);
      }
    } else if ((r -= as) < 0) {
      const life = lifeLeft(R.range(0.9, 1.6), t, end);
      if (life > 0.3) ash.spawn(P.EMBER, x, y - 2, R.range(-18, 18), -R.range(25, 60), life);
    } else if ((r -= li) < 0) lights.add(x, y - 4, R.range(20, 32), WARM, R.range(0.14, 0.26), R.range(0.18, 0.4));
  };

  // smoke shows where firelight catches it: lit warm near the burning line, dark over the picture, all but lost
  // in the black away from the fire (the sim's smoke puff, three soft discs, shaded by that light)
  const LIT = mix(hex("#8a7276"), F[3], 0.25), DIM = hex(SMOKE_RAMP[3]);
  const drawSmoke = (p, p0) => {
    const inPhase = t < COVER, open = t >= SMOULDER && t < OPEN + 0.25, k = inPhase ? kIn(t) : kOut(t), f = inPhase ? A.f : B.f;
    for (const q of ps.list) {
      if (q.k !== P.SMOKE || q.delay > 0) continue;
      const kk = q.life / q.max, age = 1 - kk, r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.4);
      const i = clamp(Math.floor(q.y), 0, H - 1) * W + clamp(Math.floor(q.x), 0, W - 1);
      const e = inPhase || open ? (inPhase ? k - f[i] : f[i] - k) : 99, lit = clamp(1 - Math.abs(e) / 30);
      const a = Math.min(1, age * 12) * Math.min(1, kk * 2.4) * 0.58 * (e > 0 ? 0.05 + 0.95 * lit : inPhase ? 1 : 0.2 + 0.8 * lit);
      if (a < 0.04) continue;
      // a puff wholly on screen needs no clipping
      const c = mix(mix(DIM, LIT, lit), SMOKE_RAMP[2], age * 0.5), d = q.x - r > 0 && q.y - r > 0 && q.x + r < W - 1 && q.y + r < H - 1 ? p0 : p;
      d.disc(q.x, q.y, r, c, a * 0.45);
      d.disc(q.x + r * 0.05, q.y + r * 0.06, r * 0.74, c, a * 0.62);
      if (age < 0.5) d.disc(q.x - r * 0.22, q.y - r * 0.3, r * 0.5, mix(c, WHITE, 0.15), a * 0.4 * (1 - age * 2));
    }
  };

  return {
    update(dt) {
      t += dt;
      // the front eats inward: everything it passes this step gives off flame, embers, ash and smoke
      if (t < COVER) {
        const k = kIn(t);
        while (pin < A.order.length && A.f[A.order[pin]] <= k) shed(A.order[pin++], true);
        if (!closed && t >= CLOSE) {
          // the last of the picture goes up in a puff
          closed = true;
          const i = A.order[A.order.length - 1], x = i % W, y = (i / W) | 0;
          lights.add(x, y, 64, WARM, 0.5, 0.4);
          for (let j = 0; j < 12; j++) ps.spawn(P.EMBER, x + R.range(-6, 6), y + R.range(-3, 3), R.range(-50, 50), -R.range(40, 120), R.range(0.5, 0.75), 0, R.chance(0.3) ? 2 : 1);
          for (let j = 0; j < 5; j++) ps.spawn(P.SMOKE, x + R.range(-8, 8), y + R.range(-4, 2), R.range(-10, 10), -R.range(12, 28), R.range(1.1, 1.6), SMOKE, R.range(3.5, 5.5), R.range(0, 0.15));
        }
      }
      // the black smoulders in the middle, then burns open
      if (t >= SMOULDER && t < POP && R.chance(0.1)) {
        const i = B.order[R.int(0, 400)], x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5;
        if (R.chance(0.6)) ps.spawn(P.SMOKE, x, y, R.range(-4, 4), -R.range(8, 16), lifeLeft(R.range(0.9, 1.4), t, D - 0.05), SMOKE, R.range(2, 3.5));
        else ps.spawn(P.EMBER, x, y, R.range(-12, 12), -R.range(15, 40), R.range(0.4, 0.8));
      }
      if (!popped && t >= POP) {
        popped = true;
        lights.add(B.ox, B.oy, 90, WARM, 0.6, 0.45);
        lights.add(B.ox, B.oy, 34, F[7], 0.7, 0.12);
        for (let j = 0; j < 12; j++) {
          const a = R.range(0, TAU), sp = R.range(50, 150);
          ps.spawn(P.EMBER, B.ox + Math.cos(a) * 3, B.oy + Math.sin(a) * 2, Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 40, R.range(0.4, 0.9), 0, R.chance(0.3) ? 2 : 1);
        }
        for (let j = 0; j < 10; j++) {
          const a = R.range(0, TAU), sp = R.range(120, 260);
          ps.spawn(P.SPARK, B.ox, B.oy, Math.cos(a) * sp, Math.sin(a) * sp - 50, R.range(0.15, 0.35));
        }
      }
      if (t >= POP && t < OPEN + 0.2) {
        const k = kOut(t);
        while (pout < B.order.length && B.f[B.order[pout]] <= k) shed(B.order[pout++], false);
      }
      ps.update(dt);
      ash.update(dt);
      lights.update(dt);
    },
    draw(p0) {
      const p = clipTo(p0);
      line.length = 0;
      if (t >= COVER && t < SMOULDER) rect(p0, 0, 0, W, H, ink);
      else if (t < OPEN + 0.25) {
        const inPhase = t < COVER, k = inPhase ? kIn(t) : kOut(t), Fd = inPhase ? A : B, f = Fd.f, g = Fd.g;
        const fade = inPhase ? 1 - smooth(COVER - 0.15, COVER, t) : 1;
        for (let j = 0; j < 64; j++) {
          const q = j / 63;
          FL[j] = 0.75 + 0.25 * Math.sin(t * 7 + q * 9);
          HV[j] = 0.3 * Math.sin(t * 5.5 + q * 11);
          TW[j] = Math.sin(t * 13 + q * 40) > -0.5 ? 1 : 0;
        }
        // only the pixels near the burning line need working out (a slice of the field's order): the cover
        // behind it is plain ink, the picture far ahead of it untouched. Straight to the frame: all on screen.
        const px = pixels(p0), ord = Fd.order, N = ord.length;
        // before the black burns open it smoulders: a web of cracks in the hole's own shape glows, spreads and
        // heats from dark red, then the hole bursts through it and it cools
        const su = clamp((t - SMOULDER) / (POP - SMOULDER)), SR = 5 + 17 * su;
        const sk = inPhase || t < SMOULDER ? 0 : t < POP ? 0.3 + 0.7 * su : 1 - (t - POP) / 0.3;
        const shadeAt = (i) => {
          // e: how far into the cover this pixel is in field units (smooth, for light); s: in px from the
          // burning line (sharp near it, for the line itself)
          const e = inPhase ? k - f[i] : f[i] - k, s = e * g[i];
          px.at(i);
          if (e < 0) {
            // the picture just ahead of the fire: scorched, and lit by it
            if (inPhase && s > -2.5) px.blend(SCORCH, 0.5 * (1 + s / 2.5));
            const u = Math.max(0, 1 + e / HALO), v = 1 + e / POOL;
            px.add(WARM, (0.3 * u * u + 0.12 * v * v) * FL[ph[i]]);
            return;
          }
          const hv = clamp(heat[i] + HV[ph[i]]), th = 0.6 + 0.6 * hv, u = s / th;
          if (u < 6.4) {
            // the ember line: white-hot at the edge, cooling down the ramp into char
            if (u < 0.9) line.push(i);
            px.put(u < 0.9 ? (hv > 0.6 ? F[8] : F[7]) : u < 1.7 ? F[6] : u < 2.4 ? F[5] : u < 3.1 ? F[4] : u < 3.8 ? F[3] : u < 4.6 ? F[2] : u < 5.5 ? F[1] : F[0]);
            if (u < 4.6) px.add(WARM, 0.45 * (1 - u / 4.6) * (0.7 + 0.3 * hv));
            return;
          }
          if (sk > 0 && f[i] < B.lo + SR) {
            const hm = (1 - (f[i] - B.lo) / SR) * sk * (0.7 + 0.6 * hv);
            if (vein[i] < 0.04 + 0.08 * hm) {
              px.put(hm > 0.95 ? F[6] : hm > 0.75 ? F[5] : hm > 0.55 ? F[4] : hm > 0.38 ? F[3] : hm > 0.22 ? F[2] : F[1]);
              px.add(WARM, 0.4 * hm);
              return;
            }
            px.add(WARM, 0.2 * hm * hm);
          }
          // char, with the odd fleck still glowing in it
          const L = fleck[i] * (0.8 + 0.4 * hv);
          if (L > 0 && s < L) {
            const v = (s - 6.4 * th) / Math.max(1, L - 6.4 * th);
            if (v < 1 && TW[(ph[i] * 5) & 63] && !(fade < 1 && fade <= jit[i] / 1.5 + 0.5)) {
              px.put(v < 0.3 ? F[4] : v < 0.55 ? F[3] : v < 0.8 ? F[2] : F[1]);
              px.add(WARM, 0.3 * (1 - v));
              return;
            }
          }
          if (e < 22) px.add(WARM, 0.2 * (1 - e / 22) ** 2);
          px.put(u - 6.4 < 1.6 * th + jit[i] ? CHAR : ink);
        };
        // [c0, c1): deep in the cover; [a0, a1): near the line
        const lo = Fd.below(k - (inPhase ? 33 : POOL)), hi = Fd.below(Math.max(k + (inPhase ? POOL : 33), sk > 0 ? B.lo + SR : -1e9));
        const [c0, c1, a0, a1] = inPhase ? [0, lo, lo, hi] : [hi, N, lo, hi];
        for (let j = c0; j < c1; j++) {
          const i = ord[j];
          if (fleck[i]) shadeAt(i);
          else px.at(i), px.put(ink);
        }
        for (let j = a0; j < a1; j++) shadeAt(ord[j]);
        // flames stand on the white-hot line: tall and many where the char lies below it and they rise clear,
        // short and few where they'd only lick up over the char
        for (const i of line) {
          const x = i % W, y = (i / W) | 0, dn = inPhase ? -Fd.ny[i] : Fd.ny[i], h0 = rand(x, y >> 3, seed + 51);
          if (h0 > 0.12 + 0.6 * Math.max(0, dn)) continue;
          const n = (x * 7 + (y >> 4) * 131) % 977, hv = heat[i];
          const leap = 1 + Math.max(0, noise(t * 2.6 + n * 3.1, n + 70) - 0.5) * 1.8;
          const h = (5 + 7 * rand(x, 1, seed + 53)) * (0.6 + 0.4 * noise(t * 3.3 + n * 1.7, n)) * (0.6 + 0.6 * hv) * leap * fade * (dn > 0 ? 0.65 + 0.5 * dn : 0.5);
          if (h >= 1.5) tongue(p, F, x + 0.5, y + 1, h, (1.1 + 0.7 * hv) * (0.8 + h / 16), noise(t * 2.2 + n, n + 40) * 1.5, t, n);
        }
      }
      drawSmoke(p, p0);
      ash.draw(p, "front");
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
