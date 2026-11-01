const Types = require('../../shared/js/gametypes');
const {availability} = require('./halloween-season');
const {placements} = require('./halloween-actors');

// Stable IDs preserve personal progress and rewards when the season returns.
const INTRO = 'HALLOWEEN_WELCOME';
const SHADOW = 'HALLOWEEN_MISSING_SHADOW';
const GRAVEDIGGER = 'HALLOWEEN_SECOND_GRAVEDIGGER';
const WELL = 'HALLOWEEN_WHISPERING_WELL';
// Keep saved IDs stable even where the visible prop names have been clarified.
const choices = {
    welcome: 'halloween:welcome', trail: 'halloween:shadow-trail', shadow: 'halloween:shadow-freed',
    left: 'halloween:mara-testimony', right: 'halloween:rowan-testimony', memorial: 'halloween:memorial-read',
    gravedigger: 'halloween:rowan-remembered', heard: 'halloween:well-heard', keepsake: 'halloween:locket-found', returned: 'halloween:locket-returned'
};
const choice = value => ({if: 'choice_made', choice: value});
const unchosen = value => ({if_not: 'choice_made', choice: value});
const completed = quest => ({if: 'quest_completed', quest});
const open = quest => ({if: 'quest_open', quest});
const unfinished = quest => ({if_not: 'quest_completed', quest});
const notStarted = quest => ({if_not: 'quest_open', quest});
const option = (text, goto, ...conditions) => ({text, goto, conditions});
const resume = (goto, ...conditions) => ({goto, conditions});
const record = (value, ...conditions) => ({type: 'record_choice', choice: value, conditions});
const handout = quest => ({type: 'handout_quest', quest});
const finish = quest => ({type: 'complete_quest', quest});
const actors = placements.map(({key, kind, label}) => ({key, kind: Types.getKindFromString(kind), name: label}));
const npc = key => actors.find(actor => actor.key === 'halloween:' + key);
const talkObjective = (id, key, label, ...requiredChoices) => ({id, label, eventType: 'NPC_TALKED', target: npc(key).kind, npcKey: npc(key).key, amount: 1, requiredChoices});
const quest = (id, name, startText, endText, extra) => ({id, name, mapId: 'main', npc: npc('witch').kind,
    eventType: 'NPC_TALKED', target: 'FLOW', amount: 1, level: 1, requiredLevel: 1, dialogueOnly: true,
    needToReturn: true, returnToNpc: npc('witch').kind, availability, startText, endText, ...extra});
