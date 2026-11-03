import { Particles, Lights, P, Rng, fit, flare, clamp, smooth, TAU, WHITE, hex } from "../../core/index.mjs";
import { lobe, cull, fadeEdges, pool, OUTLINE } from "./_lib.mjs";

export const meta = {
  name: "Smoke bomb",
  desc: "A round canister clinks down, fuse sparking, and pops: thick grey-violet smoke gushes out, rolls along the floor, billows into a cloud that hides all, then thins to wisps.",
  tags: ["smoke", "smoke-bomb", "ninja", "vanish", "escape", "ground", "one-shot"],
  size: [260, 176],
  origin: [130, 156],
  duration: 5,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0e0b14", "#1e1828", "#30283e", "#463c58", "#62567a", "#867a9e", "#aea4c4"],
    canister: ["#16121e", "#2a2434", "#443c52", "#686078", "#9c94ac"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    seed: 3,
  },
};

const POP = 0.95, R0 = 4, BAND = [hex("#3a1418"), hex("#7a2a24"), hex("#b84a34")];
const GRIT = [hex("#5a4f6b"), hex("#3e3650"), hex("#776c88")];

// the canister's flight: it arcs down, bounces with a clink, rolls and stops. hit(x, speed) on each bounce
function step(c, dt, hit) {
  if (c.rest) return;
  c.vy += 900 * dt;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  if (c.y >= -R0 && c.vy > 0) {
    c.y = -R0;
    if (c.vy > 80) {
      hit?.(c.x, c.vy);
      c.vy = -c.vy * 0.38;
      c.vx *= 0.78;
    } else c.vy = 0;
  }
  if (c.vy === 0 && c.y >= -R0 - 0.01) {
    c.vx -= c.vx * 3 * dt;
    if (Math.abs(c.vx) < 2) (c.vx = 0), (c.rest = true);
  }
  c.a += (c.vy === 0 ? c.vx / R0 : c.va) * dt;
}

