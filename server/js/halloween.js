const Types = require('../../shared/js/gametypes');
const Availability = require('./contentavailability');
const {availability} = require('../world-definitions/halloween-season');
const scenery = require('../world-definitions/halloween-scenery');
const {placements} = require('../world-definitions/halloween-actors');

class HalloweenScene {
    constructor(world, options = {}) {
        this.world = world;
        this.availability = options.availability || availability;
        this.isAvailable = options.isAvailable || Availability.isAvailable;
        this.createNpc = options.createNpc || ((...args) => new (require('./npc'))(...args));
        this.actors = new Map();
        this.active = false;
        Availability.validate(this.availability);
        require('../../client/js/ambientconfig').validate(scenery.ambientSounds, world.map);
        this.tick();
    }

    tick() {
        const active = this.isAvailable(this.availability);
        if (!active) {
            if (this.active) this.removeActors();
            this.active = false;
            return;
        }
        this.active = true;
        for (const [index, placement] of placements.entries()) {
            if (this.actors.has(placement.key)) continue;
            // A player standing on an arrival tile delays that actor's arrival.
            // Never overwrite an existing world entity or spawn inside a wall.
            if (!this.world.isValidPosition(placement.x, placement.y) ||
                Object.values(this.world.entities).some(entity => entity.x === placement.x && entity.y === placement.y)) continue;
            const id = 1980100000 + index;
            if (this.world.entities[id]) continue;
            const npc = this.createNpc(id, Types.getKindFromString(placement.kind), placement.x, placement.y);
            npc.behaviorState = {key: placement.key, label: placement.label, activity: 'waiting', orientation: Types.Orientations.DOWN};
            this.world.addEntity(npc);
            this.world.npcs[npc.id] = npc;
            this.actors.set(placement.key, npc);
            if (placement.route && this.world.npcBehavior) this.world.npcBehavior.registerRoutine({
                key: placement.key, kind: placement.kind, label: placement.label, preset: 'patrol',
                origin: {x: placement.x, y: placement.y}, area: {x: 25, y: 207, width: 24, height: 20},
                stepMs: 850, route: placement.route, lines: {greeting: ['Follow our lantern road. Whispy knows why the village is haunted.']}
            });
        }
    }

    removeActors() {
        for (const [key, npc] of this.actors) {
            this.world.npcBehavior?.routines.delete(key);
            if (this.world.npcs[npc.id] !== npc) continue;
            this.world.pushToAdjacentGroups(npc.group, npc.despawn());
            this.world.removeEntity(npc);
        }
        this.actors.clear();
    }

    packet() {
        if (!this.isAvailable(this.availability)) return {rendererExtensions: [], ambientSounds: []};
        return {rendererExtensions: [
            {id: 'seasonal-decorations', script: 'seasonal-decorations-worker.js', data: {decorations: scenery.decorations, tiles: scenery.tiles}},
            ...['ground', 'foreground'].map(plane => ({id: 'halloween-' + plane, script: 'halloween-parallax-worker.js', data: scenery.parallax}))
        ], ambientSounds: scenery.ambientSounds};
    }
}

module.exports = {HalloweenScene, placements};
