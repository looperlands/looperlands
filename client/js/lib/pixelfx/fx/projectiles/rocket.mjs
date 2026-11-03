// The spark and fire-ball recipes are adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { clamp, smooth, rand, mix, fit, TAU, WHITE, hex } from "../../core/index.mjs";
import { beat, wake, cloud, spark, pixelShape } from "./_lib.mjs";

export const meta = {
  name: "Rocket",
  desc: "A steel rocket roars along: a flickering jet with shock diamonds and a white-hot nozzle, a thick billowing smoke trail lit by the flame, sparks shed behind.",
  tags: ["projectile", "rocket", "missile", "smoke", "fire", "directional", "loop"],
  size: [288, 76],
  origin: [252, 42],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    metal: ["#0f0d16", "#25243a", "#3e4058", "#61667f", "#8e97b0", "#c4cce0", "#f2f6ff"],
    paint: ["#3a0d14", "#7c1a22", "#bd2f2c", "#ec5a45", "#ff9b7e"],
    smoke: ["#26222e", "#3d3846", "#5a5463", "#7e7887", "#a7a1ad", "#d0cad2", "#f1ecee"],
    speed: 120,
    seed: 5,
  },
};

const OUTLINE = hex("#100d17");
const NOZZLE = -14; // the bell's exit: the jet starts here
const J0 = 22; // the jet's mean length

// the rocket: a steel body lit from above with a specular line, a painted ogive nose and band, swept fins with
// lit leading edges, a dark bell with a glowing lip
const SHIP = pixelShape(-15, -9, 30, 19, (set) => {
  const body = { "-3": "4", "-2": "6", "-1": "5", 0: "4", 1: "3", 2: "2", 3: "1" };
  const seam = { "-3": "3", "-2": "4", "-1": "4", 0: "3", 1: "2", 2: "1", 3: "1" };
  const paint = { "-3": "d", "-2": "e", "-1": "e", 0: "d", 1: "c", 2: "b", 3: "a" };
  for (let y = -3; y <= 3; y++) for (let x = -11; x <= 5; x++) set(x, y, body[y]);
  for (let y = -3; y <= 3; y++) set(-3, y, seam[y]), set(-9, y, paint[y]), set(-8, y, paint[y]);
  const nose = { 6: 3, 7: 3, 8: 2, 9: 2, 10: 1, 11: 1, 12: 0, 13: 0 };
  for (const [xs, h] of Object.entries(nose)) for (let y = -h; y <= h; y++) set(+xs, y, paint[y]);
  set(7, -2, "w"), set(8, -2, "w"), set(9, -1, "e"), set(13, 0, "e");
  // fins, the top one in the light, the bottom one in shadow; each leading edge catches a highlight
  [[-13, -8], [-13, -9], [-13, -10], [-13, -11]].forEach(([a, b], i) => {
    for (let x = a; x <= b; x++) set(x, -4 - i, x === b ? "5" : i > 1 ? "4" : "3"), set(x, 4 + i, x === b ? "3" : i > 1 ? "1" : "2");
  });
  // the bell: a throat and a flared exit, its lip glowing
  for (let y = -2; y <= 2; y++) set(-12, y, y < 0 ? "3" : "2");
  for (let y = -3; y <= 3; y++) set(-13, y, y < -1 ? "2" : "1");
  set(-14, -3, "h"), set(-14, 3, "h");
  for (let y = -2; y <= 2; y++) set(-14, y, Math.abs(y) < 2 ? "x" : "h");
});

