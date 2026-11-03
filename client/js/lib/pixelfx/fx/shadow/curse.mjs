// The tint that floods the character and the gas round it are adapted from Sprite Fusion's open-source poison
// aura (https://www.spritefusion.com/pixel-art-vfx/poison), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, P, B, Rng, fit, sparkle, smooth, ease, noise, TAU, WHITE, mix, luma, READY } from "../../core/index.mjs";
import { VOID, Puffs, PK, attract, ringFast, unlight } from "./_lib.mjs";

export const meta = {
  name: "Curse",
  desc: "Wisps gather over the head, a skull stamps down with a flash, its eyes burn as the curse floods the body violet, then it cracks and crumbles.",
  tags: ["shadow", "curse", "debuff", "skull", "status", "dark", "magic", "one-shot"],
  size: [112, 124],
  origin: [56, 108],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: VOID, bone: ["#170f26", "#4a3a6e", "#7f6ea6", "#b3a4d4", "#e2d8f6"], seed: 9 },
};

const COWER = { turn: 1, crouch: 6, lean: 2, hy: 1, fx: -6, fy: -38, bx: 7, by: -38, ffx: -4, fbx: 5 };
export const act = {
  onBody: true,
  poses: [
    [-0.2, READY],
    [0.3, { turn: 0.9, hy: -1, fx: -9, fy: -19, bx: 10, by: -19, ffx: -3, fbx: 4 }],
    [0.55, COWER, "snap"],
    [0.8, { ...COWER, crouch: 7 }],
    [1.2, { ...COWER, crouch: 6, lean: 3 }],
    [1.72, { ...COWER, crouch: 7, lean: 2 }],
    [2.1, { turn: 1, crouch: 4, lean: 3, hy: 2, fx: -8, fy: -15, bx: 9, by: -15, ffx: -4, fbx: 5 }],
    [2.9, { turn: 1, crouch: 3, lean: 1, fx: -8, fy: -16, bx: 9, by: -16, ffx: -3, fbx: 4 }],
    [3.4, READY],
  ],
  hits: [{ t: 0.55, stop: 0.09, shake: 0.2, amp: 2 }],
};

// where the skull hangs, and the beats: it stamps in, burns, cracks, breaks
const SY = -60, STAMP = 0.55, CRACK = 1.72, BREAK = 1.98;

// the skull, drawn by hand (light from the upper left): k outline, d m l h bone dark to bright, e sockets,
// n nose, t teeth, g the gaps between them
const SKULL = [
  "......kkkkk......",
  "....kkhhhhlkk....",
  "...khhhhhhlllk...",
  "..khhhhhllllllk..",
  ".khhhhlllllllmmk.",
  ".khhhllllllllmmk.",
  "khhllllllllllmmdk",
  "khlldddllldddmmdk",
  "khleeeeelleeeeedk",
  "kleeeeeelleeeeedk",
  "kleeeeeemleeeeedk",
  "kmleeeelmmleeedkk",
  ".kmmlllmnnmlmddk.",
  "..kmmlmnnnnmddk..",
  "..kdmlllmmlmddk..",
  "...kgtgtgtgtgk...",
  "...kdgtgtgtgdk...",
  "....kkkkkkkkk....",
];
const SW = 17, SH = 18, EYES = [[-3.5, 1.5], [3.5, 1.5]];
const inSkull = (u, v) => u >= 0 && v >= 0 && u < SW && v < SH && SKULL[v][u] !== ".";
// cracks: jagged paths from the crown down to the sockets and out to the temple, each pixel with its turn to split
const CRACKS = (() => {
  const out = new Map(), paths = [[[8, 1], [7, 3], [8, 5], [6, 6], [5, 7]], [[9, 1], [10, 3], [10, 4], [12, 6], [12, 7]], [[4, 3], [3, 5], [2, 6]], [[13, 4], [14, 6]]];
  for (const path of paths) {
    let n = 0;
    const len = path.length - 1;
    for (let k = 0; k < len; k++) {
      const [x0, y0] = path[k], [x1, y1] = path[k + 1], steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps), key = y * SW + x;
        if (!out.has(key)) out.set(key, (k + s / Math.max(1, steps)) / len);
        n++;
      }
    }
  }
  return out;
})();

