import { Particles, Lights, P, Rng, fit, sparkle, star, clamp, seg, ease, rand, TAU, WHITE, hex } from "../../core/index.mjs";
import { spell, drawWord, panel } from "./_lib.mjs";

export const meta = {
  name: "Achievement",
  desc: "A toast slides in on speed lines and settles; a gold medal pops onto it in a burst of sparkles, a shine sweeps the whole toast, then it slides away.",
  tags: ["ui", "achievement", "toast", "medal", "reward", "text", "one-shot"],
  size: [220, 72],
  origin: [110, 36],
  duration: 2.4,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#2a1405", "#5c3008", "#9a5a0e", "#d48e18", "#f5b92c", "#ffde5e", "#fff4bc", "#ffffff"],
    ribbon: ["#0c1430", "#1f3a7a", "#2f66c4", "#5aa0f0", "#a6d4ff"],
    title: "ACHIEVEMENT",
    text: "UNLOCKED",
    seed: 9,
  },
};

const PW = 130, PH = 34, PX = -PW / 2, PY = -PH / 2, IN = 0.2, MEDAL = 0.26, SHINE = 0.95, OUT = 1.92;
const MX = PX + 17, MY = 2;
const INK = { outline: hex("#0d0a14"), rim: hex("#5a4f74"), top: hex("#2a2338"), body: hex("#211b2d"), low: hex("#15111c") };

