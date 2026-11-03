import { chain, READY } from "../../core/index.mjs";
import * as muzzle from "../projectiles/muzzle-shotgun.mjs";
import * as rocket from "../projectiles/rocket.mjs";
import * as blast from "../explosions/small-explosion.mjs";

const FIRE = 0.6, FLY = 0.56, HIT = FIRE + FLY, TX = 200, MY = -21, MX = 34;

export const meta = {
  name: "Rocket launcher",
  desc: "He drops to one knee, shoulders the tube and fires: the kick shoves him back along the floor, the rocket crawls out on its jet and the target goes up.",
  tags: ["move", "gun", "rocket", "projectile", "explosion", "one-shot"],
  size: [480, 244],
  origin: [178, 198],
  duration: HIT + 5.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const REST_ = { ...READY, weapon: "launcher", two: true, sa: -1, fx: 9, fy: -19 };
const KNEEL = { ...READY, weapon: "launcher", two: true, sa: 0, fx: 9, fy: -17, crouch: 6, lean: 2, ffx: 12, fbx: -9 };
const KICKED = { ...KNEEL, x: -6, sa: -0.12, fx: 4, fy: -19, lean: -4, crouch: 5 };
export const act = {
  target: { x: TX },
  poses: [
    [-0.52, REST_],
    [-0.18, KNEEL],
    [FIRE - 0.001, { ...KNEEL, crouch: 7 }],
    [FIRE, KICKED, "snap"],
    [FIRE + 0.36, { ...KNEEL, x: -6 }],
    [HIT + 0.9, { ...KNEEL, x: -6, crouch: 5, lean: 1 }],
    [HIT + 1.5, { ...REST_, x: -3 }],
    [HIT + 2.2, { ...REST_, x: 0 }],
    [HIT + 5.4, REST_],
  ],
  hits: [
    { t: FIRE, stop: 0.06, shake: 0.22, amp: 2, target: false },
    { t: HIT, stop: 0.2, shake: 0.45, amp: 4, push: 3.8, straw: 44, skin: "char" },
    { t: HIT + 4.8, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: FIRE, x: -16, n: 10, dir: -1 }],
};

export const create = chain([
  { fx: muzzle, t: FIRE, x: MX, height: -MY },
  { fx: rocket, t: FIRE, until: HIT, x: (t) => MX + 10 + (t - FIRE) ** 1.5 * ((TX - MX - 16) / FLY ** 1.5), y: MY },
  { fx: blast, t: HIT, x: TX },
]);
