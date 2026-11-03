import { Particles, P, Rng, fit, sparkle, clamp, smooth, ease, rand, TAU, WHITE, hex } from "../../core/index.mjs";
import { cull } from "./_lib.mjs";

export const meta = {
  name: "Cartoon POW",
  desc: "A comic-book hit: a jagged two-tone burst star slams in with a shake and boiling edges, POW! drops in letter by letter, action lines fly, then it all snaps away.",
  tags: ["cartoon", "comic", "pow", "hit", "impact", "text", "one-shot"],
  size: [184, 144],
  origin: [92, 72],
  duration: 1.05,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1a0e14", "#6e1a12", "#c8361a", "#f47a24", "#ffc23c", "#fff07a", "#ffffff"], text: "POW!", seed: 5 },
};

const N = 14, IN = 0.05, GO = 0.66, END = 0.8;

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), INK = C[0];
  const ps = new Particles({ rng: R, sparks: [C[6], C[5], C[4], C[3]] });
  // the star's spikes: long and short in turn, each its own length, boiling a little every few frames
  const spikes = Array.from({ length: N * 2 }, (_, i) => ({ r: i % 2 ? R.range(0.5, 0.6) : R.range(0.85, 1.05), j: R.next() * 100 }));
  const lines = Array.from({ length: 16 }, (_, i) => ({ a: ((i + R.range(0.2, 0.8)) / 16) * TAU, r: R.range(0.92, 1.08), L: R.range(10, 17), t0: R.range(0, 0.06) }));
  let t = 0, popped = false, burst = false;
  return {
    update(dt) {
      t += dt;
      if (!burst && t >= IN) {
        burst = true;
        for (let i = 0; i < 22; i++) {
          const a = R.range(0, TAU), sp = R.range(180, 360);
          ps.spawn(P.SPARK, Math.cos(a) * 14, Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.3));
        }
      }
      // it snaps away into a scatter of little stars
      if (!popped && t >= GO) {
        popped = true;
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 150);
          ps.spawn(P.STAR, Math.cos(a) * 26, Math.sin(a) * 18, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.42), R.pick([C[6], C[5], C[4]]), R.range(1.2, 2.4));
        }
      }
      ps.update(dt);
      cull(ps, -meta.origin[0] + 3, -meta.origin[1] + 3, meta.size[0] - meta.origin[0] - 3, meta.size[1] - meta.origin[1] - 3);
    },
    draw(p) {
      const k = clamp(t / IN);
      // the slam: it punches in past full size, shudders and settles; then it squeezes and snaps away
      const s = t < IN ? 0.25 + 0.95 * ease.outCubic(k) : t < GO ? 1 + 0.18 * Math.exp(-(t - IN) * 18) * Math.cos((t - IN) * 40) : 1 - ease.inBack(clamp((t - GO) / (END - GO)), 2);
      const shake = t < 0.3 ? (1 - t / 0.3) * 2.2 : 0, sx = Math.round(Math.sin(t * 97) * shake), sy = Math.round(Math.cos(t * 83) * shake);
      if (s > 0.02) {
        // the burst star, in one pass: its edge at each angle runs straight from spike tip to notch. An inked edge, a
        // yellow body with halftone dots on its shaded side, an inked orange heart and a yellow core
        const boil = Math.floor(t * 12), outer = 50 * s, rot = -0.1 + (t > GO ? (t - GO) * 3 : 0), M = N * 2;
        const rad = spikes.map((q, i) => q.r * (1 + (rand(i, boil, 7) - 0.5) * 0.08));
        p.shade(sx - outer - 4, sy - outer - 4, sx + outer + 4, sy + outer + 4, (x, y) => {
          const dx = x - sx, dy = (y - sy) / 0.82, d = Math.hypot(dx, dy);
          let u = (((Math.atan2(dy, dx) - rot) / TAU) % 1 + 1) % 1 * M;
          const i = Math.floor(u) % M, f = u - Math.floor(u), r = rad[i] + (rad[(i + 1) % M] - rad[i]) * f, e = d / r;
          if (e > outer + 2.5) return;
          if (e > outer) return INK;
          if (e > outer * 0.66 + 2) return dx * 0.6 + dy * 0.8 > outer * 0.25 && (Math.floor(x) + Math.floor(y) * 2) % 4 === 0 && Math.floor(y) % 2 === 0 ? C[4] : C[5];
          if (e > outer * 0.66) return INK;
          return e > outer * 0.44 ? C[3] : C[4];
        });
        p.glow(sx, sy, outer * 1.3, C[5], 0.3 * Math.min(1, s));
      }
      // action lines flying out, and a ring of impact
      for (const q of lines) {
        const u = (t - IN - q.t0) / 0.32;
        if (u <= 0 || u >= 1) continue;
        const r0 = (46 + 22 * ease.outCubic(u)) * q.r, L = q.L * 0.7 * (1 - u), ca = Math.cos(q.a), sa = Math.sin(q.a) * 0.82;
        p.line(ca * r0, sa * r0, ca * (r0 + L), sa * (r0 + L), (v) => (v < 0.5 ? WHITE : C[5]));
      }
      const ru = (t - IN) / 0.24;
      if (ru > 0 && ru < 1) p.ring(0, 0, 30 + 34 * ease.outCubic(ru), Math.max(1, 2.5 * (1 - ru)), ru < 0.4 ? WHITE : C[5], 1.1 - ru);
      // the word: letters dropping in one after another, inked, with a deep red extrusion, then a squash as it goes
      const word = String(o.text ?? "POW!"), scale = 3, widths = [...word].map((ch) => p.measure(ch, { font: "big", scale })[0]);
      let x = -(widths.reduce((a, w) => a + w + scale, -scale)) / 2;
      [...word].forEach((ch, i) => {
        const u = (t - IN - 0.04 - i * 0.05) / 0.12, away = clamp((t - GO) / (END - GO - 0.04));
        if (u > 0 && away < 1) {
          const drop = (1 - ease.outBack(clamp(u), 2.4)) * -14, y = Math.round(-11 + drop - i * 1.5 + sy + away * 6);
          const lx = Math.round(x + sx), a = 1 - away;
          // a thick ink edge, a deep red extrusion, a white face going warm toward its foot
          for (let d = 4; d >= 1; d--) p.text(ch, lx + d, y + d, d >= 3 ? INK : C[1], { font: "big", scale, a, outline: d === 4 ? INK : undefined });
          for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) p.text(ch, lx + ox, y + oy, INK, { font: "big", scale, a });
          p.text(ch, lx, y, (gx, gy) => (gy < 4 ? C[6] : gy < 6 ? C[5] : C[4]), { font: "big", scale, a });
        }
        x += widths[i] + scale;
      });
      ps.draw(p);
      if (t > IN && t < IN + 0.12) sparkle(p, sx + 34, sy - 22, 6 * (1 - (t - IN) / 0.12), C[6], C[5], 0.6);
    },
  };
}
