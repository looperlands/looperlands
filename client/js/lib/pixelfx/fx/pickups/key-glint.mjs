// The hover, floor shadow and star glints follow Sprite Fusion's open-source pickup and sparkle
// (https://www.spritefusion.com/pixel-art-vfx/pickup), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, clamp, ease, rand, fly, flyV, TAU, WHITE } from "../../core/index.mjs";
import { Layer, glint, blobShadow } from "./_lib.mjs";

export const meta = {
  name: "Key glint",
  desc: "An ornate silver key hovering and rocking; a glint runs from its bow down the shaft to the teeth and bursts off the tip as falling sparks.",
  tags: ["pickup", "key", "unlock", "item", "loop"],
  size: [72, 60],
  origin: [36, 54],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#0e1018", "#222838", "#3c4660", "#5e6d8e", "#8c9cbc", "#bccae2", "#e6eeff", "#ffffff"], seed: 7 },
};

const L = new Layer(48, 40), HOVER = 19, MID = 8, TIP = 17.5;
const G0 = 0.18, G1 = 0.5; // the glint's run, as loop phase

// where the key hangs: bobbing and rocking, bow up to the left, teeth down to the right
const pose = (ph) => ({ y: -HOVER - 1.6 * Math.sin(ph * TAU), a: 0.42 + 0.11 * Math.sin(ph * TAU + 0.9) });
const toWorld = (u, v, cx, cy, a) => [cx + (u - MID) * Math.cos(a) - v * Math.sin(a), cy + (u - MID) * Math.sin(a) + v * Math.cos(a)];

// the key in its own frame: u along the shaft (bow at 0, tip at 17.5), v across it
function part(u, v) {
  const rb = Math.hypot(u, v);
  if (rb <= 4.6 && rb >= 2.1) return 1; // the bow's ring
  if (u >= 4.3 && u <= 6 && Math.abs(v) <= 1.9) return 2; // the collar
  if (u >= 6 && u <= TIP && Math.abs(v) <= 1) return 3; // the shaft
  if (u >= 12.6 && u <= TIP - 0.3 && v > 1 && v <= 4.6 && !(u > 14.3 && u < 15.4 && v > 2.7)) return 4; // the bit
  return 0;
}

function key(p, C, cx, cy, a, gu) {
  const ca = Math.cos(a), sa = Math.sin(a);
  L.begin(Math.floor(cx) - 24, Math.floor(cy) - 20);
  L.fill(Math.floor(cx) - 24, Math.floor(cy) - 20, Math.floor(cx) + 23, Math.floor(cy) + 19, (px, py) => {
    const dx = px - cx, dy = py - cy, u = dx * ca + dy * sa + MID, v = -dx * sa + dy * ca, k = part(u, v);
    if (!k) return 0;
    // light from the top left of the screen: work out which way this bit of metal faces
    let ny;
    if (k === 1) {
      const rb = Math.hypot(u, v), out = rb > 3.4 ? 1 : -1, wx = (u / rb) * out, wy = (v / rb) * out;
      ny = -(((wx * ca - wy * sa) * -0.6) + (wx * sa + wy * ca) * -0.8);
    } else ny = v < -0.35 ? 0.8 : v > 0.35 && k !== 4 ? -0.6 : k === 4 ? (v > 3.6 ? -0.5 : 0.1) : 0.2;
    let c = ny > 0.55 ? 6 : ny > 0.15 ? 4 : ny > -0.3 ? 3 : 2;
    if (k === 2) c = Math.min(7, c + 1);
    // the glint: a slanted band of white running down the key
    const g = Math.abs(u + v * 0.45 - gu);
    if (g < 0.8) return WHITE;
    if (g < 2) c = Math.min(7, c + 2);
    return C[c];
  });
  L.outline(C[0]).draw(p);
}

export function drawBack(p, t, o) {
  const { y } = pose(t / meta.duration);
  blobShadow(p, 0, 10, 0.8 - (-y - HOVER + 1.6) * 0.06);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T, { y, a } = pose(ph);
  const q = (ph - G0) / (G1 - G0), gu = q > 0 && q < 1 ? -5 + (TIP + 7) * ease.inOutSine(q) : -100;
  // cool light round it and all along it
  const [bx, by] = toWorld(0, 0, 0, y, a), [ex, ey] = toWorld(TIP, 0, 0, y, a);
  p.glow(0, y, 24, C[4], 0.3);
  p.glowLine(bx, by, ex, ey, 7, C[5], 0.16);
  key(p, C, 0, y, a, gu);
  // a few idle twinkles round it, one after another
  for (let i = 0; i < 4; i++) {
    const life = 0.4, age = (((t - ((i + 0.6) / 4) * T) % T) + T) % T;
    if (age > life) continue;
    const an = rand(i, o.seed, 8) * TAU, d = 9 + rand(i, o.seed, 9) * 6, k = Math.sin((age / life) * Math.PI);
    glint(p, Math.cos(an) * d, y + Math.sin(an) * d * 0.8 - age * 6, Math.round(1.8 * k), i % 2 ? C[6] : WHITE, 0.35 * k);
  }
  // light rides with the glint
  if (gu > -6) {
    const [gx, gy] = toWorld(clamp(gu, 0, TIP), 0, 0, y, a);
    p.glow(gx, gy, 10, C[6], 0.45 * Math.sin(q * Math.PI));
  }
  // as it leaves the tip: a star, and sparks that arc away and fall
  const [tx, ty] = toWorld(TIP, 0, 0, y, a), at = (ph - G1 + 0.02) * T;
  if (at > 0 && at < 0.3) glint(p, tx, ty, 4.5 * (1 - at / 0.3), C[6], 0.6 * (1 - at / 0.3));
  for (let i = 0; i < 9; i++) {
    const life = 0.32 + rand(i, o.seed, 4) * 0.3, age = at - rand(i, o.seed, 5) * 0.05;
    if (age < 0 || age > life) continue;
    const sp = 25 + rand(i, o.seed, 1) * 45, an = a + (rand(i, o.seed, 2) - 0.5) * 2.2;
    const [x, yy] = fly(tx, ty, Math.cos(an) * sp, Math.sin(an) * sp - 25, age, 380, 2.5), [vx, vy] = flyV(Math.cos(an) * sp, Math.sin(an) * sp - 25, age, 380, 2.5);
    if (yy > -0.5) continue; // it has reached the floor
    const s = Math.hypot(vx, vy) || 1, L2 = Math.min(4, 1 + s * 0.03), k = 1 - age / life;
    p.line(x - (vx / s) * L2, yy - (vy / s) * L2, x, yy, (u) => (u > 0.6 ? WHITE : C[5]), k * 1.6);
    p.glow(x, yy, 3, C[5], 0.4 * k);
  }
}