// the jet: a cone of flame out of the bell in clean bands (a red rim, orange, a gold core), white-hot at the
// nozzle, with a chain of shock diamonds down its middle; fr changes every frame so it flickers
function jet(p, F, x0, y0, J, wob, fr) {
  const dia = [0, 1, 2, 3].map((i) => 3.6 + i * 4.3 + (rand(fr, i, 41) - 0.5) * 0.7);
  p.shade(x0 - J - 2, y0 - 6, x0, y0 + 6, (x, y) => {
    const u = x0 - x;
    if (u < 0) return;
    const q = u / J;
    if (q > 1.05) return;
    const ady = Math.abs(y - y0), qq = Math.min(q, 1), w = (2.6 + 2.4 * Math.pow(qq, 0.7)) * (1 - qq * qq) * wob;
    const m = w - ady + (rand(Math.floor(x) * 7 + Math.floor(y) * 131, fr) - 0.5) * 0.9 * Math.min(1, 0.25 + q * 2);
    if (m < -0.5) return;
    if (m < 0.5) return F[q < 0.45 ? 3 : 2];
    for (let i = 0; i < dia.length; i++) {
      if (dia[i] > J * 0.72) break;
      const d = Math.abs(u - dia[i]) / (1.9 - i * 0.15) + ady / (1.7 - i * 0.25);
      if (d < 1) return d < 0.55 && i < 3 ? F[8] : F[7];
    }
    if (u < 1.6 && ady < 1.6) return F[8];
    const lvl = (1 - ady / Math.max(0.6, w)) * (1 - Math.pow(qq, 1.5));
    return lvl > 0.62 ? (u < 3 ? F[7] : F[5]) : lvl > 0.38 ? F[5] : lvl > 0.16 ? F[4] : F[3];
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9), M = fit(o.metal, 7), A = fit(o.paint, 5), SM = fit(o.smoke, 7), S = o.seed, D = meta.duration;
  const V = o.speed, fr = Math.floor(t * 30 + 1e-6);
  const bob = (tt) => Math.round(Math.sin((tt / D) * TAU) * 0.62), by = bob(t);
  const J = J0 * (0.84 + 0.32 * rand(fr, S, 1)), wob = 0.92 + 0.16 * rand(fr, S, 2), fl = J / J0;
  const left = -meta.origin[0] + 2, SP = [F[7], F[6], F[4], F[3]];

  // smoke: puffs leave the tail of the flame, stream back, swell and rise, lit by the fire while young
  const list = [];
  beat(t, D, 66, S + 1, (r) => r.range(1.1, 1.45), (age, life, r) => {
    const [x, y] = wake(NOZZLE - J0 * r.range(0.62, 0.8), bob(t - age) + r.range(-1, 1), -r.range(75, 105), r.range(-20, 20), age, V, 3, 0);
    const k = age / life, rise = 0.5 * r.range(6, 16) * age * age, sway = Math.sin(age * 2.3 + r.range(0, TAU)) * age * 2;
    const rad = r.range(2.2, 3) + ((r.chance(0.25) ? r.range(14, 19) : r.range(8, 13)) - 2.6) * (1 - Math.exp(-2.2 * age));
    if (x - rad < left + 1) return;
    const a = Math.min(1, age * 16) * Math.pow(1 - k, 1.25) * 0.68 * smooth(left, left + 40, x - rad);
    list.push({ x, y: y - rise + sway, r: rad, a, b: clamp(0.95 - k * 0.75 + r.range(-0.08, 0.08)), w: Math.exp(-age * r.range(3.5, 6)) });
  });
  cloud(p, list, SM, [mix(F[0], SM[0], 0.5), mix(F[1], SM[1], 0.45), mix(F[2], SM[2], 0.35), F[3], F[4], F[6], F[7]], { dens: 1.3, lit: 1.5 });
  // the smoke right behind the flame glows from inside
  p.glow(NOZZLE - J0 - 6, by, 26, F[4], 0.24 * fl);

  // embers carried off in the smoke, cooling and winking out
  beat(t, D, 9, S + 4, (r) => r.range(0.6, 1.1), (age, life, r) => {
    const k = 1 - age / life;
    const [x, y] = wake(NOZZLE - J0 * 0.6, bob(t - age), -r.range(40, 120), r.range(-40, 30), age, V, 2.5, -8);
    if (x < left + 2 || (k < 0.3 && rand(fr, r.int(0, 999)) < 0.5)) return;
    const c = k > 0.6 ? F[6] : k > 0.3 ? F[4] : F[2];
    p.px(x, y, c);
    p.glow(x, y, 3, c, 0.35 * k);
  });

  // tongues of flame torn off the tip of the jet, cooling and shrinking as they fall behind
  beat(t, D, 30, S + 3, (r) => r.range(0.08, 0.16), (age, life, r) => {
    const k = age / life, [x, y] = wake(NOZZLE - J0 * r.range(0.6, 0.9), bob(t - age) + r.range(-1.5, 1.5), -r.range(10, 50), r.range(-12, 12), age, V, 4, -30);
    const idx = 7 - Math.floor(Math.pow(k, 0.7) * 4), rad = r.range(1.2, 2.2) * (1 - k * 0.6);
    p.circle(x, y, rad, F[idx - 2]);
    p.circle(x + rad * 0.25, y - rad * 0.1, rad * 0.65, F[idx]);
    p.glow(x, y, rad * 2.4 + 2, F[idx], 0.2 * (1 - k));
  });

  // sparks shed behind, streaking back and dropping
  beat(t, D, 30, S + 2, (r) => r.range(0.18, 0.45), (age, life, r) => {
    const [x, y, vx, vy] = wake(NOZZLE - r.range(2, J0 * 0.7), bob(t - age) + r.range(-1.5, 1.5), -r.range(20, 190), r.range(-80, 50), age, V, 2.6, 160);
    if (x > left + 10) spark(p, x, y, vx, vy, 1 - age / life, SP);
  });
  beat(t, D, 8, S + 6, (r) => r.range(0.5, 0.8), (age, life, r) => {
    const [x, y, vx, vy] = wake(NOZZLE - r.range(4, J0 * 0.8), bob(t - age) + r.range(-1, 1), -r.range(10, 80), r.range(-60, 10), age, V, 1.8, 170);
    if (x > left + 10) spark(p, x, y, vx, vy, 1 - age / life, SP, 0.5);
  });

  jet(p, F, NOZZLE, by + 0.5, J, wob, fr + S * 31);
  p.sprite(SHIP.rows, { o: OUTLINE, 1: M[1], 2: M[2], 3: M[3], 4: M[4], 5: M[5], 6: M[6], a: A[0], b: A[1], c: A[2], d: A[3], e: A[4], w: WHITE, h: F[5], x: F[8] }, SHIP.x0, SHIP.y0 + by);

  // light: a warm pool round the tail that breathes with the jet, the flame's own glow, a white-hot nozzle
  p.glow(NOZZLE - 10, by, 60, F[4], 0.28 * fl);
  p.glowLine(NOZZLE - 3, by + 0.5, NOZZLE - J * 0.9, by + 0.5, 11, F[4], 0.2);
  p.glow(NOZZLE - 1, by + 0.5, 8, F[7], 0.45);
  p.glow(NOZZLE + 3, by + 5, 12, F[4], 0.22 * fl); // the flame lights the tail from below
}
