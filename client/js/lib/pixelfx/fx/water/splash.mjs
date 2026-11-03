// The droplet recipe (shaded beads with tails that fly, land and throw up a little crown of their own) is
// adapted from Sprite Fusion's open-source blood (https://www.spritefusion.com/pixel-art-vfx/blood),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, rand, noise, TAU, WHITE } from "../../core/index.mjs";
import { WATER, Drops, Ripples, Mist, bead, lace, pebble, rock } from "./_lib.mjs";

export const meta = {
  name: "Splash",
  desc: "A stone drops into still water: a white hit, a crown that tears into droplets arcing out to plink down with rings, a jet that bounces back, foam and drifting mist.",
  tags: ["water", "splash", "impact", "drop", "liquid", "one-shot"],
  size: [176, 100],
  origin: [88, 78],
  duration: 2.5,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, stone: true, seed: 3 },
};

const SY = 0.22, HIT = 0.16, G = 820, FINGERS = 12, JET = 0.3, TEAR = 0.11;

// the crown over time u after the hit: it leaps up in a few frames, flares out, then falls back
const height = (u) => 19 * ease.outCubic(clamp(u / 0.09)) * (1 - ease.inQuad(clamp((u - 0.12) / 0.3)));
const foot = (u) => 3 + 7.5 * ease.outCubic(clamp(u / 0.45));
const lip = (u) => foot(u) + height(u) * 0.42 + 3 * ease.outCubic(clamp(u / 0.25));
// the jet that bounces back up the middle once the crown has fallen
const jetH = (u) => 26 * (ease.outCubic(clamp(u / 0.12)) - ease.inQuad(clamp((u - 0.15) / 0.28)));

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), ST = rock(), phi = R.range(0, TAU);
  const ps = new Particles({ rng: R }), mist = new Mist(), lights = new Lights(), rings = new Ripples({ sy: SY });
  const plinks = [], bubbles = [], spikes = Array.from({ length: FINGERS }, (_, k) => ({ a: ((k * TAU) / FINGERS + phi) % TAU, L: R.range(0.2, 0.36) }));
  const drops = new Drops({
    sy: SY,
    g: G,
    onLand: (d) => {
      // every drop that comes down plinks: a white fleck, a ring, and the bigger ones throw up a tiny crown
      rings.add(d.x, d.z, 0.6, 2 + d.s * 1.8, 0.34 + d.s * 0.1, { n: 1, k: 0.95, hot: 0.06 });
      plinks.push({ x: d.x, y: d.z * SY, s: d.s, age: 0 });
      if (d.s > 1 && !d.small)
        for (let i = 0; i < d.s; i++) {
          const a = R.range(0, TAU), v = R.range(10, 34);
          drops.add({ x: d.x, z: d.z, h: 0.5, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vh: R.range(55, 110), s: 1, small: true, life: 1 });
        }
    },
  });
  let t = 0;
  const done = new Set(), once = (key, at) => !done.has(key) && t >= at && done.add(key);
  // the lip isn't level: it rises and dips round the crown
  const scallop = (a, h) => h * (0.86 + 0.14 * noise(Math.cos(a) * 2.2 + Math.sin(a) * 1.3 + phi * 3, o.seed));

  // the crown: a thin sheet from its foot to a rolled lip. The far wall's shadowed inside shows over the near
  // lip; the near wall is see-through between bright streaks, white down its lit edge; fingers rise off the lip
  function crown(p, back) {
    const u = t - HIT, h = height(u);
    if (u < 0 || h < 0.7) return;
    const r0 = foot(u), rt = lip(u), white = u < 0.045;
    const cells = new Map();
    const put = (x, y, c, a, rank) => {
      const X = Math.floor(x), Y = Math.floor(y), key = (Y + 4096) * 8192 + X + 4096, cur = cells.get(key);
      if (!cur || rank > cur.r) cells.set(key, { x: X, y: Y, c, a, r: rank });
    };
    const n = Math.ceil(rt * TAU * 1.6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, s = Math.sin(a), c = Math.cos(a);
      if (s < 0 !== back) continue;
      const lane = Math.floor(((a + phi) * rt) / 2.2), streak = rand(lane, 31) < 0.3, H = scallop(a, h);
      // as it falls, each lane of the sheet gives way from the top at its own moment
      const keep = 1 - clamp((u - 0.13 - 0.14 * rand(lane, 7)) / 0.1), steps = Math.ceil(H * 1.4) + 2;
      for (let k = 0; k <= steps * keep; k++) {
        const v = k / steps, r = r0 + (rt - r0) * Math.pow(v, 2.2), x = c * r, y = s * r * SY - H * v;
        if (white) put(x, y, WHITE, 1, 3);
        else if (back) put(x, y, v > 0.72 ? (streak ? C[5] : C[4]) : streak ? C[3] : C[2], 1, 1);
        else if (Math.abs(c) > 0.9) put(x, y, c < 0 ? (Math.abs(c) > 0.97 ? WHITE : C[6]) : C[4], 1, 2);
        else if (v < 0.1) put(x, y, v < 0.05 ? WHITE : C[6], 1, 2);
        else if (streak) put(x, y, c < -0.2 ? C[6] : C[5], 1, 1);
        else put(x, y, c < 0 ? C[5] : C[4], 0.22, 0);
      }
      // the rolled lip: a hard white line on the near side, softer on the far, gone where the lane broke
      if (!white && keep >= 1) {
        const x = c * rt, y = s * rt * SY - H;
        put(x, y, back ? C[5] : c < 0.45 ? WHITE : C[6], 1, 3);
        if (!back && c < 0.2) put(x, y + 1, C[6], 1, 2);
      }
    }
    for (const q of cells.values()) {
      if (q.r === 0) p.blend(q.x, q.y, q.c, q.a);
      else p.px(q.x, q.y, q.c);
    }
    // fingers: spikes running on up and out from the lip, a bead on each until it tears off
    const reach = 1 - smooth(TEAR, TEAR + 0.1, u);
    for (const f of spikes) {
      if (Math.sin(f.a) < 0 !== back || reach <= 0) continue;
      const H = scallop(f.a, h), L = h * f.L * reach, x0 = Math.cos(f.a) * rt, y0 = Math.sin(f.a) * rt * SY - H, x1 = x0 + Math.cos(f.a) * L * 0.45, y1 = y0 - L;
      if (L >= 1) p.line(x0, y0, x1, y1, white ? WHITE : back ? C[4] : C[6]);
      if (u > 0.04 && u < TEAR) bead(p, x1 - (back ? 0 : 0.5), y1 - 1, 0, -1, back ? 1 : 2, C);
      if (!back && Math.sin(f.a) > 0.3) p.glow(x0, y0, 6, C[5], 0.22 * reach);
    }
  }

  function jet(p) {
    const u = t - HIT - JET, h = jetH(u);
    if (u < 0 || h < 0.8) return;
    const top = -h;
    // a mound of water heaves up under it
    p.ellipse(0, 0, 5, 2.4, (d, a) => (Math.sin(a) > 0 ? null : d < 0.5 ? WHITE : Math.cos(a) < 0 ? C[6] : C[5]));
    p.shade(-3, top - 2, 3, 0, (x, y, out) => {
      const v = clamp((y - top) / h), w = 1.15 + 1.5 * v * v * v, q = x / w;
      if (Math.abs(q) > 1) return;
      out.c = q < -0.5 ? C[6] : q < 0.3 ? WHITE : q < 0.72 ? C[5] : C[4];
    });
    if (u < 0.12) {
      // the bulb at its tip, about to pinch off
      p.circle(0, top - 1, 1.7, C[5]);
      p.circle(-0.3, top - 1.3, 1.1, C[6]);
      p.px(-1, top - 2, WHITE);
    }
    p.glowLine(0, -1, 0, top, 7, C[5], 0.3);
  }

  return {
    update(dt) {
      t += dt;
      if (once("hit", HIT)) {
        lights.add(0, -6, 52, C[5], 0.6, 0.45);
        lights.add(0, -4, 16, WHITE, 0.5, 0.08);
        rings.add(0, 0, 8, 56, 2.0, { n: 2, gap: 3.4, k: 1.35, hot: 0.16, glint: 1 });
        rings.add(0, 0, 5, 38, 1.7, { n: 1, k: 0.9, delay: 0.14 });
        // the first sheet of spray, thrown up fast and fine
        for (let i = 0; i < 20; i++) {
          const a = R.range(0, TAU), v = R.range(50, 125);
          drops.add({ x: Math.cos(a) * 3, z: Math.sin(a) * 3, h: R.range(1, 6), vx: Math.cos(a) * v, vz: Math.sin(a) * v, vh: R.range(160, 270), s: R.chance(0.25) ? 2 : 1, delay: R.range(0, 0.04) });
        }
        // mist rolls out low along the water
        for (let i = 0; i < 9; i++) {
          const s = i % 2 ? 1 : -1, x = s * R.range(4, 12);
          mist.add(x, -R.range(1, 7), s * R.range(25, 70), -R.range(4, 16), R.range(2.5, 4), R.range(7, 11), R.range(0.9, 1.5), R.chance(0.5) ? C[6] : C[5], R.range(0.3, 0.42), R.range(0, 0.1));
        }
      }
      if (once("spray", HIT + 0.04)) {
        for (let i = 0; i < 20; i++) {
          const a = R.range(0, TAU);
          ps.spawn(P.FLAKE, Math.cos(a) * 9, Math.sin(a) * 9 * SY - R.range(6, 15), Math.cos(a) * R.range(25, 90), -R.range(30, 100), R.range(0.7, 1.3), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.5));
        }
        for (let i = 0; i < 5; i++) ps.spawn(P.STAR, R.range(-13, 13), -R.range(6, 20), 0, -4, R.range(0.25, 0.55), C[6], R.range(1, 2.4), R.range(0, 0.15));
      }
      if (once("tear", HIT + TEAR)) {
        // the beads on the finger tips tear off and arc away
        const h = height(TEAR), rt = lip(TEAR);
        for (const f of spikes) {
          const a = f.a + R.range(-0.08, 0.08), v = R.range(32, 88), L = h * f.L;
          drops.add({ x: Math.cos(f.a) * (rt + L * 0.45), z: Math.sin(f.a) * rt, h: h + L + 1, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vh: R.range(90, 190), s: R.chance(0.3) ? 3 : 2 });
        }
      }
      // as the crown gives way its lip comes apart into drops
      const u = t - HIT;
      if (u > 0.13 && u < 0.3 && R.chance(0.3)) {
        const a = R.range(0, TAU), rt = lip(u), v = R.range(15, 45);
        drops.add({ x: Math.cos(a) * rt, z: Math.sin(a) * rt, h: scallop(a, height(u)) * R.range(0.6, 1), vx: Math.cos(a) * v, vz: Math.sin(a) * v, vh: R.range(-10, 45), s: R.chance(0.3) ? 2 : 1 });
      }
      if (once("fall", HIT + 0.3)) {
        // the crown falls back, shedding a few heavy drops close in
        for (let i = 0; i < 8; i++) {
          const a = R.range(0, TAU), r = lip(0.3), v = R.range(15, 40);
          drops.add({ x: Math.cos(a) * r, z: Math.sin(a) * r, h: R.range(3, 7), vx: Math.cos(a) * v, vz: Math.sin(a) * v, vh: R.range(30, 80), s: R.chance(0.4) ? 2 : 1 });
        }
      }
      if (once("bead", HIT + JET + 0.12)) {
        // the jet's tip pinches off into a bead that hangs, then drops back
        drops.add({ x: 0, z: 0.2, h: jetH(0.12) + 1, vx: R.range(-6, 6), vz: 0, vh: 55, s: 3 });
        for (let i = 0; i < 3; i++) mist.add(R.range(-3, 3), -jetH(0.12) + R.range(2, 8), R.range(-14, 14), -R.range(4, 12), 2, R.range(4, 6), R.range(0.6, 1), C[6], 0.3);
      }
      if (once("slump", HIT + JET + 0.38)) {
        rings.add(0, 0, 3, 30, 1.5, { n: 2, gap: 2.6, k: 0.9 });
        for (let i = 0; i < 4; i++) mist.add(R.range(-6, 6), -R.range(1, 4), R.range(-30, 30), -R.range(3, 10), 2.5, R.range(6, 9), R.range(0.8, 1.2), C[5], 0.28);
      }
      // the stone sinks and lets go of its air: a few bubbles come up and pop
      for (const [i, at] of [[0, 0.95], [1, 1.2], [2, 1.5]])
        if (once("glug" + i, HIT + at)) bubbles.push({ x: R.range(-5, 5), z: R.range(-6, 6), t0: t, r: R.range(1.3, 2.3), popped: false });
      for (const b of bubbles)
        if (!b.popped && t - b.t0 > 0.2) {
          b.popped = true;
          rings.add(b.x, b.z, 1, 7, 0.6, { n: 1, k: 0.9 });
          plinks.push({ x: b.x, y: b.z * SY, s: 1, age: 0 });
          for (let i = 0; i < 2; i++) drops.add({ x: b.x, z: b.z, h: 1, vx: R.range(-20, 20), vz: R.range(-10, 10), vh: R.range(50, 90), s: 1, small: true, life: 1 });
        }
      for (let i = plinks.length - 1; i >= 0; i--) if ((plinks[i].age += dt) > 0.14) plinks.splice(i, 1);
      drops.update(dt);
      rings.update(dt);
      mist.update(dt);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const u = t - HIT;
      // the cavity the stone punches, dark inside the foot of the crown
      if (u > 0 && u < 0.26) {
        const r = foot(u) * 0.85 * (1 - smooth(0.12, 0.26, u));
        p.ellipse(0, 0, r, r * SY + 0.6, (d, a) => (Math.sin(a) < 0 ? C[1] : C[2]));
      }
      rings.draw(p, C, -1);
      crown(p, true);
      drops.draw(p, C, "back");
    },
    draw(p) {
      const u = t - HIT;
      rings.draw(p, C, 1);
      if (u > 0.2) {
        const rx = 4 + 11 * ease.outCubic(clamp((u - 0.2) / 0.7)), k = smooth(0.2, 0.32, u) * (1 - smooth(0.5, 2.0, u)) * 0.9;
        lace(p, 0, 0, rx, rx * SY + 0.5, k, C, t, o.seed);
      }
      crown(p, false);
      jet(p);
      for (const b of bubbles) {
        const g = (t - b.t0) / 0.2;
        if (g > 1) continue;
        const r = b.r * ease.outBack(g), x = b.x, y = b.z * SY;
        for (let a = Math.PI; a <= TAU + 0.01; a += 0.5 / Math.max(1, r)) p.dot(x + Math.cos(a) * r, y + Math.sin(a) * r, C[6]);
        p.px(x - r * 0.4, y - r * 0.6, WHITE);
        p.glow(x, y - 1, 4, C[5], 0.25);
      }
      for (const q of plinks) {
        const k = q.age / 0.14;
        if (k < 0.5) p.px(q.x, q.y, WHITE);
        if (q.s > 1) p.line(q.x, q.y - 1, q.x, q.y - 1 - 3 * (1 - k), k < 0.4 ? WHITE : C[6]);
        p.glow(q.x, q.y, 4, C[5], 0.3 * (1 - k));
      }
      drops.draw(p, C, "front");
      // the hit: a flat white flash on the surface for two frames
      if (u >= 0 && u < 0.07) {
        p.ellipse(0, 0, 10, 2.4, (d) => (d < 0.6 ? WHITE : C[6]));
        sparkle(p, 0, -3, 5 * (1 - u / 0.07), C[6], C[5], 0.5);
      }
      // the stone, falling fast with a streak of air off it
      if (o.stone && t < HIT) {
        const v = t / HIT, y = -70 + 70 * (0.4 * v + 0.6 * v * v);
        p.line(0, y - 12, 0, y - 3, ST[4], (w) => w * 0.8);
        pebble(p, 0, y, 2.6, ST);
      }
      mist.draw(p, C[5]);
      ps.draw(p);
      lights.draw(p);
      // the disturbed water keeps a cool light on it while it settles
      if (u > 0) {
        p.glow(0, -2, 34, C[4], 0.2 * (1 - smooth(0, 1.6, u)));
        p.glow(0, 2, 64, C[3], 0.16 * (1 - smooth(0.1, 2.1, u)));
      }
    },
  };
}
