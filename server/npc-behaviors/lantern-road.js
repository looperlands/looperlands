// Production campaign, content version 1. Quest IDs and choice keys are save contracts.
// Every location is on main, including the existing door-connected interiors.
const Types = require('../../shared/js/gametypes');
const picnic = require('./lantern-picnic');
const conversations = require('./lantern-road-conversations');
const I = picnic.INVITE;
const at = (key, label, x, y, scene, result, extra = {}) => ({key, label, x, y, scene, result, type: 'inspect', ...extra});
const pick = (label, flag, response) => ({label, flag, response});
const quest = (id, chapter, name, npcKey, requiredQuests, reason, objectives, conclusion, extra = {}) => ({
    id: 'LANTERN_' + id, chapter, name, npcKey, requiredQuests, reason, objectives, conclusion,
    eventType: 'NPC_TALKED', target: 'FLOW', amount: 1, level: 1, medal: Types.Medals.TALK, dialogueOnly: true, ...extra
});
const npcs = [
    {key: 'town-gardener', kind: 'villager', label: 'Ordinary Adam', x: 37, y: 200, area: 'Town market and supply rounds', presence: 'I keep the bread and supplies ready while you carry news between the neighbours.'},
    {key: 'town-neighbour', kind: 'villagegirl', label: 'Bstrat515', x: 15, y: 222, area: 'Town market and neighbouring streets', presence: 'I keep in touch with the neighbours. An invitation only helps when people know it is meant for them.'},
    {key: 'town-watch', kind: 'guard', label: 'Town Watch', x: 73, y: 197, area: 'Town gate and market patrol', presence: 'I still have a gate to watch. A safe path helps, but I need a relief patrol before I can stay for a whole evening.'},
    {key: 'coastal-jimi', kind: 'beachnpc', label: 'Jimi', x: 76, y: 293, area: 'Beach', presence: "I stay by the landing to help the travellers. A little food and a friendly voice matter after a storm."},
    {key: 'mill-scientist', kind: 'scientist', label: "Windmill Caretaker", x: 127, y: 293, area: 'Windmill', presence: "I keep the grain dry and the bread baskets ready. Jimi’s visitors could use something warm to eat."},
    {key: 'forest-caretaker', kind: 'forestnpc', label: 'Mara, Trail Caretaker', x: 58, y: 176, area: 'Forest', presence: 'I stay on the trail because walkers still need a guide. I stopped sending invitations when no replies came back.', spawn: true},
    {key: 'town-priest', kind: 'priest', label: 'Vince', x: 18, y: 209, area: 'Town', presence: 'I keep the letters that people trusted me with. Sometimes the kindest thing is to make sure an answer reaches its friend.'},
    {key: 'desert-courier', kind: 'villagegirl', label: 'Nessa, Caravan Courier', x: 47, y: 94, area: 'Desert', presence: 'I am staying with the stranded caravan. I will not leave tired travellers or their supplies behind to chase a rumour.', spawn: true},
    {key: 'north-miner', kind: 'miner', label: 'Northern Miner', x: 106, y: 6, area: 'Lavaland', presence: "I watch the northern paths. Rowan used to guide visitors through here; I miss his stories."},
    {key: 'north-technician', kind: 'lavanpc', label: "Orin, Trail Guide", x: 97, y: 29, area: 'Lavaland', presence: "I keep watch over this stretch of the path. Rowan used to stop here for a drink and a story.", spawn: true},
    {key: 'lantern-keeper', kind: 'villager', label: 'Rowan, Lantern Keeper', x: 67, y: 378, area: 'Gauntlet', presence: "I thought the unanswered invitations meant nobody wanted my company. I have missed the neighbours.", spawn: true},
    {key: 'party-baker', kind: 'villager', label: 'Coastal Baker', x: 37, y: 449, area: 'Party beach', presence: 'I keep bread ready for visitors. The coast, forest and caravan all have something different to bring.', spawn: true},
    {key: 'party-trailguest', kind: 'villagegirl', label: 'Forest Neighbour', x: 43, y: 451, area: 'Party beach', presence: 'I leave room for the forest baskets. We used to miss each other because the invitations never arrived.', spawn: true},
    {key: 'party-lanternhand', kind: 'guard', label: 'Lantern Hand', x: 40, y: 453, area: 'Party beach', presence: 'I tend the landing lantern so visitors can find the table when they arrive.', spawn: true},
    {key: 'party-wildwill', kind: 'wildwill', label: 'Wild Will', x: 35, y: 463, area: 'Party beach', presence: 'I like a gathering where a visitor does not have to wonder where to sit. There is room beside us.'}
];

const presenceAfter = {
    'town-watch': {quest: 'LANTERN_WATCH_INVITED', text: 'Your relief volunteer covers the gate for the gathering, so I can stay for the evening. I still make my normal rounds between visits.'},
    'coastal-jimi': {quest: 'LANTERN_COAST_SIGNAL', text: "The travellers have bread and a clear approach because you helped. I keep an eye on the landing for the next visitor."},
    'mill-scientist': {quest: 'LANTERN_MILL_LIGHT', text: "The grain was dry, and you carried our bread to the shore. I am saving another batch for whoever comes next."},
    'forest-caretaker': {quest: 'LANTERN_STILL_WAITING', text: 'The lantern you placed lets me guide walkers safely. I keep the trail open while the news travels onward.'},
    'desert-courier': {quest: 'LANTERN_ROAD_WE_TAKE', text: 'You checked our chosen route, so I can keep the caravan supplies together for the next leg. Nobody has to be left behind.'},
    'north-technician': {quest: 'LANTERN_MISSING_REGULATOR', text: "You brought Rowan’s satchel back. I am keeping it ready in case my friend feels like walking with us again."},
    'lantern-keeper': {quest: 'LANTERN_LIGHT_SHARED', text: "You kept a place for me. I am trying to remember that keeping people safe can include letting them close."}
};
for (const npc of npcs) npc.presenceAfter = presenceAfter[npc.key];

