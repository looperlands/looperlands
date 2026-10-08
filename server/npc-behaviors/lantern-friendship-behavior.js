const picnic = require('./lantern-picnic');
const {ids: Q} = require('./lantern-friendship');
const behavior = JSON.parse(JSON.stringify(picnic.behavior));
const stop = (x, y) => ({x, y, waitSeconds: 30});
const route = [stop(43, 185), stop(43, 181), stop(44, 190)];
const phase = (at, key, activity, points) => ({at, key, activity, label: 'the southern Forest path', location: 'outside', explanation: 'I am taking a little time for myself. You can ask whether I would like company.', travelling: 'walking along the Forest path', route: points});
behavior.npcs.push({key: 'friendship-rowan', kind: 'forestnpc', label: 'Rowan', preset: 'work', origin: {x: 43, y: 185},
    area: {x: 37, y: 176, width: 14, height: 17}, stepMs: 700, route,
    schedule: {buildings: [], phases: [phase(0, 'sleep', 'resting by his lantern', [route[0]]), phase(6, 'work', 'working on his own lantern', route), phase(16, 'free-time', 'taking time for himself', [route[2], route[0]]), phase(18, 'sleep', 'resting by his lantern', [route[0]])]},
    lines: {greeting: ['Hello. Taking a little time for yourself too?'], talk: ['For once, this is my own errand.']},
    reactions: [{when: {questCompleted: Q.STAY}, lines: {return: ['There you are. It is good to have company without an errand.']}}]});
behavior.npcs.push({key: 'friendship-jimi', kind: 'beachnpc', label: 'Jimi', preset: 'socialise', origin: {x: 76, y: 293},
    area: {x: 74, y: 291, width: 5, height: 5}, stepMs: 700, route: [stop(76, 293)],
    lines: {greeting: ['There is time for a conversation along the shore.']}, reactions: [{when: {questCompleted: Q.SHORE_SPACE}, lines: {return: ['Thank you for a little breathing room on Beach.']}}]});
for (const actor of behavior.npcs.slice(0, 3)) {
    actor.reactions.push({when: {questCompleted: Q.STAY}, lines: {return: ['It is good to ask a friend what they want. Thank you for listening.']}});
}
behavior.conversations.push({cooldownSeconds: 120, steps: [
    {npc: 'town-gardener', text: 'I have counted the baskets twice.'},
    {npc: 'town-neighbour', text: 'Same answer?'},
    {npc: 'town-gardener', text: 'Eventually.'}]}, {cooldownSeconds: 120, steps: [
    {npc: 'town-watch', text: 'A quiet patrol is a good patrol.'},
    {npc: 'town-gardener', text: 'Does that work for markets?'},
    {npc: 'town-watch', text: 'I have never been able to test it here.'}]});
module.exports = {behavior};
