// The lip's crescent (a thick arc, white on its outer rim, cooling to deep blue underneath, with light along it)
// follows Sprite Fusion's open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, noise, noise2, TAU, WHITE } from "../../core/index.mjs";
import { WATER, Drops, Ripples, Mist, billow } from "./_lib.mjs";

export const meta = {
  name: "Wave crash",
  desc: "A swell rolls in and steepens, its lip throws forward and curls over a dark barrel, then crashes into a burst of white foam and spray that surges on and fades to lace.",
  tags: ["water", "wave", "crash", "surf", "foam", "spray", "one-shot"],
  size: [224, 104],
  origin: [112, 86],
  duration: 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, seed: 6 },
};

const SY = 0.22, G = 820, CRASH = 1.2, LIP0 = 0.62, EDGE = 110;

// the swell: where its crest is, how tall, how steep its face, as it rolls in, crashes and runs on as whitewater
const crestX = (t) => (t < CRASH ? -80 + 72 * ease.inOutSine(t / CRASH) : -8 + 30 * ease.outCubic(clamp((t - CRASH) / 1.4)));
const crestH = (t) => (t < CRASH ? 5 + 33 * ease.inOutSine(clamp(t / (CRASH * 0.92))) : 38 * (1 - ease.outCubic(clamp((t - CRASH) / 0.45))) + 5 * (1 - smooth(CRASH, CRASH + 1.6, t)));
const faceW = (t) => (t < CRASH ? 24 - 16 * smooth(0.3, CRASH, t) : 8 + 14 * smooth(CRASH, CRASH + 0.6, t));
// the lip: thrown forward off the crest and falling, until its tip hits the water at CRASH
const lipK = (t) => clamp((t - LIP0) / (CRASH - LIP0));

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), S = o.seed;
  const ps = new Particles({ rng: R }), mist = new Mist(), lights = new Lights(), rings = new Ripples({ sy: SY }), puffs = [], plinks = [];
  const drops = new Drops({
    sy: SY,
    g: G,
    onLand: (d) => {
      rings.add(d.x, d.z, 0.6, 2 + d.s * 1.8, 0.3 + d.s * 0.1, { n: 1, k: 0.9, hot: 0.05 });
      plinks.push({ x: d.x, y: d.z * SY, age: 0 });
    },
  });
  let t = 0, crashed = false;
  const height = (x, tt) => {
    const xc = crestX(tt), A = crestH(tt), dx = x - xc;
    return A * Math.exp(-((dx / (dx < 0 ? 30 : faceW(tt))) ** 2));
  };
  // a point on the lip at s (0 at the crest, 1 at its tip), and its thickness there
  const lip = (s, tt) => {
    const k = lipK(tt), xc = crestX(tt), A = crestH(tt);
    return [xc + 1 + s * 30 * Math.pow(k, 0.8), -A - 4 * s * (1 - s) * (1 + 4 * k) + s * s * A * ease.inQuad(k) * 0.98, (11 - 8.5 * s) * (0.5 + 0.5 * k)];
  };
  const puff = (x, y, vx, vy, r0, r1, life, delay = 0) => puffs.push({ x, y, vx, vy, r0, r1, life, max: life, delay });

  // the swell's body, column by column: deep blue down its back and base with wind lines, a lit rim along its
  // surface, white water at the crest, a lit window high on its face where the light comes through, and streaks of
  // foam drawn up the face
  function body(p, fade) {
    const xc = crestX(t), A = crestH(t);
    for (let X = -EDGE; X < EDGE; X++) {
      const x = X + 0.5, h = height(x, t), edge = 1 - smooth(EDGE - 24, EDGE, Math.abs(x));
      if (h < 0.6 || edge <= 0) continue;
      const face = x > xc, near = Math.exp(-(((x - xc) / 9) ** 2)), a = fade * edge * 1.4;
      for (let Y = Math.floor(-h); Y < 0; Y++) {
        const y = Y + 0.5, u = (y + h) / h, depth = y + h;
        let c;
        if (depth < 1) c = near > 0.5 && A > 14 && noise(x * 0.6 + t * 9, S) > -0.35 ? WHITE : face ? C[5] : C[6];
        else if (depth < 2.4 && near > 0.35 && A > 14) c = noise2(x * 0.5, y * 0.5 + t * 6, S + 1) > -0.1 ? WHITE : C[6];
        else {
          // face and back shade differently; blend the two across the crest so there's no seam
          const win = near * (1 - u) * 1.6, up = noise2((x * 0.9 - y * 0.35) * 0.8, y * 0.12 + t * 5, S + 2), wind = noise2(x * 0.18 - t * 2, y * 0.9, S + 3);
          const fi = up > 0.55 && u < 0.85 ? 6 : win > 0.8 ? 5 : win > 0.45 || up > 0.3 ? 4 : win > 0.2 || up > 0.05 ? 3 : u < 0.6 ? 2 : 1;
          const bi = u < 0.14 ? 4 : wind > 0.55 ? 4 : wind > 0.25 || u < 0.32 ? 3 : u < 0.7 ? 2 : 1;
          c = C[Math.round(bi + (fi - bi) * smooth(xc - 5, xc + 5, x))];
        }
        p.dot(X, Y, c, a);
      }
    }
  }

  // the lip: a thick arc thrown off the crest, white along its outer edge, tinted through, dark underneath
  function curl(p) {
    const k = lipK(t);
    if (k <= 0 || t >= CRASH) return;
    const cells = new Map();
    for (let s = 0; s <= 1; s += 0.012) {
      const [x, y, w] = lip(s, t), [x2, y2] = lip(Math.min(1, s + 0.012), t), tx = x2 - x, ty = y2 - y, l = Math.hypot(tx, ty) || 1, nx = ty / l, ny = -tx / l;
      for (let q = 0; q <= 1; q += 0.5 / Math.max(1, w)) {
        const px = x + nx * (q - 0.5) * w, py = y + ny * (q - 0.5) * w, key = Math.floor(py) * 1024 + Math.floor(px);
        // q 0 is the outer (upper) rim, 1 the underside
        const c = q < 0.18 ? WHITE : q < 0.36 ? (s > 0.8 ? WHITE : C[6]) : q < 0.56 ? C[5] : q < 0.76 ? C[4] : C[3];
        const cur = cells.get(key);
        if (!cur || q < cur.q) cells.set(key, { x: px, y: py, c, q });
      }
    }
    for (const c of cells.values()) p.px(c.x, c.y, c.c);
    for (let s = 0; s <= 1; s += 0.125) {
      const [x, y, w] = lip(s, t);
      p.glow(x, y, 6 + w, C[5], 0.24 * k);
    }
    // the tip glints as it throws
    const [tx, ty] = lip(1, t), g = Math.sin(Math.PI * clamp((k - 0.55) / 0.45));
    if (g > 0.05) sparkle(p, tx, ty, 6 * g, C[6], C[5], 0.5 * g);
    // light caught under the barrel
    const [bx, by] = lip(0.6, t);
    p.glow(bx - 3, by + 8, 16, C[4], 0.25 * k);
  }

  // the sea it rolls on: a lit line along the surface, dark water under it, glints sliding along
  function sea(p, fade) {
    for (let X = -EDGE; X < EDGE; X++) {
      const x = X + 0.5, edge = 1 - smooth(EDGE - 30, EDGE, Math.abs(x)), a = fade * edge;
      if (a <= 0.02) continue;
      const g = noise(x * 0.3 - t * 3, S + 4);
      p.dot(X, 0, g > 0.55 ? C[6] : C[4], a * 1.2);
      p.blend(x, 1.5, C[2], 0.6 * a);
      p.blend(x, 2.5, C[1], 0.45 * a);
    }
  }

  return {
    update(dt) {
      t += dt;
      const k = lipK(t);
      // wind tears spray off the crest; the lip's tip sheds drops as it throws
      if (t < CRASH && crestH(t) > 14 && R.chance(0.5)) {
        const xc = crestX(t), A = crestH(t);
        ps.spawn(P.FLAKE, xc + R.range(-4, 3), -A - R.range(0, 2), -R.range(20, 60), -R.range(10, 40), R.range(0.5, 0.9), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.3));
      }
      if (k > 0.3 && t < CRASH && R.chance(0.35)) {
        const [x, y] = lip(1, t);
        drops.add({ x, z: R.range(-3, 3), h: -y, vx: R.range(30, 90), vz: R.range(-10, 10), vh: R.range(-20, 40), s: R.chance(0.3) ? 2 : 1 });
      }
      if (!crashed && t >= CRASH) {
        crashed = true;
        const [X0] = lip(1, CRASH - 1e-3);
        lights.add(X0, -20, 56, C[5], 0.8, 0.55);
        lights.add(X0, -4, 22, WHITE, 0.6, 0.1);
        for (let i = 0; i < 46; i++) {
          const a = R.range(-0.9, 0.6) * Math.PI, v = R.range(30, 120);
          drops.add({ x: X0 + R.range(-6, 6), z: R.range(-4, 4), h: R.range(2, 8), vx: Math.cos(a) * v * 0.85 + 18, vz: Math.sin(a) * v * 0.5, vh: R.range(120, 320), s: R.chance(0.15) ? 3 : R.chance(0.35) ? 2 : 1, delay: R.range(0, 0.1) });
        }
        // the spit: a plume shot straight up where the lip lands
        for (let i = 0; i < 14; i++) drops.add({ x: X0 + R.range(-3, 3), z: R.range(-2, 2), h: R.range(2, 6), vx: R.range(-15, 25), vz: R.range(-8, 8), vh: R.range(220, 300), s: R.chance(0.3) ? 2 : 1, delay: R.range(0.04, 0.16) });
        for (let i = 0; i < 34; i++) puff(X0 + R.range(-12, 10), -R.range(2, 12), R.range(-40, 130), -R.range(30, 150), R.range(1, 2), R.range(1.8, 4.2), R.range(0.4, 0.95), R.range(0, 0.14));
        // fine spray hangs in the air over the burst
        for (let i = 0; i < 34; i++) {
          const a = R.range(-Math.PI * 0.95, -Math.PI * 0.05), v = R.range(40, 160);
          ps.spawn(P.FLAKE, X0 + R.range(-8, 8), -R.range(4, 14), Math.cos(a) * v + 25, Math.sin(a) * v, R.range(0.6, 1.3), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.4), R.range(0, 0.1));
        }
        for (let i = 0; i < 12; i++) mist.add(X0 + R.range(-10, 14), -R.range(3, 16), R.range(-20, 70), -R.range(6, 24), 3, R.range(9, 15), R.range(1.1, 1.7), R.chance(0.5) ? C[6] : WHITE, 0.26, R.range(0, 0.2));
        for (let i = 0; i < 10; i++) ps.spawn(P.STAR, X0 + R.range(-20, 24), -R.range(6, 40), 0, -5, R.range(0.3, 0.6), C[6], R.range(1, 2.4), R.range(0.05, 0.4));
        rings.add(X0, 0, 6, 40, 1.2, { n: 2, gap: 3, k: 1.1, hot: 0.12 });
      }
      // the whitewater surges on, boiling up foam at its front, then calms
      if (crashed && t < CRASH + 1.1 && R.chance(0.45 * (1 - (t - CRASH) / 1.1))) {
        const x = crestX(t) + R.range(-6, 14);
        puff(x, -R.range(1, 4), R.range(10, 40), -R.range(10, 40), R.range(0.9, 1.8), R.range(1.8, 3.6), R.range(0.4, 0.8));
      }
      if (crashed && t < CRASH + 0.8 && R.chance(0.12)) mist.add(crestX(t) + R.range(-8, 8), -R.range(2, 6), R.range(10, 40), -R.range(3, 10), 3, R.range(7, 11), R.range(0.8, 1.1), C[6], 0.2);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const f = puffs[i];
        if (f.delay > 0) {
          f.delay -= dt;
          continue;
        }
        if ((f.life -= dt) <= 0) {
          puffs.splice(i, 1);
          continue;
        }
        f.vx -= f.vx * 2.5 * dt;
        f.vy += (160 - f.vy * 2.5) * dt;
        f.x += f.vx * dt;
        f.y = Math.min(f.y + f.vy * dt, -1);
      }
      for (let i = plinks.length - 1; i >= 0; i--) if ((plinks[i].age += dt) > 0.12) plinks.splice(i, 1);
      drops.update(dt);
      rings.update(dt);
      mist.update(dt);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const fade = smooth(0, 0.25, t) * (1 - smooth(meta.duration - 0.7, meta.duration - 0.1, t));
      sea(p, fade);
      rings.draw(p, C, -1);
      drops.draw(p, C, "back");
    },
    draw(p) {
      const fade = smooth(0, 0.25, t) * (1 - smooth(meta.duration - 0.7, meta.duration - 0.1, t));
      body(p, fade);
      curl(p);
      rings.draw(p, C, 1);
      // lace left on the water behind the surge, thinning out
      if (crashed) {
        const k = 1 - smooth(CRASH + 0.4, meta.duration - 0.15, t), x0 = -20, x1 = crestX(t) + 10;
        for (let X = Math.floor(x0); X < x1; X++) {
          const x = X + 0.5, n = 1 - Math.abs(noise2(x * 0.35, t * 0.8, S + 7)) * 4;
          if (n > 1.15 - k * 1.1) p.px(X, 0, n > 1.4 - k ? WHITE : C[6]);
          if (n > 1.4 - k * 0.9) p.px(X, 1, C[5]);
        }
      }
      for (const f of puffs) {
        if (f.delay > 0) continue;
        const g = 1 - f.life / f.max, r = (f.r0 + (f.r1 - f.r0) * ease.outCubic(g)) * (1 - smooth(0.7, 1, g));
        if (r > 0.6) billow(p, f.x, f.y, r, C);
      }
      for (const q of plinks) {
        if (q.age < 0.06) p.px(q.x, q.y, WHITE);
        p.glow(q.x, q.y, 4, C[5], 0.25 * (1 - q.age / 0.12));
      }
      drops.draw(p, C, "front");
      // the crash: a white burst where the lip lands
      const f = (t - CRASH) / 0.08;
      if (f >= 0 && f < 1) {
        const [X0] = lip(1, CRASH - 1e-3);
        p.circle(X0, -3, 8 * (1 - f * 0.4), WHITE);
        p.ellipse(X0, 0, 14, 2.6, (d) => (d < 0.6 ? WHITE : C[6]));
      }
      ps.draw(p);
      mist.draw(p, C[5]);
      lights.draw(p);
      // light: the crest catches it while it stands, the whitewater after
      if (t < CRASH) {
        p.glow(crestX(t) + 4, -crestH(t) + 2, 26, C[4], 0.22 * smooth(0.2, CRASH, t));
        p.glowLine(crestX(t) - 26, -crestH(t) * 0.45, crestX(t), -crestH(t), 10, C[5], 0.14 * smooth(0.2, CRASH, t));
      }
      else p.glow(crestX(t), -10, 34, C[4], 0.26 * (1 - smooth(CRASH, meta.duration - 0.3, t)));
    },
  };
}
