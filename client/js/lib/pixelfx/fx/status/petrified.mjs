// The creeping front, the branching cracks and the burst of the body into chunks, grit and dust are
// adapted from Sprite Fusion's open-source ice freeze and shatter (https://www.spritefusion.com/pixel-art-vfx/ice),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, rand, clamp, luma, smooth, tileFbm, TAU, WHITE, READY } from "../../core/index.mjs";
import { shape, colorAt } from "./_lib.mjs";

export const meta = {
  name: "Petrified",
  desc: "Turned to stone: grey creeps up from the feet behind a crackling edge that spits grit, the statue holds, cracks run through it, and it bursts into tumbling chunks and dust.",
  tags: ["status", "stone", "petrify", "petrified", "debuff", "death", "one-shot"],
  size: [120, 74],
  origin: [60, 64],
  duration: 3.8,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#16141c", "#2a2733", "#433f4d", "#5f5a6a", "#7d7889", "#a29dab", "#cdc8d2", "#f0edf3"], seed: 3 },
};

const REACH_ = { lean: 3, crouch: 2, fx: 14, fy: -29, bx: -4, by: -22, ffx: 8, fbx: -7, toeB: true };
export const act = {
  onBody: true,
  poses: [[-0.16, READY], [0.08, { turn: 0.9, lean: -1, crouch: 2, fx: -8, fy: -24, bx: 9, by: -24 }, "snap"], [0.5, REACH_], [0.95, REACH_], [3.8, REACH_]],
  hits: [{ t: 2.2, stop: 0.08, shake: 0.24, amp: 2 }],
};

const CREEP = 0.95, CRACK = 1.75, SHATTER = 2.2;

/** The stand-in character is gone once the stone covers it (the statue is drawn in its place). */
export const actorAlpha = (t) => (t < CREEP ? 1 : 0);

// how far up the stone has crept (0 at the feet, past 1 over the head), stuttering as it climbs
const level = (t) => (t >= CREEP ? 1.2 : 1.2 * smooth(0, CREEP, t) + 0.025 * Math.sin((t / CREEP) * TAU * 3));

