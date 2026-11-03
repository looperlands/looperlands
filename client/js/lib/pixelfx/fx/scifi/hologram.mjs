import { fit, cycle, clamp, smooth, lerp, rand, hex, TAU, WHITE } from "../../core/index.mjs";
import { since } from "./_lib.mjs";

export const meta = {
  name: "Hologram",
  desc: "A floor projector throws a cone of light holding a turning wireframe model: scanlines roll through it, a data ring circles it, and it flickers, tears and jitters.",
  tags: ["scifi", "hologram", "projector", "wireframe", "display", "glitch", "ground", "loop"],
  size: [112, 104],
  origin: [56, 92],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#050c1e", "#0a1f48", "#123b80", "#1d64b8", "#2e98e8", "#6cd0ff", "#c8f0ff", "#ffffff"],
    metal: ["#0e0d14", "#1e1c27", "#312e3e", "#4b4759", "#6f6a82", "#9d98b0"],
    split: "#ff4fd8",
    seed: 21,
  },
};

const D = meta.duration, OY = -50, RAD = 16, LENS = -6;
// the model: a tall six-sided crystal, a point at each end and a ring of six round its waist
const VERTS = [[0, 1.45, 0], [0, -1.45, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * TAU) * 0.9, 0.12, Math.sin((i / 6) * TAU) * 0.9])];
const FACES = [];
for (let i = 0; i < 6; i++) FACES.push([0, 2 + i, 2 + ((i + 1) % 6)], [1, 2 + ((i + 1) % 6), 2 + i]);
const EDGES = [];
for (let i = 0; i < 6; i++) EDGES.push([0, 2 + i], [1, 2 + i], [2 + i, 2 + ((i + 1) % 6)]);
// when it glitches: [start, length, how hard]
const GLITCHES = [[0.92, 0.12, 1], [2.55, 0.2, 1.4], [3.42, 0.06, 0.7]];

