// The pillar's strands of light and the rings climbing it adapt Sprite Fusion's open-source holy light
// (https://www.spritefusion.com/pixel-art-vfx/holy-light), and the streaks rushing in its power-up
// (https://www.spritefusion.com/pixel-art-vfx/power-up), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, PF, Rng, fit, band, flare, sparkle, clamp, seg, smooth, ease, noise2, fract, rand, scale, TAU, WHITE, READY } from "../../core/index.mjs";
import { spell, drawWord, tintActor, lightActor, haloActor } from "./_lib.mjs";

export const meta = {
  name: "Level up",
  desc: "Gold gathers at the feet and bursts up as a pillar of light round the hero; rings climb it, LEVEL UP! drops in letter by letter, a shine sweeps it, sparkles twinkle.",
  tags: ["ui", "level", "reward", "text", "light", "one-shot"],
  size: [176, 138],
  origin: [88, 114],
  duration: 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#2a1405", "#5c3008", "#9a5a0e", "#d48e18", "#f5b92c", "#ffde5e", "#fff4bc", "#ffffff"], text: "LEVEL UP!", seed: 5 },
};

const COIL = { turn: 0.9, crouch: 7, lean: 2, fx: -6, fy: -13, bx: 7, by: -13, ffx: -5, fbx: 6 };
const LEAP = { turn: 1.1, y: -16, crouch: -1, fx: -6, fy: -45, bx: 7, by: -44, ffx: -2, ffy: -8, fbx: 5, fby: -3, toeB: true };
const PUMP = { turn: 0.9, crouch: 0, fx: -6, fy: -45, bx: 9, by: -15, ffx: -3, fbx: 4 };
export const act = {
  onBody: true,
  follow: 0,
  poses: [
    [-0.3, READY],
    [0.28, COIL],
    [0.3, LEAP, "snap"],
    [0.46, { ...LEAP, y: -19 }],
    [0.72, { ...LEAP, y: 0, ffy: -4, fby: -4 }, "in"],
    [0.74, { ...COIL, crouch: 5 }, "snap"],
    [0.95, PUMP, "out"],
    [1.2, { ...PUMP, crouch: 1, fy: -43 }],
    [1.45, PUMP],
    [2.3, { ...PUMP, fy: -41 }],
    [2.8, READY],
    [3.2, READY],
  ],
  hits: [{ t: 0.28, stop: 0.05, shake: 0.14, amp: 2 }],
  dust: [{ t: 0.3, x: 0, n: 7 }, { t: 0.74, x: 0, n: 6 }],
};

// release, pillar lifts off, pillar gone, pillar height, text top, first letter, stagger, shine, letters pop
const REL = 0.28, RET = 1.02, GONE = 1.34, TOP = 100, TY = -68, DROP = 0.5, STAG = 0.05, LANDED = 1.06, SHINE = 1.24, EXIT = 2.3;
// strands of light streaming up the pillar in dashes: where across it, how fast, dash period and length
const STRANDS = Array.from({ length: 9 }, (_, i) => ({ x: (i / 8 - 0.5) * 1.5 + (rand(i, 1) - 0.5) * 0.16, sp: 170 + rand(i, 2) * 170, per: 10 + rand(i, 3) * 16, duty: 0.3 + rand(i, 4) * 0.35, ph: rand(i, 5), lvl: rand(i, 6) < 0.35 ? 1 : 2, end: 0.5 + rand(i, 7) * 0.42 }));

// half-width of the pillar at time t
const widthAt = (t) => (t < REL ? 0 : 12 * (1 + 0.4 * Math.exp(-(t - REL) * 10)) * (1 - 0.82 * smooth(RET - 0.12, RET + 0.16, t)));