export function create(o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a), H = S.h, R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  const front = (mx) => level(t) + 0.06 * tileFbm(mx * 0.4, 0.5, 0, 0, o.seed, 2);
  // each pixel's stone: its own shading walked down a grey ramp, grained, lit on the top left
  const stone = S.body.map(([x, y]) => {
    const tone = clamp((luma(colorAt(a, x, y)) - 0.06) / 0.78), mottle = tileFbm(x * 0.32, y * 0.32, 0, 0, o.seed + 5, 2);
    let i = 1 + Math.round(tone * 4.6 + mottle * 1.1);
    if (!S.on(x - 1, y) || !S.on(x, y - 1)) i += 1;
    else if (!S.on(x + 1, y) || !S.on(x, y + 1)) i -= 1;
    return { x, y, up: 1 - (y + 0.5) / H, c: C[clamp(i, 1, 6)] };
  });
  // cracks: random walks through the statue from a point on its chest
  const cracks = [], ox = Math.round(S.w * 0.55), oy = Math.round(H * 0.42);
  const walk = (x, y, ang, len) => {
    const pts = [[x, y]];
    for (let s = 0; s < len; s++) {
      ang += R.range(-0.55, 0.55);
      x += Math.cos(ang) * R.range(1.4, 2.4);
      y += Math.sin(ang) * R.range(1.4, 2.4);
      if (!S.on(Math.floor(x), Math.floor(y))) break;
      pts.push([x, y]);
      if (pts.length > 3 && cracks.length < 16 && R.chance(0.14)) walk(x, y, ang + R.sign() * R.range(0.6, 1.2), len / 2);
    }
    cracks.push(pts);
  };
  for (let i = 0; i < 7; i++) walk(ox, oy, (i / 7) * TAU + R.range(-0.3, 0.3), 14);
  let t = 0, broke = false, settled = false;

  return {
    update(dt) {
      t += dt;
      // the creeping edge spits grit and dust and the odd spark
      if (t < CREEP) {
        const rate = 60 * dt;
        for (let n = 0; n < rate; n++) {
          if (!R.chance(0.5)) continue;
          const [mx, my] = S.body[R.int(0, S.body.length - 1)];
          if (Math.abs(1 - (my + 0.5) / H - front(mx)) > 0.04) continue;
          const x = a.x + mx + 0.5, y = a.y + my, side = mx < S.w / 2 ? -1 : 1;
          ps.spawn(P.GRIT, x, y, side * R.range(15, 60), -R.range(30, 90), R.range(0.6, 1.1), R.pick([C[4], C[5], C[6]]), R.chance(0.3) ? 2 : 1);
          if (R.chance(0.3)) ps.spawn(P.DUST, x + side * 2, y, side * R.range(10, 30), -R.range(4, 14), R.range(0.4, 0.7), C[4], R.range(1.5, 2.6));
          if (R.chance(0.25)) ps.spawn(P.MOTE, x, y, side * R.range(40, 90), -R.range(20, 70), R.range(0.15, 0.3), C[7], 0.5);
        }
      }
      if (!settled && t >= CREEP) {
        settled = true;
        lights.add(0, a.y + H * 0.5, 34, C[6], 0.35, 0.3);
        for (let i = 0; i < 8; i++) ps.spawn(P.DUST, R.range(-8, 8), -R.range(0, 2), R.sign() * R.range(20, 50), -R.range(2, 10), R.range(0.6, 1), C[3], R.range(2, 3.5));
      }
      // while it holds a pebble or two drops off
      if (t > CREEP + 0.2 && t < SHATTER && R.chance(1.6 * dt)) {
        const [mx, my] = S.body[R.int(0, S.body.length - 1)];
        if (!S.on(mx, my + 1)) ps.spawn(P.GRIT, a.x + mx + 0.5, a.y + my + 1, R.range(-8, 8), 0, R.range(0.8, 1.2), C[3], 1);
      }
      // the cracks pop chips off as they run
      if (t >= CRACK && t < SHATTER && R.chance(12 * dt)) {
        const pts = R.pick(cracks), [x, y] = pts[Math.floor(R.next() * pts.length)];
        ps.spawn(P.GRIT, a.x + x, a.y + y, R.range(-40, 40), -R.range(30, 80), R.range(0.5, 0.9), R.pick([C[5], C[6]]), 1);
      }
      if (!broke && t >= SHATTER) {
        broke = true;
        lights.add(0, a.y + H * 0.45, 46, C[6], 0.7, 0.5);
        lights.add(0, a.y + H * 0.45, 30, WHITE, 0.7, 0.12);
        // the statue bursts: chunks tumble out, grit sprays, dust rolls along the floor
        const cx = a.x + ox, cy = a.y + oy;
        for (let i = 0; i < 18; i++) {
          const q = stone[R.int(0, stone.length - 1)], x = a.x + q.x + 0.5, y = a.y + q.y + 0.5, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = R.range(35, 110);
          bits.add({ kind: B.CHUNK, x, y, vx: (dx / d) * sp, vy: (dy / d) * sp * 0.6 - R.range(60, 160), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.1, 1.5), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1.3, 2.8), ramp: [C[0], C[2], C[3], C[5], C[6]] });
        }
        for (const q of stone) {
          if (rand(q.x, q.y, 9) > 0.22) continue;
          const x = a.x + q.x + 0.5, y = a.y + q.y + 0.5, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = R.range(40, 130);
          ps.spawn(P.GRIT, x, y, (dx / d) * sp, (dy / d) * sp * 0.6 - R.range(40, 140), R.range(0.9, 1.4), q.c, R.chance(0.35) ? 2 : 1);
        }
        // pale flakes of the skin of it, tumbling, and glints in the dust
        for (let i = 0; i < 16; i++) {
          const an = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(50, 120);
          bits.add({ kind: B.SHARD, x: cx + R.range(-5, 5), y: cy + R.range(-8, 8), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.9, 1.4), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.5, 3), c: R.pick([C[5], C[6], C[7]]) });
        }
        for (let i = 0; i < 6; i++) ps.spawn(P.STAR, cx + R.range(-12, 12), cy + R.range(-10, 14), R.range(-10, 10), -R.range(5, 20), R.range(0.4, 0.9), C[6], R.range(1, 2.2), R.range(0.05, 0.4));
        for (let i = 0; i < 12; i++) {
          const side = R.sign();
          ps.spawn(P.SMOKE, side * R.range(0, 8), -R.range(1, 6), side * R.range(20, 60), -R.range(4, 16), R.range(0.9, 1.4), C[4], R.range(2.4, 4), R.range(0, 0.08), 0);
        }
        for (let i = 0; i < 6; i++) ps.spawn(P.SMOKE, R.range(-6, 6), a.y + H * R.range(0.3, 0.8), R.range(-20, 20), -R.range(10, 30), R.range(1, 1.5), C[3], R.range(3, 4.5), R.range(0, 0.1), 0);
      }
      bits.update(dt);
      // chunks that hit hard kick up a little dust
      for (const b of bits.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          ps.spawn(P.DUST, b.x, -0.5, R.range(-20, 20), -R.range(2, 10), R.range(0.3, 0.6), C[3], R.range(1.2, 2.2));
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
    },
    draw(p) {
      if (t < SHATTER) {
        // the shudder before it breaks
        const sh = t >= CRACK ? Math.round(Math.sin(t * 90) * Math.min(1, (t - CRACK) / (SHATTER - CRACK)) * 1.2) : 0;
        const white = t > SHATTER - 0.035;
        for (const q of stone) {
          const f = front(q.x), d = f - q.up;
          if (d < 0) continue;
          const x = a.x + q.x + sh, y = a.y + q.y;
          // the crackling edge: bright, flickering
          if (d < 0.035 && t < CREEP) p.px(x, y, rand(q.x, q.y, Math.floor(t * 24)) < 0.5 ? C[7] : C[6]);
          else if (d < 0.07 && t < CREEP) p.px(x, y, C[5]);
          else p.px(x, y, white ? WHITE : q.c);
        }
        if (t < CREEP) for (let mx = 0; mx < S.w; mx += 2) {
          const my = Math.floor((1 - front(mx)) * H);
          if (S.on(mx, my)) p.glow(a.x + mx, a.y + my, 5, C[6], 0.18);
        }
        // the cracks running through it, fresh tips white
        if (t >= CRACK) {
          const k = clamp((t - CRACK) / 0.3);
          for (const pts of cracks)
            for (let i = 0, n = Math.floor(pts.length * k); i < n; i++) {
              const [x, y] = pts[i], px = Math.floor(a.x + x) + sh, py = Math.floor(a.y + y), fresh = i > n - 3;
              p.px(px, py, fresh ? WHITE : C[0]);
              if (!fresh) p.px(px, py - 1, C[6]);
            }
          p.glow(a.x + ox, a.y + oy, 12, C[6], 0.25 * k);
        }
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
