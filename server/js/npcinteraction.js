const Types = require('../../shared/js/gametypes');
function npcForPlayer(world, player, kind, entityId) {
    if (!world || !player?.hasEnteredGame || player.isDead) return null;
    const close = npc => Types.isNpc(npc.kind) && Number(npc.kind) === Number(kind) &&
        Math.abs(player.x - npc.x) + Math.abs(player.y - npc.y) <= 5;
    if (entityId !== undefined) {
        const npc = world.npcs[entityId];
        return npc && close(npc) ? npc : null;
    }
    // Older clients omit the ID. Resolve a nearby placed NPC rather than a kind-wide tree.
    return Object.values(world.npcs).find(close) || null;
}
module.exports = {npcForPlayer};
