// The impact flash, cracks racing out from the impact, the white flash before the burst, and the glass
// splinters, glints and cold light of the burst are adapted from Sprite Fusion's open-source ice shatter
// (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, hex, mix, clamp, smooth, sparkle, flare, TAU, WHITE } from "../../core/index.mjs";
import { W, H, screenMeta, clipTo, fillConvex, rect } from "./_lib.mjs";

export const meta = screenMeta({
  name: "Shatter wipe",
  desc: "A dark glass pane drops over the screen and bounces; cracks race out from an impact with a flash, then it bursts into tumbling glass shards with lit edges that fall away.",
  tags: ["shatter", "glass", "break", "shards", "wipe"],
  duration: 2.8,
  options: { palette: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"], seed: 2 },
});

const D = meta.duration, LAND = 0.55, GP = (2 * H) / (LAND * LAND), REST = 0.3, CRACK = 1.32, BREAK = 1.62, WAVE = 520;
const LX = -0.6, LY = -0.8; // light comes from the top left
const L3 = [-0.42, -0.56, 0.71]; // and a little from the front, for the faces

// the pane's top edge over time: it falls from above the screen, lands, bounces twice and settles
const BOUNCES = (() => {
  const out = [];
  let t0 = LAND, v = GP * LAND * REST;
  for (let k = 0; k < 3; k++) out.push({ t0, v, T: (2 * v) / GP }), (t0 += (2 * v) / GP), (v *= REST);
  return out;
})();
function paneY(t) {
  if (t < LAND) return -H + 0.5 * GP * t * t;
  for (const b of BOUNCES) if (t < b.t0 + b.T) return -(b.v * (t - b.t0) - 0.5 * GP * (t - b.t0) ** 2);
  return 0;
}

// the break: jagged rays out of the impact crossed by rings, every crack shared by the two cells it splits
function pattern(R) {
  const Ix = W * R.range(0.4, 0.6), Iy = H * R.range(0.36, 0.54), NR = 13, RING = [0, 9, 21, 37, 58, 86, 122, 168, 232];
  const ang = Array.from({ length: NR }, (_, i) => ((i + R.range(-0.3, 0.3)) / NR) * TAU), speed = ang.map(() => R.range(800, 1300));
  const V = ang.map((a) => RING.map((r, j) => {
    if (!j) return [Ix, Iy];
    const rr = r * R.range(0.84, 1.16), aa = a + R.range(-0.07, 0.07);
    return [Ix + Math.cos(aa) * rr, Iy + Math.sin(aa) * rr];
  }));
  const jag = (A, Bp) => {
    const dx = Bp[0] - A[0], dy = Bp[1] - A[1], L = Math.hypot(dx, dy) || 1, n = L > 18 ? 2 : 1, out = [A];
    for (let k = 1; k <= n; k++) {
      const f = k / (n + 1) + R.range(-0.08, 0.08), off = R.range(-1, 1) * Math.min(3, L * 0.07);
      out.push([A[0] + dx * f - (dy / L) * off, A[1] + dy * f + (dx / L) * off]);
    }
    out.push(Bp);
    return out;
  };
  const rad = V.map((v) => v.slice(0, -1).map((A, j) => jag(A, v[j + 1])));
  const ring = V.map((v, i) => v.map((A, j) => (j ? jag(A, V[(i + 1) % NR][j]) : null)));
  // real glass breaks into long wedges: rings near the impact are whole, further out they're broken arcs
  const keep = V.map(() => RING.map((_, j) => j <= 2 || j === RING.length - 1 || R.chance(0.78 - 0.07 * j)));
  // when a crack gets to each pixel: rays race out at their own speed, rings snap across once both rays pass
  const cracks = [], reach = (i, x, y) => CRACK + Math.hypot(x - Ix, y - Iy) / speed[i];
  const trace = (pts, when) => {
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let s = 0; s < n; s++) {
        const x = ax + ((bx - ax) * s) / n, y = ay + ((by - ay) * s) / n;
        if (x >= 0 && y >= 0 && x < W && y < H) cracks.push({ x: Math.floor(x), y: Math.floor(y), t0: when(x, y) });
      }
    }
  };
  for (let i = 0; i < NR; i++) for (const e of rad[i]) trace(e, (x, y) => reach(i, x, y));
  for (let i = 0; i < NR; i++)
    for (let j = 1; j < RING.length - 1; j++) {
      if (!keep[i][j]) continue;
      const i2 = (i + 1) % NR, e = ring[i][j], start = Math.max(reach(i, ...V[i][j]), reach(i2, ...V[i2][j])) + R.range(0.02, 0.07);
      const [ax, ay] = e[0];
      trace(e, (x, y) => start + Math.hypot(x - ax, y - ay) / 420);
    }
  cracks.sort((a, b) => a.t0 - b.t0);
  const cells = [];
  for (let i = 0; i < NR; i++)
    for (let j = 0, jb; j < RING.length - 1; j = jb + 1) {
      // a wedge from ring j out to the next ring crack that's there
      for (jb = j; !keep[i][jb + 1]; jb++);
      const i2 = (i + 1) % NR, side = (r) => rad[r].slice(j, jb + 1).flatMap((e, k) => (k ? e.slice(1) : e));
      const pts = [...side(i), ...ring[i][jb + 1].slice(1), ...side(i2).reverse().slice(1)];
      if (j) pts.push(...ring[i][j].slice().reverse().slice(1, -1));
      else pts.pop();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0;
      for (const [x, y] of pts) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y)), (cx += x), (cy += y);
      if (x1 < 0 || y1 < 0 || x0 >= W || y0 >= H) continue;
      // a shard of what's on screen: centered on the visible part, so it spins about what you see
      cx = (clamp(x0, 0, W) + clamp(x1, 0, W)) / 2;
      cy = (clamp(y0, 0, H) + clamp(y1, 0, H)) / 2;
      const d = Math.hypot(cx - Ix, cy - Iy);
      cells.push({ pts, lp: pts.map(([x, y]) => [x - cx, y - cy]), cx, cy, d, r: Math.hypot(x1 - x0, y1 - y0) / 2, tb: BREAK + d / WAVE + R.range(0, 0.04) });
    }
  return { Ix, Iy, cracks, cells };
}

