// The motes drifting in the light and the glints follow Sprite Fusion's open-source holy-light and sparkle
// (https://www.spritefusion.com/pixel-art-vfx/sparkle), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, hex, clamp, smooth, ease, TAU, WHITE } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, glint, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "Iris",
  desc: "A lit iris closes onto a warm spotlight where dust drifts, holds as its rim twinkles, snaps shut into a glint, then pops open from a flash with a white-hot rim throwing sparks.",
  tags: ["iris", "circle", "spotlight", "wipe"],
  duration: 2.2,
  options: { palette: ["#1c140c", "#3b2a18", "#6e5233", "#a8875a", "#d9bd8a", "#f3e2bd", "#fff7e8", "#ffffff"], focus: [160, 100], seed: 1 },
});

const D = meta.duration, CLOSE = 0.62, SNAP = 0.9, SHUT = 0.99, POP = 1.2, OPEN = 1.75, RS = 24, RW = 5, GLO = 16;

export function create(o) {
  const C = fit(o.palette, 8), ink = hex(o.color), R = new Rng(o.seed), [fx, fy] = o.focus;
  const R0 = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - fx, y - fy))) + RW + 2;
  const ps = new Particles({ rng: R, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  // the hole's radius: closing, breathing on the spotlight, snapping shut; then popping open
  const radius = (t) =>
    t < CLOSE ? RS + (R0 - RS) * (1 - ease.inOutCubic(t / CLOSE))
      : t < SNAP ? RS + Math.sin((t - CLOSE) * 22) * 0.8 * (1 - (t - CLOSE) / (SNAP - CLOSE))
        : t < SHUT ? RS * (1 - ease.inCubic((t - SNAP) / (SHUT - SNAP)))
          : t < POP ? 0 : R0 * ease.outQuart(clamp((t - POP) / (OPEN - POP)));
  let t = 0, shut = false, popped = false, prevR = R0;
  const end = D - 0.05;
  return {
    update(dt) {
      t += dt;
      const r = radius(t);
      // dust drifts up through the spotlight while it holds
      if (t > CLOSE - 0.25 && t < SNAP && R.chance(0.25)) {
        const a = R.range(0, TAU), d = Math.sqrt(R.next()) * r * 0.9;
        ps.spawn(P.EMBER, fx + Math.cos(a) * d, fy + Math.sin(a) * d, R.range(-6, 6), -R.range(4, 14), R.range(0.4, 0.8), 0, 1);
      }
      // the rim twinkles as it holds
      if (t > CLOSE - 0.1 && t < SNAP && R.chance(0.3)) {
        const a = R.range(0, TAU);
        ps.spawn(P.STAR, fx + Math.cos(a) * (r + 1), fy + Math.sin(a) * (r + 1), 0, 0, R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.4));
      }
      if (!shut && t >= SHUT) {
        shut = true;
        lights.add(fx, fy, 50, C[5], 0.7, 0.3);
      }
      if (!popped && t >= POP) {
        // pop: a white flash, sparks thrown out of the opening
        popped = true;
        lights.add(fx, fy, 140, C[5], 0.7, 0.45);
        lights.add(fx, fy, 50, WHITE, 0.9, 0.12);
        for (let i = 0; i < 40; i++) {
          const a = R.range(0, TAU), v = R.range(150, 420);
          ps.spawn(P.SPARK, fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v, R.range(0.2, 0.5));
        }
      }
      // as the rim races out it sheds glinting motes that fly on and fade
      if (t > POP && t < OPEN - 0.1) {
        const vr = (r - prevR) / dt;
        for (let k = 0; k < 2; k++) {
          if (!R.chance(0.6)) continue;
          const a = R.range(0, TAU), x = fx + Math.cos(a) * r, y = fy + Math.sin(a) * r;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          ps.spawn(P.MOTE, x, y, Math.cos(a) * vr * 0.35, Math.sin(a) * vr * 0.35, Math.min(R.range(0.2, 0.45), end - t), R.chance(0.5) ? C[6] : C[5], 0.7);
        }
      }
      prevR = r;
      ps.update(dt);
      lights.update(dt);
    },
    draw(p0) {
      const p = clipTo(p0), r = radius(t);
      // the rim's heat: warm while it closes, white-hot as it pops, cooling as it opens
      const hot = t >= POP ? 1 - smooth(POP, OPEN, t) : t < SNAP ? 0.45 + 0.25 * smooth(CLOSE - 0.2, CLOSE, t) : 0.7;
      const rw = RW + (t >= POP ? 3 * hot : 0);
      if (t < OPEN + 0.05 && !(t >= SHUT && t < POP && r <= 0)) {
        for (let y = 0; y < H; y++) {
          const dy = y + 0.5 - fy, xo = Math.sqrt(Math.max(0, (r + rw) ** 2 - dy * dy)), xi = Math.abs(dy) < r ? Math.sqrt(r * r - dy * dy) : 0;
          if (xo <= 0) {
            rect(p0, 0, y, W, 1, ink);
            continue;
          }
          const a0 = clamp(Math.floor(fx - xo), 0, W), b1 = clamp(Math.ceil(fx + xo), 0, W);
          if (a0 > 0) rect(p0, 0, y, a0, 1, ink);
          if (b1 < W) rect(p0, b1, y, W - b1, 1, ink);
          // the rim band and the light just inside it
          const g = r > GLO ? Math.sqrt(Math.max(0, (r - GLO) ** 2 - dy * dy)) : 0;
          for (let x = a0; x < b1; x++) {
            const dx = x + 0.5 - fx;
            if (Math.abs(dx) < g) continue;
            const d = Math.hypot(dx, dy) - r;
            if (d >= 0) {
              // a bevel lit from the top left: bright there, a step darker round the far side
              const q = d / rw, lit = 0.5 - 0.5 * (dx * 0.7 + dy * 0.7) / (r + d + 0.01), h = hot * (0.55 + 0.6 * lit);
              p0.px(x, y, q >= 1 ? ink : q < 0.2 ? (h > 0.5 ? WHITE : h > 0.3 ? C[6] : C[5]) : q < 0.4 ? (h > 0.38 ? C[6] : C[5]) : q < 0.65 ? (h > 0.3 ? C[5] : C[4]) : q < 0.85 ? C[3] : C[2]);
              if (q < 0.5) p0.light(x, y, C[5], 0.45 * h * (1 - q * 2));
            } else if (d > -GLO) p0.light(x, y, C[5], (0.18 + 0.3 * hot) * (1 + d / GLO) ** 2);
          }
        }
      } else if (t >= SHUT && t < POP) rect(p0, 0, 0, W, H, ink);
      // the spotlight's pool of light, gathering as the iris closes, hottest at its heart
      if (r > 0 && r < 80 && t < SHUT) {
        const k = 1 - r / 80;
        p.glow(fx, fy, r * 1.15 + 6, C[5], 0.18 + 0.32 * k);
        p.glow(fx, fy, r * 0.6 + 3, C[6], 0.25 * k);
      }
      // light catches the iris as it turns: a glint runs once round the rim while it closes
      if (t > 0.08 && t < SNAP) {
        const a = -2.4 + ((t - 0.08) / (SNAP - 0.08)) * TAU, gx = fx + Math.cos(a) * (r + 1), gy = fy + Math.sin(a) * (r + 1);
        if (gx > 2 && gy > 2 && gx < W - 2 && gy < H - 2) glint(p, gx, gy, 7 + 3 * Math.sin(t * 9), t * 3, C[6], C[5], 0.9);
      }
      // snapping shut: the light collapses into a glint that lingers in the dark
      const s = t - SHUT;
      if (s > -0.06 && s < 0.22) glint(p, fx, fy, 14 * (1 - Math.abs(s + 0.01) / 0.23), s * 4, C[6], C[5]);
      // popping open: a flash at the heart
      const u = t - POP;
      if (u >= 0 && u < 0.18) glint(p, fx, fy, 20 * (1 - u / 0.18), 0.4 - u * 3, C[6], C[5]), p.glow(fx, fy, 60, WHITE, 0.6 * (1 - u / 0.18));
      ps.draw(p);
      lights.draw(p);
    },
  };
}
