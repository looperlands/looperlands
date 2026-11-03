// The blast (fire puffs that cool into smoke, sparks, embers, burning brands that land and keep burning, grit, scorch,
// rings) is adapted from Sprite Fusion's open-source explosion (https://www.spritefusion.com/pixel-art-vfx/explosion),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, Blazes, P, PF, B, Rng, fit, band, flare, clamp, smooth, ease, rand, TAU, WHITE, hex, mix, scale, rgb } from "../../core/index.mjs";
import { fireRamp, heatRamp, drawPs, cull, fadeEdges, scorch, pool, OUTLINE } from "./_lib.mjs";

export const meta = {
  name: "Barrel explosion",
  desc: "An explosive barrel shudders, its lid bulging and spitting flame, then blows: a fireball column, staves and the lid flying, burning fuel splashed over the floor.",
  tags: ["explosion", "barrel", "fire", "smoke", "debris", "ground", "one-shot"],
  size: [300, 240],
  origin: [150, 204],
  duration: 5.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    barrel: ["#1c0a0e", "#4a1218", "#7c1a1e", "#b02a26", "#d8483a", "#f08a70"],
    seed: 8,
  },
};

const BLOW = 0.8, BW = 8, BH = 22;

export function create(o) {
  const F = fit(o.palette, 8), FR = fireRamp(F), HR = heatRamp(FR), C = fit(o.barrel, 6), R = new Rng(o.seed), floor = () => 0;
  const [W, H] = meta.size, [OX, OY] = meta.origin, X0 = -OX + 3, X1 = W - OX - 3, Y0 = -OY + 3, Y1 = H - OY - 3;
  let blazes;
  const ps = new Particles({ rng: R, ground: floor, sparks: [F[6], F[5], F[3], F[2]], onLand: (x, y) => blazes.add(x, y - 0.25, R.range(1.2, 2.2), R.range(0.6, 1)) });
  blazes = new Blazes(ps);
  const lights = new Lights(), staves = new Bits({ ground: floor });
  const OIL = hex("#221a22"), SOOT = hex("#1f1a24");
  const lid = { x: 0, y: -BH, vx: 0, vy: 0, a: 0, va: 0, on: false, rest: false };
  // the fuel splashed over the floor: a puddle and the spots that keep burning in it
  const pools = [];
  let t = 0, blown = false;

  const blow = () => {
    blown = true;
    const y = -BH * 0.5;
    lights.add(0, y - 20, 90, mix(F[3], F[6], 0.45), 0.85, 0.9);
    lights.add(0, y, 44, WHITE, 0.7, 0.09);
    // the fireball: bursting out, then a column of fire driven up out of the drum
    for (let i = 0; i < 5; i++) ps.spawn(P.FIRE, R.range(-3, 3), y + R.range(-3, 3), R.range(-20, 20), R.range(-40, -10), R.range(0.18, 0.28), 0, R.range(9, 12));
    for (let i = 0; i < 30; i++) {
      const a = R.range(-Math.PI - 0.15, 0.15), d = R.range(0, 8), sp = R.range(50, 190);
      ps.spawn(P.FIRE, Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 40, R.range(0.55, 1.05), 0, R.range(5, 10), 0, R.chance(0.5) ? PF.SMOKES | PF.BIG : 0);
    }
    for (let i = 0; i < 12; i++) ps.spawn(P.FIRE, R.range(-6, 6), y - R.range(0, 10), R.range(-14, 14), -R.range(170, 300), R.range(0.7, 1.15), 0, R.range(6, 10), R.range(0, 0.12), R.chance(0.7) ? PF.SMOKES | PF.BIG : 0);
    // oily black smoke
    for (let i = 0; i < 12; i++) {
      const a = R.range(-Math.PI, 0), d = R.range(4, 16);
      ps.spawn(P.SMOKE, Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 30, -R.range(30, 90), R.range(1.6, 2.6), SOOT, R.range(8, 13), R.range(0.1, 0.4), PF.BIG);
    }
    for (let i = 0; i < 90; i++) {
      const a = R.range(0, TAU), sp = R.range(160, 400);
      ps.spawn(P.SPARK, 0, y, Math.cos(a) * sp, Math.sin(a) * sp - 70, R.range(0.2, 0.6));
    }
    for (let i = 0; i < 40; i++) {
      const a = R.range(0, TAU), sp = R.range(30, 140);
      ps.spawn(P.EMBER, Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 70, R.range(1.2, 2.6), F[3]);
    }
    // burning fuel flung out in arcs: it lands and keeps burning
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(120, 300);
      ps.spawn(P.BRAND, R.range(-4, 4), y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.8, 1.4));
    }
    // the staves: the drum's plates torn off and thrown out, tumbling
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1, a = -Math.PI / 2 + side * R.range(0.25, 1.15), sp = R.range(170, 330);
      staves.add({ kind: B.CHUNK, x: side * R.range(2, 6), y: -R.range(4, BH - 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.5, bounce: 0.35, life: R.range(3, 3.8), a: R.range(0, TAU), va: R.range(-16, 16), s: R.range(9, 13), heat: R.range(0.4, 0.9) });
    }
    // the lid, flung high and spinning
    Object.assign(lid, { on: true, x: 0, y: -BH, vx: R.range(-40, 40), vy: -R.range(430, 480), a: 0, va: R.sign() * R.range(10, 14) });
    // the fuel on the floor, and the floor's own dust and grit
    for (let i = 0; i < 7; i++) {
      const x = R.range(-34, 34);
      pools.push({ x, w: R.range(5, 10) });
      blazes.add(x, -0.25, R.range(2.2, 3), R.range(0.8, 1.3));
    }
    for (let i = 0; i < 12; i++) {
      const s = R.sign();
      ps.spawn(P.SMOKE, s * R.range(0, 10), -R.range(1, 4), s * R.range(80, 220), -R.range(2, 12), R.range(1.1, 1.8), hex("#7d7280"), R.range(6, 9), R.range(0, 0.05), PF.BIG);
    }
    for (let i = 0; i < 60; i++) {
      const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.7, sp = R.range(120, 330) * (1 - 0.4 * Math.abs(u));
      ps.spawn(P.GRIT, u * 6, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.1, 1.9), R.pick([hex("#5a4f6b"), hex("#3e3650"), hex("#776c88")]), R.chance(0.4) ? 2 : 1);
    }
  };

  return {
    update(dt) {
      t += dt;
      if (!blown) {
        // the drum strains: flame and smoke spitting from the seam under the lid, quicker as it goes
        const k = t / BLOW;
        if (R.chance((6 + 30 * k * k) * dt)) {
          const s = R.sign();
          ps.spawn(P.FIRE, s * R.range(4, 7), -BH + 1, s * R.range(20, 60), -R.range(20, 60), R.range(0.15, 0.3), 0, R.range(1.5, 3));
          ps.spawn(P.SPARK, s * 6, -BH + 1, s * R.range(40, 140), -R.range(20, 120), R.range(0.1, 0.25));
        }
        if (R.chance(10 * dt)) ps.spawn(P.SMOKE, R.range(-5, 5), -BH, R.range(-8, 8), -R.range(15, 35), R.range(0.8, 1.3), 0, R.range(2.5, 4));
        if (t >= BLOW) blow();
      }
      if (lid.on && !lid.rest) {
        lid.vy += 950 * dt;
        lid.vx -= lid.vx * 0.4 * dt;
        lid.x += lid.vx * dt;
        lid.y += lid.vy * dt;
        lid.a += lid.va * dt;
        if (lid.y >= -1 && lid.vy > 0) {
          // a clank: sparks and dust where it lands, then it bounces flat and settles
          for (let i = 0; i < 6; i++) ps.spawn(P.SPARK, lid.x, -1, R.range(-90, 90), -R.range(40, 140), R.range(0.1, 0.25));
          for (let i = 0; i < 5; i++) ps.spawn(P.DUST, lid.x + R.range(-4, 4), -0.5, R.sign() * R.range(15, 60), -R.range(4, 18), R.range(0.35, 0.7), hex("#7d7280"), R.range(1.8, 3));
          lid.y = -1;
          if (lid.vy > 160) (lid.vy *= -0.3), (lid.vx *= 0.5), (lid.va *= 0.5);
          else (lid.rest = true), (lid.a = Math.PI / 2);
        }
      }
      staves.update(dt);
      for (let i = staves.list.length - 1; i >= 0; i--) {
        const b = staves.list[i];
        if (b.x < X0 + 8 || b.x > X1 - 8) staves.list.splice(i, 1);
        else if (b.heat > 0) b.heat = Math.max(0, b.heat - dt * 0.35);
      }
      blazes.update(dt);
      ps.update(dt);
      cull(ps, X0, Y0, X1, Y1);
      fadeEdges(ps, X0, X1, 24, Y1);
      lights.update(dt);
    },
    drawBack(p) {
      if (blown) {
        const u = t - BLOW, out = 1 - smooth(meta.duration - BLOW - 1, meta.duration - BLOW - 0.2, u);
        scorch(p, HR, u, 30, 2.2, out, 3);
        // the spilled fuel: a dark slick on the floor, lit by its own fire, shrinking as it burns off
        const left = 1 - smooth(1.6, 3.4, u);
        if (left > 0)
          for (const q of pools)
            for (let x = Math.floor(-q.w * left); x <= Math.ceil(q.w * left); x++) {
              const e = Math.abs(x) / (q.w * left + 0.01);
              p.dot(q.x + x, 1, rand(Math.floor(q.x + x), Math.floor(t * 12)) < 0.25 ? F[4] : OIL, out * (e < 0.8 ? 1 : 0.6));
              if (e < 0.6) p.dot(q.x + x, 2, OIL, out * 0.8);
            }
        const k = u / 0.45;
        if (k < 1) band(p, 0, 0.5, 100 * ease.outCubic(k), 0.16, Math.max(1, 4.5 * (1 - k)), 1.15 - k, [hex("#4a3f69"), hex("#6e6390"), F[3], F[6]], (g) => Math.sin(g) < 0);
      }
      drawPs(p, ps, "back", FR);
      blazes.drawBack(p);
    },
    draw(p) {
      if (!blown) {
        // the barrel, shaking harder, its lid bulging
        const k = t / BLOW, jx = Math.sin(t * 70) * k * k * 1.4, jy = Math.abs(Math.sin(t * 53)) * k * k * 0.8;
        drawBarrel(p, C, jx, -jy, k);
        p.glow(0, -BH, 10 + 8 * k, F[4], 0.25 + 0.35 * k * k * (0.6 + 0.4 * Math.sin(t * 40)));
      } else {
        const u = t - BLOW, k = u / 0.45;
        if (k < 1) band(p, 0, 0.5, 100 * ease.outCubic(k), 0.16, Math.max(1, 4.5 * (1 - k)), 1.15 - k, [hex("#4a3f69"), hex("#6e6390"), F[3], F[6]], (g) => Math.sin(g) >= 0);
      }
      drawPs(p, ps, "front", FR);
      for (const b of staves.list) stave(p, b, C, FR);
      if (lid.on) drawLid(p, C, lid, Math.min(1, (meta.duration - t) / 0.4));
      if (blown) {
        const u = t - BLOW;
        if (u < 0.08) {
          const k2 = 1 - u / 0.08, r = 18 * (0.85 + 0.15 * k2), y = -BH * 0.5;
          p.circle(0, y, r + 1.4, F[2]);
          p.circle(0, y, r, k2 > 0.45 ? F[6] : F[5]);
          p.circle(0, y, r * 0.6, k2 > 0.45 ? WHITE : F[6]);
        }
        if (u < 0.22) flare(p, 0, -BH * 0.5, 54 * Math.pow(1 - u / 0.22, 1.4), 1 - u / 0.22, F);
        // the burning fuel lights the floor
        pool(p, 0, 1, 90, 14, F[3], 0.5 * Math.max(0, 1 - u / 0.7) + 0.22 * (1 - smooth(1.6, 3.4, u)));
      }
      lights.draw(p);
    },
  };
}