const npcLocations = {
    "town-gardener": "the Town market by day, or the guesthouse east of the market after supper",
    "town-neighbour": "the Town market and western streets by day, or the guesthouse east of the market after supper",
    "town-watch": "the eastern Town gate and market, or the town hall beside the gate in the morning",
    "coastal-jimi": "the Beach landing on the eastern shore",
    "mill-scientist": "the old windmill, through the passage beside Town’s southern windmill",
    "forest-caretaker": "the southern Forest trail",
    "town-priest": "the western side of the Town market",
    "desert-courier": "the caravan camp in southern Desert",
    "north-miner": "the northern workings in Lavaland",
    "north-technician": "the southern Lavaland path",
    "lantern-keeper": "his resting place in the Gauntlet, through the keeper’s passage in northern Town",
    "party-baker": "the western end of the Party Beach long table",
    "party-trailguest": "the eastern end of the Party Beach long table",
    "party-lanternhand": "the lanterns at the Party Beach long table",
    "party-wildwill": "the southern Party Beach shore"
};
for (const npc of npcs) npc.location = npcLocations[npc.key];

const chapters = [
    {number: 1, name: 'The Lantern Picnic'},
    {number: 2, name: 'Letters from the Coast'},
    {number: 3, name: 'The Forest Still Remembers'},
    {number: 4, name: 'An Answer Kept Safe'},
    {number: 5, name: "The Parcel That Waited"},
    {number: 6, name: "An Old Friend in the North"},
    {number: 7, name: 'The Keeper of the Road'},
    {number: 8, name: 'The Long Table'}
];

