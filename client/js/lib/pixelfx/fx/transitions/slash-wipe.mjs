// The cut's tapered smear (white at the rim, cooling down the ramp with age), the dotted trace it leaves, the
// tip glint, the sparks off the end and the shavings flung off the line are adapted from Sprite Fusion's
// open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, hex, clamp, smooth, ease, sparkle, WHITE } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, fillConvex, halfPlane, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "Slash wipe",
  desc: "A white-hot blade edge slices across the screen, light ahead of it and sparks spraying back over the cover; a second cut flashes through and the cover splits apart.",
  tags: ["slash", "blade", "cut", "sparks", "wipe"],
  duration: 1.7,
  options: {
    palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8c9e8", "#e8f1ff", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    seed: 2,
  },
});

const D = meta.duration, SL = 0.55, CS = 1 / Math.hypot(1, SL), HALO = 18;
const T0 = 0.06, SWEEP = 0.62, E0 = -(H / 2) * SL - 4, E1 = W + (H / 2) * SL + 24;
const CUT = 0.84, CSW = 0.07, CHOLD = 0.05, CTRAIL = 0.12, SLIP = CUT + 0.12, SPLIT = CUT + CSW + CHOLD + CTRAIL;

// the blade edge: x where it crosses row y, and how fast it's moving
const edgeAt = (t) => E0 + (E1 - E0) * ease.outCubic(clamp((t - T0) / SWEEP));
const speedAt = (t) => (t < T0 || t > T0 + SWEEP ? 0 : ((E1 - E0) * 3 * (1 - (t - T0) / SWEEP) ** 2) / SWEEP);
const xAt = (e, y) => e + (H / 2 - y) * SL;

