import { Particles, Lights, P, Rng, fit, sparkle, clamp, seg, ease, rand, TAU, WHITE, scale } from "../../core/index.mjs";
import { spell, drawWord, shake } from "./_lib.mjs";

export const meta = {
  name: "Combo counter",
  desc: "x5 COMBO rockets in on streaming speed lines, smearing, and slams to a stop: a white flash, a ring, sparks; it pulses while a timer bar drains, then whooshes out.",
  tags: ["ui", "combo", "counter", "combat", "text", "one-shot"],
  size: [208, 100],
  origin: [104, 50],
  duration: 1.45,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1a0516", "#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"], count: 5, label: "COMBO", seed: 6 },
};

const HIT = 0.1, BEAT = 0.5, OUT = 1.1;

// a burst of speed lines across the frame, re-thrown every frame like a comic panel; k fades them
function speedLines(p, C, t, k, dir) {
  if (k <= 0.02) return;
  const f = Math.floor(t * 30);
  for (let i = 0; i < 18; i++) {
    if (rand(f, i, 3) > k) continue;
    const y = Math.round((rand(f, i, 1) - 0.5) * 60), L = 16 + rand(f, i, 2) * 50, x = (rand(f, i, 4) - 0.5) * 190;
    const x0 = Math.max(-100, x - L / 2), x1 = Math.min(100, x + L / 2);
    p.line(x0, y, x1, y, (u) => ((dir > 0 ? u : 1 - u) > 0.75 ? WHITE : (dir > 0 ? u : 1 - u) > 0.35 ? C[6] : C[4]), (u) => ((dir > 0 ? u : 1 - u) < 0.25 ? 0.6 : 1));
  }
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), SHADOW = scale(C[0], 0.5);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), lights = new Lights();
  const big = spell("x" + Math.round(o.count)), lab = spell(o.label);
  const BS = 4, LS = 2, W = big.w * BS + 4 + lab.w * LS, X0 = -W / 2, BASE = 12;
  const spikes = Array.from({ length: 10 }, (_, i) => [(i / 10) * TAU + R.range(-0.15, 0.15), R.range(14, 24)]);
  let t = 0, hit = false, out = false;
  // where the words sit: rocketing in from the left, overshooting, settling; whooshing out to the right
  const xAt = (t) => {
    t = Math.max(0, t);
    if (t < HIT) return -32 * Math.pow(1 - t / HIT, 2);
    if (t < OUT) return 7 * Math.exp(-(t - HIT) * 18) * Math.sin((t - HIT) * 34);
    const u = seg(t, OUT, OUT + 0.2);
    return u < 0.3 ? -4 * ease.outQuad(u / 0.3) : -4 + 24 * ease.inQuad((u - 0.3) / 0.7);
  };

  return {
    update(dt) {
      t += dt;
      if (!hit && t >= HIT) {
        hit = true;
        lights.add(0, 0, 70, C[5], 0.7, 0.4);
        lights.add(-20, 0, 34, WHITE, 0.8, 0.1);
        for (let i = 0; i < 26; i++) {
          const an = R.range(-1.2, 1.2) + (R.chance(0.3) ? Math.PI : 0), sp = R.range(120, 300);
          ps.spawn(P.SPARK, R.range(-20, 20), R.range(-8, 8), Math.cos(an) * sp, Math.sin(an) * sp * 0.6 - 20, R.range(0.12, 0.3));
        }
      }
      // sparkles pop off the count on its beat
      if (t > BEAT && t < OUT && R.chance(0.1)) {
        const x = X0 + R.range(0, big.w * BS), y = BASE - R.range(0, 30);
        ps.spawn(P.STAR, x, y, R.range(-10, 10), -R.range(5, 20), R.range(0.25, 0.45), R.pick([C[7], C[6]]), R.chance(0.3) ? 1.6 : 0.6);
      }
      if (!out && t >= OUT + 0.06) {
        out = true;
        for (let i = 0; i < 10; i++) ps.spawn(P.MOTE, R.range(-50, 30), R.range(-14, 10), R.range(220, 320), R.range(-10, 10), R.range(0.06, 0.14), R.pick([C[7], C[6]]), 1);
      }
      ps.update(dt);
      lights.update(dt);
    },

    draw(p) {
      const [sx, sy] = shake(t, 3, HIT, 0.25, o.seed);
      // speed lines stream behind it as it rockets in, and again as it leaves
      speedLines(p, C, t, t < HIT ? 1 : t < OUT ? Math.max(0, 1 - (t - HIT) / 0.35) * 0.9 : seg(t, OUT + 0.04, OUT + 0.12) * (1 - seg(t, OUT + 0.18, OUT + 0.3)), t >= OUT ? -1 : 1);
      // the slam: a spiky white star behind the count for two frames, then a ring rolling out
      const hk = t - HIT;
      if (hk >= 0 && hk < 0.07) {
        const cx = X0 + (big.w * BS) / 2, k = hk < 0.035 ? 1 : 1.3;
        for (const [an, L] of spikes) {
          const ca = Math.cos(an) * 1.4, sa = Math.sin(an);
          if (k === 1) p.beam(cx, 0, cx + ca * L, sa * L, 3, (u) => (u < 0.5 ? WHITE : C[6]));
          else p.line(cx + ca * L * 0.5, sa * L * 0.5, cx + ca * L * k, sa * L * k, C[5]);
        }
      }
      const rk = (t - HIT) / 0.32;
      if (rk > 0 && rk < 1) {
        const r = 20 + 34 * ease.outCubic(rk);
        p.ellipse(sx, sy, r * 1.5, r * 0.75, rk < 0.3 ? WHITE : C[5], (d) => (d > 1 - 1.5 / (r * 0.75) ? 1.25 - rk : 0));
      }
      ps.draw(p);
      // the words: smeared while they fly, white on the slam, a pulse on the beat, a drained timer underneath
      const x = xAt(t), moving = t < HIT || t > OUT + 0.06, stretch = moving ? (t < HIT ? 1.22 : 1.12) : 1;
      const pulse = Math.exp(-(((t - BEAT) / 0.05) ** 2)), flash = (t >= HIT && t < HIT + 0.07) || pulse > 0.6 ? 1 : 0;
      const a = t > OUT ? 1 - seg(t, OUT + 0.08, OUT + 0.2) : t < 0.035 ? 0.5 : 1;
      const layout = (dx) => {
        const bs = BS * (1 + 0.12 * pulse), items = [];
        const bx = X0 + dx - (big.w * BS * (stretch - 1)) / 2, by = BASE - 7 * bs;
        big.letters.forEach((L) => L.g && items.push({ g: L.g, x: bx + L.x * BS * stretch, y: by, sx: BS * stretch, sy: bs, slant: 1, flash, a }));
        const lx = X0 + dx + big.w * BS * stretch + 4;
        lab.letters.forEach((L) => L.g && items.push({ g: L.g, x: lx + L.x * LS * stretch, y: BASE - 7 * LS, sx: LS * stretch, sy: LS, slant: 0.5, flash, a }));
        return items;
      };
      if (moving && a > 0) {
        // two dimmer afterimages trailing the words
        for (const [lag, c] of [[0.03, C[2]], [0.015, C[3]]]) {
          const items = layout(xAt(t - (t < HIT ? lag : -lag)) + sx);
          drawWord(p, items.map((it) => ({ ...it, flash: 0 })), { fill: [c], edge: c, under: c, outline: 0, shadow: 0 });
        }
      }
      if (a > 0) {
        const sh = seg(t, 0.62, 0.86), items = layout(x + sx);
        drawWord(p, items.map((it) => ({ ...it, y: it.y + sy })), { fill: [C[4], C[5], C[6], C[7]], edge: WHITE, under: C[3], outline: C[0], ow: 2, shadow: SHADOW, shine: sh > 0 && sh < 1 ? X0 - 10 + (W + 24) * sh : null, shineY: BASE - 28, glint: C[6] });
        // the combo timer: a thin bar under the words, draining until it goes
        const bk = seg(t, HIT + 0.1, HIT + 0.2) * (t > OUT ? 0 : 1);
        if (bk > 0) {
          const bw = W * bk, left = 1 - seg(t, HIT + 0.2, OUT), bx = X0 + x + sx, by = BASE + 5 + sy;
          p.rect(bx - 1, by - 1, bw + 2, 4, C[0]);
          p.rect(bx, by, bw, 2, C[1]);
          if (left > 0) p.rect(bx, by, bw * left, 2, C[5]), p.rect(bx, by, bw * left, 1, C[6]), p.px(bx + bw * left - 1, by, WHITE);
        }
      }
      p.glow(sx - 20, 0, 60, C[4], 0.2 * a + (t >= HIT && t < HIT + 0.15 ? 0.5 * (1 - (t - HIT) / 0.15) : 0) + 0.25 * pulse);
      const g = (t - 0.86) / 0.22;
      if (g > 0 && g < 1) sparkle(p, X0 + W - 2, BASE - 14, 6 * Math.sin(g * Math.PI), C[7], C[5], 0.5);
      lights.draw(p);
    },
  };
}
