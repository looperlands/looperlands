// Resolve legacy quest families against their actual NPC locations. Registration
// supplies the fallback for story givers that have not spawned yet.
function mapResolver(worlds, registry) {
    const byNpc = new Map(), declared = new Map();
    for (const [map, world] of Object.entries(worlds || {})) {
        for (const npc of Object.values(world.npcs || {})) {
            if (npc.kind == null) continue;
            const key = String(npc.kind), maps = byNpc.get(key) || new Set();
            maps.add(map); byNpc.set(key, maps);
        }
    }
    for (const [map, definitions] of registry.maps) {
        for (const definition of definitions) for (const quest of definition.quests || []) {
            const maps = declared.get(quest.id) || new Set();
            maps.add(map); declared.set(quest.id, maps);
        }
    }
    return quest => [...(byNpc.get(String(quest.npc)) || declared.get(quest.id) || [])].sort();
}
module.exports = {mapResolver};