const quests = [
    quest('WRECK_LETTERS', 2, 'Letters in the Wreckage', 'coastal-jimi', [I],
        "Adam saved an empty place at the picnic. Jimi remembers Rowan carrying invitations along the shore; a storm scattered the last pouch.",
        [at('letters', 'Recover the weathered invitation pouch', 53, 285, 'Beach',
            'The letters were addressed to the forest, desert and northern works. Nobody chose to abandon Town: the delivery never arrived.')],
        "Jimi recognises Rowan’s handwriting. The neighbours never received their invitations; the travellers on the shore could use some food and company.",
        {choices: [pick("Let us bring food to the travellers first.", 'lantern:coast-first', "I will keep the letters dry. Ask at the windmill for bread before we visit the shore."),
            pick("Let us check how the travellers are doing as well.", 'lantern:travellers-first', "Thank you. Ask at the windmill for bread, then visit their waiting place before leaving the basket.")]}),
    quest('MILL_LIGHT', 2, "Bread from the Windmill", 'mill-scientist', ['LANTERN_WRECK_LETTERS'],
        "The windmill has grain to spare for the travellers. Check that its stored grain stayed dry in the storm; the caretaker will pack fresh bread for the shore.",
        [at('receiver', "Check the windmill’s stored grain", 127, 295, 'Windmill', "The sack tucked inside the mill stayed dry. There is enough good grain to bake bread for the waiting travellers.")],
        "The caretaker packs a basket of bread into your satchel. Take it to Jimi’s visitors before continuing to Mara in the forest."),
    quest('COAST_SIGNAL', 2, "A Welcome on the Shore", 'coastal-jimi', ['LANTERN_MILL_LIGHT'],
        "Carry the windmill’s bread to the waiting place on Beach. Clear two crabs from the approach, and keep the promise you made about visiting the travellers.",
        [at('travellers', 'Check the stranded travellers\' waiting place', 61, 263, 'Beach', 'The travellers have water and a safe waiting place. They ask you to pass their invitations onward.',
            {when: 'lantern:travellers-first'}),
         at('relay', "Leave the bread basket at the shore waiting place", 57, 260, 'Beach', "You set down the basket where the travellers gather. A folded invitation in the pouch names Mara on the Forest trail.")],
        "Jimi’s visitors have food and a safe approach. He asks you to carry the undelivered invitations to Mara in the forest."),
    quest('FOREST_MARKERS', 3, 'Follow the Old Markers', 'forest-caretaker', [I],
        "Mara tends the forest paths, but stopped sending invitations when no replies came. Walk between the old trail markers before deciding what the silence meant.",
        [at('south', 'Read the southern trail marker', 43, 176, 'Forest', 'The scratched arrow still points toward Town.'),
         at('north', 'Read the northern trail marker', 34, 150, 'Forest', "A keeper’s knot is tied around the branch. Rowan used it to mark paths that needed extra care.")],
        "Mara recognises Rowan’s knot. Someone left a warning on the old path, rather than forgetting the neighbours."),
    quest('KEEPER_KNOTS', 3, "The Keeper’s Knots", 'forest-caretaker', ['LANTERN_FOREST_MARKERS'],
        "Mara recognises Rowan’s knot. Look for the warning he left beside the eastern forest trail while she stays to guide the walkers.",
        [at('relay', "Read the note tied beside the eastern trail", 74, 154, 'Forest', "A note tied to the branch says: \"Keep them away until the north is safe.\" Rowan signed it with his keeper’s knot.")],
        "Rowan was trying to keep his friends away from danger, but never explained the warning. Mara gives you a lantern for the walkers who still use the trail."),
    quest('STILL_WAITING', 3, 'Someone Is Still Waiting', 'forest-caretaker', ['LANTERN_KEEPER_KNOTS'],
        'Mara has kept the last returning courier\'s satchel in a sheltered cache. Recover the route ledger and leave a fresh lantern beside the marker.',
        [at('ledger', 'Recover the forest route ledger', 38, 158, 'Forest', 'The ledger records a failed rescue near the graveyard and a delivery that continued into the desert.'),
         at('lantern', 'Set a lantern at the southern marker', 43, 176, 'Forest', 'Mara\'s path now has a light. She can guide neighbours without pretending the missing courier has returned.')],
        "Mara offers forest berries for the next picnic. Take the courier’s ledger and Jimi’s rescued invitations to Vince in Town."),
    quest('STONE_NAMES', 4, 'Three Names on the Stone', 'town-priest', ['LANTERN_COAST_SIGNAL', 'LANTERN_STILL_WAITING'],
        'Vince compares the coastal letters with Mara\'s ledger. The archive keeps the letters that never reached their friends.',
        [at('names', 'Read the three names on the memorial', 47, 128, 'Graveyard', 'The stone names Elian, Sera and Tomas. Elian was Rowan\'s friend; the two couriers died trying to reopen the route.')],
        'Vince asks you to distinguish grief from blame. Rowan\'s silence followed a loss, rather than a quarrel with Town.'),
    quest('UNDELIVERED_LETTER', 4, 'An Answer Kept Safe', 'town-priest', ['LANTERN_STONE_NAMES'],
        'Vince kept a friendly letter for Rowan in the old archive. Recover it through the Graveyard entrance and carry its answer onward.',
        [at('letter', 'Find Elian\'s letter in the crypt archive', 124, 112, 'Crypt archive',
            'Elian wrote: "If I do not return, let the road stay open. A light is useful because someone else can find it." The letter never reached Rowan.')],
        'Vince entrusts the friendly letter to you. Nessa in the Desert could use a hand before you take it to Rowan.',
        {choices: [pick('Let us remember them together. Explain the names to visitors.', 'lantern:public-memorial', 'I will explain the memorial names with care. Their loss deserves company, not blame.'),
            pick('Let us keep the memorial quiet. I will carry the letter privately.', 'lantern:private-memorial', 'I will keep Elian\'s personal words private. A small lantern can still mark the loss.')]}),
    quest('MISSING_LIGHT', 4, 'A Light for the Missing', 'town-priest', ['LANTERN_UNDELIVERED_LETTER'],
        'The memorial is for the people who did not return. Vince packed a memorial lantern for you. Clear two skeletons from the Graveyard paths, then place that lantern at the memorial.',
        [at('memorial', 'Light the memorial lantern', 47, 128, 'Graveyard', 'A steady lantern marks the names. You can carry Elian\'s wish onward without making the memorial a spectacle.')],
        'Vince found Nessa\'s caravan address in the ledger. She is waiting in the southern desert with the last delivery.'),
    quest('EMPTY_LANTERNS', 5, "Tracks in the Sand", 'desert-courier', ['LANTERN_MISSING_LIGHT'],
        "Nessa stays with the tired caravan. Wind has covered parts of the trail; walk past both markers north of camp and tell her whether everyone can follow them.",
        [at('south', "Find the southern caravan marker", 50, 90, 'Desert', "Sand covers the lower marks, but the scratched arrow still points north."),
         at('north', "Find the northern caravan marker", 53, 72, 'Desert', "The second marker carries Rowan’s knot and a warning to turn back. Nessa did not invent the danger.")],
        "The markers are half buried, but the route can still be followed. Nessa wants to know why Rowan asked the caravan to turn back."),
    quest('LAST_DELIVERY', 5, "The Parcel That Waited", 'desert-courier', ['LANTERN_EMPTY_LANTERNS'],
        "Nessa kept a parcel and Rowan’s last note among the caravan supplies. Recover the box before choosing a route that works for the travellers.",
        [at('dispatch', "Recover the caravan’s waiting parcel", 57, 88, 'Desert', "The box contains a patched travelling cloak and a note: \"Do not follow me north. I need to know you are safe.\" Rowan’s satchel was left with the miners.")],
        "The box holds Rowan’s old travelling cloak and a request to stay back. Nessa asks whether to use the sheltered detour or the direct road.",
        {choices: [pick('Let us take the sheltered detour so the tired travellers can rest.', 'lantern:caravan-detour', "I will gather everyone at the eastern shelter and bring our spare lantern oil. Check the detour before we set out."),
            pick("Let us use the direct road for the loaded pack animals.", 'lantern:caravan-direct', "I will keep the packs together on the central road. Check its footing before we set out.")]}),
    quest('ROAD_WE_TAKE', 5, 'The Road We Take', 'desert-courier', ['LANTERN_LAST_DELIVERY'],
        "Nessa will follow the route you chose. Walk it yourself so she can bring the tired travellers and their packs along with confidence.",
        [at('detour', 'Mark the sheltered eastern detour', 64, 77, 'Desert', 'The sheltered route is marked. Tired travellers can rest while their supplies continue north.', {when: 'lantern:caravan-detour'}),
         at('direct', "Walk the central direct road", 44, 77, 'Desert', "The central road has firm footing for the loaded packs. Nessa can bring the travellers together.", {when: 'lantern:caravan-direct'})],
        "Nessa prepares the caravan for your chosen route. Ask the Northern Miner in Lavaland whether he remembers Rowan coming through."),
    quest('HEAT_WITHOUT_LIGHT', 6, "An Old Friend in the North", 'north-miner', ['LANTERN_ROAD_WE_TAKE'],
        "The Northern Miner remembers Rowan guiding visitors through Lavaland. Ask Orin farther down the path what became of their friend, then bring his answer back.",
        [at('vent', "Ask Orin what happened to Rowan", 91, 28, 'Lavaland', "Orin: Rowan used to carry a patched satchel on every walk. After the rescue he left it with us and stopped visiting. I wish I had asked him to stay.")],
        "Rowan left his travelling satchel behind after the rescue. Orin remembers where it was stored and wants his old friend to have it back."),
    quest('MISSING_REGULATOR', 6, "The Keeper’s Satchel", 'north-technician', ['LANTERN_HEAT_WITHOUT_LIGHT'],
        "Orin kept Rowan’s satchel in the northern store beyond Lavaland’s existing door. Recover it and hand it back to Orin; he can check that it belongs to his friend.",
        [at('regulator', "Recover Rowan’s patched travelling satchel", 151, 65, 'Boss', "The strap carries Rowan’s keeper’s knot. Inside are a worn map and a little tin cup from the journeys he used to enjoy."),
         at('fit', "Return the satchel to Orin", 91, 28, 'Lavaland', "Orin: That is his, right down to the crooked stitching. I will keep it ready for him. Read the note he left before you ask him to come home.")],
        "Orin recognises Rowan’s patched satchel and packs it for his return. There are still people in the north who want to see him again."),
    quest('ROWAN_PROTECTED', 6, "What Rowan Left Behind", 'north-technician', ['LANTERN_MISSING_REGULATOR'],
        "Orin asks you to read the note Rowan left on the northern trail. Understand why he withdrew before asking him to return to the neighbours.",
        [at('record', "Read Rowan’s note on the northern trail", 101, 16, 'Lavaland', "Rowan wrote: \"I know the path by heart. I cannot bear to lead another friend into danger.\" Beneath it he named his resting place in the Gauntlet.")],
        "Rowan has been staying in the Gauntlet since the rescue. Take Elian’s letter through the keeper’s passage in northern Town and hear his side of the story."),
    quest('OLD_DEFENCES', 7, 'Through the Old Defences', 'lantern-keeper', ['LANTERN_ROWAN_PROTECTED'],
        "Rowan is sheltering among the Gauntlet ruins. Defeat two death knights on the approach, recover his walking staff and read the worn carving near his resting place.",
        [at('switch', "Recover Rowan’s old walking staff", 67, 373, 'Gauntlet', "The staff is worn smooth where Rowan held it. He once led neighbours along these paths rather than staying here alone."),
         at('log', "Read the carving by Rowan’s resting place", 73, 375, 'Gauntlet', "The worn words say: \"Wait here for the others.\" Rowan has been keeping that promise alone since the rescue.")],
        "Rowan recognises his old staff. You reached him and listened to his warning; now he is ready to hear news from the people he misses."),
    quest('KEEPER_CHOICE', 7, 'The Keeper\'s Choice', 'lantern-keeper', ['LANTERN_OLD_DEFENCES'],
        'Rowan mistook the unanswered invitations for rejection. Hand him his friend’s letter and give him room to choose how to reconnect.',
        [at('letter', "Hand Elian’s letter to Rowan", 68, 378, 'Gauntlet', 'Rowan reads the words slowly: "A light is useful because someone else can find it." He finally understands why you came.')],
        'Rowan wants to see his friends again. He can resume their walks or take things slowly; either way there is a place for him at the table.',
        {choices: [pick('You could keep the road with the communities sharing your watch.', 'lantern:rowan-keeper', 'I would like that. I can keep the light without keeping everyone away. Save me a place at the long table.'),
            pick('You could teach new keepers, then rest and choose your own future.', 'lantern:rowan-handover', 'Then I will teach Orin and Mara. After that... I would like to rest. Could you save me a quiet place at the table?')]}),
    quest('LIGHT_SHARED', 7, "A Place Kept for You", 'lantern-keeper', ['LANTERN_KEEPER_CHOICE'],
        "Rowan has read Elian’s letter and chosen his own future. Speak to him once more with a personal invitation from the neighbours.",
        [at('controls', "Invite Rowan to the long table", 69, 378, 'Gauntlet', "Rowan: You kept a place for me all this time? Tell Adam I would like to come. I had forgotten what it felt like to be expected.")],
        "Rowan accepts a place at the gathering. Tell Bstrat the neighbours are ready to hear from each other again."),
    quest('RETURNED_INVITATIONS', 8, 'The Invitations Returned', 'town-neighbour', ['LANTERN_LIGHT_SHARED'],
        'Bstrat has prepared invitations along the restored road. Deliver them to the communities that helped you, so they know this invitation is meant for them.',
        [at('coast', 'Deliver the coastal invitation to Jimi', 76, 293, 'Beach', "Jimi: The travellers are fed and the shore is safe. Tell Bstrat I will bring sea-salt bread."),
         at('forest', 'Deliver the forest invitation to Mara', 58, 176, 'Forest', 'Mara: You kept our path open. I would like to come. Tell Bstrat I will bring forest berries.'),
         at('desert', 'Deliver the caravan invitation to Nessa', 47, 94, 'Desert', 'Nessa: Our route is ready because of your choice. I will come with the caravan supplies we agreed on.'),
         at('north', 'Deliver the northern invitation to Orin', 97, 29, 'Lavaland', "Orin: Rowan knows we want him back. I can spare an evening too. Tell Bstrat I will bring blankets for the table.")],
        'Bstrat has replies from every region. Adam is gathering the contributions at the Party Beach long table.'),
    quest('BRING_WITH_US', 8, 'What We Bring With Us', 'town-gardener', ['LANTERN_RETURNED_INVITATIONS'],
        'Adam remembers how you solved the basket problem. This time each region has something to share at the Party Beach gathering.',
        [at('table', 'Arrange the contributions at the long table', 40, 450, 'Party beach', 'Bread, forest berries and desert lanterns fill the long table. There is room for the northern keepers and the neighbours who helped the watch.')],
        'Adam sends word to Wild Will at Party Beach. The long table is ready, and Rowan\'s place is no longer forgotten.'),
    quest('LONG_TABLE', 8, 'The Long Table', 'party-wildwill', ['LANTERN_BRING_WITH_US'],
        'The neighbours gather at Party Beach. Join the lanterns at the long table and tell Wild Will what it feels like to be expected.',
        [at('gather', 'Join the lanterns at the long table', 40, 450, 'Party beach', 'Bread, berries, fruit and blankets fill the long table. The neighbours remember your invitations, your caravan route and Rowan’s choice.')],
        'The Lantern Road remains open. You can revisit the people you helped or finish optional stories; your choices stay with this character.'),

    quest('WATCH_RELIEF', 2, 'The Watch\'s Night Off: A Relief Patrol', 'town-watch', [I],
        'The watch could only stay briefly at the first picnic because nobody covered the gate. Find a neighbour willing to take a relief round.',
        [at('relief', 'Ask Bstrat to arrange a relief volunteer', 73, 201, 'Town', 'A relief volunteer agrees to cover the gate when the watch attends the long table.')],
        'The watch can plan a full evening off once the relief route is prepared.', {optional: true}),
    quest('WATCH_ROUND', 3, 'The Watch\'s Night Off: Mark the Round', 'town-watch', ['LANTERN_WATCH_RELIEF'],
        'The volunteer needs a safe, clear route rather than a promise that nothing will happen.',
        [at('market', 'Mark the market relief stop', 43, 210, 'Town', 'The market stop is marked for the relief patrol.'),
         at('forest', 'Mark the southern forest relief stop', 40, 190, 'Forest', 'The southern forest stop connects the relief route to the gate.')],
        'The relief volunteer knows exactly where the watch usually checks.', {optional: true}),
    quest('WATCH_INVITED', 8, 'The Watch\'s Night Off: A Whole Evening', 'town-watch', ['LANTERN_WATCH_ROUND', 'LANTERN_LIGHT_SHARED'],
        'With the road restored and the relief route marked, the watch can accept a whole evening at the long table.',
        [at('rota', 'Confirm the evening relief rota with Bstrat', 73, 201, 'Town', 'The volunteer takes the rota. The watch can attend without abandoning the gate.')],
        'The watch will stay for the whole gathering because you arranged real relief.', {optional: true}),
    quest('MISSING_MESSAGES', 4, 'Those Who Couldn\'t Come: Messages', 'town-priest', ['LANTERN_MISSING_LIGHT'],
        'Vince asks for messages from families along the road. Their absence deserves an explanation rather than an empty place nobody mentions.',
        [at('family', 'Ask Vince for the families’ messages', 46, 120, 'Graveyard', 'The family asks for a lantern beside the table, without speeches about their private grief.')],
        'Vince keeps the message with care and asks you to check the desert family next.', {optional: true}),
    quest('MISSING_KEEPSAKES', 5, 'Those Who Couldn\'t Come: Keepsakes', 'desert-courier', ['LANTERN_MISSING_MESSAGES', 'LANTERN_ROAD_WE_TAKE'],
        'A caravan family cannot travel to the gathering. Nessa asks you to carry a keepsake rather than pressure them to attend.',
        [at('keepsake', 'Collect the caravan\'s small keepsake lantern', 57, 88, 'Desert', 'The family sends a small lantern and thanks you for respecting their decision to stay.')],
        'Nessa packs the keepsake safely. Vince can help you make a place for it at the table.', {optional: true}),
    quest('MISSING_PLACES', 8, 'Those Who Couldn\'t Come: Places Kept', 'town-priest', ['LANTERN_MISSING_KEEPSAKES', 'LANTERN_LIGHT_SHARED'],
        'The messages and keepsakes explain the empty places. Honour those wishes at the table instead of treating attendance as the only kind of belonging.',
        [at('place', 'Set the keepsake lantern at the long table', 42, 450, 'Party beach', 'A small lantern keeps a place for the families. Their private messages remain private.')],
        'The gathering has a quiet place for the people who could not come.', {optional: true}),
    quest('WILL_SHORE', 2, 'Wild Will\'s Place: The Shore', 'party-wildwill', [I],
        'Wild Will remembers the sea creature that took his crew. He will consider the gathering if the approach feels safe for visiting neighbours.',
        [at('shore', 'Mark the Party Beach landing', 47, 439, 'Party beach', 'The landing is clearly marked. Visiting neighbours can find a safe place to arrive.')],
        'Wild Will appreciates the practical help. A keepsake from the old beach may help him explain why company still feels difficult.', {optional: true}),
    quest('WILL_KEEPSAKE', 4, 'Wild Will\'s Place: The Crew\'s Keepsake', 'party-wildwill', ['LANTERN_WILL_SHORE'],
        'Will asks for a recovered keepsake from the shore. He wants to remember the crew without making new neighbours carry the blame for his loneliness.',
        [at('keepsake', 'Recover the crew\'s weathered cup', 68, 288, 'Beach', 'The cup carries the crew\'s mark. It is a keepsake, not a promise that the sea will give them back.')],
        'Will agrees to save a place for new company while remembering his crew.', {optional: true}),
    quest('WILL_NEIGHBOUR', 8, 'Wild Will\'s Place: A New Neighbour', 'party-wildwill', ['LANTERN_WILL_KEEPSAKE', 'LANTERN_LIGHT_SHARED'],
        'Will wants Jimi to know that the long table has room for him too. Carry a personal invitation back along the coast.',
        [at('invite', 'Deliver Wild Will\'s invitation to Jimi', 76, 293, 'Beach', 'Jimi: Will saved a chair for me? Tell him yes. I am glad he asked.')],
        'Will and Jimi will share a place at the gathering because you carried that invitation.', {optional: true}),
    quest('SPARK_TRAINING', 6, "A Small Gift: What to Bring", 'north-technician', ['LANTERN_MISSING_REGULATOR'],
        "Orin wants to bring a personal gift. Ask Bstrat what would make the neighbours feel welcome, rather than guessing what they need.",
        [at('practice', "Ask Bstrat about a gift for the neighbours", 79, 250, 'Town · Fight Night practice post', "Bstrat: A familiar thing would be lovely. Orin’s old copper lantern used to stand by the evening baskets. I would like to see it again.")],
        "Bstrat remembers an old copper lantern. Orin knows where it was stored, and asks if you would fetch it for the table.", {optional: true}),
    quest('SPARK_TOOL', 7, "A Small Gift: An Old Copper Lantern", 'north-technician', ['LANTERN_SPARK_TRAINING'],
        "Orin’s old copper lantern is in Megamag, through the existing northern Lavaland entrance. Its guarded approach is an optional trip for a keepsake.",
        [at('tool', "Recover the old copper lantern from Megamag", 155, 166, 'Megamag', "The copper is tarnished, but the handle still has Orin’s little keeper’s knot. He can polish it for the gathering.")],
        "Orin polishes the old lantern for the table. The gift matters because Bstrat remembers it from evenings with the neighbours.", {optional: true})
];

