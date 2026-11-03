// The eruption (a spike punching up with overshoot and a white frame, a burst of debris, mist and glints, then
// breaking into tumbling pieces) is adapted from Sprite Fusion's open-source ice spikes, and the grit and
// rolling dust from his explosion (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, sparkle, clamp, smooth, ease, lerp, TAU, WHITE, hex, mix } from "../../core/index.mjs";
import { stoneShape, drawRock, drawSpike, spikeLook, spikeCrack, floorCrack } from "./_lib.mjs";

export const meta = {
  name: "Earth spike",
  desc: "The floor cracks with light and heaves, a faceted stone spike rams up with two side shards in a burst of chips, grit and dust; rubble rains, then it splits and crumbles.",
  tags: ["nature", "earth", "stone", "spike", "ground", "attack", "one-shot"],
  size: [272, 150],
  origin: [136, 132],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#120c0c", "#251917", "#3b2a24", "#553d31", "#715440", "#8f6e52", "#b8966e", "#e6d0a8"],
    glow: ["#4a1a0c", "#a8401a", "#ff8a2a", "#ffd27a", "#fff4d0"],
    height: 62,
    seed: 5,
  },
};

const UP = 0.34, RISE = 0.09, CRACK = 1.18, SPLIT = 1.5, PART = 0.1, FALL = 0.42, SINK = 0.55;