// the pillar: shoots up from the feet (one white-hot frame), then stands as light, not paint: two flowing
// walls, a white core and strands streaming up in dashes; at the end its foot lifts off and it shoots away
function column(p, C, t) {
  const a = t - REL;
  if (a < 0 || t > GONE) return;
  const top = -TOP * ease.outExpo(clamp(a / 0.12)), bot = -TOP * ease.inCubic(seg(t, RET, GONE)), W = widthAt(t), k = 1 - smooth(RET, GONE, t);
  p.glowLine(0, top, 0, Math.min(bot, -34), W * 1.6 + 6, C[5], 0.2 * k + 0.06);
  p.glowLine(0, top, 0, Math.min(bot, -40), 5, WHITE, 0.18 * k);
  if (a < 0.04) {
    for (let y = Math.floor(top); y < bot; y++) {
      const wr = W * 0.55 * (1 - 0.3 * (-y / TOP));
      for (let x = Math.floor(-wr); x <= Math.ceil(wr); x++) p.dot(x, y, Math.abs(x + 0.5) < wr - 1.5 ? WHITE : C[6], clamp((y + TOP) / 20) * 1.5);
    }
    return;
  }
  for (let y = Math.ceil(top); y < Math.ceil(bot); y++) {
    const h = -y / TOP, fade = clamp((y + TOP) / 16) * (t < RET ? 1 : clamp((bot - y) / 10)), head = y - top < 3 && a < 0.16;
    const wr = W * (1 - 0.3 * h) + 0.9 * noise2(y * 0.2, t * 12, 3);
    for (const s of [-1, 1]) {
      const run = fract(y * 0.06 + t * 3.4 + (s > 0 ? 0.5 : 0)) < 0.78, xw = s * wr;
      p.dot(xw, y, head ? WHITE : run ? C[6] : C[5], fade * 1.4);
      p.dot(xw + s, y, C[4], fade * (run ? 0.5 : 0.25));
      if (run) p.dot(xw - s, y, C[5], fade * 1.2);
    }
    p.dot(0, y, WHITE, fade * 1.6);
    p.dot(-1, y, noise2(y * 0.3, t * 14, 5) > -0.2 ? WHITE : C[6], fade * 1.3);
    if (noise2(y * 0.25, t * 9, 8) > 0.25) p.dot(1, y, C[6], fade * 1.2);
    for (const S of STRANDS) {
      if (h > S.end) continue;
      const ph = fract((y + t * S.sp) / S.per + S.ph);
      if (ph > S.duty) continue;
      const u = ph / S.duty;
      p.px(S.x * wr, y, head || u < 0.2 ? WHITE : u < 0.65 ? C[7 - S.lvl] : C[6 - S.lvl]);
    }
  }
}

// the plate of light the pillar stands on
function plate(p, C, t, k) {
  if (k <= 0.02) return;
  const rx = 9 + 9 * k + Math.sin(t * 9), ry = 2.2;
  p.shade(-rx, -ry, rx, ry, (x, y, o) => {
    const dx = x / rx, dy = y / ry, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1) return;
    const u = d / Math.max(0.05, k);
    o.c = u < 0.3 ? WHITE : u < 0.55 ? C[6] : u < 0.8 ? C[5] : C[4];
    o.a = d < 0.6 * k ? 1 : k * (1 - d) * 2.2;
  });
  p.glow(0, -1, rx * 2.2, C[4], 0.35 * k);
}

