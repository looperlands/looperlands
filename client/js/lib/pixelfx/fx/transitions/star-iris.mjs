// The twinkles (spinning glints at the tips, motes shed as it turns) follow Sprite Fusion's open-source sparkle
// (https://www.spritefusion.com/pixel-art-vfx/sparkle), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, PAL, fit, hex, clamp, ease, TAU, WHITE } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, glint, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "Star iris",
  desc: "A five-point star iris spins shut on the middle of the screen, its gold rim lit and its tips twinkling and shedding motes; it closes on a glint and spins open again from a flash.",
  tags: ["iris", "star", "gold", "wipe"],
  duration: 2.2,
  options: { palette: PAL.gold, focus: [160, 96], seed: 1 },
});

const CLOSE = 0.98, OPEN0 = 1.16, OPEN1 = 2.0, RMAX = 430, INNER = 0.46, RW = 4;

// the star at t: its outer radius and its turn
function starAt(t) {
  if (t < CLOSE) return { r: RMAX * (1 - ease.inOutQuad(t / CLOSE)) ** 1.3, a: -Math.PI / 2 + ease.inOutCubic(t / CLOSE) * 1.6 * TAU };
  if (t < OPEN0) return { r: 0, a: 0 };
  const u = clamp((t - OPEN0) / (OPEN1 - OPEN0));
  return { r: RMAX * ease.inOutCubic(u) ** 1.15, a: -Math.PI / 2 - ease.inOutCubic(u) * 1.6 * TAU };
}
const points = (fx, fy, r, a) => Array.from({ length: 10 }, (_, i) => {
  const rr = i % 2 ? r * INNER : r, an = a + (i * Math.PI) / 5;
  return [fx + Math.cos(an) * rr, fy + Math.sin(an) * rr];
});

export function create(o) {
  const C = fit(o.palette, 8), ink = hex(o.color), R = new Rng(o.seed), [fx, fy] = o.focus;
  const ps = new Particles({ rng: R, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  let t = 0, shut = false, opened = false, prev = starAt(0);
  const end = meta.duration - 0.05;
  return {
    update(dt) {
      t += dt;
      const s = starAt(t), pts = points(fx, fy, s.r, s.a), spin = (s.a - prev.a) / dt;
      // the tips shed gold motes as the star turns, flung off along their path
      if (s.r > 2)
        for (let i = 0; i < 10; i += 2) {
          const [x, y] = pts[i];
          if (x < 0 || y < 0 || x >= W || y >= H || !R.chance(0.35)) continue;
          const an = s.a + (i * Math.PI) / 5, v = spin * s.r * 0.25;
          ps.spawn(R.chance(0.6) ? P.STAR : P.MOTE, x, y, -Math.sin(an) * v + Math.cos(an) * 20, Math.cos(an) * v + Math.sin(an) * 20, Math.min(R.range(0.25, 0.55), end - t), R.chance(0.5) ? C[6] : C[5], R.range(0.6, 1.8));
        }
      if (!shut && t >= CLOSE) {
        shut = true;
        lights.add(fx, fy, 60, C[5], 0.7, 0.3);
      }
      if (!opened && t >= OPEN0) {
        opened = true;
        lights.add(fx, fy, 120, C[5], 0.7, 0.4);
        lights.add(fx, fy, 40, WHITE, 0.8, 0.12);
        for (let i = 0; i < 24; i++) {
          const a = R.range(0, TAU), v = R.range(60, 200);
          ps.spawn(P.STAR, fx, fy, Math.cos(a) * v, Math.sin(a) * v, R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 2));
        }
      }
      prev = s;
      ps.update(dt);
      lights.update(dt);
    },
    draw(p0) {
      const p = clipTo(p0), s = starAt(t);
      if (t >= CLOSE && t < OPEN0) rect(p0, 0, 0, W, H, ink);
      else if (s.r < RMAX - 2) {
        const pts = points(fx, fy, s.r, s.a);
        // the dark outside the star, row by row: the star's spans are where the outline crossings pair up
        for (let y = 0; y < H; y++) {
          const yc = y + 0.5, xs = [];
          for (let i = 0, j = 9; i < 10; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if (yi > yc !== yj > yc) xs.push(xi + ((yc - yi) * (xj - xi)) / (yj - yi));
          }
          xs.sort((a, b) => a - b);
          let x = 0;
          for (let k = 0; k + 1 < xs.length; k += 2) {
            const a = clamp(Math.round(xs[k]), 0, W);
            if (a > x) rect(p0, x, y, a - x, 1, ink);
            x = Math.max(x, clamp(Math.round(xs[k + 1]), 0, W));
          }
          if (x < W) rect(p0, x, y, W - x, 1, ink);
        }
        // the gold rim: along each edge, out into the dark, white where it faces the light
        for (let i = 0, j = 9; i < 10; j = i++) {
          const [ax, ay] = pts[j], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
          if (L < 0.5) continue;
          const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux; // outward for this winding
          const lit = nx * -0.6 + ny * -0.8 > 0.1;
          for (let sx = 0; sx <= L; sx += 0.5) {
            const x0 = ax + ux * sx, y0 = ay + uy * sx;
            if (x0 < -RW || y0 < -RW || x0 > W + RW || y0 > H + RW) continue;
            for (let d = 0; d < RW; d += 0.5) {
              const c = d < 1 ? (lit ? WHITE : C[6]) : d < 2 ? C[5] : d < 3 ? C[4] : C[3];
              p.px(x0 + nx * d, y0 + ny * d, c);
            }
            if (sx % 2 === 0) p.light(x0, y0, C[5], 0.5);
          }
        }
        // twinkles on the tips, and light pooling in the star as it closes
        for (let i = 0; i < 10; i += 2) {
          const [x, y] = pts[i];
          if (x < 2 || y < 2 || x > W - 2 || y > H - 2) continue;
          glint(p, x, y, 5 + 3 * Math.sin(t * 13 + i), t * 2 + i, C[6], C[5]);
        }
        if (s.r < 140) p.glow(fx, fy, s.r * 0.7 + 8, C[5], 0.35 * (1 - s.r / 140));
      }
      // shutting: a glint where it closed; opening: a flash
      const u = t - CLOSE;
      if (u > -0.05 && u < 0.2) glint(p, fx, fy, 14 * (1 - Math.abs(u) / 0.2), u * 4, C[6], C[5]);
      const v = t - OPEN0;
      if (v >= 0 && v < 0.16) glint(p, fx, fy, 18 * (1 - v / 0.16), 0.3 - v * 5, C[6], C[5]), p.glow(fx, fy, 50, WHITE, 0.5 * (1 - v / 0.16));
      ps.draw(p);
      lights.draw(p);
    },
  };
}
