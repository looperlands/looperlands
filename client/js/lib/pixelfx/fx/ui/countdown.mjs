import { Particles, Lights, P, Rng, fit, sparkle, clamp, seg, smooth, ease, TAU, WHITE, scale } from "../../core/index.mjs";
import { spell, drawWord, shake } from "./_lib.mjs";

export const meta = {
  name: "Countdown",
  desc: "3, 2, 1 slam into a timer ring that drains like a burning fuse, throwing sparks; then GO! bursts out as the ring blows into a shockwave with rays.",
  tags: ["ui", "countdown", "start", "timer", "text", "one-shot"],
  size: [152, 136],
  origin: [76, 68],
  duration: 3.1,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#0a1030", "#142a66", "#1f4fae", "#2f86e6", "#5cc4ff", "#a8e8ff", "#e6fbff", "#ffffff"],
    go: ["#0b2410", "#16501c", "#22882a", "#3cc23a", "#7ee84c", "#c4ff8a", "#f0ffd6", "#ffffff"],
    from: 3,
    word: "GO!",
    seed: 5,
  },
};

const STEP = 0.62, R = 30, TOP = -Math.PI / 2;

// the timer: a dark socket, ticks round it, and the lit arc from the burning head round to the top
function timer(p, C, x, y, f, flash, t) {
  p.ring(x, y, R + 4, 8, (v) => (v < 0.13 || v > 0.87 ? C[0] : C[1]));
  // a fine dotted dial inside the track, turning
  for (let j = 0; j < 40; j++) {
    const an = (j / 40) * TAU + t * 0.6;
    p.dot(x + Math.cos(an) * (R - 6), y + Math.sin(an) * (R - 6), j % 5 ? C[2] : C[4], 1);
  }
  const head = TOP + TAU * (1 - f);
  for (let i = 0; i < 12; i++) {
    const an = TOP + (i * TAU) / 12, lit = an >= head - 1e-6 || f >= 0.999, near = Math.abs(an - head) < 0.2 && f < 0.999;
    const ca = Math.cos(an), sa = Math.sin(an);
    p.line(x + ca * (R + 6), y + sa * (R + 6), x + ca * (R + 8), y + sa * (R + 8), flash || near ? WHITE : lit ? C[5] : C[2]);
  }
  if (f <= 0.002) return head;
  p.arc(x, y, R + 2, 5, head, TOP + TAU, (u, v) => {
    const d = u * TAU * f;
    if (flash || d < 0.1) return WHITE;
    if (d < 0.32) return v > 0.5 ? WHITE : C[6];
    return v > 0.75 ? C[6] : v > 0.4 ? C[5] : v > 0.15 ? C[4] : C[3];
  });
  // light runs round the lit arc, hottest at the head
  for (let an = head + 0.25; an < TOP + TAU; an += 0.55) p.glow(x + Math.cos(an) * (R - 0.5), y + Math.sin(an) * (R - 0.5), 9, C[4], 0.12);
  const hx = x + Math.cos(head) * (R - 0.5), hy = y + Math.sin(head) * (R - 0.5);
  p.glow(hx, hy, 14, C[5], 0.5);
  if (!flash) sparkle(p, hx, hy, 2 + 1.5 * (0.5 + 0.5 * Math.sin(t * 40)), C[6], C[5], 0.4);
  return head;
}

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.go, 8), Rg = new Rng(o.seed), n = clamp(Math.round(o.from), 1, 3);
  const ps = new Particles({ rng: Rg, sparks: [C[7], C[6], C[5], C[3]] }), gs = new Particles({ rng: Rg, sparks: [G[7], G[6], G[5], G[3]] });
  const lights = new Lights(), GO = n * STEP, OUT = GO + 0.78, end = meta.duration - 0.05;
  const digits = Array.from({ length: n }, (_, i) => spell(String(n - i))), word = spell(o.word);
  const rays = Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * TAU + Rg.range(-0.06, 0.06), L: i % 2 ? Rg.range(10, 16) : Rg.range(22, 30) }));
  const sizeAt = (u, base, big) => base + big * Math.exp(-u * 26) * Math.cos(u * 38);
  const reach = (v, d) => (v <= d * 2.2 ? 9 : -Math.log(1 - (d * 2.2) / v) / 2.2);
  let t = 0, beat = -1, went = false, popped = false;

  return {
    update(dt) {
      t += dt;
      const i = Math.floor(t / STEP);
      // each number slams in: the ring refills white and throws a ring of sparks
      if (t < GO && i !== beat) {
        beat = i;
        lights.add(0, 0, 54, C[5], 0.6, 0.35);
        for (let j = 0; j < 14; j++) {
          const an = (j / 14) * TAU + Rg.range(-0.1, 0.1), sp = Rg.range(90, 200);
          ps.spawn(P.SPARK, Math.cos(an) * (R + 2), Math.sin(an) * (R + 2), Math.cos(an) * sp, Math.sin(an) * sp, Math.min(Rg.range(0.12, 0.3), reach(sp, 26)));
        }
      }
      // the burning head of the arc spits sparks as it runs
      if (t < GO) {
        const k = (t % STEP) / STEP, f = 1 - seg(k, 0.06, 0.97), head = TOP + TAU * (1 - f);
        if (f > 0.01 && f < 0.99 && Rg.chance(0.7)) {
          const hx = Math.cos(head) * R, hy = Math.sin(head) * R, tx = -Math.sin(head), ty = Math.cos(head), out = Rg.range(-0.4, 1), sp = Rg.range(60, 150);
          ps.spawn(P.SPARK, hx, hy, (-tx * 0.8 + Math.cos(head) * out) * sp, (-ty * 0.8 + Math.sin(head) * out) * sp - 20, Rg.range(0.12, 0.28));
          // and leaves cinders drifting off the burnt-out track behind it
          if (Rg.chance(0.15)) ps.spawn(P.EMBER, hx, hy, Math.cos(head) * Rg.range(5, 20), Math.sin(head) * Rg.range(5, 20), Rg.range(0.4, 0.8), C[5], 1);
        }
      }
      // GO!: the ring blows out, sparks and stars everywhere
      if (!went && t >= GO) {
        went = true;
        lights.add(0, 0, 70, WHITE, 0.9, 0.18);
        lights.add(0, 0, 64, G[5], 0.7, 0.8);
        for (let j = 0; j < 36; j++) {
          const an = Rg.range(0, TAU), sp = Rg.range(120, 300);
          gs.spawn(P.SPARK, Math.cos(an) * R, Math.sin(an) * R, Math.cos(an) * sp, Math.sin(an) * sp - 40, Math.min(Rg.range(0.18, 0.36), reach(sp, 24)));
        }
        for (let j = 0; j < 18; j++) {
          const an = Rg.range(0, TAU), sp = Rg.range(30, 80), r = Rg.range(10, 28);
          gs.spawn(P.STAR, Math.cos(an) * r, Math.sin(an) * r, Math.cos(an) * sp, Math.sin(an) * sp - 10, Rg.range(0.5, 1), Rg.pick([G[7], G[6], G[5]]), Rg.chance(0.4) ? Rg.range(1.5, 2.5) : 0.6);
        }
      }
      // it twinkles while it holds
      if (t > GO + 0.2 && t < OUT - 0.1 && Rg.chance(0.12)) {
        const an = Rg.range(0, TAU), r = Rg.range(30, 46);
        gs.spawn(P.STAR, Math.cos(an) * r, Math.sin(an) * r * 0.8, 0, -Rg.range(4, 12), Rg.range(0.3, 0.6), Rg.pick([G[7], G[6]]), Rg.chance(0.3) ? 1.6 : 0.6);
      }
      if (!popped && t >= OUT + 0.05) {
        popped = true;
        lights.add(0, 0, 40, G[6], 0.6, 0.25);
        for (let j = 0; j < 14; j++) {
          const an = (j / 14) * TAU + Rg.range(-0.15, 0.15), sp = Rg.range(60, 130);
          gs.spawn(P.STAR, Math.cos(an) * 12, Math.sin(an) * 8, Math.cos(an) * sp, Math.sin(an) * sp * 0.8 - 10, Math.min(Rg.range(0.3, 0.45), end - t), Rg.pick([G[7], G[6], G[5]]), j % 3 ? 0.6 : Rg.range(1.3, 2));
        }
      }
      ps.update(dt);
      gs.update(dt);
      lights.update(dt);
    },

    draw(p) {
      if (t < GO) {
        const i = Math.floor(t / STEP), u = t - i * STEP, k = u / STEP;
        const [sx, sy] = shake(t, 3, i * STEP, 0.22, o.seed + i);
        const f = 1 - seg(k, 0.06, 0.97), flash = u < 0.07;
        // a shock ring off each slam
        const rk = u / 0.3;
        if (rk < 1) p.ring(sx, sy, R + 6 + 22 * ease.outCubic(rk), 1.5 * (1 - rk) + 1, rk < 0.3 ? WHITE : C[5], 1.3 * (1 - rk));
        timer(p, C, sx, sy, f, flash, t);
        // the slam's white-hot frame fills the ring
        if (u < 0.035) p.circle(sx, sy, R - 3, WHITE);
        else if (u < 0.07) p.ring(sx, sy, R - 3, 3, C[6]);
        // the number: huge and white for a frame, then a stiff spring down to size
        const s = sizeAt(u, 5, 2), d = digits[i], W = d.w * s, H = 7 * s, x0 = sx - W / 2, y0 = sy - H / 2;
        const items = d.letters.filter((L) => L.g).map((L) => ({ g: L.g, x: x0 + L.x * s, y: y0, sx: s, sy: s, flash: u < 0.035 ? 1 : u < 0.07 ? 0.4 : 0 }));
        drawWord(p, items, { fill: [C[4], C[5], C[6], C[7]], edge: WHITE, under: C[3], outline: C[0], ow: 2, shadow: scale(C[0], 0.5) });
        p.glow(sx, sy, 30, C[4], 0.22 + (u < 0.12 ? 0.6 * (1 - u / 0.12) : 0));
        p.glow(sx, sy, R + 8, C[3], 0.2 * (1 - k) + 0.08);
      } else {
        const u = t - GO, [sx, sy] = shake(t, 4, GO, 0.3, o.seed + 9);
        // the ring blows out into a shockwave
        const bk = u / 0.4;
        if (bk < 1) {
          const r = R + 4 + 30 * ease.outCubic(bk), w = Math.max(1, 7 * (1 - bk));
          p.ring(0, 0, r, w, (v) => (bk < 0.2 || v > 0.6 ? WHITE : G[6]), 1.4 * (1 - bk));
          p.glowRing(0, 0, r - w / 2, 8, G[5], 0.5 * (1 - bk));
        }
        const ik = (u - 0.05) / 0.3;
        if (ik > 0 && ik < 1) p.ring(0, 0, R + 22 * ease.outCubic(ik), 1, G[5], 1.2 * (1 - ik));
        // rays: shoot out from just outside the word, turn slowly, draw back in
        const rk = ease.outExpo(clamp(u / 0.18)) * (1 - ease.inQuad(seg(t, OUT - 0.25, OUT + 0.05)));
        for (const ry of rays) {
          if (rk <= 0.02) break;
          const an = ry.a + u * 0.35, ca = Math.cos(an), sa = Math.sin(an), r0 = 1 / Math.sqrt((ca / 40) ** 2 + (sa / 23) ** 2) + 3 * rk, r1 = r0 + ry.L * 0.7 * rk;
          p.line(ca * r0, sa * r0, ca * r1, sa * r1, (q) => (q < 0.3 ? WHITE : q < 0.65 ? G[6] : G[5]), (q) => (q < 0.6 ? 1.3 : (1.3 * (1 - q)) / 0.4));
        }
        // GO!: slams in bigger than the numbers, throbs while it holds, then pops
        const pu = (t - OUT) / 0.06;
        if (pu < 1) {
          let s = sizeAt(u, 5, 3.5), flash = u < 0.035 ? 1 : u < 0.07 ? 0.4 : 0;
          const throb = Math.max(0, Math.sin((u - 0.25) * 9)) * smooth(0.25, 0.35, u);
          if (pu > 0) (s = 5 * (1 + 0.25 * pu)), (flash = 1);
          const W = word.w * s, H = 7 * s, x0 = sx - W / 2, y0 = sy - H / 2;
          const items = word.letters.filter((L) => L.g).map((L) => ({ g: L.g, x: x0 + L.x * s, y: y0, sx: s, sy: s, slant: 1, flash }));
          const sh = seg(u, 0.32, 0.56), shine = sh > 0 && sh < 1 ? x0 - 8 + (W + 22) * ease.inOutSine(sh) : null;
          drawWord(p, items, { fill: [G[4], G[5], G[6], G[7]], edge: WHITE, under: G[3], outline: G[0], ow: 2, shadow: scale(G[0], 0.5), shine, shineY: y0, glint: G[6] });
          p.glow(sx, sy, 46, G[5], 0.25 + 0.15 * throb + (u < 0.12 ? 0.7 * (1 - u / 0.12) : 0));
        } else {
          const k = (t - OUT - 0.06) / 0.22;
          if (k > 0 && k < 1) p.ring(0, 0, 8 + 26 * ease.outCubic(k), 1, k < 0.4 ? WHITE : G[6], 1.3 * (1 - k));
        }
      }
      ps.draw(p);
      gs.draw(p);
      lights.draw(p);
    },
  };
}
