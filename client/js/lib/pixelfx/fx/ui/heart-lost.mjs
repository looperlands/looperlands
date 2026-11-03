import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, clamp, seg, ease, TAU, WHITE, hex } from "../../core/index.mjs";
import { shake } from "./_lib.mjs";

export const meta = {
  name: "Heart lost",
  desc: "A HUD heart is hit: it flashes white and jolts, a crack runs down it, it splits into two halves that tumble away, leaving an empty socket that fades.",
  tags: ["ui", "health", "heart", "hud", "damage", "one-shot"],
  size: [96, 88],
  origin: [48, 34],
  duration: 1.5,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1a0508", "#4a0b12", "#8c1420", "#d42a2e", "#ff5a4a", "#ff9a86", "#ffd8cc", "#ffffff"], seed: 5 },
};

const HIT = 0.14, CRACK = 0.24, SPLIT = 0.5;
// the heart's shape, 19 x 16, centred on (0, 0)
const MASK = [
  "....xxxx...xxxx....",
  "..xxxxxxx.xxxxxxx..",
  ".xxxxxxxxxxxxxxxxx.",
  "xxxxxxxxxxxxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxx",
  ".xxxxxxxxxxxxxxxxx.",
  "..xxxxxxxxxxxxxxx..",
  "...xxxxxxxxxxxxx...",
  "....xxxxxxxxxxx....",
  ".....xxxxxxxxx.....",
  "......xxxxxxx......",
  ".......xxxxx.......",
  "........xxx........",
  ".........x.........",
];
const MW = 19, MH = 16, OX = -9.5, OY = -8;
const inMask = (i, j) => i >= 0 && j >= 0 && i < MW && j < MH && MASK[j][i] === "x";
// the crack: a zigzag from the notch to the tip, as a column per row
const CRACK_X = [9, 9, 10, 9, 8, 8, 9, 10, 10, 9, 8, 9, 9, 10, 9, 9];

// the heart's own color at mask pixel (i, j): a lit left lobe with a white glint, shade down the right
function shadeAt(C, i, j) {
  const u = (i - 9) / 9.5, v = (j - 7) / 8;
  if ((i === 3 || i === 4) && (j === 2 || j === 3) && !(i === 4 && j === 3)) return WHITE;
  if (i >= 2 && i <= 5 && j >= 2 && j <= 5 && u + v < -0.75) return C[5];
  const l = -(u * 0.55 + v * 0.65);
  return l > 0.25 ? C[4] : l > -0.3 ? C[3] : l > -0.6 ? C[2] : C[1];
}

