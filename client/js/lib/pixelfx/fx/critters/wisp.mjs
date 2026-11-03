// The flame tail, puffs and embers are adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, wrap, lerp, cycle, fly, P, TAU } from "../../core/index.mjs";
import { Swarm, shift, lnoise, tongue, firePuff, shadow } from "./_lib.mjs";

export const meta = {
  name: "Wisp",
  desc: "A will-o'-the-wisp loops a figure-eight over the floor: a little soul-flame with a face, its flame tail licking up and streaming behind, shedding puffs and sparks.",
  tags: ["critter", "wisp", "spirit", "flame", "magic", "flying", "loop"],
  size: [128, 104],
  origin: [64, 96],
  duration: 3.2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#0a1f2e", "#0f3d52", "#14707e", "#1fa8a8", "#4fe0c8", "#a8fff0", "#ffffff"], hover: 36, seed: 1 },
};

const D = meta.duration, SWARM = new Swarm();
function at(t, hover) {
  const a = (t / D) * TAU;
  return { x: 34 * Math.sin(a), y: -hover - 10 * Math.sin(2 * a), vx: ((34 * TAU) / D) * Math.cos(a), vy: ((-20 * TAU) / D) * Math.cos(2 * a) };
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), S = at(t, o.hover);
  const heat = [C[6], C[6], C[5], C[5], C[4], C[4], C[3], C[3], C[3]];
  const lean = clamp(-S.vx / 80, -0.9, 0.9), stretch = clamp(S.vy / 120, -0.3, 0.4), X = S.x, Y = S.y;
  // flame puffs shed along its path, cooling down the ramp as they drift up
  cycle(t, D, 30, o.seed * 7 + 1, (r) => r.range(0.3, 0.6), (age, L, r) => {
    const S0 = at(wrap(t - age, D), o.hover), [x, y] = fly(S0.x + r.range(-3, 3), S0.y - r.range(0, 4), r.range(-8, 8), -r.range(6, 16), age, -40, 2.5);
    firePuff(p, x, y, 1 - age / L, r.range(1.2, 2.6), r.next() * 100, heat);
  });
  // the tail: three tongues off the top of its head, streaming back as it flies
  const tails = [[-3.5, 13, 2.5, 3], [3.5, 14, 2.5, 7], [0, 20, 3.2, 11]];
  for (let li = 0; li < 4; li++)
    for (const [dx, h, w, n] of tails) {
      const hh = (h + 0.25 * h * lnoise(t, D, 9, n, 5)) * (1 + stretch);
      tongue(p, X + dx, Y - 2, hh, w, lnoise(t, D, 6, n, 40) * 1.5 + lean * hh * 0.9, t, D, n, heat, li);
    }
  // the head: a ball of cold fire, white at the heart, its rim flickering
  const R = 7.5;
  p.shade(X - R - 2, Y - R - 2, X + R + 2, Y + R + 2, (x, y, out) => {
    const dx = x - X, dy = y - Y, ang = Math.atan2(dy, dx), rr = R + 0.7 * lnoise(t, D, 16, ang * 1.6 + 10, 3) + (dy > 0 ? -0.6 : 0);
    const d = Math.hypot(dx, dy) / rr;
    if (d > 1) return 0;
    return d < 0.42 ? C[6] : d < 0.68 ? C[5] : d < 0.88 ? C[4] : C[3];
  });
  // its face: eyes looking where it's going, a blink, a little mouth
  const look = Math.round(clamp(S.vx / 60, -1, 1)), blink = wrap(t, D) > 2.2 && wrap(t, D) < 2.28;
  for (const s of [-1, 1]) {
    const ex = Math.round(X) + s * 2 - (s > 0 ? 0 : 1) + look, ey = Math.round(Y) - 1;
    if (blink) p.px(ex, ey + 1, C[1]), p.px(ex + 1, ey + 1, C[1]);
    else {
      for (let k = 0; k < 3; k++) p.px(ex, ey + k, C[1]), p.px(ex + 1, ey + k, C[1]);
      p.px(ex + (look > 0 ? 1 : 0), ey, C[6]);
    }
  }
  p.px(Math.round(X) + look, Math.round(Y) + 3, C[2]); p.px(Math.round(X) - 1 + look, Math.round(Y) + 3, C[2]);
  // sparks wander up off it
  const sw = SWARM.begin(t);
  sw.ps.sparks = [C[6], C[5], C[4], C[3]];
  cycle(t, D, 26, o.seed * 7 + 2, (r) => r.range(0.8, 1.6), (age, L, r) => {
    const S0 = at(wrap(t - age, D), o.hover), s = r.next() * 100, [x, y] = fly(S0.x + r.range(-5, 5), S0.y - r.range(4, 12), r.range(-20, 20), -r.range(20, 45), age, -15, 1.6);
    sw.add(P.EMBER, x + Math.sin(age * 2.3 + s) * 3 * Math.min(1, age), y, 0, 0, age, L, C[4], r.chance(0.3) ? 2 : 1, 0, s);
  });
  sw.draw(p);
  // light: a cold glow round it, a hot heart
  const fl = 0.85 + 0.15 * lnoise(t, D, 22, 0, 9);
  p.glow(X + lean * 3, Y - 6, 46 * fl, C[4], 0.38);
  p.glow(X, Y - 1, 13, C[5], 0.35 * fl);
}

export function drawBack(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), S = at(t, o.hover), near = clamp(1 - (-S.y - 24) / 30);
  // the floor lit cold beneath it, brighter as it dips
  shadow(p, S.x, 0, 7, 1.2, C[0], 0.4);
  for (let x = -24; x <= 24; x += 6) p.glow(S.x + x, -1, 16, C[4], (0.08 + 0.1 * near) * (1 - Math.abs(x) / 32));
}
