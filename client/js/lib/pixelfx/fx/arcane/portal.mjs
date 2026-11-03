// The dithered light ramp and the streaked, knotted disc texture are adapted from Sprite Fusion's open-source
// black hole (https://www.spritefusion.com/pixel-art-vfx/black-hole), MIT License, Copyright (c) 2026 Hugo Duprez.
import { PAL, fit, cycle, tileNoise, smooth, ease, TAU, WHITE } from "../../core/index.mjs";
import { tone, mote, streak } from "./_lib.mjs";

const D = 2.4;

export const meta = {
  name: "Portal",
  desc: "An upright rift: fibrous spiral arms wind down into the dark, a lit rim wobbles, motes and streaks are pulled in, the floor glows.",
  tags: ["arcane", "portal", "rift", "teleport", "magic", "ground", "loop"],
  size: [152, 116],
  origin: [76, 106],
  duration: D,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: PAL.arcane, width: 17, height: 29, seed: 4 },
};

const wrapPi = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);

function setup(t, o) {
  const C = fit(o.palette, 8), rx = o.width, ry = o.height, ph = t / D, S = o.seed;
  const CY = -(ry + 5);
  // the rim's radius (1 = the oval) at angle th: slow noise rolling round it, plus a three-lobed breath
  const rim = (th) => 1 + 0.05 * tileNoise((th / TAU) * 10 + ph * 10, ph * 4, 10, 4, S) + 0.018 * Math.sin(th * 3 - ph * TAU * 2);
  // where a point at angle th and radius rho (1 = the rim) sits; outside, the field widens so motes come from round about
  const at = (th, rho) => {
    const out = Math.max(0, rho - 1), k = Math.min(1, rho);
    return [Math.cos(th) * (k * rx + out * 21), Math.min(-1, CY + Math.sin(th) * (k * ry + out * 16))];
  };
  // two hot spots chase round the rim with the spin, and a key light sits at the top left
  const spots = [ph * TAU * 2 - 0.6, ph * TAU * 2 + Math.PI - 0.6];
  const hot = (th) => Math.max(Math.exp(-(wrapPi(th - spots[0]) ** 2) / 0.12), 0.85 * Math.exp(-(wrapPi(th - spots[1]) ** 2) / 0.08)) + 0.35 * Math.max(0, Math.cos(th + 2.3));
  return { C, rx, ry, ph, S, CY, rim, at, hot, spots };
}

// the rift itself: the dark well, the fibrous arms winding down into it, the lit rim
function rift(p, s) {
  const { C, rx, ry, ph, CY, rim, hot } = s;
  p.shade(-rx - 4, CY - ry - 4, rx + 4, CY + ry + 4, (x, y, out) => {
    const u = x / rx, v = (y - CY) / ry, r = Math.hypot(u, v) || 1e-6, th = Math.atan2(v, u), R0 = rim(th);
    const g = Math.hypot(u / rx, v / ry) / r, e = (r - R0) / g, h = hot(th);
    if (e > 2.5) return;
    // outside the rim: a coloured line where it's lit, a dark one elsewhere, a faint halo past it
    if (e > 1.5) {
      if (h > 0.6) (out.c = C[3]), (out.a = 0.5);
      return;
    }
    if (e > 0.5) {
      out.c = h > 0.5 ? C[4] : C[2];
      return;
    }
    if (e > -0.5) {
      out.c = h > 0.42 ? WHITE : C[6];
      out.k = 0.25 + 0.4 * h;
      return;
    }
    // inside, in ramp steps: clean depth bands falling away to a dark well; three thin bright arms and three
    // faint ones on a log spiral, flowing inward a turn a loop, with knots of light running down them; the light
    // that spills in round the rim
    const d = r / R0, z = -Math.log(Math.max(0.02, d)), phi = 3 * th + 6.5 * z - TAU * 3 * ph;
    const c1 = 0.5 + 0.5 * Math.cos(phi), c2 = 0.5 + 0.5 * Math.cos(phi + Math.PI + 0.6 * z), lit = Math.pow(d, 1.5), sink = smooth(0.2, 0.62, d);
    const knot = Math.pow(Math.max(0, Math.cos(4 * z - phi / 3 + TAU * 5 * ph)), 6);
    let st = smooth(0.4, 0.7, d) + 0.6 * smooth(0.8, 0.95, d);
    const crest = Math.pow(c1, 16) * (0.6 + 5.6 * lit) * (1 + 0.5 * knot) * sink;
    st += crest + Math.pow(c1, 5) * 1.1 * lit;
    st += Math.pow(c2, 18) * (0.3 + 1.8 * lit) * sink;
    // rings of the tunnel shrinking away down the well, two a loop
    st += Math.pow(0.5 + 0.5 * Math.cos(TAU * (z * 1.5 - ph * 2)), 20) * 1.3 * sink * (1 - 0.5 * c1);
    // fine strands between the arms, a step brighter than the dark they run through
    st += Math.pow(0.5 + 0.5 * Math.cos(3 * phi + 2 * z + 1.3), 10) * 1.1 * lit * sink;
    st += 2.2 * Math.pow(smooth(0.8, 1, d), 2) * (0.75 + 0.45 * h);
    out.c = tone(C, st / 7, x, y, 0, 0.65);
    if (crest > 2.2) out.k = 0.12 + 0.05 * crest;
  });
}

