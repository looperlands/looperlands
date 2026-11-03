import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, seg, lerp, ease, TAU, WHITE, mix, luma, rgb, READY } from "../../core/index.mjs";
import { shapeOf, recolor, oval } from "./_lib.mjs";

export const meta = {
  name: "Heal",
  desc: "Petals of light bloom under the feet, a hoop of light rises up the body restoring its colour and leaving sparkles, and motes spiral up and pop into tiny hearts.",
  tags: ["holy", "heal", "restore", "buff", "petals", "hearts", "character", "one-shot"],
  size: [80, 104],
  origin: [40, 92],
  duration: 1.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#3d2027", "#7d3f35", "#c97a4a", "#f2b46a", "#ffd994", "#fff0cf", "#fffaf2", "#ffffff"], seed: 2 },
};

const HURT = { turn: 0.8, crouch: 5, lean: 3, hy: 1, fx: 1, fy: -21, bx: 7, by: -15, ffx: 4, fbx: -3 };
const UP = { turn: 1.15, crouch: -1, fx: -13, fy: -36, bx: 14, by: -36, hy: -1, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [
    [-0.3, HURT],
    [0.16, { ...HURT, crouch: 6 }],
    [0.5, { ...HURT, crouch: 3, lean: 1, hy: 0 }],
    [0.78, UP],
    [1.2, { ...UP, crouch: 0, fy: -30, by: -30, hy: 0 }],
    [1.9, READY],
  ],
};

const SY = 0.3, NP = 8, PR = 16, LIFT0 = 0.16, LIFT1 = 0.74, TOPY = -43;
const HEART = [".#.#.", "#####", ".###.", "..#.."];

// a tiny heart of light: cream body, a white glint, a warm rim
function heart(p, x, y, C, a) {
  const X = Math.round(x) - 2, Y = Math.round(y) - 2, at = (i, j) => j >= 0 && j < 4 && i >= 0 && i < 5 && HEART[j][i] === "#";
  for (let j = -1; j <= 4; j++)
    for (let i = -1; i <= 5; i++) {
      if (at(i, j)) p.dot(X + i, Y + j, i === 1 && j === 1 ? WHITE : j >= 2 ? C[5] : C[6], a);
      else if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) p.dot(X + i, Y + j, C[3], a * 0.9);
    }
  p.glow(x, y, 6, C[5], 0.4 * a);
}

