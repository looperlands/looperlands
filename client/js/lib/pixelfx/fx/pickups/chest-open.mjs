// The collection pop (white squash, a ring snapping out, star sparks) and the glints follow Sprite Fusion's
// open-source pickup (https://www.spritefusion.com/pixel-art-vfx/pickup), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, flare, clamp, smooth, ease, rand, TAU, WHITE, hex, mix, scale } from "../../core/index.mjs";
import { Layer, coin, gemlet, glint, pool, blobShadow } from "./_lib.mjs";

export const meta = {
  name: "Chest open",
  desc: "A banded chest rattles with gold light leaking from its seam, the lid kicks open, rays fan up, and coins and gems arc out, bounce, glint and get collected.",
  tags: ["pickup", "chest", "treasure", "loot", "reward", "gold", "one-shot"],
  size: [176, 112],
  origin: [88, 96],
  duration: 4.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"],
    wood: ["#110a10", "#24131a", "#3a1f1f", "#552d24", "#73402c", "#925737", "#b07246"],
    coins: 12,
    seed: 3,
  },
};

// gems that come out with the gold: ruby, emerald, sapphire, amethyst (dark to bright)
const GEMS = [
  ["#2a0612", "#6e0f2a", "#b81c3c", "#f0405a", "#ff8a96", "#ffd2d6"],
  ["#06200f", "#0f4a26", "#1a8040", "#34c060", "#8af0a0", "#d8ffe0"],
  ["#0a1030", "#142a70", "#2050c0", "#3a8cf0", "#8ccaff", "#dcf0ff"],
  ["#1a0a2a", "#3e1466", "#6a28a8", "#a050e0", "#d09cff", "#f0e0ff"],
].map((g) => g.map(hex));

const T_OPEN = 0.8, T_COLLECT = 2.55, T_POOF = 3.3;
const RATTLES = [[0.1, 0.4], [0.32, 0.62], [0.5, 0.8], [0.64, 1]];
// the chest: 24 px wide, a 9 px front face, seen from a little above (tilt sin 0.34) so the open top shows
const HW = 12, FH = 9, CS = 0.94, SN = 0.34, HB = FH / CS, LA = 6, LB = 5.5, STRAPS = [-9, 7];
const L = new Layer(40, 44), IL = new Layer(16, 16);

// the lid as rows of screen pixels: which point of its curved profile each row shows, which side, how lit.
// Points that swing below the rim (behind the back wall) are hidden.
function lidRows(th) {
  const best = new Map(), ct = Math.cos(th), st = Math.sin(th);
  for (let i = 0; i <= 260; i++) {
    const al = (i / 260) * Math.PI, dz = LA + LA * Math.cos(al), dy = LB * Math.sin(al);
    const z = -LA + dz * ct - dy * st, y = HB + dz * st + dy * ct;
    if (y < HB - 0.05) continue;
    let nz = Math.cos(al) / LA, ny = Math.sin(al) / LB;
    const nl = Math.hypot(nz, ny);
    (nz /= nl), (ny /= nl);
    const Nz = nz * ct - ny * st, Ny = nz * st + ny * ct;
    const v = y * CS + (LA - z) * SN, dep = z * CS + y * SN, row = Math.floor(-v);
    const cur = best.get(row);
    if (!cur || dep > cur.dep) best.set(row, { row, al, dep, out: Nz * CS + Ny * SN > 0, lit: Ny * 0.95 + Nz * 0.3 - 0.2 });
  }
  const rows = [...best.values()].sort((a, b) => a.row - b.row);
  // the lit crest: the outside row facing the light most squarely
  let hi = null;
  for (const r of rows) if (r.out && (!hi || r.lit > hi.lit)) hi = r;
  if (hi && hi.lit > 0.5) hi.crest = true;
  // stave seams: the row nearest each seam angle
  for (const s of [Math.PI / 3, (2 * Math.PI) / 3]) {
    let k = null;
    for (const r of rows) if (!k || Math.abs(r.al - s) < Math.abs(k.al - s)) k = r;
    if (k && Math.abs(k.al - s) < 0.4) k.seam = true;
  }
  return rows;
}

const tone = (R, l, steps) => R[steps[l > 0.6 ? 0 : l > 0.25 ? 1 : l > -0.1 ? 2 : l > -0.45 ? 3 : 4]];
const IRON = ["#0e0d16", "#1d1c28", "#2f2e3e", "#474658", "#6a6a7e", "#9898ac"].map(hex);

