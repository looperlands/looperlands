import { chain, READY } from "../../core/index.mjs";
import * as slash from "../melee/sword-slash.mjs";
import * as crit from "../impacts/crit-hit.mjs";

const CUT = 0.16, HIT = CUT + 0.06, AT = 116, TX = 176;

export const meta = {
  name: "Dash strike",
  desc: "A crouch, then he's across the floor in a blur of after-images and already cutting: a critical hit, a beat, and he hops back to where he started.",
  tags: ["move", "melee", "sword", "dash", "crit", "one-shot"],
  size: [372, 156],
  origin: [66, 136],
  duration: 2.3,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
const LOW = { ...GUARD, crouch: 6, lean: 6, fx: -3, fy: -17, sa: 3.05, bx: 9, by: -23, ffx: 11, fbx: -10 };
const COCK = { ...GUARD, x: AT - 4, crouch: 3, lean: -2, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -7 };
const CUT_ = { ...GUARD, x: AT, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -10 };
const DOWN = { ...GUARD, x: AT + 2, crouch: 5, lean: 5, fx: 20, fy: -21, sa: 0.62, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: true };
const HOP = { ...GUARD, y: -14, crouch: 0, lean: -3, fx: 13, fy: -31, sa: -0.9, bx: -8, by: -28, ffx: 6, ffy: -8, fbx: -6, fby: -6, ghost: 1 };
export const act = {
  target: { x: TX },
  poses: [
    [-0.5, { ...GUARD, x: 0 }],
    [-0.16, { ...LOW, x: -2 }],
    [-0.01, { ...LOW, x: -3, crouch: 6 }],
    [0, { ...LOW, x: 8, ghost: 1 }, "snap"],
    [0.14, { ...LOW, x: AT - 6, ghost: 1 }, "line"],
    [0.145, COCK, "snap"],
    [CUT, CUT_, "snap"],
    [HIT, DOWN, "snap"],
    [0.75, { ...DOWN, crouch: 4, lean: 4 }],
    [1.25, { ...GUARD, x: AT + 2 }],
    [1.32, { ...GUARD, x: AT + 2, crouch: 5, lean: -2 }, "snap"],
    [1.4, { ...HOP, x: AT - 28 }, "snap"],
    [1.6, { ...HOP, x: 22, y: -18 }, "line"],
    [1.74, { ...GUARD, x: 0, y: 0, crouch: 5 }, "line"],
    [2.2, { ...GUARD, x: 0 }],
  ],
  hits: [{ t: HIT, stop: 0.17, shake: 0.26, amp: 3, push: 3.4, straw: 32 }],
  dust: [{ t: 0, x: 0, n: 8, dir: -1 }, { t: 0.14, x: AT - 6, n: 7 }, { t: 1.74, x: 0, n: 6 }],
};

export const create = chain([
  { fx: slash, t: CUT, x: AT },
  { fx: crit, t: HIT, x: TX - 10, height: 28 },
]);
