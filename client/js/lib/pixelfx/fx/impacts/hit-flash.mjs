import { Lights, Rng, fit, clamp, ease, TAU, WHITE, mix, luma, red, green, blue, rgb, READY } from "../../core/index.mjs";

export const meta = {
  name: "Hit flash",
  desc: "The character takes damage: a white frame, then their own colors flushed red and blinking white, cooling off, while comic hit lines jab in at them.",
  tags: ["impact", "hit", "damage", "hurt", "flash", "blink", "actor", "comic", "one-shot"],
  size: [80, 64],
  origin: [40, 54],
  duration: 0.5,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a"], lines: 7, side: 1, seed: 17 },
};

const BLOWN = { x: -5, crouch: 4, lean: -5, hx: -1, fx: 8, fy: -33, bx: -11, by: -27, ffx: 9, ffy: -7, fbx: -6 };
export const act = {
  onBody: true,
  poses: [
    [-0.26, { ...READY, x: 0 }],
    [0, BLOWN, "snap"],
    [0.16, { ...BLOWN, x: -8, crouch: 5 }],
    [0.42, { ...BLOWN, x: -8, crouch: 5, lean: -2, fx: 9, fy: -22, bx: 6, by: -20, ffy: -4 }],
    [0.86, { ...READY, x: 0 }],
  ],
  hits: [{ t: 0, stop: 0.07, shake: 0.14, amp: 2 }],
};

// the beats, by frame at 30 fps: white, white, red, red, white rim, red cooling off
const BEATS = [[0.025, "white"], [0.058, "white2"], [0.125, "red"], [0.158, "rim"], [0.36, "cool"]];

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), A = o.actor, M = A.mask, PX = A.pixels, S = o.side;
  const [cx, cy] = A.chest, hx = cx + S * 12, hy = cy - 5; // where the blow lands: the character's front, chest high
  const lights = new Lights();
  lights.add(hx, hy, 34, WHITE, 0.6, 0.1);
  lights.add(cx, cy, 30, C[4], 0.5, 0.35);
  // the hurt colors: each pixel's own light and shade carried into the red ramp
  const reds = new Uint32Array(PX.length), tints = new Uint32Array(PX.length);
  for (let i = 0; i < PX.length; i++) {
    if (!PX[i]) continue;
    const l = luma(PX[i] | 0xff000000);
    reds[i] = C[clamp(Math.round(2 + l * 5), 2, 6)];
    tints[i] = mix(PX[i] | 0xff000000, C[4], 0.55);
  }
  // hit lines all round the top and sides, jabbing in at the body
  const lines = Array.from({ length: o.lines }, (_, i) => {
    const a = -Math.PI - 0.3 + ((i + R.range(0.25, 0.75)) / o.lines) * (Math.PI + 0.6);
    return { a, d: R.range(15, 19), len: R.range(6, 9), t0: R.range(0, 0.04) };
  });
  let t = 0;
  const beat = () => {
    for (const [end, b] of BEATS) if (t < end) return b;
    return null;
  };
  const body = (p, color) => p.mask(M, A.x, A.y, (mx, my) => color(my * M.w + mx));
  return {
    update(dt) {
      t += dt;
      lights.update(dt);
    },
    draw(p) {
      const b = beat();
      if (b === "white" || b === "white2") {
        body(p, () => WHITE);
        p.outline(M, A.x, A.y, b === "white" ? C[6] : C[5]);
      } else if (b === "red") {
        body(p, (i) => reds[i]);
        p.outline(M, A.x, A.y, C[5]);
      } else if (b === "rim") p.outline(M, A.x, A.y, WHITE);
      else if (b === "cool") {
        const k = 1 - (t - 0.158) / (0.36 - 0.158);
        body(p, (i) => mix(PX[i] | 0xff000000, tints[i], k));
        if (k > 0.5) p.outline(M, A.x, A.y, C[4], (k - 0.5) * 2);
      }
      // the blow: a small hot burst on the side it came from
      if (t < 0.07) {
        const big = t < 0.035 ? 1 : 1.3, k = t < 0.035 ? 0 : 1;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + 0.2, L = (i % 2 ? 4 : 9) * big;
          p.line(hx + Math.cos(a) * L * 0.45 * k, hy + Math.sin(a) * L * 0.45 * k, hx + Math.cos(a) * L, hy + Math.sin(a) * L, (u) => (u < 0.45 && !k ? WHITE : u < 0.75 ? C[6] : C[4]));
        }
        if (!k) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(hx + dx, hy + dy, WHITE);
        p.glow(hx, hy, 14, C[6], 0.5 * (1 - t / 0.07));
      }
      // comic hit lines jab in toward the body, then are gone
      for (const l of lines) {
        const u = (t - l.t0) / 0.16;
        if (u < 0 || u >= 1) continue;
        const d0 = l.d - 6 * ease.outCubic(u), L = l.len * (1 - u), ca = Math.cos(l.a), sa = Math.sin(l.a) * 1.15;
        if (L < 1) continue;
        // a wedge, its point at the body and its fat end out, white with a red edge
        const w = (2.8 - 1.6 * u) / 2, nx = -sa * w, ny = ca * w, ex = cx + ca * (d0 + L), ey = cy + sa * (d0 + L), px0 = cx + ca * d0, py0 = cy + sa * d0;
        p.poly([[px0 - ca, py0 - sa], [ex + nx * 1.5 + ca, ey + ny * 1.5 + sa], [ex - nx * 1.5 + ca, ey - ny * 1.5 + sa]], C[3]);
        p.poly([[px0, py0], [ex + nx, ey + ny], [ex - nx, ey - ny]], u < 0.5 ? WHITE : C[6]);
      }
      const k = Math.exp(-t / 0.08);
      if (k > 0.02) p.glow(cx, cy, 26, b === "white" || b === "white2" ? WHITE : C[5], 0.35 * k);
      lights.draw(p);
    },
  };
}
