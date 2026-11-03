// The beam's slam, strands, rings and the sparks thrown along the floor are adapted from Sprite Fusion's
// open-source holy-light (https://www.spritefusion.com/pixel-art-vfx/holy-light), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, band, sparkle, clamp, smooth, ease, rand, TAU, WHITE, mix, READY } from "../../core/index.mjs";
import { bodyOf, rimOf } from "./_lib.mjs";

export const meta = {
  name: "Respawn beam",
  desc: "A guide line drops, a pillar of light slams onto the spot, and a scan bar climbs from the feet writing the character back in row by row, white-hot lines cooling to its colors.",
  tags: ["spawn", "respawn", "beam", "teleport", "scanline", "light", "one-shot"],
  size: [128, 150],
  origin: [64, 136],
  duration: 2.5,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#061e1b", "#0c3e36", "#136a5a", "#1f9c80", "#45d1a8", "#a8f5d8", "#ffffff"],
    width: 15,
    seed: 12,
  },
};

const SET = { turn: 1, crouch: 4, fx: -9, fy: -14, bx: 10, by: -14, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  follow: 0,
  poses: [
    [0, SET],
    [1.4, SET],
    [1.72, { turn: 1.15, crouch: -1, fx: -13, fy: -36, bx: 14, by: -36, hy: -1, ffx: -3, fbx: 4 }],
    [2.1, READY],
    [2.5, READY],
  ],
};

