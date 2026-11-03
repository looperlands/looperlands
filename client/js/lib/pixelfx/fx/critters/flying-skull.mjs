// The fire (nested flame tongues with leaps and flicker, licks, flame puffs cooling to smoke, wandering embers,
// layered warm light) is adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, mix, clamp, wrap, lerp, rand, rng, cycle, fly, P, PF, TAU } from "../../core/index.mjs";
import { Grid, Swarm, shift, lnoise, tongue, firePuff, shadow, bounce } from "./_lib.mjs";

export const meta = {
  name: "Flying skull",
  desc: "A cracked bone skull bobs in the air, jaw chattering, eyes burning, a fire roaring off its crown that sheds flame puffs, embers and smoke and throws warm light.",
  tags: ["critter", "skull", "undead", "fire", "flying", "monster", "loop"],
  size: [96, 132],
  origin: [48, 120],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    bone: ["#1a1114", "#3e2b2a", "#6b5144", "#9e8467", "#cdb892", "#efe2bf", "#fffaea"],
    hover: 40,
    floor: true,
    seed: 1,
  },
};

const D = meta.duration, GRID = new Grid(-14, -20, 28, 40), SOCKET = hex("#120a0c");
const SWARM = new Swarm();

// where the skull is at loop time t: a slow figure-eight bob, and its velocity (for the flames to trail)
function at(t, hover) {
  const a = (t / D) * TAU;
  return {
    x: 3 * Math.sin(a),
    y: -hover + 3 * Math.sin(2 * a + 0.5),
    vx: (3 * TAU * Math.cos(a)) / D,
    vy: (6 * TAU * Math.cos(2 * a + 0.5)) / D,
  };
}
// the jaw: two bursts of chatter a loop, a wide gape at the end of the second
function jaw(t) {
  const ch = Math.max(0, Math.sin((t / D) * TAU * 22)), b1 = burst(t, 0.15, 0.75), b2 = burst(t, 1.3, 1.95);
  const gape = burst(t, 1.95, 2.3);
  return Math.round(Math.max(ch * 2.4 * Math.max(b1, b2), gape * 3.4));
}
const burst = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * ((t - a) / (b - a))) ** 0.5);
const flick = (t) => 0.74 + 0.16 * lnoise(t, D, 18, 0, 1) + 0.1 * lnoise(t, D, 46, 0, 2);

