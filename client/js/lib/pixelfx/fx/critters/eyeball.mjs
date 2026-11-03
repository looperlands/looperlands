import { fit, hex, mix, clamp, wrap, lerp, ease, rng, TAU } from "../../core/index.mjs";
import { Grid, shift, shadow, curve } from "./_lib.mjs";

export const meta = {
  name: "Eyeball",
  desc: "A bloodshot eyeball floats in its fleshy lids: its glowing iris snaps from one look to the next, it blinks, and its nerve sways behind it as it bobs.",
  tags: ["critter", "eyeball", "eye", "monster", "spooky", "float", "loop"],
  size: [96, 108],
  origin: [48, 100],
  duration: 3.2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#2a1420", "#6a3040", "#b07078", "#dcbcb4", "#f4e9de", "#ffffff"],
    flesh: ["#1e0c16", "#4a1a2c", "#7c2c40", "#b04a58", "#e07a80"],
    iris: ["#0c2a14", "#1f6a2a", "#3fae3a", "#9be05a", "#e8ffb0"],
    hover: 48,
    seed: 1,
  },
};

const D = meta.duration, GRID = new Grid(-18, -18, 36, 38), NERVE = new Grid(-20, -70, 40, 64), R = 13, VEIN = hex("#c42a3a");
// where it looks: snaps between targets with a little overshoot, holds, snaps on
const LOOKS = [[0, 0, 0], [0.55, 4.2, -1.2], [1.15, -4.4, 0.8], [1.95, 1.2, 3.4], [2.5, -2, -3.4], [3.0, 0, 0]];
function look(t) {
  let i = LOOKS.length - 1;
  while (i > 0 && t < LOOKS[i][0]) i--;
  const [t0, x1, y1] = LOOKS[i], [, x0, y0] = LOOKS[(i + LOOKS.length - 1) % LOOKS.length], u = ease.outBack(clamp((t - t0) / 0.08), 2.2);
  return [lerp(x0, x1, u), lerp(y0, y1, u)];
}
// the lids: open at rest, a quick blink before it looks down
const lid = (t) => (t > 1.74 && t < 1.92 ? Math.sin(Math.PI * ((t - 1.74) / 0.18)) : 0);
function at(t, hover) {
  const a = (t / D) * TAU;
  return { x: 1.5 * Math.sin(a), y: -hover - 3 * Math.sin(2 * a + 0.4) };
}

