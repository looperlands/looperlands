const Types = require('../../shared/js/gametypes');
const Availability = require('./contentavailability');
const Utils = require('./utils');

// A map has one presentation packet for all seasonal events. Keeping composition
// here prevents concurrent events from replacing each other's renderer state.
class SeasonalScene {
    constructor(world, events, options = {}) {
        this.world = world;
        this.events = events.map(definition => ({definition, availability: {...definition.availability, enabled: definition.enabled}, active: false}));
        this.isAvailable = options.isAvailable || Availability.isAvailable;
        this.createNpc = options.createNpc || ((...args) => new (require('./npc'))(...args));
        this.allocateId = options.allocateId || Utils.getID;
        this.presentation = options.presentation || {prefix: 'seasonal', script: 'seasonal-parallax-worker.js', namespaceSounds: true};
        this.actors = new Map();
        for (const event of this.events) {
            Availability.validate(event.availability);
            require('../../client/js/ambientconfig').validate(event.definition.ambientSounds, world.map);
        }
        this.tick();
    }

    tick() {
        for (const event of this.events) {
            const active = this.isAvailable(event.availability);
            if (!active) {
                if (event.active) this.removeActors(event.definition.actors);
                event.active = false;
                continue;
            }
            event.active = true;
            for (const placement of event.definition.actors) {
                if (this.actors.has(placement.key) || !this.world.isValidPosition(placement.x, placement.y) ||
                    Object.values(this.world.entities).some(entity => entity.x === placement.x && entity.y === placement.y)) continue;
                let id;
                do {id = this.allocateId();} while (this.world.entities[id]);
                const npc = this.createNpc(id, Types.getKindFromString(placement.kind), placement.x, placement.y);
                npc.behaviorState = {key: placement.key, label: placement.label, activity: 'waiting', orientation: Types.Orientations.DOWN};
                this.world.addEntity(npc);
                this.world.npcs[npc.id] = npc;
                this.actors.set(placement.key, npc);
                if (placement.route && this.world.npcBehavior) this.world.npcBehavior.registerRoutine({
                    key: placement.key, kind: placement.kind, label: placement.label, preset: 'patrol',
                    origin: {x: placement.x, y: placement.y}, area: placement.area, stepMs: 850, route: placement.route,
                    lines: placement.greeting ? {greeting: [placement.greeting]} : {}
                });
            }
        }
        this.active = this.events.some(event => event.active);
    }

    removeActors(placements = this.events.flatMap(event => event.definition.actors)) {
        for (const {key} of placements) {
            const npc = this.actors.get(key);
            if (!npc) continue;
            this.world.npcBehavior?.routines.delete(key);
            if (this.world.npcs[npc.id] === npc) {
                this.world.pushToAdjacentGroups(npc.group, npc.despawn());
                this.world.removeEntity(npc);
            }
            this.actors.delete(key);
        }
    }

    packet() {
        const active = this.events.filter(event => this.isAvailable(event.availability)).map(event => event.definition);
        if (!active.length) return {rendererExtensions: [], ambientSounds: []};
        const scenes = (this.world.map.scenes || []).flatMap(({id, x, y, w, h}) => {
            const layers = active.flatMap(event => event.parallax.find(row => String(row.sceneId) === String(id))?.layers || []);
            return layers.length ? [{id, x, y, w, h, layers}] : [];
        });
        return {rendererExtensions: [
            {id: 'seasonal-decorations', script: 'seasonal-decorations-worker.js', data: {
                decorations: active.flatMap(event => event.decorations), tiles: active.flatMap(event => event.tiles)
            }},
            ...['ground', 'foreground'].map(plane => ({id: this.presentation.prefix + '-' + plane, script: this.presentation.script, data: {scenes}}))
        ], ambientSounds: active.flatMap(event => event.ambientSounds.map(sound => ({...sound,
            id: this.presentation.namespaceSounds ? event.id + ':' + sound.id : sound.id}))) };
    }
}

module.exports = {SeasonalScene};
