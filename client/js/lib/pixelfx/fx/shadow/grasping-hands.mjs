import { Particles, P, Rng, fit, clamp, smooth, ease, TAU, WHITE, mix } from "../../core/index.mjs";
import { VOID, Puffs, PK, Drops, floorPool, ringFast } from "./_lib.mjs";

export const meta = {
  name: "Grasping hands",
  desc: "Shadow arms burst up out of a dark pool with a splash, clench their hands into claws, strain, and are dragged back under, fingers clawing at the air.",
  tags: ["shadow", "hands", "arms", "grab", "ground", "dark", "magic", "one-shot"],
  size: [200, 116],
  origin: [100, 100],
  duration: 3.1,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: VOID, seed: 5 },
};

const RX = 42, OPEN = 0.32, SHUT = 2.35, LX = -0.6, LY = -0.8;

// an arm at t: it rises out of the pool along its own shape, bent at the elbow, swaying; returns its spine
function arm(A, t) {
  const e = clamp((t - A.t0) / 0.22), d = clamp((t - A.td) / 0.34);
  if (e <= 0 || d >= 1) return null;
  const rise = ease.outBack(e, 1.6) * (1 - ease.inQuad(d)), hidden = (1 - rise) * A.L;
  const grip = gripOf(A, t), strain = t > A.t0 + 0.5 && t < A.td ? Math.sin(t * 47 + A.ph) * 0.03 : 0;
  const elbow = A.bend * (0.3 + 0.7 * grip) * (1 - d) + strain, lean = A.lean + 0.06 * Math.sin(t * 2.2 + A.ph) + d * A.lean * 0.6;
  let th = -Math.PI / 2 + lean, x = A.x - Math.cos(th) * hidden, y = A.y - Math.sin(th) * hidden;
  const pts = [], n = Math.ceil(A.L / 0.5);
  for (let i = 0; i <= n; i++) {
    const s = i * 0.5, u = s / A.L;
    pts.push({ x, y, th, w: A.W * (1 - 0.5 * u) + 0.4, u });
    th += 0.5 * (elbow * Math.exp(-(((u - 0.52) / 0.07) ** 2)) / (0.07 * Math.sqrt(Math.PI) * A.L) + A.curve / A.L);
    x += Math.cos(th) * 0.5;
    y += Math.sin(th) * 0.5;
  }
  return pts;
}
// how closed the hand is: opens as it rises, snaps shut into a claw, splays as it's dragged down
function gripOf(A, t) {
  const shut = ease.outBack(clamp((t - A.t0 - 0.3) / 0.12), 2.2), splay = smooth(A.td, A.td + 0.12, t);
  return shut * (1 - splay) - 0.35 * splay;
}

// the arm in cross-sections, lit like the tendrils: a near-black body, a bright edge toward the light
function drawArm(p, A, pts, C) {
  const surf = A.y;
  for (const q of pts) {
    if (q.y > surf) continue;
    const nx = -Math.sin(q.th), ny = Math.cos(q.th), ks = nx * LX + ny * LY >= 0 ? 1 : -1;
    for (let v = -q.w; v <= q.w; v += 0.5) {
      const x = q.x + nx * v, y = q.y + ny * v, u = (v / q.w) * ks;
      if (y <= surf) p.px(x, y, u > 0.55 ? C[2] : u > -0.45 ? C[1] : C[0]);
    }
  }
  for (const q of pts) {
    if (q.y > surf) continue;
    const nx = -Math.sin(q.th), ny = Math.cos(q.th), f = nx * LX + ny * LY, ks = f >= 0 ? 1 : -1, l = ks * q.w;
    if (q.y - ny * l <= surf) p.px(q.x - nx * l, q.y - ny * l, C[3]);
    if (q.y + ny * l <= surf) p.px(q.x + nx * l, q.y + ny * l, Math.abs(f) > 0.8 ? C[7] : C[6]);
  }
  const base = pts.find((q) => q.y <= surf);
  if (base) p.line(base.x - base.w - 1.5, surf, base.x + base.w + 1.5, surf, C[5]);
}

