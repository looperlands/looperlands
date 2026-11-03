// The flutter (a swing that slows at its ends, a tilt that follows it, a paper flip that shows the back) adapts
// Sprite Fusion's open-source falling leaves (https://www.spritefusion.com/pixel-art-vfx/falling-leaves),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, seg, ease, TAU, WHITE, hex, scale, mix } from "../../core/index.mjs";

export const meta = {
  name: "Confetti",
  desc: "Two party poppers bang one after the other: paper bits and curly streamers burst out, stall, then tumble and flutter down, flipping, and settle on the floor.",
  tags: ["ui", "celebration", "confetti", "party", "reward", "one-shot"],
  size: [200, 140],
  origin: [100, 126],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#ff4a5a", "#ff9a2a", "#ffe03c", "#5ad84a", "#3cc8ff", "#7a6cff", "#f53cd1"], seed: 11 },
};

const POPPERS = [
  { x: -74, y: -1, a: -Math.PI / 2 + 0.62, t: 0.1 },
  { x: 74, y: -1, a: -Math.PI / 2 - 0.62, t: 0.26 },
];
const INK = hex("#141019");

// a party popper: a striped cone pointing along a, kicked back k px when it fires
function popper(p, x, y, a, k, C, alpha) {
  const ca = Math.cos(a), sa = Math.sin(a), bx = x - ca * k, by = y - sa * k;
  p.shade(bx - 12, by - 12, bx + 12, by + 12, (px, py, o) => {
    const dx = px - bx, dy = py - by, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    // u along the cone (0 at its tip on the floor, 11 at its mouth), v across
    if (u < 0 || u > 11) return;
    const hw = 0.8 + u * 0.32;
    if (Math.abs(v) > hw + 0.6) return;
    o.a = alpha;
    if (Math.abs(v) > hw - 0.4 || u > 10.2 || u < 0.8) return INK;
    const stripe = Math.floor((u + v * 0.6) / 2.2) % 2 === 0;
    return stripe ? (v < 0 ? C[2] : scale(C[2], 0.75)) : v < 0 ? WHITE : hex("#c8c0d8");
  });
}

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: ["#ffffff", "#fff3a6", "#ffc23d", "#ff8a2a"] }), lights = new Lights();
  const bits = [], ribbons = [], fired = [false, false], end = meta.duration - 0.05;
  const kick = (t, pp) => (t < pp.t ? 0 : 3 * Math.exp(-(t - pp.t) * 14));

  function fire(pp) {
    const mx = pp.x + Math.cos(pp.a) * 11, my = pp.y + Math.sin(pp.a) * 11;
    lights.add(mx, my, 34, WHITE, 0.6, 0.12);
    lights.add(mx, my, 50, C[2], 0.4, 0.4);
    for (let i = 0; i < 6; i++) ps.spawn(P.SMOKE, mx, my, Math.cos(pp.a) * R.range(20, 60) + R.range(-10, 10), Math.sin(pp.a) * R.range(20, 60), R.range(0.6, 1), hex("#5d5660"), R.range(2.5, 4));
    for (let i = 0; i < 12; i++) {
      const an = pp.a + R.range(-0.5, 0.5), sp = R.range(120, 260);
      ps.spawn(P.SPARK, mx, my, Math.cos(an) * sp, Math.sin(an) * sp, R.range(0.1, 0.25));
    }
    // paper: thrown hard up the cone, the air soon stalls it
    for (let i = 0; i < 46; i++) {
      const an = pp.a + R.range(-0.38, 0.38), sp = R.range(200, 380);
      bits.push({ x: mx, y: my, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, c: R.pick(C), w: R.range(2, 3), h: R.range(3, 4.6), ang: R.range(0, TAU), spin: R.range(-14, 14), flip: R.range(0, TAU), fs: R.range(5, 13), ph: R.range(0, TAU), amp: R.range(5, 12), fw: R.range(2, 3.4), x0: 0, mode: 0, rest: 0, fall: R.range(26, 40) });
    }
    // streamers: a head that flies like the paper, a tail that follows it and curls
    for (let i = 0; i < 4; i++) {
      const an = pp.a + R.range(-0.25, 0.25), sp = R.range(220, 330), n = 11;
      ribbons.push({ pts: Array.from({ length: n }, () => [mx, my]), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, c: R.pick(C), ph: R.range(0, TAU), amp: R.range(6, 12), fw: R.range(1.5, 2.4), mode: 0, x0: 0, curl: R.range(0.7, 1.1), fall: R.range(22, 32) });
    }
  }

  let t = 0;
  return {
    update(dt) {
      t += dt;
      POPPERS.forEach((pp, i) => !fired[i] && t >= pp.t && ((fired[i] = true), fire(pp)));
      for (const b of bits) {
        if (b.mode === 2) {
          b.rest += dt;
          continue;
        }
        b.flip += b.fs * dt;
        if (b.mode === 0) {
          // the burst: heavy drag, a little gravity, tumbling fast; once slow it starts to flutter
          b.vx -= b.vx * 3.4 * dt;
          b.vy -= b.vy * 3.4 * dt - 140 * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.ang += b.spin * dt;
          if (Math.hypot(b.vx, b.vy) < 40) (b.mode = 1), (b.x0 = b.x - Math.sin(b.ph) * b.amp);
        } else {
          b.ph += b.fw * dt;
          b.x0 += b.vx * dt;
          b.vx -= b.vx * 2 * dt;
          b.x = b.x0 + Math.sin(b.ph) * b.amp;
          b.y += b.fall * (0.4 + 0.9 * Math.abs(Math.cos(b.ph))) * dt;
          b.ang = Math.cos(b.ph) * 0.9;
          if (b.y >= -1) (b.y = -0.5), (b.mode = 2), (b.ang = R.range(-0.3, 0.3)), (b.flip = 0);
        }
      }
      for (const r of ribbons) {
        const h = r.pts[0];
        if (r.mode === 0) {
          r.vx -= r.vx * 3 * dt;
          r.vy -= r.vy * 3 * dt - 120 * dt;
          h[0] += r.vx * dt;
          h[1] += r.vy * dt;
          if (Math.hypot(r.vx, r.vy) < 35) (r.mode = 1), (r.x0 = h[0] - Math.sin(r.ph) * r.amp);
        } else if (h[1] < -1) {
          r.ph += r.fw * dt;
          r.x0 += r.vx * dt;
          r.vx -= r.vx * 2 * dt;
          h[0] = r.x0 + Math.sin(r.ph) * r.amp;
          h[1] += r.fall * (0.5 + 0.7 * Math.abs(Math.cos(r.ph))) * dt;
        }
        // the tail follows the head link by link and hangs a little
        for (let i = 1; i < r.pts.length; i++) {
          const a = r.pts[i - 1], b = r.pts[i];
          b[1] = Math.min(-0.5, b[1] + 20 * dt);
          const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
          if (d > 2.6) (b[0] = a[0] + (dx / d) * 2.6), (b[1] = a[1] + (dy / d) * 2.6);
        }
      }
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      ps.draw(p, "back");
    },

    draw(p) {
      const fade = 1 - seg(t, end - 0.45, end - 0.05);
      for (const pp of POPPERS) {
        const k = kick(t, pp);
        popper(p, pp.x, pp.y, pp.a, k, C, 1 - seg(t, 2.5, 2.9));
        const ft = t - pp.t;
        if (ft > 0 && ft < 0.12) sparkle(p, pp.x + Math.cos(pp.a) * 13, pp.y + Math.sin(pp.a) * 13, 7 * (1 - ft / 0.12), WHITE, C[2], 0.7);
      }
      // streamers: a two-tone ribbon that curls along its length
      for (const r of ribbons) {
        const pts = r.pts.map(([x, y], i) => [x + Math.sin(i * r.curl + t * 9 + r.ph) * (i ? 1.6 : 0), y]);
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], front = Math.sin(i * r.curl + t * 9 + r.ph) > 0;
          p.line(x0, y0, x1, y1, front ? r.c : scale(r.c, 0.6), fade);
          p.line(x0 + 1, y0, x1 + 1, y1, front ? mix(r.c, WHITE, 0.35) : scale(r.c, 0.45), fade);
        }
      }
      // paper bits: a little card turned by its tilt, its width by its flip; the back side shows darker
      for (const b of bits) {
        if (b.y > 1) continue;
        const fw = b.mode === 2 ? 1 : Math.cos(b.flip), w = Math.max(0.5, Math.abs(fw) * b.w), ca = Math.cos(b.ang), sa = Math.sin(b.ang);
        const c = fw >= 0 ? b.c : scale(b.c, 0.62), a = fade;
        if (b.mode === 2) {
          p.dot(b.x, b.y, scale(b.c, 0.8), a);
          p.dot(b.x + 1, b.y, scale(b.c, 0.6), a);
          continue;
        }
        p.shade(b.x - 4, b.y - 4, b.x + 4, b.y + 4, (x, y, out) => {
          const dx = x - b.x, dy = y - b.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
          if (Math.abs(u) > w / 2 + 0.2 || Math.abs(v) > b.h / 2) return;
          out.a = a;
          return Math.abs(fw) > 0.92 && v < -b.h / 2 + 1 ? WHITE : c;
        });
        // it catches the light as it turns face-on
        if (Math.abs(fw) > 0.97) p.glow(b.x, b.y, 5, mix(b.c, WHITE, 0.5), 0.35 * fade);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