// specks of light deep in the well, swept round with the arms and sinking towards the far end
function well(p, s) {
  const { C, rx, ry, ph, S, CY, rim } = s, t = ph * D;
  cycle(t, D, 18, S * 7 + 5, (g) => g.range(1.1, 1.8), (age, life, r) => {
    const q = age / life, th = r.range(0, TAU) + q * 2.6, rho = 0.92 * (1 - ease.inQuad(q) * 0.9), R0 = rim(th);
    const x = Math.cos(th) * rho * R0 * rx, y = CY + Math.sin(th) * rho * R0 * ry, tw = Math.sin(ph * TAU * r.int(14, 22) + r.range(0, TAU));
    const a = Math.min(1, q * 6) * (rho > 0.25 ? 1 : rho / 0.25);
    if (tw > -0.3) p.dot(x, y, rho > 0.6 && tw > 0.6 ? WHITE : rho > 0.45 ? C[6] : C[5], a);
  });
}

// motes riding round just outside the rim, sinking in as they go
function orbit(p, s) {
  const { C, rx, ry, ph, S, CY } = s;
  for (let i = 0; i < 7; i++) {
    const k = (ph * 2 + i / 7) % 1, th = ((i * 2.39 + S) % TAU) + ph * TAU * 2 + k * 2.5, rho = 1.2 + 0.35 * ((i * 0.618) % 1) - 0.3 * ease.inQuad(k);
    const x = Math.cos(th) * rho * rx, y = CY + Math.sin(th) * rho * ry, a = Math.min(1, Math.sin(k * Math.PI) * 2.2);
    mote(p, x, y, -Math.sin(th) * rx * 10, Math.cos(th) * ry * 10, i % 3 ? C[6] : WHITE, 0.6, a, 0.3);
  }
}

