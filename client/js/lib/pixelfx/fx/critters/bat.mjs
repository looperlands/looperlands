import { fit, hex, mix, clamp, wrap, lerp, sparkle, cycle, TAU } from "../../core/index.mjs";
import { Grid, shift } from "./_lib.mjs";

export const meta = {
  name: "Bat",
  desc: "A bat flaps in four snappy wing frames along a figure-eight, its body lifting on each downbeat, moonlight on its wing bones, red eyes glowing and glinting.",
  tags: ["critter", "bat", "night", "flying", "spooky", "loop"],
  size: [112, 80],
  origin: [56, 40],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "sky",
  options: { palette: ["#0c0912", "#1f1629", "#382645", "#5b3f66", "#866089", "#b88fb0", "#e8cfe0"], eyes: ["#8a1020", "#ff3b30", "#ffb04a", "#fff0c0"], seed: 1 },
};

const D = meta.duration, FLAPS = 6, GRID = new Grid(-24, -22, 48, 40);
// the four wing frames for the right wing: arm angle and length, three fingers' angles and lengths, the lift
const FRAMES = [
  { arm: -58, al: 8, f: [-112, -76, -38], fl: [9, 11, 9], lift: 1 },
  { arm: -18, al: 9, f: [-40, -12, 16], fl: [10, 11, 9], lift: 0 },
  { arm: 28, al: 8, f: [50, 72, 94], fl: [9, 10, 8], lift: -2 },
  { arm: -42, al: 6, f: [-66, -38, -10], fl: [7, 8, 6], lift: -1 },
];
const rad = (d) => (d * Math.PI) / 180;

// figure-eight flight, and which wing frame it's on
function at(t) {
  const a = (t / D) * TAU;
  return { x: 22 * Math.sin(a), y: 7 * Math.sin(2 * a), vx: Math.cos(a) };
}
const frameAt = (t) => Math.floor(wrap((t / D) * FLAPS, 1) * 4) % 4;

function wingPts(F, s) {
  const sh = [s * 2.5, -2], ar = rad(F.arm), wr = [sh[0] + s * Math.cos(ar) * F.al, sh[1] + Math.sin(ar) * F.al];
  const tips = F.f.map((d, i) => [wr[0] + s * Math.cos(rad(d)) * F.fl[i], wr[1] + Math.sin(rad(d)) * F.fl[i]]);
  const pull = (a, b, k) => [lerp((a[0] + b[0]) / 2, wr[0], k), lerp((a[1] + b[1]) / 2, wr[1], k)];
  const hip = [s * 2, 3.5];
  return { sh, wr, tips, hip, poly: [sh, wr, tips[0], pull(tips[0], tips[1], 0.22), tips[1], pull(tips[1], tips[2], 0.22), tips[2], pull(tips[2], hip, 0.38), hip] };
}

function bat(g, C, E, F, t) {
  g.clear();
  // wings: a membrane, darker near the body, lit along the leading edge; finger bones over it
  for (const s of [-1, 1]) {
    const w = wingPts(F, s), lead = (x, y) => {
      const [ax, ay] = w.wr, [bx, by] = w.tips[0], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      return Math.abs(((x - ax) * dy - (y - ay) * dx) / L);
    };
    g.poly(w.poly, (x, y) => {
      const near = Math.hypot(x - w.sh[0], y - w.sh[1]);
      if (lead(x, y) < 1.2 && F.arm < 20) return C[3];
      return near < 4.5 ? C[1] : C[2];
    });
    g.line(w.sh[0], w.sh[1], w.wr[0], w.wr[1], C[4]);
    for (const tip of w.tips) g.line(w.wr[0], w.wr[1], tip[0], tip[1], (u) => (u < 0.6 ? C[4] : C[3]));
    g.set(w.wr[0], w.wr[1] - 1, C[5]);
  }
  // the body: fur lit top-left, a paler belly, big ears with pink insides
  g.ellipse(0, 0.5, 3.8, 4.8, (nx, ny) => (nx * -0.6 + ny * -0.8 > 0.45 ? C[4] : nx * 0.6 + ny * 0.8 > 0.55 ? C[2] : ny > 0.1 && Math.abs(nx) < 0.5 ? C[4] : C[3]));
  for (const s of [-1, 1]) {
    g.poly([[s * 0.6, -3.5], [s * 3.6, -9.5], [s * 3.8, -3]], s < 0 ? C[4] : C[3]);
    g.line(s * 2.6, -4, s * 3.2, -7.5, C[5]);
  }
  // eyes, a snout, two fangs, tucked feet
  g.set(-2, -1, E[1]); g.set(1, -1, E[1]);
  g.set(-1, 0, C[1]); g.set(0, 0, C[1]);
  g.set(-1, 1, C[6]); g.set(0, 1, C[6]);
  g.set(-2, 5, C[3]); g.set(1, 5, C[3]);
  g.outline(C[0]);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), E = fit(o.eyes, 4), S = at(t), fi = frameAt(t), F = FRAMES[fi];
  const X = Math.round(S.x), Y = Math.round(S.y + F.lift);
  // its glowing eyes leave a fading streak of red light along its flight
  for (let k = 2; k <= 16; k++) {
    const A = at(t - (k - 1) * 0.022), B2 = at(t - k * 0.022), u = 1 - k / 17;
    for (const ex of [-1.5, 1.5]) p.glowLine(A.x + ex, A.y - 0.5, B2.x + ex, B2.y - 0.5, 2.6, E[1], 0.16 * u);
  }
  // moonlit dust drifting in the night air
  cycle(t, D, 9, o.seed * 11 + 1, D, (age, L, r) => {
    const x = r.range(-50, 50) + Math.sin(age * 1.1 + r.next() * 6) * 3, y = r.range(-34, 34) + age * r.range(-2, 3);
    const tw = Math.sin(age * 2.6 + r.next() * 6), a = Math.min(1, age * 2, (L - age) * 2) * (0.4 + 0.5 * tw);
    p.dot(x, y, tw > 0.7 ? C[6] : C[5], a);
    if (tw > 0.5) p.glow(x, y, 3, C[5], 0.2 * a);
  });
  const g = GRID;
  // on the downbeat the wings leave a see-through echo of where they just were
  if (fi === 2) {
    bat(g, C, E, FRAMES[1], t);
    g.recolor((x, y, c) => mix(c, C[4], 0.35));
    g.a.fill(0.35);
    g.draw(p, 1, X, Y - FRAMES[1].lift + F.lift);
  }
  bat(g, C, E, F, t);
  g.draw(p, 1, X, Y);
  // moonlight catches the top of the head and wings
  p.glow(X - 3, Y - 6, 10, C[5], 0.12);
  // the eyes glow, and glint now and then
  for (const ex of [-1.5, 1.5]) p.glow(X + ex, Y - 0.5, 7, E[1], 0.6), p.glow(X + ex, Y - 0.5, 2.5, E[2], 0.5);
  p.glow(X, Y, 22, E[0], 0.25);
  for (const g0 of [0.3, 1.5]) {
    const k = (wrap(t - g0, D)) / 0.24;
    if (k < 1) sparkle(p, X - 2, Y - 1, 1 + 2.5 * Math.sin(Math.PI * k), E[3], E[2], 0.4 * Math.sin(Math.PI * k));
  }
}
