// The swirl's texture (streaks laid along a differentially wound flow, light on the brightest pixels) is adapted
// from Sprite Fusion's open-source black hole (https://www.spritefusion.com/pixel-art-vfx/black-hole), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, cycle, clamp, smooth, TAU, WHITE } from "../../core/index.mjs";
import { WATER } from "./_lib.mjs";

export const meta = {
  name: "Whirlpool",
  desc: "Seen from above, dark water winds into a vortex: foam arms spiral in, darkening as they're drawn down into a deep eye with a lit far rim, flecks of foam circling in after them.",
  tags: ["water", "whirlpool", "vortex", "maelstrom", "swirl", "top-down", "loop"],
  size: [128, 84],
  origin: [64, 42],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: WATER, seed: 5 },
};

const D = meta.duration, R = 60, SY = 0.6, K = 2.4, EYE = 0.16;

// the flow at radius rho (0 eye, 1 rim), angle th: thin streaks of foam laid along a log spiral that turns once a
// loop (a turning log spiral reads as water drawn inward), dashed and brightest where two sets of streaks cross
function foam(rho, th, ph) {
  const s = Math.log(Math.max(rho, 0.02)), a = th + K * s + ph * TAU, b = th + K * 1.35 * s + ph * TAU * 2;
  const one = Math.pow(0.5 + 0.5 * Math.cos(7 * a + 0.9 * Math.sin(3 * a + s * 4)), 26);
  const two = Math.pow(0.5 + 0.5 * Math.cos(11 * b + 1.3), 34) * 0.7;
  // finer streaks crowd in near the eye, where the water runs fastest
  const three = Math.pow(0.5 + 0.5 * Math.cos(17 * (th + K * 0.8 * s + ph * TAU * 3)), 30) * 0.8 * Math.max(0, 1 - (rho - EYE) * 2.2);
  const dash = 0.55 + 0.45 * Math.sin(s * 22 - ph * TAU * 4 + a * 2);
  return (one + two + three) * dash;
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, ry = R * SY;
  p.shade(-R, -ry, R, ry, (x, y, out) => {
    const dx = x / R, dy = y / ry, rho = Math.hypot(dx, dy);
    if (rho > 1) return;
    const th = Math.atan2(dy, dx);
    // the eye: a hole down into the dark, its far wall lit, a ring of foam racing round its lip
    if (rho < EYE) {
      const far = -dy / rho;
      // the far wall of the funnel, lit, falling off into the dark below the lip on the near side
      const wall = (rho / EYE - 0.35) / 0.65;
      if (far > 0) out.c = wall > 0.8 ? (far > 0.6 ? C[5] : C[4]) : wall > 0.45 ? C[3] : wall > 0.15 ? C[2] : C[0];
      else out.c = wall > 0.85 && far > -0.5 ? C[2] : C[0];
      return;
    }
    const k = (rho - EYE) / (1 - EYE), fade = 1 - smooth(0.62, 1, k);
    // dark see-through water, darker toward the eye, a faint sheen mid-way
    p.blend(x, y, k < 0.25 ? C[0] : C[1], (0.75 - 0.25 * k) * (1 - smooth(0.8, 1, k)));
    if (k > 0.3 && k < 0.8) p.blend(x, y, C[2], 0.18 * Math.sin(Math.PI * (k - 0.3) / 0.5));
    // the foam ring round the eye
    if (k < 0.035) {
      const g = 0.5 + 0.5 * Math.cos(th * 9 - ph * TAU * 6);
      out.c = g > 0.7 ? WHITE : g > 0.3 ? C[6] : C[4];
      return;
    }
    const I = foam(rho, th, ph) * fade * Math.min(1, (k - 0.08) * 4) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, k * 1.25)));
    if (I > 0.12) {
      out.c = I > 0.75 ? WHITE : I > 0.45 ? C[6] : I > 0.25 ? C[5] : C[4];
      if (I > 0.25) (out.l = C[5]), (out.k = 0.08 + 0.14 * Math.min(1, I));
    }
  });
  // flecks of foam drawn round and in along the arms, each a short streak along its path
  cycle(t, D, 30, o.seed, (g) => g.range(1.2, 2.2), (age, life, r) => {
    const u = age / life, rho = 0.8 - 0.62 * u * u, a0 = r.range(0, TAU), th = a0 - K * Math.log(rho);
    const ang = th - age * (1.5 + 2.2 / rho), x = Math.cos(ang) * rho * R, y = Math.sin(ang) * rho * ry;
    const ang2 = ang + 0.12 / rho, x2 = Math.cos(ang2) * rho * R, y2 = Math.sin(ang2) * rho * ry;
    if (u > 0.85 && r.next() < (u - 0.85) * 6) return;
    p.line(x2, y2, x, y, u < 0.2 ? C[5] : u < 0.6 ? WHITE : C[6]);
  });
  // glints winking on the foam
  cycle(t, D, 8, o.seed + 3, (g) => g.range(0.25, 0.45), (age, life, r) => {
    const rho = r.range(0.35, 0.8), th = r.range(0, TAU) - age * 2.5, k = Math.sin((Math.PI * age) / life);
    const x = Math.cos(th) * rho * R, y = Math.sin(th) * rho * ry;
    if (foam(rho, th, ph) < 0.35) return;
    p.px(x, y, WHITE);
    if (k > 0.55) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
    p.glow(x, y, 5, C[5], 0.4 * k);
  });
  // light: a cool sheen on the swirl, a glow off the eye's lit rim
  p.glow(0, 0, R * 0.9, C[4], 0.2);
  p.glow(0, 0, R * EYE * 1.6 + 6, C[5], 0.28);
  p.glow(0, -ry * EYE * 0.8, 14, C[5], 0.32);
}