// Mechanics use the same durable objective keys as the first campaign preview.
// Collected story items are personal: another player cannot take a quest parcel.
const mechanics = {
    WRECK_LETTERS: {letters: {type: 'collect', item: 'invitation-pouch'}},
    COAST_SIGNAL: {travellers: {type: 'visit'}, relay: {type: 'deliver', items: ['mill-connector']}},
    FOREST_MARKERS: {south: {type: 'visit'}, north: {type: 'visit'}},
    STILL_WAITING: {ledger: {type: 'collect', item: 'route-ledger'}, lantern: {type: 'deliver', items: ['trail-lantern']}},
    UNDELIVERED_LETTER: {letter: {type: 'collect', item: 'elian-letter'}},
    MISSING_LIGHT: {memorial: {type: 'deliver', items: ['memorial-lantern']}},
    EMPTY_LANTERNS: {south: {type: 'visit'}, north: {type: 'visit'}},
    LAST_DELIVERY: {dispatch: {type: 'collect', item: 'dispatch-box'}},
    ROAD_WE_TAKE: {detour: {type: 'visit'}, direct: {type: 'visit'}},
    HEAT_WITHOUT_LIGHT: {vent: {type: 'talk', npcKey: 'north-technician', playerLine: 'The miner remembers you walking with Rowan. What became of him?'}},
    MISSING_REGULATOR: {regulator: {type: 'collect', item: 'regulator'}, fit: {type: 'talk', npcKey: 'north-technician', items: ['regulator'], playerLine: 'This satchel has Rowan’s mark on the strap. Is it his?'}},
    OLD_DEFENCES: {switch: {type: 'collect', item: 'keeper-staff'}},
    LIGHT_SHARED: {controls: {type: 'talk', npcKey: 'lantern-keeper', playerLine: 'Adam kept your place at the table. Will you come?'}},
    SPARK_TRAINING: {practice: {type: 'talk', npcKey: 'town-neighbour', playerLine: 'Orin would like to bring a gift. What would the neighbours enjoy?'}},
    KEEPER_CHOICE: {letter: {type: 'talk', npcKey: 'lantern-keeper', items: ['elian-letter'], playerLine: 'Vince entrusted this letter to me. Elian wanted you to read it.'}},
    RETURNED_INVITATIONS: {
        coast: {type: 'talk', npcKey: 'coastal-jimi', playerLine: 'Bstrat asked me to invite you. Will you come to the long table?'},
        forest: {type: 'talk', npcKey: 'forest-caretaker', playerLine: 'This invitation is for you, Mara. We kept a place for the forest neighbours.'},
        desert: {type: 'talk', npcKey: 'desert-courier', playerLine: 'There is a place for the caravan at the long table. Would you join us?'},
        north: {type: 'talk', npcKey: 'north-technician', playerLine: 'Rowan heard our invitation. Would you bring something to share at the table too?'}
    },
    BRING_WITH_US: {table: {type: 'deliver', items: ['coastal-bread', 'forest-berries', 'caravan-supplies', 'northern-lanterns']}},
    LONG_TABLE: {gather: {type: 'visit'}},
    WATCH_RELIEF: {relief: {type: 'talk', npcKey: 'town-neighbour', playerLine: 'The watch needs a night off. Could you arrange someone to cover the gate?'}},
    WATCH_ROUND: {market: {type: 'visit'}, forest: {type: 'visit'}},
    WATCH_INVITED: {rota: {type: 'talk', npcKey: 'town-neighbour', playerLine: 'The relief route is ready. Can your volunteer take this evening’s round?'}},
    MISSING_MESSAGES: {family: {type: 'talk', npcKey: 'town-priest', playerLine: 'Have the families said how they would like us to remember the missing?'}},
    MISSING_KEEPSAKES: {keepsake: {type: 'collect', item: 'family-lantern'}},
    MISSING_PLACES: {place: {type: 'deliver', items: ['family-lantern']}},
    WILL_SHORE: {shore: {type: 'visit'}},
    WILL_KEEPSAKE: {keepsake: {type: 'collect', item: 'crew-cup'}},
    WILL_NEIGHBOUR: {invite: {type: 'talk', npcKey: 'coastal-jimi', playerLine: 'Will saved you a chair beside him. He would like you to come.'}},
    SPARK_TOOL: {tool: {type: 'collect', item: 'precision-tool'}}
};
const extraObjectives = {
    COAST_SIGNAL: at('crabs', "Defeat two crabs along the Beach approach", 50, 262, 'Beach', "The shore approach is safer for the waiting travellers.",
        {type: 'kill', mob: Types.Entities.CRAB, amount: 2, area: {x: 5, y: 259, width: 94, height: 40}, where: "Along the northern Beach shore near the waiting place."}),
    MISSING_LIGHT: at('skeletons', 'Defeat two skeletons around the Graveyard paths', 47, 128, 'Graveyard', 'The mourners can reach the memorial more safely.',
        {type: 'kill', mob: Types.Entities.SKELETON, amount: 2, area: {x: 5, y: 108, width: 94, height: 34}, where: 'On the Graveyard paths around the memorial and crypt entrance.'}),
    OLD_DEFENCES: at('guards', "Defeat two death knights on the Gauntlet approach", 70, 373, 'Gauntlet', "The approach to Rowan’s resting place is clear of the old defenders.",
        {type: 'kill', mob: Types.Entities.DEATHKNIGHT, amount: 2, area: {x: 5, y: 370, width: 94, height: 38}, where: "On the Gauntlet approach beyond the keeper’s passage."})
};
// A short friendship story spans the existing world. Retired preview quests
// stay registered only to preserve and finish saves; new players never get them.
const mainStory = ['WRECK_LETTERS', 'FOREST_MARKERS', 'UNDELIVERED_LETTER', 'ROAD_WE_TAKE',
    'MISSING_REGULATOR', 'KEEPER_CHOICE', 'RETURNED_INVITATIONS', 'BRING_WITH_US', 'LONG_TABLE'];