// veins: branching red threads creeping in from the rim, fixed to the eyeball's surface
function veins(seed) {
  const out = [], r = rng(seed, 77);
  for (let i = 0; i < 7; i++) {
    let a = (i / 7) * TAU + r.range(-0.3, 0.3), d = R - 0.5;
    const pts = [[Math.cos(a) * d, Math.sin(a) * d]];
    for (let k = 0; k < 4; k++) {
      a += r.range(-0.35, 0.35);
      d -= r.range(1.2, 2.1);
      pts.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
    out.push(pts);
  }
  return out;
}

function eye(g, C, Fl, I, t, seed) {
  g.clear();
  const [lx, ly] = look(t), L = lid(t), V = veins(seed);
  const lit = (x, y, k) => Math.hypot(-4 + (x + 4) / k, -4.5 + (y + 4.5) / k) <= R;
  // the sclera: a wet sphere lit from the top-left, pinker in its shadow
  g.shade(-R, -R, R, R, (x, y) => {
    const d = Math.hypot(x, y);
    if (d > R) return 0;
    if (!(Math.hypot(x + 2, y + 2.2) <= R)) return C[2];
    return lit(x, y, 0.5) ? C[5] : lit(x, y, 0.8) ? C[4] : C[3];
  });
  // veins ride the eyeball as it turns
  for (const pts of V) {
    const sh = pts.map(([x, y]) => [x + lx * 0.35 * (1 - Math.hypot(x, y) / R), y + ly * 0.35 * (1 - Math.hypot(x, y) / R)]);
    for (let k = 1; k < sh.length; k++) g.line(sh[k - 1][0], sh[k - 1][1], sh[k][0], sh[k][1], k < 2 ? VEIN : mix(VEIN, C[3], 0.45));
  }
  // the iris, foreshortened as it turns away, a dark ring, a green that brightens toward the pupil
  const off = Math.hypot(lx, ly), fx = 1 - 0.32 * (Math.abs(lx) / R) ** 1.4 * 3, fy = 1 - 0.32 * (Math.abs(ly) / R) ** 1.4 * 3;
  const ir = 6.4, pr = 2 + 0.4 * Math.sin((t / D) * TAU * 2);
  g.shade(lx - ir - 1, ly - ir - 1, lx + ir + 1, ly + ir + 1, (x, y) => {
    const dx = (x - lx) / (ir * fx), dy = (y - ly) / (ir * fy), d = Math.hypot(dx, dy);
    if (d > 1 || Math.hypot(x, y) > R - 0.5) return 0;
    const pd = Math.hypot((x - lx) / fx, (y - ly) / fy);
    if (pd < pr) return C[0];
    if (d > 0.86) return I[0];
    const ang = Math.atan2(dy, dx), streak = Math.sin(ang * 9 + d * 4) > 0.5;
    if (d < 0.5) return streak ? I[4] : I[3];
    if (d < 0.7) return streak ? I[3] : I[2];
    return streak ? I[2] : I[1];
  });
  // a fixed glint from the light, whichever way it looks
  if (L < 0.5) g.set(-4, -5, C[5]), g.set(-3, -5, C[5]), g.set(-4, -4, C[5]), g.set(1, -2, C[5]);
  // the lids: fleshy shells over the top and bottom, lit like the ball they wrap, the upper one sweeping down to blink
  const up = lerp(-R + 3, R * 0.42, L), dn = lerp(R - 2.2, R * 0.42, L);
  const flit = (x, y, k) => Math.hypot(-4 + (x + 4) / k, -5 + (y + 5) / k) <= R + 0.6;
  g.shade(-R - 1, -R - 1, R + 1, R + 1, (x, y) => {
    const d = Math.hypot(x, y);
    if (d > R + 0.6) return 0;
    const ue = up + 1.8 * (x / R) ** 2, de = dn - 1.4 * (x / R) ** 2;
    const tone = !(Math.hypot(x + 2, y + 2.2) <= R + 0.6) ? Fl[1] : flit(x, y, 0.55) ? Fl[4] : flit(x, y, 0.85) ? Fl[3] : Fl[2];
    if (y < ue) return y > ue - 1.2 ? Fl[0] : tone;
    if (y > de) return y < de + 1.1 ? Fl[0] : tone === Fl[4] ? Fl[3] : tone;
    return 0;
  });
  g.outline(C[0]);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 6), Fl = fit(o.flesh, 5), I = fit(o.iris, 5), S = at(t, o.hover);
  // the optic nerve hangs from the back, trailing the bob a beat behind: one tube, lit down its left side
  const ng = NERVE.clear();
  for (let s = 0; s <= 20; s += 0.5) {
    const B = at(t - s * 0.035, o.hover), sw = 2.6 * (s / 20) ** 1.3 * Math.sin((t / D) * TAU * 2 - s * 0.16), r = lerp(2, 0.6, s / 20);
    const cx = B.x + 1 + sw, cy = B.y + R - 2 + s;
    ng.shade(cx - r - 1, cy - 1, cx + r + 1, cy + 1, (x, y) => {
      const v = (x - cx) / Math.max(0.6, r);
      if (Math.abs(v) > 1 || Math.abs(y - cy) > 0.5) return 0;
      return v < -0.35 ? Fl[4] : v < 0.4 ? Fl[3] : Fl[2];
    });
  }
  ng.outline(Fl[0]);
  ng.draw(p);
  const g = GRID;
  eye(g, C, Fl, I, t, o.seed);
  g.draw(p, 1, S.x, S.y);
  // the iris glows, an eerie halo round the whole eye, motes circling it
  const [lx, ly] = look(t), snap = Math.max(...LOOKS.map(([t0]) => Math.max(0, 1 - Math.abs(wrap(t - t0 + D / 2, D) - D / 2) / 0.2)));
  const open = 1 - lid(t);
  p.glow(S.x + lx, S.y + ly, 15, I[3], (0.5 + 0.3 * snap) * open);
  p.glow(S.x + lx, S.y + ly, 5, I[4], 0.4 * open);
  p.glow(S.x, S.y, 50, I[1], 0.3);
  // motes of green light wheel round it on a tilted orbit, trailing short streaks
  for (let i = 0; i < 8; i++) {
    const sp = (i % 2 ? 1 : -1) * (i % 3 ? 1 : 2), a0 = (i * TAU) / 8, rr = 19 + (i % 3) * 2;
    let prev = null;
    for (let k = 5; k >= 0; k--) {
      const a = (t / D) * TAU * sp + a0 - sp * k * 0.035, z = Math.sin(a), x = S.x + Math.cos(a) * rr, y = S.y + z * 5 - Math.cos(a) * 3;
      if (z < 0 && Math.hypot(x - S.x, y - S.y) < R + 1) {
        prev = null;
        continue;
      }
      if (prev && k > 0) p.line(prev[0], prev[1], x, y, I[2], 0.4 + (5 - k) * 0.12);
      if (k === 0) p.px(x, y, z > 0 ? I[4] : I[3]), p.glow(x, y, 5, I[3], 0.45);
      prev = [x, y];
    }
  }
}

export function drawBack(p, time, o) {
  const t = shift(time, D, o.seed), I = fit(o.iris, 5), S = at(t, o.hover);
  shadow(p, S.x, 0, 10, 1.5, hex("#0d0a12"), 0.5);
  for (let x = -26; x <= 26; x += 6) p.glow(S.x + x, -1, 18, I[2], 0.15 * (1 - Math.abs(x) / 34));
}
