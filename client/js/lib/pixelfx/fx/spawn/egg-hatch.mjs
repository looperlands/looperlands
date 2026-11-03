// The cracks that open in stages and the burst into tumbling pieces follow Sprite Fusion's open-source ice
// shatter (https://www.spritefusion.com/pixel-art-vfx/ice), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, clamp, smooth, ease, rand, TAU, WHITE, hex, mix } from "../../core/index.mjs";

export const meta = {
  name: "Egg hatch",
  desc: "A speckled egg rocks three times, each rock cracking it further with warm light leaking out, then pops: light pours out of the opening and lit shell halves tumble away.",
  tags: ["spawn", "egg", "hatch", "birth", "crack", "shell", "light", "ground", "one-shot"],
  size: [120, 96],
  origin: [60, 84],
  duration: 3.1,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1e1826", "#4a3e52", "#857684", "#c4b4ac", "#ece0d2", "#fffaf0"],
    glow: ["#ff8a2a", "#ffd25a", "#fff3c0"],
    speckle: "#9a6a52",
    seed: 31,
  },
};

const WOBBLES = [[0.3, 0.11], [0.85, 0.19], [1.4, 0.28]], POP = 1.98, EW = 16, EH = 20, ZY = 11;
const LIGHT = [-0.72, 0.5, 0.48]; // from the upper left, a little toward us

// the egg in its own pixels: x across from its middle, y up from its base; wider low than high
const EGG = [];
for (let y = 0; y < EH; y++)
  for (let x = -EW / 2; x < EW / 2; x++) {
    const v = (y + 0.5) / EH, u = (x + 0.5) / (EW / 2), half = Math.sqrt(Math.max(0, 1 - (2 * v - 1) ** 2)) * (1.08 - 0.22 * v);
    if (Math.abs(u) <= half) EGG.push({ x, y, u, v, half });
  }

