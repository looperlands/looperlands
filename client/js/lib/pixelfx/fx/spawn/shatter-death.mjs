// The faceted ice shell, the cracks, and the shards, mist and glints of the burst are adapted from Sprite
// Fusion's open-source ice (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, crystal, sparkle, clamp, smooth, ease, rand, TAU, WHITE, mix, READY } from "../../core/index.mjs";
import { bodyOf } from "./_lib.mjs";

export const meta = {
  name: "Shatter death",
  desc: "Frost races up the body and seals it in faceted ice, a glint sweeps it, cracks spread from the chest, then it bursts into its own facets that tumble, bounce and melt.",
  tags: ["spawn", "death", "ice", "freeze", "shatter", "shards", "one-shot"],
  size: [172, 96],
  origin: [84, 84],
  duration: 3.3,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#0e1636", "#1a2f66", "#2557a3", "#3488d6", "#5fc0f0", "#a2e6ff", "#dcf8ff", "#ffffff"],
    seed: 14,
  },
};

const FEAR = { turn: 0.9, lean: -2, crouch: 2, fx: -9, fy: -31, bx: 9, by: -31, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [[-0.2, READY], [0.08, FEAR, "snap"], [0.3, { ...FEAR, lean: -3, fy: -34 }], [0.5, FEAR], [3.3, FEAR]],
  hits: [{ t: 0.5, stop: 0.02, shake: 0.06, amp: 1 }, { t: 1.4, stop: 0.09, shake: 0.26, amp: 3 }],
};

