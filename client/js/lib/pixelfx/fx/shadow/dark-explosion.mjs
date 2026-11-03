// The pull that swirls motes into the core and the collapse burst are adapted from Sprite Fusion's open-source
// black-hole (https://www.spritefusion.com/pixel-art-vfx/black-hole), the sparks, rings and smoke from his explosion,
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, P, B, Rng, fit, sparkle, band, clamp, smooth, ease, noise, hex, TAU, WHITE, mix } from "../../core/index.mjs";
import { VOID, Puffs, PK, halo, ringLight, ringFast, unlight, blackStar, attract, shard } from "./_lib.mjs";

export const meta = {
  name: "Dark explosion",
  desc: "Motes swirl into a pulsing core, a black star cuts across a violet-white flash, and a black sphere burns at the rim, throws lit shards and smoke, then collapses.",
  tags: ["shadow", "explosion", "void", "dark", "magic", "impact", "one-shot"],
  size: [280, 248],
  origin: [140, 206],
  duration: 3.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: VOID, seed: 6 },
};

// the heart of the blast hangs above the floor; the sphere's radius; the beats of the choreography
const Y = -54, RS = 16, REL = 0.52, BURN = 1.62, POP = 1.84, SMOKE = hex("#5d5468");

// a black sphere: a void body (a faint crescent of reflected light low on the right, a dull glint high on the
// left), a white rim, and pointed tongues of violet flame that lean up, flicker and crawl round it
function sphere(p, C, r, t, heat) {
  if (r < 0.6) return;
  const E = r + 12 * heat + 2;
  p.shade(-E, Y - E, E, Y + E, (x, y, out) => {
    const dx = x, dy = y - Y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > E) return;
    if (d < r - 0.5) {
      const e = r - d, ang = Math.atan2(dy, dx);
      if (e < 1.4 && Math.cos(ang - 0.8) > 0.55) return C[2];
      if (r > 8 && (dx + r * 0.45) ** 2 + (dy + r * 0.45) ** 2 < 1.6) return C[3];
      return C[0];
    }
    const e = d - (r - 0.5);
    if (e < 1) {
      out.c = Math.sin(Math.atan2(dy, dx) * 7 + t * 9) > -0.6 ? WHITE : C[7];
      out.k = 0.4;
      return;
    }
    // the further out, the lower the angle it's sampled at: tongues bend upward like flame
    const ang = Math.atan2(dy + e * 0.6, dx), top = Math.max(0, -Math.sin(ang));
    const a1 = ang - t * 0.9, a2 = ang + t * 1.7;
    const i1 = Math.round((a1 * 9) / TAU), i2 = Math.round((a2 * 15) / TAU);
    const T1 = Math.pow(0.5 + 0.5 * Math.cos(a1 * 9), 3) * (0.55 + 0.45 * noise(t * 7 + i1 * 3.7, 1));
    const T2 = Math.pow(0.5 + 0.5 * Math.cos(a2 * 15), 4) * (0.5 + 0.5 * noise(t * 11 + i2 * 5.1, 2));
    const h = heat * (0.3 + 0.95 * top) * (1.5 + 12 * Math.max(0, T1) + 6 * Math.max(0, T2));
    if (e > h + 1) return;
    const u = (e - 1) / h;
    out.c = u < 0.18 ? WHITE : u < 0.4 ? C[7] : u < 0.62 ? C[6] : u < 0.84 ? C[5] : C[4];
    out.a = u < 0.8 ? 1 : (1 - u) * 5;
    if (u < 0.6 && ((Math.floor(x) + Math.floor(y)) & 1) === 0) out.k = 0.25 * (1 - u);
  });
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[7], C[6], C[5]] });
  const embers = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]] });
  const puffs = new Puffs({
    rng: R,
    flame: [WHITE, C[7], C[6], C[5], C[5], C[4], C[4], C[3], C[2]],
    soot: [mix(mix(C[3], C[1], 0.3), SMOKE, 0.45), mix(C[1], SMOKE, 0.3)],
    cap: mix(mix(C[4], C[2], 0.5), SMOKE, 0.4),
    rim: [C[6], C[5], C[4]],
    floor,
  });
  const bits = new Bits({ ground: floor }), lights = [], rings = [];
  let t = 0, released = false, collapsing = false, popped = false, acc = 0, dustAcc = 0, flick = 1;

  const coreR = (tt) => (tt < REL - 0.07 ? 1.5 + 5 * ease.inQuad(tt / REL) : 1);
  const sphereR = (tt) => {
    if (tt < REL) return 0;
    if (tt < BURN) return RS * ease.outBack(clamp((tt - REL) / 0.14), 2.4) * (1 + 0.06 * smooth(REL + 0.3, BURN, tt) + 0.02 * Math.sin(tt * 11));
    if (tt < POP) return RS * 1.08 * (1 - ease.inQuad((tt - BURN) / (POP - BURN)));
    return 0;
  };
  const starL = (tt) => (tt < REL || tt > REL + 0.26 ? 0 : 60 * (1 - ease.inQuad(clamp((tt - REL - 0.05) / 0.21))));
  const starRot = (tt) => 0.32 + (tt - REL) * 2.2;
  // how hard the sphere lights what's round it: the rims of the smoke, the edges of the shards
  const burning = (tt) => (tt < REL ? clamp(tt / REL) * 0.7 : tt < BURN ? 1 : tt < POP ? 1.2 : Math.max(0, 1 - (tt - POP) / 0.35));
  const light = (x, y, r, c, k, life) => lights.push({ x, y, r, c, k, life, max: life });
  const rim = (a, r) => [Math.cos(a) * r, Y + Math.sin(a) * r];

  function release() {
    light(0, Y, 100, C[4], 1.25, 0.85);
    light(0, Y, 86, mix(C[6], WHITE, 0.5), 1.3, 0.22);
    rings.push({ r0: RS, r1: 104, life: 0.46, max: 0.46, th: 3.6, hot: true, delay: 0 });
    rings.push({ r0: RS * 0.8, r1: 62, life: 0.3, max: 0.3, th: 1.6, hot: true, delay: 0.02 });
    rings.push({ r0: RS, r1: 124, life: 0.62, max: 0.62, th: 1.2, hot: false, delay: 0.07 });
    // shards of the void: big slivers tumbling out and raining onto the floor, fine splinters faster
    for (let i = 0; i < 34; i++) {
      const big = i < 20, a = R.range(0, TAU), [x, y] = rim(a, RS * 0.7), sp = big ? R.range(80, 170) : R.range(130, 220);
      bits.add({ kind: B.SHARD, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - R.range(40, 110), g: 0.75, drag: big ? 1.3 : 1.7, bounce: 0.35, life: R.range(1.6, 2.6), a: R.range(0, TAU), va: R.range(-16, 16), s: big ? R.range(6, 11) : R.range(3, 4.5) });
    }
    for (let i = 0; i < 84; i++) {
      const a = R.range(0, TAU), [x, y] = rim(a, RS * 0.8), sp = R.range(120, 235);
      ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 50, R.range(0.2, 0.7));
    }
    for (let i = 0; i < 28; i++) {
      const a = R.range(0, TAU), [x, y] = rim(a, RS * 0.9), sp = R.range(30, 130);
      embers.spawn(P.EMBER, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(1.3, 2.5));
    }
    for (let i = 0; i < 24; i++) {
      const a = R.range(0, TAU), [x, y] = rim(a, RS * 0.9), sp = R.range(15, 70);
      puffs.spawn(PK.SOOT, x, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 14, R.range(2, 2.8), R.range(7, 12), R.range(0.02, 0.3));
    }
    // the shock flattens on the floor and shoves smoke out along it
    for (let i = 0; i < 12; i++) {
      const s = i % 2 ? 1 : -1;
      puffs.spawn(PK.SOOT, s * R.range(10, 40), -R.range(2, 5), s * R.range(50, 120), -R.range(0, 10), R.range(1.6, 2.4), R.range(5, 9), R.range(0.08, 0.2));
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + R.range(-1.6, 1.6), [x, y] = rim(a, RS), sp = R.range(30, 80);
      puffs.spawn(PK.FLAME, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.3, 0.6), R.range(2, 3.6), 0, R.chance(0.5));
    }
    // what was still falling in is swallowed by the blast
    ps.list.length = 0;
    puffs.list = puffs.list.filter((q) => q.delay > 0);
  }

  function pop() {
    light(0, Y, 56, WHITE, 0.9, 0.18);
    light(0, Y, 120, C[5], 0.8, 0.5);
    rings.push({ r0: 2, r1: 40, life: 0.28, max: 0.28, th: 2, hot: true, delay: 0 });
    for (let i = 0; i < 26; i++) {
      const a = R.range(0, TAU), sp = R.range(120, 250);
      ps.spawn(P.SPARK, 0, Y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.2, 0.6));
    }
    for (let i = 0; i < 14; i++) {
      const a = R.range(0, TAU), sp = R.range(20, 90);
      embers.spawn(P.EMBER, 0, Y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.9, 1.6));
    }
    for (let i = 0; i < 10; i++) {
      const a = R.range(0, TAU), sp = R.range(20, 70);
      puffs.spawn(PK.SOOT, Math.cos(a) * 3, Y + Math.sin(a) * 3, Math.cos(a) * sp, Math.sin(a) * sp - 15, R.range(1.1, 1.7), R.range(3, 6), R.range(0, 0.08));
    }

    for (const q of [...embers.list, ...puffs.list]) {
      const dx = q.x, dy = q.y - Y, d = Math.hypot(dx, dy) || 1, f = 90 * Math.max(0, 1 - d / 70);
      q.vx += (dx / d) * f;
      q.vy += (dy / d) * f - f * 0.3;
    }
    // what's left of it climbs away as a column of smoke
    for (let i = 0; i < 12; i++)
      puffs.spawn(PK.SOOT, R.range(-6, 6), Y + R.range(-4, 6), R.range(-10, 10), -R.range(20, 55), R.range(1.3, 1.8), R.range(7, 12), R.range(0.02, 0.2));
  }

  return {
    update(dt) {
      t += dt;
      flick = 0.88 + 0.12 * Math.sin(t * 37) * Math.sin(t * 23);
      // the charge: motes swirl in from all round, streaks shoot straight at the core, darkness gathers
      if (t < REL - 0.06) {
        const k = t / REL;
        for (acc += dt * (90 + 150 * k); acc > 1; acc--) {
          const a = R.range(0, TAU), D = R.range(36, 84), x = Math.cos(a) * D, y = Math.min(-3, Y + Math.sin(a) * D), vt = R.range(50, 110), vi = R.range(10, 40);
          ps.spawn(P.MOTE, x, y, -Math.sin(a) * vt - Math.cos(a) * vi, Math.cos(a) * vt - Math.sin(a) * vi, 0.9, R.pick([WHITE, C[6], C[6], C[5]]), R.range(0.7, 1.2));
        }
        if (R.chance(0.75)) {
          const a = R.range(0, TAU), D = R.range(28, 70), T = R.range(0.18, 0.28), v = (D * 3) / (Math.exp(3 * T) - 1);
          ps.spawn(P.STREAK, Math.cos(a) * D, Y + Math.sin(a) * D, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[7] : C[6]);
        }
        if (t < REL - 0.2 && R.chance(0.16)) {
          const a = R.range(0, TAU), D = R.range(34, 60);
          puffs.spawn(PK.SOOT, Math.cos(a) * D, Y + Math.sin(a) * D, -Math.sin(a) * 40, Math.cos(a) * 40, R.range(0.6, 0.9), R.range(3, 6));
        }
        attract(ps.list, 0, Y, 2.2e6 * (0.3 + k), 110, 0.55, 2.5, dt, (q) => (q.k === P.MOTE ? 1 : 0), 420);
        attract(puffs.list, 0, Y, 1.2e6 * (0.3 + k), 90, 0.7, 4, dt, () => 1, 160);
      }
      if (t >= REL && !released) {
        released = true;
        release();
      }
      // the sphere burns: flame licks off its rim, the odd spark and ember
      if (released && t < BURN) {
        const sr = sphereR(t);
        for (acc += dt * 34; acc > 1; acc--) {
          const a = -Math.PI / 2 + R.gauss() * 1.1, [x, y] = rim(a, sr + 1), sp = R.range(10, 35);
          puffs.spawn(PK.FLAME, x, y, Math.cos(a) * sp, Math.sin(a) * sp - R.range(10, 30), R.range(0.25, 0.45), R.range(1.2, 2.2), 0, R.chance(0.2));
        }
        if (R.chance(dt * 10)) {
          const a = -Math.PI / 2 + R.range(-1.4, 1.4), [x, y] = rim(a, sr * 0.9);
          puffs.spawn(PK.SOOT, x, y, Math.cos(a) * 20, -R.range(15, 35), R.range(1.2, 1.7), R.range(5, 9));
        }
        if (R.chance(dt * 8)) {
          const a = R.range(0, TAU), [x, y] = rim(a, sr), sp = R.range(110, 200);
          ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.2, 0.5));
        }
        if (R.chance(dt * 7)) {
          const a = -Math.PI / 2 + R.range(-1.2, 1.2), [x, y] = rim(a, sr);
          embers.spawn(P.EMBER, x, y, Math.cos(a) * 30, -R.range(20, 50), R.range(0.9, 1.6));
        }
      }
      // the collapse: the sphere draws its own flame back in, streaks race to the heart
      if (t >= BURN && !collapsing) {
        collapsing = true;
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), D = R.range(26, 48), T = R.range(0.14, 0.2), v = (D * 3) / (Math.exp(3 * T) - 1);
          ps.spawn(P.STREAK, Math.cos(a) * D, Y + Math.sin(a) * D, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? WHITE : C[6]);
        }
      }
      if (collapsing && !popped) {
        attract(puffs.list, 0, Y, 1.4e6, 64, 0.6, 3, dt, (q) => (q.k === PK.FLAME ? 1 : 0.35), 200);
      }
      if (t >= POP && !popped) {
        popped = true;
        pop();
      }
      // the shock reaches the floor: dust rolls out under the ring
      for (const r of rings) {
        if (r.delay > 0 || !r.hot || r.th < 3) continue;
        const rr = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(r.life / r.max, 3)), rf = rr > -Y ? Math.sqrt(rr * rr - Y * Y) : 0;
        if (rf > 0)
          for (dustAcc += dt * 60; dustAcc > 1; dustAcc--) {
            const s = R.sign();
            ps.spawn(P.DUST, s * rf + R.range(-2, 2), -R.range(1, 3), s * R.range(20, 50), -R.range(4, 14), R.range(0.4, 0.8), mix(C[2], C[3], R.next()), R.range(1.5, 3));
          }
      }
      for (const a of [lights, rings])
        for (let i = a.length - 1; i >= 0; i--) {
          const q = a[i];
          if (q.delay > 0) q.delay -= dt;
          else if ((q.life -= dt) <= 0) a.splice(i, 1);
        }
      bits.update(dt);
      for (const b of bits.list) {
        // a shard that comes to rest lies flat on the floor
        if (b.rest && !b.flat) {
          b.flat = true;
          b.a = Math.round(b.a / Math.PI) * Math.PI + R.range(-0.2, 0.2);
          b.y = -1;
        }
        // and once it has lain a while, it dissolves into a wisp
        if (b.life < 0.45 && !b.wisp) {
          b.wisp = true;
          puffs.spawn(PK.SOOT, b.x, b.y - 1, R.range(-4, 4), -R.range(8, 16), R.range(0.6, 0.9), R.range(1.4, 2.4));
        }
      }
      puffs.update(dt);
      ps.update(dt);
      embers.update(dt);
    },
    drawBack(p) {
      const k = burning(t);
      for (const r of rings) floorRing(p, C, r, true);
      puffs.draw(p, PK.SOOT, { x: 0, y: Y, k: k * flick, reach: 84 });
      ps.draw(p, "back");
      if (k > 0) p.glow(0, -3, 74, C[4], 0.24 * Math.min(1, k) * flick);
    },
    draw(p) {
      const sr = sphereR(t), k = burning(t), L = starL(t);
      for (const r of rings) floorRing(p, C, r, false);
      // the charge: a contracting ring and a black core that beats
      let cr = 0;
      if (t < REL) {
        const q = t / REL, ring = 3 + 74 * (1 - ease.inQuad(q));
        const beat = 1 + 0.3 * Math.exp(-((t - REL * 0.5) ** 2) / 0.0015) + 0.4 * Math.exp(-((t - REL * 0.8) ** 2) / 0.0015);
        cr = coreR(t) * beat;
        ringFast(p, 0, Y, ring, 1, q > 0.7 ? C[6] : C[5], 0.2 + 0.7 * q);
        if (t > REL - 0.07) p.circle(0, Y, 1.6, WHITE);
        else sphere(p, C, cr, t, 0.3 + 0.3 * q);
        halo(p, 0, Y, cr, cr + 14 + 30 * q, C[5], (0.45 + 0.7 * q) * beat);
        p.glow(0, Y, 60 + 30 * q, C[4], 0.12 + 0.3 * q);
      }
      // the release: a violet-white flash with a black star cut across it
      const fu = (t - REL) / 0.12;
      if (fu >= 0 && fu < 1) {
        const r = 36 * (1 - 0.3 * fu);
        p.circle(0, Y, r + 1.5, C[5], 1.2 - fu);
        p.circle(0, Y, r, fu < 0.35 ? WHITE : C[6], 1.1 - fu);
        if (fu < 0.6) p.circle(0, Y, r * 0.62, WHITE);
      }
      // the shock rings in the air
      for (const r of rings) {
        if (r.delay > 0) continue;
        const q = r.life / r.max, rr = r.r0 + (r.r1 - r.r0) * (1 - q * q * q), th = Math.max(1, r.th * q + 0.4);
        // the floor stops it: below the floor line it's the flat ring on the floor instead
        ringFast(p, 0, Y, rr, th, (v) => (r.hot ? (v > 0.6 ? WHITE : v > 0.3 ? C[6] : C[5]) : v > 0.5 ? C[5] : C[4]), (v, g) => (Y + Math.sin(g) * rr > 0.5 ? 0 : Math.min(1, q * 1.6)));
        if (r.hot) ringLight(p, 0, Y, rr, 4, C[5], 0.4 * q, (x, y) => y < 0.5);
      }
      sphere(p, C, sr, t, t < BURN ? 1 : 1 + 0.5 * clamp((t - BURN) / (POP - BURN)));
      // the black star, burning at the edge where its arms leave the flash
      const star = L > 0 ? blackStar(Y, L, starRot(t), 0.5, 0.4) : null;
      if (star) {
        const age = t - REL, fr = age < 0.12 ? 36 * (1 - 0.3 * (age / 0.12)) + 1.5 : 0, cut = Math.max(fr, sr);
        star.draw(p, C[0], age < 0.1 ? C[5] : C[4], (x, y) => x * x + (y - Y) ** 2 < cut * cut);
      }
      puffs.draw(p, PK.FLAME);
      for (const b of bits.list) shard(p, b, C, 0, Y, Math.min(1, k) * 0.9);
      ps.draw(p, "front");
      embers.draw(p, "front");
      // the pop as it goes: a glint and a last hard light
      const pu = (t - POP) / 0.2;
      if (pu >= 0 && pu < 1) sparkle(p, 0, Y, 12 * (1 - pu), C[6], C[5], 0.7 * (1 - pu));
      // light: the blast's flare and the sphere's corona; then black takes its light back
      for (const l of lights) {
        const q = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.55 + 0.45 * q), l.c, l.k * q * q);
      }
      if (sr > 1) {
        halo(p, 0, Y, sr - 0.5, sr + 16, C[6], 0.5 * flick * Math.min(1, k));
        p.glow(0, Y, sr + 54, C[4], 0.5 * flick * Math.min(1, k));
      }
      // black takes its light back: the sphere and the core, then the star's own cells
      const B0 = Math.max(sr, cr) + 1;
      if (B0 > 2) unlight(p, -B0, Y - B0, B0, Y + B0, (x, y) => x * x + (y - Y) ** 2 < (Math.max(sr, cr) - 0.5) ** 2);
      if (star) star.unlight(p);
    },
  };
}

// where the shock meets the floor: its cross-section with the floor plane, a flat ring racing out
function floorRing(p, C, r, back) {
  if (r.delay > 0 || !r.hot || r.th < 3) return;
  const q = r.life / r.max, rr = r.r0 + (r.r1 - r.r0) * (1 - q * q * q);
  if (rr <= -Y) return;
  const rf = Math.sqrt(rr * rr - Y * Y);
  band(p, 0, 0.5, rf, 0.16, Math.max(1, 3 * q), Math.min(1, q * 1.5), [C[3], C[4], C[5], C[6]], (g) => (Math.sin(g) < 0) === back);
  if (!back) for (const s of [-1, 1]) p.glow(s * rf, -2, 16, C[5], 0.4 * q);
}
