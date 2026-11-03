// The blast (fire puffs that cool into smoke, sparks, grit, scorch, rings, lights) is adapted from Sprite Fusion's
// open-source explosion (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, band, flare, clamp, smooth, ease, TAU, WHITE, hex, mix, scale, rgb } from "../../core/index.mjs";
import { fireRamp, heatRamp, drawPs, cull, fadeEdges, scorch, pool, OUTLINE } from "./_lib.mjs";

export const meta = {
  name: "Grenade",
  desc: "A grenade is lobbed in, bounces, rolls to a stop with its fuse fizzing, shudders, then blows: a white flash, shrapnel streaks, sparks, a small fireball and a scorch.",
  tags: ["explosion", "grenade", "shrapnel", "fire", "smoke", "ground", "one-shot"],
  size: [300, 200],
  origin: [160, 170],
  duration: 4.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    body: ["#141a10", "#2c3a1e", "#4a5c30", "#6e8446", "#9ab06a"],
    seed: 6,
  },
};

const BLOW = 1.62, RB = 6.2;

export function create(o) {
  const F = fit(o.palette, 8), FR = fireRamp(F), HR = heatRamp(FR), G = fit(o.body, 5), R = new Rng(o.seed), floor = () => 0;
  const [W, H] = meta.size, [OX, OY] = meta.origin, X0 = -OX + 3, X1 = W - OX - 3, Y0 = -OY + 3, Y1 = H - OY - 3;
  const ps = new Particles({ rng: R, ground: floor, sparks: [F[6], F[5], F[3], F[2]] }), lights = new Lights(), bits = new Bits({ ground: floor });
  const DUST = hex("#7d7280"), METAL = [hex("#3a3c46"), hex("#6a6e7c"), hex("#a8acb8")];
  // the grenade: lobbed from the left, it bounces, rolls and settles
  const g = { x: -140, y: -70, vx: 168, vy: -150, a: 0, va: -9, rest: false };
  let t = 0, blown = false, bx = 0;

  const blast = () => {
    blown = true;
    bx = g.x;
    const y = -5;
    lights.add(bx, y - 10, 70, mix(F[3], F[6], 0.45), 0.85, 0.5);
    lights.add(bx, y, 30, WHITE, 0.7, 0.07);
    // shrapnel: hot streaks flying straight and far, sparks that fall and bounce
    for (let i = 0; i < 38; i++) {
      const a = R.range(-Math.PI + 0.04, -0.04), sp = R.range(380, 640);
      ps.spawn(P.MOTE, bx, y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.26), R.pick([F[7], F[6], F[5]]), R.range(0.6, 0.9));
    }
    for (let i = 0; i < 60; i++) {
      const a = R.range(0, TAU), sp = R.range(140, 360);
      ps.spawn(P.SPARK, bx, y, Math.cos(a) * sp, Math.sin(a) * sp - 60, R.range(0.2, 0.55));
    }
    // a small fireball that cools into smoke
    for (let i = 0; i < 4; i++) ps.spawn(P.FIRE, bx + R.range(-2, 2), y + R.range(-2, 2), R.range(-15, 15), R.range(-30, -8), R.range(0.16, 0.26), 0, R.range(6, 8));
    for (let i = 0; i < 16; i++) {
      const a = R.range(-Math.PI - 0.2, 0.2), d = R.range(0, 6), sp = R.range(40, 150);
      ps.spawn(P.FIRE, bx + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 30, R.range(0.45, 0.9), 0, R.range(3.5, 7), 0, R.chance(0.5) ? PF.SMOKES : 0);
    }
    for (let i = 0; i < 9; i++) {
      const a = R.range(-Math.PI, 0), d = R.range(2, 10);
      ps.spawn(P.SMOKE, bx + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 25, -R.range(20, 60), R.range(1.4, 2.1), 0, R.range(6, 10), R.range(0.05, 0.3), PF.BIG);
    }
    for (let i = 0; i < 30; i++) {
      const a = R.range(0, TAU), sp = R.range(30, 120);
      ps.spawn(P.EMBER, bx, y, Math.cos(a) * sp, Math.sin(a) * sp - 50, R.range(0.8, 1.8), F[3]);
    }
    // the casing in pieces, and the floor's grit and dust
    for (let i = 0; i < 12; i++) {
      const a = R.range(-Math.PI + 0.2, -0.2), sp = R.range(150, 330);
      bits.add({ kind: B.SHARD, x: bx, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.5, bounce: 0.3, life: R.range(1.4, 2.1), a: R.range(0, TAU), va: R.range(-24, 24), s: R.range(2, 3.5), c: R.pick(METAL) });
    }
    for (let i = 0; i < 70; i++) {
      const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.8, sp = R.range(100, 300) * (1 - 0.4 * Math.abs(u));
      ps.spawn(P.GRIT, bx + u * 4, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.8), R.pick([hex("#5a4f6b"), hex("#3e3650"), hex("#776c88")]), R.chance(0.35) ? 2 : 1);
    }
    for (let i = 0; i < 10; i++) {
      const s = R.sign();
      ps.spawn(P.SMOKE, bx + s * R.range(0, 6), -R.range(1, 4), s * R.range(60, 180), -R.range(2, 10), R.range(1, 1.7), DUST, R.range(5, 8), R.range(0, 0.05), PF.BIG);
    }
  };

  return {
    update(dt) {
      t += dt;
      if (!blown) {
        // the lob, the bounces, the roll
        if (!g.rest) {
          g.vy += 900 * dt;
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          if (g.y >= -RB && g.vy > 0) {
            g.y = -RB;
            if (g.vy > 90) {
              // a clink, a puff of dust
              for (let i = 0; i < 4; i++) ps.spawn(P.DUST, g.x + R.range(-2, 2), -0.5, R.sign() * R.range(10, 40), -R.range(4, 16), R.range(0.3, 0.6), DUST, R.range(1.5, 2.6));
              for (let i = 0; i < 3; i++) ps.spawn(P.SPARK, g.x, -1, R.range(-60, 60), -R.range(40, 120), R.range(0.08, 0.16));
              g.vy = -g.vy * 0.36;
              g.vx *= 0.8;
            } else g.vy = 0;
          }
          if (g.y >= -RB - 0.01 && g.vy === 0) {
            g.vx -= g.vx * 2.4 * dt;
            g.va = -g.vx / RB;
            if (Math.abs(g.vx) < 3) (g.rest = true), (g.vx = 0);
          }
          g.a += g.va * dt;
        }
        // the fuse: sparks spitting off its tip, a thread of smoke, faster as it runs down
        const tip = fuse(g), hurry = smooth(BLOW - 0.5, BLOW, t);
        if (R.chance((24 + 50 * hurry) * dt)) ps.spawn(P.SPARK, tip[0], tip[1], R.range(-50, 50), -R.range(30, 110), R.range(0.08, 0.2));
        if (R.chance(9 * dt)) ps.spawn(P.VAPOUR, tip[0], tip[1] - 1, R.range(-4, 4), -R.range(10, 20), R.range(0.5, 0.9), hex("#8a8494"), R.range(1.2, 2));
        if (t >= BLOW) blast();
      }
      bits.update(dt);
      for (let i = bits.list.length - 1; i >= 0; i--) if (bits.list[i].x < X0 + 3 || bits.list[i].x > X1 - 3 || bits.list[i].y < Y0 + 3) bits.list.splice(i, 1);
      ps.update(dt);
      cull(ps, X0, Y0, X1, Y1);
      fadeEdges(ps, X0, X1, 24, Y1);
      lights.update(dt);
    },
    drawBack(p) {
      if (blown) {
        const u = t - BLOW;
        scorch(p, HR, u, 22, 1.6, 1 - smooth(meta.duration - BLOW - 0.8, meta.duration - BLOW - 0.15, u), 2);
        const k = u / 0.4;
        if (k < 1) band(p, bx, 0.5, 70 * ease.outCubic(k), 0.16, Math.max(1, 3.5 * (1 - k)), 1.15 - k, [hex("#4a3f69"), hex("#6e6390"), F[3], F[6]], (g2) => Math.sin(g2) < 0);
      }
      drawPs(p, ps, "back", FR);
    },
    draw(p) {
      if (!blown) {
        // the grenade, shuddering in its last half second, the fuse glowing
        const shake = smooth(BLOW - 0.45, BLOW, t), jx = shake * Math.sin(t * 90) * 0.8;
        drawGrenade(p, G, g.x + jx, g.y, g.a);
        const tip = fuse({ ...g, x: g.x + jx });
        p.px(tip[0], tip[1], Math.sin(t * 50) > 0 ? F[6] : F[5]);
        p.glow(tip[0], tip[1], 6 + 3 * shake, F[4], 0.5 + 0.3 * Math.sin(t * 37));
      } else {
        const u = t - BLOW, k = u / 0.4;
        if (k < 1) band(p, bx, 0.5, 70 * ease.outCubic(k), 0.16, Math.max(1, 3.5 * (1 - k)), 1.15 - k, [hex("#4a3f69"), hex("#6e6390"), F[3], F[6]], (g2) => Math.sin(g2) >= 0);
      }
      bits.draw(p);
      drawPs(p, ps, "front", FR);
      if (blown) {
        const u = t - BLOW;
        // the flash: a hot disc for two frames, a flare, a ring of light
        if (u < 0.07) {
          const k2 = 1 - u / 0.07, r = 11 * (0.8 + 0.2 * k2);
          p.circle(bx, -6, r + 1.2, F[2]);
          p.circle(bx, -6, r, k2 > 0.45 ? F[6] : F[5]);
          p.circle(bx, -6, r * 0.6, k2 > 0.45 ? WHITE : F[6]);
        }
        if (u < 0.2) flare(p, bx, -6, 40 * Math.pow(1 - u / 0.2, 1.4), 1 - u / 0.2, F);
        if (u < 0.3) {
          const k3 = u / 0.3, e = 1 - Math.pow(1 - k3, 3);
          const r = 8 + 40 * e;
          p.ring(bx, -6, r, Math.max(1, 2.5 * (1 - k3) + 0.4), F[5], (v, an) => (Math.sin(an) * r > 9 ? 0 : Math.min(1, (1 - k3) * 1.6)));
        }
        pool(p, bx, 1, 70, 12, F[3], 0.55 * Math.max(0, 1 - u / 0.6));
      }
      lights.draw(p);
    },
  };
}

