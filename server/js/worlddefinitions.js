// The application registers map content before starting the engines.
class WorldDefinitions {
    constructor() {this.maps = new Map(); this.quests = []; this.listeners = new Set();}
    register(map, definition) {
        if (!map || !definition?.id) throw new Error('Map and definition ID are required');
        const entries = this.maps.get(map) || [];
        if (entries.some(entry => entry.id === definition.id)) throw new Error('Duplicate map definition: ' + definition.id);
        const ids = new Set(this.quests.map(q => q.id));
        for (const q of definition.quests || []) {
            if (!q.id || ids.has(q.id)) throw new Error('Missing or duplicate quest ID');
            ids.add(q.id);
        }
        this.maps.set(map, [...entries, definition]);
        this.quests.push(...(definition.quests || []));
        for (const listener of this.listeners) listener();
    }
    subscribe(listener) {this.listeners.add(listener); return () => this.listeners.delete(listener);}
    dialogues(map) {return (this.maps.get(map) || []).flatMap(entry => entry.dialogues || []);}
    behavior(map) {
        const sources = (this.maps.get(map) || []).map(entry => entry.npcBehavior).filter(Boolean);
        if (!sources.length) return null;
        const keys = sources.flatMap(source => source.npcs || []).map(npc => npc.key);
        if (new Set(keys).size !== keys.length) throw new Error('Duplicate NPC behavior key');
        return {...sources[0], npcs: sources.flatMap(source => source.npcs || []),
            conversations: sources.flatMap(source => source.conversations || [])};
    }
    create(world) {
        const entries = (this.maps.get(world.id.replace(/^world_/, '')) || []).map(entry =>
            ({id: entry.id, scene: entry.createScene?.(world)})).filter(entry => entry.scene);
        return new WorldScenes(entries);
    }
}
// Scene scripts provide lifecycle and presentation only. Quest progress remains
// in the existing quest/event consumer and dialogue actions.
class WorldScenes {
    constructor(entries) {this.entries = entries;}
    get(id) {return this.entries.find(entry => entry.id === id)?.scene;}
    tick() {for (const entry of this.entries) entry.scene.tick?.();}
    forget(player) {for (const entry of this.entries) entry.scene.forget?.(player);}
    packet(player) {
        const packet = {rendererExtensions: [], musicAreas: []};
        for (const entry of this.entries) {
            const next = entry.scene.packet?.(player);
            if (!next) continue;
            const {rendererExtensions = [], musicAreas = [], ...data} = next;
            Object.assign(packet, data); packet.rendererExtensions.push(...rendererExtensions); packet.musicAreas.push(...musicAreas);
        }
        return packet;
    }
}
module.exports = {WorldDefinitions, WorldScenes, definitions: new WorldDefinitions()};