const mainPrerequisites = [picnic.BASKET, picnic.SAFETY, I];
for (const q of quests) {
    const key = q.id.slice(8);
    q.archived = !mainStory.includes(key);
    q.optional = q.archived;
    q.requiredQuests = q.archived ? [] : [...mainPrerequisites];
    if (!q.archived) mainPrerequisites.push(q.id);
    for (const o of q.objectives) Object.assign(o, mechanics[key]?.[o.key]);
    const extra = key === 'WRECK_LETTERS' ? {...extraObjectives.COAST_SIGNAL} : extraObjectives[key];
    if (extra) q.objectives.push(extra);
    if (key === 'WRECK_LETTERS' || key === 'UNDELIVERED_LETTER') delete q.choices;
    if (key === 'ROAD_WE_TAKE') q.startChoices = [
        pick('Take the sheltered detour and give everyone time to rest.', 'lantern:caravan-detour', 'I will gather the caravan at the eastern shelter.'),
        pick('Take the direct road together with the loaded packs.', 'lantern:caravan-direct', 'I will keep the packs together on the central road.')];
    if (key === 'KEEPER_CHOICE') q.choices = [
        pick('Walk the old rounds with your friends again, when you feel ready.', 'lantern:rowan-keeper', 'I would like that. Save me a place; I will start with one friendly visit.'),
        pick('Take things slowly. Share the paths you know, and rest when you need to.', 'lantern:rowan-handover', 'Thank you. I can tell Mara and Orin about the paths without rushing. Please save me a quiet place.')];
}
const storyItems = [
    {key: 'keeper-staff', name: 'Rowan’s old walking staff', from: ['OLD_DEFENCES', 'switch'], spent: ['OLD_DEFENCES']},
    {key: 'invitation-pouch', name: 'Weathered invitation pouch', from: ['WRECK_LETTERS', 'letters'], spent: ['WRECK_LETTERS']},
    {key: 'mill-connector', name: "Windmill’s bread basket", from: ['MILL_LIGHT'], spent: ['COAST_SIGNAL', 'relay']},
    {key: 'route-ledger', name: 'Forest route ledger', from: ['STILL_WAITING', 'ledger'], spent: ['STONE_NAMES']},
    {key: 'trail-lantern', name: 'Mara’s fresh trail lantern', from: ['KEEPER_KNOTS'], spent: ['STILL_WAITING', 'lantern']},
    {key: 'elian-letter', name: 'Elian’s undelivered letter', from: ['UNDELIVERED_LETTER', 'letter'], spent: ['KEEPER_CHOICE', 'letter']},
    {key: 'memorial-lantern', name: 'Vince’s memorial lantern', from: ['UNDELIVERED_LETTER'], spent: ['MISSING_LIGHT', 'memorial']},
    {key: 'dispatch-box', name: 'Caravan dispatch box', from: ['LAST_DELIVERY', 'dispatch'], spent: ['LAST_DELIVERY']},
    {key: 'regulator', name: "Rowan’s patched travelling satchel", from: ['MISSING_REGULATOR', 'regulator'], spent: ['MISSING_REGULATOR', 'fit']},
    {key: 'coastal-bread', name: 'Jimi’s sea-salt bread', from: ['RETURNED_INVITATIONS', 'coast'], spent: ['BRING_WITH_US', 'table']},
    {key: 'forest-berries', name: 'Mara’s forest berries', from: ['RETURNED_INVITATIONS', 'forest'], spent: ['BRING_WITH_US', 'table']},
    {key: 'caravan-supplies', name: 'Nessa’s caravan supplies', from: ['RETURNED_INVITATIONS', 'desert'], spent: ['BRING_WITH_US', 'table']},
    {key: 'northern-lanterns', name: "Orin’s picnic blankets", from: ['RETURNED_INVITATIONS', 'north'], spent: ['BRING_WITH_US', 'table']},
    {key: 'family-lantern', name: 'Family keepsake lantern', from: ['MISSING_KEEPSAKES', 'keepsake'], spent: ['MISSING_PLACES', 'place']},
    {key: 'crew-cup', name: 'Crew’s weathered cup', from: ['WILL_KEEPSAKE', 'keepsake'], spent: ['WILL_KEEPSAKE']},
    {key: 'precision-tool', name: "Orin’s old copper lantern", from: ['SPARK_TOOL', 'tool'], spent: ['SPARK_TOOL']}
];

