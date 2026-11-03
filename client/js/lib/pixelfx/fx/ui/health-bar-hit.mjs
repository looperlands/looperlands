import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, clamp, seg, ease, TAU, WHITE, hex, mix } from "../../core/index.mjs";
import { panel, shake, HEART, heartPal } from "./_lib.mjs";

export const meta = {
  name: "Health bar hit",
  desc: "A segmented health bar takes a hit: it jolts and dips, the lost chunk flashes white and sheds chips, holds, then drains away behind a sparking edge.",
  tags: ["ui", "health", "hud", "damage", "bar", "one-shot"],
  size: [160, 64],
  origin: [80, 30],
  duration: 2.0,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1a0508", "#4a0b12", "#8c1420", "#d42a2e", "#ff5a4a", "#ff9a86", "#ffd8cc", "#ffffff"], from: 0.8, to: 0.45, seed: 3 },
};

const HIT = 0.2, DRAIN = 0.62, DRAINED = 1.05, FOLD = 1.62;
const BX = -48, BW = 104, BY = -4, BH = 8, CELLS = 10;
const INK = { outline: hex("#0d0a14"), rim: hex("#4a4060"), top: hex("#2a2338"), body: hex("#1e1929"), low: hex("#141019") };

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), from = clamp(o.from), to = clamp(Math.min(o.to, from));
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), bits = new Bits(), lights = new Lights();
  const PALE = mix(C[6], hex("#ffe9a8"), 0.5), pal = heartPal(C);
  let t = 0, hit = false;
  const end = meta.duration - 0.05;
  // the white chunk's right end: holds, then drains down to the new value
  const ghostAt = (t) => (t < DRAIN ? from : from - (from - to) * ease.inOutQuad(seg(t, DRAIN, DRAINED)));
  return {
    update(dt) {
      t += dt;
      if (!hit && t >= HIT) {
        hit = true;
        lights.add(BX + BW * (to + from) / 2, BY + 4, 50, C[5], 0.7, 0.3);
        lights.add(BX + BW * (to + from) / 2, BY + 4, 24, WHITE, 0.6, 0.08);
        // chips break off the lost chunk
        for (let i = 0; i < 12; i++) {
          const x = BX + BW * R.range(to, from), an = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(50, 130);
          bits.add({ kind: B.SHARD, x, y: BY + R.range(1, 7), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 0.45, drag: 1.2, life: R.range(0.35, 0.6), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3), c: R.pick([C[7], C[6], C[5], C[4]]) });
        }
        for (let i = 0; i < 10; i++) {
          const an = R.range(0, TAU), sp = R.range(60, 160);
          ps.spawn(P.SPARK, BX + BW * R.range(to, from), BY + 4, Math.cos(an) * sp, Math.sin(an) * sp * 0.6 - 30, R.range(0.12, 0.26));
        }
      }
      // the draining edge sparks as it runs back
      if (t > DRAIN && t < DRAINED && R.chance(0.5)) {
        const x = BX + BW * ghostAt(t);
        ps.spawn(P.SPARK, x, BY + R.range(1, 7), R.range(-20, 60), -R.range(20, 70), R.range(0.1, 0.22));
      }
      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    draw(p) {
      const [jx, jy] = shake(t, 3, HIT, 0.28, o.seed), dip = t > HIT ? Math.round(3 * Math.exp(-(t - HIT) * 10) * Math.cos((t - HIT) * 24)) : 0;
      const open = ease.outBack(seg(t, 0, 0.14), 2) * (1 - ease.inBack(seg(t, FOLD, FOLD + 0.18), 2));
      if (open > 0.04) {
        const ox = jx, oy = jy + dip, h = 18 * open, y0 = -9 + (18 - h) / 2;
        // the frame flashes red on the hit
        const red = t >= HIT && t < HIT + 0.07;
        panel(p, BX - 22 + ox, y0 + oy, BW + 26, h, red ? { ...INK, outline: C[4], rim: C[6] } : INK, { r: Math.min(5, h / 2) });
        if (open > 0.75) {
          // the track, then the fill (red, lit on top, dark below), the white chunk, and the cell dividers
          const val = t < HIT ? from : to, ghost = t < HIT ? from : ghostAt(t), white = t >= HIT && t < HIT + 0.07;
          p.rect(BX + ox, BY + oy, BW, BH, hex("#0d0a14"));
          p.shade(BX + ox, BY + oy, BX + BW + ox, BY + BH + oy, (x, y) => {
            const u = (x - BX - ox) / BW, v = y - BY - oy;
            if (u < val) return v < 1 ? C[6] : v < 2 ? C[5] : v < 5 ? C[4] : v < 7 ? C[3] : C[2];
            if (u < ghost) return white ? WHITE : v < 1 ? WHITE : v < 6 ? PALE : C[5];
            return v < 1 ? hex("#2a2338") : hex("#191424");
          });
          for (let i = 1; i < CELLS; i++) p.rect(BX + ox + Math.round((BW * i) / CELLS), BY + oy, 1, BH, hex("#0d0a14"));
          // the new edge of the health glints, and a hot spark rides the draining edge
          if (t > HIT) p.rect(BX + ox + Math.round(BW * val) - 1, BY + oy, 1, BH, C[7]);
          if (t > DRAIN && t < DRAINED) {
            const gx = BX + ox + BW * ghost;
            p.rect(gx - 1, BY + oy - 1, 2, BH + 2, WHITE);
            p.glow(gx, BY + oy + 4, 10, C[5], 0.6);
          }
          p.glow(BX + ox + BW * val * 0.5, BY + oy + 4, BW * 0.4, C[3], 0.12);
          // the heart: jumps and flashes white on the hit, glints before it
          const hk = t - HIT, hop = hk > 0 ? Math.round(-3 * Math.exp(-hk * 12) * Math.abs(Math.cos(hk * 22))) : 0;
          p.sprite(HEART, pal, BX - 17 + ox, oy - 6 + hop);
          if (hk > 0 && hk < 0.07) p.sprite(HEART, { ...pal, k: 0, w: WHITE, h: WHITE, o: WHITE, m: WHITE, d: C[6] }, BX - 17 + ox, oy - 6 + hop);
          p.glow(BX - 11 + ox, oy, 10, C[4], 0.25 + (hk > 0 && hk < 0.2 ? 0.4 : 0));
          if (t < HIT && (t * 2.5) % 1 < 0.3) sparkle(p, BX - 14 + ox, oy - 3, 2, C[7], C[6], 0.3);
        }
      }
      bits.draw(p);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
