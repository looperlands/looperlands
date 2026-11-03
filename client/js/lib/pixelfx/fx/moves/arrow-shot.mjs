import { chain, READY } from "../../core/index.mjs";
import * as arrow from "../projectiles/arrow.mjs";
import * as spark from "../impacts/hit-spark.mjs";

const LOOSE = 0.56, FLY = 0.24, HIT = LOOSE + FLY, TX = 180, SPEED = (TX - 30) / FLY;

export const meta = {
  name: "Arrow shot",
  desc: "He raises the bow, draws to his cheek, holds his breath and looses: the string snaps forward, the arrow crosses the floor and thuds home.",
  tags: ["move", "bow", "arrow", "projectile", "ranged", "one-shot"],
  size: [300, 74],
  origin: [38, 66],
  duration: 1.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const REST_ = { ...READY, weapon: "bow", sa: -0.4, fx: 12, fy: -20, bx: 6, by: -17 };
const AIM = { ...REST_, crouch: 3, lean: 1, fx: 18, fy: -28, sa: 0, bx: 10, by: -27, nocked: true, ffx: 11, fbx: -9 };
const DRAWN = { ...AIM, crouch: 4, lean: -2, fx: 18, bx: -3, by: -29, pull: true };
const LOOSED = { ...AIM, crouch: 3, lean: 2, fx: 19, fy: -28, bx: -9, by: -32, nocked: false, pull: false };
export const act = {
  target: { x: TX },
  poses: [
    [-0.44, REST_],
    [-0.14, AIM],
    [0.16, DRAWN],
    [LOOSE, { ...DRAWN, crouch: 4 }],
    [LOOSE + 0.002, LOOSED, "snap"],
    [1.1, { ...LOOSED, bx: -6, by: -25 }],
    [1.6, REST_],
    [1.9, REST_],
  ],
  hits: [{ t: HIT, stop: 0.07, shake: 0.12, amp: 2, push: 2.2, straw: 14, y: -28 }],
};

export const create = chain([
  { fx: arrow, t: LOOSE, until: HIT, x: (t) => 30 + (t - LOOSE) * SPEED, y: -28 },
  { fx: spark, t: HIT, x: TX - 10, height: 30 },
]);