// the skull at scale s (squashed by sq as it lands), shaken by (ox, oy); white for the stamp's first frames;
// crack 0..1 splits it from the crown, light leaking out of the splits
function skull(p, C, K, s, sq, ox, oy, white, crack) {
  const PAL = { k: K[0], d: K[1], m: K[2], l: K[3], h: K[4], e: C[0], n: C[0], t: K[3], g: K[0] };
  const cx = ox, cy = SY + oy, hw = (SW / 2) * s + 1, hh = (SH / 2) * s * sq + 1;
  p.shade(cx - hw, cy - hh, cx + hw, cy + hh, (x, y) => {
    const u = Math.floor((x - cx) / s + SW / 2), v = Math.floor((y - cy) / (s * sq) + SH / 2);
    if (!inSkull(u, v)) return;
    const ch = SKULL[v][u];
    if (white) return ch === "e" || ch === "n" ? C[5] : WHITE;
    const ck = CRACKS.get(v * SW + u);
    if (ck !== undefined && ck < crack) return crack > 0.55 && (u + v) % 2 ? C[6] : K[0];
    return PAL[ch];
  });
}

// a socket burning: tongues of violet flame from a white root, licking up out of the eye
function eyeFire(p, C, x, y, t, k, i) {
  if (k <= 0) return;
  // two thin tongues lick up out of the socket and past the brow, swaying, cooling to violet
  for (const j of [-0.6, 0.7]) {
    const h = (1.5 + 3 * (0.5 + 0.5 * noise(t * 8 + j * 3.1 + i * 7, 4))) * k, sw = noise(t * 4 + j * 2 + i * 3, 8) * 1.2;
    for (let d = 1; d <= h; d += 0.5) {
      const u = d / h;
      p.dot(x + j + sw * u * u, y - d, u < 0.3 ? C[7] : u < 0.6 ? C[6] : u < 0.85 ? C[5] : C[4], u < 0.75 ? 1 : (1 - u) * 4);
    }
  }
  // the pupil: a hard white point in the dark
  p.px(x, y, WHITE);
  p.px(x - 1, y, C[6]);
  p.glow(x, y, 8, C[5], 0.5 * k);
}

