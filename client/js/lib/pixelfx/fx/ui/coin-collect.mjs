// The coin's pop (a white disc, then a ring and stars) and the trails of flying coins adapt Sprite Fusion's
// open-source pickup (https://www.spritefusion.com/pixel-art-vfx/pickup), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, band, flare, sparkle, clamp, seg, ease, TAU, WHITE, hex } from "../../core/index.mjs";
import { spell, drawWord, panel } from "./_lib.mjs";

export const meta = {
  name: "Coin collect",
  desc: "A coin bursts into a fountain of spinning coins that hang, then zip one by one into a HUD counter that pops and ticks up, glints and folds away.",
  tags: ["ui", "coins", "pickup", "reward", "hud", "counter", "one-shot"],
  size: [176, 116],
  origin: [60, 102],
  duration: 2.45,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#2a1405", "#5c3008", "#9a5a0e", "#d48e18", "#f5b92c", "#ffde5e", "#fff4bc", "#ffffff"], count: 10, from: 12, seed: 4 },
};

const POP = 0.3, FLY0 = 0.58, GAP = 0.075, FLY = 0.28, FOLD = 2.0, CY = -16;
// the HUD: a plate at the top right with a coin icon and the count
const HX = 50, HY = -88, HW = 60, HH = 22, IX = HX + 12, IY = HY + 11;
const INK = { outline: hex("#0d0a14"), rim: hex("#4a4060"), top: hex("#2a2338"), body: hex("#1e1929"), low: hex("#141019") };

