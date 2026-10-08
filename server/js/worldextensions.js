// Definitions are registered by the application composition root. Engines never
// discover, import or name stories; extensions own their content and custom hooks.
class DefinitionRegistry {
    constructor() {this.maps = new Map(); this.quests = []; this.listeners = new Set();}
    register(mapId, definition) {
        if (!mapId || !definition?.id) throw new Error('A map and extension ID are required');
        const entries = this.maps.get(mapId) || [];
        if (entries.some(entry => entry.id === definition.id)) throw new Error('Duplicate map extension: ' + definition.id);
        const ids = new Set(this.quests.map(quest => quest.id));
        for (const quest of definition.quests || []) {
            if (ids.has(quest.id)) throw new Error('Duplicate quest: ' + quest.id);
            ids.add(quest.id);
        }
        this.maps.set(mapId, [...entries, definition]);
        this.quests.push(...(definition.quests || []));
        for (const listener of this.listeners) listener();
    }
    subscribe(listener) {this.listeners.add(listener);}
    definitions() {return [...this.maps.values()].flat();}
    dialogues(mapId) {return (this.maps.get(mapId) || []).flatMap(entry => entry.dialogues || []);}
    behavior(mapId) {
        const sources = (this.maps.get(mapId) || []).map(entry => entry.npcBehavior).filter(Boolean);
        if (!sources.length) return null;
        return {...sources[0], npcs: sources.flatMap(source => source.npcs || []),
            conversations: sources.flatMap(source => source.conversations || [])};
    }
    decorate(mapId, node, session) {
        for (const entry of this.maps.get(mapId) || []) entry.decorateDialogue?.(node, session);
        return node;
    }
    checkCondition(type, condition, session) {
        for (const entry of this.definitions()) {
            const result = entry.conditions?.[type]?.(condition, session);
            if (result !== undefined) return result;
        }
        return false;
    }
    canStart(quest, data) {return this.definitions().every(entry => entry.canStartQuest?.(quest, data) !== false);}
    canComplete(quest, data) {
        return this.definitions().every(entry => entry.canCompleteQuest?.(quest, data) !== false);
    }
    questLog(quest, data, completed) {
        for (const entry of this.definitions()) {
            const result = entry.questLog?.(quest, data, completed);
            if (result) return result;
        }
        return null;
    }
    create(world) {
        return new WorldExtensions((this.maps.get(world.id.replace(/^world_/, '')) || [])
            .map(entry => ({id: entry.id, runtime: entry.create?.(world)})).filter(entry => entry.runtime));
    }
}

class WorldExtensions {
    constructor(entries) {this.entries = entries;}
    get(id) {return this.entries.find(entry => entry.id === id)?.runtime;}
    tick() {for (const entry of this.entries) entry.runtime.tick?.();}
    forget(player) {for (const entry of this.entries) entry.runtime.forget?.(player);}
    async talk(player, npc) {
        for (const entry of this.entries) {
            const response = await entry.runtime.talk?.(player, npc);
            if (response) return response;
        }
        return null;
    }
    async kill(player, mob) {for (const entry of this.entries) await entry.runtime.kill?.(player, mob);}
    async action(player, type, id, owner) {
        const matches = this.entries.filter(entry => (!owner || owner === entry.id) && entry.runtime.ownsAction?.(type, id));
        if (matches.length !== 1) throw new Error('This world action is not available here.');
        return matches[0].runtime[type](player, id);
    }
    packet(player) {
        const packet = {rendererExtensions: [], worldActions: [], musicAreas: []};
        for (const entry of this.entries) {
            const next = entry.runtime.packet?.(player);
            if (!next) continue;
            const {rendererExtensions = [], worldActions = [], musicAreas = [], ...rest} = next;
            Object.assign(packet, rest);
            packet.rendererExtensions.push(...rendererExtensions);
            packet.worldActions.push(...worldActions.map(action => ({...action, extension: entry.id})));
            packet.musicAreas.push(...musicAreas);
        }
        return packet;
    }
}
const registry = new DefinitionRegistry();
module.exports = {registry, DefinitionRegistry, WorldExtensions};