// a burst of rays above and below the title: they start on an ellipse just outside the word, so none crosses
// it, shoot out when the last letter lands, shimmer, and draw back in
function rays(p, C, t, k, cx, cy) {
  if (k <= 0.02) return;
  for (let i = 0; i < 20; i++) {
    const an = (i / 20) * TAU + 0.08, ca = Math.cos(an), sa = Math.sin(an), long = i % 2 === 0;
    if (Math.abs(sa) < 0.4) continue;
    const r0 = 1 / Math.sqrt((ca / 52) ** 2 + (sa / 12) ** 2) + 2 * k, len = (long ? 15 + 7 * rand(i, 9) : 7 + 4 * rand(i, 8)) * k;
    if (len < 1) continue;
    const sh = 0.75 + 0.25 * Math.sin(t * 7 + i * 2.1), x0 = cx + ca * r0, y0 = cy + sa * r0;
    p.line(x0, y0, x0 + ca * len, y0 + sa * len, (u) => (u < 0.3 ? C[7] : u < 0.6 ? C[6] : C[5]), (u) => sh * (u < 0.55 ? 1.3 : (1.3 * (1 - u)) / 0.45));
  }
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), A = o.actor, SHADOW = scale(C[0], 0.5);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[7], C[6], C[5], C[3]] }), lights = new Lights();
  // every particle is gone by the end
  const spawn = (k, x, y, vx, vy, life, ...rest) => ps.spawn(k, x, y, vx, vy, Math.min(life, meta.duration - 0.05 - t), ...rest);
  const word = spell(o.text), BASE = TY + 14, X0 = -word.w;
  const lets = word.letters.filter((L) => L.g).map((L, i) => ({ g: L.g, w: L.w, cx: X0 + (L.x + L.w / 2) * 2, born: DROP + i * STAG, pop: EXIT + i * 0.04, off: -18, v: 60, sq: 0, flash: 0, on: false, landed: false, rest: false, burst: false }));
  const right = X0 + word.w * 2;
  // sparkles that pop round the title one after another
  const sats = Array.from({ length: 8 }, (_, i) => {
    const s = i % 2 ? 1 : -1, x = s * R.range(20, 60), y = TY + 7 + (Math.abs(x) < 50 ? R.sign() * R.range(11, 18) : R.range(-14, 14));
    return { x, y, t0: SHINE - 0.1 + i * 0.13 + R.range(0, 0.05), dur: R.range(0.32, 0.5), L: R.range(3, 6) };
  });
  const halos = [];
  let t = 0, released = false, nextHalo = REL + 0.03, gather = 0;
  const rush = [];
  // a gathering streak: a gold tail and a white head, running straight in
  const drawRush = (p, back) => {
    for (const m of rush) {
      if (m.back !== back) continue;
      const sp = Math.hypot(m.vx, m.vy), ux = m.vx / sp, uy = m.vy / sp, L = m.len;
      p.line(m.x - ux * L, m.y - uy * L, m.x - ux * L * 0.4, m.y - uy * L * 0.4, m.c);
      p.line(m.x - ux * L * 0.35, m.y - uy * L * 0.35, m.x, m.y, WHITE);
      p.glow(m.x, m.y, 4, C[5], 0.25);
    }
  };

  return {
    update(dt) {
      t += dt;
      // the gathering: streaks pour in along the floor to the feet and in from all round to the body, and in the
      // last beat run up the hero from the feet; the late ones are swallowed by the burst
      for (gather += t < REL ? dt * 420 : 0; gather >= 1; gather--) {
        const kind = R.next(), sp = R.range(140, 250) * (1 + t * 2);
        let x, y, tx, ty;
        if (kind < 0.42) {
          const an = R.range(0, TAU), D = R.range(22, 70);
          (x = Math.cos(an) * D), (y = -1 - Math.abs(Math.sin(an)) * D * 0.1), (tx = Math.cos(an) * 3), (ty = -1);
        } else if (kind < 0.84) {
          const an = R.range(0, TAU), D = R.range(34, 64);
          (x = Math.cos(an) * D), (y = Math.min(-3, -20 + Math.sin(an) * D * 0.85)), (tx = Math.cos(an) * 11), (ty = -20 + Math.sin(an) * 14);
        } else {
          if (t < REL * 0.4) continue;
          (x = R.range(-9, 9)), (y = -1), (tx = x * 0.7), (ty = -R.range(26, 44));
        }
        const dx = tx - x, dy = ty - y, l = Math.hypot(dx, dy) || 1;
        rush.push({ x, y, vx: (dx / l) * sp, vy: (dy / l) * sp, life: Math.min(l / sp, REL + 0.06 - t), len: R.range(5, 9), c: R.chance(0.45) ? C[6] : C[5], back: kind > 0.84 && R.chance(0.5) });
      }
      for (let i = rush.length - 1; i >= 0; i--) {
        const m = rush[i];
        if ((m.life -= dt) <= 0) rush.splice(i, 1);
        else (m.x += m.vx * dt), (m.y += m.vy * dt);
      }
      if (t < REL && R.chance(0.12)) spawn(P.STAR, R.range(-30, 30), -R.range(0, 3), 0, -R.range(10, 30), R.range(0.3, 0.5), C[6], 0.6);
      if (!released && t >= REL) {
        released = true;
        lights.add(0, -24, 90, C[5], 0.6, 0.7);
        lights.add(0, -8, 40, WHITE, 0.6, 0.12);
        // speed lines flung out from the hero
        for (let i = 0; i < 22; i++) {
          const an = (i / 22) * TAU + R.range(-0.12, 0.12), sp = R.range(260, 460);
          const y0 = -18 + Math.sin(an) * 8, vy = Math.sin(an) * sp * 0.8, life = Math.min(R.range(0.1, 0.2), vy > 0 ? -y0 / vy : vy < 0 ? (y0 + 104) / -vy : 1, 78 / Math.abs(Math.cos(an) * sp));
          spawn(P.MOTE, Math.cos(an) * 6, y0, Math.cos(an) * sp, vy, life, R.chance(0.4) ? C[7] : C[6], 1, 0, an > 0.3 && an < Math.PI - 0.3 ? PF.BACK : 0);
        }
        for (let i = 0; i < 26; i++) {
          const an = -Math.PI / 2 + R.range(-1.3, 1.3), sp = R.range(120, 290);
          spawn(P.SPARK, R.range(-5, 5), -2, Math.cos(an) * sp, Math.sin(an) * sp, R.range(0.35, 0.8));
        }
        for (let i = 0; i < 16; i++)
          spawn(P.STAR, R.range(-10, 10), R.range(-36, -4), R.range(-30, 30), -R.range(15, 60), R.range(0.6, 1.3), R.pick([C[7], C[6], C[5]]), R.chance(0.35) ? R.range(1.5, 2.6) : R.range(0.4, 0.9), 0, R.chance(0.4) ? PF.BACK : 0);
      }
      const W = widthAt(t);
      if (t >= nextHalo && t < RET - 0.1) halos.push(t), (nextHalo += 0.16);
      // streaks race up beside the pillar
      if (t > REL && t < RET + 0.1 && R.chance(0.5)) {
        const s = R.sign();
        const y = R.range(-4, -60), vy = -R.range(140, 260);
        spawn(P.MOTE, s * R.range(0.75, 1.6) * W, y, 0, vy, Math.min(R.range(0.16, 0.32), (y + 96) / -vy), R.chance(0.5) ? C[7] : C[6], R.range(0.6, 1), 0, R.chance(0.5) ? PF.BACK : 0);
      }
      // motes rise from the floor while the light lasts
      if (t > REL && t < 2.4 && R.chance(0.14 * (1 - seg(t, 1.6, 2.4)))) {
        spawn(P.EMBER, R.range(-20, 20), -R.range(1, 30), R.range(-15, 15), -R.range(20, 55), R.range(0.8, 1.6), C[5], R.range(1, 2), 0, R.chance(0.4) ? PF.BACK : 0);
      }
      // gold motes lift off the hero while the light lasts
      if (A && t > REL + 0.1 && t < 2.2 && R.chance(0.09)) {
        const m = A.mask;
        for (let n = 0; n < 12; n++) {
          const i = R.int(0, m.w - 1), j = R.int(0, m.h - 1);
          if (!m.data[j * m.w + i]) continue;
          spawn(P.STAR, A.x + i + 0.5, A.y + j + 0.5, R.range(-8, 8), -R.range(14, 34), R.range(0.6, 1.1), R.pick([C[7], C[6], C[5]]), R.chance(0.2) ? 1.5 : 0.6, 0, R.chance(0.5) ? PF.BACK : 0);
          break;
        }
      }
      // twinkles round the title and the hero while it holds
      if (t > 1.0 && t < 2.5 && R.chance(0.13)) {
        const up = R.chance(0.6), x = up ? R.range(-58, 58) : R.range(-20, 20), y = up ? TY + 7 + R.range(-16, 16) : R.range(-44, -6);
        spawn(P.STAR, x, y, R.range(-6, 6), -R.range(4, 14), R.range(0.4, 0.8), R.pick([C[7], C[6], C[6], C[5]]), R.chance(0.3) ? R.range(1.5, 2.4) : 0.6, 0, R.chance(0.3) ? PF.BACK : 0);
      }
      // the letters drop in, bounce and settle; then pop away one by one
      for (const L of lets) {
        if (t < L.born) continue;
        L.on = true;
        if (!L.rest) {
          L.v += 1700 * dt;
          L.off += L.v * dt;
          if (L.off >= 0 && L.v > 0) {
            L.off = 0;
            if (L.v > 110) {
              L.sq = 1;
              if (!L.landed) {
                L.landed = true;
                L.flash = 1;
                lights.add(L.cx, BASE - 7, 18, C[5], 0.55, 0.25);
                for (const s of [-1, 1]) spawn(P.STAR, L.cx + s * L.w, BASE - R.range(0, 3), s * R.range(15, 40), -R.range(5, 25), R.range(0.25, 0.45), C[6], R.range(0.5, 1.2));
              }
              L.v = -L.v * 0.3;
            } else (L.v = 0), (L.rest = true);
          }
        }
        L.sq = Math.max(0, L.sq - dt / 0.1);
        L.flash = Math.max(0, L.flash - dt / 0.12);
        if (!L.burst && t >= L.pop + 0.06) {
          L.burst = true;
          for (let i = 0; i < 3; i++) {
            const an = R.range(0, TAU), sp = R.range(20, 55);
            spawn(P.STAR, L.cx + R.range(-3, 3), BASE - 7 + R.range(-4, 4), Math.cos(an) * sp, Math.sin(an) * sp - 15, R.range(0.3, 0.6), R.pick([C[7], C[6]]), i ? 0.6 : R.range(1.2, 2));
          }
        }
      }
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      rays(p, C, t, ease.outExpo(seg(t, LANDED, LANDED + 0.2)) * (1 - ease.inQuad(seg(t, EXIT - 0.15, EXIT + 0.1))), 0, TY + 7);
      if (t < REL) {
        const k = seg(t, 0.02, REL);
        band(p, 0, 0, 4 + 52 * (1 - ease.inQuad(k)), 0.2, 1.5, k * 1.1, C, (g) => Math.sin(g) < 0);
      }
      for (const [d, r1, th] of [[0, 72, 4], [0.08, 46, 2.5]]) {
        const k = (t - REL - d) / 0.55;
        if (k > 0 && k < 1) band(p, 0, 0, 5 + r1 * ease.outCubic(k), 0.2, Math.max(1, th * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) < 0, k < 0.15);
      }
      for (const h0 of halos) {
        const k = (t - h0) / 0.6;
        if (k > 0 && k < 1) band(p, 0, -2 - 72 * ease.outQuad(k), (widthAt(t) * 1.45 + 4) * (1 - 0.4 * k), 0.3, 1.5, (1 - k) * 1.4, C, (g) => Math.sin(g) < 0, k < 0.12);
      }
      column(p, C, t);
      plate(p, C, t, t < REL ? 0.55 * seg(t, 0.05, REL) : 1 - smooth(RET - 0.1, GONE + 0.2, t));
      ps.draw(p, "back");
      drawRush(p, true);
    },

    draw(p) {
      // near halves of the rings, in front of the hero
      if (t < REL) {
        const k = seg(t, 0.02, REL);
        band(p, 0, 0, 4 + 52 * (1 - ease.inQuad(k)), 0.2, 1.5, k * 1.1, C, (g) => Math.sin(g) >= 0);
      }
      for (const [d, r1, th] of [[0, 72, 4], [0.08, 46, 2.5]]) {
        const k = (t - REL - d) / 0.55;
        if (k > 0 && k < 1) band(p, 0, 0, 5 + r1 * ease.outCubic(k), 0.2, Math.max(1, th * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) >= 0, k < 0.15);
      }
      for (const h0 of halos) {
        const k = (t - h0) / 0.6;
        if (k > 0 && k < 1) band(p, 0, -2 - 72 * ease.outQuad(k), (widthAt(t) * 1.45 + 4) * (1 - 0.4 * k), 0.3, 1.5, (1 - k) * 1.4, C, (g) => Math.sin(g) >= 0, k < 0.12);
      }
      // the hero: warming as it gathers, flashed white on the release, then lit gold with a glowing edge
      const lit = smooth(REL - 0.02, REL + 0.04, t) * (1 - smooth(RET, 2.5, t));
      tintActor(p, A, t < REL ? 0 : t < REL + 0.06 ? 1 : Math.exp(-(t - REL - 0.06) / 0.07), [C[4], C[5], C[6]]);
      lightActor(p, A, C[5], 0.1 * seg(t, 0.05, REL) * (1 - lit) + 0.06 * lit, 0.6 * lit, t);
      haloActor(p, A, C[5], 0.85 * lit * (1 - smooth(RET, GONE + 0.3, t)) + 0.3 * lit, t);
      // the spark gathering at the feet, then the flare of the release
      if (t < REL) {
        const k = seg(t, 0.05, REL), beat = 1 + 0.4 * Math.exp(-((t - REL * 0.6) ** 2) / 0.001);
        sparkle(p, 0, -2, (1 + 4 * k * k) * beat, C[6], C[5], 0.3 + 0.4 * k);
      } else if (t < REL + 0.22) {
        const a = (t - REL) / 0.22;
        flare(p, 0, -4, 28 * Math.pow(1 - a, 1.5), 1 - a, C);
        p.glow(0, -16, 48, WHITE, 0.3 * (1 - a));
      }
      ps.draw(p, "front");
      drawRush(p, false);
      // the title
      const items = [], done = (t - LANDED) / 0.12;
      for (const L of lets) {
        if (!L.on) continue;
        let sx = 2, sy = 2, flash = L.flash;
        if (!L.landed && L.v > 150) (sx = 1.8), (sy = 2.3);
        if (L.sq > 0) (sx = 2 * (1 + 0.22 * L.sq)), (sy = 2 * (1 - 0.22 * L.sq));
        const pu = (t - L.pop) / 0.07, hop = seg(t, L.pop - 0.1, L.pop);
        if (pu >= 1) continue;
        if (hop > 0 && pu <= 0) (sx = 2 * (1 - 0.1 * hop)), (sy = 2 * (1 + 0.15 * hop));
        if (pu > 0) (sx = sy = 2 * (1 + 0.3 * pu)), (flash = 1);
        flash = Math.max(flash, done > 0 && done < 1 ? 1 - done : 0);
        const h = 7 * sy, w = L.w * sx;
        items.push({ g: L.g, x: L.cx - w / 2, y: BASE + L.off - h - 3 * ease.outQuad(hop), sx, sy, a: clamp((t - L.born) / 0.05), flash });
      }
      const sh = seg(t, SHINE, SHINE + 0.34), shine = sh > 0 && sh < 1 ? X0 - 14 + (right - X0 + 30) * ease.inOutSine(sh) : null;
      drawWord(p, items, { fill: [C[3], C[4], C[5], C[6]], edge: WHITE, under: C[2], outline: C[0], shadow: SHADOW, shine, shineY: TY, glint: C[6] });
      if (shine !== null && shine > X0 && shine < right) p.glowLine(shine, TY, shine + 8.4, BASE, 9, C[6], 0.3);
      const hold = smooth(0.9, 1.2, t) * (1 - smooth(EXIT, EXIT + 0.4, t));
      if (hold > 0) p.glow(0, TY + 7, 50, C[5], 0.22 * hold + (done > 0 && done < 1 ? 0.3 * (1 - done) : 0));
      // each letter twinkles out where it popped
      for (const L of lets) {
        const u = (t - L.pop - 0.07) / 0.16;
        if (u > 0 && u < 1) sparkle(p, L.cx, BASE - 7, 6 * (1 - u) * (1 - u), C[6], C[5], 0.5);
      }
      // the glint where the shine leaves the word, and sparkles popping round it
      const g = (t - SHINE - 0.3) / 0.26;
      if (g > 0 && g < 1) sparkle(p, right - 2, TY + 1, 7 * Math.sin(g * Math.PI), C[6], C[5], 0.6);
      for (const s of sats) {
        const u = (t - s.t0) / s.dur;
        if (u > 0 && u < 1) sparkle(p, s.x, s.y, s.L * Math.pow(Math.sin(u * Math.PI), 0.7), C[6], C[5], 0.5);
      }
      lights.draw(p);
    },
  };
}
