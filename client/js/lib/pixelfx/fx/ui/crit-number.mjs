import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, clamp, seg, smooth, ease, rand, TAU, WHITE, scale } from "../../core/index.mjs";
import { spell, drawWord, shake } from "./_lib.mjs";

export const meta = {
  name: "Crit number",
  desc: "CRIT 128! slams in huge and white over a jagged starburst with a hard shake and speed lines, cools to fire, holds with a shine, then pops into sparks.",
  tags: ["ui", "critical", "damage", "number", "combat", "text", "one-shot"],
  size: [152, 120],
  origin: [76, 60],
  duration: 1.5,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#2a0710", "#5e0f16", "#a3191c", "#e0401c", "#ff7b22", "#ffb93b", "#ffe68a", "#ffffff"], text: "128!", label: "CRIT", seed: 3 },
};

const FOLD = 0.92, TAGOUT = 0.98, POP = 1.06, SX = 1.3, NS = 4, NY = 5;

// the jagged starburst: a spiky polygon with a dark rim, a bright inner contour, bands that cool from the
// white-hot middle out, and spokes of light running to every tip. heat 1 is white all through.
function starburst(p, C, cx, cy, R, rot, tips, heat, boil, a = 1) {
  if (R < 2 || a <= 0) return;
  const n = tips.length, V = [];
  for (let i = 0; i < n * 2; i++) {
    const an = rot + (i * Math.PI) / n, r = R * (i % 2 ? 0.6 + tips[i >> 1].dip : tips[i >> 1].len * (1 + 0.14 * (rand(boil, i) - 0.5)));
    V.push([Math.cos(an) * r, Math.sin(an) * r, an]);
  }
  const step = Math.PI / n;
  const edge = (dx, dy) => {
    // where the ray from the middle through (dx, dy) leaves the polygon: the vertices sit at even angles, so
    // the ray's angle names the one edge it can cross
    let a = Math.atan2(dy, dx) - rot;
    a -= Math.floor(a / TAU) * TAU;
    const i = Math.min(V.length - 1, Math.floor(a / step)), [x0, y0] = V[i], [x1, y1] = V[(i + 1) % V.length];
    const ex = x1 - x0, ey = y1 - y0, den = dx * ey - dy * ex;
    return Math.abs(den) < 1e-9 ? Math.hypot(x0, y0) : (x0 * ey - y0 * ex) / den;
  };
  const M = R * 1.15 + 2;
  p.shade(cx - M * SX, cy - M, cx + M * SX, cy + M, (x, y, o) => {
    const dx = (x - cx) / SX, dy = y - cy, d = Math.hypot(dx, dy);
    if (d < 0.01) return WHITE;
    const L = edge(dx / d, dy / d), gap = (L - d) * (1 + 0.3 * Math.abs(dx / d)), q = d / L;
    if (gap < 0) return;
    o.a = a;
    if (heat > 0.85) return gap < 1 ? C[6] : WHITE;
    // a dark edge, a glowing rim inside it, then a middle that deepens to dark red for the number to stand on
    if (gap < 1) return C[1];
    if (gap < 2.2) return heat > 0.3 ? WHITE : C[6];
    if (gap < 3.4) return heat > 0.3 ? C[6] : C[5];
    if (gap >= 6 && gap < 7) return heat > 0.5 ? WHITE : C[4];
    // spokes: a line of light from the middle out to each tip
    const an = Math.atan2(dy, dx) - rot, sp = Math.abs(((an / TAU) * n + 0.5) % 1 - 0.5) * (TAU / n) * d;
    if (sp < 0.6 && q > 0.25) return heat > 0.5 ? WHITE : q > 0.6 ? C[5] : C[4];
    const i = Math.round((q > 0.72 ? 3 : q > 0.45 ? 4 : 5) - heat * 5);
    return i <= 0 ? WHITE : [WHITE, C[6], C[5], C[4], C[3], C[2]][i];
  });
}

