import { chain, READY } from "../../core/index.mjs";
import * as slam from "../impacts/ground-slam.mjs";

const LAND = 0.62, TX = 80;

export const meta = {
  name: "Ground pound",
  desc: "He coils, leaps out of frame height, hangs, and comes down like a rock: the floor cracks, shock waves race out and throw the target about as they pass.",
  tags: ["move", "impact", "jump", "landing", "shockwave", "one-shot"],
  size: [304, 204],
  origin: [152, 168],
  duration: LAND + 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const COIL = { ...READY, crouch: 8, lean: 4, fx: -6, fy: -14, bx: 3, by: -14, ffx: 8, fbx: -8 };
const AIR = { turn: 0.8, crouch: -1, fx: -9, fy: -44, bx: 10, by: -44, ffx: 6, ffy: -8, fbx: -3, fby: -3, toeB: true };
const TOP = { ...AIR, y: -62, fx: -10, fy: -20, bx: 11, by: -20, ffx: 7, ffy: -10, fbx: -4, fby: -10 };
const DOWN = { turn: 0.8, y: -8, crouch: 0, fx: -5, fy: -40, bx: 6, by: -40, ffx: 3, ffy: -3, fbx: -3, fby: -3, ghost: 1 };
const HERO_ = { y: 0, crouch: 8, lean: 5, fx: 13, fy: -8, bx: -6, by: -23, ffx: 11, fbx: -10 };
export const act = {
  target: { x: TX },
  poses: [
    [-0.5, READY],
    [-0.16, COIL],
    [0, { ...COIL, crouch: 7 }],
    [0.03, { ...AIR, y: -10, ghost: 1 }, "snap"],
    [0.26, { ...TOP, y: -60 }, "out"],
    [0.42, TOP],
    [LAND - 0.005, { ...DOWN, y: -4 }, "in"],
    [LAND, HERO_, "snap"],
    [LAND + 0.8, { ...HERO_, crouch: 6 }],
    [LAND + 1.3, { ...HERO_, crouch: 5, lean: 3, fx: 13, fy: -15, bx: -5, by: -20 }],
    [LAND + 1.8, READY],
    [LAND + 3.2, READY],
  ],
  hits: [
    { t: LAND, stop: 0.2, shake: 0.5, amp: 4, target: false },
    { t: LAND + 0.14, stop: 0.04, push: 3, straw: 26, y: -8 },
    { t: LAND + 0.44, push: -1.6, straw: 8, y: -8, flash: 0 },
  ],
  dust: [{ t: 0.03, x: 0, n: 8 }],
};

export const create = chain([{ fx: slam, t: LAND }]);