export function create(o) {
  const C = fit(o.palette, 8), ink = hex(o.color), R = new Rng(o.seed), n = C.length;
  const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
  // the second cut: a "\\" through the middle, from where it enters the screen to where it leaves
  const th = R.range(0.42, 0.56), ux = Math.cos(th), uy = Math.sin(th), nx = uy, ny = -ux;
  const cx = W / 2 + R.range(-24, 24), cy = H / 2 + R.range(-10, 10);
  // the halves overhang the screen a little, so slipping along the cut never uncovers an edge
  const area = [[-24, -24], [W + 24, -24], [W + 24, H + 24], [-24, H + 24]];
  const ends = [-1, 1].map((s) => {
    // walk out along the cut until it leaves the screen
    let lo = 0, hi = 400;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2, x = cx + s * ux * m, y = cy + s * uy * m;
      if (x >= 0 && x <= W && y >= 0 && y <= H) lo = m;
      else hi = m;
    }
    return [cx + s * ux * lo, cy + s * uy * lo];
  });
  const [A, B] = ends, LC = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const halves = [1, -1].map((s) => {
    const pts = halfPlane(area, cx, cy, s * nx, s * ny);
    let mx = 0, my = 0;
    for (const [x, y] of pts) (mx += x / pts.length), (my += y / pts.length);
    return { s, pts, mx, my, spin: s * R.range(0.5, 0.9) };
  });
  let t = 0, acc = 0, entered = false, tipped = false, split = false;
  const end = D - 0.05;

  // where a half of the cover is: it slips along the cut, then the halves fly apart, turning a little
  const placeOf = (hf) => {
    const slip = 5 * ease.outCubic(clamp((t - SLIP) / 0.12)) * (hf.s > 0 ? 1 : -0.4), u = Math.max(0, t - SPLIT);
    const sep = 30 * u + 0.5 * 1500 * u * u, rot = hf.spin * u * u;
    return { dx: ux * slip + hf.s * nx * sep, dy: uy * slip + hf.s * ny * sep, rot, sep };
  };
  const moved = (hf, pl, [x, y]) => {
    const c = Math.cos(pl.rot), s = Math.sin(pl.rot), lx = x - hf.mx, ly = y - hf.my;
    return [hf.mx + lx * c - ly * s + pl.dx, hf.my + lx * s + ly * c + pl.dy];
  };

  return {
    update(dt) {
      t += dt;
      // the blade grinds through: sparks spray back over the cover, shavings flake off, light rides the edge
      const sp = speedAt(t), e = edgeAt(t);
      if (!entered && t >= T0) {
        entered = true;
        lights.add(4, 4, 60, C[5], 0.6, 0.25);
      }
      // in bursts: each a fountain of sparks off one spot where the edge bites
      for (acc += sp * dt * 0.035; acc > 1; acc--) {
        const y = R.range(4, H - 4), x = xAt(e, y) - 1, a0 = Math.PI + R.range(-0.1, 0.6), n = R.int(5, 10);
        if (x < 0 || x >= W) continue;
        for (let i = 0; i < n; i++) {
          const a = a0 + R.range(-0.75, 0.75), v = R.range(0.2, 1) * (140 + 0.22 * sp);
          ps.spawn(P.SPARK, x, y + R.range(-2, 2), Math.cos(a) * v, Math.sin(a) * v, R.range(0.15, 0.4));
          if (R.chance(0.4)) ps.spawn(P.MOTE, x, y, Math.cos(a) * v * 0.45, Math.sin(a) * v * 0.45 - 20, R.range(0.2, 0.5), R.chance(0.5) ? C[6] : C[5], 0.7);
        }
        lights.add(x, y, R.range(30, 46), C[5], 0.35, 0.14);
      }
      // the second cut lands: a glint at its end, sparks thrown on along it, shavings off its length
      if (!tipped && t >= CUT + CSW) {
        tipped = true;
        for (let i = 0; i < 12; i++) {
          const a = Math.atan2(uy, ux) + R.range(-0.5, 0.5), v = R.range(150, 400);
          ps.spawn(P.SPARK, B[0] - ux * 2, B[1] - uy * 2, Math.cos(a) * v, Math.sin(a) * v, R.range(0.12, 0.35));
        }
        for (let i = 0; i < 18; i++) {
          const k = R.range(0.1, 1), x = A[0] + (B[0] - A[0]) * k, y = A[1] + (B[1] - A[1]) * k, s = R.sign(), v = R.range(30, 100);
          ps.spawn(P.MOTE, x, y, s * nx * v + ux * 20, s * ny * v - 10, R.range(0.25, 0.55), R.chance(0.5) ? C[5] : C[4], 0.6);
        }
        for (let i = 0; i < 5; i++) lights.add(A[0] + (B[0] - A[0]) * (i + 0.5) / 5, A[1] + (B[1] - A[1]) * (i + 0.5) / 5, 46, C[5], 0.45, 0.3);
      }
      // and the halves break apart: sparks spray out of the opening seam both ways
      if (!split && t >= SPLIT) {
        split = true;
        for (let i = 0; i < 46; i++) {
          const k = R.range(0, 1), x = A[0] + (B[0] - A[0]) * k, y = A[1] + (B[1] - A[1]) * k, s = R.sign(), v = R.range(80, 320);
          const a = Math.atan2(s * ny, s * nx) + R.range(-0.7, 0.7);
          ps.spawn(P.SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v, Math.min(R.range(0.15, 0.45), end - t));
        }
        for (let i = 0; i < 6; i++) lights.add(A[0] + (B[0] - A[0]) * (i + 0.5) / 6, A[1] + (B[1] - A[1]) * (i + 0.5) / 6, 56, C[5], 0.5, 0.35);
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p0) {
      const p = clipTo(p0);
      if (t < CUT + CSW + CHOLD + 0.02 || t < SLIP) {
        // the cover behind the blade, row by row: ink, then the smear cooling from the white-hot edge, light ahead
        const e = edgeAt(t), sp = speedAt(t), Ls = clamp(sp * 0.0065, 1.5, 8), echo = clamp(sp / 900) * 0.6;
        for (let y = 0; y < H; y++) {
          const xe = xAt(e, y + 0.5), ia = clamp(Math.floor(xe - (Ls + 10) / CS), 0, W), ib = clamp(Math.ceil(xe + HALO / CS), 0, W);
          if (ia > 0) rect(p0, 0, y, ia, 1, ink);
          for (let x = ia; x < ib; x++) {
            const d = (xe - (x + 0.5)) * CS;
            if (d < 0) {
              const u = 1 + d / HALO;
              p0.light(x, y, C[5], 0.32 * u * u);
              if (d > -4) p0.light(x, y, WHITE, 0.3 * (1 + d / 4) ** 2);
              continue;
            }
            if (d < 1) p0.px(x, y, WHITE);
            else if (d < 2) p0.px(x, y, C[6]);
            else {
              const q = (d - 2) / Ls;
              p0.px(x, y, q < 0.3 ? C[5] : q < 0.55 ? C[4] : q < 0.8 ? C[3] : q < 1 ? C[2] : ink);
              // a dotted trace a beat behind the edge, while it's moving fast
              if (echo > 0 && Math.abs(d - Ls - 7) < 0.5 && (x + y) % 3 === 0) p0.dot(x, y, C[4], echo);
            }
            if (d < Ls + 2) p0.light(x, y, C[5], 0.3 * (1 - d / (Ls + 2)));
          }
        }
      }
      if (t >= SLIP) {
        // the two halves: dark, their cut edges white-hot and cooling to ice; light pours out of the seam
        const heat = 1 - clamp((t - CUT - 0.05) / 0.5);
        for (const hf of halves) {
          const pl = placeOf(hf), pts = hf.pts.map((q) => moved(hf, pl, q)), a = moved(hf, pl, A), b = moved(hf, pl, B);
          // the cut face of this half: white-hot at the edge, cooling and narrowing to an ice rim
          const c = Math.cos(pl.rot), sn = Math.sin(pl.rot), mx = hf.s * (nx * c - ny * sn), my = hf.s * (nx * sn + ny * c);
          const rim = [heat > 0.55 ? WHITE : heat > 0.25 ? C[6] : C[5], heat > 0.4 ? C[6] : C[4], heat > 0.3 ? C[5] : C[3], heat > 0.3 ? C[4] : ink];
          const deep = clamp(1 + pl.sep * 0.5, 1, 4); // the cut face shows more as the halves part
          fillConvex(p0, pts, (x, y) => {
            const d = (x - a[0]) * mx + (y - a[1]) * my;
            if (d < deep) {
              if (d < 2) p0.light(x, y, C[5], 0.4 * heat * (1 - d / 2));
              return rim[Math.max(0, Math.floor(d))];
            }
            return ink;
          });
          if (heat > 0)
            for (let i = 0; i < 8; i++) {
              const k = (i + 0.5) / 8;
              p.glow(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 12 + pl.sep * 0.15, C[5], 0.3 * heat);
            }
        }
      }
      // the second cut: a smear that rips along the line, thickest just behind its head, white at its core,
      // cooling down the ramp, its tail dissolving; a dotted trace where it's gone; light riding its head
      const u = t - CUT;
      if (u >= 0 && u < CSW + CHOLD + CTRAIL + 0.25) {
        const head = LC * ease.outExpo(clamp(u / CSW)), tail = LC * smooth(CSW + CHOLD, CSW + CHOLD + CTRAIL, u), age = clamp(u / (CSW + CHOLD + CTRAIL));
        const Wc = 3.6 * (1 - (tail / LC) * 0.55), span = head - tail, sn = Math.abs(nx);
        if (span > 1 && tail < LC - 1 && t < SPLIT)
          for (let y = 0; y < H; y++) {
            // the cut crosses row y at x0; the smear spans Wc either side of it, measured square to the cut
            const x0 = A[0] + ((y + 0.5 - A[1]) * ux) / uy, hw = (Wc + 1) / sn;
            for (let x = Math.max(0, Math.floor(x0 - hw)); x < Math.min(W, Math.ceil(x0 + hw)); x++) {
              const px = x + 0.5 - A[0], py = y + 0.5 - A[1], s = px * ux + py * uy, v = (s - tail) / span;
              if (v < 0 || v > 1) continue;
              const w = Wc * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
              if (w < 0.35) continue;
              const q = Math.abs(px * nx + py * ny) / w;
              if (q > 1) continue;
              const ci = q < 0.34 && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
              p0.dot(x, y, C[n - 1 - clamp(ci, 0, n - 1)], Math.min(1, v / 0.4));
              if (q < 0.5) p0.light(x, y, C[5], 0.4 * (1 - age));
            }
          }
        // the trace it leaves behind, until the cover parts
        if (tail > 2 && t < SPLIT)
          for (let s = 0; s < tail; s += 1.6) p.dot(A[0] + ux * s, A[1] + uy * s, C[5], 0.7 * (0.4 + (0.6 * s) / LC));
        if (u < 0.3) {
          const hx = A[0] + ux * head, hy = A[1] + uy * head;
          p.glow(hx, hy, 46, C[4], 0.55 * (1 - u / 0.3));
        }
        const g = u - CSW * 0.6;
        if (g > 0 && g < 0.24) sparkle(p, B[0] - ux * 3, B[1] - uy * 3, 11 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.24), C[6], C[4], 0.7);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