// a hand on the arm's end: a palm, four fingers and a thumb, each two bones with a lit edge and a pale claw
function drawHand(p, A, pts, C, t) {
  const tip = pts[pts.length - 1];
  if (tip.y > A.y - 2) return;
  const th = tip.th, dx = Math.cos(th), dy = Math.sin(th), nx = -dy, ny = dx, g = gripOf(A, t), side = A.curl;
  const cx = tip.x + dx * 2.6, cy = tip.y + dy * 2.6;
  p.shade(cx - 5, cy - 5, cx + 5, cy + 5, (x, y) => {
    const a = (x - cx) * dx + (y - cy) * dy, b = (x - cx) * nx + (y - cy) * ny, d = (a / 3) ** 2 + (b / 2.7) ** 2;
    if (d > 1.25) return;
    if (d > 1) return b * side < 0 ? C[6] : C[3];
    return b * side < -1 ? C[2] : C[1];
  });
  const bone = (x0, y0, ang, len, last) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len, ox = Math.round(-Math.sin(ang) * side * -1), oy = Math.round(Math.cos(ang) * side * -1);
    p.line(x0, y0, x1, y1, C[1]);
    p.line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, C[5]);
    if (last) (p.px(x1, y1, WHITE), p.px(x1 + Math.cos(ang), y1 + Math.sin(ang), C[7]));
    return [x1, y1];
  };
  const spread = 1 - 0.65 * Math.max(0, g), curl = g * 1.2;
  [-2.2, -0.75, 0.75, 2.2].forEach((o, i) => {
    const bx = cx + dx * 2.6 + nx * o * 0.9, by = cy + dy * 2.6 + ny * o * 0.9, len = i === 0 || i === 3 ? 2.6 : 3.2;
    const a0 = th + o * 0.2 * spread, [jx, jy] = bone(bx, by, a0 + curl * side * 0.6, len, false);
    bone(jx, jy, a0 + curl * side * 1.5, len * 0.85, true);
  });
  const [jx, jy] = bone(cx - nx * side * 2.4, cy - ny * side * 2.4, th - side * (1 - 0.6 * g), 2.4, false);
  bone(jx, jy, th - side * (0.6 - 1.4 * g), 2, true);
  p.glow(cx, cy, 8, C[5], 0.18 + 0.3 * Math.max(0, g));
}

