import { chain, shiftKeys, shiftHits, READY } from "../../core/index.mjs";
import * as slash from "../melee/sword-slash.mjs";
import * as double from "../melee/double-slash.mjs";
import * as cleave from "../melee/heavy-cleave.mjs";

const A = 0, B = 0.5, C = 1.04, STEP = 10, FINISH = C + 0.335;

export const meta = {
  name: "Sword combo",
  desc: "Three strokes walking forward: a slash, a crossing double cut, and a two-handed cleave into the floor that throws the target about.",
  tags: ["move", "melee", "sword", "combo", "one-shot"],
  size: [264, 150],
  origin: [72, 130],
  duration: FINISH + 1.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const until = (keys, t) => keys.filter((k) => k[0] <= t);
const STAND_ = { ...READY, weapon: "sword", fx: 11, fy: -15, sa: 0.38 };
export const act = {
  target: { x: 118 },
  poses: [
    ...shiftKeys(until(slash.act.poses, 0.3), A),
    ...shiftKeys(until(double.act.poses, 0.27).filter((k) => k[0] >= -0.14), B, { dx: STEP }),
    ...shiftKeys(cleave.act.poses.filter((k) => k[0] >= -0.3), C, { dx: STEP * 2, weapon: "sword" }),
    [FINISH + 1.6, { ...STAND_, x: STEP * 2 - 4 }],
  ],
  hits: [...shiftHits(slash.act.hits, A), ...shiftHits(double.act.hits, B), ...shiftHits(cleave.act.hits, C)],
  dust: [...shiftHits(slash.act.dust, A).map((d) => ({ ...d })), ...shiftHits(cleave.act.dust, C).map((d) => ({ ...d, x: d.x + STEP * 2 }))],
};

export const create = chain([
  { fx: slash, t: A },
  { fx: double, t: B, x: STEP },
  { fx: cleave, t: C, x: STEP * 2 },
]);