// motes and streaks pulled in from round about, spinning faster as they fall; inside they sink into the dark
function infall(p, s) {
  const { C, ph, S, rim, at } = s, t = ph * D;
  cycle(t, D, 60, S * 7 + 1, (g) => g.range(0.3, 0.5), (age, life, r) => {
    const a0 = r.range(0, TAU), d0 = r.range(1.8, 3), spin = r.range(0.8, 1.8) * (r.chance(0.8) ? 1 : 0.35), size = r.range(0.8, 1.5), hue = r.next();
    const pos = (q) => at(a0 + spin * q * q, d0 * (1 - Math.pow(q, 1.4)));
    const q = age / life, [x, y] = pos(q), [x2, y2] = pos(Math.min(1, q + 0.015)), vx = (x2 - x) / (0.015 * life), vy = (y2 - y) / (0.015 * life);
    const rho = d0 * (1 - Math.pow(q, 1.4)), R0 = rim(a0 + spin * q * q), fade = Math.min(1, q * 5);
    if (rho > R0 + 0.06) mote(p, x, y, vx, vy, hue < 0.25 ? WHITE : hue < 0.55 ? C[6] : hue < 0.8 ? C[5] : C[4], hue < 0.8 ? size : size * 1.4, fade, hue < 0.8 ? 0.4 : 0.15);
    else if (rho > 0.3) p.dot(x, y, rho > 0.65 ? C[6] : C[5], rho);
  });
  cycle(t, D, 12, S * 7 + 2, (g) => g.range(0.36, 0.5), (age, life, r) => {
    const a0 = r.range(0, TAU), d0 = r.range(2.3, 3), spin = r.range(0.2, 0.5);
    const qc = Math.sqrt(1 - 1.05 / d0), q = age / life;
    const pos = (q) => at(a0 + spin * q * q, d0 * (1 - q * q));
    if (q < qc) {
      const [x, y] = pos(q), [x2, y2] = pos(q + 0.015);
      streak(p, x, y, (x2 - x) / (0.015 * life), (y2 - y) / (0.015 * life), C[6], Math.min(1, q * 5));
    } else {
      // it hits the rim: a pinprick of white
      const k = 1 - (q - qc) / (1 - qc), [x, y] = pos(qc);
      if (k > 0.55) p.px(x, y, WHITE);
      p.glow(x, y, 7, C[6], 0.6 * k * k);
    }
  });
}

// grit and sparks skating in along the floor, lifting into the foot of the rift
function skaters(p, s) {
  const { C, ph, S, CY, ry } = s, t = ph * D, foot = CY + ry;
  cycle(t, D, 14, S * 7 + 3, (g) => g.range(0.7, 1.1), (age, life, r) => {
    const side = r.sign(), x0 = side * r.range(22, 50), y0 = -1 - r.range(0, 1.5), q = age / life, e = ease.inCubic(q);
    const x = x0 * (1 - e), y = y0 + (foot + 2) * smooth(0.55, 1, q);
    const [xb, yb] = [x0 * (1 - ease.inCubic(Math.max(0, q - 0.04))), y0 + (foot + 2) * smooth(0.55, 1, q - 0.04)];
    const big = r.chance(0.3);
    mote(p, x, y, (x - xb) * 25, (y - yb) * 25, big ? C[6] : C[5], big ? 0.9 : 0.6, Math.min(1, q * 4) * (1 - smooth(0.85, 1, q)), 0.3);
  });
}

function floor(p, s) {
  const { C, ph } = s, pulse = 0.85 + 0.15 * Math.sin(ph * TAU * 2);
  for (let x = -36; x <= 36; x++) {
    const u = Math.abs(x + 0.5) / 36, a = (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45) * (0.8 + 0.2 * pulse);
    p.dot(x, 0, u < 0.2 ? WHITE : u < 0.5 ? C[6] : C[5], a);
    if (u < 0.3) p.dot(x, 1, u < 0.15 ? C[5] : C[4], u < 0.15 ? 1 : 0.5);
  }
}

export function drawBack(p, t, o) {
  floor(p, setup(t, o));
}

export function draw(p, t, o) {
  const s = setup(t, o), { C, CY, rx, ry, ph, rim, spots } = s, pulse = 0.85 + 0.15 * Math.sin(ph * TAU * 2);
  rift(p, s);
  well(p, s);
  orbit(p, s);
  infall(p, s);
  skaters(p, s);
  // light comes off the rim, not the void: a big soft pool, a halo hugging the rim, hot spots that shine, the floor lit
  p.glow(0, CY, ry * 5, C[4], 0.17 * pulse);
  p.glow(0, CY, ry * 2.6, C[4], 0.1 * pulse);
  for (let i = 0; i < 16; i++) {
    const th = (i / 16) * TAU, R0 = rim(th) * 1.08;
    p.glow(Math.cos(th) * R0 * rx, CY + Math.sin(th) * R0 * ry, 15, C[4], 0.15 * pulse);
  }
  for (const th of spots) p.glow(Math.cos(th) * rim(th) * rx, CY + Math.sin(th) * rim(th) * ry, 16, C[6], 0.42);
  for (let i = -3; i <= 3; i++) p.glow(i * 7, -1, 16, C[5], 0.12 * pulse);
}