export function create(o) {
  const S = fit(o.palette, 8), G = fit(o.glow, 5), R = new Rng(o.seed), floor = () => 0, H = o.height;
  const DUST = mix(S[6], hex("#8c8494"), 0.45), DUST2 = mix(S[5], hex("#6c6474"), 0.4);
  const ps = new Particles({ rng: R, ground: floor, sparks: [G[4], G[3], G[2], G[1]] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  // the spike and two side shards leaning away from it, each with its own chips, strata and cracks
  const spikes = [
    { x: -H * 0.17, H: H * 0.52, w: H * 0.22, lean: -H * R.range(0.13, 0.18), at: UP + 0.045, split: SPLIT - 0.1, back: true },
    { x: H * 0.18, H: H * 0.4, w: H * 0.2, lean: H * R.range(0.11, 0.15), at: UP + 0.085, split: SPLIT + 0.08, back: false },
    { x: 0, H, w: H * 0.36, lean: R.range(-2, 2), at: UP, split: SPLIT, back: false, main: true },
  ];
  for (const s of spikes) {
    s.look = spikeLook(R);
    s.cracks = [spikeCrack(R, R.range(0.04, 0.16), R.range(-0.6, -0.1), 1), spikeCrack(R, R.range(0.22, 0.4), R.range(0.1, 0.6), -1), spikeCrack(R, R.range(0.42, 0.58), R.range(-0.4, 0.4), R.sign())];
    s.up = s.split0 = false;
    s.cut = R.range(0.24, 0.32);
    s.top = 1;
  }
  const cracks = [floorCrack(R, -1, R.range(34, 44)), floorCrack(R, 1, R.range(34, 44)), floorCrack(R, -1, R.range(14, 20)), floorCrack(R, 1, R.range(14, 20))];
  const slabs = [-1, 1].map((sd) => ({ sd, x: sd * R.range(13, 16), pts: [[-1.2, -0.32], [1.1, -0.42], [1.2, 0.36], [-1.1, 0.4]], s: R.range(5.5, 7), a: sd * R.range(0.45, 0.65) }));
  const rock = (b) => bits.add({ ...b, pts: stoneShape(R) });
  let t = 0;
  const grown = (s) => (t < s.at ? 0 : ease.outBack(clamp((t - s.at) / RISE), 2.2));
  const open = () => ease.outCubic(clamp((t - 0.02) / 0.24));
  const heat = () => (t < UP ? smooth(0, UP, t) : 1 - smooth(UP, UP + 0.9, t));
  // after the split the halves part, tip outwards and come down from the top as rubble
  const gap = (s) => smooth(s.split, s.split + PART, t) * (s.main ? 3 : 2);
  const tip = (s) => smooth(s.split, s.split + PART + FALL, t) * 0.12 * s.H;
  const topAt = (s) => lerp(1, s.cut, ease.inQuad(clamp((t - s.split - 0.04) / FALL)));

  const erupt = (s) => {
    const k = s.H / H;
    lights.add(s.x, -s.H * 0.4, 30 * k + 14, WHITE, 0.5 * k + 0.1, 0.1);
    lights.add(s.x, -10, 60 * k + 20, G[2], 0.34 * k, 0.5);
    for (let i = 0; i < Math.round(16 * k) + 3; i++) {
      const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(140, 360) * (0.6 + 0.4 * k);
      rock({ kind: B.CHUNK, x: s.x + R.range(-s.w / 3, s.w / 3), y: -R.range(1, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.35, bounce: 0.32, life: R.range(1.4, 2.4), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1.6, 3.8) * (0.6 + 0.4 * k) });
    }
    for (let i = 0; i < Math.round(55 * k) + 10; i++) {
      const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.9, sp = R.range(90, 330) * (1 - 0.35 * Math.abs(u));
      ps.spawn(P.GRIT, s.x + u * s.w * 0.4, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 2), R.pick([S[6], S[5], S[4], S[4], S[3]]), R.chance(0.4) ? 2 : 1);
    }
    for (let i = 0; i < Math.round(9 * k) + 2; i++) {
      const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(160, 380);
      ps.spawn(P.SPARK, s.x, -R.range(2, 10), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.4));
    }
    // dust: a low skirt rolling out both ways, a few puffs hanging round the base
    for (let i = 0; i < Math.round(10 * k) + 3; i++) {
      const sd = R.sign();
      ps.spawn(P.SMOKE, s.x + sd * R.range(2, 10), -R.range(1, 4), sd * R.range(50, 170) * (0.5 + 0.5 * k), -R.range(3, 16), R.range(0.9, 1.6), R.chance(0.5) ? DUST : DUST2, R.range(3, 5.5) * (0.6 + 0.4 * k), R.range(0, 0.05), PF.BIG);
    }
    for (let i = 0; i < Math.round(14 * k) + 4; i++) {
      const sd = R.sign();
      ps.spawn(P.DUST, s.x + sd * R.range(0, 8), -R.range(0, 3), sd * R.range(40, 160), -R.range(2, 20), R.range(0.5, 1), R.chance(0.5) ? DUST : DUST2, R.range(1.5, 3.2));
    }
    for (let i = 0; i < Math.round(3 * k) + 1; i++)
      ps.spawn(P.SMOKE, s.x + R.range(-6, 6), -R.range(2, 12), R.range(-20, 20), -R.range(15, 45), R.range(1, 1.6), DUST, R.range(4, 6) * k + 2, R.range(0.02, 0.12), PF.BIG);
    if (s.main) {
      for (let i = 0; i < 3; i++) ps.spawn(P.STAR, s.x + R.range(-5, 5), -R.range(10, s.H * 0.9), 0, -3, R.range(0.25, 0.5), S[7], R.range(1, 2.2), R.range(0.1, 0.4));
      // rubble that went up high comes raining back down
      for (let i = 0; i < 14; i++) ps.spawn(P.GRIT, R.range(-60, 60), -R.range(110, 125), R.range(-15, 15), R.range(10, 60), R.range(1.2, 1.8), R.pick([S[5], S[4], S[3]]), R.chance(0.35) ? 2 : 1, R.range(0.25, 0.9));
    }
  };

  // one band of a spike, u0..u1, breaks off both halves into rubble that drops and tumbles
  const crumble = (s, u0, u1) => {
    const g = gap(s), lean = s.lean, tp = tip(s);
    for (const half of [-1, 1]) {
      const u = (u0 + u1) / 2, hw = (s.w / 2) * Math.pow(1 - u, 0.85), x = s.x + lean * u + half * (g / 2 + hw * 0.45 + tp * u), y = -u * s.H;
      if (hw < 0.8 && half > 0) continue;
      rock({ kind: B.CHUNK, x, y, vx: half * R.range(8, 40) + lean * 0.6, vy: -R.range(0, 50), g: 1, drag: 0.3, bounce: 0.3, life: Math.min(R.range(1.1, 1.6), meta.duration - 0.15 - t), a: R.range(0, TAU), va: R.range(-8, 8), s: clamp(hw * 0.62, 1.6, 4.8) });
      for (let i = 0; i < 3; i++) ps.spawn(P.GRIT, x + R.range(-2, 2), y + R.range(-2, 2), half * R.range(5, 45), -R.range(10, 70), R.range(0.9, 1.6), R.pick([S[6], S[5], S[4], S[3]]), R.chance(0.35) ? 2 : 1);
    }
    if (R.chance(0.5)) ps.spawn(P.DUST, s.x + lean * u1 + R.range(-4, 4), -u1 * s.H, R.sign() * R.range(15, 45), R.range(20, 60), R.range(0.35, 0.6), DUST, R.range(2, 3.5));
  };

  const drawShard = (p, s) => {
    const g = grown(s);
    if (g <= 0) return;
    if (t < s.split) {
      const white = t - s.at < 0.04 || t > s.split - 0.045, crack = smooth(CRACK + (s.main ? 0 : 0.05), s.split - 0.03, t);
      const sw = (t - s.at) * 0.9 - 0.15, glint = sw > 0 && sw % 1.2 < 0.55 ? (sw % 1.2) / 0.55 : -1;
      drawSpike(p, s.x, 0, s.H * g, s.w, s.lean * Math.min(1, g), s.look, S, { white, glint, cracks: s.cracks, crack, heat: smooth(CRACK, s.split, t), glowRamp: G });
      return;
    }
    // split: two halves part along the ridge and tip away, crumbling from the top; the stump sinks
    const top = topAt(s), gp = gap(s), tp = tip(s), sink = smooth(s.split + FALL, s.split + FALL + SINK, t) * s.H * (s.cut + 0.06);
    if (sink >= s.H * (s.cut + 0.05)) return;
    for (const half of [-1, 1]) drawSpike(p, s.x + (half * gp) / 2, sink, s.H, s.w, s.lean + half * tp, s.look, S, { half, clip: top, floor: 0, cracks: s.cracks, crack: 1, heat: 1 - smooth(s.split, s.split + 0.45, t), glowRamp: G });
  };

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      // the floor splits open: grit hops out of the cracks as they run, dust puffs from them
      if (t < UP) {
        const L = open();
        for (const c of cracks)
          if (R.chance(0.35 * f)) {
            const q = c[Math.min(c.length - 1, Math.floor(R.range(0, L) * c.length))];
            ps.spawn(P.GRIT, q[0], -1, R.range(-20, 20), -R.range(30, 110), R.range(0.5, 1), R.pick([S[5], S[4]]), 1);
            if (R.chance(0.25)) ps.spawn(P.DUST, q[0], -1, R.range(-15, 15), -R.range(4, 14), R.range(0.3, 0.6), DUST2, R.range(1.5, 3));
          }
        if (t > 0.12 && R.chance(0.2 * f)) ps.spawn(P.DUST, R.sign() * R.range(10, 16), -R.range(1, 4), R.sign() * R.range(10, 30), -R.range(4, 12), R.range(0.4, 0.7), DUST2, R.range(2, 3.5));
      }
      for (const s of spikes) {
        if (!s.up && t >= s.at) (s.up = true), erupt(s);
        if (!s.split0 && t >= s.split) {
          s.split0 = true;
          lights.add(s.x, -s.H * 0.5, 30, WHITE, 0.3, 0.08);
          ps.spawn(P.STAR, s.x + s.lean * 0.5, -s.H * 0.55, 0, -2, 0.3, S[7], 2.5);
        }
        // crumbling from the top: each band that goes turns to rubble
        if (t >= s.split) {
          const top = topAt(s);
          while (s.top - top > 0.045 || (top <= s.cut + 1e-6 && s.top > s.cut + 1e-6)) {
            const u1 = s.top, u0 = Math.max(top, s.top - 0.11);
            crumble(s, u0, u1);
            s.top = u0;
            if (u0 <= s.cut + 1e-6) break;
          }
        }
        // cracking: grit and dust dribble out of the cracks
        if (t < s.split && t > CRACK && R.chance(0.12 * f)) {
          const u = R.range(0.1, 0.7);
          ps.spawn(P.GRIT, s.x + s.lean * u + R.range(-2, 2), -u * s.H, R.range(-15, 15), -R.range(0, 20), R.range(0.6, 1.1), R.pick([S[5], S[4]]), 1);
          if (R.chance(0.3)) ps.spawn(P.DUST, s.x + s.lean * u, -u * s.H, R.range(-10, 10), -R.range(2, 8), R.range(0.4, 0.7), DUST, R.range(1.5, 2.5));
        }
        // while it stands, pebbles trickle off its flanks and light glints off its edges
        if (s.up && t < s.split && t > s.at + 0.2 && R.chance(0.05 * f)) {
          const u = R.range(0.2, 0.8), sd = R.sign();
          ps.spawn(P.GRIT, s.x + s.lean * u + sd * (s.w / 2) * (1 - u), -u * s.H, sd * R.range(10, 30), -R.range(0, 15), R.range(0.7, 1.2), R.pick([S[6], S[5]]), 1);
        }
        if (s.main && s.up && t < s.split && t > s.at + 0.25 && R.chance(0.03 * f))
          ps.spawn(P.STAR, s.x + R.range(-4, 2), -R.range(8, s.H * 0.85), 0, -2, R.range(0.25, 0.45), R.chance(0.5) ? S[7] : G[3], R.range(0.8, 2));
        // the stump sinking pushes up a last puff of dust
        if (t > s.split + FALL && t < s.split + FALL + SINK * 0.8 && R.chance(0.15 * f))
          ps.spawn(P.DUST, s.x + R.range(-s.w / 2, s.w / 2), -R.range(0, 2), R.sign() * R.range(20, 60), -R.range(0, 5), R.range(0.4, 0.7), DUST2, R.range(1.5, 3));
      }
      bits.update(dt);
      // stones that land hard kick up a little dust
      for (const b of bits.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 14), R.range(0.3, 0.6), DUST2, R.range(1.3, 2.6));
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the cracks in the floor: a glowing seam that cools to a dark scar, then fades
      const L = open(), hk = heat(), fade = 1 - smooth(meta.duration - 1.1, meta.duration - 0.3, t);
      for (const c of cracks) {
        const m = Math.max(2, Math.ceil(c.length * L));
        for (let k = 1; k < m; k++) {
          const [x0, y0] = c[k - 1], [x1, y1] = c[k];
          p.line(x0, y0 + 1, x1, y1 + 1, S[0], fade);
          p.line(x0, y0, x1, y1, hk > 0.65 ? G[4] : hk > 0.35 ? G[3] : hk > 0.12 ? G[2] : hk > 0.03 ? G[1] : S[1], fade);
          if (k % 2 === 0) p.glow(x1, y1, 6, G[2], 0.3 * hk);
        }
      }
      if (hk > 0) p.glow(0, -3, 26, G[2], 0.35 * hk);
      ps.draw(p, "back");
      for (const s of spikes) if (s.back) drawShard(p, s);
    },
    draw(p) {
      // before it breaks through, the floor heaves into a trembling mound
      if (t < UP + 0.02) {
        const k = smooth(0.06, UP, t), hm = 8 * k, jx = Math.sin(t * 95) * 0.8 * k;
        if (hm > 0.6)
          p.shade(-16, -hm - 1, 16, 1, (x, y, out) => {
            const dx = (x - jx) / 15, dy = y / hm, d = dx * dx + dy * dy;
            if (y > 0.5 || d > 1.18) return;
            out.c = d > 1 ? S[0] : dy < -0.72 ? S[6] : dx < -0.3 ? S[5] : dx > 0.35 ? S[3] : S[4];
          });
      }
      // slabs of floor shoved up around the base, sinking back as the spike crumbles
      if (t >= UP) {
        const sink = smooth(SPLIT + FALL, SPLIT + FALL + SINK, t) * 7, a = 1 - smooth(SPLIT + FALL, SPLIT + FALL + SINK, t);
        for (const sl of slabs) {
          const g = ease.outBack(clamp((t - UP) / 0.1), 2);
          if (a > 0) drawRock(p, sl.x, -1.5 + sink, sl.s * Math.min(1, g), sl.a * g, sl.pts, S, a, t - UP < 0.04);
        }
      }
      for (const s of spikes) if (!s.back) drawShard(p, s);
      const m0 = spikes[2], leak = smooth(CRACK, SPLIT, t) * (1 - smooth(SPLIT, SPLIT + 0.5, t));
      if (leak > 0) p.glowLine(m0.x, -4, m0.x + m0.lean * 0.6, -m0.H * 0.6, 20, G[2], 0.22 * leak);
      for (const b of bits.list) drawRock(p, b.x, b.y, b.s, b.a, b.pts, S, Math.min(1, b.life / 0.4));
      ps.draw(p, "front");
      // the hero frame: a flare where the tip breaks through, light running up the spike
      const m = spikes[2], e = t - m.at;
      if (e > 0 && e < 0.2) {
        const g = ease.outBack(clamp(e / RISE), 2.2);
        sparkle(p, m.x + m.lean, -m.H * g, 10 * (1 - e / 0.2), S[7], G[3], 0.5);
        p.glowLine(m.x, 0, m.x + m.lean, -m.H * g, 10, G[3], 0.3 * (1 - e / 0.2));
      }
      lights.draw(p);
    },
  };
}
