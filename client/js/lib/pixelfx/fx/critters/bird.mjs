import { fit, hex, mix, clamp, wrap, lerp, smooth, ease, TAU } from "../../core/index.mjs";
import { Grid, shift } from "./_lib.mjs";

export const meta = {
  name: "Bird",
  desc: "A songbird flies in place: bursts of wingbeats that lift its body on each downstroke, a glide on spread wings, its tail fanning, a loose feather drifting away.",
  tags: ["critter", "bird", "flying", "animal", "loop"],
  size: [112, 80],
  origin: [56, 40],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#0a0e1e", "#18244a", "#24407a", "#3466aa", "#5a94d4", "#9cc8f0", "#eaf6ff"],
    breast: ["#4a1a0e", "#a8441c", "#e8783a", "#ffb070"],
    seed: 1,
  },
};

const D = meta.duration, GRID = new Grid(-26, -26, 52, 46), BEAK = hex("#f0b030"), BEAKD = hex("#a86a18");
// the near wing's key poses, points from the shoulder: leading edge to the tip, then the trailing feathers back
const POSE = {
  up: [[0, 0], [-1, -8], [-5, -15], [-8, -13.5], [-10.5, -10.5], [-11, -7], [-9, -3], [-6, 1]],
  mid: [[0, 0], [-3, -2.5], [-9, -2.5], [-10.5, -0.5], [-10, 1.2], [-8.5, 2], [-7, 2.2], [-5, 2]],
  down: [[0, 0], [-1, 6], [-3.5, 12], [-6, 11], [-7.5, 8.5], [-8, 6], [-7, 3], [-5, 2]],
  fold: [[0, 0], [-3, -4], [-10, -5.5], [-11, -4], [-10, -2.5], [-8.5, -1], [-7, 0.5], [-5, 1.5]],
  glide: [[0, 0], [-2, -5], [-7, -10], [-10, -9], [-12, -6.5], [-11.5, -3.5], [-9, -1], [-6, 1]],
};
const mixPose = (a, b, u) => a.map(([x, y], i) => [lerp(x, b[i][0], u), lerp(y, b[i][1], u)]);
// flapping until GLIDE, then a glide on spread wings
const FLAPS = 4, GLIDE = 1.5;
function wing(t) {
  t = wrap(t, D);
  if (t < GLIDE) {
    const u = ((t / GLIDE) * FLAPS) % 1;
    // a quick downstroke through the stretched-out middle, a slower upstroke folded close
    if (u < 0.4) {
      const k = ease.inOutSine(u / 0.4);
      return { pts: k < 0.5 ? mixPose(POSE.up, POSE.mid, k * 2) : mixPose(POSE.mid, POSE.down, k * 2 - 1), down: true, u };
    }
    const k = ease.inOutSine((u - 0.4) / 0.6);
    return { pts: k < 0.5 ? mixPose(POSE.down, POSE.fold, k * 2) : mixPose(POSE.fold, POSE.up, k * 2 - 1), down: false, u };
  }
  const g = (t - GLIDE) / (D - GLIDE), into = smooth(0, 0.15, g), out = smooth(0.85, 1, g);
  return { pts: mixPose(mixPose(POSE.up, POSE.glide, into), POSE.up, out), down: false, u: 0 };
}
// the body rises as the wings push down, and sinks a touch through the glide
function lift(t) {
  t = wrap(t, D);
  let y = 0;
  for (let k = 0; k < 6; k++) if (wing(t - k * 0.02).down) y -= 0.45;
  if (t >= GLIDE) y += 2.2 * Math.sin(Math.PI * ((t - GLIDE) / (D - GLIDE)));
  return y + 1.2;
}

const SH = [1, -2];
const wingPts = (w, far) => w.pts.map(([x, y]) => [SH[0] + x - (far ? 1 : 0), SH[1] + y * (far ? 0.85 : 1) - (far ? 1 : 0)]);