// the glowing hoard inside the open top: a mound of gold, lit from within
function paintHoard(C, W, g) {
  const heat = (k) => C[clamp(Math.round(k + g * 2.2), 0, 7)];
  for (let y = -13; y <= -10; y++)
    for (let x = -HW; x < HW; x++) {
      const h = rand(x, y, 7), k = h < 0.18 ? 5 : h < 0.55 ? 4 : 3;
      L.set(x, y, y === -13 && Math.abs(x + 0.5) > 9 ? W[2] : heat(k - (y === -13 ? 1 : 0)));
    }
  for (let x = -9; x < 9; x++) {
    const top = -13 - Math.round(2.2 * Math.pow(Math.cos(((x + 0.5) / 10) * (Math.PI / 2)), 1.4));
    for (let y = top; y < -13; y++) L.set(x, y, heat(y === top ? 5 : 4 + (rand(x, y, 3) < 0.3 ? 1 : 0)));
  }
}

// the lid at angle th: wood staves, iron straps, a gold lip and hasp outside; dark wood lit by the hoard inside
function paintLid(C, W, th, g) {
  const rows = lidRows(th), heat = (k) => C[clamp(Math.round(k + g * 2.2), 0, 7)], top = rows.length ? rows[0].row : 0;
  for (const r of rows) {
    const u = r.al;
    for (let x = -HW; x < HW; x++) {
      const strap = STRAPS.some((s) => x === s || x === s + 1), left = STRAPS.some((s) => x === s), side = (x + HW + 0.5) / (2 * HW);
      const corner = x === -HW || x === HW - 1;
      let c;
      if (r.out) {
        if (r.row === top && corner && th < 0.6) continue;
        const l = r.lit + 0.2 - side * 0.35 - (r.row === top ? 0.45 : 0);
        if (u < 0.3 || (u < 0.55 && x >= -2 && x <= 1)) c = tone(C, l + (x >= -2 && x <= 1 ? 0.15 : 0.1), [6, 5, 5, 4, 3]);
        else if (corner) c = x < 0 ? IRON[4] : IRON[2];
        else if (strap) c = tone(IRON, l + (left ? 0.3 : -0.3), [5, 4, 3, 2, 1]);
        else if (r.seam) c = W[0];
        else {
          c = r.crest && side < 0.62 ? W[6] : tone(W, l, [5, 4, 3, 2, 1]);
          if (rand(x >> 1, Math.round(u * 6), 11) < 0.2) c = W[Math.max(0, W.indexOf(c) - 1)];
        }
      } else {
        // the inside of the lid, lit by the hoard from below
        const k = g * Math.pow(u / Math.PI, 1.3);
        if (u < 0.3) c = heat(1);
        else if (r.seam) c = W[0];
        else c = k > 0.6 ? mix(W[4], C[5], 0.3) : k > 0.35 ? W[3] : k > 0.15 ? W[2] : W[1];
        if (corner) c = W[0];
      }
      L.set(x, r.row, c);
    }
  }
}

// the front face: a gold rim, two planks, iron straps and corners with rivets, a gold lock plate and keyhole
function paintFront(C, W, g) {
  for (let y = -FH; y <= -1; y++)
    for (let x = -HW; x < HW; x++) {
      const side = (x + HW + 0.5) / (2 * HW);
      let c;
      if (y === -FH) c = side < 0.3 ? C[6] : side < 0.7 ? C[5] : C[4];
      else if (y === -1) c = W[1];
      else if (y === -5) c = W[0];
      else {
        const top = y === -8 || y === -4, bot = y === -6 || y === -2;
        c = W[top ? (side < 0.45 ? 4 : 3) : bot ? 2 : 3];
        if (!top && rand(x >> 1, y, 5) < 0.2) c = W[bot ? 1 : 2];
      }
      if (x === -HW) c = y === -FH ? C[5] : IRON[4];
      if (x === HW - 1) c = y === -FH ? C[3] : IRON[2];
      for (const s of STRAPS) {
        if (x === s && y > -FH) c = y === -7 || y === -3 ? IRON[5] : IRON[4];
        if (x === s + 1 && y > -FH) c = IRON[2];
      }
      L.set(x, y, c);
    }
  for (let y = -FH; y <= -4; y++)
    for (let x = -2; x <= 1; x++) L.set(x, y, x === 1 || y === -4 ? C[3] : x === -2 && y === -FH ? C[7] : C[5]);
  const kh = g < 0.15 ? W[0] : g < 0.4 ? C[4] : g < 0.7 ? C[6] : WHITE;
  L.set(-1, -7, kh), L.set(0, -7, kh), L.set(-1, -6, kh), L.set(0, -6, scale(kh, 0.85));
}

