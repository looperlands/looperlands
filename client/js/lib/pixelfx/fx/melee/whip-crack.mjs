// The pop's star and slivers follow Sprite Fusion's open-source impact, and the sparks his slash
// (https://www.spritefusion.com/pixel-art-vfx), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, clamp, smooth, ease, TAU, WHITE, READY } from "../../core/index.mjs";
import { star, sliver } from "./_lib.mjs";

export const meta = {
  name: "Whip crack",
  desc: "A whip rolls out to the right as a loop running down its length, faster and faster, until the tip flips over and cracks: a white pop, a ring of air, sparks and a puff of smoke.",
  tags: ["melee", "whip", "crack", "lash", "combat", "directional", "one-shot"],
  size: [192, 80],
  origin: [30, 68],
  duration: 0.85,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#2a1a10", "#5c3a1e", "#9c6a34", "#d8a45a", "#ffd890", "#fff4d6", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    length: 76,
    seed: 3,
  },
};

const STANCE = { ...READY, weapon: "handle", x: -7, sa: -0.3, fx: 13, fy: -21, bx: 7, by: -18 };
const COCK = { ...STANCE, crouch: 4, lean: -3, fx: -6, fy: -38, sa: -2.2, bx: 9, by: -23, armsFront: true, ffx: 9, fbx: -7 };
const CRACK_ = { ...STANCE, crouch: 4, lean: 5, fx: 18, fy: -21, sa: 0, bx: -8, by: -23, ffx: 12, fbx: -10, toeB: true };
export const act = {
  target: { x: 94 },
  poses: [
    [-0.46, STANCE],
    [-0.22, COCK],
    [0.02, { ...COCK, lean: -4 }],
    [0.06, { ...CRACK_, fx: 15, fy: -34, sa: -0.7, lean: 2, ghost: 1 }, "snap"],
    [0.12, CRACK_, "snap"],
    [0.21, CRACK_],
    [0.26, { ...CRACK_, fx: 15, fy: -27, sa: -0.3, lean: 2, crouch: 3 }, "snap"],
    [0.44, { ...CRACK_, fx: 17, fy: -22, sa: 0.1, lean: 3, crouch: 3 }],
    [0.92, STANCE],
  ],
  hits: [{ t: 0.21, stop: 0.1, shake: 0.14, amp: 2, push: 2.4, straw: 14, y: -28 }],
  dust: [{ t: 0.06, x: 2, n: 4, dir: 1 }],
};

const ROLL0 = 0.02, ROLL = 0.19, CRACK = ROLL0 + ROLL; // the loop runs out; the tip cracks when it gets there
const RECOIL = 0.16;

