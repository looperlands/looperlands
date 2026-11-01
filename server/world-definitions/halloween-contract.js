// These identities connect authored scenery to the existing personal stories
// and cauldron. Positions and presentation can change without resetting progress.
const requiredActors = [
    ['witch', 'WHISPYWITCH'], ['footprints', 'halloween_footprints'], ['pumpkin', 'halloween_pumpkin'],
    ['gravedigger-left', 'halloween_ghost'], ['gravedigger-right', 'halloween_ghost'], ['memorial', 'halloween_memorial'],
    ['well', 'halloween_well'], ['keepsake', 'halloween_keepsake'],
    ['procession-1', 'halloween_ghost'], ['procession-2', 'halloween_ghost'], ['procession-3', 'halloween_ghost']
].map(([key, kind]) => ({key: 'halloween:' + key, kind}));
const contract = {id: 'halloween', name: 'Halloween', requiredActors};
function registered(mapId) {return mapId === 'main' ? [contract] : [];}
function validate(mapId, events) {
    const contracts = registered(mapId);
    if (contracts.some(definition => !events.some(event => event.id === definition.id))) {
        throw Object.assign(new Error('Keep the registered seasonal events for this map. Disable an event to hide it.'), {status: 400});
    }
    if (mapId !== 'main' && events.some(event => event.id === 'halloween')) {
        throw Object.assign(new Error('The halloween event ID belongs to the protected main-map story. Choose another ID.'), {status: 400});
    }
    if (events.some(event => event.id !== 'halloween' && Object.keys(event.textOverrides || {}).length)) {
        throw Object.assign(new Error('New events use the Quest builder for their stories; text overrides belong to the registered Halloween story.'), {status: 400});
    }
    for (const definition of contracts) {
        const event = events.find(row => row.id === definition.id);
        for (const actor of definition.requiredActors) {
            if (!event.actors.some(row => row.key === actor.key && row.kind === actor.kind)) {
                throw Object.assign(new Error('Keep linked actor ' + actor.key + ' and its NPC kind; existing stories use this identity.'), {status: 400});
            }
        }
    }
}
function storyLinks(mapId) {
    if (mapId !== 'main') return [];
    const story = require('./halloween-story');
    return [{eventId: contract.id, questIds: [story.INTRO, story.SHADOW, story.GRAVEDIGGER, story.WELL],
        actorKeys: requiredActors.map(actor => actor.key), shopId: 'halloween-cauldron',
        note: 'The existing personal mysteries and cauldron share this event schedule. After moving clues, update their directions in Story text. Quest builder overrides take precedence for overlapping quest text. Saved progress and rewards do not reset each year.'}];
}
module.exports = {registered, validate, storyLinks};
