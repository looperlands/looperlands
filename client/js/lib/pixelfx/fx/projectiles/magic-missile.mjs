// The gathering motes, star particles and burst flare follow Sprite Fusion's open-source energy bolt
// (https://www.spritefusion.com/pixel-art-vfx/energy), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, flare, sparkle, clamp, smooth, ease, TAU, WHITE } from "../../core/index.mjs";

export const meta = {
  name: "Magic missile",
  desc: "Motes gather into an arcane orb at a hand `height` px above the floor (the origin); it weaves to its target trailing a twisting ribbon and bursts into a star of light.",
  tags: ["projectile", "magic", "arcane", "missile", "spell", "directional", "one-shot"],
  size: [208, 112],
  origin: [24, 104],
  duration: 1.9,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#140a26", "#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"], height: 26, reach: 112, seed: 6 },
};

const CHARGE = 0.2, FLY = 0.62;

export function create(o) {
  const C = fit(o.palette, 8), H = o.height, X1 = o.reach, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  // the path: out of the hand, weaving up and down twice, homing in on the target at the same height
  const pos = (u) => [X1 * ease.inOutSine(u) + Math.sin(u * Math.PI) * 6, -H + Math.sin(u * TAU * 1.5) * 9 * Math.sin(u * Math.PI)];
  let t = 0, burst = false;
  const trail = [];
  return {
    update(dt) {
      t += dt;
      if (t < CHARGE) {
        // motes spiral in to the hand
        if (R.chance(0.8)) {
          const a = R.range(0, TAU), d = R.range(12, 26), sp = d / 0.14;
          ps.spawn(P.MOTE, Math.cos(a) * d, -H + Math.sin(a) * d, -Math.cos(a) * sp - Math.sin(a) * sp * 0.5, -Math.sin(a) * sp + Math.cos(a) * sp * 0.5, 0.14, R.pick([C[5], C[6], WHITE]), 0.8);
        }
      } else if (t < CHARGE + FLY) {
        const u = (t - CHARGE) / FLY, [x, y] = pos(u);
        trail.push({ x, y, t });
        if (R.chance(0.6)) ps.spawn(P.MOTE, x, y, R.range(-50, 50), R.range(-50, 50), R.range(0.2, 0.4), R.pick([C[4], C[5], C[6]]), 0.7);
        if (R.chance(0.25)) ps.spawn(P.STAR, x + R.range(-3, 3), y + R.range(-3, 3), R.range(-10, 10), R.range(-10, 10), R.range(0.25, 0.5), C[6], R.range(0.6, 1.6));
      } else if (!burst) {
        burst = true;
        const y = -H;
        lights.add(X1, y, 52, C[4], 0.95, 0.55);
        lights.add(X1, y, 22, WHITE, 0.8, 0.12);
        for (let i = 0; i < 26; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 150) * (1 - 0.65 * Math.max(0, Math.sin(a)));
          ps.spawn(i % 3 ? P.MOTE : P.STAR, X1, y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.45), R.pick([C[5], C[6], WHITE]), R.range(0.8, 1.8));
        }
        for (let i = 0; i < 18; i++) {
          const a = R.range(0, TAU), sp = R.range(110, 240) * (1 - 0.5 * Math.max(0, Math.sin(a)));
          ps.spawn(P.SPARK, X1, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.12, 0.3));
        }
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), d = R.range(4, 22);
          ps.spawn(P.STAR, X1 + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0, -R.range(2, 8), R.range(0.5, 1.1), R.pick([C[6], WHITE, C[5]]), R.range(0.8, 2.6), R.range(0.05, 0.45));
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      // the ribbon: a strip that twists as it trails the orb, its bright face and its dark back taking turns,
      // fading from the tail
      const now = t, keep = trail.filter((q) => now - q.t < 0.32);
      for (let i = 1; i < keep.length; i++) {
        const a = keep[i - 1], b = keep[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        for (let f = 0; f < 1; f += 0.5 / l) {
          const tt = a.t + (b.t - a.t) * f, k = 1 - (now - tt) / 0.32, tw = Math.sin(tt * 26), w = 3.2 * k * Math.abs(tw) + 0.4, face = tw > 0;
          const x = a.x + dx * f, y = a.y + dy * f;
          for (let s = -w; s <= w; s += 0.5) {
            const edge = Math.abs(s) > w - 0.8, c = face ? (edge ? C[6] : k > 0.6 ? C[5] : C[4]) : edge ? C[4] : C[2];
            p.dot(x + nx * s, y + ny * s, c, k > 0.35 ? 1 : k / 0.35);
          }
        }
        if (i % 3 === 0) p.glow(b.x, b.y, 6, C[4], 0.25 * (1 - (now - b.t) / 0.32));
      }
      ps.draw(p);
      // the orb: gathering at the hand, then flying, its heart white, a ring of light turning round it
      if (t < CHARGE + FLY) {
        const k = t < CHARGE ? t / CHARGE : 1, [x, y] = t < CHARGE ? [0, -H] : pos((t - CHARGE) / FLY), r = 1 + 3 * ease.outBack(k);
        p.circle(x, y, r + 1.4, C[3]);
        p.circle(x, y, r + 0.4, C[5]);
        p.circle(x - 0.4, y - 0.4, r * 0.55, WHITE);
        for (let i = 0; i < 3; i++) {
          const a = t * 14 + (i * TAU) / 3;
          p.px(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3) * 0.6, i ? C[6] : WHITE);
        }
        p.glow(x, y, 20, C[4], 0.65 * k);
        p.glow(x, y, 7, C[6], 0.5 * k);
      }
      // the burst: a star flare and a ring that open out and fade
      const q = t - CHARGE - FLY;
      if (q >= 0 && q < 0.5) {
        const e = q / 0.5;
        if (e < 0.5) flare(p, X1, -H, 26 * Math.pow(1 - e * 2, 1.2) + 2, 1 - e * 2, C);
        if (e < 0.12) p.circle(X1, -H, 6 * (1 - e / 0.12) + 1, WHITE);
        p.ring(X1, -H, 4 + 20 * ease.outCubic(e), Math.max(1, 2.5 * (1 - e)), e < 0.3 ? C[6] : C[5], Math.min(1, (1 - e) * 1.5));
        if (e < 0.4) sparkle(p, X1, -H, 7 * (1 - e / 0.4), C[6], C[4], 0.6 * (1 - e / 0.4));
      }
      lights.draw(p);
      void clamp, smooth;
    },
  };
}