// the CRIT tag: a leaning dark plate with a lit top edge
function tag(p, C, x, y, w, h, lean) {
  p.shade(x - 1, y - 1, x + w + lean + 1, y + h + 1, (px, py) => {
    const lx = px - x - lean * ((y + h - py) / h);
    if (py < y || py > y + h || lx < 0 || lx > w) return;
    if (lx < 1 || lx > w - 1 || py < y + 1 || py > y + h - 1) return C[0];
    return py < y + 2 ? C[4] : py < y + h * 0.55 ? C[3] : C[2];
  });
}

// speed lines thrown out round the burst
function speedLines(p, C, t, lines) {
  const k = t / 0.24;
  if (k <= 0 || k >= 1) return;
  for (const l of lines) {
    const r0 = l.r * (1 + 0.5 * ease.outExpo(k)), r1 = r0 + l.len * (1 - k) + 2, ca = Math.cos(l.a) * 1.2, sa = Math.sin(l.a) * 0.92;
    p.line(ca * r0, sa * r0, ca * r1, sa * r1, (u) => (u > 0.5 || k < 0.3 ? WHITE : C[6]));
  }
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), SHADOW = scale(C[0], 0.5);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), bits = new Bits(), lights = new Lights();
  const num = spell(o.text), lab = spell(o.label, "mini");
  const tips = Array.from({ length: 13 }, () => ({ len: R.range(0.86, 1.12), dip: R.range(-0.06, 0.06) }));
  const lines = Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * TAU + R.range(-0.1, 0.1), r: R.range(31, 34), len: R.range(8, 15) }));
  // how long a spark launched at v px/s may live before its drag carries it d px (so none leaves the canvas)
  const reach = (v, d) => (v <= d * 2.2 ? 9 : -Math.log(1 - (d * 2.2) / v) / 2.2);
  const end = meta.duration - 0.05;
  let t = 0, slammed = false, stamped = false, popped = false, tagGone = false;
  const spawnStar = (x, y, vx, vy, life, c, size) => ps.spawn(P.STAR, x, y, vx, vy, Math.min(life, end - t), c, size);

  // the number's size: huge for the first frame, then a stiff spring down to 3 px a pixel
  const sizeAt = (t) => NS + 3 * Math.exp(-t * 26) * Math.cos(t * 38);
  return {
    update(dt) {
      t += dt;
      if (!slammed) {
        slammed = true;
        lights.add(0, 0, 70, WHITE, 0.9, 0.16);
        lights.add(0, 0, 60, C[4], 0.45, 0.5);
        for (let i = 0; i < 30; i++) {
          const an = R.range(0, TAU), sp = R.range(140, 300);
          ps.spawn(P.SPARK, Math.cos(an) * 8, Math.sin(an) * 6, Math.cos(an) * sp * 1.15, Math.sin(an) * sp - 40, Math.min(R.range(0.12, 0.32), reach(sp * 1.15, 40)));
        }
        for (let i = 0; i < 10; i++) {
          const an = R.range(0, TAU), sp = R.range(90, 170);
          bits.add({ kind: B.SHARD, x: Math.cos(an) * 10, y: Math.sin(an) * 7, vx: Math.cos(an) * sp * 1.15, vy: Math.sin(an) * sp - 60, g: 0.35, drag: 1.6, life: Math.min(R.range(0.3, 0.5), end - t), a: R.range(0, TAU), va: R.range(-24, 24), s: R.range(2, 3.5), c: R.pick([C[7], C[6], C[5]]) });
        }
      }
      // the label stamps down a beat later
      if (!stamped && t >= 0.09) {
        stamped = true;
        lights.add(-4, -20, 30, C[6], 0.5, 0.2);
        for (let i = 0; i < 6; i++) ps.spawn(P.STAR, -4 + R.range(-16, 16), -20 + R.range(-4, 4), R.range(-40, 40), R.range(-30, 10), R.range(0.2, 0.4), C[6], R.range(0.5, 1.4));
      }
      // the tag bursts into sparkles as it goes
      if (!tagGone && t >= TAGOUT) {
        tagGone = true;
        for (let i = 0; i < 6; i++) spawnStar(-10 + R.range(-16, 16), -14 + R.range(-5, 5), R.range(-50, 50), -R.range(10, 60), R.range(0.25, 0.4), R.pick([C[7], C[6]]), i ? 0.6 : 1.6);
      }
      // the burst crackles: sparks spit from its tips
      if (t > 0.3 && t < FOLD - 0.1 && R.chance(0.07)) {
        const an = R.range(0, TAU), sp = R.range(70, 150);
        ps.spawn(P.SPARK, Math.cos(an) * 30 * SX, Math.sin(an) * 30, Math.cos(an) * sp, Math.sin(an) * sp - 30, Math.min(R.range(0.12, 0.26), reach(sp, 14)));
      }
      // embers lift off the burst while it holds
      if (t > 0.12 && t < FOLD && R.chance(0.16)) {
        const an = R.range(0, TAU), r = R.range(14, 28);
        ps.spawn(P.EMBER, Math.cos(an) * r * SX, Math.sin(an) * r, R.range(-10, 10), -R.range(15, 40), Math.min(R.range(0.5, 0.9), end - t), C[5], R.range(1, 2));
      }
      if (!popped && t >= POP + 0.05) {
        popped = true;
        lights.add(0, 0, 44, C[6], 0.7, 0.25);
        for (let i = 0; i < 14; i++) {
          const an = (i / 14) * TAU + R.range(-0.15, 0.15), sp = R.range(60, 130);
          ps.spawn(P.STAR, Math.cos(an) * 10 * SX, Math.sin(an) * 7, Math.cos(an) * sp * SX, Math.sin(an) * sp - 10, Math.min(R.range(0.3, 0.42), end - t), R.pick([C[7], C[6], C[5]]), i % 3 ? 0.6 : R.range(1.3, 2.2));
        }
        for (let i = 0; i < 8; i++) {
          const an = R.range(0, TAU), sp = R.range(120, 240);
          ps.spawn(P.SPARK, Math.cos(an) * 6, Math.sin(an) * 4, Math.cos(an) * sp, Math.sin(an) * sp - 30, Math.min(R.range(0.15, 0.3), end - t, reach(sp, 40)));
        }
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },

    draw(p) {
      const [sx, sy] = shake(t, 4, 0, 0.32, o.seed), [lx, ly] = shake(t, 2, 0.09, 0.15, o.seed + 3);
      // the burst: white on the slam, cooling; it breathes while it holds, then folds away
      const grow = t < 0.04 ? 1.25 : 1 + 0.1 * Math.exp(-(t - 0.04) * 14), fold = 1 - ease.inBack(seg(t, FOLD - 0.12, FOLD), 2.4);
      const heat = t < 0.035 ? 1 : clamp(1 - (t - 0.035) / 0.12), breathe = 1 + 0.04 * Math.sin(t * 16);
      // it boils: the spikes re-roll a little every few frames
      if (fold > 0.02) starburst(p, C, sx, sy, 31 * grow * fold * breathe, -Math.PI / 2 + 0.25 * t, tips, heat, t < 0.2 ? 0 : Math.floor(t * 10));
      speedLines(p, C, t, lines);
      // the ring the slam throws out
      const rk = t / 0.26;
      const rr = 30 + 22 * ease.outCubic(rk);
      if (rk > 0 && rk < 1) p.ellipse(0, 0, rr * SX, rr, rk < 0.35 ? WHITE : C[6], (d) => (d > 1 - 1.6 / rr ? 1.2 - rk : 0));
      bits.draw(p);
      ps.draw(p);
      // the number: slams in huge and white, settles with a spring; a shine runs over it; it pops at the end
      let s = sizeAt(t), sxN = s, syN = s, flash = t < 0.035 ? 1 : t < 0.07 ? 0.5 : 0;
      const pu = (t - POP) / 0.05;
      if (pu >= 1) {
        // gone: a ring where it was
        const k = (t - POP - 0.05) / 0.22;
        if (k > 0 && k < 1) p.ellipse(0, 0, (6 + 22 * ease.outCubic(k)) * SX, 6 + 22 * ease.outCubic(k), k < 0.4 ? WHITE : C[6], (d) => (d > 1 - 1.5 / (6 + 22 * ease.outCubic(k)) ? 1.3 - k : 0));
      } else {
        const sq = seg(t, POP - 0.07, POP);
        if (sq > 0 && pu <= 0) (sxN = NS * (1 + 0.14 * sq)), (syN = NS * (1 - 0.12 * sq));
        if (pu > 0) (sxN = syN = NS * (1 + 0.25 * pu)), (flash = 1);
        const W = num.w * sxN, H = 7 * syN, x0 = sx - W / 2 - 3, y0 = sy + NY - H / 2 - 3 * smooth(0.15, FOLD, t);
        const items = num.letters.filter((L) => L.g).map((L) => ({ g: L.g, x: x0 + L.x * sxN, y: y0, sx: sxN, sy: syN, slant: 1, flash }));
        const sh = seg(t, 0.36, 0.6), shine = sh > 0 && sh < 1 ? x0 - 10 + (W + 26) * ease.inOutSine(sh) : null;
        drawWord(p, items, { fill: [C[5], C[6], C[6], C[7]], edge: WHITE, under: C[4], outline: C[0], ow: 2, shadow: SHADOW, shine, shineY: y0, glint: C[5] });
        if (shine !== null && shine > x0 && shine < x0 + W) p.glowLine(shine, y0, shine + 0.6 * H, y0 + H, 8, C[6], 0.3);
        // the label stamps down on top, a size too big for a frame
        const lk = t - 0.06, lo = seg(t, TAGOUT - 0.05, TAGOUT);
        if (lk > 0 && t < TAGOUT) {
          const ls = lk < 0.035 ? 3 : lk < 0.07 ? 1.8 : 2 * (1 + 0.15 * lo), LW = lab.w * ls, lh = 5 * ls, lxo = sx + lx - 8 - LW / 2, lyo = y0 - 3 - lh + ly - 2 * lo;
          if (lo > 0.5) tag(p, { 0: WHITE, 2: WHITE, 3: WHITE, 4: WHITE }, lxo - 4, lyo - 3, LW + 8, lh + 5, 3);
          else tag(p, C, lxo - 4, lyo - 3, LW + 8, lh + 5, 3);
          const lit = lab.letters.filter((L) => L.g).map((L) => ({ g: L.g, x: lxo + 1 + L.x * ls, y: lyo, sx: ls, sy: ls, slant: 0.5, flash: lk < 0.035 ? 1 : 0 }));
          drawWord(p, lit, { fill: [C[6], C[7], C[7]], edge: WHITE, under: C[5], outline: 0, shadow: C[1] });
        }
        // a glint on the number's corner after the shine
        const g = (t - 0.6) / 0.24;
        if (g > 0 && g < 1) sparkle(p, x0 + W - 2, y0 + 1, 6 * Math.sin(g * Math.PI), C[6], C[5], 0.6);
      }
      // light: the white flash of the slam, then a hot glow that pulses while it holds
      const hold = smooth(0, 0.1, t) * (1 - smooth(FOLD - 0.1, POP + 0.1, t));
      p.glow(sx, sy, 56, C[4], 0.14 * hold * (1 + 0.2 * Math.sin(t * 16)));
      if (t < 0.12) p.glow(0, 0, 64, WHITE, 0.8 * (1 - t / 0.12));
      lights.draw(p);
    },
  };
}
