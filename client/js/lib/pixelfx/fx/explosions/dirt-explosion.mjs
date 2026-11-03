// The earth recipe (grit thrown in a fan, rocks that bounce and kick up dust, a dust column and dust rolling out along
// the floor) is adapted from Sprite Fusion's open-source explosion (https://www.spritefusion.com/pixel-art-vfx/explosion),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, band, smooth, ease, TAU, WHITE, hex, mix, rgb } from "../../core/index.mjs";
import { drawDirt, crater, rock, dome, pool, cull, fadeEdges } from "./_lib.mjs";

export const meta = {
  name: "Dirt explosion",
  desc: "A buried charge goes off: a flash under the floor, a V of dirt clods and grit thrown high, a brown dust plume that billows and settles, and a crater left behind.",
  tags: ["explosion", "dirt", "earth", "dust", "debris", "ground", "one-shot"],
  size: [260, 240],
  origin: [130, 206],
  duration: 3.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1c1610", "#33281c", "#4f3f2c", "#6e5a40", "#927a58", "#b89f78", "#dcc8a2"],
    fire: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    seed: 3,
  },
};

export function create(o) {
  const E = fit(o.palette, 7), F = fit(o.fire, 8), R = new Rng(o.seed), floor = () => 0;
  const [W, H] = meta.size, [OX, OY] = meta.origin, X0 = -OX + 3, X1 = W - OX - 3, Y0 = -OY + 3, Y1 = H - OY - 3;
  const clod = { light: E[5], body: E[3], shade: E[2] }, DUST = mix(E[4], rgb(150, 140, 150), 0.2), SOIL = mix(E[3], rgb(90, 80, 90), 0.2), DARK = mix(E[2], rgb(60, 52, 60), 0.3);
  const ps = new Particles({ rng: R, ground: floor, sparks: [F[6], F[5], F[3], F[2]] }), lights = new Lights();
  const clods = new Bits({ ground: floor });
  let t = 0;

  lights.add(0, -10, 56, F[4], 0.7, 0.22);
  lights.add(0, -4, 26, WHITE, 0.6, 0.06);
  // the charge: a few sparks out of the hole
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + R.range(-0.7, 0.7), sp = R.range(160, 320);
    ps.spawn(P.SPARK, 0, -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.35));
  }
  // the fountain: grit in a V, clods thrown high, a few pebbles
  for (let i = 0; i < 300; i++) {
    const side = R.sign(), a = -Math.PI / 2 + side * R.range(0.05, 0.62), sp = R.range(150, 470) * (1 - 0.3 * Math.abs(a + Math.PI / 2));
    ps.spawn(P.GRIT, R.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.2, 2.2), R.pick([E[1], E[2], E[2], E[3], E[3], E[4], E[5]]), R.chance(0.45) ? 2 : 1, R.range(0, 0.06));
  }
  for (let i = 0; i < 30; i++) {
    const side = R.sign(), a = -Math.PI / 2 + side * R.range(0.1, 0.6), sp = R.range(200, 430);
    clods.add({ kind: B.CHUNK, x: R.range(-5, 5), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.35, bounce: 0.25, life: R.range(2.2, 3), a: R.range(0, TAU), va: R.range(-12, 12), s: i < 12 ? R.range(2.6, 3.8) : R.range(1.4, 2.4) });
  }
  // the dust: a plume punched straight up, two lobes riding the V, and a skirt rolling out along the floor
  for (let i = 0; i < 22; i++)
    ps.spawn(P.SMOKE, R.range(-7, 7), -R.range(2, 12), R.range(-25, 25), -R.range(70, 180), R.range(1.8, 2.6), R.chance(0.6) ? SOIL : DUST, R.range(9, 14), R.range(0, 0.14), PF.BIG);
  for (let i = 0; i < 14; i++) {
    const side = R.sign(), a = -Math.PI / 2 + side * R.range(0.35, 0.6), sp = R.range(110, 210);
    ps.spawn(P.SMOKE, side * R.range(2, 8), -R.range(2, 8), Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.6, 2.4), R.chance(0.5) ? SOIL : DUST, R.range(8, 12), R.range(0.02, 0.1), PF.BIG);
  }
  for (let i = 0; i < 16; i++) {
    const s = R.sign();
    ps.spawn(P.SMOKE, s * R.range(4, 16), -R.range(1, 5), s * R.range(70, 200), -R.range(2, 12), R.range(1.4, 2.2), DUST, R.range(6, 9), R.range(0.02, 0.1), PF.BIG);
  }
  // dark soil thrown up with it, heavier and lower
  for (let i = 0; i < 8; i++) ps.spawn(P.SMOKE, R.range(-8, 8), -R.range(2, 8), R.range(-40, 40), -R.range(40, 110), R.range(1.2, 1.8), DARK, R.range(6, 9), R.range(0, 0.05));

  return {
    update(dt) {
      t += dt;
      for (const b of clods.list) b.pvy = b.vy;
      clods.update(dt);
      // clods thud down: a puff of dust and a spray of crumbs where they land, the big ones break up
      for (let i = clods.list.length - 1; i >= 0; i--) {
        const b = clods.list[i];
        if (b.x < X0 + 4 || b.x > X1 - 4) {
          clods.list.splice(i, 1);
          continue;
        }
        const landed = (b.pvy > 0 && b.vy <= 0) || (b.rest && !b.thud);
        if (!landed || b.pvy < 80) {
          if (b.rest) b.thud = true;
          continue;
        }
        b.thud = b.rest;
        for (let j = 0; j < 2 + Math.round(b.s); j++) ps.spawn(P.DUST, b.x + R.range(-2, 2), -0.5, R.sign() * R.range(15, 55), -R.range(4, 22), R.range(0.35, 0.7), DUST, R.range(1.6, 1.2 + b.s));
        for (let j = 0; j < Math.round(b.s * 3); j++) ps.spawn(P.GRIT, b.x, -1, R.range(-70, 70), -R.range(40, 140), R.range(0.8, 1.4), R.pick([E[2], E[3], E[4]]), 1);
        if (b.s > 2.2 && b.pvy > 200) b.s *= 0.6;
      }
      ps.update(dt);
      cull(ps, X0, Y0, X1, Y1);
      fadeEdges(ps, X0, X1, 24, Y1);
      lights.update(dt);
    },
    drawBack(p) {
      crater(p, E, 0, 28, ease.outCubic(Math.min(1, t / 0.12)), 1 - smooth(meta.duration - 0.7, meta.duration - 0.1, t));
      const k = t / 0.45;
      if (k < 1) band(p, 0, 0.5, 90 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.1 - k, [E[2], E[4], E[5], E[6]], (g) => Math.sin(g) < 0);
      drawDirt(p, ps, "back");
    },
    draw(p) {
      const k = t / 0.45;
      if (k < 1) band(p, 0, 0.5, 90 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.1 - k, [E[2], E[4], E[5], E[6]], (g) => Math.sin(g) >= 0);
      // the flash out of the ground: a squat dome of white-hot air for a frame or two
      if (t < 0.09) dome(p, F, 0, 15 * (1 - t * 3), 1 - t / 0.09);
      for (const b of clods.list) rock(p, b, clod, F);
      drawDirt(p, ps, "front");
      pool(p, 0, 1, 60, 10, F[3], 0.5 * Math.max(0, 1 - t / 0.3));
      lights.draw(p);
    },
  };
}
