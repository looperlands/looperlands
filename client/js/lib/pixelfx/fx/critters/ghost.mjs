import { fit, clamp, wrap, lerp, rng, cycle, TAU } from "../../core/index.mjs";
import { Grid, shift, shadow } from "./_lib.mjs";

export const meta = {
  name: "Ghost",
  desc: "A sheet ghost bobs over the floor: its scalloped hem ripples and trails its drift, little arms flutter, it glances about and blinks, motes trickle off its hem.",
  tags: ["critter", "ghost", "spirit", "undead", "spooky", "float", "loop"],
  size: [96, 100],
  origin: [48, 90],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#10142a", "#232c52", "#3e4f86", "#6b84bb", "#a3b8e2", "#d8e4ff", "#ffffff"], hover: 14, seed: 1 },
};

const D = meta.duration, GRID = new Grid(-20, -40, 40, 46), R = 10.5;

// where the ghost is: a lazy drift side to side and a bob, both looping
function at(t, hover) {
  const a = (t / D) * TAU;
  return { x: 4 * Math.sin(a), y: -hover - 3 * Math.sin(2 * a + 0.8) };
}

// the sheet's half-width v px above the hem (0 hem .. 1 crown): a dome over a body that flares toward the hem
function halfW(h) {
  const top = 2 * R + 9;
  if (h > top || h < -1) return -1;
  if (h > top - R) return Math.sqrt(Math.max(0, R * R - (h - (top - R)) ** 2));
  return lerp(R + 2.2, R, (h / (top - R)) ** 0.7);
}

function sheet(g, C, t, o, lagX) {
  g.clear();
  const top = 2 * R + 9, ph = (t / D) * TAU * 2, NL = 4, HW = R + 2.2, LW = (2 * HW) / NL;
  // the lower sheet trails behind the head as it drifts
  const off = (h) => lagX * (1 - clamp(h / top)) ** 1.4;
  // four rounded lobes along the hem, lifting one after another in a ripple
  const lobe = (X) => {
    const j = clamp(Math.floor((X + HW) / LW), 0, NL - 1), c = -HW + (j + 0.5) * LW, u = (X - c) / (LW / 2);
    return { j, u, d: (2.2 + 1.1 * Math.sin(ph - j * 1.5)) * Math.sqrt(Math.max(0, 1 - u * u)) };
  };
  const inside = (x, y) => {
    const h = -y, X = x - off(h);
    if (h < 0 && -h > lobe(X).d) return false;
    const hw = halfW(Math.max(0, h));
    return hw >= 0 && Math.abs(X) <= hw;
  };
  // little arms: rounded nubs that flutter
  const arm = (x, y) => {
    for (const s of [-1, 1]) {
      const ax = s * (R + 1.2) + off(13), ay = -13 + 1.6 * Math.sin(ph + s * 1.3);
      if (((x - ax) / 3) ** 2 + ((y - ay) / 2.2) ** 2 <= 1) return true;
    }
    return false;
  };
  const any = (x, y) => inside(x, y) || arm(x, y);
  const lx = -9, ly = -top - 1;
  const lit = (x, y, k) => any(lx + (x - lx) / k, ly + (y - ly) / k);
  g.shade(-19, -top - 2, 19, 5, (x, y, o2) => {
    if (!any(x, y)) return 0;
    const h = -y, X = x - off(h);
    let i = lit(x, y, 0.62) ? 5 : 4;
    if (!any(x + 2.4, y + 1.8)) i = 3;
    if (!any(x + 1.2, y + 1) && X > 2) i = 2;
    // the gloss: a thin bright arc just inside the top-left of the dome
    if (h > top - R - 2 && X < 1 && !any(x - 1.5, y - 1.5) && any(x - 0.6, y - 0.6)) i = 6;
    // the hem: each lobe darker underneath and to its right, a crease where two lobes meet
    if (h < 1) {
      const L = lobe(X);
      if (L.u > 0.1 || -h > L.d - 1.2) i = Math.min(i, 3);
    }
    // folds: short creases running down into the notches between the lobes, lit on their left
    if (h < 7 && h >= -0.5) {
      for (let j = 1; j < NL; j++) {
        const cx = -HW + j * LW + 0.6 * Math.sin(ph - j), w = (7 - h) * 0.09;
        if (Math.abs(X - cx) <= w + 0.3) i = Math.min(i, 3);
        else if (cx - X > w + 0.3 && cx - X < w + 1.3 && i === 4) i = 5;
      }
    }
    o2.a = h < 2 ? 0.86 : 0.95;
    return C[i];
  });
  return { inside, off, top };
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), S = at(t, o.hover), lagX = at(t - 0.3, o.hover).x - S.x;
  const g = GRID;
  const sh = sheet(g, C, t, o, lagX), top = sh.top;
  // the face: two eyes that glance about and blink, a little mouth that oohs
  const look = wrap(t, D) < 0.7 ? 0 : wrap(t, D) < 1.3 ? 1 : wrap(t, D) < 1.9 ? -1 : 0, blink = wrap(t, D) > 1.95 && wrap(t, D) < 2.03;
  const ey = -top + R - 1, mo = 0.5 + 0.5 * Math.sin((t / D) * TAU * 2);
  for (const s of [-1, 1]) {
    const ex = s * 4 - (s > 0 ? 1 : 0) + look;
    if (blink) g.set(ex, ey + 2, C[1]), g.set(ex + 1, ey + 2, C[1]);
    else {
      for (let k = 0; k < 4; k++) g.set(ex, ey + k, C[0]), g.set(ex + 1, ey + k, C[0]);
      g.set(ex + (look < 0 ? 0 : 1), ey, C[2]);
    }
  }
  const my = ey + 6;
  g.set(look - 1, my, C[1]); g.set(look, my, C[1]);
  if (mo > 0.4) g.set(look - 1, my + 1, C[0]), g.set(look, my + 1, C[0]);
  g.outline((x, y, nx, ny) => (ny > 0 ? C[2] : C[1]), 0.95);
  g.draw(p, 1, S.x, S.y);
  // motes trickle off the hem and fade as they sink and drift
  cycle(t, D, 12, o.seed * 3 + 1, (r) => r.range(1, 1.7), (age, L, r, i) => {
    const S0 = at(wrap(t - age, D), o.hover), k = age / L, x0 = S0.x + r.range(-10, 10), y0 = S0.y + 1.5;
    const x = x0 + Math.sin(age * 2.2 + i) * 2.4, y = y0 + r.range(5, 11) * age - 3 * age * age;
    const a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 2.2), tw = 0.6 + 0.4 * Math.sin(age * 8 + i * 1.7);
    p.dot(x, y, tw > 0.8 ? C[6] : C[5], a);
    if (r.chance(0.3)) p.dot(x, y - 1, C[4], a * 0.7);
    p.glow(x, y, 7, C[4], 0.42 * a * tw);
  });
  // a cold glow round it
  p.glow(S.x, S.y - top * 0.55, 54, C[3], 0.3);
  p.glow(S.x - 3, S.y - top * 0.72, 14, C[5], 0.12);
}

export function drawBack(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), S = at(t, o.hover), hgt = clamp((-S.y - 8) / 16);
  // its shadow on the floor, and the floor lit cold under it
  shadow(p, S.x, 0, 11 - 3 * hgt, 1.6, C[0], 0.55 - 0.2 * hgt);
  for (let x = -24; x <= 24; x += 6) p.glow(S.x + x, -1, 16, C[4], 0.14 * (1 - Math.abs(x) / 34) * (1 - 0.4 * hgt));
}