// the skull's shape, centered on (0, 0): a cranium, cheekbones narrowing to the upper jaw
const inCranium = (x, y) => (x / 11) ** 2 + ((y + 6) / 10.5) ** 2 <= 1;
const inFace = (x, y) => y >= -3 && y <= 6.5 && Math.abs(x) <= lerp(10.2, 7.2, (y + 3) / 9.5);
const inSkull = (x, y) => inCranium(x, y) || inFace(x, y);
const browY = (x) => -6.6 + (8.5 - Math.abs(x)) * 0.3;
const inSocket = (x, y) => ((Math.abs(x) - 5.1) / 3.3) ** 2 + ((y + 2.9) / 3.3) ** 2 <= 1 && y > browY(x);
const NOSE = [[-1, 1], [0, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [-2, 3], [1, 3]];
const CRACK = [[4, -16], [4, -15], [5, -14], [5, -13], [4, -12], [5, -11], [6, -10], [6, -9]];
const topY = (x) => -6 - 10.5 * Math.sqrt(Math.max(0, 1 - (x / 11) ** 2));

function skull(g, B, F, open, t) {
  const warm = mix(B[6], F[6], 0.45), rim = mix(B[5], F[5], 0.3);
  const lx = -4, ly = -15, lit = (x, y, k) => inSkull(lx + (x - lx) / k, ly + (y - ly) / k);
  g.clear();
  g.shade(-12, -17, 12, 8, (x, y, o) => {
    if (!inSkull(x, y)) return 0;
    let c = lit(x, y, 0.45) ? B[5] : lit(x, y, 0.74) ? B[4] : B[3];
    // temples pinch in behind the sockets
    if (Math.abs(x) > 8.2 && y > -7 && y < -1) c = x < 0 ? B[3] : B[2];
    if (!inSkull(x + 2, y + 2.2) || (x > 0 && !inSkull(x + 2.6, y))) c = B[2];
    if (!inSkull(x + 1, y + 1.2) && y > 2) c = B[1];
    // the crown catches the fire
    if (!inSkull(x, y - 1.5)) c = Math.abs(x) < 7 ? warm : rim;
    else if (!inSkull(x, y - 2.5) && Math.abs(x) < 6) c = rim;
    // under the brow, the bone drops into shadow
    if (y > browY(x) - 1.2 && y < browY(x) + 0.4 && Math.abs(x) > 1.6 && Math.abs(x) < 8.6) c = x < 0 ? B[4] : B[3];
    // cheekbones
    if (Math.abs(x) > 6.2 && Math.abs(x) < 9.2 && y > 0 && y < 2) c = x < 0 ? B[5] : B[3];
    // the upper teeth
    if (y > 6) {
      if (Math.abs(x) > 6.4) return 0;
      const cx = Math.floor(x), gap = cx === -6 || cx === -3 || cx === 2 || cx === 5;
      c = gap ? B[1] : y < 7 ? (x < 0 ? B[5] : B[4]) : cx === -1 || cx === 0 ? B[3] : B[4];
    }
    return c;
  });
  // sockets: dark hollows with an ember glow catching their lower rim
  g.shade(-9, -7, 9, 1, (x, y) => {
    if (!inSocket(x, y)) return 0;
    if (!inSocket(x, y + 1.3)) return mix(B[2], F[4], 0.55);
    return SOCKET;
  });
  for (const [x, y] of NOSE) g.set(x, y, y === 3 ? B[1] : SOCKET);
  g.set(-1, 3, B[2]); g.set(0, 3, B[2]);
  for (const [x, y] of CRACK) g.set(x, y, B[1]), g.set(x - 1, y, B[5]);
  g.set(7, -7, B[1]); g.set(8, -6, B[1]);
  // the jaw hangs below: rami up the sides, a row of teeth, the chin
  const jy = 8 + open;
  g.shade(-8, 4, 8, jy + 6, (x, y) => {
    const ax = Math.abs(x);
    if (ax > 6.6 && ax < 8.1 && y > 4 && y < jy + 2) return x < 0 ? B[3] : B[2];
    if (y < jy || y > jy + 5.5) return 0;
    const v = y - jy, hw = 7.4 - v * 0.45 - (v > 4 ? (v - 4) * 1.2 : 0);
    if (ax > hw) return 0;
    if (v < 1.5) {
      if (ax > 6) return x < 0 ? B[4] : B[3];
      const cx = Math.floor(x), gap = cx === -5 || cx === -2 || cx === 1 || cx === 4;
      return gap ? B[1] : v < 1 ? B[5] : B[4];
    }
    return !inJaw(x + 1.6, y + 1.6, jy) ? B[1] : v < 2.5 ? (x < 0 ? B[4] : B[3]) : B[3];
  });
  if (open > 0) for (let y = 8; y < jy; y++) for (let x = -6; x <= 5; x++) g.set(x, y, y === jy - 1 ? mix(SOCKET, F[3], 0.5) : SOCKET);
  g.outline((x, y, nx, ny) => (ny < 0 ? mix(B[0], F[1], 0.75) : B[0]));
}
function inJaw(x, y, jy) {
  const v = y - jy, hw = 7.4 - v * 0.45 - (v > 4 ? (v - 4) * 1.2 : 0);
  return v >= 0 && v <= 5.5 && Math.abs(x) <= hw;
}

// the tongues of fire on the crown: one every 2 px, tallest in the middle, leaping now and then
function crown(seed) {
  const out = [];
  for (let x = -10; x <= 10; x += 2) out.push({ x, h: 13 + 13 * (1 - (x / 11) ** 2), w: 2.3 + rand(x + 20, seed, 3) * 0.8, n: 37 + x * 3 + seed * 11, front: false });
  // and up the temples
  for (const s of [-1, 1]) out.push({ x: s * 11, y: -5, h: 10, w: 1.8, n: 61 + s * 13 + seed * 5, front: false });
  for (let x = -5; x <= 5; x += 2.5) out.push({ x, h: 5 + 3 * rand(x * 4 + 20, seed, 5), w: 1.6, n: 91 + x * 5 + seed * 7, front: true });
  return out;
}
function height(f, t, k) {
  const leap = Math.max(0, lnoise(t, D, 6, f.n * 3.1, 70) - 0.55) * 1.6;
  return (f.h + 0.25 * f.h * lnoise(t, D, 8, f.n * 1.7, 5) + f.h * leap) * (0.9 + 0.1 * k);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), F = fit(o.palette, 9), heat = [...F].reverse(), B = fit(o.bone, 7);
  const S = at(t, o.hover), k = flick(t), lean = clamp(-S.vx / 60, -0.8, 0.8), stretch = clamp(S.vy / 90, -0.3, 0.45);
  const tongues = crown(o.seed).sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
  const X = Math.round(S.x), Y = Math.round(S.y);
  const lick = (f) => lnoise(t, D, 5, f.n, 40) * 2 + lean * height(f, t, k) * 0.9 - clamp(f.x * 0.25, -2, 2);
  // the fire behind: tall tongues off the back of the crown
  for (let li = 0; li < 4; li++)
    for (const f of tongues) if (!f.front) tongue(p, X + f.x, Y + (f.y ?? topY(f.x) + 3), height(f, t, k) * (1 + stretch), f.w * (1 - 0.25 * Math.abs(lean)), lick(f), t, D, f.n, heat, li);
  // embers and flame puffs behind it
  particles(p, t, o, heat, F, true);
  const g = GRID;
  skull(g, B, F, jaw(t), t);
  g.draw(p, 1, X, Y);
  // the burning eyes
  for (const s of [-1, 1]) {
    const ex = X + s * 5.1 - 0.5, ey = Y - 2.4, fl = 0.75 + 0.25 * lnoise(t, D, 30, s * 9, 12);
    p.px(ex, ey, heat[0]); p.px(ex + 1, ey, heat[1]); p.px(ex, ey + 1, heat[2]); p.px(ex + 1, ey + 1, heat[3]);
    if (fl > 0.8) p.px(ex, ey - 1, heat[3]), p.px(ex + 1, ey - 1, heat[5]);
    p.glow(ex + 1, ey + 1, 6, F[5], 0.45 * fl);
    p.glow(ex + 1, ey + 0.5, 3, F[7], 0.5 * fl);
  }
  // fire in the mouth when it gapes, and a gout of flame breathed out
  const open = jaw(t);
  if (open > 0) p.glow(X, Y + 8 + open * 0.5, 4 + open * 2, F[5], 0.25 * open);
  for (let i = 0; i < 9; i++) {
    const r = rng(o.seed, i, 21), born = 1.98 + i * 0.03, age = wrap(t - born, D), L = r.range(0.25, 0.45);
    if (age >= L) continue;
    const S0 = at(born, o.hover), [x, y] = fly(S0.x + r.range(-3, 3), S0.y + 11, r.range(-22, 22), r.range(40, 75), age, -70, 3.5);
    firePuff(p, x, y, 1 - age / L, r.range(1.1, 2), r.next() * 100, heat);
  }
  // the front flames, over the crown
  for (let li = 0; li < 4; li++)
    for (const f of tongues) if (f.front) tongue(p, X + f.x, Y + topY(f.x) + 1.5, height(f, t, k) * (1 + stretch), f.w, lick(f) * 0.6, t, D, f.n, heat, li);
  particles(p, t, o, heat, F, false);
  // light: a big warm pool, a hot core over the crown, the eyes
  const br = 0.92 + 0.08 * Math.sin((t / D) * TAU * 2);
  p.glow(X + lean * 4, Y - 20, 74 * br * (0.9 + 0.1 * k), mix(F[4], F[5], 0.5), 0.48 * k);
  p.glow(X, Y - 21, 24, F[6], 0.3 * k);
  p.glow(X, Y - 15, 9, F[8], 0.16 * k);
}