export function create(o) {
  const C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[1], C[3], C[4], C[5], C[6]], R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[4] });
  const puffs = new Puffs({ rng: R, flame: [C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[1], C[0]], soot: [mix(C[3], C[2], 0.55), mix(C[2], C[1], 0.5)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor });
  const ripples = [], splats = [], lights = [];
  let t = 0, acc = 0;
  const rx = (tt) => RX * ease.outCubic(clamp(tt / OPEN)) * (1 - ease.inCubic(clamp((tt - SHUT) / 0.45)));
  const drops = new Drops({ onLand: (x, y, v, s) => (Math.abs(x) < rx(t) * 0.95 ? ripples.push({ x, t0: t, life: 0.5, w: 0.6 }) : splats.push({ x, t0: t, s })) });
  // four arms: two at the back, taller and dimmer, two in front; elbows bending toward the middle
  const LAY = [[-20, -2.5, 1], [17, -2.5, -1], [-30, 2.5, 1], [28, 2.5, -1]];
  const arms = LAY.map(([x, y, toward], i) => ({
    x: x + R.range(-3, 3), y, back: y < 0, L: y < 0 ? R.range(44, 52) : R.range(36, 44), W: y < 0 ? R.range(3.2, 3.8) : R.range(3.6, 4.2),
    lean: -toward * R.range(0.16, 0.3), bend: toward * R.range(0.35, 0.6), curve: toward * R.range(0.05, 0.15), curl: toward,
    t0: 0.3 + [1, 3, 0, 2][i] * 0.06 + R.range(0, 0.03), td: 1.45 + [2, 0, 3, 1][i] * 0.09 + R.range(0, 0.05), ph: R.range(0, TAU), up: false, shut: false, down: false,
  }));
  function splash(x, y, n, k) {
    for (let i = 0; i < n; i++) drops.add(x + R.range(-2, 2), y - 1, R.range(-70, 70) * k, -R.range(90, 220) * k, R.chance(0.4) ? 2 : 1);
    ripples.push({ x, t0: t, life: 0.7, w: 1 });
    lights.push({ x, y: y - 7, r: 30, k: 0.55 * k, life: 0.25, max: 0.25 });
  }
  return {
    update(dt) {
      t += dt;
      for (const A of arms) {
        if (!A.up && t >= A.t0) (A.up = true), splash(A.x, A.y, 12, 1);
        if (!A.shut && t >= A.t0 + 0.36) {
          // the clench: a snap of light at the fist, a puff of dark breath, a few sparks
          A.shut = true;
          const pts = arm(A, t);
          if (pts) {
            const q = pts[pts.length - 1];
            lights.push({ x: q.x, y: q.y, r: 22, k: 0.7, life: 0.2, max: 0.2 });
            A.snap = { x: q.x + Math.cos(q.th) * 4, y: q.y + Math.sin(q.th) * 4, t0: t };
            for (let i = 0; i < 6; i++) {
              const a = R.range(0, TAU), sp = R.range(60, 130);
              ps.spawn(P.SPARK, A.snap.x, A.snap.y, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.12, 0.3));
            }
            puffs.spawn(PK.SOOT, A.snap.x, A.snap.y, 0, -12, 0.6, 3.5);
          }
        }
        if (!A.down && t >= A.td + 0.28) (A.down = true), splash(A.x, A.y, 8, 0.7);
      }
      const r = rx(t);
      if (r > 8 && t < SHUT - 0.4) {
        for (acc += dt * 8; acc > 1; acc--) puffs.spawn(PK.SOOT, R.range(-0.8, 0.8) * r, -R.range(1, 4), R.range(-8, 8), -R.range(14, 28), R.range(0.6, 0.85), R.range(3, 6));
        if (R.chance(dt * 12)) ps.spawn(P.MOTE, R.range(-0.8, 0.8) * r, -2, R.range(-8, 8), -R.range(30, 70), R.range(0.5, 0.9), R.pick([C[7], C[6], C[5]]), R.range(0.6, 1));
        if (R.chance(dt * 6)) ps.spawn(P.VAPOUR, R.range(-0.7, 0.7) * r, -R.range(2, 8), R.range(-6, 6), -R.range(10, 22), R.range(0.6, 0.9), R.chance(0.5) ? C[3] : C[4], R.range(3, 6));
        if (R.chance(dt * 3)) ripples.push({ x: R.range(-0.7, 0.7) * r, t0: t, life: 0.6, w: 0.5 });
      }
      for (const a of [ripples, splats]) for (let i = a.length - 1; i >= 0; i--) if (t - a[i].t0 > (a[i].life ?? 0.6)) a.splice(i, 1);
      for (let i = lights.length - 1; i >= 0; i--) if ((lights[i].life -= dt) <= 0) lights.splice(i, 1);
      drops.update(dt);
      puffs.update(dt);
      ps.update(dt);
    },
    drawBack(p) {
      const r = rx(t), k = r / RX;
      floorPool(p, C, r, t, ripples);
      if (k > 0) {
        p.glow(0, -16, 80, C[4], 0.2 * k);
        p.glow(0, -8, r * 1.7 + 12, C[4], 0.3 * k);
        p.glow(0, 0, r * 1.15, C[5], 0.16 * k);
      }
      puffs.draw(p, PK.SOOT, { x: 0, y: 6, k, reach: 70 });
      ps.draw(p, "back");
      for (const A of arms) if (A.back) {
        const pts = arm(A, t);
        if (pts) drawArm(p, A, pts, DIM), drawHand(p, A, pts, DIM, t);
      }
    },
    draw(p) {
      for (const A of arms) if (!A.back) {
        const pts = arm(A, t);
        if (pts) drawArm(p, A, pts, C), drawHand(p, A, pts, C, t);
      }
      for (const A of arms) if (A.snap && t - A.snap.t0 < 0.22) {
        const u = (t - A.snap.t0) / 0.22;
        ringFast(p, A.snap.x, A.snap.y, 2 + 5 * ease.outCubic(u), 1, u < 0.4 ? C[6] : u < 0.7 ? C[5] : C[3]);
      }
      drops.draw(p, C[1], C[5]);
      for (const s of splats) {
        const a = 1 - (t - s.t0) / 0.6;
        p.dot(s.x, -0.5, C[1], a * 1.5);
        p.dot(s.x + 1, -0.5, C[2], a);
        p.dot(s.x, -1.5, C[5], a);
      }
      ps.draw(p, "front");
      for (const l of lights) {
        const q = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), C[5], l.k * q * q);
      }
    },
  };
}