// a coin r px across, turned so its face is w wide (0..1): a dark edge, a rim lit on its upper left, a face lit
// from the top left with an embossed bar, white when it flashes
function coin(p, C, x, y, r, w, white = false) {
  const rx = Math.max(0.7, r * w), ry = r;
  p.shade(x - rx - 1, y - ry - 1, x + rx + 1, y + ry + 1, (px, py) => {
    const u = (px - x) / rx, v = (py - y) / ry, d = Math.hypot(u, v);
    if (d > 1) return;
    const e = (1 - d) * Math.min(rx * 1.6, ry);
    if (white) return e < 1 ? C[6] : WHITE;
    if (e < 1) return C[1];
    if (rx < 2) return v < -0.2 ? C[6] : v < 0.4 ? C[4] : C[3];
    if (e < 2) return u + v < -0.2 ? C[6] : C[3];
    if (Math.abs(px - x) < 0.55 && Math.abs(v) < 0.5) return C[3];
    if (px - x >= 0.55 && px - x < 1.55 && Math.abs(v) < 0.5) return C[7];
    const l = -(u * 0.6 + v * 0.8);
    return l > 0.4 ? C[7] : l > 0.05 ? C[6] : l > -0.35 ? C[5] : C[4];
  });
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), N = clamp(Math.round(o.count), 1, 12);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[7], C[6], C[5], C[3]] }), lights = new Lights();
  const end = meta.duration - 0.05;
  const coins = Array.from({ length: N }, (_, i) => {
    const s = (i / Math.max(1, N - 1)) * 2 - 1;
    return { x: 0, y: CY, vx: s * R.range(55, 90) + R.range(-12, 12), vy: -R.range(170, 285), ph: R.range(0, TAU), spin: R.range(9, 14) * R.sign(), state: 0, t0: FLY0 + i * GAP, fx: 0, fy: 0, trail: [], bob: R.range(0, TAU) };
  });
  let t = 0, popped = false, count = Math.round(o.from), bump = 0, flash = 0;

  return {
    update(dt) {
      t += dt;
      if (!popped && t >= POP) {
        popped = true;
        lights.add(0, CY, 46, WHITE, 0.8, 0.14);
        lights.add(0, CY, 48, C[5], 0.6, 0.5);
        for (let i = 0; i < 14; i++) {
          const an = (i / 14) * TAU + R.range(-0.2, 0.2), sp = R.range(80, 170);
          ps.spawn(P.SPARK, Math.cos(an) * 3, CY + Math.sin(an) * 3, Math.cos(an) * sp, Math.sin(an) * sp - 30, R.range(0.15, 0.35));
        }
        for (let i = 0; i < 4; i++) ps.spawn(P.DUST, R.range(-6, 6), -1, R.sign() * R.range(15, 40), -R.range(2, 8), R.range(0.3, 0.5), hex("#5a4f6e"), R.range(1.5, 2.5));
        // a ring of stars flung out of the burst
        for (let i = 0; i < 10; i++) {
          const an = (i / 10) * TAU + R.range(-0.2, 0.2), sp = R.range(70, 130), down = Math.sin(an) > 0 ? 0.25 : 1;
          ps.spawn(P.STAR, Math.cos(an) * 6, CY + Math.sin(an) * 6, Math.cos(an) * sp, Math.sin(an) * sp * down, R.range(0.35, 0.6), R.pick([C[7], C[6], C[5]]), i % 3 ? 0.6 : R.range(1.2, 2));
        }
      }
      for (const c of coins) {
        if (!popped || c.state === 3) continue;
        c.ph += c.spin * dt;
        if (c.state < 2) {
          // the fountain: thrown up, slowed by the air, then they hang and bob
          if (c.state === 0) {
            c.vy += 640 * dt;
            c.vx -= c.vx * 2.2 * dt;
            if (c.vy > 0) c.state = 1;
          } else (c.vy -= c.vy * 7 * dt), (c.vx -= c.vx * 4 * dt);
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          if (t >= c.t0) (c.state = 2), (c.fx = c.x), (c.fy = c.y + Math.sin(t * 6 + c.bob) * 1.5);
        }
        if (c.state === 2) {
          // the flight: an arc up and over into the HUD's coin, quickening as it goes
          const u = clamp((t - c.t0) / FLY), e = u * u, mx = c.fx + (IX - c.fx) * 0.35, my = Math.min(c.fy, IY) - 26;
          c.x = (1 - e) * (1 - e) * c.fx + 2 * (1 - e) * e * mx + e * e * IX;
          c.y = (1 - e) * (1 - e) * c.fy + 2 * (1 - e) * e * my + e * e * IY;
          c.trail.unshift([c.x, c.y]);
          if (c.trail.length > 7) c.trail.pop();
          // it sheds sparkles as it goes
          if (R.chance(0.25)) ps.spawn(P.STAR, c.x + R.range(-2, 2), c.y + R.range(-2, 2), R.range(-8, 8), R.range(-4, 10), R.range(0.2, 0.4), R.pick([C[7], C[6]]), 0.6);
          if (u >= 1) {
            c.state = 3;
            count++;
            bump = 1;
            flash = 1;
            lights.add(IX, IY, 26, C[5], 0.6, 0.25);
            for (let i = 0; i < 3; i++) {
              const an = R.range(0, TAU), sp = R.range(18, 40);
              ps.spawn(P.STAR, IX + Math.cos(an) * 5, IY + Math.sin(an) * 5, Math.cos(an) * sp, Math.sin(an) * sp, Math.min(R.range(0.25, 0.45), end - t), R.pick([C[7], C[6]]), i ? 0.6 : R.range(1.2, 1.8));
            }
          }
        }
      }
      bump = Math.max(0, bump - dt / 0.14);
      flash = Math.max(0, flash - dt / 0.07);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      // a ring on the floor where the coin bursts
      const k = (t - POP) / 0.45;
      if (k > 0 && k < 1) band(p, 0, 0, 4 + 34 * ease.outCubic(k), 0.22, Math.max(1, 3 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) < 0);
      ps.draw(p, "back");
    },

    draw(p) {
      const k = (t - POP) / 0.45;
      if (k > 0 && k < 1) band(p, 0, 0, 4 + 34 * ease.outCubic(k), 0.22, Math.max(1, 3 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) >= 0);
      // the big coin: bobbing and turning above its shadow, then it bursts in a white disc
      if (t < POP + 0.02) {
        const y = CY + Math.sin(t * 9) * 1.5, w = Math.abs(Math.cos(t * 7));
        p.ellipse(0, 0.5, 6 - 0.5 * Math.sin(t * 9), 1.3, hex("#0d0a14"), 0.6);
        // two motes circle it, passing behind and in front
        for (let i = 0; i < 2; i++) {
          const an = t * 7 + i * Math.PI, ox = Math.cos(an) * 11, oy = Math.sin(an) * 3;
          if (Math.sin(an) < 0) p.px(ox, y + oy, C[4]);
        }
        coin(p, C, 0, y, 7, Math.max(0.12, w), t > POP - 0.04);
        for (let i = 0; i < 2; i++) {
          const an = t * 7 + i * Math.PI, ox = Math.cos(an) * 11, oy = Math.sin(an) * 3;
          if (Math.sin(an) >= 0) p.px(ox, y + oy, C[7]), p.glow(ox, y + oy, 4, C[5], 0.4);
        }
        p.glow(0, y, 20, C[5], 0.45 + 0.4 * seg(t, POP - 0.15, POP));
        if (t > 0.06 && t < 0.2) sparkle(p, -3, y - 3, 3.5 * Math.sin(((t - 0.06) / 0.14) * Math.PI), C[7], C[6], 0.4);
      }
      const pk = (t - POP) / 0.1;
      if (pk > 0 && pk < 1) p.circle(0, CY, 13 * (1 - pk) + 1, pk < 0.5 ? WHITE : C[6]);
      const fk = (t - POP) / 0.2;
      if (fk > 0 && fk < 1) flare(p, 0, CY, 26 * Math.pow(1 - fk, 1.5), 1 - fk, C);
      const rk = (t - POP - 0.03) / 0.35;
      if (rk > 0 && rk < 1) p.ring(0, CY, 6 + 22 * ease.outCubic(rk), Math.max(1, 2 * (1 - rk)), rk < 0.3 ? WHITE : C[6], 1.2 - rk);
      // the coins and their trails
      for (const c of coins) {
        if (!popped || c.state === 3) continue;
        c.trail.forEach(([x, y], i) => i > 0 && p.line(c.trail[i - 1][0], c.trail[i - 1][1], x, y, i < 3 ? C[6] : C[4], 1.2 - i / 7));
        const hover = c.state === 1 ? Math.sin(t * 6 + c.bob) * 1.5 : 0, w = Math.abs(Math.cos(c.ph));
        coin(p, C, c.x, c.y + hover, 5, Math.max(0.15, w));
        p.glow(c.x, c.y + hover, 10, C[5], c.state === 2 ? 0.5 : 0.32);
        // light catches each hanging coin now and then
        const gl = (t * 1.7 + c.bob) % 1;
        if (c.state === 1 && gl < 0.12 && w > 0.5) sparkle(p, c.x - 1, c.y + hover - 2, 3 * Math.sin((gl / 0.12) * Math.PI), C[7], C[6], 0.4);
      }
      // the HUD: unfolds, counts up with a pop on every coin, glints, folds away
      const open = ease.outBack(seg(t, 0.06, 0.26), 2.2) * (1 - ease.inBack(seg(t, FOLD, FOLD + 0.2), 2));
      if (open > 0.04) {
        const h = HH * open, y0 = HY + (HH - h) / 2, sh = seg(t, 1.5, 1.76);
        panel(p, HX, y0, HW, h, INK, { r: Math.min(4, h / 2), shine: sh > 0 && sh < 1 ? HX - 6 + (HW + 16) * sh : null });
        if (open > 0.7) {
          coin(p, C, IX, IY, 5.5 * (1 + 0.3 * bump), 1, flash > 0.5);
          p.glow(IX, IY, 14, C[5], 0.25 + 0.4 * bump);
          if (bump > 0) p.ring(IX, IY, 7 + 8 * (1 - bump), 1, bump > 0.6 ? WHITE : C[6], bump * 1.3);
          const s = 2 * (1 + 0.22 * bump), str = "x" + count, word = spell(str), W = word.w * s, H = 7 * s, x0 = IX + 9, ty = IY - H / 2;
          const items = word.letters.filter((L) => L.g).map((L) => ({ g: L.g, x: x0 + L.x * s, y: ty, sx: s, sy: s, flash: flash > 0.5 ? 1 : 0 }));
          drawWord(p, items, { fill: [C[4], C[5], C[6], C[7]], edge: WHITE, under: C[3], outline: INK.outline, shadow: 0 });
          if (bump > 0) p.glow(x0 + W / 2, IY, 16, C[5], 0.3 * bump);
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