export function create(o) {
  const C = fit(o.palette, 8), ink = hex(o.color), R = new Rng(o.seed), pat = pattern(R), { Ix, Iy } = pat;
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits(), lights = new Lights();
  let t = 0, bounce = -1, struck = false, burst = false;
  const end = D - 0.05;

  // glass splinters thrown from (x, y): little white-tipped streaks that tumble and fall
  const splinters = (x, y, n, vx, vy, spread, sp0, sp1) => {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(vy, vx) + R.range(-spread, spread), sp = R.range(sp0, sp1), life = Math.min(R.range(0.6, 1.2), end - t);
      if (life > 0.2) bits.add({ kind: B.SHARD, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, life, a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3.5), c: R.pick([C[7], C[6], C[5]]) });
    }
  };
  const glint = (x, y, s = R.range(1, 2.4)) => ps.spawn(P.STAR, x, y, R.range(-8, 8), R.range(-10, 4), Math.min(R.range(0.3, 0.6), end - t), R.chance(0.5) ? WHITE : C[6], s);

  return {
    update(dt) {
      t += dt;
      // each landing: chips spring off the bottom edge, glints, a cold flash along it
      while (bounce + 1 < BOUNCES.length && t >= BOUNCES[bounce + 1].t0) {
        const k = BOUNCES[++bounce].v / BOUNCES[0].v;
        if (k < 0.05) continue;
        for (let i = 0; i < 5; i++) lights.add(W * (i + 0.5) / 5, H - 2, 70, C[5], 0.5 * k, 0.35);
        for (let i = 0; i < Math.round(26 * k); i++) splinters(R.range(4, W - 4), H - 1, 1, R.range(-0.4, 0.4), -1, 0.5, 120 * k, 330 * k);
        for (let i = 0; i < Math.round(9 * k); i++) glint(R.range(8, W - 8), H - R.range(2, 10));
      }
      if (!struck && t >= CRACK) {
        // the blow: a white flash at the point of impact, a puff of splinters back off the glass
        struck = true;
        lights.add(Ix, Iy, 90, C[5], 0.8, 0.35);
        lights.add(Ix, Iy, 34, WHITE, 0.9, 0.1);
        splinters(Ix, Iy, 16, 0, -1, Math.PI, 60, 240);
        for (let i = 0; i < 5; i++) ps.spawn(P.VAPOUR, Ix, Iy, R.range(-40, 40), R.range(-40, 30), R.range(0.35, 0.6), C[6], R.range(2, 3.5));
      }
      // while the cracks run, glints chase their tips
      if (t > CRACK && t < BREAK && R.chance(0.12)) {
        const c = pat.cracks[R.int(0, pat.cracks.length - 1)];
        if (c.t0 < t) glint(c.x, c.y, R.range(0.6, 1.6));
      }
      if (!burst && t >= BREAK) {
        // the burst: a cold flash, a spray of splinters and a breath of glass dust out of the impact
        burst = true;
        lights.add(Ix, Iy, 170, C[4], 0.55, 0.5);
        lights.add(Ix, Iy, 60, WHITE, 0.8, 0.14);
        splinters(Ix, Iy, 46, 0, -1, Math.PI, 90, 340);
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(30, 110);
          ps.spawn(P.VAPOUR, Ix + Math.cos(a) * 4, Iy + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.45, 0.8), R.chance(0.6) ? C[6] : C[5], R.range(3, 6));
        }
      }
      // the pane bursts outward from the impact: each shard flies off, tumbling, and falls away from the screen
      for (const s of pat.cells) {
        if (!s.broke && t >= s.tb) {
          s.broke = true;
          const dx = s.cx - Ix, dy = s.cy - Iy, d = Math.hypot(dx, dy) || 1, sp = R.range(40, 130) * (1.15 - Math.min(1, s.d / 260));
          s.vx = (dx / d) * sp + R.range(-15, 15);
          s.vy = (dy / d) * sp * 0.6 - R.range(20, 90);
          s.a = 0;
          s.va = R.range(-2.5, 2.5) * (1 + 20 / (s.r + 10));
          s.phi = 0;
          s.vphi = R.sign() * R.range(3, 9);
          s.psi = R.range(0, TAU);
          s.z = 0;
          s.vz = R.range(0.25, 0.7);
          s.g = R.range(0.85, 1.1);
          s.edgeOn = false;
          splinters(s.cx, s.cy, s.r > 24 ? 4 : 2, s.vx, s.vy, 1.2, 60, 220);
          if (R.chance(0.15)) glint(s.cx + R.range(-4, 4), s.cy + R.range(-4, 4));
        }
        if (!s.broke || s.gone) continue;
        s.vy += 950 * s.g * dt;
        s.vx -= s.vx * 0.3 * dt;
        s.cx += s.vx * dt;
        s.cy += s.vy * dt;
        s.a += s.va * dt;
        s.phi += s.vphi * dt;
        s.z += s.vz * dt;
        // turning edge-on to us it flashes: a glint where the light catches the glass
        const on = Math.abs(Math.cos(s.phi)) < 0.2;
        if (on && !s.edgeOn && t < end - 0.3) glint(s.cx, s.cy, R.range(1.4, 2.6));
        s.edgeOn = on;
        if (s.cy - s.r / (1 + s.z) > H + 2) s.gone = true;
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    draw(p0) {
      const p = clipTo(p0);
      if (t < BREAK) {
        // the pane: dark glass, a lit bevel along its falling edge, faint reflections that fade once it settles
        const yb = paneY(t) + H, r1 = Math.min(H, Math.floor(yb));
        if (r1 > 0) {
          rect(p0, 0, 0, W, r1, ink);
          const shine = 1 - smooth(0.98, 1.22, t), y0 = yb - H;
          if (shine > 0) {
            for (const [off, w, a] of [[0, 16, 0.05], [22, 3, 0.1], [30, 1, 0.12]])
              for (let y = 0; y < r1; y++) {
                const xc = W * 0.18 + off + (H - (y - y0)) * 0.7;
                for (let x = Math.max(0, Math.floor(xc - w / 2)); x < Math.min(W, Math.ceil(xc + w / 2)); x++) p0.blend(x + 0.5, y + 0.5, C[6], a * shine);
              }
            const st = shine > 0.66 ? 0 : shine > 0.33 ? 1 : 2;
            for (const [dy, c] of [[1, C[6 - st * 2]], [2, C[4 - st]], [3, C[Math.max(1, 2 - st)]]]) if (r1 - dy >= 0 && r1 - dy < H) rect(p0, 0, r1 - dy, W, 1, c);
            // light runs along the edge as it falls, and spills onto the picture below it
            const gx = W * clamp(t / (LAND + 0.25)) * 1.2 - 20;
            for (let x = 0; x < W; x++) {
              const k = Math.max(0, 1 - Math.abs(x - gx) / 28);
              if (k > 0 && r1 - 1 < H) p0.px(x, r1 - 1, k > 0.5 ? WHITE : C[6]), p0.light(x, r1 - 1, C[6], 0.5 * k);
              for (let d = 0; d < 14 && r1 + d < H; d++) p0.light(x, r1 + d, C[5], 0.3 * shine * (1 - d / 14) ** 2 * (0.6 + 0.8 * k));
            }
            if (t < LAND + 0.25 && gx > 0 && gx < W && r1 - 1 < H) sparkle(p, gx, r1 - 1, 6, C[6], C[4], 0.5);
          }
        }
        // the cracks race out from the impact: white at the tip, cooling to ice, each with its shadow
        if (t >= CRACK) {
          for (const c of pat.cracks) {
            if (c.t0 > t) break;
            const age = t - c.t0;
            if (c.x + 1 < W && c.y + 1 < H) p0.px(c.x + 1, c.y + 1, C[1]);
            p0.px(c.x, c.y, age < 0.04 ? WHITE : age < 0.18 ? C[6] : C[5]);
            if (age < 0.3) p0.light(c.x, c.y, C[5], 0.55 * (1 - age / 0.3));
          }
          const u = (t - CRACK) / 0.22;
          if (u < 1) {
            flare(p, Ix, Iy, 30 * Math.pow(1 - u, 1.5), 1 - u, C);
            p.glow(Ix, Iy, 50, WHITE, 0.7 * (1 - u));
          }
          // a beat before the burst, the cracks flare white
          const w = (t - (BREAK - 0.07)) / 0.07;
          if (w > 0) for (const c of pat.cracks) p0.px(c.x, c.y, WHITE), p0.light(c.x, c.y, C[6], 0.4 * w);
        }
      } else {
        // shards still in place first (the pane breaking up outward), then the falling ones, nearest last
        const fall = pat.cells.filter((s) => s.broke && !s.gone).sort((a, b) => b.z - a.z);
        for (const s of pat.cells) if (!s.broke) drawShard(p, p0, s, C, ink, true);
        for (const s of fall) drawShard(p, p0, s, C, ink, false);
      }
      bits.draw(p);
      ps.draw(p);
      lights.draw(p);
    },
  };
}

