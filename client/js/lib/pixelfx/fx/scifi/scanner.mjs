import { P, fit, sparkle, clamp, smooth, lerp, ease, rand, TAU, WHITE } from "../../core/index.mjs";
import { Ghosts, since } from "./_lib.mjs";

export const meta = {
  name: "Scanner",
  desc: "Brackets snap onto the hero, a scan line sweeps head to toe leaving a cooling outline, and a readout counts up to OK before it all lets go.",
  tags: ["scifi", "scan", "target", "hud", "tech", "status", "ui", "loop"],
  size: [112, 78],
  origin: [42, 58],
  duration: 3.2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#03140a", "#06301a", "#0c5a2c", "#16893e", "#2cc256", "#7cf08c", "#d0ffd4", "#ffffff"], seed: 22 },
};

const STIFF = { turn: 0.9, crouch: -1, fx: -7, fy: -14, bx: 8, by: -14, ffx: -3, fbx: 4 };
const OK_ = { turn: 0.9, fx: -9, fy: -37, bx: 8, by: -15, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  poses: [
    [0, {}],
    [0.3, STIFF, "snap"],
    [1.75, STIFF],
    [1.85, OK_, "snap"],
    [2.5, OK_],
    [2.8, {}],
    [3.2, {}],
  ],
};

const D = meta.duration, LOCK = 0.3, SCAN0 = 0.42, SCAN1 = 1.6, DONE = 1.75, LET = 2.5;

// the body: its outline pixels by row, and each row's extent, worked out once per actor
const bodies = new WeakMap();
function body(A) {
  let b = bodies.get(A);
  if (b) return b;
  const m = A.mask, on = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.data[y * m.w + x];
  const edge = [], rows = new Map();
  for (let y = -1; y <= m.h; y++)
    for (let x = -1; x <= m.w; x++) {
      if (on(x, y)) {
        const r = rows.get(A.y + y) ?? [A.x + x, A.x + x];
        rows.set(A.y + y, [Math.min(r[0], A.x + x), Math.max(r[1], A.x + x)]);
      } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) edge.push([A.x + x, A.y + y]);
    }
  bodies.set(A, (b = { edge, rows }));
  return b;
}

const scanY = (t, A) => lerp(A.y - 3, 1, ease.inOutSine(clamp((t - SCAN0) / (SCAN1 - SCAN0))));
const scanT = (y, A) => SCAN0 + ((SCAN1 - SCAN0) * Math.acos(1 - 2 * clamp((y + 0.5 - (A.y - 3)) / (4 - A.y)))) / Math.PI;

// an L-shaped bracket: two arms from a corner, a hot pixel at the corner
function bracket(p, x, y, sx, sy, L, c, hot, a) {
  p.line(x, y, x + sx * L, y, c, a);
  p.line(x, y, x, y + sy * L, c, a);
  p.line(x + sx, y + sy, x + sx * 3, y + sy, c, a * 0.6);
  p.dot(x, y, hot, a);
}