export function create(o) {
  const C = fit(o.palette, 7), K = fit(o.canister, 5), R = new Rng(o.seed), floor = () => 0;
  const SM = [C[5], C[4], C[3], C[2], C[1]];
  const [W, H] = meta.size, [OX, OY] = meta.origin, X0 = -OX + 3, X1 = W - OX - 3, Y0 = -OY + 3, Y1 = H - OY - 3;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), lights = new Lights();
  // thrown in from the left so that it comes to rest on the anchor: run its path once to see where it stops
  const start = { x: -70, y: -60, vx: 125, vy: -80, va: 7, a: 0, rest: false };
  const sim = { ...start };
  for (let i = 0; i < 2400 && !sim.rest; i++) step(sim, 1 / 240);
  const can = { ...start, x: start.x - sim.x };
  // the smoke, gushing out front-loaded: rollers that slide out low along the floor, a fat core that stays over the
  // canister, a plume driven up, and a low trickle that keeps the base filled; they rise as they billow
  const N = 52, lobes = Array.from({ length: N }, (_, i) => {
    const kind = [0, 0, 1, 1, 2, 3][i % 6], side = R.sign();
    const ang = kind === 0 || kind === 3 ? (side > 0 ? -R.range(0, 0.25) : Math.PI + R.range(0, 0.25)) : -Math.PI / 2 + R.range(-0.6, 0.6);
    const sp = [R.range(70, 170), R.range(0, 25), R.range(45, 95), R.range(20, 60)][kind];
    const r1 = [R.range(12, 17), R.range(16, 22), R.range(13, 18), R.range(14, 19)][kind];
    const t0 = kind === 3 ? POP + R.range(0.45, 1.5) : POP + 0.6 * Math.pow(i / (N - 1), 1.6) + R.range(0, 0.03);
    return { kind, t0, vx: Math.cos(ang) * sp, vh: -Math.sin(ang) * sp, d: R.range(-1, 1), r0: R.range(5, 8), r1, f: R.range(-0.45, 0.4), wob: R.range(0, TAU), on: false, x: 0, h: 0, age: 0 };
  });
  let t = 0, popped = false;
  const fuseTip = () => [can.x + Math.sin(can.a) * (R0 + 2.5), can.y - Math.cos(can.a) * (R0 + 2.5)];
  const radius = (b) => (b.r0 + (b.r1 - b.r0) * (1 - Math.exp(-b.age / 0.28))) * (1 + 0.05 * Math.sin(t * 3 + b.wob)) * (1 + 0.35 * thin(b));
  const thin = (b) => smooth(2.5 + b.f, 3.9 + b.f * 0.6, t);

  return {
    update(dt) {
      t += dt;
      step(can, dt, (x, sp) => {
        // a clink: a few bright specks and a puff of dust
        for (let i = 0; i < 3; i++) ps.spawn(P.SPARK, x, -1, R.range(-70, 70), -R.range(40, 110), R.range(0.06, 0.14));
        for (let i = 0; i < 3; i++) ps.spawn(P.DUST, x + R.range(-2, 2), -0.5, R.sign() * R.range(10, 40), -R.range(4, 14), R.range(0.3, 0.55), GRIT[2], R.range(1.4, 2.4));
      });
      if (t < POP) {
        // the fuse: sparks spitting off its tip, quicker as it burns down, and a thread of smoke
        const [fx, fy] = fuseTip(), hurry = smooth(POP - 0.4, POP, t);
        if (R.chance((26 + 50 * hurry) * dt)) ps.spawn(P.SPARK, fx, fy, R.range(-50, 50), -R.range(30, 100), R.range(0.08, 0.18));
        if (R.chance(8 * dt)) ps.spawn(P.VAPOUR, fx, fy - 1, R.range(-4, 4), -R.range(10, 18), R.range(0.5, 0.8), C[5], R.range(1, 1.8));
      } else if (!popped) {
        popped = true;
        // the pop: a flash, a soft light that dies fast, sparks and grit, the canister jolted
        lights.add(can.x, -9, 64, C[6], 0.75, 0.22);
        lights.add(can.x, -5, 22, WHITE, 0.7, 0.06);
        for (let i = 0; i < 30; i++) {
          const a = R.range(-Math.PI - 0.35, 0.35), sp = R.range(120, 300);
          ps.spawn(P.SPARK, can.x, -5, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.4));
        }
        for (let i = 0; i < 26; i++) {
          const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.9, sp = R.range(80, 220) * (1 - 0.35 * Math.abs(u));
          ps.spawn(P.GRIT, can.x + u * 4, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.9, 1.6), R.pick(GRIT), R.chance(0.35) ? 2 : 1);
        }
        Object.assign(can, { vy: -95, vx: R.range(-25, 25), va: R.sign() * 9, rest: false });
      }
      // the cloud: lobes slide out low, slow, then rise as they billow; a breeze takes them late on
      const wind = 6 * smooth(1.8, 3.2, t);
      for (const b of lobes) {
        if (!b.on) {
          if (t < b.t0) continue;
          (b.on = true), (b.x = can.x + R.range(-2, 2)), (b.h = 1);
        }
        b.age += dt;
        b.vx -= b.vx * 2.4 * dt;
        // rollers hug the floor for a while; everything rises as it billows, gently
        b.vh += [14 * smooth(0.7, 1.6, b.age), 3 + 9 * smooth(0.8, 1.8, b.age), 6 + 12 * smooth(0.3, 1.4, b.age), 10 * smooth(0.8, 1.6, b.age)][b.kind] * dt;
        b.vh -= b.vh * 1.6 * dt;
        b.x += (b.vx + wind) * dt;
        b.h = Math.max(0, b.h + b.vh * dt);
        // thinning, it sheds wisps that drift off
        const k = thin(b);
        if (k > 0.12 && k < 0.85 && R.chance(1.8 * dt)) {
          const r = radius(b), life = Math.min(R.range(1, 1.6), meta.duration - 0.15 - t);
          if (life > 0.3) ps.spawn(P.VAPOUR, b.x + R.range(-r, r) * 0.5, -(b.h + r * 1.4), wind + R.range(-6, 10), -R.range(8, 20), life, C[4], r * R.range(0.3, 0.45));
        }
      }
      // the spent canister keeps smoking a little
      if (t > POP + 0.5 && t < 4.1 && R.chance(4 * dt)) ps.spawn(P.VAPOUR, can.x, can.y - 3, R.range(-3, 3), -R.range(8, 16), R.range(0.6, 0.9), C[4], R.range(1.5, 2.5));
      ps.update(dt);
      cull(ps, X0, Y0, X1, Y1);
      fadeEdges(ps, X0, X1, 20, Y1);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
      clouds(p, true);
    },
    draw(p) {
      // the canister: live with its fuse burning, then spent; it fades as the last smoke clears
      const fade = 1 - smooth(4.3, 4.8, t);
      if (fade > 0) drawCanister(p, K, can, t < POP, fade);
      if (t < POP) {
        const [fx, fy] = fuseTip();
        p.px(fx, fy, Math.sin(t * 50) > 0 ? WHITE : hex(o.sparks[1]));
        p.glow(fx, fy, 6, hex(o.sparks[2]), 0.45 + 0.2 * Math.sin(t * 37));
      }
      clouds(p, false);
      ps.draw(p, "front");
      // the flash of the pop
      const u = t - POP;
      if (u >= 0 && u < 0.067) {
        p.circle(can.x, -5, 6.5, C[5]);
        p.circle(can.x, -5, 4.5, WHITE);
      }
      if (u >= 0 && u < 0.16) flare(p, can.x, -5, 22 * (1 - u / 0.16), 1 - u / 0.16, [C[3], C[4], C[5], C[6]]);
      if (u >= 0 && u < 0.35) pool(p, can.x, 1, 50, 8, C[6], 0.5 * (1 - u / 0.35));
      lights.draw(p);
    },
  };

  // far lobes behind, near ones in front; each a cel-shaded ball: a lit crescent on top, a mid tone, a dark underside.
  // The cloud is lit from above, so lobes low in it sit in its shadow a step darker; anything nearing the top of the
  // canvas thins out
  function clouds(p, back) {
    const on = lobes.filter((b) => b.on);
    if (!on.length) return;
    let top = 0;
    for (const b of on) top = Math.min(top, -(b.h + radius(b) * 1.92));
    for (const b of on.filter((b) => b.d < -0.35 === back).sort((a, b) => a.d - b.d)) {
      const r = radius(b), y = -(b.h + r * 0.92) + b.d * 2.5, k = thin(b);
      const a = Math.min(1, b.age / 0.05) * Math.pow(1 - k, 1.4) * 0.97 * (1 - smooth(-OY + 34, -OY + 6, y - r));
      if (a <= 0.01) continue;
      const shade = (y - top) / Math.max(20, -top) > 0.55 ? 1 : 0;
      lobe(p, b.x, y, r, SM, SM, 0, 0, a, b.d, Math.min(2, shade + (k > 0.6 ? 1 : 0)), 1);
    }
  }
}

// a round canister turned by its roll: dark metal lit from the top left, a red band, an outline, and a fuse on top
// while it's live (spent, its cap is blown off)
function drawCanister(p, K, c, live, a) {
  const ca = Math.cos(c.a), sa = Math.sin(c.a);
  p.shade(c.x - R0 - 2, c.y - R0 - 2, c.x + R0 + 2, c.y + R0 + 2, (px, py, out) => {
    const dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy);
    if (d > R0 + 1) return;
    out.a = a;
    if (d > R0) return OUTLINE;
    const v = -dx * sa + dy * ca, lit = -(dx * 0.6 + dy * 0.8) / R0;
    if (Math.abs(v) < 0.9) return BAND[lit > 0.3 ? 2 : lit > -0.4 ? 1 : 0];
    if (d < R0 * 0.5 && lit > 0.45) return K[4];
    return K[lit > 0.5 ? 3 : lit > 0 ? 2 : lit > -0.5 ? 1 : 0];
  });
  const cx = c.x + sa * R0, cy = c.y - ca * R0;
  if (live) p.line(cx, cy, cx + sa * 2.5, cy - ca * 2.5, hex("#8a6a48"), a);
  else p.dot(cx, cy, K[0], a);
}