// a steel drum standing on the floor at x: red, two ribs, a lit left side, a dark right side, an outline, a pale
// band; the lid bulges with k
function drawBarrel(p, C, x, y, k) {
  const bulge = Math.round(k * k * 2);
  p.shade(x - BW - 1, y - BH - 3, x + BW + 1, y + 0.5, (px, py) => {
    const dx = (px - x) / BW, v = (y - py) / BH; // dx -1..1 across, v 0 at the floor .. 1 at the top
    if (Math.abs(dx) > 1.1 || v < 0 || v > 1.05) return;
    const edge = Math.abs(dx) > 0.92 || v > 0.97 || v < 0.04;
    if (edge) return OUTLINE;
    const rib = Math.abs(v - 0.33) < 0.035 || Math.abs(v - 0.67) < 0.035, ribLit = Math.abs(v - 0.31) < 0.03 || Math.abs(v - 0.65) < 0.03;
    const band = v > 0.44 && v < 0.56;
    const lit = -dx; // light from the left
    let i = lit > 0.55 ? 5 : lit > 0.15 ? 4 : lit > -0.35 ? 3 : lit > -0.75 ? 2 : 1;
    if (band) return lit > 0.3 ? hex("#e8d8b0") : lit > -0.4 ? hex("#b8a888") : hex("#6e6050");
    if (rib) i = Math.max(1, i - 2);
    else if (ribLit) i = Math.min(5, i + 1);
    return C[i];
  });
  // the lid: a dark ellipse with a lit rim, pushed up as the drum swells
  p.ellipse(x, y - BH - bulge * 0.5, BW - 0.5, 2.2 + bulge * 0.4, (d, a) => (d > 0.7 ? (Math.sin(a) < 0 ? C[4] : C[2]) : C[1]));
}

