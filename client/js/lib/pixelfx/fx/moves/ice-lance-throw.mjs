import { chain, READY, PAL } from "../../core/index.mjs";
import * as charge from "../arcane/spell-charge.mjs";
import * as lance from "../ice/ice-lance.mjs";
import * as burst from "../ice/snowflake-burst.mjs";

const THROW = 0.8, FLY = 0.34, HIT = THROW + FLY, TX = 170, SPEED = (TX - 34) / FLY;

export const meta = {
  name: "Ice lance throw",
  desc: "Frost gathers into a spear in his hand, he throws it like a javelin, and the target ices over in a burst of snowflakes and shivers.",
  tags: ["move", "ice", "spell", "projectile", "one-shot"],
  size: [310, 136],
  origin: [86, 134],
  duration: HIT + 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const HOLD = { ...READY, x: -3, crouch: 4, lean: 2, fx: 18, fy: -22, bx: 11, by: -17, ffx: 10, fbx: -8 };
const THROWN = { ...READY, x: 9, crouch: 4, lean: 6, fx: 19, fy: -24, bx: -6, by: -24, ffx: 13, fbx: -10, toeB: true };
export const act = {
  target: { x: TX },
  poses: [
    [-0.4, { ...READY, x: -3 }],
    [0.06, { ...HOLD }],
    [THROW - 0.2, HOLD],
    [THROW - 0.03, { ...HOLD, crouch: 5, lean: -2, fx: 17, bx: 5, by: -20 }],
    [THROW, THROWN, "snap"],
    [HIT + 0.3, { ...THROWN, crouch: 3, lean: 4 }],
    [HIT + 0.9, { ...READY, x: -3 }],
    [HIT + 3.2, { ...READY, x: -3 }],
  ],
  hits: [
    { t: HIT, stop: 0.13, shake: 0.2, amp: 2, push: 2.4, straw: 12, skin: "ice", shiver: 1.4, y: -26 },
    { t: 2.75, push: 0.3, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: THROW, x: 13, n: 6, dir: 1, c: "#d8f2ff" }],
};

export const create = chain([
  { fx: charge, t: 0.06, until: THROW, palette: PAL.ice },
  { fx: lance, t: THROW, until: HIT, x: (t) => 34 + (t - THROW) * SPEED, y: -24 },
  { fx: burst, t: HIT, x: TX, y: -26 },
]);
