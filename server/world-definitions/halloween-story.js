const Types = require('../../shared/js/gametypes');
const {availability} = require('./halloween-season');
const {placements} = require('./halloween-actors');

// Stable IDs preserve personal progress and rewards when the season returns.
const INTRO = 'HALLOWEEN_WELCOME';
const SHADOW = 'HALLOWEEN_MISSING_SHADOW';
const GRAVEDIGGER = 'HALLOWEEN_SECOND_GRAVEDIGGER';
const WELL = 'HALLOWEEN_WHISPERING_WELL';
const choices = {
    welcome: 'halloween:welcome', trail: 'halloween:shadow-trail', shadow: 'halloween:shadow-freed',
    left: 'halloween:mara-testimony', right: 'halloween:rowan-testimony', memorial: 'halloween:memorial-read',
    gravedigger: 'halloween:rowan-remembered', heard: 'halloween:well-heard', keepsake: 'halloween:locket-found', returned: 'halloween:locket-returned'
};
const choice = value => ({if: 'choice_made', choice: value});
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
const talkObjective = (id, key, label) => ({id, label, eventType: 'NPC_TALKED', target: npc(key).kind, npcKey: npc(key).key, amount: 1});
const quest = (id, name, startText, endText, extra) => ({id, name, mapId: 'main', npc: npc('witch').kind,
    eventType: 'NPC_TALKED', target: 'FLOW', amount: 1, level: 1, requiredLevel: 1, dialogueOnly: true,
    needToReturn: true, returnToNpc: npc('witch').kind, availability, startText, endText, ...extra});
