const {INVITE, MUSIC} = require('./lantern-picnic');
module.exports = {
    id: 'lantern-picnic', memoryKey: 'celebrated', center: {x: 42, y: 216}, triggerRadius: 30, audienceRadius: 16,
    arrivalTimeoutMs: 180000, durationMs: 90000, cooldownMs: 30000, speechGapMs: 6000,
    actors: [{key: 'town-gardener', destination: {x: 40, y: 215}}, {key: 'town-neighbour', destination: {x: 43, y: 215}}, {key: 'town-watch', destination: {x: 42, y: 218}}],
    trigger: {questCompleted: INVITE},
    state: (player, data) => ({music: (data?.choices || []).includes(MUSIC), visitor: 'A neighbour'}),
    activity: {key: 'picnic', location: 'the picnic south of the market', travelling: 'walking to the picnic',
        explanation: 'I am taking a break with the neighbours. There is room for you beside the baskets.', gathering: 'joining the picnic', playing: 'enjoying the picnic', finished: 'returning to rounds'},
    messages: {gathering: 'A neighbour finished the preparations. Adam, Bstrat and the watch are walking to the picnic, south of the market.',
        playing: 'The picnic is happening south of the market! Join the neighbours by the blanket. The watch has finished the gate check and can stay for a while.',
        finished: 'The picnic has finished. The neighbours remember it and are returning to their usual rounds.'},
        steps: [
            {type: 'speech', npc: 'town-gardener', text: 'The bread is here, and the blankets are ready. It is finally time to eat!'},
            {type: 'speech', npc: 'town-neighbour', text: 'That basket did more than one job today. Let us leave room for everyone.'},
            {type: 'speech', npc: 'town-watch', text: 'My gate check is done. I can join you for a little while.'},
            {type: 'speech', npc: 'town-neighbour', text: 'The lanterns are lit. Come sit with us south of the market.'},
            {type: 'speech', npc: 'town-watch', text: 'I usually pass this spot while patrolling. It is good to stop here with my neighbours.'},
            {type: 'speech', npc: 'town-gardener', text: 'There is bread and cake for everyone by the blanket.'},
            {type: 'speech', npc: 'town-neighbour', text: 'One place is still empty. Rowan used to bring invitations from the other parts of the island.'},
            {type: 'speech', npc: 'town-watch', text: 'Save that place. An old friend may still find the road home.'}
        ],
};