export function create(o) {
  const C = fit(o.palette, 8), A = o.actor, S = shapeOf(A), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const lights = new Lights();
  const rows = new Map();
  for (const [x, y] of S.edge) (rows.get(y) ?? rows.set(y, []).get(y)).push(x);
  // petals, each blooming on its own beat round the ring
  const petals = Array.from({ length: NP }, (_, k) => ({ a: (k / NP) * TAU + 0.2, t0: 0.02 + ((k * 3) % NP) * 0.035, w: R.range(4.2, 5.2) }));
  // motes riding a spiral up round the body: from the petal tips as they open, and from the hoop when it bursts
  const motes = [];
  for (let k = 0; k < NP; k++) motes.push({ t0: 0.2 + k * 0.05, th0: petals[k].a, r0: PR * 0.9, y0: -1, w: 4.2 * (k % 2 ? 1 : -1), v: R.range(46, 58), life: R.range(0.75, 0.95), kind: k % 2 });
  for (let k = 0; k < 8; k++) motes.push({ t0: LIFT1 + R.range(0, 0.06), th0: (k / 8) * TAU, r0: R.range(12, 18), y0: TOPY + R.range(-2, 4), w: 3.6 * (k % 2 ? 1 : -1), v: R.range(14, 34), life: R.range(0.35, 0.6), kind: (k + 1) % 2 });
  let t = 0, burst = false, lastRow = 1;

  const hoopY = (tt) => lerp(0, TOPY, ease.inOutSine(seg(tt, LIFT0, LIFT1)));
  const hoopR = (tt) => lerp(PR, 12, seg(tt, LIFT0, LIFT1));

  function bloom(k, tt) {
    const pe = petals[k];
    return ease.outBack(seg(tt, pe.t0, pe.t0 + 0.3), 1.8) * (1 - ease.inBack(seg(tt, 1.25 + k * 0.02, 1.6 + k * 0.02), 1.4));
  }

  // a petal of a lotus of light round the feet: rooted on a ring on the floor, leaning out as it opens,
  // foreshortened as it turns away; a lit rim, a white vein, a translucent warm body, a white tip
  function petal(p, k, back) {
    const pe = petals[k], g = pe.a + t * 0.4, near = Math.sin(g) >= 0, b = bloom(k, t);
    if (near === back || b <= 0.02) return;
    const ca = Math.cos(g), sa = Math.sin(g), rb = 6, rt = rb + 9 * Math.min(1.2, b), h = (k % 2 ? 7 : 9) * b;
    const bx = ca * rb, by = sa * rb * SY, tx = ca * rt, ty = sa * rt * SY - h, L = Math.hypot(tx - bx, ty - by);
    if (L < 1.5) return;
    const ux = (tx - bx) / L, uy = (ty - by) / L, W = pe.w * Math.min(1, b) * (0.35 + 0.65 * Math.abs(sa)), pad = W + 1;
    p.each(Math.min(bx, tx) - pad, Math.min(by, ty) - pad, Math.max(bx, tx) + pad, Math.max(by, ty) + pad, (x, y, sx, sy) => {
      const dx = x - bx, dy = y - by, u = (dx * ux + dy * uy) / L;
      if (u < 0 || u > 1) return;
      const hw = W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.7) + 0.2, v = Math.abs(-dx * uy + dy * ux) / hw;
      if (v > 1) return;
      if (u > 0.9) return p.put(sx, sy, WHITE, 1);
      if (v > 0.7) return p.put(sx, sy, u < 0.3 ? C[3] : u < 0.7 ? C[5] : C[6], 1);
      if (v < 0.2 && u > 0.15 && u < 0.85) return p.put(sx, sy, u < 0.55 ? C[5] : C[6], back ? 0.75 : 0.85);
      p.blendPx(sx, sy, u < 0.45 ? C[3] : C[4], back ? 0.6 : 0.45);
    });
    p.glow(tx, ty, 5, C[5], 0.35 * Math.min(1, b));
  }

  // the hoop of light rising up the body: far half behind, near half in front, a soft glow round it
  function hoop(p, back) {
    if (t < LIFT0 || t > LIFT1 + 0.12) return;
    const y = hoopY(t), r = hoopR(t) * (t > LIFT1 ? 1 - (t - LIFT1) / 0.12 : 1), keep = back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0;
    oval(p, 0, y, r, r * SY, (g) => (Math.sin(g) > 0.5 ? WHITE : C[6]), back ? 0.8 : 1, keep);
    if (!back) {
      oval(p, 0, y + 1, r - 0.5, r * SY, C[4], 1, keep);
      for (let i = -2; i <= 2; i++) p.glow(i * r * 0.45, y, 8, C[5], 0.32);
    }
  }

  return {
    update(dt) {
      t += dt;
      // the hoop leaves sparkles on the body as it passes each row
      if (t > LIFT0 && t < LIFT1) {
        const Y = Math.round(hoopY(t));
        for (let y = lastRow; y > Y; y--) {
          const xs = rows.get(y);
          if (!xs || !R.chance(0.45)) continue;
          ps.spawn(P.STAR, R.pick(xs) + R.range(-1, 1) * 2, y, R.range(-4, 4), -R.range(4, 12), R.range(0.3, 0.55), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.6));
        }
        lastRow = Math.min(lastRow, Y);
      }
      if (!burst && t >= LIFT1) {
        burst = true;
        lights.add(0, TOPY, 26, C[5], 0.55, 0.3);
        lights.add(0, TOPY, 10, WHITE, 0.45, 0.08);
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // a warm pool under the flower
      const pool = smooth(0, 0.2, t) * (1 - smooth(1.3, 1.75, t));
      if (pool > 0) p.glow(0, -2, 30, C[4], 0.3 * pool);
      for (let k = 0; k < NP; k++) petal(p, k, true);
      hoop(p, true);
      ps.draw(p, "back");
      riders(p, true);
    },
    draw(p) {
      // drained of colour above the hoop, restored below it with a warm glow at the line
      const drain = smooth(0, 0.08, t);
      if (t < LIFT1 + 0.35) {
        const Y = t < LIFT0 ? 1 : hoopY(t), done = t >= LIFT1;
        recolor(p, A, (c, x, y) => {
          const d = y - Y;
          if (!done && d < -0.5) {
            const l = luma(c) * 0.88;
            return mix(c, rgb(l * 236, l * 226, l * 222), 0.68 * drain);
          }
          if (!done && d < 1) return WHITE;
          if (!done && d < 2.5) return C[6];
          const k = (done ? 0.45 * (1 - seg(t, LIFT1, LIFT1 + 0.35)) : 0.5 * Math.exp(-(d - 2.5) / 5));
          return k > 0.05 ? mix(c, C[5], k) : 0;
        });
        if (t > LIFT0 && !done) p.glow(0, Y, 18, C[5], 0.35);
      }
      for (let k = 0; k < NP; k++) petal(p, k, false);
      hoop(p, false);
      if (t >= LIFT1 && t < LIFT1 + 0.25) sparkle(p, 0, TOPY, 8 * (1 - (t - LIFT1) / 0.25), WHITE, C[5], 0.6);
      riders(p, false);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };

  // the spiralling motes, each popping into a heart or a sparkle at the end of its ride
  function riders(p, back) {
    for (const m of motes) {
      const a = t - m.t0;
      if (a < 0) continue;
      const at = (aa) => {
        const th = m.th0 + m.w * aa, r = m.r0 * (1 - 0.45 * (aa / m.life));
        return [Math.cos(th) * r, m.y0 - m.v * aa, Math.sin(th)];
      };
      if (a < m.life) {
        const [x, y, z] = at(a);
        if (z < 0 !== back) continue;
        for (let j = 0; j < 7; j++) {
          const aj = a - j * 0.03;
          if (aj < 0) break;
          const [tx, ty, tz] = at(aj);
          if (tz < 0 !== back) continue;
          p.dot(tx, ty, j === 0 ? WHITE : j < 3 ? C[6] : C[5], (1 - j / 7) * (back ? 0.6 : 1));
        }
        p.glow(x, y, 4, C[5], back ? 0.2 : 0.4);
        continue;
      }
      // the pop: a quick sparkle, then a heart (or a star) that floats up and fades
      const u = (a - m.life) / 0.36;
      if (u >= 1 || back) continue;
      const [x, y] = at(m.life), k = 1 - smooth(0.5, 1, u);
      if (u < 0.12) sparkle(p, x, y, 3, WHITE, C[6], 0.5);
      else if (m.kind) heart(p, x, y - u * 6, C, k);
      else sparkle(p, x, y - u * 5, 1 + 2 * k * (0.7 + 0.3 * Math.sin(a * 30)), WHITE, C[5], 0.45 * k);
    }
  }
}
