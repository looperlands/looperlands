// The rising band and the column of light it rides in follow Sprite Fusion's open-source heal
// (https://www.spritefusion.com/pixel-art-vfx/heal), MIT License, Copyright (c) 2026 Hugo Duprez.
import { P, Rng, fit, band, sparkle, cycle, clamp, lerp, ease, rand, mix, TAU, WHITE } from "../../core/index.mjs";
import { Ghosts, since } from "./_lib.mjs";

export const meta = {
  name: "Teleporter pad",
  desc: "A steel pad glows on the floor, its rings rippling outward; a soft column of light rises off it and rings of light lift away, sparkles drifting up through them.",
  tags: ["scifi", "teleporter", "pad", "portal", "beam", "spawn", "ground", "loop"],
  size: [96, 104],
  origin: [48, 92],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#120a26", "#26145a", "#3c2296", "#5a3ad2", "#7f66f0", "#b4a2ff", "#e6deff", "#ffffff"],
    metal: ["#0e0d14", "#1e1c27", "#312e3e", "#4b4759", "#6f6a82", "#9d98b0"],
    seed: 26,
  },
};

const D = meta.duration, RX = 31, RY = 7, PY = -3, IN = 0.78, HIGH = -84;

const cache = new Map();
function ghosts(o, C) {
  const key = `${o.seed}:${o.palette.join()}`;
  if (cache.has(key)) return cache.get(key);
  const rn = new Rng(o.seed), g = new Ghosts(D, { box: [-46, -90, 46, 10] });
  // motes and sparkles drifting up through the column
  for (let i = 0; i < 40; i++) {
    const a = rn.range(0, TAU), r = Math.sqrt(rn.next()) * RX * IN * 0.9, star = i % 3 === 0;
    g.add(rn.range(0, D), star ? P.STAR : P.MOTE, Math.cos(a) * r, PY + Math.sin(a) * r * (RY / RX), rn.range(-4, 4), -rn.range(30, 75), rn.range(0.7, 1.3), rn.pick([WHITE, C[6], C[5]]), star ? rn.range(1.8, 3.4) : rn.range(0.6, 1.2));
  }
  cache.set(key, g);
  return g;
}

// the pad: a steel rim with a lit far edge, a recessed disc of light whose rings ripple outward, a hot middle
function pad(p, t, C, H) {
  const ph = t / D;
  p.shade(-RX - 1, PY - RY - 1, RX + 1, 2, (x, y, out) => {
    const u = x / RX, v = (y - PY) / RY, d = Math.sqrt(u * u + v * v);
    // the drum's side, below the top face
    if (d > 1) {
      if (Math.abs(x) <= RX && y > PY && y <= 1 && Math.sqrt(u * u + ((y - 3 - PY) / RY) ** 2) <= 1) out.c = y === 1 || Math.abs(x) > RX - 1 ? H[0] : x < -RX * 0.4 ? H[3] : x > RX * 0.4 ? H[1] : H[2];
      return;
    }
    if (d > 0.97) return (out.c = H[0]);
    if (d > IN) {
      // the rim: lit along its far edge, shadowed on the near one, a seam round it
      out.c = Math.abs(d - (IN + 0.1)) < 0.03 ? H[1] : d < IN + 0.03 ? C[3] : v < -0.3 ? H[5] : v < 0.2 ? H[4] : H[3];
      return;
    }
    // the light well: rings rolling outward, brighter toward the middle
    const r = d / IN, ring = ((((r * 3 - ph * 3) % 1) + 1) % 1) < 0.16, heat = (1 - r) ** 1.5;
    out.c = r > 0.94 ? C[3] : ring ? (heat > 0.3 ? WHITE : C[6]) : heat > 0.55 ? C[6] : heat > 0.25 ? C[5] : r > 0.8 ? C[3] : C[4];
  });
  // emitters round the rim, chasing
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.15, x = Math.cos(a) * RX * 0.885, y = PY + Math.sin(a) * RY * 0.885, k = 0.5 + 0.5 * Math.cos(TAU * (2 * ph - i / 10));
    p.px(x, y, k > 0.7 ? WHITE : k > 0.4 ? C[5] : C[2]);
    if (k > 0.5) p.glow(x, y, 4, C[4], 0.35 * k);
  }
}

// a ring of light lifting off the pad: crisp lines stepping down the ramp as it climbs, a glint running round it;
// its far half or its near half
function lift(p, t, C, near) {
  for (let i = 0; i < 4; i++) {
    const k = since(t, (i / 4) * D, D) / 1.25;
    if (k >= 1) continue;
    const y = lerp(PY, HIGH + 12, Math.pow(k, 0.85)), rx = RX * IN * (1 + 0.08 * k), ry = rx * (RY / RX), c = k < 0.12 ? WHITE : k < 0.4 ? C[6] : k < 0.65 ? C[5] : k < 0.85 ? C[4] : C[3];
    const glint = ((i * 0.37 + k * 1.5) % 1) * TAU;
    for (let j = 0, n = Math.ceil(rx * 7); j < n; j++) {
      const g = (j / n) * TAU, sg = Math.sin(g);
      if (sg >= 0 !== near) continue;
      const x = Math.cos(g) * rx, yy = y + sg * ry, hot = Math.abs(((g - glint + Math.PI * 3) % TAU) - Math.PI) < 0.25;
      if (k > 0.85 && (j & 1)) continue;
      p.px(x, yy, hot && k < 0.8 ? WHITE : near ? c : k < 0.4 ? C[5] : C[3]);
      if (k < 0.3) p.px(x, yy + 1, near ? C[5] : C[3]);
    }
    if (near) p.glow(0, y + ry * 0.5, rx + 8, C[4], 0.22 * (1 - k));
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), H = fit(o.metal, 6), ph = t / D;
  pad(p, t, C, H);
  // the column: a soft tube of light standing on the well, fading as it rises, light drawn up it
  const W = RX * IN;
  for (let y = HIGH; y < PY; y++) {
    const v = (y - PY) / (HIGH - PY), fade = (1 - v) ** 1.6;
    for (let x = Math.floor(-W); x <= Math.ceil(W); x++) {
      const q = Math.abs(x + 0.5) / W;
      if (q > 1) continue;
      p.blend(x + 0.5, y + 0.5, q > 0.9 ? C[6] : C[5], fade * (0.07 + 0.26 * q ** 4 + 0.12 * (1 - v) ** 4));
    }
  }
  cycle(t, D, 30, o.seed + 3, (r) => r.range(0.6, 1.1), (age, life, r) => {
    const k = age / life, x = r.range(-0.9, 0.9) * W, y = lerp(PY - 2, HIGH + 10, k), L = 3 + 7 * k;
    p.line(x, y, x, y + L, (u) => (u < 0.3 ? C[6] : C[4]), (1 - k) * 1.2);
  });
  lift(p, t, C, false);
  for (let y = PY - 6; y > HIGH + 20; y -= 12) p.glow(0, y, W + 8, C[4], 0.16 * (1 - (y - PY) / (HIGH - PY)));
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D;
  lift(p, t, C, true);
  ghosts(o, C).at(t).draw(p);
  // the light: a pool on the floor, a hot heart to the well, pulsing
  const k = 0.85 + 0.15 * Math.sin(TAU * 2 * ph);
  for (const x of [-RX * 0.6, 0, RX * 0.6]) p.glow(x, PY, 20, C[4], 0.25 * k);
  p.glow(0, PY, 10, WHITE, 0.3 * k);
}
