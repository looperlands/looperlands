// pixelfx core: everything an effect imports comes from here.

export * from "./math.mjs";
export * from "./color.mjs";
export * from "./particles.mjs";
export * from "./shapes.mjs";
export { Particles, Bits, Lights, Blazes, P, PF, B, GRAVITY, FIRE_RAMP, SMOKE_RAMP, sparkle, flare, band, crystal } from "./sim.mjs";
export { Painter } from "./painter.mjs";
export { FONTS, textWidth } from "./font.mjs";
export { createFrame, clearFrame, createFx, composite, painterFor, resolveOptions } from "./fx.mjs";
export { stockActor, drawActor, actorAlphaOf, HERO, HERO2, HERO_PAL, DUMMY_PAL } from "./actor.mjs";
export { backdrop, BACKDROPS } from "./scene.mjs";
export { createAct, actBounds, actSpan, actTiming, poseAt, lerpPose, Target, STAND, SKINS, posed } from "./act.mjs";
export { skeleton, posedParts } from "./rig.mjs";
export { READY } from "./poses.mjs";
export { chain, shiftKeys, shiftHits } from "./chain.mjs";
