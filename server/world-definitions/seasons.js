const Content = require('../js/seasonalcontent');
const {SeasonalScene} = require('../js/seasonalscene');
const Types = require('../../shared/js/gametypes');

function register(root, target) {
    for (const mapId of Content.maps(root)) {
        const {events} = Content.readDocument(root, mapId);
        const contract = require('./halloween-contract');
        contract.validate(mapId, events);
        if (mapId === 'main') require('./halloween').register(target, events.find(event => event.id === 'halloween'));
        const protectedKeys = new Set(contract.registered(mapId).flatMap(event => event.requiredActors.map(actor => actor.key)));
        const dialogues = events.flatMap(event => event.actors.filter(actor => actor.greeting && !protectedKeys.has(actor.key)).map(actor => ({
            key: actor.key, npc: Types.getKindFromString(actor.kind), name: actor.label,
            availability: {...event.availability, enabled: event.enabled}, start: 'greeting', nodes: {greeting: {text: actor.greeting}}
        })));
        if (events.length) target.register(mapId, {id: 'seasonal-content', dialogues,
            ...(events.some(event => event.actors.some(actor => actor.route)) ? {npcBehavior: {enabled: true, npcs: []}} : {}),
            createScene: world => new SeasonalScene(world, events)});
    }
}
module.exports = {register};