const quests = [
    quest(INTRO, 'Halloween: Something Is Wrong With the Village',
        'Meet Whispy beside the Town notice board and offer to investigate the hauntings.',
        'The witch has given you ten gold for your first brew. Choose any of her three mysteries.',
        {requiredChoices: [choices.welcome], reward: {item: Types.Entities.GOLD, amount: 10}}),
    quest(SHADOW, 'Halloween: The Missing Shadow',
        'Cross the northern river bridge into the Forest. Inspect the red shoes beside the main road, then follow it north to the fork. Take the west (left) path to the pumpkin by the campfire, south of the tent. Free Adam\'s shadow and report to Whispy.',
        'Adam\'s shadow is home. Three pumpkins are yours; one pumpkin and five gold buy Bottled Midnight at the cauldron.',
        {requiredQuest: INTRO, requiredChoices: [choices.trail, choices.shadow], reward: {item: Types.Entities.M88NPUMPKIN, amount: 3},
            inProgressText: 'The shadow is free. Return to Whispy beside the Town notice board and tell her what happened.',
            objectives: [talkObjective('trail', 'footprints', 'Cross the northern river bridge into the Forest and inspect the red shoes beside the main road.', choices.trail),
                talkObjective('pumpkin', 'pumpkin', 'Follow the road north to the fork, then take the west (left) path. Find the pumpkin by the campfire south of the tent and give its shadow somewhere dark to escape.', choices.shadow)]}),
    quest(GRAVEDIGGER, 'Halloween: The Second Gravedigger',
        'Travel north through the Forest into the Graveyard. Find two white-sheeted gravediggers between the northern wooden crypts, west of the main road. Hear both, read the purple burial register above them, and tell Whispy which one is a ghost.',
        'Rowan remembers his own burial. Six pieces of wood will fuel a few bowls of Graveyard Stew.',
        {requiredQuest: INTRO, ordered: false, requiredChoices: [choices.left, choices.right, choices.memorial, choices.gravedigger],
            inProgressText: 'Compare the two accounts with the burial register and tell Whispy which gravedigger is the ghost.',
            reward: {item: Types.Entities.WOOD, amount: 6}, objectives: [
                talkObjective('mara', 'gravedigger-left', 'Go north through the Forest into the Graveyard. Hear Mara, the left-hand figure between the northern wooden crypts, west of the main road.', choices.left),
                talkObjective('rowan', 'gravedigger-right', 'Hear Rowan, standing to the right of Mara.', choices.right),
                talkObjective('memorial', 'memorial', 'Read the purple burial register just above the gravediggers, then return to Whispy and identify the ghost.', choices.memorial, choices.gravedigger)]}),
    quest(WELL, 'Halloween: The Whispering Well',
        'Go south from Town to the Beach shoreline. Listen to the green basin just east (right) of the central palm. Find the blue-stoned ring beneath the western shoreline palm, return it to the basin, and report to Whispy.',
        'The well remembers a lullaby instead of names. Three pieces of ore will brew Borrowed Courage.',
        {requiredQuest: INTRO, requiredChoices: [choices.heard, choices.keepsake, choices.returned], reward: {item: Types.Entities.ORE, amount: 3},
            inProgressText: 'The spirit has its ring and song back. Return to Whispy beside the Town notice board and report what happened.',
            objectives: [talkObjective('listen', 'well', 'Go south from Town to the Beach shoreline. Inspect the green basin just east (right) of the central palm and choose to listen.', choices.heard),
                talkObjective('locket', 'keepsake', 'Follow the shoreline west (left) to the blue-stoned ring beneath the western palm. Choose to take it.', choices.keepsake),
                talkObjective('return', 'well', 'Follow the shoreline east (right) back to the green basin beside the central palm and choose to lower the ring into it.', choices.returned)]})
];
function dialogue(key, start, nodes, resumeConditions = []) {
    const actor = npc(key);
    return {npc: actor.kind, key: actor.key, name: actor.name, availability, start, nodes, resume_conditions: resumeConditions};
}
const graveEvidence = [open(GRAVEDIGGER), choice(choices.left), choice(choices.right), choice(choices.memorial), unfinished(GRAVEDIGGER)];
const dialogues = [
    dialogue('witch', 'welcome', {
        welcome: {text: 'Adam\'s shadow has fled into the Forest. Two gravediggers are arguing in the Graveyard. And the old well is whispering secrets from the Beach. I am almost certain none of this is my fault. Will you investigate?',
            options: [option('I will help settle the hauntings.', 'accept-intro'), option('Perhaps later.', 'later')]},
        'accept-intro': {text: 'Excellent. These mysteries are yours to solve at your own pace. My cauldron stays until November 8, UTC. Take ten gold for a first brew once we have agreed to begin.',
            actions: [handout(INTRO)], options: [option('Let us begin.', 'finish-intro', open(INTRO))]},
        'finish-intro': {text: 'Ten gold, as promised. Start with Adam\'s shadow for an easy keepsake, or choose whichever mystery catches your eye.',
            goto: 'hub', actions: [record(choices.welcome, open(INTRO)), finish(INTRO)], options: [option('Show me the mysteries.', 'hub')]},
        hub: {text: 'Three hauntings, one unreliable cauldron. Choose a mystery for directions or to report your findings. Or try a recipe!', options: [
            option('Ordinary Adam\'s missing shadow.', 'shadow-case'), option('The two gravediggers.', 'grave-case'),
            option('The whispering well.', 'well-case'), option('Browse the cauldron recipes.', 'cauldron')]},
        'shadow-case': {text: 'Adam\'s shadow has wandered into the Forest. Cross the northern river bridge and inspect the red shoes beside the main road. Continue north to the fork, then take the west (left) path to a whispering pumpkin by the campfire south of the tent. Shadows need somewhere dark to hide.',
            conditions: [{...choice(choices.shadow), text: 'You freed Adam\'s shadow. Tell me what happened using the response below, and I will give you your reward.'},
                {...completed(SHADOW), text: 'Adam\'s shadow is home thanks to you. One of your pumpkins and five gold will bottle a little midnight; the souvenir is yours to keep after Halloween.'}],
            options: [option('I will follow the shadow.', 'accept-shadow', notStarted(SHADOW)),
                option('I freed the shadow from the pumpkin.', 'finish-shadow', open(SHADOW), choice(choices.shadow), unfinished(SHADOW)),
                option('Back to the other mysteries.', 'hub')]},
        'accept-shadow': {text: 'Cross the northern river bridge into the Forest. Inspect the red shoes beside the main road, then follow it north to the fork. Take the west (left) path to the pumpkin by the campfire south of the tent. Free the shadow, then return to me at the Town notice board and choose Adam\'s mystery to report it.', actions: [handout(SHADOW)]},
        'finish-shadow': {text: 'There it goes, hurrying back to Adam! Take three pumpkins. One pumpkin and five gold make Bottled Midnight, a souvenir that will remain after my cauldron leaves.',
            goto: 'hub', actions: [finish(SHADOW)], options: [option('Show me the recipes.', 'cauldron'), option('Another mystery.', 'hub')]},
        'grave-case': {text: 'Travel north through the Forest into the Graveyard. Between the northern wooden crypts, west of the main road, Mara and Rowan both claim to be the living gravedigger. Their sheets match, but one is a real ghost. Hear both stories and read the purple burial register just above them.',
            conditions: [{...completed(GRAVEDIGGER), text: 'Rowan remembers being the first gravedigger now. He can share his memories while Mara looks after the living village.'}],
            options: [option('I will compare their stories.', 'accept-grave', notStarted(GRAVEDIGGER)),
                option('I have read the evidence. Let me decide.', 'grave-decision', ...graveEvidence), option('Back to the other mysteries.', 'hub')]},
        'accept-grave': {text: 'Go north through the Forest into the Graveyard. Find the two white-sheeted figures between the northern wooden crypts, west of the main road. Hear Mara on the left and Rowan on the right, then read the purple book above them. Compare what they remember about the Town notice board and bring your answer back to me there.', actions: [handout(GRAVEDIGGER)]},
        'grave-decision': {text: 'Mara says she put up the Town notice board last spring. Rowan insists Town has never had one. The burial register records Rowan\'s death a hundred winters ago. Who is the ghost?',
            options: [option('Rowan, on the right. The register records his burial.', 'finish-grave', ...graveEvidence),
                option('Mara, on the left. She looks very pale.', 'wrong-grave', ...graveEvidence), option('I will read the evidence again.', 'later')]},
        'wrong-grave': {text: 'A white sheet could be a costume. Think about the purple book: whose burial does its old entry record? That person cannot still be the living gravedigger.', options: [option('Let me reconsider.', 'grave-decision', ...graveEvidence)]},
        'finish-grave': {text: 'Rowan reads his own name and falls quiet. "A hundred winters late for my rounds? I suppose Mara has the job now." Mara thanks you with six pieces of wood for the cauldron.',
            goto: 'hub', actions: [record(choices.gravedigger, ...graveEvidence), finish(GRAVEDIGGER)], options: [option('Another mystery.', 'hub'), option('Browse the recipes.', 'cauldron')]},
        'well-case': {text: 'The old well\'s voice now bubbles from a green basin on the Beach. Go south from Town to the shoreline; the basin is just east (right) of the central palm. Choose to listen first. The sea has washed its blue-stoned ring ashore beneath the western palm.',
            conditions: [{...choice(choices.returned), text: 'You returned the ring. Tell me what happened using the response below, and I will give you your reward.'},
                {...completed(WELL), text: 'The spirit has its ring and its lullaby back. The well may whisper for another visitor, but it remembers your kindness.'}],
            options: [option('I will listen to the well.', 'accept-well', notStarted(WELL)),
                option('I returned the ring to the spirit.', 'finish-well', open(WELL), choice(choices.returned), unfinished(WELL)), option('Back to the other mysteries.', 'hub')]},
        'accept-well': {text: 'Go south from Town to the Beach shoreline. Find the small green basin just east (right) of the central palm and choose to listen. Follow its directions to the ring, then bring it back to the basin. Return to me at the Town notice board and choose this mystery to report what happened.', actions: [handout(WELL)]},
        'finish-well': {text: 'The well has traded its stolen names for a lullaby. Take three pieces of ore: the cauldron will turn each into a dose of Borrowed Courage with three gold.',
            goto: 'hub', actions: [finish(WELL)], options: [option('Browse the recipes.', 'cauldron'), option('Another mystery.', 'hub')]},
        cauldron: {text: 'One pumpkin and five gold make Bottled Midnight, a keepsake. Two wood and three gold make Graveyard Stew, which heals you. One ore and three gold make Borrowed Courage, which softens melee blows. Solve the hauntings for ingredients, or bring your own.',
            shop: {id: 'halloween-cauldron', name: 'The Unreliable Cauldron'}},
        later: {text: 'I will keep the cauldron warm. Inspect anything that looks suspicious, and come back when you want to talk.'}
    }, [resume('accept-intro', open(INTRO)), resume('hub', completed(INTRO))]),
    dialogue('footprints', 'trail', {
        trail: {text: 'The red shoes have no shadow. Adam\'s name is stitched inside. A note in one toe reads: "Pumpkin by the campfire, south of the tent." Follow the road north to the fork, then west (left). Could his shadow be trapped in that pumpkin?',
            conditions: [{...notStarted(SHADOW), text: 'Someone left red shoes with Adam\'s name inside, but they cast no shadow. Ask Whispy, the witch beside the Town notice board, about Adam\'s missing shadow before investigating.'}],
            actions: [record(choices.trail, open(SHADOW))]}
    }),
    dialogue('pumpkin', 'pumpkin', {
        pumpkin: {text: 'The pumpkin rattles. A flat black hand taps against its lid whenever the campfire\'s light catches it. The shadow inside is looking for darkness.',
            conditions: [{...unchosen(choices.trail), text: 'A flat black hand taps beneath the lid. Inspect the red shoes first: follow this path east to the main road, then south toward the river bridge. They lie beside the road just north of the bridge.'},
                {...notStarted(SHADOW), text: 'The pumpkin rattles as if something is trapped inside. Ask Whispy, the witch beside the Town notice board, about Adam\'s missing shadow.'}], options: [
            option('Turn the pumpkin away from the campfire.', 'release', open(SHADOW), choice(choices.trail)),
            option('Demand that it stop rattling.', 'scold'), option('Leave it for now.', 'leave')]},
        release: {text: 'In the darkness, a shadow slips beneath the lid and hurries back toward Adam. The empty shell rests quietly again. Tell the witch what you found.',
            actions: [record(choices.shadow, open(SHADOW), choice(choices.trail))]},
        scold: {text: 'The pumpkin rattles more politely. The trapped shadow is still waiting for somewhere dark to escape.'},
        leave: {text: 'The rattling follows you for a moment, then stops.'},
        empty: {text: 'You already freed Adam\'s shadow. A tiny patch of darkness still curls inside the pumpkin, as though it is saving a place.'}
    }, [resume('empty', choice(choices.shadow))]),
    dialogue('gravedigger-left', 'testimony', {
        testimony: {text: 'I am Mara, the living village gravedigger. This sheet is my Halloween costume! I put up the Town notice board last spring, yet Rowan insists it has never existed. Check the purple burial register just north of us; somebody has forgotten something.',
            conditions: [{...notStarted(GRAVEDIGGER), text: 'I am Mara, and this sheet is my Halloween costume. Rowan also claims to be the living gravedigger. Ask Whispy beside the Town notice board about the two gravediggers; then come back to compare our stories.'}],
            actions: [record(choices.left, open(GRAVEDIGGER))]},
        thanks: {text: 'Thank you for helping Rowan remember. I can get back to work, and he can tell me about the village he knew. I am keeping the costume until Halloween ends.'}
    }, [resume('thanks', completed(GRAVEDIGGER))]),
    dialogue('gravedigger-right', 'testimony', {
        testimony: {text: 'Rowan. The first and only living gravedigger this village ever needed. A notice board in Town? Nonsense. Town has never had one. I remember every grave, though I never seem to read that purple register.',
            conditions: [{...notStarted(GRAVEDIGGER), text: 'Rowan, the village gravedigger. Mara says the same thing, does she? Ask Whispy beside the Town notice board about the two gravediggers, then hear us both.'}],
            actions: [record(choices.right, open(GRAVEDIGGER))]},
        remembered: {text: 'Mara showed me the old entry after your visit. A hundred winters... I shall watch the lanterns from here and share what I remember. Mara can take the living village\'s rounds.'}
    }, [resume('remembered', completed(GRAVEDIGGER))]),
    dialogue('memorial', 'inscription', {
        inscription: {text: 'The purple book is a burial register. An entry dated a hundred winters ago reads: "ROWAN, village gravedigger, laid to rest today." A recent note records the Town notice board going up last spring. Tell Whispy which account fits these records.',
            conditions: [{...notStarted(GRAVEDIGGER), text: 'This purple book records the village\'s burials. An old entry names Rowan, the gravedigger. Ask Whispy beside the Town notice board about the two gravediggers before drawing a conclusion.'}],
            actions: [record(choices.memorial, open(GRAVEDIGGER))]}
    }),
    dialogue('well', 'whispers', {
        whispers: {text: 'Names bubble from the small green basin above the sound of the waves. The voice echoes as if it comes from a well far below: "My ring with the blue stone. Our song. Where did they go?"',
            conditions: [{...notStarted(WELL), text: 'The green basin bubbles with strangers\' names. Whispy, the witch beside the Town notice board, may know why. Ask her about the whispering well, then come back and listen.'}],
            options: [option('Listen without giving it another name.', 'listen', open(WELL)), option('Step away.', 'leave')]},
        listen: {text: '"The sea washed my ring ashore beneath the western palm. Follow the shoreline west (left) from this basin. Our lullaby lingers in its blue stone. I borrowed names because I had forgotten our song. Please bring it back."',
            actions: [record(choices.heard, open(WELL))]},
        waiting: {text: '"My blue-stoned ring is close," whispers the well. Follow the shoreline west (left) to the foot of the western palm. Inspect the ring and choose to take it, then bring it east (right) back here.'},
        return: {text: 'The ring hums the same tune as the voice below. The whispering pauses in recognition. The spirit is waiting for you to lower the ring into the green basin.',
            options: [option('Lower the ring gently into the basin.', 'restore', open(WELL), choice(choices.heard), choice(choices.keepsake)), option('Hold on to it a little longer.', 'leave')]},
        restore: {text: 'A hand of mist closes around the ring. The stolen names fall silent and a lullaby rises from the water, gentle and complete. Return to Whispy and tell her the spirit has its song back.',
            actions: [record(choices.returned, open(WELL), choice(choices.heard), choice(choices.keepsake))]},
        quiet: {text: 'The well sings a lullaby through the green basin. You returned the ring. If you have not reported back yet, tell Whispy beside the Town notice board.'},
        leave: {text: 'You step back from the cold rim. The voice is still waiting.'}
    }, [resume('waiting', choice(choices.heard)), resume('return', choice(choices.keepsake)), resume('quiet', choice(choices.returned))]),
    dialogue('keepsake', 'locket', {
        locket: {text: 'The sea has left a ring at the foot of the palm. A tiny melody seems to come from its bright blue gem.',
            conditions: [{...unchosen(choices.heard), text: 'The ring\'s blue gem hums faintly. First choose to listen to the well\'s voice: follow the shoreline east (right) to the green basin beside the central palm. It may tell you who owns this ring.'},
                {...notStarted(WELL), text: 'A ring with a blue stone hums faintly. Ask Whispy, the witch beside the Town notice board, about the whispering well before taking it.'}], options: [
            option('Wrap the ring in a cloth and take it to the well.', 'take', open(WELL), choice(choices.heard)), option('Leave it where it is.', 'leave')]},
        take: {text: 'You wrap the ring safely in the cloth. It stays with you for this haunting; you do not need to equip it. Follow the shoreline east (right) back to the green basin beside the central palm and choose to lower the ring into it.',
            actions: [record(choices.keepsake, open(WELL), choice(choices.heard))]},
        taken: {text: 'The spirit\'s ring is wrapped safely in your cloth. Follow the shoreline east (right) back to the green basin beside the central palm and choose to lower it in.'},
        returned: {text: 'You returned the ring to the spirit. Only a few familiar notes linger here. Tell Whispy about it if you have not reported back yet.'},
        leave: {text: 'The ring keeps its quiet tune.'}
    }, [resume('taken', choice(choices.keepsake)), resume('returned', choice(choices.returned))]),
    dialogue('procession-1', 'story', {story: {text: 'Late for the river again. I have followed this road for a hundred nights and still never caught a single fish. Perhaps tomorrow. If you seek the hauntings, find Whispy beside the Town notice board.'}}),
    dialogue('procession-2', 'story', {story: {text: 'I used to play beside the village well. Tonight it knows a song I had forgotten. Walk with us a little; the lanterns always come around again.'}}),
    dialogue('procession-3', 'story', {story: {text: 'Boooo. Yes, those are definitely ghost feet beneath this sheet. No further questions. Have you tried the witch\'s stew?'}})
];

const StoryText = require('./halloween-text');
const defaultTexts = Object.freeze(StoryText.getEntries(quests, dialogues).map(Object.freeze));
StoryText.apply(quests, dialogues, require('./halloween-content').event.textOverrides);

module.exports = {quests, dialogues, actors, choices, INTRO, SHADOW, GRAVEDIGGER, WELL, defaultTexts};