const ghostCache = new WeakMap();
function ghosts(o, A, C) {
  const key = `${o.seed}:${o.palette.join()}`, byActor = ghostCache.get(A) ?? new Map();
  ghostCache.set(A, byActor);
  if (byActor.has(key)) return byActor.get(key);
  const { rows } = body(A), g = new Ghosts(D, { ground: () => 0, box: [-40, -58, 68, 9] });
  // data bits flicked off the body's edges as the line crosses them
  for (let y = A.y; y < 0; y += 3) {
    const r = rows.get(y);
    if (!r) continue;
    for (const [x, s] of [[r[0] - 1, -1], [r[1] + 1, 1]])
      if (rand(o.seed, y, s) < 0.6) g.add(scanT(y, A), P.MOTE, x, y, s * (30 + 50 * rand(y, s, 3)), -10 + 20 * rand(y, s, 4), 0.2 + 0.15 * rand(y, s, 5), rand(y, s, 6) < 0.4 ? WHITE : C[5], 0.6);
  }
  byActor.set(key, g);
  return g;
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), A = o.actor, { edge, rows } = body(A);
  // the box the brackets lock to, and how far out they are: closing in with a snap, letting go at the end
  const bx0 = A.x - 4, bx1 = A.x + A.w + 3, by0 = A.y - 4, by1 = 3;
  const lock = ease.outBack(clamp(t / LOCK), 2.2), out = ease.inCubic(clamp((t - LET) / 0.45)), spread = (1 - lock) * 14 + out * 12;
  const gone = t > LET + 0.45 || (t > LET + 0.25 && Math.floor((t - LET) * 20) % 2 === 1), vis = gone ? 0 : 1, flash = (t > LOCK && t < LOCK + 0.07) || (t > DONE && t < DONE + 0.05) || (t > DONE + 0.12 && t < DONE + 0.17);
  const bc = flash ? WHITE : C[5], L = 7;
  if (vis > 0)
    for (const [x, y, sx, sy] of [[bx0 - spread, by0 - spread, 1, 1], [bx1 + spread, by0 - spread, -1, 1], [bx0 - spread, by1 + spread, 1, -1], [bx1 + spread, by1 + spread, -1, -1]]) {
      bracket(p, x, y, sx, sy, L, bc, WHITE, vis);
      p.glow(x, y, 6, C[4], 0.35 * vis);
    }
  // on lock: a box flashes out from the brackets
  const lk = (t - LOCK) / 0.3;
  if (lk >= 0 && lk < 1) {
    const e = 3 + 10 * ease.outCubic(lk), c = lk < 0.25 ? WHITE : lk < 0.5 ? C[6] : lk < 0.75 ? C[5] : C[3];
    p.line(bx0 - e, by0 - e, bx1 + e, by0 - e, c);
    p.line(bx0 - e, by1 + e, bx1 + e, by1 + e, c);
    p.line(bx0 - e, by0 - e, bx0 - e, by1 + e, c);
    p.line(bx1 + e, by0 - e, bx1 + e, by1 + e, c);
  }
  // the outline, lit row by row as the line passes and cooling behind it
  const pulse = since(t, DONE, D) < 0.3 ? 1 - since(t, DONE, D) / 0.3 : 0, offY = lerp(A.y - 2, 2, clamp((t - LET) / 0.4));
  if (t > SCAN0)
    for (const [x, y] of edge) {
      const a = t - scanT(y, A);
      if (a < 0 || (t > LET && y < offY)) continue;
      const c = pulse > 0.4 ? WHITE : a < 0.07 ? WHITE : a < 0.25 ? C[6] : a < 0.6 ? C[5] : t > LET - 0.3 ? C[3] : C[4];
      p.px(x, y, c);
    }
  // the scan line and the slice of light just above it
  if (t > SCAN0 && t < SCAN1) {
    const y = Math.floor(scanY(t, A));
    for (let k = 1; k <= 5; k++) {
      const r = rows.get(y - k);
      if (r) for (let x = r[0]; x <= r[1]; x++) if (A.mask.data[(y - k - A.y) * A.w + x - A.x]) p.blend(x + 0.5, y - k + 0.5, k < 2 ? C[6] : C[5], 0.55 - k * 0.09);
    }
    for (let x = bx0 - 2; x <= bx1 + 2; x++) {
      const r = rows.get(y), inside = r && x >= r[0] && x <= r[1];
      p.px(x, y, inside ? WHITE : C[6]);
      p.blend(x + 0.5, y - 0.5, C[5], 0.35);
    }
    p.glowLine(bx0, y, bx1, y, 6, C[5], 0.45);
    const r = rows.get(y);
    if (r) for (const x of [r[0] - 0.5, r[1] + 1.5]) sparkle(p, x, y + 0.5, 2, C[6], C[5], 0.3);
  }
  // the readout: a leader from the top-right bracket to a panel, a count, a bar filling, then OK
  const lead = clamp((t - LOCK) / 0.1);
  if (vis > 0 && lead > 0) {
    const px = bx1 + spread + 6, py = by0 - spread + 2, k = clamp((t - SCAN0) / (SCAN1 - SCAN0)), ok = t > DONE;
    p.line(bx1 + spread, by0 - spread, lerp(bx1 + spread, px - 1, lead), lerp(by0 - spread, py + 4, lead), C[3]);
    if (lead < 1) return void ghosts(o, A, C).at(t).draw(p);
    p.line(px - 1, py + 4, px + 1, py + 4, C[3]);
    const del = clamp((t - LET) / 0.25), full = ok ? "OK" : `${Math.floor(k * 100)}%`, label = full.slice(0, Math.ceil(full.length * (1 - del)));
    const blinkOk = ok && Math.floor((t - DONE) * 8) % 2 === 0 && t < DONE + 0.5;
    if (label) p.text(label, px + 2, py, blinkOk ? WHITE : C[6], { font: "mini", scale: 2, shadow: C[1] });
    // the bar: ten cells filling as it goes, emptying from the right as it lets go
    for (let i = 0; i < 10; i++) {
      if (i >= 10 * (1 - del)) break;
      const on = (i + 1) / 10 <= k + 1e-6 || ok;
      p.rect(px + 2 + i * 3, py + 13, 2, 3, on ? (ok ? C[6] : C[5]) : C[2]);
    }
    p.glow(px + 16, py + 6, 18, C[4], 0.2 * vis);
  }
  ghosts(o, A, C).at(t).draw(p);
}