// the whole chest: past upright the lid stands behind the hoard, before that it covers it
function paintChest(C, W, th, g) {
  if (th > 1.2) paintLid(C, W, th, g), paintHoard(C, W, g);
  else paintHoard(C, W, g), paintLid(C, W, th, g);
  paintFront(C, W, g);
}

export function create(o) {
  const C = fit(o.palette, 8), W = fit(o.wood, 7), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[4] });
  const lights = new Lights(), loot = [], rings = [], bits = [];
  const dust = new Particles({ rng: R, sparks: [C[5], C[5], C[4], C[3]] });
  const DUST = hex("#5e5068");
  // the rays that fan out of the open chest
  const rays = Array.from({ length: 9 }, (_, i) => {
    const u = (i / 8) * 2 - 1;
    return { a: u * 1.05 + R.range(-0.06, 0.06), len: R.range(46, 64) * (1.2 - 0.4 * Math.abs(u)), w: R.range(0.035, 0.08), d: R.range(0, 0.06), f: R.range(5, 10), ph: R.range(0, TAU) };
  });
  // the loot: coins and gems, launched in a fan out of the mouth
  const n = o.coins;
  for (let i = 0; i < n + 4; i++) {
    const gem = i >= n, s = i % 2 ? 1 : -1, a = s * R.range(0.1, 0.5), sp = R.range(190, 270);
    loot.push({
      gem, G: gem ? GEMS[(i - n) % GEMS.length] : null, x: R.range(-7, 7), y: -12, vx: Math.sin(a) * sp, vy: -Math.cos(a) * sp,
      t0: T_OPEN + 0.03 + R.range(0, 0.2), up: false, rest: false, r: gem ? 2.6 : 3, ax: R.range(-0.6, 0.6), spin: R.range(0, TAU), vs: R.sign() * R.range(14, 24),
      settle: 0, ph: R.next(), pop: 0, gone: false,
    });
  }
  // they get picked up from the outside in
  [...loot].sort((a, b) => Math.abs(b.vx) - Math.abs(a.vx)).forEach((it, k) => (it.pop = T_COLLECT + k * 0.04 + R.range(0, 0.02)));

  let t = 0, opened = false, poofed = false;
  const shake = () => {
    let dx = 0, hop = 0, lid = 0;
    for (const [t0, s] of RATTLES) {
      const u = t - t0;
      if (u < 0 || u > 0.18) continue;
      const e = 1 - u / 0.18;
      dx += Math.sin(u * 90) * 1.6 * s * e;
      if (u < 0.06 && s > 0.5) hop = 1;
      lid = Math.max(lid, Math.max(0, Math.sin(u * 38)) * 0.13 * s * e);
    }
    if (t >= T_OPEN && t < T_OPEN + 0.08) hop = 1;
    // the last strain: the lid creeps up off the seam just before it bursts open
    const strain = smooth(T_OPEN - 0.14, T_OPEN, t);
    if (t < T_OPEN) lid = Math.max(lid, 0.07 * strain), (dx += strain > 0.2 ? (Math.floor(t * 60) % 2 ? 1 : -1) * 0.6 : 0);
    return { dx: Math.round(dx), hop, lid };
  };
  const lidAngle = (lid) => {
    if (t < T_OPEN) return lid;
    const u = t - T_OPEN, w = 30, z = 0.55, wd = w * Math.sqrt(1 - z * z);
    return 1.98 * (1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + ((z * w) / wd) * Math.sin(wd * u)));
  };
  // the light inside: it builds through the rattles, flares as the lid goes, then settles and fades
  const inner = () => {
    if (t < T_OPEN) {
      let k = 0.1 + 0.45 * smooth(0, T_OPEN, t) + 0.5 * smooth(T_OPEN - 0.14, T_OPEN, t);
      for (const [t0, s] of RATTLES) if (t > t0) k += 0.45 * s * Math.exp(-(t - t0) * 9);
      return k;
    }
    return (0.62 + 0.3 * Math.exp(-(t - T_OPEN) * 5)) * (1 - smooth(T_COLLECT - 0.3, T_POOF, t)) + 0.05 * Math.sin(t * 9);
  };
  const rayK = (r) => {
    const u = t - T_OPEN - r.d;
    if (u < 0) return 0;
    return ease.outCubic(clamp(u / 0.1)) * (1 - smooth(1.0, 2.1, u)) * (0.72 + 0.28 * Math.sin(t * r.f + r.ph));
  };

  return {
    update(dt) {
      t += dt;
      const g = inner();
      for (const [t0, s] of RATTLES)
        if (s > 0.5 && t - dt < t0 + 0.05 && t >= t0 + 0.05)
          for (let i = 0; i < 4; i++) {
            const sd = i % 2 ? 1 : -1;
            ps.spawn(P.DUST, sd * R.range(9, 13), -1, sd * R.range(20, 50), -R.range(2, 8), R.range(0.3, 0.5), DUST, R.range(1.2, 2.2) * s);
          }
      // anticipation: motes of light squeeze out of the seam and the keyhole
      if (t < T_OPEN && R.chance(g * 0.08)) {
        const x = R.range(-11, 11);
        ps.spawn(P.STAR, x, -10, x * 1.5, -R.range(8, 30), R.range(0.3, 0.6), R.chance(0.5) ? C[6] : C[5], R.range(0.4, 1.2));
      }
      if (!opened && t >= T_OPEN) {
        opened = true;
        lights.add(0, -18, 64, C[5], 0.45, 0.7);
        lights.add(0, -16, 22, WHITE, 0.35, 0.1);
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(120, 260);
          ps.spawn(P.SPARK, R.range(-8, 8), -13, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.26));
        }
        for (let i = 0; i < 8; i++) {
          const s = R.sign();
          ps.spawn(P.DUST, s * R.range(10, 14), -1, s * R.range(30, 80), -R.range(2, 10), R.range(0.4, 0.7), DUST, R.range(1.6, 3));
        }
      }
      // the hold: gold dust rising out of the hoard, twinkles in the light
      if (t > T_OPEN && t < T_COLLECT) {
        if (R.chance(0.22)) ps.spawn(P.EMBER, R.range(-9, 9), -13, R.range(-12, 12), -R.range(25, 60), R.range(0.8, 1.5), C[5], R.range(0.8, 1.6));
        if (R.chance(0.12)) {
          const a = R.range(-1, 1), d = R.range(10, 40);
          ps.spawn(P.STAR, Math.sin(a) * d, -12 - Math.cos(a) * d, 0, -R.range(4, 12), R.range(0.3, 0.7), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 2));
        }
      }
      // the loot flies, bounces and settles
      for (const it of loot) {
        if (it.gone || t < it.t0) continue;
        it.up = true;
        if (t >= it.pop + 0.13) {
          it.gone = true;
          const y = it.y - 6;
          if (it.gem) rings.push({ x: it.x, y, t0: t });
          lights.add(it.x, y, 18, it.gem ? it.G[4] : C[5], 0.65, 0.25);
          for (let i = 0; i < 4; i++) {
            const a = R.range(0, TAU), sp = R.range(25, 55);
            ps.spawn(P.STAR, it.x, y, Math.cos(a) * sp - it.x * 0.25, Math.sin(a) * sp - 20, R.range(0.3, 0.55), i ? (it.gem ? it.G[5] : C[6]) : WHITE, R.range(0.6, 1.5));
          }
          continue;
        }
        if (it.rest) {
          it.settle += dt;
          it.vx -= it.vx * 9 * dt;
          it.x = clamp(it.x + it.vx * dt, -74, 74);
          continue;
        }
        it.vy += 950 * dt;
        it.x += it.vx * dt;
        // keep the loot on the canvas: the far ones skid back off its edge
        if (Math.abs(it.x) > 74) (it.x = Math.sign(it.x) * 74), (it.vx *= -0.3);
        it.y += it.vy * dt;
        it.spin += it.vs * dt;
        const bottom = it.y + it.r;
        if (bottom >= -0.5 && it.vy > 0) {
          it.y = -0.5 - it.r;
          if (it.vy > 110) {
            ps.spawn(P.DUST, it.x, -1, R.range(-20, 20), -R.range(4, 12), R.range(0.25, 0.45), DUST, R.range(1, 1.8));
            if (it.vy > 220) {
              for (let i = 0; i < 2; i++) ps.spawn(P.SPARK, it.x, -1, R.range(-90, 90), -R.range(60, 140), R.range(0.1, 0.22));
              lights.add(it.x, -2, 9, C[5], 0.5, 0.12);
            }
            it.vy = -it.vy * 0.42;
            it.vx *= 0.5;
            it.vs *= 0.55;
          } else {
            it.rest = true;
            it.vy = 0;
          }
        }
      }
      for (let i = rings.length - 1; i >= 0; i--) if (t - rings[i].t0 > 0.3) rings.splice(i, 1);
      if (!poofed && t >= T_POOF) {
        // the empty chest dissolves from the lid down into rising gold dust
        poofed = true;
        lights.add(0, -12, 40, C[5], 0.5, 0.6);
        L.begin(-20, -32);
        paintChest(C, W, lidAngle(0), 0.3);
        L.outline(W[0]);
        const f = L.f;
        let top = 0;
        f.color.forEach((c, i) => c && (top = Math.min(top, Math.floor(i / f.w) + f.oy)));
        f.color.forEach((c, i) => {
          if (!c) return;
          const x = (i % f.w) + f.ox, y = Math.floor(i / f.w) + f.oy;
          bits.push({ x, y, c, td: T_POOF + ((y - top) / -top) * 0.32 + rand(x, y, 21) * 0.05, mote: c !== W[0] && rand(x, y, 23) < 0.14 });
        });
      }
      for (const b of bits)
        if (!b.done && t >= b.td) {
          b.done = true;
          if (b.mote) dust.spawn(P.EMBER, b.x + 0.5, b.y + 0.5, R.range(-28, 28), -R.range(14, 50), R.range(0.4, 0.8), C[5], R.range(0.5, 1.1));
        }
      ps.update(dt);
      dust.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      if (t < T_POOF + 0.2) blobShadow(p, 0, 15, 1 - smooth(T_POOF, T_POOF + 0.2, t));
      ps.draw(p, "back");
    },
    draw(p) {
      const g = inner(), sh = shake(), th = lidAngle(sh.lid);
      // light on the floor and round the chest
      const open = t >= T_OPEN ? 1 : 0;
      pool(p, 0, 0, 30 + 10 * g, 4, C[4], (0.1 + 0.18 * open) * g);
      p.glow(0, -16, 24 + 8 * g, C[4], (0.1 + 0.2 * open) * g);
      if (t < T_POOF) {
        L.begin(-20, -32);
        paintChest(C, W, th, Math.min(1.2, g));
        L.outline(W[0]);
        L.draw(p, sh.dx, -sh.hop);
      } else for (const b of bits) if (!b.done) p.px(b.x, b.y, b.td - t < 0.04 ? (b.c === W[0] ? C[3] : C[6]) : b.c);
      // light leaking from the seam before it opens
      if (t < T_OPEN) {
        p.glowLine(-11, -9.5 - sh.hop, 11, -9.5 - sh.hop, 5, C[5], 0.22 * g);
        // light through the crack under the lid, growing as the hoard brightens
        if (g > 0.35 && sh.lid < 0.015) p.line(-10 + sh.dx, -10 - sh.hop, 9 + sh.dx, -10 - sh.hop, (u) => (Math.abs(u - 0.5) < 0.2 ? WHITE : C[6]), (u) => (g - 0.35) * 2.2 * (1 - Math.abs(u - 0.5) * 0.9));
        p.glow(sh.dx, -7 - sh.hop, 6, C[6], 0.35 * g);
        // each bump lifts the lid off the seam and light shoots out of the crack in thin rays
        if (sh.lid > 0.015)
          for (let i = 0; i < 8; i++) {
            const x = -10.5 + i * 3 + sh.dx + (rand(i, 3) - 0.5) * 1.5, a = -Math.PI / 2 + (x / 11) * 1.25, l = (7 + rand(i, Math.floor(t * 30), 1) * 12) * Math.min(1, sh.lid / 0.05);
            const y0 = -10 - sh.hop;
            p.line(x, y0, x + Math.cos(a) * l, y0 + Math.sin(a) * l, (u) => (u < 0.25 ? WHITE : u < 0.6 ? C[6] : C[5]), (u) => 1.15 - u);
            p.glowLine(x, y0, x + Math.cos(a) * l * 0.7, y0 + Math.sin(a) * l * 0.7, 3, C[5], 0.25);
          }
      }
      // the rays: wedges of light fanning out of the open chest
      for (const r of rays) {
        const k = rayK(r);
        if (k <= 0.01) continue;
        const ox = Math.sin(r.a) * 7, oy = -12, dx = Math.sin(r.a), dy = -Math.cos(r.a), len = r.len * (0.88 + 0.12 * Math.sin(t * r.f * 0.7 + r.ph)), tw = Math.tan(r.w);
        const x1 = ox + dx * len, y1 = oy + dy * len;
        p.shade(Math.min(ox, x1) - 8, Math.min(oy, y1) - 8, Math.max(ox, x1) + 8, Math.max(oy, y1) + 8, (x, y, out) => {
          const rx = x - ox, ry = y - oy, d = rx * dx + ry * dy;
          if (d < 0 || d > len) return;
          const q = Math.abs(rx * dy - ry * dx), hw = 0.6 + d * tw, f = q < hw ? 1 - 0.35 * (q / hw) : 0.65 * (1 - (q - hw) / 1.6);
          if (f <= 0) return;
          out.l = q < hw * 0.45 ? C[6] : C[5];
          out.k = k * 0.55 * f * Math.pow(1 - d / len, 1.4) * smooth(5, 14, d);
        });
      }
      // the release: a flare out of the mouth
      if (t >= T_OPEN && t < T_OPEN + 0.2) {
        const a = (t - T_OPEN) / 0.2;
        flare(p, 0, -14, 22 * Math.pow(1 - a, 1.4), 1 - a, C);
      }
      // the loot
      for (const it of loot) {
        if (!it.up || it.gone) continue;
        const pu = t - it.pop, lift = pu > 0 ? 6 * ease.outCubic(clamp(pu / 0.1)) : 0, wh = pu > 0.095;
        let y = it.y - lift, ax = it.ax, spin = it.spin;
        let flat = false;
        if (it.rest && !it.gem) {
          // a coin falls flat with a wobble, then lies there as a lens of gold
          const w = Math.exp(-it.settle * 8) * Math.abs(Math.cos(it.settle * 22));
          ax = 0;
          spin = Math.acos(clamp(0.5 + 0.5 * w, 0, 1));
          flat = w < 0.12;
          y = flat ? -1.5 - lift : -it.r * Math.cos(spin) - lift;
        }
        if (it.y > -10) blobShadow(p, it.x, 3, 0.7 * (1 - clamp(-it.y / 30)));
        if (it.gem) gemlet(IL, p, it.x, y, it.r, it.rest ? 0.4 * Math.sign(it.vs) : it.spin, it.G, wh);
        else coin(IL, p, flat ? Math.round(it.x) + 0.5 : it.x, y, it.r, ax, flat ? Math.acos(0.5) : spin, C, wh, 1, !flat);
        p.glow(it.x, y, 9, it.gem ? it.G[4] : C[5], it.rest ? 0.26 : 0.18);
        p.glow(it.x, y, 3, WHITE, 0.12);
        // resting loot glints in turn
        if (it.rest && t < it.pop) {
          const u = (t * 0.9 + it.ph) % 1;
          if (u < 0.16) glint(p, it.x - 1, y - 1.5, 2.6 * Math.sin((u / 0.16) * Math.PI), it.gem ? it.G[5] : C[6], 0.5);
        }
      }
      for (const r of rings) {
        const k = (t - r.t0) / 0.3, e = ease.outCubic(k);
        p.ring(r.x, r.y, 2 + 5 * e, 1, k < 0.3 ? WHITE : C[6], 1.15 - k);
        p.glow(r.x, r.y, 12, C[5], 0.45 * (1 - k));
        if (k < 0.5) glint(p, r.x, r.y, 3.4 * (1 - k / 0.5), C[6], 0.55);
      }
      ps.draw(p, "front");
      dust.draw(p);
      lights.draw(p);
    },
  };
}