const LOCK = 0.5, CRACK = 1.05, BURST = 1.4;
export const actorAlpha = (t) => (t < BURST ? 1 : 0);

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const body = bodyOf(o.actor, C), W = body.w + 2, H = body.h + 1, X0 = body.x - 1, Y0 = body.y - 1;
  // the ice: the body grown by a pixel (not below its feet), cut into facets round a few seeds
  const ice = new Int16Array(W * H).fill(-1), col = new Uint32Array(W * H), glass = new Uint32Array(W * H), solid = new Uint8Array(W * H);
  const inBody = (mx, my) => body.on(mx, my);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const mx = x - 1, my = y - 1;
      if (inBody(mx, my) || (my < body.h - 1 && (inBody(mx - 1, my) || inBody(mx + 1, my) || inBody(mx, my - 1) || inBody(mx, my + 1)))) ice[y * W + x] = 0;
    }
  const seeds = [];
  for (let i = 0; i < 22; i++) {
    let x, y, tries = 0;
    do (x = R.range(0, W)), (y = R.range(0, H));
    while (ice[Math.floor(y) * W + Math.floor(x)] < 0 && ++tries < 40);
    seeds.push([x, y]);
  }
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ice[y * W + x] >= 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (ice[i] < 0) continue;
      let d1 = 1e9, d2 = 1e9, k = 0;
      seeds.forEach(([sx, sy], j) => {
        const d = Math.hypot(x + 0.5 - sx, (y + 0.5 - sy) * 0.85);
        if (d < d1) (d2 = d1), (d1 = d), (k = j);
        else if (d < d2) d2 = d;
      });
      ice[i] = k;
      // each facet catches the light by where it faces: up and left bright, down and right deep
      const [sx, sy] = seeds[k], lit = clamp(0.55 + 0.35 * (rand(k, 41) - 0.5) - 0.5 * ((sx - W / 2) / W) - 0.55 * ((sy - H / 2) / H));
      const own = body.cell(x - 1, y - 1)?.c;
      // under the ice: the body's own colours, gone cold; over it: a see-through facet catching the light
      col[i] = own ? mix(own, C[4], 0.36) : C[3];
      glass[i] = C[3 + Math.min(2, Math.floor(lit * 3))];
      let sc = 0;
      if (d2 - d1 < 0.42 && !own) sc = lit > 0.5 ? C[6] : C[5]; // the seams between facets, out in the shell
      else if (d2 - d1 < 0.42) col[i] = mix(col[i], C[6], 0.45); // and faint where they cross the body
      if (!at(x - 1, y) || !at(x, y - 1)) sc = C[6]; // lit outer rim, top and left
      if (!at(x + 1, y) || (!at(x, y + 1) && y < H - 1)) sc = C[3]; // shaded rim, bottom and right
      if (sc) (col[i] = sc), (solid[i] = 1);
    }
  // rime spikes where the ice pushes out: on the shoulders, the head and the feet
  const spikes = [];
  for (let i = 0; i < 7; i++) {
    const x = R.int(1, W - 2), y0 = R.int(2, H - 3);
    let y = y0;
    while (y > 0 && at(x, y - 1)) y--;
    if (at(x, y)) spikes.push({ x: X0 + x + 0.5, base: Y0 + y + 1, h: R.range(3, 6), w: R.range(2.5, 3.5), lean: R.range(-2.5, 2.5), at: LOCK + R.range(-0.02, 0.08) });
  }
  for (const sd of [-1, 1])
    for (let i = 0; i < 2; i++) {
      const h = i ? R.range(5, 7) : R.range(8, 11);
      spikes.push({ x: sd * (i ? R.range(11, 13) : R.range(7, 9)), base: 0, h, w: i ? 3.5 : 4.5, lean: sd * h * R.range(0.25, 0.45), at: R.range(0.08, 0.2) });
    }
  // cracks from the chest
  const IX = Math.round(W * 0.48), IY = Math.round(H * 0.42), cracks = [];
  const walk = (x, y, a, len) => {
    const pts = [[x, y]];
    for (let s = 0; s < len; s++) {
      a += R.range(-0.5, 0.5);
      x += Math.cos(a) * R.range(1.4, 2.4);
      y += Math.sin(a) * R.range(1.4, 2.4);
      if (!at(Math.floor(x), Math.floor(y))) break;
      pts.push([x, y]);
      if (pts.length > 3 && cracks.length < 18 && R.chance(0.15)) walk(x, y, a + R.sign() * R.range(0.6, 1.1), len / 2);
    }
    cracks.push(pts);
  };
  for (let i = 0; i < 7; i++) walk(IX, IY, (i / 7) * TAU + R.range(-0.3, 0.3), 20);

  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor }), lights = new Lights(), pieces = [], rime = [];
  let t = 0, locked = false, cracked = false, burst = false;
  const level = (t) => H * (1 - ease.outCubic(clamp(t / LOCK))); // the frost line, mask row

  // the burst: every facet flies as one piece of ice, carrying its own pixels
  function shatter() {
    const cells = new Map();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = ice[y * W + x];
        if (k < 0) continue;
        if (!cells.has(k)) cells.set(k, []);
        const i = y * W + x;
        cells.get(k).push([x, y, solid[i] ? col[i] : mix(col[i], glass[i], 0.3)]);
      }
    for (const px of cells.values()) {
      let cx = 0, cy = 0;
      for (const [x, y] of px) (cx += x + 0.5), (cy += y + 0.5);
      (cx /= px.length), (cy /= px.length);
      const map = new Map(), r = Math.max(...px.map(([x, y]) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy))) + 1;
      for (const [x, y, c] of px) map.set(`${Math.round(x + 0.5 - cx)},${Math.round(y + 0.5 - cy)}`, c);
      const dx = cx - IX, dy = cy - IY, d = Math.hypot(dx, dy) || 1, sp = R.range(55, 115);
      const life = R.range(1.3, 1.85);
      pieces.push({ id: pieces.length + 1, x: X0 + cx, y: Y0 + cy, vx: (dx / d) * sp + R.range(-18, 18), vy: (dy / d) * sp * 0.6 - R.range(110, 220), a: 0, va: R.range(-9, 9), r, map, life, max: life, rest: false, n: px.length });
    }
    for (let i = 0; i < 64; i++) {
      const a = -Math.PI / 2 + R.range(-1.45, 1.45), sp = R.range(60, 180);
      bits.add({ kind: B.SHARD, x: X0 + IX + R.range(-6, 6), y: Y0 + IY + R.range(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.85, drag: 0.6, bounce: 0.3, life: R.range(0.9, 1.6), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3.2), c: R.pick([C[7], C[6], C[5]]) });
    }
    for (let i = 0; i < 14; i++) ps.spawn(P.VAPOUR, R.range(-10, 10), -R.range(1, 20), R.sign() * R.range(20, 80), -R.range(4, 20), R.range(0.6, 1.1), R.chance(0.5) ? C[6] : C[5], R.range(2.5, 4.5));
    for (let i = 0; i < 16; i++) ps.spawn(P.STAR, R.range(-16, 16), -R.range(4, 38), R.range(-40, 40), -R.range(10, 60), R.range(0.4, 1), R.pick([WHITE, C[6]]), R.range(1, 2.4));
    lights.add(0, Y0 + IY, 46, WHITE, 0.75, 0.14);
    lights.add(0, Y0 + IY, 70, C[4], 0.6, 0.5);
  }

  return {
    update(dt) {
      t += dt;
      // the cold climbs: rime sparkles at the frost line, vapour rolls off the feet
      if (t < LOCK) {
        const y = Y0 + level(t);
        if (R.chance(0.7)) ps.spawn(P.STAR, R.range(-10, 10), y, R.range(-12, 12), -R.range(0, 18), R.range(0.25, 0.5), R.chance(0.5) ? WHITE : C[6], R.range(0.8, 1.8));
        if (R.chance(0.25)) ps.spawn(P.VAPOUR, R.range(-8, 8), -1, R.sign() * R.range(15, 50), -R.range(2, 10), R.range(0.6, 1), C[6], R.range(2, 3.5));
      }
      if (!locked && t >= LOCK) {
        locked = true;
        lights.add(0, -20, 54, C[4], 0.6, 0.3);
        for (let i = 0; i < 6; i++) ps.spawn(P.STAR, R.range(-12, 12), -R.range(4, 36), 0, -4, R.range(0.35, 0.7), R.pick([WHITE, C[6]]), R.range(1.2, 2.4));
      }
      if (locked && t < CRACK && R.chance(0.08)) ps.spawn(P.STAR, R.range(-11, 11), -R.range(2, 36), 0, -3, R.range(0.3, 0.6), R.pick([WHITE, C[6]]), R.range(0.8, 2));
      if (!cracked && t >= CRACK) {
        cracked = true;
        for (let i = 0; i < 5; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 150);
          bits.add({ kind: B.SHARD, x: X0 + IX, y: Y0 + IY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.5, 0.9), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1, 2), c: C[6] });
        }
        lights.add(0, Y0 + IY, 24, WHITE, 0.7, 0.1);
      }
      if (!burst && t >= BURST) {
        burst = true;
        shatter();
      }
      // the pieces: tumble, bounce, skid to a stop, melt
      for (let i = pieces.length - 1; i >= 0; i--) {
        const q = pieces[i];
        if ((q.life -= dt) <= 0) {
          pieces.splice(i, 1);
          continue;
        }
        if (q.rest) {
          if (t < meta.duration - 0.9 && R.chance(0.02)) ps.spawn(P.VAPOUR, q.x, q.y - 1, R.range(-4, 4), -R.range(4, 10), R.range(0.5, 0.8), C[5], R.range(1.5, 2.5));
          continue;
        }
        q.vy += 900 * dt;
        q.vx -= q.vx * 0.5 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.a += q.va * dt;
        const g = -q.r * 0.55;
        if (q.y > g && q.vy > 0) {
          q.y = g;
          if (q.vy > 90) {
            rime.push({ x: q.x, w: 2 + q.r * 0.6, t0: t });
            q.vy *= -0.32;
            q.vx *= 0.65;
            q.va = q.va * 0.5 + R.range(-4, 4);
            if (q.n > 8) ps.spawn(P.STAR, q.x, q.y, 0, -6, 0.3, WHITE, 1.2);
            for (let j = 0; j < 2; j++) ps.spawn(P.DUST, q.x + R.range(-2, 2), -0.5, R.sign() * R.range(10, 30), -R.range(2, 8), R.range(0.3, 0.5), C[5], R.range(1.2, 2));
          } else if (Math.abs(q.vx) > 12) (q.vy = 0), (q.vx *= 0.9), (q.va *= 0.85);
          else (q.rest = true), (q.vx = q.vy = 0);
        }
      }
      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // frost on the floor under the feet, spreading as the ice locks, gone as the pieces melt
      const k = smooth(0.1, LOCK, t) * (1 - smooth(BURST + 0.6, BURST + 1.6, t)), reach = 6 + 12 * smooth(0, LOCK + 0.3, t);
      if (k > 0)
        for (let x = Math.floor(-reach); x <= Math.ceil(reach); x++) {
          const h = rand(x, 17), e = 1 - Math.abs(x) / (reach + 1);
          p.dot(x, 0, h < 0.3 ? WHITE : C[6], k * Math.min(1, e * 2));
          if (h < 0.5) p.dot(x, 1, C[5], k * e);
          if (h < 0.35 && e > 0.3) p.dot(x, -1, C[6], k * e);
        }
      if (k > 0) p.glow(0, -2, 26, C[4], 0.25 * k);
      // rime left where the pieces hit the floor
      for (const r of rime) {
        const a = clamp((t - r.t0) / 0.08) * (1 - smooth(meta.duration - 1, meta.duration - 0.15, t));
        for (let x = Math.floor(r.x - r.w); x <= r.x + r.w; x++) {
          const h = rand(x, 23);
          if (h < 0.7) p.dot(x, 0, h < 0.25 ? WHITE : C[6], a);
          if (h < 0.3) p.dot(x, 1, C[5], a * 0.7);
        }
      }
      ps.draw(p, "back");
    },
    draw(p) {
      if (!burst) {
        // the ice body: everything below the frost line, a white rime edge at the line itself
        const lv = level(t), shake = t > CRACK && t < BURST ? (Math.floor(t * 50) % 2 ? 1 : -1) * (t > BURST - 0.15 ? 1 : 0.5) : 0;
        const glint = t > LOCK ? ((t - LOCK) * 0.9) % 1.6 : -1;
        for (let y = 0; y < H; y++) {
          if (y < Math.floor(lv)) continue;
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (ice[i] < 0) continue;
            let c = y === Math.floor(lv) && t < LOCK ? (rand(x, 5) < 0.6 ? WHITE : C[6]) : t >= LOCK && t < LOCK + 0.05 ? WHITE : col[i];
            // a glint runs diagonally across the ice
            const g = Math.abs((x + (H - y) * 0.6) / (W + H * 0.6) - glint), on = glint >= 0 && glint <= 1;
            if (on && g < 0.035) c = WHITE;
            else if (on && g < 0.07 && c !== C[3]) c = C[6];
            p.px(X0 + x + shake, Y0 + y, c);
            if (!solid[i] && c === col[i]) p.blend(X0 + x + shake, Y0 + y, glass[i], 0.3);
          }
        }
        // the dark outline that holds the ice together against the floor and the dark
        for (let y = Math.max(0, Math.floor(lv) - 1); y <= H; y++)
          for (let x = -1; x <= W; x++) if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || (at(x, y + 1) && y + 1 >= lv) || at(x, y - 1)) && y < H) p.px(X0 + x + shake, Y0 + y, C[0]);
        for (const s of spikes) {
          const g = ease.outBack(clamp((t - s.at) / 0.12), 2.4);
          if (g > 0) crystal(p, s.x + shake, s.base, s.h * g, s.w, s.lean * g, C, { white: t < s.at + 0.04 });
        }
        if (cracked) {
          const k = clamp((t - CRACK) / 0.25);
          for (const pts of cracks)
            for (let i = 0, n = Math.floor(pts.length * k); i < n; i++) {
              const [x, y] = pts[i], fresh = i > n - 3 && t - CRACK < 0.3;
              p.px(X0 + x + shake, Y0 + y, fresh ? WHITE : C[7]);
              if (!fresh) p.px(X0 + x + shake, Y0 + y + 1, C[1]);
            }
        }
        // cold light from the ice, a flash as it locks
        p.glow(0, -18, 30, C[4], 0.18 * smooth(0, LOCK, t));
        if (t > LOCK && t < LOCK + 0.18) sparkle(p, -4, Y0 + 8, Math.round(8 * (1 - (t - LOCK) / 0.18)), WHITE, C[5], 0.6);
      } else if (t < BURST + 0.08) {
        // the burst frame
        const k = (t - BURST) / 0.08;
        p.circle(X0 + IX, Y0 + IY, 10 * (1 - k) + 3, WHITE);
      }
      // the pieces: each drawn back from its own little map, so they turn without holes
      for (const q of pieces) {
        const ca = Math.cos(q.a), sa = Math.sin(q.a), fade = Math.min(1, q.life / 0.5), r = Math.ceil(q.r);
        for (let py = -r; py <= r; py++)
          for (let px = -r; px <= r; px++) {
            const ux = Math.round(px * ca + py * sa), uy = Math.round(-px * sa + py * ca), c = q.map.get(`${ux},${uy}`);
            // a melting piece loses pixels at random rather than dithering away
            if (c && rand(ux, uy, q.id) < fade) p.px(Math.floor(q.x) + px, Math.floor(q.y) + py, q.max - q.life < 0.05 ? WHITE : c);
          }
        if (q.n > 6) p.glow(q.x, q.y, 6, C[5], 0.2 * fade);
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