// draw part of the heart (side: -1 left of the crack, 1 right, 0 whole) turned by a about its pivot
function drawPart(p, C, side, x, y, a, white, crackK, alpha) {
  const ca = Math.cos(a), sa = Math.sin(a), px0 = side < 0 ? -4.5 : side > 0 ? 4.5 : 0, py0 = 0;
  const own = (i, j) => inMask(i, j) && (side === 0 || (side < 0 ? i < CRACK_X[j] : i >= CRACK_X[j]));
  p.shade(x - 13, y - 13, x + 13, y + 13, (sx, sy, o) => {
    // back into the heart's own pixels
    const dx = sx - x, dy = sy - y, lx = dx * ca + dy * sa + px0, ly = -dx * sa + dy * ca + py0;
    const i = Math.floor(lx - OX), j = Math.floor(ly - OY);
    if (!own(i, j)) return;
    o.a = alpha;
    const edge = !own(i - 1, j) || !own(i + 1, j) || !own(i, j - 1) || !own(i, j + 1);
    if (white) return edge ? C[6] : WHITE;
    if (edge) return C[0];
    // the crack opens down the middle, dark with a lit lip
    if (side === 0 && j / MH < crackK) {
      if (i === CRACK_X[j]) return C[0];
      if (i === CRACK_X[j] - 1) return C[6];
    }
    return shadeAt(C, i, j);
  });
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), bits = new Bits(), lights = new Lights();
  const SOCKET = [hex("#0d0a14"), hex("#2a2338"), hex("#3c3350")];
  const halves = [-1, 1].map((s) => ({ s, x: s * 4.5, y: 0, vx: s * R.range(55, 70), vy: -R.range(60, 80), a: 0, va: s * R.range(2.2, 3.2) }));
  let t = 0, hit = false, split = false, gone = false;
  const end = meta.duration - 0.05;
  return {
    update(dt) {
      t += dt;
      if (!hit && t >= HIT) {
        hit = true;
        lights.add(0, 0, 40, C[5], 0.6, 0.3);
        for (let i = 0; i < 8; i++) {
          const an = R.range(0, TAU), sp = R.range(80, 170);
          ps.spawn(P.SPARK, Math.cos(an) * 9, Math.sin(an) * 7, Math.cos(an) * sp, Math.sin(an) * sp - 30, R.range(0.1, 0.22));
        }
      }
      if (!split && t >= SPLIT) {
        split = true;
        lights.add(0, 0, 44, WHITE, 0.6, 0.12);
        lights.add(0, 0, 50, C[5], 0.5, 0.4);
        // the break throws shards from the crack and a puff of red dust
        for (let i = 0; i < 12; i++) {
          const j = R.int(1, 14), an = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(40, 100);
          bits.add({ kind: B.SHARD, x: CRACK_X[j] + OX, y: j + OY, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 0.5, drag: 1, life: R.range(0.35, 0.55), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3), c: R.pick([C[6], C[5], C[4], C[3]]) });
        }
        for (let i = 0; i < 5; i++) ps.spawn(P.DUST, R.range(-2, 2), R.range(-6, 6), R.range(-25, 25), R.range(-20, 5), R.range(0.35, 0.6), C[2], R.range(2, 3.5));
        for (let i = 0; i < 6; i++) {
          const an = R.range(0, TAU), sp = R.range(30, 70);
          ps.spawn(P.STAR, Math.cos(an) * 4, Math.sin(an) * 4, Math.cos(an) * sp, Math.sin(an) * sp, R.range(0.25, 0.45), R.pick([C[7], C[6]]), i % 2 ? 0.6 : 1.4);
        }
      }
      if (split && !gone && t >= 0.95) {
        gone = true;
        for (const h of halves)
          for (let i = 0; i < 5; i++) {
            const an = R.range(0, TAU), sp = R.range(20, 50);
            ps.spawn(P.STAR, h.x + Math.cos(an) * 4, h.y + Math.sin(an) * 4, Math.cos(an) * sp, Math.sin(an) * sp - 10, Math.min(R.range(0.2, 0.35), end - t), R.pick([C[7], C[6], C[5]]), i ? 0.6 : 1.3);
          }
      }
      if (split)
        for (const h of halves) {
          h.vy += 520 * dt;
          h.vx -= h.vx * 0.6 * dt;
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          h.a += h.va * dt;
          // a shard or two of red trails off each half as it tumbles
          if (t < 0.92 && R.chance(0.05)) ps.spawn(P.EMBER, h.x, h.y, R.range(-10, 10), R.range(-10, 5), Math.min(R.range(0.3, 0.5), end - t), C[4], 1);
        }
      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    draw(p) {
      const [jx, jy] = shake(t, 3, HIT, 0.25, o.seed), tremble = t > CRACK && t < SPLIT ? Math.round(Math.sin(t * 90)) : 0;
      // the empty socket it leaves behind, which fades away at the end
      const sk = seg(t, SPLIT - 0.05, SPLIT + 0.1) * (1 - seg(t, 1.15, 1.4));
      if (sk > 0)
        p.shade(-12, -10, 12, 10, (sx, sy, out) => {
          const i = Math.floor(sx - OX), j = Math.floor(sy - OY);
          if (!inMask(i, j)) return;
          out.a = sk;
          const edge = !inMask(i - 1, j) || !inMask(i + 1, j) || !inMask(i, j - 1) || !inMask(i, j + 1);
          return edge ? SOCKET[2] : j < 3 ? SOCKET[1] : SOCKET[0];
        });
      if (t < SPLIT) {
        // whole: it beats before the hit, flashes white and jolts on it, then trembles as the crack runs down
        const beat = t < HIT ? 1 + 0.08 * Math.max(0, Math.sin(t * 22)) : 1, white = t >= HIT && t < HIT + 0.07;
        drawPart(p, C, 0, jx + tremble, jy, 0, white, seg(t, CRACK, SPLIT - 0.06), 1);
        p.glow(0, 0, 18 * beat, C[4], 0.3 + (white ? 0.5 : 0));
        if (t < HIT) sparkle(p, -6, -5, 2.5 * Math.max(0, Math.sin(t * 22)), C[7], C[6], 0.3);
      } else {
        // the halves tumble away, flashing white on the break, and fade
        const fade = 1 - seg(t, 0.9, 1.0), white = t < SPLIT + 0.05;
        if (fade > 0) for (const h of halves) drawPart(p, C, h.s, h.x, h.y, h.a, white, 0, fade);
        const rk = (t - SPLIT) / 0.3;
        if (rk < 1) p.ring(0, 0, 8 + 16 * ease.outCubic(rk), Math.max(1, 2 * (1 - rk)), rk < 0.3 ? WHITE : C[5], 1.2 - rk);
      }
      bits.draw(p);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