for (const q of quests) {
    const npc = npcs.find(npc => npc.key === q.npcKey);
    q.dialogue = conversations[q.id];
    for (const objective of q.objectives) objective.where ||= q.dialogue.where[objective.key];
    for (const objective of q.objectives.filter(o => o.npcKey)) {
        const target = npcs.find(npc => npc.key === objective.npcKey);
        objective.x = target.x; objective.y = target.y;
        objective.where = "Speak to " + target.label + " at " + target.location + ".";
    }
    q.npc = Types.getKindFromString(npc.kind);
    q.requiredQuest = q.requiredQuests[0];
    q.startText = q.reason;
    q.endText = q.conclusion;
}
const objectiveFlag = (q, objective, count) => 'lantern:objective:' + q.id + ':' + objective.key + (count ? ':' + count : '');
// Personal, server-authorised passages into otherwise inaccessible main-map rooms.
// Existing cross-map and event portals are left intact.
const passages = [
    {id: 'old-mill', label: 'Enter the old windmill', x: 39, y: 243, tx: 127, ty: 298, requires: I},
    {id: 'mill-return', label: 'Return from the old windmill to Town', x: 127, y: 298, tx: 39, ty: 243, requires: I},
    {id: 'crypt-archive', label: 'Enter the crypt archive', x: 64, y: 126, tx: 127, ty: 119, requires: 'LANTERN_FOREST_MARKERS'},
    {id: 'crypt-return', label: 'Return from the archive to the graveyard', x: 127, y: 119, tx: 64, ty: 126, requires: 'LANTERN_FOREST_MARKERS'},
    {id: 'keeper-room', label: 'Enter the keeper\'s Gauntlet passage', x: 35, y: 200, tx: 71, ty: 372, requires: 'LANTERN_MISSING_REGULATOR'},
    {id: 'keeper-return', label: 'Return from the keeper\'s passage to Town', x: 71, y: 372, tx: 35, ty: 200, requires: 'LANTERN_MISSING_REGULATOR'}
];
const gatheringRoutines = npcs.filter(n => n.key.startsWith('party-') && n.spawn).map((n, index) => ({
    key: n.key, kind: n.kind, label: n.label, origin: {x: n.x, y: n.y},
    preset: 'socialise', area: {x: 5, y: 429, width: 94, height: 49}, stepMs: 650 + index * 50,
    route: [{x: n.x, y: n.y, waitSeconds: 15, activity: 'making room for the neighbours'},
        {x: n.x, y: n.y + 1, waitSeconds: 20, activity: 'checking the gathering supplies'}],
    lines: {greeting: ['Welcome. We are making room for anyone who comes along the lantern road.'],
        talk: ['We gather here so neighbours from different parts of the island can find each other.']}
}));
const gatheringConversation = {cooldownSeconds: 120, steps: [
    {npc: 'party-baker', text: 'The bread is ready. Leave a little room for the forest baskets too.'},
    {npc: 'party-trailguest', text: 'I brought berries. We never used to know when the coastal neighbours were coming.'},
    {npc: 'party-lanternhand', text: 'I will keep a lantern by the landing so visitors can find us.'},
    {npc: 'party-baker', text: 'A long table is useful when people can actually reach it.'},
    {npc: 'party-trailguest', text: 'And when they know they are invited.'},
    {npc: 'party-lanternhand', text: 'Then let us keep a place open for the next neighbour.'}
]};
const regionalConversations = [
    {cooldownSeconds: 160, hours: [6, 18], steps: [
        {npc: 'party-baker', text: 'Should we use one big cloth, or leave gaps between the baskets?'},
        {npc: 'party-trailguest', text: 'Leave a gap. Someone always arrives with one more basket than we expected.'},
        {npc: 'party-baker', text: 'Good point. I will keep the end of the table clear.'}
    ]},
    {cooldownSeconds: 150, hours: [16, 19], steps: [
        {npc: 'town-gardener', text: 'Bstrat, shall we stop by the market before supper?'},
        {npc: 'town-neighbour', text: 'Only if you promise to sit down for a while. You have been on your feet all day.'},
        {npc: 'town-gardener', text: 'All right. You pick the bench; I will bring something to eat.'}
    ]},
    {cooldownSeconds: 180, hours: [19, 24], steps: [
        {npc: 'town-watch', text: 'Last round before the night shift. Are your baskets packed?'},
        {npc: 'town-gardener', text: 'Nearly. Leave some bread for the neighbour covering the early shift.'},
        {npc: 'town-watch', text: 'I will. Nobody patrols well on an empty stomach.'}
    ]}
];
module.exports = {version: 1, chapters, npcs, quests, storyItems, objectiveFlag, passages, gatheringRoutines, gatheringConversation, regionalConversations};
