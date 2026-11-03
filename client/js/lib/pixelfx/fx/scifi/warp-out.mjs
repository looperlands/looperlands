// The breakup (the outline flickering on, a white hero frame, the body bursting into bits of light) follows
// Sprite Fusion's open-source blink (https://www.spritefusion.com/pixel-art-vfx/movement), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, band, sparkle, clamp, smooth, lerp, ease, rand, mix, TAU, WHITE, READY } from "../../core/index.mjs";

export const meta = {
  name: "Warp out",
  desc: "The hero's outline flickers on, they flash white and break into light from the head down, streaming up a beam that lifts off the floor and pinches shut.",
  tags: ["scifi", "teleport", "warp", "beam", "despawn", "leave", "one-shot"],
  size: [128, 168],
  origin: [64, 128],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#0b1030", "#152a63", "#1d4f9e", "#2582d2", "#36b9ee", "#8ae8ff", "#d4fbff", "#ffffff"], seed: 4 },
};

const SET = { turn: 1, crouch: 3, fx: -9, fy: -15, bx: 10, by: -15, ffx: -3, fbx: 4 };
const RAISED = { ...SET, crouch: 0, fx: -11, fy: -29, bx: 12, by: -29 };
export const act = {
  onBody: true,
  follow: 0,
  poses: [
    [-0.3, READY],
    [0.1, SET],
    [0.42, RAISED, "snap"],
    [2.6, RAISED],
  ],
};

// the beats: it charges, flashes white, breaks up into the beam, the beam lifts away
const FLASH = 0.42, BREAK0 = 0.5, BREAK1 = 1.1, LIFT = 1.3, GONE = 1.62, TOP = -meta.origin[1];

