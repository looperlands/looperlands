import { chain, READY } from "../../core/index.mjs";
import * as smite from "../holy/smite.mjs";

const BOLT = 0.47, TX = 118;

export const meta = {
  name: "Holy smite",
  desc: "Both hands go up and a glint marks the target; he brings them down and a bolt of light drops like a hammer, leaving the target blanched.",
  tags: ["move", "holy", "spell", "strike", "one-shot"],
  size: [252, 182],
  origin: [42, 151],
  duration: 2.8,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const UP = { turn: 1.15, crouch: -1, fx: -7, fy: -44, bx: 8, by: -44, ffx: -3, fbx: 4 };
const DOWN = { ...READY, crouch: 5, lean: 5, fx: 17, fy: -29, bx: 13, by: -25, ffx: 12, fbx: -10, toeB: true };
export const act = {
  target: { x: TX },
  poses: [
    [-0.42, READY],
    [-0.04, UP],
    [BOLT - 0.01, { ...UP, y: -1 }],
    [BOLT, DOWN, "snap"],
    [1.1, { ...DOWN, crouch: 3, lean: 3 }],
    [1.7, READY],
    [2.8, READY],
  ],
  hits: [
    { t: BOLT, stop: 0.14, shake: 0.32, amp: 3, push: 2.8, straw: 24, skin: "holy", y: -30 },
    { t: 2.3, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: BOLT, x: 14, n: 6, dir: 1 }],
};

export const create = chain([{ fx: smite, t: 0, x: TX }]);
