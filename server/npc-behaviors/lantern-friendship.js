// Stable saved IDs. The LIGHT/SHORE IDs intentionally retain their original names.
const {Entities: E} = require('../../shared/js/gametypes');
const ids = Object.fromEntries(['EMPTY_PLACE', 'MESSENGER', 'LIGHT', 'SHORE', 'NAME', 'STAY', 'SHORE_SPACE', 'SPARE_WOOD'].map(key => [key, 'LANTERN_FRIENDSHIP_' + key]));
const choices = Object.fromEntries(['listen-first', 'ask-directly', 'apology-first', 'invitation-first', 'rowan-project', 'jimi-memory', 'parcel-described', 'adam-account', 'stall-covered', 'compare-requested', 'invitation-understood', 'rowan-accepted'].map(key => [key, 'lantern-friendship:' + key]));
const actors = {adam: {npc: E.VILLAGER, npcKey: 'town-gardener'}, bstrat: {npc: E.VILLAGEGIRL, npcKey: 'town-neighbour'}, watch: {npc: E.GUARD, npcKey: 'town-watch'}, rowan: {npc: E.FORESTNPC, npcKey: 'friendship-rowan'}, jimi: {npc: E.BEACHNPC, npcKey: 'friendship-jimi'}};
const talk = (id, who, label) => ({id, label, eventType: 'NPC_TALKED', target: actors[who].npc, npcKey: actors[who].npcKey});
const visit = area => ({id: 'visit-' + area.toLowerCase(), label: 'Enter ' + area + ' (leave and re-enter if already here)', eventType: 'AREA_ENTERED', target: area});
const deliver = (who, amount) => ({id: 'deliver', label: 'Give ' + who[0].toUpperCase() + who.slice(1) + ' ' + amount + ' wood', eventType: 'DELIVER_ITEM', target: E.WOOD, amount, recipient: actors[who]});
const quest = (id, name, who, previous, objectives, startText, endText, report = who) => ({id, name, npc: actors[who].npc, requiredQuest: previous, dialogueOnly: true, level: 1, needToReturn: true, returnToNpc: actors[report].npc, objectives, startText, endText});
const Q = ids;
const quests = [
    quest(Q.EMPTY_PLACE, 'The Empty Place', 'bstrat', 'LANTERN_INVITATION', [talk('adam', 'adam', 'Ask Adam about Rowan'), talk('watch', 'watch', 'Ask Town Watch at the eastern gate or town hall'), talk('report', 'bstrat', 'Report back to Bstrat')], 'Ask Adam at the market or guesthouse, then Town Watch, then return to Bstrat.', 'You will ask Rowan what happened.'),
    quest(Q.MESSENGER, 'More Than a Messenger', 'bstrat', Q.EMPTY_PLACE, [visit('Forest'), talk('rowan', 'rowan', 'Ask Rowan whether he wants company')], 'Leave Town through the northern gate. Rowan stays on the southern Forest path.', 'Rowan gave you permission to ask Jimi about their afternoons.', 'rowan'),
    {...quest(Q.LIGHT, 'A Basket With Boots', 'rowan', Q.MESSENGER, [visit('Beach'), talk('jimi', 'jimi', 'Ask Jimi about Rowan'), visit('Town'), talk('adam', 'adam', 'Find out who Adam\'s marked parcel is for')], 'Walk south through Town to Beach, then follow the shore east and south to Jimi. Ask Adam about the parcel afterwards.', 'Adam gives you three wood saved for Rowan.', 'adam'), reward: {item: E.WOOD, amount: 3}},
    quest(Q.SHORE, 'A Light of His Own', 'adam', Q.LIGHT, [visit('Forest'), deliver('rowan', 3)], 'Take three wood north to Rowan in Forest. If you spent the gift, collect ordinary wood to replace it.', 'Rowan can repair his own lantern. Ask Bstrat about the invitations.', 'rowan'),
    quest(Q.NAME, 'Compare the Invitations', 'bstrat', Q.SHORE, [talk('adam', 'adam', 'Ask Adam for his account'), talk('cover', 'bstrat', 'Arrange cover for the supplies'), talk('watch', 'watch', 'Ask Town Watch to compare accounts'), talk('report', 'bstrat', 'Compare the two accounts with Bstrat')], 'Ask Adam what he assumed. Arrange cover with Bstrat, then a short meeting with Town Watch. Explain the mismatch to Bstrat.', 'Bstrat has an explicit invitation for Rowan.'),
    quest(Q.STAY, 'An Answer for a Friend', 'bstrat', Q.NAME, [visit('Forest'), talk('rowan', 'rowan', 'Relay the invitation and ask Rowan for his answer'), visit('Town'), talk('report', 'bstrat', 'Report Rowan\'s answer to Bstrat')], 'Take Bstrat\'s invitation north to Rowan. Ask for his answer, then return to Bstrat.', 'Rowan wants to share terrible tea with his friend again.'),
    quest(Q.SHORE_SPACE, 'Clear a Little Space', 'jimi', Q.MESSENGER, [{id: 'crabs', label: 'Defeat two new crabs on Beach', eventType: 'KILL_MOB', target: E.CRAB, amount: 2, area: {x: 0, y: 254, width: 93, height: 58}}, talk('report', 'jimi', 'Report back to Jimi')], 'Two crabs along Beach are enough. Stay on the ordinary roads.', 'Jimi thanks you for a little breathing room.'),
    {...quest(Q.SPARE_WOOD, 'Wood for Tomorrow', 'adam', Q.SHORE, [visit('Forest'), {id: 'collect', label: 'Collect two new wood after entering Forest', eventType: 'LOOT_ITEM', target: E.WOOD, amount: 2}, deliver('adam', 2)], 'Visit Forest, collect two new wood, then take them to Adam. Wood collected elsewhere after the visit also counts.', 'Adam thanks you for replenishing his supplies.'), needToReturn: false, returnToNpc: undefined}
];
function progress(data = {}) {
    const completed = id => require('../js/quests/queststate').completed(data, id);
    if (!completed('LANTERN_INVITATION')) return 'Finish the Lantern Picnic with Adam, Town Watch and Bstrat first.';
    if (completed(Q.STAY)) return 'Rowan accepted. Visit him on the southern Forest path to recall your conversation.';
    const next = quests.slice(0, 6).find(q => !completed(q.id));
    const started = (data.quests?.IN_PROGRESS || []).some(q => (q.questKey || q.id) === next.id);
    const giver = Object.entries(actors).find(([, actor]) => actor.npc === next.npc)?.[0];
    return next.name + ': ' + (started ? next.startText : 'Speak to ' + ({bstrat: 'Bstrat', rowan: 'Rowan', adam: 'Adam'}[giver]) + ' to begin.');
}
module.exports = {ids, choices, actors, quests, progress};