export const actorAlpha = (t) => (t < FLASH ? 1 : 0);

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), A = o.actor;
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  // the body: every pixel, its own color, whether it's on the edge, when it lets go (head first)
  const bits = [], on = (x, y) => x >= 0 && y >= 0 && x < A.w && y < A.h && A.mask.data[y * A.w + x];
  const edge = [];
  for (let my = -1; my <= A.h; my++)
    for (let mx = -1; mx <= A.w; mx++) {
      if (on(mx, my)) {
        const x = A.x + mx, y = A.y + my, tr = BREAK0 + (my / A.h) * (BREAK1 - BREAK0 - 0.12) + R.range(0, 0.12);
        const rim = !on(mx - 1, my) || !on(mx + 1, my) || !on(mx, my - 1) || !on(mx, my + 1);
        bits.push({ x, y, x0: x, y0: y, vx: 0, vy: 0, tr, c: A.pixels[my * A.w + mx] || C[3], free: false, j: R.next(), rim });
      } else if (on(mx - 1, my) || on(mx + 1, my) || on(mx, my - 1) || on(mx, my + 1)) edge.push([A.x + mx, A.y + my]);
    }
  let t = 0, flashed = false, lifted = false;
  // the beam's half width and how far its foot has lifted off the floor
  const width = () => (t < BREAK0 ? 0 : t < LIFT ? 2 + 7 * ease.outCubic(clamp((t - BREAK0) / 0.35)) : lerp(9, 0.6, ease.inCubic(clamp((t - LIFT) / (GONE - LIFT)))));
  const foot = () => (t < LIFT ? 0 : lerp(0, TOP, ease.inQuad(clamp((t - LIFT) / (GONE - LIFT)))));

  return {
    update(dt) {
      t += dt;
      // charging: motes gather to the body, the floor target closes in
      if (t < FLASH - 0.05 && R.chance(0.7)) {
        const a = R.range(0, TAU), D = R.range(26, 48), T = R.range(0.16, 0.26), v = (D * 3) / (Math.exp(3 * T) - 1), cy = -19;
        ps.spawn(P.STREAK, Math.cos(a) * D, cy + Math.sin(a) * D * 0.8, -Math.cos(a) * v, -Math.sin(a) * v * 0.8, T, R.chance(0.5) ? C[6] : C[5]);
      }
      if (t >= FLASH && !flashed) {
        flashed = true;
        lights.add(0, -20, 80, C[4], 0.9, 0.5);
        lights.add(0, -20, 30, WHITE, 0.8, 0.12);
        for (let i = 0; i < 14; i++) ps.spawn(P.STAR, R.range(-14, 14), -R.range(2, 40), R.range(-20, 20), -R.range(10, 40), R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(0.8, 1.8));
      }
      // the body lets go bit by bit: a little burst outward, then hauled up the beam, drawn in to its middle
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        if (t < b.tr) continue;
        if (!b.free) {
          b.free = true;
          const ox = b.x + 0.5, oy = b.y + 19;
          b.vx = ox * R.range(1.5, 4) + R.range(-10, 10);
          b.vy = oy * R.range(0.5, 1.5) - R.range(10, 40);
        }
        b.vy -= 560 * dt;
        b.vx += (-(b.x + 0.5) * 14 - b.vx * 3) * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < TOP + 2) bits.splice(i, 1);
      }
      if (t >= LIFT && !lifted) {
        lifted = true;
        lights.add(0, -2, 40, C[4], 0.7, 0.3);
        for (let i = 0; i < 22; i++) {
          const a = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(80, 220);
          ps.spawn(P.SPARK, R.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.55));
        }
        for (let i = 0; i < 16; i++) ps.spawn(P.STAR, R.range(-10, 10), -R.range(4, 70), R.range(-6, 6), -R.range(10, 30), R.range(0.5, 0.95), R.chance(0.4) ? WHITE : C[6], R.range(0.6, 1.6), R.range(0, 0.3));
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the floor target: a ring closing in on the feet, then the beam's foot glowing
      const k = clamp(t / FLASH), fade = 1 - smooth(LIFT, LIFT + 0.6, t);
      if (fade > 0) band(p, 0, 0, lerp(30, 14, ease.outCubic(k)), 0.16, 1.5, (0.4 + 0.6 * k) * fade, [C[3], C[4], C[5], C[6]], (g) => Math.sin(g) < 0);
      // the beam: thin bright walls, a glassy inside, from its foot to the sky
      const w = width(), f = foot();
      if (w > 0.3 && t < GONE)
        for (let y = Math.floor(TOP); y < f + (t < LIFT ? 0 : 0); y++) {
          if (y >= f && t >= LIFT) break;
          for (let x = Math.floor(-w) - 1; x <= Math.ceil(w); x++) {
            const q = Math.abs(x + 0.5) / w;
            if (q > 1 + 1 / w) continue;
            if (w < 2.2) p.px(x, y, q < 0.7 ? WHITE : C[6]);
            else if (q > 1) p.dot(x, y, C[4], 0.5);
            else if (q > 1 - 1.2 / w) p.px(x, y, C[6]);
            else p.blend(x + 0.5, y + 0.5, C[5], 0.12 + 0.25 * q * q);
          }
          if ((y & 7) === 0) p.glow(0, y, Math.min(w * 2.5 + 6, y - TOP + 2), C[4], 0.28);
        }
      ps.draw(p, "back");
    },
    draw(p) {
      const k = clamp(t / FLASH), fade = 1 - smooth(LIFT, LIFT + 0.6, t);
      if (fade > 0) band(p, 0, 0, lerp(30, 14, ease.outCubic(k)), 0.16, 1.5, (0.4 + 0.6 * k) * fade, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) >= 0);
      // charging: the outline flickers on round the hero, denser as it builds
      if (t < FLASH) {
        const fr = Math.floor(t * 24);
        for (const [x, y] of edge) if (rand(x, y, fr) < 0.25 + 0.7 * k) p.px(x, y, k > 0.7 && rand(x, y, fr, 1) < 0.5 ? WHITE : C[5]);
        p.glow(0, -20, 26, C[4], 0.4 * k);
      }
      // the body, still held together: white in the flash, then cooling to the beam's color as it waits its turn
      for (const b of bits) {
        if (b.free || t < FLASH) continue;
        // white in the flash, then light with the body's own shading under it, a bright rim, a rolling scanline
        const a = t - FLASH, scan = ((b.y + Math.floor(t * 40)) % 4 + 4) % 4 === 0;
        const c = a < 0.07 ? WHITE : a < 0.16 ? C[6] : b.rim ? C[6] : mix(b.c, scan ? C[6] : C[5], scan ? 0.6 : 0.45);
        p.px(b.x, b.y, b.tr - t < 0.06 ? WHITE : c);
      }
      // the bits on their way up: streaks, longer the faster they go, cooling as they climb
      for (const b of bits) {
        if (!b.free) continue;
        const sp = Math.abs(b.vy), L = Math.min(8, sp * 0.02), u = clamp((b.y - TOP) / (b.y0 - TOP));
        const head = u > 0.75 ? WHITE : u > 0.4 ? C[6] : C[5];
        // one in three draws a streak, the rest a single spark, so the stream reads as light, not static
        if (L >= 1 && b.j < 0.33) p.line(b.x, b.y, b.x - b.vx * 0.01, b.y + L, (s) => (s < 0.25 ? head : s < 0.6 ? C[5] : C[3]));
        else if (b.j < 0.75 || u > 0.6) p.px(b.x, b.y, b.j > 0.9 ? WHITE : head);
      }
      if (t >= FLASH && t < FLASH + 0.12) sparkle(p, 0, -20, 10 * (1 - (t - FLASH) / 0.12), C[6], C[5], 0.6);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