// flame puffs off the tongue tips that cool into smoke, licks of flame breaking away, embers wandering up
function particles(p, t, o, heat, F, back) {
  const sw = SWARM.begin(t);
  sw.ps.sparks = [F[7], F[6], F[4], F[2]];
  if (back) {
    // smoke from the tips, born where the skull was
    cycle(t, D, 15, o.seed * 7 + 1, (r) => r.range(1.7, 2.5), (age, L, r) => {
      const S0 = at(wrap(t - age, D), o.hover), x0 = S0.x + r.range(-6, 6), y0 = S0.y - 22 - r.range(0, 8);
      const [x, y] = fly(x0, y0, r.range(-5, 5), -r.range(16, 26), age, -12, 1.2);
      sw.add(P.SMOKE, x + Math.sin(age * 1.3 + r.next() * 6) * 3 * age, y, 0, 0, age, L, mix(hex("#5b5566"), F[2], 0.3), r.range(2.8, 4.4), PF.BIG);
    });
    sw.draw(p);
    return;
  }
  // flame puffs: bright, fast, cooling down the ramp as they rise
  cycle(t, D, 40, o.seed * 7 + 2, (r) => r.range(0.18, 0.36), (age, L, r) => {
    const S0 = at(wrap(t - age, D), o.hover), side = r.chance(0.3), a = side ? r.sign() * r.range(0.9, 1.45) : r.range(-0.8, 0.8);
    const x0 = S0.x + Math.sin(a) * 10.5, y0 = S0.y - 6 - Math.cos(a) * 10 - (side ? 0 : r.range(2, 10));
    const [x, y] = fly(x0, y0, r.range(-6, 6) + Math.sin(a) * 6, -r.range(18, 34), age, -95, 3.2);
    firePuff(p, x + Math.sin(age * 17 + r.next() * 6) * 0.8, y, 1 - age / L, r.range(1, 2.2), r.next() * 100, heat);
  });
  // licks: little blobs of flame breaking off the tips
  cycle(t, D, 18, o.seed * 7 + 3, 0.26, (age, L, r) => {
    const S0 = at(wrap(t - age, D), o.hover), fx = r.range(-10, 10), x0 = S0.x + fx, y0 = S0.y + topY(fx) - r.range(4, 16) * (1 - Math.abs(fx) / 14);
    const kk = 1 - age / L, x = x0 + r.range(-3, 3) * age, y = y0 - r.range(12, 20) * age, rr = r.range(0.9, 1.7) * (0.4 + 0.6 * kk);
    p.circle(x, y, rr + 0.6, kk > 0.5 ? heat[5] : heat[6]);
    if (kk > 0.35) p.circle(x, y - 0.3, rr * 0.6, kk > 0.7 ? heat[2] : heat[4]);
  });
  // embers wander up and cool
  cycle(t, D, 24, o.seed * 7 + 4, (r) => r.range(1, 2.4), (age, L, r) => {
    const S0 = at(wrap(t - age, D), o.hover), x0 = S0.x + r.range(-11, 11), y0 = S0.y - r.range(6, 24), s = r.next() * 100;
    const [x, y] = fly(x0, y0, r.range(-22, 22), -r.range(25, 70), age, -20, 1.6);
    sw.add(P.EMBER, x + Math.sin(age * 2.3 + s) * 4 * Math.min(1, age), y, 0, 0, age, L, F[4], r.chance(0.3) ? 2 : 1, 0, s);
  });
  // sparks pop out of the fire now and then, fall, and skip along the floor
  if (o.floor)
    cycle(t, D, 5, o.seed * 7 + 5, (r) => r.range(0.9, 1.4), (age, L, r) => {
      const S0 = at(wrap(t - age, D), o.hover), b = bounce(S0.x + r.range(-6, 6), S0.y - r.range(10, 18), r.range(-28, 28), -r.range(50, 110), age, 430, -0.5, 0.42);
      sw.add(P.SPARK, b.x, b.y, b.rest ? 0.1 : b.vx, b.rest ? 0 : b.vy, age, L, 0, 1, 0, r.next() * 100);
    });
  sw.draw(p);
}

export function drawBack(p, time, o) {
  if (!o.floor) return;
  const t = shift(time, D, o.seed), F = fit(o.palette, 9), S = at(t, o.hover), k = flick(t);
  // its shadow on the floor, and the floor lit warm around it
  shadow(p, S.x, 0, 9, 1.6, hex("#0d0a12"), 0.6);
  for (let x = -30; x <= 30; x += 6) p.glow(S.x + x, -1, 20, mix(F[4], F[5], 0.5), 0.15 * k * (1 - Math.abs(x) / 40));
}