const quests = [
    quest(INTRO, 'Halloween: Something Is Wrong With the Village',
        'Meet the witch beside the village road and offer to investigate the hauntings.',
        'The witch has given you ten gold for your first brew. Choose any of her three mysteries.',
        {requiredChoices: [choices.welcome], reward: {item: Types.Entities.GOLD, amount: 10}}),
    quest(SHADOW, 'Halloween: The Missing Shadow',
        'Inspect the abandoned shoes west of the witch and follow the dark trail farther west to the suspicious pumpkin, free Adam\'s shadow, then report to the witch.',
        'Adam\'s shadow is home. Three pumpkins are yours; one pumpkin and five gold buy Bottled Midnight at the cauldron.',
        {requiredQuest: INTRO, requiredChoices: [choices.trail, choices.shadow], reward: {item: Types.Entities.M88NPUMPKIN, amount: 3},
            inProgressText: 'Free the trapped shadow by turning the pumpkin away from the lantern, then report to the witch.',
            objectives: [talkObjective('trail', 'footprints', 'Inspect the abandoned shoes west of the witch.'),
                talkObjective('pumpkin', 'pumpkin', 'Inspect the pumpkin at the end of the trail, then free the shadow and report to the witch.')]}),
    quest(GRAVEDIGGER, 'Halloween: The Second Gravedigger',
        'Speak to both pale gravediggers by the notice board east of the market, read the inscription, and tell the witch which one is a ghost.',
        'Rowan remembers his own memorial. Six pieces of wood will fuel a few bowls of Graveyard Stew.',
        {requiredQuest: INTRO, ordered: false, requiredChoices: [choices.left, choices.right, choices.memorial, choices.gravedigger],
            inProgressText: 'Compare the two accounts with the memorial and tell the witch which gravedigger is the ghost.',
            reward: {item: Types.Entities.WOOD, amount: 6}, objectives: [
                talkObjective('mara', 'gravedigger-left', 'Hear Mara by the notice board east of the market.'),
                talkObjective('rowan', 'gravedigger-right', 'Hear Rowan, standing to the right of Mara.'),
                talkObjective('memorial', 'memorial', 'Read the nearby memorial, then identify the ghost to the witch.')]}),
    quest(WELL, 'Halloween: The Whispering Well',
        'Listen to the well by the south-west fountain, find the locket on the path south of the market, return it to the spirit, and report to the witch.',
        'The well remembers a lullaby instead of names. Three pieces of ore will brew Borrowed Courage.',
        {requiredQuest: INTRO, requiredChoices: [choices.heard, choices.keepsake, choices.returned], reward: {item: Types.Entities.ORE, amount: 3},
            inProgressText: 'Return the locket to the voice in the well, then tell the witch what happened.',
            objectives: [talkObjective('listen', 'well', 'Listen to the well by the south-west fountain.'),
                talkObjective('locket', 'keepsake', 'Find the lost locket on the path south of the market.'),
                talkObjective('return', 'well', 'Lower the locket into the well, then report to the witch.')]})
];
function dialogue(key, start, nodes, resumeConditions = []) {
    const actor = npc(key);
    return {npc: actor.kind, key: actor.key, name: actor.name, availability, start, nodes, resume_conditions: resumeConditions};
}
const graveEvidence = [open(GRAVEDIGGER), choice(choices.left), choice(choices.right), choice(choices.memorial), unfinished(GRAVEDIGGER)];
const dialogues = [
    dialogue('witch', 'welcome', {
        welcome: {text: 'Ordinary Adam has misplaced his shadow. Two gravediggers are arguing over one job. And the well knows everybody\'s secrets. I am almost certain none of this is my fault. Will you investigate?',
            options: [option('I will help settle the hauntings.', 'accept-intro'), option('Perhaps later.', 'later')]},
        'accept-intro': {text: 'Excellent. These mysteries are yours to solve at your own pace. My cauldron stays until November 8, UTC. Take ten gold for a first brew once we have agreed to begin.',
            actions: [handout(INTRO)], options: [option('Let us begin.', 'finish-intro', open(INTRO))]},
        'finish-intro': {text: 'Ten gold, as promised. Start with Adam\'s shadow for an easy keepsake, or choose whichever mystery catches your eye.',
            actions: [record(choices.welcome, open(INTRO)), finish(INTRO)], options: [option('Show me the mysteries.', 'hub')]},
        hub: {text: 'Three hauntings, one unreliable cauldron. What would you like to investigate?', options: [
            option('Ordinary Adam\'s missing shadow.', 'shadow-case'), option('The two gravediggers.', 'grave-case'),
            option('The whispering well.', 'well-case'), option('Browse the cauldron recipes.', 'cauldron'), option('I will look around.', 'later')]},
        'shadow-case': {text: 'Adam still goes about his usual business, but his shadow has wandered off. Inspect the abandoned shoes west of my cauldron, then follow their dark trail farther west to the rattling pumpkin. It dislikes bright lanterns.',
            conditions: [{...completed(SHADOW), text: 'Adam\'s shadow is home thanks to you. One of your pumpkins and five gold will bottle a little midnight; the souvenir is yours to keep after Halloween.'}],
            options: [option('I will follow the shadow.', 'accept-shadow', notStarted(SHADOW)),
                option('I freed the shadow from the pumpkin.', 'finish-shadow', open(SHADOW), choice(choices.shadow), unfinished(SHADOW)),
                option('Back to the other mysteries.', 'hub')]},
        'accept-shadow': {text: 'Start with the abandoned shoes west of my cauldron. Follow their direction to the suspicious pumpkin and give the trapped shadow a dark place to escape.', actions: [handout(SHADOW)]},
        'finish-shadow': {text: 'There it goes, hurrying back to Adam! Take three pumpkins. One pumpkin and five gold make Bottled Midnight, a souvenir that will remain after my cauldron leaves.',
            actions: [finish(SHADOW)], options: [option('Show me the recipes.', 'cauldron'), option('Another mystery.', 'hub')]},
        'grave-case': {text: 'By the notice board east of the market, Mara on the left and Rowan on the right both claim to be the real gravedigger. This lantern light makes everyone look pale. Hear both accounts and read their memorial before deciding who is haunting us.',
            conditions: [{...completed(GRAVEDIGGER), text: 'Rowan remembers being the first gravedigger now. He can share his memories while Mara looks after the living village.'}],
            options: [option('I will compare their stories.', 'accept-grave', notStarted(GRAVEDIGGER)),
                option('I have read the evidence. Let me decide.', 'grave-decision', ...graveEvidence), option('Back to the other mysteries.', 'hub')]},
        'accept-grave': {text: 'Go to the notice board east of the market. Speak to Mara on the left, Rowan on the right, and the memorial just above them. The bell is newer than one of their stories.', actions: [handout(GRAVEDIGGER)]},
        'grave-decision': {text: 'Mara says she hung the bell last spring. Rowan insists there has never been a bell. The memorial names the first gravedigger, buried a hundred winters before it was hung. Who is the ghost?',
            options: [option('Rowan, on the right. His name is on the memorial.', 'finish-grave', ...graveEvidence),
                option('Mara, on the left. She looks very pale.', 'wrong-grave', ...graveEvidence), option('I will read the evidence again.', 'later')]},
        'wrong-grave': {text: 'That lantern makes both of them pale. The inscription is better evidence: which name was carved there a hundred winters before the bell?', options: [option('Let me reconsider.', 'grave-decision', ...graveEvidence)]},
        'finish-grave': {text: 'Rowan reads his own name and falls quiet. "A hundred winters late for my rounds? I suppose Mara has the job now." Mara thanks you with six pieces of wood for the cauldron.',
            actions: [record(choices.gravedigger, ...graveEvidence), finish(GRAVEDIGGER)], options: [option('Another mystery.', 'hub'), option('Browse the recipes.', 'cauldron')]},
        'well-case': {text: 'The well by the south-west fountain whispers names that nobody has told it. Listen without answering. A silver locket lies on the path south of the market; perhaps the spirit wants something remembered rather than something stolen.',
            conditions: [{...completed(WELL), text: 'The spirit has its locket and its lullaby back. The well may whisper for another visitor, but it remembers your kindness.'}],
            options: [option('I will listen to the well.', 'accept-well', notStarted(WELL)),
                option('I returned the locket to the spirit.', 'finish-well', open(WELL), choice(choices.returned), unfinished(WELL)), option('Back to the other mysteries.', 'hub')]},
        'accept-well': {text: 'Find the well beside the south-west fountain. Listen first, then look for a silver locket on the path south of the market, north-east of the well. Bring it back to the voice.', actions: [handout(WELL)]},
        'finish-well': {text: 'The well has traded its stolen names for a lullaby. Take three pieces of ore: the cauldron will turn each into a dose of Borrowed Courage with three gold.',
            actions: [finish(WELL)], options: [option('Browse the recipes.', 'cauldron'), option('Another mystery.', 'hub')]},
        cauldron: {text: 'Recipes: one pumpkin and five gold for Bottled Midnight; two wood and three gold for Graveyard Stew; one ore and three gold for Borrowed Courage. The clues were optional. The ingredients are not.',
            shop: {id: 'halloween-cauldron', name: 'The Unreliable Cauldron'}},
        later: {text: 'I will keep the cauldron warm. Inspect anything that looks suspicious, and come back when you want to talk.'}
    }, [resume('accept-intro', open(INTRO)), resume('hub', completed(INTRO))]),
    dialogue('footprints', 'trail', {
        trail: {text: 'A pair of empty shoes stands in the lantern light. Dark footprints lead farther west to a pumpkin, but nobody stands above them. One print is shaped exactly like Ordinary Adam\'s boot.',
            actions: [record(choices.trail, open(SHADOW))]}
    }),
    dialogue('pumpkin', 'pumpkin', {
        pumpkin: {text: 'The pumpkin rattles. A flat black hand taps against its lid whenever a lantern shines on it.', options: [
            option('Turn the pumpkin away from the lantern.', 'release', open(SHADOW), choice(choices.trail)),
            option('Demand that it stop rattling.', 'scold'), option('Leave it for now.', 'leave')]},
        release: {text: 'In the darkness, a shadow slips beneath the lid and hurries back toward Adam. The empty shell rests quietly again. Tell the witch what you found.',
            actions: [record(choices.shadow, open(SHADOW), choice(choices.trail))]},
        scold: {text: 'The pumpkin rattles more politely. The trapped shadow is still waiting for somewhere dark to escape.'},
        leave: {text: 'The rattling follows you for a moment, then stops.'},
        empty: {text: 'You already freed Adam\'s shadow. A tiny patch of darkness still curls inside the pumpkin, as though it is saving a place.'}
    }, [resume('empty', choice(choices.shadow))]),
    dialogue('gravedigger-left', 'testimony', {
        testimony: {text: 'I am Mara, the village gravedigger. I hung that brass bell last spring. Rowan keeps telling me it does not exist! In this lantern light we both look half-dead, but I have work in the morning.',
            actions: [record(choices.left, open(GRAVEDIGGER))]}
    }),
    dialogue('gravedigger-right', 'testimony', {
        testimony: {text: 'Rowan. The first and only gravedigger this village ever needed. A bell? Nonsense. There has never been a bell here. I remember every grave, though I never seem to read that memorial.',
            actions: [record(choices.right, open(GRAVEDIGGER))]},
        remembered: {text: 'Mara showed me the inscription after your visit. A hundred winters... I shall walk with the lanterns for a while. Perhaps I will finally learn when to stop working.'}
    }, [resume('remembered', completed(GRAVEDIGGER))]),
    dialogue('memorial', 'inscription', {
        inscription: {text: '"ROWAN, FIRST GRAVEDIGGER. Laid to rest one hundred winters before this bell was hung. May the living tend his garden, and may he finally rest." A fresh brass bell hangs above the old stone.',
            actions: [record(choices.memorial, open(GRAVEDIGGER))]}
    }),
    dialogue('well', 'whispers', {
        whispers: {text: 'The well whispers your name, then another, then a name nobody has spoken for years. Between them is a smaller voice: "My silver locket. My song. Where did they go?"',
            options: [option('Listen without giving it another name.', 'listen', open(WELL)), option('Step away.', 'leave')]},
        listen: {text: 'The voice remembers a silver locket lost on the path south of the market. "There is a lullaby inside. I borrowed names because I had forgotten my own song."',
            actions: [record(choices.heard, open(WELL))]},
        waiting: {text: '"The silver locket is close," whispers the well. Look on the path south of the market, north-east of here, then bring it back.'},
        return: {text: 'The locket hums the same tune as the voice below. The well has stopped calling strangers\' names.',
            options: [option('Lower the locket gently into the well.', 'restore', open(WELL), choice(choices.heard), choice(choices.keepsake)), option('Hold on to it a little longer.', 'leave')]},
        restore: {text: 'A hand of mist closes around the locket. A lullaby rises from the water, gentle and complete. Tell the witch that the spirit has its song back.',
            actions: [record(choices.returned, open(WELL), choice(choices.heard), choice(choices.keepsake))]},
        quiet: {text: 'The well sings a lullaby. For a moment, the lanterns seem to sway in time.'},
        leave: {text: 'You step back from the cold stone rim.'}
    }, [resume('waiting', choice(choices.heard)), resume('return', choice(choices.keepsake)), resume('quiet', choice(choices.returned))]),
    dialogue('keepsake', 'locket', {
        locket: {text: 'A silver locket rests between the stones. Its lid trembles with a tune too quiet to hear.', options: [
            option('Wrap the locket in a cloth and take it to the well.', 'take', open(WELL), choice(choices.heard)), option('Leave it where it is.', 'leave')]},
        take: {text: 'You lift the locket carefully. Return to the well and lower it toward the voice in the water.',
            actions: [record(choices.keepsake, open(WELL), choice(choices.heard))]},
        taken: {text: 'You have already found the spirit\'s locket. Return it to the well if you have not yet done so.'},
        leave: {text: 'The locket keeps its quiet tune.'}
    }, [resume('taken', choice(choices.keepsake))]),
    dialogue('procession-1', 'story', {story: {text: 'Late for the river again. I have followed these lanterns for a hundred nights and still never caught a single fish. Perhaps tomorrow.'}}),
    dialogue('procession-2', 'story', {story: {text: 'I used to play beside the village well. Tonight it knows a song I had forgotten. Walk with us a little; the lanterns always come around again.'}}),
    dialogue('procession-3', 'story', {story: {text: 'Boooo. Yes, those are definitely ghost feet beneath this sheet. No further questions. Have you tried the witch\'s stew?'}})
];

module.exports = {quests, dialogues, actors, choices, INTRO, SHADOW, GRAVEDIGGER, WELL};