function bird(g, C, Br, t, w) {
  g.clear();
  // the far wing, behind the body and in shadow
  g.poly(wingPts(w, true), C[1]);
  // the tail: three feathers fanning as it brakes and lifts
  const tf = 0.25 + 0.35 * Math.sin((t / D) * TAU * 2);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + (i - 1) * tf * 0.5 + 0.1, L = 9 - Math.abs(i - 1);
    g.poly([[-7, -2.4], [-7 + Math.cos(a) * L, -1 + Math.sin(a) * L - 1.2], [-7 + Math.cos(a) * L, -1 + Math.sin(a) * L + 1.2], [-7, 0.6]], i === 0 ? C[3] : C[2]);
  }
  // body and head: a blue back lit from above, a rust breast, a pale belly
  const inBody = (x, y) => ((x + 1) / 8.5) ** 2 + (y / 5.2) ** 2 <= 1 || (x - 6.5) ** 2 + (y + 3) ** 2 <= 4.6 ** 2;
  g.shade(-10, -9, 12, 6, (x, y) => {
    if (!inBody(x, y)) return 0;
    const top = !inBody(x, y - 2.2), under = !inBody(x + 0.5, y + 1.6);
    if (y > -0.5 && x > -2.5) return under ? Br[1] : x > 3 && y < 2 ? Br[3] : Br[2];
    if (y > 1.5) return under ? C[4] : C[5];
    return top ? (x > 2 ? C[5] : C[4]) : y < -3.5 && x > 3 ? C[4] : C[3];
  });
  // beak, eye with a glint, a dark cap stripe
  g.poly([[10.5, -4.5], [14.5, -3], [10.5, -2]], (x, y) => (y < -3 ? BEAK : BEAKD));
  g.set(8, -4, C[0]); g.set(8, -5, C[6]); g.set(9, -4, C[0]);
  g.line(5, -7, 9, -6.5, C[2]);
  // the near wing: lit along its leading edge, the flight feathers splayed at the tips
  const wp = wingPts(w, false);
  const edge = (x, y) => {
    let m = Infinity;
    for (let i = 1; i < 3; i++) {
      const [ax, ay] = wp[i - 1], [bx, by] = wp[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, u = clamp(((x - ax) * dx + (y - ay) * dy) / L2);
      m = Math.min(m, Math.hypot(ax + dx * u - x, ay + dy * u - y));
    }
    return m;
  };
  g.poly(wp, (x, y) => {
    const d = edge(x, y);
    return d < 1.2 ? C[5] : d < 3 ? C[4] : C[3];
  });
  // the flight feathers: dark lines splaying from the wrist to the trailing edge
  for (let i = 3; i < 7; i++) g.line(wp[1][0], wp[1][1], lerp(wp[1][0], wp[i][0], 0.92), lerp(wp[1][1], wp[i][1], 0.92), C[2]);
  g.outline(C[0]);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), Br = fit(o.breast, 4), w = wing(t), y = lift(t);
  const g = GRID;
  // on the downstroke, a see-through echo of the wing a moment before smears the beat
  if (w.down && w.u > 0.1) {
    const s = t - 0.05, ws = wing(s);
    g.clear();
    g.poly(wingPts(ws, false), C[6]);
    g.a.fill(0.42);
    g.draw(p, 1, 0, Math.round(lift(s)));
  }
  bird(g, C, Br, t, w);
  g.draw(p, 1, 0, Math.round(y));
  // a loose feather drifts off and rocks down out of sight
  const fa = wrap(t - 0.45, D);
  if (fa < 1.8) {
    const fx = -6 - 14 * fa - 3 * Math.sin(fa * 5), fy = 4 + 9 * fa + 1.5 * Math.cos(fa * 5) * fa, rock = Math.sin(fa * 5) * 0.8;
    const a = Math.min(1, (1.8 - fa) * 2);
    for (let i = -2; i <= 2; i++) p.dot(fx + i * Math.cos(rock), fy + i * Math.sin(rock) * 0.8, i < 0 ? C[5] : C[4], a);
    p.dot(fx + 2.6 * Math.cos(rock), fy + 2.6 * Math.sin(rock) * 0.8, C[3], a);
  }
  // a little moonlight on its back
  p.glow(2, y - 6, 16, C[5], 0.12);
}
