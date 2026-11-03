// The glancing star, the tracer that streaks off, the skid on the surface and the spark spray are adapted from
// Sprite Fusion's open-source impact (https://www.spritefusion.com/pixel-art-vfx/impact), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, clamp, smooth, TAU, WHITE, mix } from "../../core/index.mjs";
import { stone, spikes, star, SOOT } from "./_lib.mjs";

export const meta = {
  name: "Ricochet",
  desc: "A tracer streaks down onto the floor, glances off with a white-hot star and skips away at an angle, leaving a glowing skid while sparks skitter along the ground.",
  tags: ["impact", "ricochet", "bullet", "tracer", "sparks", "ground", "directional", "one-shot"],
  size: [232, 84],
  origin: [64, 60],
  duration: 1.1,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffe26b", "#fff3a6", "#ffffff"], stone: "#5b5079", seed: 8 },
};

const HIT = 0.05, SPEED = 760, IN = 0.32, OUT = -0.21; // when it lands, how fast it flies, the angles in and out

// a tracer: a white head, a hot body cooling to a dim tail, from (hx, hy) back along angle a for L px
function tracer(p, hx, hy, a, L, C, k = 1) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 0; d <= L; d += 0.5) {
    const u = d / L;
    p.dot(hx - c * d, hy - s * d, u < 0.12 ? WHITE : u < 0.45 ? C[5] : u < 0.75 ? C[4] : C[2], u < 0.45 ? 1 : k * (1.25 - u));
  }
  p.glow(hx, hy, 9, C[4], 0.6 * k);
}

export function create(o) {
  const C = fit(o.palette, 7), st = stone(o.stone), R = new Rng(o.seed), floor = () => 0, D = meta.duration;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[2]] });
  const lights = new Lights();
  // the star leans hard along the way out, and barely digs into the floor
  const sp = spikes(R, 9, OUT, { len: [6, 9], w: [1.4, 1.9], fwd: 2.6, back: 0.6 });
  for (const s of sp) {
    if (Math.sin(s.a) > 0.2) s.len *= 0.3;
    if (Math.abs(Math.sin(s.a - OUT)) > 0.6) s.len *= 0.65;
  }
  let t = 0, hit = false;
  return {
    update(dt) {
      t += dt;
      if (!hit && t >= HIT) {
        hit = true;
        lights.add(0, -2, 44, C[4], 0.65, 0.25);
        lights.add(0, -1, 14, WHITE, 0.6, 0.06);
        // sparks skitter on along the floor, skipping, and a few spray higher
        for (let i = 0; i < 18; i++) {
          const low = i < 12, a = OUT + (low ? R.range(-0.22, 0.12) : R.range(-0.7, 0.25)), v = R.range(260, 520) * (low ? 1 : 0.7);
          ps.spawn(P.SPARK, R.range(-1, 2), -1, Math.cos(a) * v, Math.sin(a) * v, R.range(0.15, 0.42) * (low ? 1.3 : 1), WHITE, 1, low ? R.range(0, 0.05) : 0);
        }
        // grit kicked up and a scuff of dust
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + R.range(-0.2, 0.9), v = R.range(60, 170);
          ps.spawn(P.GRIT, R.range(0, 4), -1, Math.cos(a) * v, Math.sin(a) * v, R.range(0.6, 0.95), R.pick([st.light, st.body, st.lip]), i < 2 ? 2 : 1);
        }
        for (let i = 0; i < 4; i++) ps.spawn(P.DUST, R.range(0, 8), -1, R.range(20, 70), -R.range(4, 16), R.range(0.25, 0.45), mix(st.dust, WHITE, R.range(0.1, 0.3)), R.range(1.2, 2));
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the skid: a gouge along the floor that glows where the round dragged, cooling from its far end
      const u = t - HIT;
      if (u >= 0) {
        const heat = Math.pow(clamp(1 - u / 0.85), 1.2), fade = 1 - smooth(D - 0.4, D - 0.05, t), L = 12 * Math.min(1, u / 0.03);
        for (let x = -3; x <= L; x++) {
          const q = (x + 3) / 15, h = heat * (1.15 - q * 0.6);
          p.dot(x, 0, h > 0.8 ? WHITE : h > 0.55 ? C[5] : h > 0.35 ? C[4] : h > 0.18 ? C[3] : h > 0.08 ? C[2] : SOOT, fade);
          if (x > -2 && x < L - 2 && (x & 1) === 0) p.dot(x, 1, h > 0.4 ? C[3] : SOOT, fade * 0.7);
        }
        if (heat > 0) p.glowLine(-3, 0, L, 0, 5, C[3], 0.45 * heat);
      }
      ps.draw(p, "back");
    },
    draw(p) {
      ps.draw(p, "front");
      if (t < HIT) {
        // incoming: the tracer races down to the floor
        const d = (HIT - t) * SPEED;
        tracer(p, -Math.cos(IN) * d, -Math.sin(IN) * d, IN, 22, C);
      } else {
        const u = t - HIT;
        // glancing off: a stretched star, then the round skips away, its tail stretching out behind it
        if (u < 0.03) star(p, 0, -1, sp, 1, 1, [C[2], C[5], C[4], WHITE], 1, 2);
        else if (u < 0.06) star(p, 0, -1, sp, 1.25, 0.55, [C[1], C[4], C[3], C[5]], 1, 2);
        if (u < 0.2) {
          const head = 4 + u * SPEED, k = 1 - u / 0.2;
          tracer(p, Math.cos(OUT) * head, -1 + Math.sin(OUT) * head, OUT, Math.min(head - 2, 18 + u * 200), C, k);
        }
        // a thin half ring hugging the floor, swelling and cooling
        const g = (u - 0.02) / 0.2;
        if (g >= 0 && g < 1) {
          const r = 5 + 12 * (1 - Math.pow(1 - g, 3)), c = g < 0.3 ? C[5] : g < 0.6 ? C[4] : C[3];
          for (let j = 0, n = Math.ceil(r * Math.PI * 1.3); j <= n; j++) {
            const a = -Math.PI + (j / n) * Math.PI;
            p.dot(Math.cos(a) * r, -1 + Math.sin(a) * r, c, 1.15 - g);
          }
        }
        const pop = Math.exp(-u / 0.045);
        if (pop > 0.02) {
          p.glow(0, -2, 22, C[3], 0.75 * pop);
          p.glow(0, -1, 8, WHITE, 0.5 * pop);
        }
      }
      lights.draw(p);
    },
  };
}
