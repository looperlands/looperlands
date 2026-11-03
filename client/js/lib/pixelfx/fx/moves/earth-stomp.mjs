import { chain, READY } from "../../core/index.mjs";
import * as spike from "../nature/earth-spike.mjs";

const STOMP = 0.06, RAM = STOMP + 0.43, TX = 112;

export const meta = {
  name: "Earth stomp",
  desc: "A knee comes up, the boot slams down, the floor heaves under the target and a stone spike rams up through it.",
  tags: ["move", "earth", "spell", "stomp", "one-shot"],
  size: [290, 142],
  origin: [50, 128],
  duration: STOMP + 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const KNEE = { ...READY, crouch: 1, lean: -3, fx: 3, fy: -34, bx: 11, by: -30, ffx: 9, ffy: -15, fbx: -5 };
const SLAM = { ...READY, crouch: 7, lean: 3, fx: 14, fy: -14, bx: -5, by: -18, ffx: 11, fbx: -9 };
export const act = {
  target: { x: TX },
  poses: [
    [-0.5, READY],
    [-0.14, KNEE],
    [STOMP - 0.005, { ...KNEE, ffy: -17 }],
    [STOMP, SLAM, "snap"],
    [RAM + 0.5, { ...SLAM, crouch: 5 }],
    [RAM + 1.1, READY],
    [STOMP + 3.4, READY],
  ],
  hits: [
    { t: STOMP, stop: 0.1, shake: 0.2, amp: 3, target: false },
    { t: RAM, stop: 0.14, shake: 0.28, amp: 3, push: -3.2, straw: 30, y: -10 },
  ],
  dust: [{ t: STOMP, x: 11, n: 9 }],
};

export const create = chain([{ fx: spike, t: STOMP, x: TX }]);
