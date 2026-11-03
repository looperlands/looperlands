import { cycle, fit, clamp, ease, TAU } from "../../core/index.mjs";
import { shape } from "./_lib.mjs";

export const meta = {
  name: "Slowed",
  desc: "Dragged through time: a glassy clock dial behind the head ticks round in heavy steps, flashing with each, while drops sink in slow motion and spread slow rings.",
  tags: ["status", "slow", "time", "clock", "debuff", "loop"],
  size: [64, 76],
  origin: [32, 68],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#081a24", "#0e3446", "#165a6e", "#2a8a9a", "#52bcc4", "#9ee6e0", "#e2fff8", "#ffffff"], seed: 7 },
};

const S1 = { turn: 0.3, lean: 3, crouch: 3, ffx: 11, ffy: -5, fbx: -9, fby: -5, toeB: true, fx: -5, fy: -19, bx: 11, by: -26 };
const S2 = { turn: 0.3, lean: 3, crouch: 3, ffx: -9, ffy: -5, toeF: true, fbx: 11, fby: -5, fx: 13, fy: -26, bx: -4, by: -19 };
export const act = {
  onBody: true,
  poses: [[0, S1], [1.2, S2], [2.4, S1]],
};

const D = meta.duration, TICKS = 4, STEP = D / TICKS, R = 18;

// the hand's angle: it waits, pulls back a little, snaps a quarter turn, overshoots and settles
function hand(t) {
  const k = Math.floor(t / STEP), ph = (t - k * STEP) / STEP, base = -Math.PI / 2 + (k * TAU) / TICKS, q = TAU / TICKS;
  if (ph < 0.62) return { ang: base, flash: 0, ph };
  if (ph < 0.72) return { ang: base - 0.1 * Math.sin(((ph - 0.62) / 0.1) * Math.PI * 0.5), flash: 0, ph };
  const s = (ph - 0.72) / 0.28, snap = ease.outBack(clamp(s / 0.35), 2.2), wob = Math.exp(-s * 6) * Math.sin(s * 22) * 0.05;
  return { ang: base - 0.1 * (1 - clamp(s / 0.2)) + q * snap + wob, flash: Math.exp(-s * 5), ph };
}
// the flash of the last tick, still fading after the hand has settled
const afterglow = (t) => {
  const s = (((t - STEP * 0.72) % STEP) + STEP) % STEP;
  return Math.exp(-s * 4);
};

function dial(p, C, cx, cy, t) {
  const h = hand(t), fl = Math.max(h.flash, afterglow(t));
  // a glassy face, lit from the top left
  p.disc(cx, cy, R - 1, C[2], 0.2);
  p.disc(cx - R * 0.25, cy - R * 0.3, R * 0.5, C[4], 0.08);
  // the rim: a dark edge, a bright band, a thin inner line
  p.ring(cx, cy, R + 1, 1, C[0]);
  p.ring(cx, cy, R, 2, (v, ang) => (Math.sin(ang + 0.8) < -0.3 ? (fl > 0.4 ? C[7] : C[6]) : v > 0.5 ? C[5] : C[4]));
  p.ring(cx, cy, R - 3.5, 1, C[3], 0.6);
  // the minute dots, then the hour marks, the quarters longer and brighter
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = (i / 60) * TAU;
    p.dot(cx + Math.cos(a) * (R - 2.6), cy + Math.sin(a) * (R - 2.6), C[4], 0.8);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, big = i % 3 === 0, r0 = R - 2.5, r1 = R - (big ? 6 : 4.5), c = Math.cos(a), s = Math.sin(a);
    p.line(cx + c * r0, cy + s * r0, cx + c * r1, cy + s * r1, big ? C[6] : C[5]);
  }
  // the hands: a short one that only shudders, a long heavy one that ticks
  const shud = h.flash * Math.sin(t * 60) * 0.06, ha = -Math.PI / 2 + 2.2 + shud;
  p.beam(cx, cy, cx + Math.cos(ha) * R * 0.5, cy + Math.sin(ha) * R * 0.5, 2.2, C[5]);
  const tx = cx + Math.cos(h.ang) * (R - 4), ty = cy + Math.sin(h.ang) * (R - 4);
  p.beam(cx, cy, tx, ty, 2.4, (u) => (u > 0.8 ? C[7] : C[6]));
  p.circle(cx, cy, 2, C[6]);
  p.px(cx, cy, C[1]);
  // light: the face glows, the rim flares as each tick lands, a ripple runs out from it
  p.glow(cx, cy, R + 8, C[4], 0.14 + 0.2 * fl);
  p.glowRing(cx, cy, R, 3, C[5], 0.12 + 0.35 * fl);
  p.glow(tx, ty, 5, C[6], 0.3 + 0.3 * h.flash);
  if (h.flash > 0.02) {
    const s = 1 - h.flash;
    p.ring(cx, cy, R + 2 + 10 * s, 1, C[5], h.flash);
    p.glowRing(cx, cy, R + 2 + 10 * s, 3, C[4], 0.3 * h.flash);
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor;
  dial(p, C, 0, a.y + 3, t);
  // the body lags behind itself: an after-image of its outline, dragged a step back after every tick
  const lag = afterglow(t);
  if (lag > 0.05) p.outline(a.mask, a.x - 1 - Math.round(2 * lag), a.y, C[5], 0.55 * lag);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a), fl = Math.max(hand(t).flash, afterglow(t));
  // a cold film of time over the body, thickening with each tick
  for (const [mx, my] of S.body) p.blend(a.x + mx, a.y + my, C[5], 0.08 + 0.12 * fl);
  // drops sinking in slow motion, ghosts trailing them, slow rings where they reach the floor
  cycle(t, D, 6, o.seed + 3, (r) => r.range(1.6, 2.2), (age, life, r) => {
    const side = r.next() < 0.5 ? -1 : 1, x = side * r.range(10, 17), y0 = a.y + r.range(6, 22), v0 = r.range(18, 30), k = 1.1;
    const yAt = (g) => y0 + (v0 * (1 - Math.exp(-k * g))) / k + 4 * g;
    const y = yAt(age), u = age / life;
    if (y < -1) {
      for (const [lag, al] of [[0.22, 0.35], [0.11, 0.6]]) if (age > lag) p.dot(x, yAt(age - lag), C[4], al);
      p.px(x, y - 1, C[5]);
      p.px(x, y, C[6]);
      p.px(x, y + 1, C[5]);
      p.px(x - 1, y + 1, C[4]);
      p.px(x - 1, y, C[7]);
      p.glow(x, y, 4, C[5], 0.3 * (1 - u));
    } else {
      // it reached the floor: a slow ring spreads and fades
      let g = age;
      while (g > 0 && yAt(g) >= -1) g -= 0.02;
      const s = clamp((age - g) / 0.9);
      if (s < 1) {
        // two crests running apart along the floor, a faint far edge behind them
        const rx = 1 + 7 * Math.sqrt(s), c = s < 0.3 ? C[6] : C[5];
        for (const sd of [-1, 1]) p.line(x + sd * rx, -0.5, x + sd * (rx - 1.5), -0.5, c, (1 - s) * 1.2);
        for (let dx = -rx + 2; dx <= rx - 2; dx += 1) p.dot(x + dx, -1.5, C[4], (1 - s) * 0.5 * (1 - Math.abs(dx) / rx));
        p.glow(x, -1, 4 + rx, C[4], 0.12 * (1 - s));
      }
    }
  });
}
