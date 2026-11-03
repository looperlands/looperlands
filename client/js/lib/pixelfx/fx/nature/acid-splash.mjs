// The drops that splat where they land are adapted from Sprite Fusion's open-source blood
// (https://www.spritefusion.com/pixel-art-vfx/blood), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, noise, rand, TAU, WHITE, mix, hex } from "../../core/index.mjs";
import { Drops } from "./_lib.mjs";

export const meta = {
  name: "Acid splash",
  desc: "A gob of acid bursts into a crown and spatters; it eats a glowing, smoking pit into the floor and boils down into it, spitting bright beads, pale steam curling off.",
  tags: ["nature", "acid", "poison", "splash", "liquid", "ground", "one-shot"],
  size: [184, 116],
  origin: [92, 100],
  duration: 2.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#0e140a", "#1c3010", "#2c5214", "#457e18", "#6aae1c", "#a0dc2a", "#dcff6a", "#f8ffd0"], seed: 6 },
};

const HIT = 0.3, Y0 = -62, V0 = 60, SPREAD = 0.4, DRY = 0.7, GONE = 2.2, W = 30, PIT = 5;

// a curl of steam: thin, pale, quick, fading as it goes
function wisp(p, q, t, col) {
  const age = t - q.t0, u = age / q.life;
  if (u < 0 || u >= 1) return;
  const head = q.rise * age, tail = Math.max(0, head - q.len), fade = smooth(0, 0.15, u) * (1 - smooth(0.4, 1, u));
  for (let h = tail; h <= head; h += 0.5) {
    const s = (h - tail) / Math.max(1, head - tail), x = q.x + q.amp * Math.sin(h * q.k + q.ph) * (0.2 + s) + q.drift * age;
    p.blend(x, q.y - h, col, fade * Math.sin(Math.PI * s) * 0.42);
  }
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const SCORCH = mix(C[0], hex("#140f0c"), 0.6), BURNT = mix(C[1], hex("#2a1a10"), 0.6), STEAM = mix(C[7], hex("#e8ece6"), 0.75);
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]] });
  const drops = new Drops(floor), lights = new Lights(), stains = [], wisps = [], pops = [];
  const spikes = Array.from({ length: 13 }, (_, i) => ({ a: (i / 13) * TAU + R.range(-0.18, 0.18), h: R.range(4, 10), r: R.range(0.85, 1.12), shed: false }));
  const rag = Array.from({ length: 80 }, (_, i) => rand(i, o.seed, 5) - 0.5);
  let t = 0, hit = false;
  // the pit it etches: wider as it spreads, deeper as it eats; the acid's level sinks into it as it boils away
  const pw = () => W * ease.outCubic(clamp((t - HIT) / SPREAD)) * 1.02;
  const pitD = () => PIT * ease.outCubic(clamp((t - HIT) / 1.1));
  const depth = (x) => {
    const w = pw(), d = Math.abs(x) / Math.max(1, w);
    return d >= 1 ? -1 : pitD() * Math.sqrt(1 - d * d) + rag[(Math.round(x) + 200) % 80] * 0.9;
  };
  const level = () => (t < HIT ? 0 : -1.6 + (PIT + 1.6) * ease.inQuad(smooth(DRY, GONE, t)));
  const width = () => {
    const L = level(), w = pw();
    return L <= 0 ? w : w * Math.sqrt(Math.max(0, 1 - (L / Math.max(0.1, pitD())) ** 2));
  };
  const heat = () => smooth(HIT, HIT + 0.3, t) * (1 - smooth(GONE - 0.3, GONE + 0.25, t));
  const gobY = () => Y0 + V0 * t + 0.5 * 950 * t * t;
  const crownR = () => 4 + 11 * ease.outCubic(clamp((t - HIT) / 0.16));
  const crownH = () => 5 * Math.sin(Math.PI * clamp((t - HIT) / 0.26));
  const spikeK = () => {
    const u = clamp((t - HIT - 0.015) / 0.26);
    return Math.sin(Math.PI * Math.pow(u, 0.6));
  };
  const tipOf = (s) => {
    const r = crownR() * s.r, h = crownH(), sn = Math.sin(s.a), sh = s.h * spikeK();
    const bx = Math.cos(s.a) * r, by = sn * r * 0.3 - h * (0.75 + 0.25 * Math.abs(sn));
    return [bx, by, bx + Math.cos(s.a) * sh * 0.55, by - sh];
  };
  const steam = (x, y, big) => wisps.push({ x, y, t0: t, life: Math.min(R.range(0.5, 0.9) * (big ? 1.3 : 1), meta.duration - 0.05 - t), rise: R.range(22, 32), len: R.range(5, 10) * (big ? 1.4 : 1), amp: R.range(1, 2.5), k: R.range(0.35, 0.6), ph: R.range(0, TAU), drift: R.range(-4, 4) });
  // the crown: a thin cup wall rising round the impact, a bright rim, spikes off the rim with beads on their tips
  const crown = (p, back) => {
    if (t < HIT || t > HIT + 0.27) return;
    const r = crownR(), h = crownH(), ry = r * 0.3;
    for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
      const c = (x + 0.5) / r;
      if (Math.abs(c) > 1) continue;
      const e = Math.sqrt(1 - c * c), yb = (back ? -ry : ry) * e, hh = h * (0.75 + 0.25 * e);
      for (let y = Math.floor(yb - hh); y <= Math.round(yb); y++) {
        const rim = y === Math.floor(yb - hh);
        if (rim) p.px(x, y, back ? C[5] : c < 0.1 ? C[7] : C[6]);
        else p.blend(x, y, C[(c < -0.25 ? 5 : c > 0.45 ? 3 : 4) - (back ? 1 : 0)], back ? 0.55 : 0.7);
      }
    }
    for (const s of spikes) {
      if (Math.sin(s.a) < 0 !== back) continue;
      const [bx, by, tx, ty] = tipOf(s);
      p.line(bx, by, tx, ty, back ? C[4] : C[6]);
      p.line(bx + 1, by, (bx + tx) / 2 + 0.5, (by + ty) / 2, back ? C[3] : C[5]);
      if (!s.shed) p.px(tx, ty - 1, back ? C[5] : C[7]), p.px(tx + 1, ty - 1, C[5]);
    }
  };

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120), w = width();
      if (!hit && t >= HIT) {
        hit = true;
        lights.add(0, -4, 28, WHITE, 0.6, 0.08);
        lights.add(0, -10, 56, C[5], 0.5, 0.6);
        for (let i = 0; i < 26; i++) {
          const a = -Math.PI / 2 + R.range(-1.35, 1.35), sp = R.range(60, 250);
          drops.add(R.range(-3, 3), -2, Math.cos(a) * sp, Math.sin(a) * sp, R.chance(0.3) ? 2 : 1);
        }
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(120, 260);
          ps.spawn(P.SPARK, 0, -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.3));
        }
        for (let i = 0; i < 5; i++) steam(R.range(-10, 10), -R.range(2, 6), true);
      }
      // beads break off the crown's spikes as they peak
      if (hit)
        for (const s of spikes)
          if (!s.shed && t > HIT + 0.09) {
            s.shed = true;
            const [, , tx, ty] = tipOf(s);
            drops.add(tx, ty - 1, Math.cos(s.a) * R.range(30, 80), -R.range(50, 130), R.chance(0.4) ? 2 : 1);
          }
      drops.update(dt, (d) => {
        // a drop that lands eats a little spot into the floor and hisses
        if (Math.abs(d.x) > pw()) stains.push({ x: d.x, t0: t, w: d.s * 0.8 + R.range(0.3, 1.2) });
        if (t < GONE) steam(d.x, -1, false);
      });
      // the acid sizzles: tiny bright beads spit off it, pops flash on its surface, steam curls off it and the pit
      const lv = level(), w2 = width();
      if (t > HIT + 0.15 && t < GONE && w2 > 2) {
        if (R.chance(0.3 * f)) {
          const x = R.range(-0.85, 0.85) * w2, y = Math.min(lv, depth(x)) - 1;
          pops.push({ x, y, t0: t });
          for (let j = 0; j < R.int(1, 3); j++) drops.add(x, Math.min(y - 1, -1), R.range(-40, 40), -R.range(50, 110), 1);
        }
        if (R.chance(0.14 * f)) steam(R.range(-0.9, 0.9) * w2, Math.min(lv, 0) - 1, R.chance(0.25));
      }
      // the pit keeps smoking a while after the acid is gone
      if (t > GONE - 0.2 && t < meta.duration - 0.5 && R.chance(0.08 * f)) steam(R.range(-0.7, 0.7) * pw(), 0, false);
      for (let i = pops.length - 1; i >= 0; i--) if (t - pops[i].t0 > 0.1) pops.splice(i, 1);
      for (let i = wisps.length - 1; i >= 0; i--) if (t - wisps[i].t0 > wisps[i].life) wisps.splice(i, 1);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const fade = 1 - smooth(meta.duration - 0.6, meta.duration - 0.08, t), hk = heat(), w = pw(), lv = level();
      // spatter spots etched round it
      for (const s of stains) {
        const age = t - s.t0, k = 1 - smooth(1, 1.8, age), c = age < 0.15 ? C[7] : age < 0.5 ? C[6] : age < 0.9 ? C[4] : BURNT;
        for (let x = Math.floor(s.x - s.w); x <= Math.ceil(s.x + s.w); x++) p.dot(x, 0, Math.abs(x - s.x) < s.w * 0.5 ? SCORCH : c, k * fade);
        if (age < 0.5) p.glow(s.x, -1, 5, C[5], 0.3 * (1 - age / 0.5));
      }
      crown(p, true);
      if (t > HIT && w > 1) {
        // the pit: an etched bowl in the floor, its edge glowing where the acid is still eating, cooling to a burnt lip
        for (let x = Math.floor(-w) - 1; x <= Math.ceil(w) + 1; x++) {
          const dp = depth(x + 0.5);
          if (dp < 0) continue;
          const bottom = Math.max(0, Math.round(dp)), edge = Math.abs(x + 0.5) / w > 0.88;
          for (let y = 0; y <= bottom; y++) p.dot(x, y, y === bottom ? (hk > 0.5 ? C[6] : hk > 0.15 ? C[4] : BURNT) : SCORCH, fade);
          p.dot(x, bottom + 1, hk > 0.5 ? C[5] : hk > 0.15 ? C[3] : SCORCH, fade * 0.8);
          if (edge) p.dot(x, -1, hk > 0.4 ? C[7] : hk > 0.1 ? C[5] : BURNT, fade);
        }
        for (const sd of [-1, 1]) p.glow(sd * w, -1, 8, C[6], 0.45 * hk);
        // the acid in it: a bright skin shimmering on top, darker as it deepens, sinking as it boils off
        if (t < GONE)
          for (let x = Math.floor(-w); x <= Math.ceil(w); x++) {
            const dp = depth(x + 0.5);
            if (dp < 0) continue;
            const d = Math.abs(x + 0.5) / w, dome = lv < 0 ? Math.round(lv * Math.sqrt(Math.max(0, 1 - d * d))) : Math.round(lv), bottom = Math.round(dp);
            if (dome > bottom) continue;
            const n = noise(x * 0.25 - t * 2.4, 3) + noise(x * 0.1 + t * 1.4, 5) * 0.6;
            for (let y = dome; y <= bottom; y++) p.px(x, y, y === dome ? (n > 0.7 ? C[7] : C[6]) : y === dome + 1 ? (n > 0.2 ? C[5] : C[4]) : y >= bottom ? C[3] : C[4]);
          }
        p.glow(0, -6, w * 1.4 + 10, C[4], 0.3 * hk * (0.85 + 0.15 * Math.sin(t * 9)));
        p.glow(0, 1, w * 0.9, C[6], 0.2 * hk);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      // the gob: a teardrop stretched by its fall, lit on its upper left, a trail of droplets above it
      if (t < HIT) {
        const y = gobY(), v = V0 + 950 * t, st = 1 + v * 0.0022, rx = 2.6 / Math.sqrt(st), ry = 2.8 * st;
        p.shade(-rx - 1, y - ry - 4, rx + 1, y + ry + 1, (x, yy, out) => {
          const dx = x / rx, dy = (yy - y) / ry, tail = dy < 0 && Math.abs(x) < rx * (1 + dy * 0.9) + 0.4 && dy > -1.7;
          const d = dx * dx + dy * dy;
          if (d > 1.25 && !tail) return;
          out.c = d > 1 && !tail ? C[2] : dx < -0.2 && dy < -0.1 ? C[7] : dy > 0.45 ? C[4] : C[5];
        });
        p.px(-1, y - ry * 0.3, WHITE);
        for (let i = 1; i <= 3; i++) p.dot(0, y - ry - 2 - i * 4, C[5], 1 - i * 0.25);
        p.glow(0, y, 10, C[5], 0.45);
      }
      crown(p, false);
      // the hero frame: a white burst where it lands
      const e = t - HIT;
      if (e >= 0 && e < 0.07) {
        const k = 1 - e / 0.07;
        p.ellipse(0, -2, 6 + 6 * (1 - k), 2.5, k > 0.5 ? WHITE : C[7]);
        sparkle(p, 0, -4, 8 * k, C[7], C[6], 0.6);
      }
      // sizzle: tiny star flashes where beads spit off the surface
      for (const q of pops) {
        const k = (t - q.t0) / 0.1;
        p.px(q.x, q.y, WHITE);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) p.dot(q.x + dx * (1 + k * 2), q.y + dy * (1 + k * 2), C[7], 1 - k);
        p.glow(q.x, q.y, 4, C[6], 0.4 * (1 - k));
      }
      for (const q of wisps) wisp(p, q, t, STEAM);
      drops.draw(p, C);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