export function create(o) {
  const C = fit(o.palette, 8), K = fit(o.bone, 5), R = new Rng(o.seed), A = o.actor, floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[7], C[6], C[5]], haze: C[4] });
  const puffs = new Puffs({ rng: R, flame: [WHITE, C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[0]], soot: [mix(C[3], C[2], 0.5), mix(C[1], C[0], 0.3)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor });
  const dust = new Puffs({ rng: R, flame: [WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE], soot: [mix(K[2], K[1], 0.4), mix(K[1], K[0], 0.5)], cap: K[3], rim: [K[4], K[3], K[2]], floor });
  const bits = new Bits({ ground: floor }), lights = [];
  let t = 0, stamped = false, broke = false, acc = 0;
  const light = (x, y, r, c, k, life) => lights.push({ x, y, r, c, k, life, max: life });
  const head = A ? A.y : -38;

  return {
    update(dt) {
      t += dt;
      // wisps and motes gather over the head, spiralling in
      if (t < STAMP - 0.05) {
        const k = t / STAMP;
        for (acc += dt * (40 + 60 * k); acc > 1; acc--) {
          const a = R.range(0, TAU), D = R.range(22, 44);
          ps.spawn(P.MOTE, Math.cos(a) * D, SY + Math.sin(a) * D * 0.8, -Math.sin(a) * 60, Math.cos(a) * 60, 0.8, R.pick([WHITE, C[7], C[6], C[5]]), R.range(0.6, 1));
        }
        if (R.chance(dt * 14)) {
          const a = R.range(0, TAU), D = R.range(20, 34);
          puffs.spawn(PK.SOOT, Math.cos(a) * D, SY + Math.sin(a) * D * 0.7, -Math.sin(a) * 40, Math.cos(a) * 30, R.range(0.5, 0.7), R.range(3, 5.5));
        }
        attract(ps.list, 0, SY, 9e5 * (0.4 + k), 70, 0.6, 2.5, dt, (q) => (q.k === P.MOTE ? 1 : 0), 300);
        attract(puffs.list, 0, SY, 5e5 * (0.4 + k), 60, 0.7, 3.5, dt, () => 1, 120);
      }
      if (t >= STAMP && !stamped) {
        stamped = true;
        ps.list.length = 0;
        puffs.list.length = 0;
        light(0, SY, 64, C[5], 1, 0.35);
        light(0, SY, 30, WHITE, 1, 0.1);
        light(0, head + 12, 40, C[4], 0.6, 0.5);
        for (let i = 0; i < 22; i++) {
          const a = R.range(0, TAU), sp = R.range(80, 160);
          ps.spawn(P.SPARK, Math.cos(a) * 6, SY + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.2, 0.5));
        }
        for (let i = 0; i < 6; i++) {
          const a = R.range(0, TAU), sp = R.range(20, 45);
          puffs.spawn(PK.SOOT, Math.cos(a) * 8, SY + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 10, R.range(0.6, 0.9), R.range(2.5, 4.5));
        }
      }
      // it burns: embers and thin smoke off the eyes, a violet haze round it, the curse dripping onto the head
      if (stamped && !broke) {
        for (const [ex, ey] of EYES) {
          if (R.chance(dt * 9)) ps.spawn(P.EMBER, ex, SY + ey - 3, R.range(-10, 10), -R.range(20, 45), R.range(0.5, 0.9), C[6]);
          if (R.chance(dt * 7)) puffs.spawn(PK.SOOT, ex + R.range(-1, 1), SY + ey - 3, R.range(-5, 5), -R.range(14, 26), R.range(0.5, 0.8), R.range(1.4, 2.4));
        }
        if (R.chance(dt * 8)) ps.spawn(P.VAPOUR, R.range(-7, 7), SY + R.range(-6, 6), R.range(-12, 12), R.range(-12, 4), R.range(0.5, 0.8), R.chance(0.5) ? C[3] : C[4], R.range(5, 8));
        // the curse runs down from the skull into the head
        if (R.chance(dt * 12)) ps.spawn(P.MOTE, R.range(-4, 4), SY + 9, R.range(-6, 6), R.range(40, 70), R.range(0.25, 0.4), R.chance(0.5) ? C[6] : C[5], 0.8);
        if (R.chance(dt * 10)) puffs.spawn(PK.SOOT, R.range(-3.5, 3.5), SY + 9, R.range(-3, 3), R.range(14, 26), R.range(0.45, 0.7), R.range(1.2, 2.2));
        if (t > STAMP + 0.3 && R.chance(dt * 5)) ps.spawn(P.STAR, R.range(-1, 1) * (A ? A.w / 2 : 10), head + R.range(4, A ? A.h - 4 : 30), 0, -6, R.range(0.3, 0.5), C[6], R.range(1, 2));
      }
      if (t >= BREAK && !broke) {
        broke = true;
        // the skull breaks: chunks of bone tumble and bounce, grit rains, dust and the last of the fire rise
        for (let i = 0; i < 24; i++) {
          let x, y;
          do (x = R.range(-8.5, 8.5)), (y = R.range(-9, 9));
          while (!inSkull(Math.floor(x + SW / 2), Math.floor(y + SH / 2)));
          bits.add({ kind: B.CHUNK, x, y: SY + y, vx: x * R.range(2.5, 6) + R.range(-12, 12), vy: R.range(-70, 10), g: 0.85, drag: 0.4, bounce: 0.35, life: R.range(0.8, 1.2), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1, 2.4), ramp: [K[0], K[1], K[2], K[3], K[4]] });
        }
        for (let i = 0; i < 26; i++) ps.spawn(P.GRIT, R.range(-7, 7), SY + R.range(-8, 8), R.range(-32, 32), R.range(-60, 20), R.range(0.8, 1.3), R.pick([K[2], K[3], K[3], K[4]]), R.chance(0.3) ? 2 : 1);
        for (let i = 0; i < 7; i++) dust.spawn(PK.SOOT, R.range(-7, 7), SY + R.range(-8, 6), R.range(-25, 25), R.range(-20, 5), R.range(0.5, 0.8), R.range(2, 4), R.range(0, 0.1));
        for (const [ex, ey] of EYES) puffs.spawn(PK.FLAME, ex, SY + ey, Math.sign(ex) * 6, -30, 0.5, 2.6, 0, false);
        light(0, SY, 40, C[5], 0.5, 0.25);
      }
      for (let i = lights.length - 1; i >= 0; i--) if ((lights[i].life -= dt) <= 0) lights.splice(i, 1);
      // chunks that land kick up a little dust
      bits.update(dt);
      for (const b of bits.list)
        if (b.rest && !b.dusted) {
          b.dusted = true;
          dust.spawn(PK.SOOT, b.x, -1.5, R.range(-12, 12), -R.range(4, 10), R.range(0.35, 0.6), R.range(1.5, 2.5));
        }
      ps.update(dt);
      puffs.update(dt);
      dust.update(dt);
    },
    drawBack(p) {
      puffs.draw(p, PK.SOOT, { x: 0, y: SY, k: stamped && !broke ? 0.8 : 0.3, reach: 50 });
      dust.draw(p, PK.SOOT);
      ps.draw(p, "back");
    },
    draw(p) {
      // the curse floods down the body from the head, a bright front ahead of it, then ebbs
      const flood = smooth(STAMP + 0.04, STAMP + 0.42, t), ebb = 1 - smooth(BREAK + 0.15, BREAK + 0.75, t);
      if (A && flood > 0 && ebb > 0) {
        const k = ebb, pulse = 0.85 + 0.15 * Math.sin(t * 9);
        for (let my = 0; my < A.h; my++) {
          const u = my / A.h;
          if (u > flood + 0.06) break;
          const edge = flood < 1 && Math.abs(u - flood) < 0.05, band = flood >= 1 && Math.abs(u - (((t - STAMP) * 1.3) % 1.4) + 0.2) < 0.06;
          for (let mx = 0; mx < A.w; mx++) {
            const c0 = A.pixels[my * A.w + mx];
            if (!c0) continue;
            const l = luma(c0), cc = l > 0.72 ? C[6] : l > 0.5 ? C[5] : l > 0.33 ? C[4] : l > 0.18 ? C[3] : C[2];
            p.blend(A.x + mx, A.y + my, edge ? C[7] : band ? C[6] : cc, edge ? 0.85 : band ? 0.7 * k : 0.6 * k * pulse);
          }
        }
        // a crawling violet edge round the cursed body
        p.outline(A.mask, A.x, A.y, (mx, my) => (Math.sin(my * 0.7 - t * 14 + mx * 0.3) > 0.2 ? C[6] : C[4]), (mx, my) => (my / A.h <= flood ? k : 0));
        p.glow(0, A.y + A.h * 0.45, 30, C[4], 0.3 * k * pulse);
      }
      // the gathering: a dim swirl of light where the skull will be
      if (t < STAMP) {
        const q = t / STAMP;
        p.glow(0, SY, 14 + 16 * q, C[5], 0.2 + 0.5 * q);
        if (q > 0.15) ringFast(p, 0, SY, 4 + 30 * (1 - ease.inQuad(q)), 1, q > 0.7 ? C[5] : q > 0.4 ? C[4] : C[3]);
      }
      // the skull: it slams down from big and pale, squashes, bobs while it burns, shakes as it cracks
      if (t >= STAMP && t < BREAK) {
        const u = (t - STAMP) / 0.1, s = u < 1 ? 1.7 - 0.7 * ease.inQuad(u) : 1, land = t - STAMP - 0.1;
        const sq = land > 0 ? 1 - 0.16 * Math.exp(-land * 18) * Math.cos(land * 40) : 1;
        const shake = t > CRACK ? (t - CRACK) * 4 : 0, ox = Math.round(Math.sin(t * 61) * shake), oy = land > 0 ? Math.round(Math.sin(t * 3.4) * 1.2) : 0;
        skull(p, C, K, s, sq, ox, oy, t < STAMP + 0.067, smooth(CRACK, BREAK, t));
        const burn = smooth(STAMP + 0.1, STAMP + 0.25, t);
        if (u >= 1) EYES.forEach(([ex, ey], i) => eyeFire(p, C, ox + ex, SY + oy + ey, t, burn * (1 + 0.4 * smooth(CRACK, BREAK, t)), i));
        if (u < 1.2) sparkle(p, 0, SY, 14 * (1 - u / 1.2), C[7], C[5], 0.6);
        p.glow(0, SY, 26, C[4], 0.25);
      }
      // the stamp's shock ring
      const ru = (t - STAMP - 0.08) / 0.3;
      if (ru > 0 && ru < 1) ringFast(p, 0, SY + 2, 10 + 26 * ease.outCubic(ru), Math.max(1, 2.5 * (1 - ru)), (v) => (v > 0.5 ? WHITE : C[6]), 1.2 - ru);
      bits.draw(p);
      puffs.draw(p, PK.FLAME);
      ps.draw(p, "front");
      for (const l of lights) {
        const q = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), l.c, l.k * q * q);
      }
      // bone keeps its own colours under the glow (all but the stamp's white frame)
      if (t >= STAMP + 0.067 && t < BREAK)
        unlight(p, -10, SY - 10, 10, SY + 10, (x, y) => {
          const u = Math.floor(x + SW / 2), v = Math.floor(y - SY + SH / 2);
          return inSkull(u, v) && SKULL[v][u] !== "e";
        }, 0.2);
    },
  };
}