const SLAM = 0.32, WRITE0 = SLAM + 0.08, WRITE = 0.95, DONE = WRITE0 + WRITE, LIFT = DONE + 0.12;
export const actorAlpha = (t) => (t < DONE + 0.04 ? 0 : 1);

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), floor = () => 0, BW = o.width;
  const body = bodyOf(o.actor, C), rim = rimOf(body), top = body.y, H = body.h, TOPY = -136;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[5], C[4], C[3]] }), lights = new Lights();
  // strands of brighter light running down the beam, each at its own offset and shimmer
  const strands = Array.from({ length: 6 }, (_, i) => ({ o: rand(i, 1) * 1.6 - 0.8, f: 1 + rand(i, 2) * 3, w: rand(i, 3) }));
  // the scan bar: where it is (local y), climbing from the feet to the crown
  const scanY = (t) => -ease.inOutSine(clamp((t - WRITE0) / WRITE)) * (H + 2);
  // when each row is written, and its glitch: some rows jump sideways for a frame or two as they land
  const rowT = (my) => WRITE0 + (WRITE * Math.acos(1 - 2 * clamp((H - my) / (H + 2)))) / Math.PI;
  let t = 0, slammed = false, finished = false;
  const DROP = 0.07;
  const width = (t) => (t < SLAM - DROP ? 0 : t < SLAM ? BW * 0.6 : t < LIFT ? BW * (1 + 0.4 * Math.exp(-(t - SLAM) * 10)) * (0.92 + 0.08 * Math.sin(t * 40)) : BW * (1 - ease.outCubic(clamp((t - LIFT) / 0.3))));
  // the beam lifts away bottom first once the character is written
  const bottom = (t) => (t < LIFT ? 0 : -150 * ease.inCubic(clamp((t - LIFT) / 0.4)));

  return {
    update(dt) {
      t += dt;
      // the guide: motes drawn in to the spot along the floor
      if (t < SLAM && R.chance(0.5)) {
        const s = R.sign(), D = R.range(18, 40), T = R.range(0.15, 0.25), v = (D * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, s * D, -R.range(0, 3), -s * v, 0, T, R.chance(0.5) ? C[5] : C[4]);
      }
      if (!slammed && t >= SLAM) {
        slammed = true;
        lights.add(0, -28, 64, C[4], 1, 0.5);
        lights.add(0, -52, 80, C[5], 1.1, 0.4);
        lights.add(0, -9, 24, WHITE, 0.9, 0.12);
        for (let i = 0; i < 40; i++) {
          const s = R.sign(), sp = R.range(60, 135);
          ps.spawn(P.SPARK, s * R.range(0, 6), -1, s * sp, -R.range(20, 140), R.range(0.25, 0.7));
        }
        for (let i = 0; i < 12; i++) ps.spawn(P.STAR, R.range(-BW, BW), -R.range(2, 40), R.range(-20, 20), -R.range(20, 70), R.range(0.5, 1), R.pick([WHITE, C[5]]), R.range(0.8, 1.8));
        for (let i = 0; i < 8; i++) {
          const s = R.sign();
          ps.spawn(P.DUST, s * R.range(4, 10), -1, s * R.range(30, 80), -R.range(3, 10), R.range(0.4, 0.7), C[2], R.range(1.5, 3));
        }
      }
      // the scan bar spits sparks sideways as it climbs
      if (t > WRITE0 && t < DONE && R.chance(0.45)) {
        const y = scanY(t), s = R.sign();
        ps.spawn(P.SPARK, s * R.range(6, 11), y, s * R.range(40, 140), R.range(-60, 10), R.range(0.15, 0.35));
      }
      // motes rise inside the beam while it stands
      if (t > SLAM && t < LIFT + 0.2 && R.chance(0.6)) ps.spawn(P.STAR, R.range(-1.3, 1.3) * BW, -R.range(0, 90), R.range(-6, 6), -R.range(30, 90), R.range(0.4, 0.9), R.pick([WHITE, C[5], C[5], C[4]]), R.chance(0.3) ? R.range(1, 1.8) : 0.6);
      if (!finished && t >= DONE) {
        finished = true;
        lights.add(0, top + H / 2, 40, C[5], 0.7, 0.3);
        for (let i = 0; i < 14; i++) {
          const c = R.pick(rim);
          ps.spawn(P.STAR, c.x, c.y, R.range(-25, 25), -R.range(10, 50), R.range(0.4, 0.9), R.pick([WHITE, C[5]]), R.range(0.8, 1.8));
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const w = width(t), b = bottom(t);
      // the guide line before the slam, a marker on the floor
      if (t < SLAM) {
        const k = smooth(0, SLAM * 0.7, t) * (1 - smooth(SLAM - DROP, SLAM, t) * 0.5);
        for (let y = TOPY; y < -1; y += 2) p.dot(0, y + ((t * 60) | 0) % 2, C[5], k * (0.35 + 0.65 * ((y - TOPY) / -TOPY)));
        band(p, 0, 0, 10 - 4 * k, 0.2, 1, k, C, (g) => Math.sin(g) < 0);
        p.glow(0, -2, 16, C[4], 0.4 * k);
      }
      if (w <= 0.2) return;
      // the beam: a see-through column, hard bright edges, shimmering strands; its light hugs the edges so
      // whatever it writes inside stays readable
      const yEnd = t < SLAM ? TOPY + (-1 - TOPY) * ease.inCubic(clamp((t - SLAM + DROP) / DROP)) : -1 + b;
      const writing = smooth(WRITE0 - 0.05, WRITE0 + 0.1, t) * (1 - smooth(DONE, LIFT, t)), fill = 0.2 - 0.1 * writing;
      for (let y = TOPY; y <= yEnd; y++) {
        for (let x = Math.floor(-w); x <= Math.ceil(w); x++) {
          const q = Math.abs((x + 0.5) / w);
          if (q > 1) continue;
          if (q > 0.86) {
            p.dot(x, y, q > 0.94 && rand(x, y, (t * 30) | 0) < 0.7 ? WHITE : C[5], 1);
            continue;
          }
          const core = 1 - smooth(SLAM + 0.06, WRITE0 + 0.08, t);
          if (q < 0.7 * core) {
            // the white-hot core, with strands of colour running down it
            let hot = q < 0.35 * core;
            for (const s of strands) if (Math.abs((x + 0.5) / w - s.o * 0.6 - 0.05 * Math.sin(t * s.f * 3 + y * 0.05)) < 0.04) hot = false;
            p.px(x, y, hot ? WHITE : q < 0.5 * core ? C[6] : C[5]);
            continue;
          }
          let a = fill * (1.2 - q), c = C[4];
          for (const s of strands) if (Math.abs((x + 0.5) / w - s.o - 0.06 * Math.sin(t * s.f + s.o * 7)) < 0.045 + 0.03 * s.w) (a = 0.55 - 0.25 * writing), (c = C[5]);
          p.blend(x, y, c, a);
        }
      }
      if (yEnd > TOPY + 24)
        for (const s of [-1, 1]) p.glowLine(s * w, TOPY + 24, s * w, yEnd, 6, C[4], 0.3);
      p.glow(0, -5, w * 1.5 + 6, C[5], 0.45);
    },
    draw(p) {
      const w = width(t);
      const sk = (t - SLAM) / 0.45;
      if (sk > 0 && sk < 1) {
        const rx = 14 + 18 * ease.outCubic(sk), ry = 3 + 1.5 * sk;
        p.ellipse(0, 0.5, rx, ry, (d) => (d < 0.4 ? WHITE : d < 0.7 ? C[6] : C[5]), (d) => (1 - sk) * 1.4 * (1 - d * d));
        p.glow(0, -2, rx * 1.3, C[5], 0.5 * (1 - sk));
      }
      // the floor: a hot spot and rings at the slam
      for (let i = 0; i < 2; i++) {
        const k = (t - SLAM - 0.08 * i) / 0.5;
        if (k > 0 && k < 1) band(p, 0, 0, 8 + (i ? 22 : 34) * ease.outCubic(k), 0.2, Math.max(1, 3 * (1 - k)), 1.15 - k, C, () => true, k < 0.15);
      }
      // the character, written in from the feet: each row lands white, then cools to its own colors
      if (t >= WRITE0 && t < DONE + 0.05) {
        const sy = scanY(t), fr = Math.floor(t * 30);
        for (const b of body.list) {
          const t0 = rowT(b.my), age = t - t0;
          if (age < 0) continue;
          const glitch = age < 0.12 && rand(b.my, fr, 9) < 0.3 ? (rand(b.my, fr, 4) < 0.5 ? -2 : 2) : 0;
          const c = age < 0.05 ? WHITE : age < 0.14 ? C[5] : age < 0.3 ? mix(b.c, C[5], 0.5 * (1 - (age - 0.14) / 0.16)) : b.c;
          p.px(b.x + glitch, b.y, b.edge && age < 0.3 ? C[6] : c);
        }
        // the scan bar itself: a bright line across the beam and a light riding it
        if (t < DONE) {
          p.line(-w - 2, sy, w + 2, sy, (u) => (Math.abs(u - 0.5) < 0.35 ? WHITE : C[5]));
          p.line(-w, sy + 1, w, sy + 1, C[4], 0.6);
          p.glowLine(-w, sy, w, sy, 6, C[5], 0.6);
        }
      }
      // done: a flash round the finished character
      const fk = (t - DONE) / 0.25;
      if (fk > 0 && fk < 1) {
        for (const c of rim) p.dot(c.x, c.y, fk < 0.4 ? WHITE : C[5], 1.2 - fk);
        sparkle(p, 6, top + 6, Math.round(6 * (1 - fk)), WHITE, C[5], 0.5);
      }
      // the beam's front edges over the character while it stands
      if (w > 0.2) {
        const yEnd = t < SLAM ? TOPY + (-1 - TOPY) * ease.inCubic(clamp((t - SLAM + DROP) / DROP)) : -1 + bottom(t);
        if (t >= SLAM && t - SLAM < 0.1) p.glow(0, -30, 56, WHITE, 0.6 * (1 - (t - SLAM) / 0.1));
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
