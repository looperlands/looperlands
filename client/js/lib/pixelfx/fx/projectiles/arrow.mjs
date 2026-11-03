import { fit, rand, sparkle, mix, hex, TAU, WHITE } from "../../core/index.mjs";
import { beat } from "./_lib.mjs";

export const meta = {
  name: "Arrow",
  desc: "An arrow in flight: a steel broadhead catching the light, a wooden shaft, fletching fluttering in the wind, streaks of air peeling off its head and swirling off its feathers.",
  tags: ["projectile", "arrow", "bow", "medieval", "directional", "loop"],
  size: [112, 32],
  origin: [92, 16],
  duration: 0.6,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#7a1f2c", "#b8323c", "#e8e2d6", "#ffffff"],
    wood: ["#3a2414", "#6e4422", "#a8723c", "#d8a868"],
    steel: ["#2e3648", "#5a6680", "#9aa6ba", "#dfe7f2"],
    wind: "#b8c8e8",
    seed: 3,
  },
};

// the arrow, nose right, tip at (0, 0): fletching (three poses for the flutter), shaft, binding, broadhead
const HEAD = ["..LL....", "..sLLL..", "bbsSSSSW", "..dDDD..", "..DD...."];
const FLETCH = [
  ["AAa.........", ".aAAa.......", "..aaAAa.....", "nkkkkkkkkkkk", "..cCCc......", ".cCCc.......", "CCc........."],
  [".AAa........", "..aAAa......", "..aaAAAa....", "nkkkkkkkkkkk", "..cCCCc.....", "..cCCc......", ".CCc........"],
  ["AAAa........", "aAAa........", ".aaAAa......", "nkkkkkkkkkkk", "..ccCc......", "cCCc........", "CCc........."],
];

export function draw(p, t, o) {
  const PL = fit(o.palette, 4), W = fit(o.wood, 4), ST = fit(o.steel, 4), wind = hex(o.wind), S = o.seed, D = meta.duration;
  const fr = Math.floor(t * 30 + 1e-6), ph = t / D, left = -meta.origin[0] + 2, LEN = 36;

  // streaks of air peeling off the head and the fletching, stretching back and thinning
  beat(t, D, 9, S, (r) => r.range(0.14, 0.26), (age, life, r) => {
    const k = age / life, top = r.chance(0.5) ? -1 : 1, from = r.chance(0.6) ? -3 : -LEN + 6;
    const x0 = from - age * r.range(160, 240), len = r.range(8, 16) * (0.5 + k), y = 0.5 + top * (r.range(3, 5) + k * r.range(1, 2.5));
    if (x0 - len < left) return;
    const c = k < 0.4 ? wind : mix(wind, hex("#2a2540"), (k - 0.4) * 1.2);
    p.line(x0, y, x0 - len, y, (u) => (u < 0.25 && k < 0.4 ? mix(wind, WHITE, 0.5) : c), (u) => (u < 0.65 ? 1 : (1 - u) / 0.35));
  });
  // little eddies spinning off the feathers
  beat(t, D, 6, S + 3, (r) => r.range(0.15, 0.25), (age, life, r) => {
    const k = age / life, cx = -LEN - 2 - age * r.range(100, 150), cy = 0.5 + r.sign() * r.range(2, 4), a = age * 30 + r.range(0, TAU), rr = 1.2 + k * 1.5;
    if (cx < left + 4) return;
    for (let i = 0; i < 4; i++) p.dot(cx + Math.cos(a + i * 0.5) * rr, cy + Math.sin(a + i * 0.5) * rr, wind, (1 - k) * (1 - i * 0.2));
  });

  // the shaft with a lit top line
  p.line(-LEN + 11, 0, -7, 0, W[2]);
  for (let x = -LEN + 14; x < -8; x += 6) p.px(x, 0, W[3]);
  // the fletching flutters through its poses, faster than the frame rate can quite catch
  const pose = FLETCH[Math.floor(rand(fr, S) * 3)];
  p.sprite(pose, { a: PL[2], A: PL[3], c: PL[0], C: PL[1], k: W[1], n: W[0] }, -LEN, -3);
  // the binding and the broadhead: a lit upper bevel, a shaded lower one, a white point
  p.sprite(HEAD, { L: ST[3], s: ST[2], S: ST[2], d: ST[0], D: ST[1], b: W[0], W: WHITE }, -7, -2);
  // a glint runs down the blade now and then
  const g = (ph * 2) % 1;
  if (g < 0.25) sparkle(p, -5 + g * 16, -1, 1 + Math.round(2 * Math.sin((g / 0.25) * Math.PI)), WHITE, ST[3], 0.25);
}