// a shard: dark glass that tumbles about an axis in its plane (squashing as it turns, a bright sliver
// edge-on), its edges lit where they face the light, its face catching a cool sheen as it turns to it
function drawShard(p, p0, s, C, ink, still) {
  let pts, face = ink, sliver = false, gl = 0;
  if (still) pts = s.pts;
  else {
    const cp = Math.cos(s.phi), sp = Math.sin(s.phi), ci = Math.cos(s.psi), si = Math.sin(s.psi), ca = Math.cos(s.a), sa = Math.sin(s.a), k = 1 / (1 + s.z);
    pts = s.lp.map(([x, y]) => {
      const u = x * ci + y * si, v = (-x * si + y * ci) * cp, qx = u * ci - v * si, qy = u * si + v * ci;
      return [s.cx + (qx * ca - qy * sa) * k, s.cy + (qx * sa + qy * ca) * k];
    });
    // the face's normal, turned by the tumble and the spin, against the light
    const nx0 = si * sp, ny0 = -ci * sp, nz = cp, nx = nx0 * ca - ny0 * sa, ny = nx0 * sa + ny0 * ca;
    const d = Math.abs(nx * L3[0] + ny * L3[1] + nz * L3[2]);
    gl = Math.pow(d, 6);
    // turning toward edge-on the glass reflects more (a grazing sheen), and a hairline sliver goes bright
    const graze = clamp(1 - Math.abs(cp) / 0.3) ** 2;
    face = mix(mix(ink, C[2], 0.12 + 0.4 * gl), C[3], 0.55 * graze);
    sliver = Math.abs(cp) < 0.2;
    if (Math.abs(cp) * s.r < 1.5) face = C[5];
  }
  fillConvex(p0, pts, face);
  let a2 = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a2 += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  const sg = a2 > 0 ? 1 : -1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    if (L < 0.5) continue;
    const mx = (dy / L) * sg, my = (-dx / L) * sg, el = mx * LX + my * LY;
    if (still) {
      // a crack in the pane: lit fracture line, its shadow below
      p.line(ax, ay, bx, by, el > 0 ? C[5] : C[4]);
      continue;
    }
    if (el > 0.2 || sliver) {
      p.line(ax - mx, ay - my, bx - mx, by - my, C[4]);
      p.line(ax, ay, bx, by, gl > 0.5 || sliver ? WHITE : C[6]);
      p.glow((ax + bx) / 2, (ay + by) / 2, Math.min(12, 4 + L * 0.3), C[5], 0.12 + 0.3 * gl);
    } else p.line(ax, ay, bx, by, el > -0.3 ? C[4] : C[2]);
  }
}
