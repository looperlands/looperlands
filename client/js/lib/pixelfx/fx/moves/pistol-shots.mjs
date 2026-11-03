import { chain, READY } from "../../core/index.mjs";
import * as muzzle from "../projectiles/muzzle-pistol.mjs";
import * as tracer from "../projectiles/bullet-tracer.mjs";
import * as spark from "../impacts/hit-spark.mjs";

const SHOTS = [0.14, 0.42, 0.7], FLY = 0.12, TX = 180, BY = -32, MX = 28;

export const meta = {
  name: "Pistol shots",
  desc: "Three aimed shots: the gun kicks up each time and settles, tracers cross the floor, and the target staggers under each hit.",
  tags: ["move", "gun", "pistol", "projectile", "ranged", "one-shot"],
  size: [378, 76],
  origin: [111, 72],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const REST_ = { ...READY, weapon: "pistol", sa: 0.9, fx: 10, fy: -17, bx: 7, by: -16 };
const AIM = { ...REST_, crouch: 3, lean: 2, fx: 18, fy: -28, sa: 0, bx: 12, by: -25, ffx: 11, fbx: -9 };
const KICK = { ...AIM, lean: 0, fx: 16, fy: -33, sa: -0.45, by: -28 };
const keys = SHOTS.flatMap((t) => [[t, AIM], [t + 0.001, KICK, "snap"], [t + 0.14, AIM]]);
export const act = {
  target: { x: TX },
  poses: [[-0.36, REST_], [-0.06, AIM], ...keys, [1.2, { ...AIM, crouch: 1 }], [1.7, REST_], [2.6, REST_]],
  hits: SHOTS.map((t, i) => ({ t: t + FLY, stop: i === 2 ? 0.08 : 0.04, shake: 0.1, amp: 1 + (i === 2 ? 1 : 0), push: i % 2 ? -1.8 : 2, straw: 10, y: -30, kick: 1 })),
};

export const create = chain([
  ...SHOTS.flatMap((t) => [
    { fx: muzzle, t, x: MX, height: -BY },
    { fx: tracer, t, until: t + FLY, x: (u) => MX + 4 + (u - t) * ((TX - MX - 14) / FLY), y: BY },
    { fx: spark, t: t + FLY, x: TX - 10, height: 28 },
  ]),
]);