export function create(o) {
  const C = fit(o.palette, 6), G = fit(o.glow, 3), SPK = hex(o.speckle), R = new Rng(o.seed), floor = () => 0;
  const at = new Map();
  for (const e of EGG) at.set(`${e.x},${e.y}`, e);
  const has = (x, y) => at.has(`${x},${y}`);
  // shading: a round shell lit from the upper left, a core shadow, a rim of bounce light on the dark side
  for (const e of EGG) {
    const nx = clamp(e.u / Math.max(0.05, e.half), -1, 1), ny = (2 * e.v - 1) * 0.9, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], edge = !has(e.x - 1, e.y) || !has(e.x + 1, e.y) || !has(e.x, e.y - 1) || !has(e.x, e.y + 1);
    let c = d > 0.9 ? WHITE : d > 0.62 ? C[5] : d > 0.32 ? C[4] : d > 0.02 ? C[3] : d > -0.3 ? C[2] : C[1];
    if (edge && nx > 0.25 && ny < 0.55) c = C[3]; // rim light on the shadow side
    else if (rand(e.x, e.y, 3) < 0.08 && e.v > 0.12 && !edge) c = d > 0.2 ? SPK : mix(SPK, C[1], 0.5);
    e.c = c;
    e.lit = d;
  }
  // cracks: three stages, the last a zigzag right round the egg where the top breaks off
  const crack = new Map();
  // a crack: a jagged line, zigging either side of its heading, every step joined pixel to pixel
  const walk = (x, y, a, len, s) => {
    let px = Math.round(x), py = Math.round(y);
    for (let i = 0; i < len; i++) {
      const side = (i % 2 ? 1 : -1) * R.range(0.6, 1.3);
      a += R.range(-0.25, 0.25);
      x += Math.cos(a) * 1.8 - Math.sin(a) * side * 0.6;
      y += Math.sin(a) * 1.8 + Math.cos(a) * side * 0.6;
      const nx = Math.round(x), ny = Math.round(y);
      for (let j = 1, n = Math.max(Math.abs(nx - px), Math.abs(ny - py)); j <= n; j++) {
        const k = `${Math.round(px + ((nx - px) * j) / n)},${Math.round(py + ((ny - py) * j) / n)}`;
        if (!at.has(k)) return;
        if (!crack.has(k)) crack.set(k, s);
      }
      (px = nx), (py = ny);
    }
  };
  walk(2, 15, -2.2, 3, 0);
  walk(2, 15, 0.3, 2, 0);
  walk(-2, 13, -0.6, 3, 1);
  walk(-2, 13, 2.7, 3, 1);
  walk(3, 11, 1.9, 2, 1);
  walk(2, 15, 1.5, 2, 1);
  const zig = [];
  for (let x = -EW / 2; x < EW / 2; x++) {
    const y = ZY + ((x + 8) % 3 === 0 ? 1 : (x + 8) % 3 === 1 ? 0 : -1);
    zig.push(y);
    if (has(x, y)) crack.set(`${x},${y}`, 2);
  }
  const zigAt = (x) => zig[clamp(x + EW / 2, 0, zig.length - 1)];
  // how close each pixel of shell is to an open crack, per stage: light shows through the shell round them
  const near = [0, 1, 2].map((s) => {
    const pts = [...crack].filter(([, cs]) => cs <= s).map(([k]) => k.split(",").map(Number)), m = new Map();
    for (const e of EGG) m.set(`${e.x},${e.y}`, Math.min(9, ...pts.map(([cx, cy]) => Math.hypot(cx - e.x, cy - e.y))));
    return m;
  });

  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, G[2], G[1], G[0]] }), lights = new Lights(), bits = new Bits({ ground: floor }), pieces = [];
  let t = 0, popped = false, crumbled = false, cupA = 0, cupV = 0;
  const done = [false, false, false], CRUMBLE = meta.duration - 0.55;
  const stage = (t) => (t > WOBBLES[2][0] + 0.05 ? 3 : t > WOBBLES[1][0] + 0.05 ? 2 : t > WOBBLES[0][0] + 0.05 ? 1 : 0);
  // the rock: a damped swing about the base, each one harder; a shiver just before it pops
  const angle = (t) => {
    let a = 0;
    for (const [t0, amp] of WOBBLES) {
      const u = t - t0;
      if (u > 0 && u < 0.55) a += amp * Math.sin(u * 22) * Math.exp(-u * 5);
    }
    if (t > POP - 0.14 && t < POP) a += 0.05 * Math.sin(t * 120);
    return a;
  };
  // the light inside: grows with each crack, flashes at the pop, then dies down in the empty cup
  const inner = (t) => (t < POP ? stage(t) / 3 + 0.25 * Math.max(0, Math.sin(t * 9)) * (stage(t) / 3) : 1.6 * Math.exp(-(t - POP) * 2.6));

  // break part of the shell into pieces round a few seeds; each keeps its lit outside and a hot broken edge
  function breakUp(keep, n, v, life) {
    const seeds = Array.from({ length: n }, () => [R.range(-EW / 2 + 1, EW / 2 - 1), R.range(0, EH)]), cells = new Map();
    for (const e of EGG) {
      if (!keep(e.x, e.y)) continue;
      let best = 0, bd = 1e9;
      seeds.forEach(([sx, sy], i) => {
        const d = Math.hypot(e.x - sx, e.y - sy);
        if (d < bd) (bd = d), (best = i);
      });
      if (!cells.has(best)) cells.set(best, []);
      cells.get(best).push(e);
    }
    for (const px of cells.values()) {
      let cx = 0, cy = 0;
      for (const e of px) (cx += e.x + 0.5), (cy += e.y + 0.5);
      (cx /= px.length), (cy /= px.length);
      const map = new Map(), mine = new Set(px.map((e) => `${e.x},${e.y}`));
      for (const e of px) {
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !mine.has(`${e.x + dx},${e.y + dy}`) && has(e.x + dx, e.y + dy));
        // lit by the flash: no piece flies off in shadow
        const c = e.c === C[1] || e.c === C[2] ? C[3] : e.c;
        map.set(`${Math.round(e.x + 0.5 - cx)},${Math.round(-(e.y + 0.5 - cy))}`, [c, edge]);
      }
      const r = Math.max(...px.map((e) => Math.hypot(e.x + 0.5 - cx, e.y + 0.5 - cy))) + 1, [vx, vy] = v(cx, cy), l = life();
      pieces.push({ id: pieces.length + 1, x: cx, y: -cy, vx, vy, a: 0, va: R.range(-10, 10), r, map, life: l, max: l, rest: false, born: t });
    }
  }

  function pop() {
    popped = true;
    breakUp((x, y) => y >= zigAt(x), 6, (cx) => [cx * R.range(8, 13) + R.range(-14, 14), -R.range(140, 210)], () => R.range(0.95, 1.15));
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(70, 170);
      bits.add({ kind: B.SHARD, x: R.range(-5, 5), y: -ZY - R.range(0, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.9, drag: 0.6, bounce: 0.3, life: R.range(0.55, 0.85), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.2, 2.4), c: R.pick([C[5], C[5], C[4], G[2]]) });
    }
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(50, 110);
      ps.spawn(P.STAR, R.range(-3, 3), -ZY - 2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.4, 0.9), R.pick([WHITE, G[2], G[1]]), R.range(1, 2.2));
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + R.range(-1, 1), sp = R.range(100, 200);
      ps.spawn(P.SPARK, R.range(-3, 3), -ZY - 1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.45));
    }
    // a puff of pale dust at the base, gone in a few frames
    for (let i = 0; i < 4; i++) {
      const s = R.sign();
      ps.spawn(P.DUST, s * R.range(5, 8), -1, s * R.range(25, 50), -R.range(2, 6), R.range(0.15, 0.25), C[5], R.range(1, 1.8));
    }
    lights.add(0, -ZY - 10, 40, G[1], 0.9, 0.55);
    lights.add(0, -ZY - 2, 18, WHITE, 0.9, 0.12);
    cupV = R.sign() * 3;
  }

  return {
    update(dt) {
      t += dt;
      // each rock opens more crack: a tick of light, a chip or two of shell, a puff at the base
      WOBBLES.forEach(([t0], i) => {
        if (!done[i] && t >= t0 + 0.05) {
          done[i] = true;
          lights.add(i === 1 ? -3 : 2, -14 + i, 8 + i * 2, G[1], 0.25 + i * 0.08, 0.18);
          for (let j = 0; j < 2 + i * 2; j++) ps.spawn(P.STAR, R.range(-5, 5), -R.range(8, 17), R.range(-20, 20), -R.range(10, 30), R.range(0.25, 0.5), R.pick([WHITE, G[2]]), R.range(0.6, 1.4));
          for (let j = 0; j < i + 1; j++) bits.add({ kind: B.SHARD, x: R.range(-4, 4), y: -R.range(10, 16), vx: R.range(-50, 50), vy: -R.range(40, 90), g: 0.9, drag: 0.5, bounce: 0.3, life: R.range(0.5, 0.8), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1, 1.6), c: C[4] });
          ps.spawn(P.DUST, R.sign() * R.range(5, 7), -0.5, R.sign() * R.range(8, 18), -R.range(1, 3), R.range(0.15, 0.25), C[5], R.range(0.8, 1.4));
        }
      });
      if (!popped && t >= POP) pop();
      // light keeps welling up out of the empty cup for a moment: something came out of there
      if (popped && t < POP + 0.6 && R.chance(0.35)) ps.spawn(P.MOTE, R.range(-4, 4), -ZY - 1, R.range(-8, 8), -R.range(40, 80), Math.min(R.range(0.4, 0.8), meta.duration - 0.1 - t), R.pick([G[2], G[1], WHITE]), 0.7);
      if (popped && !crumbled && t >= CRUMBLE) {
        crumbled = true;
        breakUp((x, y) => y < zigAt(x), 4, (cx) => [cx * R.range(4, 8), -R.range(40, 80)], () => R.range(0.38, 0.48));
        for (let i = 0; i < 3; i++) ps.spawn(P.DUST, R.range(-6, 6), -1, R.sign() * R.range(10, 25), -R.range(2, 6), R.range(0.15, 0.25), C[5], R.range(1, 1.6));
      }
      if (popped) {
        cupV += (-cupA * 90 - cupV * 4) * dt;
        cupA += cupV * dt;
      }
      for (let i = pieces.length - 1; i >= 0; i--) {
        const q = pieces[i];
        if ((q.life -= dt) <= 0) {
          pieces.splice(i, 1);
          continue;
        }
        if (q.rest) continue;
        q.vy += 900 * dt;
        q.vx -= q.vx * 0.6 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.a += q.va * dt;
        const g = -q.r * 0.45;
        if (q.y > g && q.vy > 0) {
          q.y = g;
          if (q.vy > 80) (q.vy *= -0.35), (q.vx *= 0.6), (q.va *= 0.5);
          else (q.rest = true), (q.vx = q.vy = 0);
        }
      }
      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // a soft contact shadow under the egg, shifting as it rocks
      if (!crumbled) {
        const sx = popped ? 0 : -angle(t) * 8, k = popped ? 1 - smooth(POP, CRUMBLE, t) * 0.4 : 1;
        for (let y = -1; y <= 1; y++)
          for (let x = -10; x <= 10; x++) {
            const d = ((x + 0.5 - sx) / 9.5) ** 2 + ((y + 0.5) / 1.8) ** 2;
            if (d < 1) p.blend(x, y, C[0], 0.5 * k * (1 - d));
          }
      }
      // warm light on the floor as it leaks out
      const g = inner(t);
      if (g > 0.05) p.glow(0, -3, 22, G[0], 0.18 * Math.min(1.2, g));
      ps.draw(p, "back");
    },
    draw(p) {
      const st = stage(t), a = popped ? cupA * 0.03 : angle(t), ca = Math.cos(a), sa = Math.sin(a), g = inner(t);
      if (!crumbled)
        p.shade(-12, -EH - 4, 12, 1, (x, y, out) => {
          const ux = Math.floor(x * ca + y * sa), uy = Math.floor(-(-x * sa + y * ca)), e = at.get(`${ux},${uy}`);
          const inside = e && !(popped && uy >= zigAt(ux));
          if (!inside) {
            // a dark outline holds the egg's shape
            const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const f = at.get(`${ux + dx},${uy + dy}`); return f && !(popped && uy + dy >= zigAt(ux + dx)); });
            if (n && !(popped && uy >= zigAt(ux) && uy <= zigAt(ux) + 1)) out.c = C[0];
            return;
          }
          const cs = crack.get(`${ux},${uy}`);
          if (popped) {
            // the cup: its broken rim burns with the light inside, cooling as it fades
            out.c = uy >= zigAt(ux) - 1 ? (g > 0.9 ? WHITE : g > 0.4 ? G[2] : g > 0.12 ? G[1] : C[4]) : e.c;
            if (uy >= zigAt(ux) - 1) (out.k = 0.25 * g), (out.l = G[1]);
            return;
          }
          if (cs !== undefined && cs < st) {
            // an open crack: deep orange light in the gap, flashing white the moment it opens
            const fresh = t - WOBBLES[cs][0] < 0.17;
            out.c = fresh ? WHITE : rand(ux, uy, (t * 20) | 0) < 0.25 + 0.1 * st ? G[1] : G[0];
            out.k = 0.14 + 0.06 * st;
            out.l = G[1];
            return;
          }
          // the lip of each crack falls into shadow below it, so the gap reads as a gap
          if (crack.get(`${ux},${uy + 1}`) < st || crack.get(`${ux + 1},${uy}`) < st) {
            out.c = e.lit > 0.3 ? C[2] : C[1];
            return;
          }
          // light shows through the shell in a halo round the cracks, and the whole egg warms a little
          const dn = st > 0 ? near[st - 1].get(`${ux},${uy}`) : 9, k = Math.min(1, g * 1.5);
          const base = st > 0 && e.c !== SPK ? mix(e.c, G[0], 0.05 * st * k) : e.c;
          out.c = dn < 1.6 ? mix(base, G[1], (st >= 2 ? 0.32 : 0.2) * k) : dn < 2.7 && st >= 2 ? mix(base, G[1], 0.14 * k) : base;
        });
      // the pop: the opening floods white, and light rays fan up out of it
      const q = t - POP;
      if (popped && q < 1.2 && !crumbled && g > 0.22) {
        const k = clamp(q / 1.2), oy = -ZY + 0.5, rx = 7;
        for (let y = -2; y <= 2; y++)
          for (let x = -rx; x <= rx; x++) {
            const d = Math.hypot((x + 0.5) / rx, (y + 0.5) / 2.2);
            if (d > 1) continue;
            if (g < 0.6 && d > 0.75) continue;
            p.px(x, oy + y, g > 1 ? (d < 0.7 ? WHITE : G[2]) : g > 0.6 ? (d < 0.5 ? G[2] : G[1]) : d < 0.45 ? G[1] : G[0]);
          }
        p.glow(0, oy, 16, G[1], 0.6 * g);
        if (q < 0.65) {
          const rk = q / 0.65, L = 36 * ease.outCubic(clamp(q / 0.1)) * (1 - rk * 0.6);
          for (let i = 0; i < 7; i++) {
            const an = -Math.PI / 2 + (i - 3) * 0.24 + 0.05 * Math.sin(t * 6 + i), len = L * (i % 2 ? 0.65 : 1), w = i % 2 ? 1 : 2;
            const x1 = Math.cos(an) * len, y1 = oy + Math.sin(an) * len;
            for (let j = 0; j < w; j++) p.line(j * 0.8 - 0.4, oy - 1, x1 + j * 0.8 - 0.4, y1, (u) => (u < 0.3 ? WHITE : u < 0.65 ? G[2] : G[1]), (u) => (1 - u * u) * (1.1 - rk));
            p.glowLine(0, oy, x1, y1, 5, G[1], 0.35 * (1 - rk));
          }
        }
        if (q < 0.1) p.glow(0, oy - 4, 30, WHITE, 0.6 * (1 - q / 0.1));
        // the light that lingers over the cup
        p.glowLine(0, oy, 0, oy - 26, 8, G[1], 0.25 * g);
      }
      // the inside glow through the shell before it pops
      if (!popped && g > 0) p.glow(0, -EH * 0.55, 7 + 2 * st, G[1], 0.05 * g);
      // pieces of shell: their lit outsides, their broken edges hot at first
      for (const s of pieces) {
        const c2 = Math.cos(s.a), s2 = Math.sin(s.a), f = Math.min(1, s.life / 0.4), r = Math.ceil(s.r), hot = t - s.born < 0.35;
        for (let py = -r; py <= r; py++)
          for (let px = -r; px <= r; px++) {
            const ux = Math.round(px * c2 + py * s2), uy = Math.round(-px * s2 + py * c2), m = s.map.get(`${ux},${uy}`);
            if (m && rand(ux, uy, s.id) < f) p.px(Math.floor(s.x) + px, Math.floor(s.y) + py, m[1] ? (hot ? G[2] : C[4]) : m[0]);
          }
        if (hot) p.glow(s.x, s.y, 6, G[1], 0.3);
      }
      bits.draw(p);
      if (popped && q < 0.9) sparkle(p, -3, -ZY - 6, Math.round(4 * (1 - q / 0.9)), WHITE, G[1], 0.4);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
