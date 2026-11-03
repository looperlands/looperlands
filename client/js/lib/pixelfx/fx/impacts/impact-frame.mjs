import { Rng, fit, clamp, ease, TAU } from "../../core/index.mjs";

export const meta = {
  name: "Impact frame",
  desc: "An anime impact: two frames of white with black burst lines rushing at the hit, two frames inverted, then the lines pull out past the edges and vanish.",
  tags: ["impact", "hit", "anime", "manga", "flash", "speed-lines", "screen", "one-shot"],
  size: [320, 180],
  origin: [160, 90],
  duration: 0.3,
  loop: false,
  fps: 30,
  bg: "black",
  options: { palette: ["#000000", "#ffffff"], lines: 64, seed: 19 },
};

const FRAME = 1 / 30; // the beats are whole frames: 2 white, 2 inverted, 4 pulling out

// burst lines: wedges aimed at the hit from past the edges, each its own width and reach, in angle order
function burst(R, n) {
  return Array.from({ length: n }, (_, i) => {
    const thick = R.chance(0.18);
    return { a: ((i + R.range(0.1, 0.9)) / n) * TAU, inner: thick ? R.range(30, 48) : R.range(18, 70), w: thick ? R.range(5, 8) : R.range(1.2, 3.6) };
  });
}

// the jagged burst at the middle: a spiky star whose points shift every frame
const spikes = (a, ph) => 10 + 6 * Math.abs(Math.sin(a * 5 + ph)) + 4 * Math.abs(Math.sin(a * 11 + ph * 2.7)) + 2 * Math.sin(a * 23 + ph);

export function create(o) {
  const C = fit(o.palette, 3), R = new Rng(o.seed), INK = C[0], PAPER = C[2];
  const [W, H] = meta.size, [OX, OY] = meta.origin, x0 = -OX, y0 = -OY;
  const sets = [burst(R, o.lines), burst(R, o.lines)], jit = [[Math.round(R.range(-2, 2)), Math.round(R.range(-1, 1))], [Math.round(R.range(-2, 2)), Math.round(R.range(-1, 1))]];
  const ph = [R.range(0, TAU), R.range(0, TAU), R.range(0, TAU), R.range(0, TAU)];
  // every frame is fixed, so work each one out once: which pixels are ink (1) or paper (2), 0 for nothing
  const masks = [];
  for (let f = 0; f < 8; f++) {
    const m = new Uint8Array(W * H), set = sets[f % 2], n = set.length, [jx, jy] = f < 4 ? jit[f % 2] : [0, 0];
    const reach = f < 4 ? 0 : Math.pow((f - 3) / 4.5, 1.5), thin = f < 4 ? 1 : 1 - (f - 3) / 5.5;
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const X = x0 + i + 0.5 - jx, Y = y0 + j + 0.5 - jy, rho = Math.hypot(X, Y * 1.35), ang = Math.atan2(Y * 1.35, X);
        const slot = Math.floor((((ang % TAU) + TAU) % TAU) / (TAU / n));
        let line = false;
        for (let k = -1; k <= 1 && !line; k++) {
          const l = set[(slot + k + n) % n];
          let d = (((ang - l.a) % TAU) + TAU) % TAU;
          if (d > Math.PI) d = TAU - d;
          const inner = l.inner + reach * 150, hw = l.w * clamp((rho - inner) / 40) * thin;
          line = rho > inner && d * rho < Math.max(0.5, hw);
        }
        if (f < 4) {
          const r2 = Math.hypot(X, Y * 1.1), core = spikes(Math.atan2(Y * 1.1, X), ph[f]) * (f === 0 ? 0.85 : 1 + f * 0.08);
          m[j * W + i] = r2 < core ? (r2 < 4 + f ? 2 : 1) : line ? 1 : 2;
        } else m[j * W + i] = line ? 2 : 0;
      }
    masks.push(m);
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
    },
    draw(p) {
      const f = Math.floor(t / FRAME + 1e-6);
      if (f >= 8) return;
      // two frames of ink on paper, two inverted, then paper lines pulling out over the scene
      const m = masks[f], inv = f === 2 || f === 3, ink = inv ? PAPER : INK, paper = inv ? INK : PAPER;
      p.shade(x0, y0, x0 + W, y0 + H, (x, y) => {
        const i = Math.floor(x - x0), j = Math.floor(y - y0);
        if (i < 0 || j < 0 || i >= W || j >= H) return;
        const v = m[j * W + i];
        return v === 1 ? ink : v === 2 ? (f < 4 ? paper : PAPER) : 0;
      });
    },
  };
}