// a stave: a curved plate torn from the drum, its painted face and its dark inside showing as it turns; hot edges glow
function stave(p, b, C, FR) {
  const fade = Math.min(1, b.life / 0.5), ca = Math.cos(b.a), sa = Math.sin(b.a), L = b.s, face = Math.cos(b.a * 1.7) > 0;
  for (let d = -L / 2; d <= L / 2; d += 0.5) {
    const bow = (1 - (2 * d / L) ** 2) * 1.2, x = b.x + ca * d - sa * bow, y = b.y + sa * d + ca * bow;
    const hot = b.heat > 0.3 && Math.abs(d) > L / 2 - 1;
    p.dot(x + sa, y - ca, OUTLINE, fade);
    p.dot(x, y, hot ? FR[b.heat > 0.6 ? 3 : 5] : face ? C[4] : C[1], fade);
    p.dot(x - sa, y + ca, face ? C[2] : OUTLINE, fade);
  }
  if (b.heat > 0.3) p.glow(b.x, b.y, 6, FR[4], 0.25 * b.heat * fade);
}

// the lid: a disc turning as it flies (an ellipse whose width follows its spin), lying flat once it lands
function drawLid(p, C, lid, a) {
  const w = Math.max(0.8, Math.abs(Math.cos(lid.a)) * 7.5), h = Math.max(1.2, Math.abs(Math.sin(lid.a)) * 7.5);
  const rx = lid.rest ? 7.5 : w, ry = lid.rest ? 1.6 : h;
  p.ellipse(lid.x, lid.y - (lid.rest ? 0.5 : 0), rx + 0.8, ry + 0.8, OUTLINE, a);
  p.ellipse(lid.x, lid.y - (lid.rest ? 0.5 : 0), rx, ry, (d, an) => (d > 0.65 ? (Math.sin(an) < 0 ? C[4] : C[2]) : C[3]), a);
}