// where the fuse's tip is: on top of the grenade, turning with it
function fuse(g) {
  const ca = Math.cos(g.a), sa = Math.sin(g.a);
  return [g.x + sa * 10.4, g.y - ca * 10.4];
}

// a pineapple grenade turned by a (about 11 x 15 px): an oval body with grooves, lit from the top left, an
// outline, a metal cap with a ring pin, a lever down its side
function drawGrenade(p, G, x, y, a) {
  const ca = Math.cos(a), sa = Math.sin(a), M = [hex("#2a2c36"), hex("#5e6270"), hex("#9a9eac"), hex("#d0d4de")];
  p.shade(x - 13, y - 13, x + 13, y + 13, (px, py) => {
    const dx = px - x, dy = py - y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca; // u across, v along (cap at v < 0)
    // the cap, its ring, and the lever pressed down the side
    if (v < -5 && v > -10.2 && Math.abs(u) < 2.4) return v < -9.4 || Math.abs(u) > 1.7 ? M[0] : u < -0.6 ? M[3] : M[2];
    if (Math.hypot(u + 3.4, v + 8) < 1.9 && Math.hypot(u + 3.4, v + 8) > 0.9) return M[2];
    if (u > 2.2 && u < 3.6 && v > -8.6 && v < 2) return u > 3 ? M[0] : M[1];
    const e = (u / 5.1) ** 2 + ((v - 0.6) / 6.4) ** 2;
    if (e > 1.2) return;
    if (e > 1) return OUTLINE;
    // grooves cut the body into knobbly segments; light from the top left in world space
    const lit = -(dx * 0.6 + dy * 0.8) / 6, gv = Math.abs(((v + 30) % 3.1) - 1.55) < 0.45, gu = Math.abs(((u + 30) % 3.4) - 1.7) < 0.45;
    const i = Math.max(0, Math.min(4, Math.round(2 + lit * 1.7 - (gv || gu ? 1 : 0) + (e < 0.3 && lit > 0.3 ? 1 : 0))));
    return G[i];
  });
}