export function create(o) {
  const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
  const L = o.length, HX = 11, HY = -21, TIP = [HX + L, HY - 1];
  // how far down the whip the loop has run: it starts a third of the way out, cocked, and accelerates
  const lam = (t) => L * (0.34 + 0.66 * ease.inQuad(clamp((t - ROLL0) / ROLL)));
  // the whip as points, handle to tip: straight out to the loop, round the loop, folded back under it
  const shape = (t) => {
    const l = lam(t), r = 6.5 - 3.5 * (l / L), pts = [];
    const recoil = smooth(CRACK + 0.04, CRACK + 0.04 + RECOIL, t), len = L * (1 - recoil * 0.85);
    for (let s = 0; s <= len; s += 1) {
      let x, y;
      if (s <= l) (x = HX + s), (y = HY - Math.sin((Math.PI * s) / Math.max(l, 1)) * 2.5 * (1 - l / L));
      else if (s <= l + Math.PI * r) {
        const th = (s - l) / r;
        (x = HX + l + Math.sin(th) * r), (y = HY + r - Math.cos(th) * r);
      } else (x = HX + l - (s - l - Math.PI * r)), (y = HY + 2 * r);
      // after the crack it sags as it's pulled back in
      if (recoil > 0) y += Math.sin((Math.PI * s) / L) * 6 * recoil;
      pts.push([x, y]);
    }
    return pts;
  };
  const spikes = [0, 0.8, 1.6, 2.4, 3.14, 3.9, 4.7, 5.5].map((a, i) => ({ a: a + Rg.range(-0.15, 0.15), len: (i === 0 ? 13 : i % 2 ? 6 : 9) + Rg.range(0, 3), w: 1.4 + Rg.range(0, 0.5) }));
  const slivers = [-1.2, -0.3, 0.5, 1.3].map((a) => ({ a: a + Rg.range(-0.2, 0.2), r: Rg.range(4, 6), v: Rg.range(80, 120), arc: Rg.range(0.4, 0.7) }));
  let t = 0, cracked = false;
  const tipTrail = [];
  return {
    update(dt) {
      t += dt;
      if (t > CRACK - 0.05 && t < CRACK + 0.01) {
        const pts = shape(t);
        tipTrail.push({ p: pts[pts.length - 1], t });
      }
      for (let i = tipTrail.length - 1; i >= 0; i--) if (t - tipTrail[i].t > 0.06) tipTrail.splice(i, 1);
      if (!cracked && t >= CRACK) {
        cracked = true;
        lights.add(TIP[0], TIP[1], 46, C[4], 0.6, 0.3);
        lights.add(TIP[0], TIP[1], 14, WHITE, 0.8, 0.07);
        for (let i = 0; i < 16; i++) {
          const a = Rg.range(-1.3, 1.2), sp = Rg.range(130, 300);
          ps.spawn(P.SPARK, TIP[0], TIP[1], Math.cos(a) * sp, Math.sin(a) * sp - 40, Rg.range(0.12, 0.36));
        }
        for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, TIP[0] + Rg.range(-2, 3), TIP[1] + Rg.range(-2, 2), Rg.range(10, 40), -Rg.range(6, 18), Rg.range(0.5, 0.8), C[2], Rg.range(2.5, 4), Rg.range(0.02, 0.06));
        for (let i = 0; i < 4; i++) ps.spawn(P.STAR, TIP[0] + Rg.range(-8, 10), TIP[1] + Rg.range(-8, 8), 0, -3, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(0.8, 1.8), Rg.range(0.05, 0.2));
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      const end = CRACK + 0.04 + RECOIL;
      if (t < end) {
        const fade = 1 - smooth(end - 0.06, end, t);
        // afterimages of the whip a beat and two beats back: the loop's motion
        if (t < CRACK)
          for (const [lag, c, a] of [[0.03, C[1], 0.5], [0.015, C[2], 0.7]]) {
            const old = shape(Math.max(0, t - lag));
            for (let i = 1; i < old.length; i += 2) p.dot(old[i][0], old[i][1], c, a);
          }
        // the whip: thicker and lit near the handle, a single line to the tip
        const pts = shape(t), n = pts.length, l = lam(t), r = 6.5 - 3.5 * (l / L);
        for (let i = 1; i < n; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], u = i / n, s = i;
          // the loop's leading half is moving fastest: it runs hot
          const inLoop = t < CRACK && s > l && s < l + Math.PI * r, lead = inLoop && Math.abs(s - l - (Math.PI * r) / 2) < r * 0.9;
          p.line(x0, y0, x1, y1, lead ? WHITE : inLoop ? C[5] : u < 0.5 ? C[4] : C[3], fade);
          if (u < 0.4) p.line(x0, y0 + 1, x1, y1 + 1, C[2], fade);
        }
        // the running loop is the fastest part: it shines
        if (t < CRACK) {
          const l = lam(t), r = 6.5 - 3.5 * (l / L);
          p.glow(HX + l + r, HY + r, 12, C[4], 0.4);
        }
      }
      // the tip's path just before the crack: a white-hot streak
      for (let i = 1; i < tipTrail.length; i++) {
        const k = 1 - (t - tipTrail[i].t) / 0.06;
        p.line(tipTrail[i - 1].p[0], tipTrail[i - 1].p[1], tipTrail[i].p[0], tipTrail[i].p[1], k > 0.6 ? WHITE : C[5], k);
      }
      // the crack: a white pop, a ring of air, slivers
      const q = t - CRACK;
      if (q >= 0 && q < 0.035) star(p, TIP[0], TIP[1], spikes, 1, 1, WHITE, C[5], C[6], C[4]);
      else if (q >= 0.035 && q < 0.07) star(p, TIP[0], TIP[1], spikes, 1.3, 0.5, C[6], C[5], C[5], C[3]);
      if (q >= 0.02 && q < 0.2) {
        const k = (q - 0.02) / 0.18, r = 4 + 16 * ease.outCubic(k), th = Math.max(1, 2.2 * (1 - k)), col = k < 0.25 ? WHITE : k < 0.5 ? C[5] : k < 0.75 ? C[4] : C[3];
        for (let a = 0; a < TAU; a += 0.6 / r)
          for (let o = 0; o < th; o += 0.5) p.dot(TIP[0] + Math.cos(a) * (r - o), TIP[1] + Math.sin(a) * (r - o) * 0.8, col, 1.15 - k);
        p.glow(TIP[0], TIP[1], r + 6, C[4], 0.25 * (1 - k));
      }
      if (q >= 0.04 && q < 0.16) {
        const k = (q - 0.04) / 0.12;
        for (const s of slivers) sliver(p, TIP[0], TIP[1], s.a, s.r + s.v * (q - 0.04), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : C[5], 1 - k);
      }
      if (q >= 0 && q < 0.15) p.glow(TIP[0], TIP[1], 26, C[5], 0.7 * Math.exp(-q / 0.04));
      ps.draw(p);
      lights.draw(p);
    },
  };
}
