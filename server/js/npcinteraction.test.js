global.Types = {};
const Types = require('../../shared/js/gametypes');
const {npcForPlayer} = require('./npcinteraction');
test('dialogue requires a living player beside the particular NPC', () => {
    const near = {id: 11, kind: Types.Entities.GUARD, x: 40, y: 210};
    const far = {...near, id: 12, x: 73, y: 197};
    const world = {npcs: {11: near, 12: far}};
    const player = {hasEnteredGame: true, x: 41, y: 210};
    expect(npcForPlayer(world, player, near.kind, 11)).toBe(near);
    expect(npcForPlayer(world, player, near.kind, 12)).toBeNull();
    expect(npcForPlayer(world, player, Types.Entities.VILLAGER, 11)).toBeNull();
    expect(npcForPlayer(world, player, near.kind, 99)).toBeNull();
    expect(npcForPlayer(world, player, near.kind)).toBe(near);
    expect(npcForPlayer(world, {...player, isDead: true}, near.kind, 11)).toBeNull();
    expect(npcForPlayer(world, null, near.kind, 11)).toBeNull();
});