export function draw(p, t, o) {
  const C = fit(o.palette, 8), H = fit(o.metal, 6), SPLIT = hex(o.split), S = o.seed, ph = t / D, frame = Math.floor(t * 30);
  const gl = GLITCHES.reduce((m, [g0, len, k]) => (t >= g0 && t < g0 + len ? Math.max(m, k) : m), 0);
  const flick = gl > 0 && rand(S, frame) < 0.5 ? 1 : 0;
  // where it sits: a slow bob, a jolt when it glitches
  const cx = gl ? (rand(S, frame, 2) < 0.5 ? -2 : 2) * gl : 0, cy = OY + 1.5 * Math.sin(TAU * ph * 2);
  // the tears this frame: bands of rows knocked sideways
  const tears = [];
  if (gl) for (let i = 0; i < 2; i++) tears.push([Math.floor(cy - RAD + rand(S, frame, i) * RAD * 2), 2 + Math.floor(rand(S, frame, i, 1) * 4), Math.round((rand(S, frame, i, 2) - 0.5) * 10 * gl)]);
  const tearAt = (y) => {
    for (const [y0, h, dx] of tears) if (y >= y0 && y < y0 + h) return dx;
    return 0;
  };
  // every pixel of the hologram goes through here: interlaced, torn, split
  const put = (x, y, c, a = 1) => {
    const yy = Math.floor(y);
    if (flick && (yy & 1)) return;
    const dx = tearAt(yy);
    if (dx) {
      p.dot(x + dx, y, SPLIT, a * 0.8);
      p.dot(x + dx + Math.sign(dx), y, c, a);
      return;
    }
    p.dot(x, y, c, a);
  };

  // the projector: a steel drum on the floor with a lens on top and lights round it
  p.shade(-16, -8, 16, 2, (x, y, out) => {
    const top = (x / 15) ** 2 + ((y + 5) / 3) ** 2 <= 1, side = Math.abs(x) <= 15 && y > -5 && y <= 0;
    if (!top && !side) return;
    if (top) out.c = (x / 15) ** 2 + ((y + 5) / 3) ** 2 > 0.8 ? H[0] : y < -6 ? H[5] : H[3];
    else out.c = Math.abs(x) > 14 || y === 0 ? H[0] : y === -4 ? H[4] : x < -6 ? H[3] : x > 6 ? H[1] : H[2];
  });
  p.ellipse(0, LENS + 0.5, 5.5, 1.6, (d) => (d < 0.4 ? WHITE : d < 0.8 ? C[6] : C[4]));
  for (let i = 0; i < 4; i++) {
    const k = 0.5 + 0.5 * Math.cos(TAU * (2 * ph - i / 4));
    p.px(-9 + i * 6, -2, k > 0.7 ? C[6] : C[3]);
  }
  // the cone of light up to the model: thin, fading as it rises, scanlines climbing it
  const top = cy + RAD * 1.3;
  for (let y = Math.ceil(top); y < LENS; y++) {
    const v = (y - LENS) / (top - LENS), w = lerp(4, RAD + 4, v), lineOn = ((((y + t * 24) % 5) + 5) % 5) < 1;
    for (let x = Math.floor(-w); x <= Math.ceil(w); x++) {
      const q = Math.abs(x + 0.5) / w;
      if (q > 1) continue;
      if (q > 1 - 1 / w) put(x, y, v < 0.5 ? C[5] : C[4]);
      else p.blend(x + 0.5, y + 0.5, lineOn ? C[5] : C[4], (0.05 + 0.12 * (1 - v)) * (1 - 0.6 * q * q) + (lineOn ? 0.06 : 0));
    }
  }
  p.glow(0, LENS, 12, C[5], 0.6);
  // the stage the model stands on: a thin ring where the cone ends
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * TAU - ph * TAU, x = Math.cos(a) * (RAD + 4), y = top + Math.sin(a) * 3;
    if (i % 7 < 5) put(x, y, Math.sin(a) > 0 ? C[6] : C[4], Math.sin(a) > 0 ? 1 : 0.7);
  }
  p.glowLine(-RAD - 4, top, RAD + 4, top, 4, C[4], 0.2);
  // data bits rising through the cone
  cycle(t, D, 18, S + 1, (r) => r.range(0.8, 1.4), (age, life, r) => {
    const k = age / life, y = lerp(LENS - 2, top, k), w = lerp(4, RAD + 2, k);
    put(r.range(-0.8, 0.8) * w, y, r.chance(0.3) ? WHITE : C[5], Math.min(1, (1 - k) * 2));
  });

  // the model: turning once a loop, tilted toward us
  const spin = TAU * ph, tilt = 0.32, P3 = VERTS.map(([x, y, z]) => {
    const x1 = x * Math.cos(spin) + z * Math.sin(spin), z1 = -x * Math.sin(spin) + z * Math.cos(spin);
    const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
    return [cx + x1 * RAD, cy - y2 * RAD, z2];
  });
  // a scan bar climbing through it, twice a loop
  const scanY = lerp(cy + RAD * 1.5, cy - RAD * 1.5, ((ph * 2) % 1) / 0.8);
  // the faces that face us, filled with scanlines
  for (const f of FACES) {
    const [a, b, c] = f.map((i) => P3[i]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (nz >= 0) continue;
    const shade = clamp(0.3 + 0.7 * ((a[2] + b[2] + c[2]) / 3 + 0.5));
    p.poly([a, b, c], (x, y) => (Math.abs(y - scanY) < 2 ? C[6] : shade > 0.6 ? C[4] : C[3]), (x, y) => {
      const yy = Math.floor(y);
      return (yy % 3 === 0 && !(flick && yy & 1)) || Math.abs(y - scanY) < 1.5 ? 1 : 0;
    });
  }
  // the edges: the far ones dim, the near ones bright, hot where the scan bar crosses them
  const edges = EDGES.map(([i, j]) => [P3[i], P3[j], (P3[i][2] + P3[j][2]) / 2]).sort((a, b) => a[2] - b[2]);
  for (const [a, b, z] of edges) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = 0; d <= L; d += 0.5) {
      const x = lerp(a[0], b[0], d / L), y = lerp(a[1], b[1], d / L), hot = Math.abs(y - scanY) < 1.5;
      if (z < -0.15) put(x, y, hot ? C[5] : C[3], 0.7);
      else put(x, y, hot ? WHITE : z > 0.4 ? C[6] : C[5]);
    }
  }
  for (const [x, y, z] of P3) {
    if (z < -0.15) continue;
    put(x, y, WHITE);
    p.glow(x, y, 4, C[5], 0.3);
  }
  // a dashed data ring round its waist, its far half behind
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU + ph * TAU * 2, x = cx + Math.cos(a) * (RAD + 9), y = cy + 3 + Math.sin(a) * 4;
    if (Math.floor(i / 3) % 3 === 2) continue;
    put(x, y, Math.sin(a) > 0 ? (i % 9 === 0 ? WHITE : C[5]) : C[3], Math.sin(a) > 0 ? 1 : 0.6);
  }
  // light: the model glows, the scan bar glows, a flicker drops the light too
  const lk = flick ? 0.5 : 1;
  p.glow(cx, cy, RAD * 2.2, C[4], 0.36 * lk);
  p.glow(cx, cy - RAD * 0.6, RAD, C[5], 0.15 * lk);
  if (Math.abs(scanY - cy) < RAD * 1.4) p.glowLine(cx - RAD, scanY, cx + RAD, scanY, 5, C[5], 0.3 * lk);
  p.glow(0, -2, 22, C[4], 0.2);
}