// the medal: ribbon straps behind it, a scalloped-free gold disc with a lit rim and a raised star
function medal(p, G, B, x, y, s, white, shine) {
  const r = 10 * s;
  for (const sd of [-1, 1]) {
    // a strap from the medal up to the toast's top edge
    p.poly([[x + sd * 2 * s, y - r + 2], [x + sd * 7 * s, y - r + 2], [x + sd * 9 * s, PY + 1], [x + sd * 4 * s, PY + 1]], (px) => (Math.abs(px - x) < 4.5 * s ? B[2] : B[3]));
    p.line(x + sd * 2 * s, y - r + 2, x + sd * 4 * s, PY + 1, B[0]);
    p.line(x + sd * 7 * s, y - r + 2, x + sd * 9 * s, PY + 1, B[0]);
  }
  const st = star(x, y + 0.5, 2.8 * s, 6.5 * s, 5);
  const inStar = (px, py) => {
    let inside = false;
    for (let i = 0, j = st.length - 1; i < st.length; j = i++) {
      const [xi, yi] = st[i], [xj, yj] = st[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  p.shade(x - r - 1, y - r - 1, x + r + 1, y + r + 1, (px, py) => {
    const dx = px - x, dy = py - y, d = Math.hypot(dx, dy);
    if (d > r) return;
    if (white) return r - d < 1 ? G[6] : WHITE;
    if (r - d < 1) return G[0];
    const l = -(dx * 0.6 + dy * 0.8) / r;
    if (shine !== null && Math.abs(dx - dy * 0.6 - shine) < 1.2) return WHITE;
    if (r - d < 2.5) return l > 0.2 ? G[6] : l > -0.3 ? G[4] : G[3];
    // the raised star: a dark edge, a lit upper-left face, a shaded lower-right one
    if (inStar(px, py)) return !inStar(px + 1, py) || !inStar(px - 1, py) || !inStar(px, py + 1) || !inStar(px, py - 1) ? G[2] : dx + dy < 0 ? G[7] : G[6];
    return l > 0.4 ? G[5] : l > -0.2 ? G[4] : G[3];
  });
}

export function create(o) {
  const G = fit(o.palette, 8), B = fit(o.ribbon, 5), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [G[7], G[6], G[5], G[3]] }), lights = new Lights();
  const title = spell(o.title, "mini"), sub = spell(o.text, "mini"), TX = PX + 34;
  let t = 0, popped = false;
  const end = meta.duration - 0.05;
  // the toast slides in from the right, overshoots and settles; at the end it eases back and slides off
  const xAt = (t) => (t < IN ? 30 * Math.pow(1 - t / IN, 3) : t < OUT ? -3 * Math.exp(-(t - IN) * 12) * Math.sin((t - IN) * 30) : seg(t, OUT, OUT + 0.06) < 1 ? -3 * seg(t, OUT, OUT + 0.06) : -3 + 33 * ease.inQuad(seg(t, OUT + 0.06, OUT + 0.24)));
  return {
    update(dt) {
      t += dt;
      if (!popped && t >= MEDAL + 0.06) {
        popped = true;
        lights.add(MX, MY, 36, G[5], 0.7, 0.4);
        for (let i = 0; i < 12; i++) {
          const an = (i / 12) * TAU + R.range(-0.2, 0.2), sp = R.range(40, 90);
          ps.spawn(P.STAR, MX + Math.cos(an) * 9, MY + Math.sin(an) * 9, Math.cos(an) * sp, Math.sin(an) * sp * 0.6, R.range(0.25, 0.45), R.pick([G[7], G[6], G[5]]), i % 3 ? 0.6 : R.range(1.2, 1.8));
        }
      }
      if (t > 0.5 && t < OUT && R.chance(0.05)) ps.spawn(P.STAR, MX + R.range(-11, 11), MY + R.range(-11, 9), 0, -R.range(4, 10), Math.min(R.range(0.3, 0.5), end - t), G[6], R.chance(0.3) ? 1.4 : 0.6);
      ps.update(dt);
      lights.update(dt);
    },

    draw(p) {
      const x = xAt(t), out = t > OUT + 0.06, a = t < 0.05 ? 0.5 : out ? 1 - seg(t, OUT + 0.12, OUT + 0.24) : 1;
      if (a <= 0) return;
      // speed lines trail it while it moves
      const moving = t < IN * 0.8 || out;
      if (moving)
        for (let i = 0; i < 8; i++) {
          const y = PY + 3 + rand(Math.floor(t * 30), i, 1) * (PH - 6), L = 10 + rand(Math.floor(t * 30), i, 2) * 26, x0 = x + PW / 2 + 2 + rand(i, 3) * 6;
          p.line(x0, y, Math.min(106, x0 + L), y, (u) => (u < 0.3 ? WHITE : u < 0.6 ? G[6] : G[4]), (u) => a * (1.1 - u));
        }
      // the plate and its gold edge; a shine sweeps the whole toast
      const sh = seg(t, SHINE, SHINE + 0.36), shine = sh > 0 && sh < 1 ? PX - 12 + (PW + 30) * ease.inOutSine(sh) : null;
      panel(p, PX + x, PY, PW, PH, INK, { r: 4, a, shine: shine === null ? null : shine + x });
      p.line(PX + x + 4, PY + 1, PX + x + PW - 5, PY + 1, G[4], a);
      p.px(PX + x + 3, PY + 1, G[2]);
      // the words: a gold title, a white line under it
      const ti = title.letters.filter((L) => L.g).map((L) => ({ g: L.g, x: TX + x + L.x * 2, y: PY + 5, sx: 2, sy: 2, a }));
      drawWord(p, ti, { fill: [G[4], G[5], G[6]], edge: G[7], under: G[3], outline: INK.outline, shadow: 0, shine: shine === null ? null : shine + x, shineY: PY, glint: G[7] });
      const si = sub.letters.filter((L) => L.g).map((L) => ({ g: L.g, x: TX + x + L.x * 2, y: PY + 19, sx: 2, sy: 2, a }));
      drawWord(p, si, { fill: [hex("#9a94b0"), hex("#d8d4e6"), WHITE], edge: WHITE, under: hex("#6e6886"), outline: INK.outline, shadow: 0, shine: shine === null ? null : shine + x, shineY: PY });
      // the medal pops onto it: big and white for a frame, then springs to size
      const mk = t - MEDAL;
      if (mk > 0) {
        const s = mk < 0.035 ? 1.5 : 1 + 0.35 * Math.exp(-mk * 16) * Math.cos(mk * 28);
        medal(p, G, B, MX + x, MY, s, mk < 0.07, shine === null ? null : shine - MX + 4);
        p.glow(MX + x, MY, 20, G[5], 0.3 * a + (mk < 0.15 ? 0.5 * (1 - mk / 0.15) : 0));
        const g = ((t - 1.5) % 0.9) / 0.9;
        if (t > 1.5 && g < 0.25) sparkle(p, MX + x - 4, MY - 4, 4 * Math.sin((g / 0.25) * Math.PI), G[7], G[6], 0.5);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
