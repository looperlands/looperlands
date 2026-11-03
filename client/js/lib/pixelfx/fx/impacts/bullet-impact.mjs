// The open-sided star, the spark cone off the surface, the chips, dust and smoke are adapted from Sprite Fusion's
// open-source impact (https://www.spritefusion.com/pixel-art-vfx/impact), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, clamp, smooth, ease, rand, TAU, WHITE, mix } from "../../core/index.mjs";
import { stone, spikes, star, SOOT } from "./_lib.mjs";

export const meta = {
  name: "Bullet impact",
  desc: "A bullet hits a wall on the right: a hot half-star, sparks sprayed back in a cone, a puff of grit, chips that fall and bounce, a pock mark cooling to soot.",
  tags: ["impact", "bullet", "gun", "wall", "sparks", "debris", "directional", "one-shot"],
  size: [152, 100],
  origin: [116, 84],
  duration: 1.4,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffe26b", "#fff3a6", "#ffffff"], stone: "#5b5079", height: 24, seed: 6 },
};

export function create(o) {
  const C = fit(o.palette, 7), st = stone(o.stone), R = new Rng(o.seed), X = 0, Y = -o.height, floor = () => 0, D = meta.duration;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[2]] });
  const lights = new Lights();
  // the wall's face looks left (N); the bullet came in level, a touch downward, and the spray bounces back off it
  const N = Math.PI, IN = 0.08, B = Math.PI - IN, open = (a) => Math.cos(a - N) > -0.25;
  const sp = spikes(R, 9, B, { len: [7, 10.5], w: [1.6, 2.1], fwd: 1.8, back: 0.4 });
  for (const s of sp) if (Math.cos(s.a - N) < -0.2) s.len *= 0.3;
  // the pock mark: a ragged hole with a rim that glows and cools
  const rim = [];
  for (let y = -2; y <= 2; y++)
    for (let x = 0; x <= 3; x++) {
      const d = Math.hypot((x - 1) / 1.6, y / 2.1) + rand(x, y, o.seed) * 0.35;
      if (d < 0.75) rim.push([x, y, 0]);
      else if (d < 1.25) rim.push([x, y, 1]);
    }
  const cracks = [0, 1, 2].map(() => {
    const a = R.range(-1.2, 1.2), L = R.range(2, 4.5);
    return [Math.cos(a) * 2.2 + 1, Math.sin(a) * 2.2, Math.cos(a) * (2.2 + L) + 1, Math.sin(a) * (2.2 + L)];
  });

  lights.add(X - 4, Y, 40, C[4], 0.6, 0.22);
  lights.add(X - 2, Y, 14, WHITE, 0.6, 0.06);
  // sparks bounce back off the wall in a cone
  for (let i = 0; i < 18; i++) {
    const a = B + R.range(-1, 1) * 0.8, v = R.range(170, 450);
    ps.spawn(P.SPARK, X - 1, Y, Math.cos(a) * v, Math.sin(a) * v - 30, R.range(0.12, 0.4), WHITE, 1, i > 13 ? R.range(0.01, 0.04) : 0);
  }
  // chips of the wall: flung out, falling, bouncing once and settling
  for (let i = 0; i < 8; i++) {
    const a = N + R.range(-0.8, 0.6), v = R.range(60, 190);
    ps.spawn(P.GRIT, X - 1, Y + R.range(-1, 1), Math.cos(a) * v, Math.sin(a) * v - R.range(20, 70), R.range(0.9, 1.3), R.pick([st.light, st.body, st.body, st.lip]), i < 3 ? 2 : 1);
  }
  // a puff of grit dust and a wisp of smoke drifting off
  for (let i = 0; i < 9; i++) {
    const a = N + R.range(-1.1, 1.1), v = R.range(15, 60);
    ps.spawn(P.DUST, X - 2, Y + R.range(-1.5, 1.5), Math.cos(a) * v, Math.sin(a) * v, R.range(0.3, 0.55), R.chance(0.5) ? st.dust : mix(st.dust, WHITE, 0.25), R.range(1.2, 2.3));
  }
  ps.spawn(P.SMOKE, X - 4, Y, R.range(-10, -4), R.range(-16, -8), R.range(0.8, 1.2), st.dust, R.range(1.8, 2.4), 0.05);

  let t = 0;
  return {
    update(dt) {
      t += dt;
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
    },
    draw(p) {
      // the pock mark: white-hot, cooling through the ramp to a dark rim, fading at the very end
      const heat = Math.pow(clamp(1 - t / 0.9), 1.3), fade = 1 - smooth(D - 0.45, D - 0.1, t);
      if (fade > 0) {
        for (const [x0, y0, x1, y1] of cracks) p.line(X + x0, Y + y0, X + x1, Y + y1, heat > 0.5 ? C[3] : st.shade, fade * (heat > 0.5 ? 1 : 0.85));
        for (const [x, y, k] of rim) {
          const h = heat * (k ? 0.85 : 1.15);
          p.dot(X + x, Y + y, k === 0 && h < 0.75 ? SOOT : h > 0.85 ? WHITE : h > 0.6 ? C[5] : h > 0.4 ? C[4] : h > 0.22 ? C[3] : h > 0.1 ? C[2] : st.shade, fade);
        }
        if (heat > 0) p.glow(X + 1, Y, 6 + 6 * heat, C[3], 0.5 * heat);
      }
      // a half ring opening away from the wall
      const u = (t - 0.03) / 0.18;
      if (u >= 0 && u < 1) {
        const r = 5 + 12 * ease.outCubic(u), c = u < 0.3 ? C[5] : u < 0.6 ? C[4] : C[3];
        for (let j = 0, n = Math.ceil(r * TAU * 1.3); j < n; j++) {
          const g = (j / n) * TAU;
          if (open(g)) p.dot(X + Math.cos(g) * r, Y + Math.sin(g) * r, c, 1.15 - u);
        }
      }
      ps.draw(p, "front");
      if (t < 0.03) star(p, X, Y, sp, 1, 1, [C[2], C[5], C[4], WHITE], 1, 2.2);
      else if (t < 0.06) star(p, X, Y, sp, 1.25, 0.55, [C[1], C[4], C[3], C[5]], 1, 2.2);
      const pop = Math.exp(-t / 0.045);
      if (pop > 0.02) {
        p.glow(X - 2, Y, 22, C[3], 0.6 * pop);
        p.glow(X - 1, Y, 8, WHITE, 0.5 * pop);
        p.glowLine(X + 1, Y - 16, X + 1, Y + 16, 4, C[4], 0.4 * pop); // light grazing the wall's face
      }
      lights.draw(p);
    },
  };
}
