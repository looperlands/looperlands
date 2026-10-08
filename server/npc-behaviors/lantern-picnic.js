// Stable production prologue. Never rename these IDs: later chapters resume
// from LANTERN_INVITATION, including saves made before the campaign was released.
const Types = require('../../shared/js/gametypes');
const base = require('./main.json');
const BASKET = 'LANTERN_BASKET';
const SAFETY = 'LANTERN_PATH';
const INVITE = 'LANTERN_INVITATION';
const RETURN = 'lantern:return-basket';
const SHARE = 'lantern:share-basket';
const FOUND = 'lantern:found-basket';
const QUIET = 'lantern:quiet-picnic';
const MUSIC = 'lantern:music-picnic';
const choice = value => ({if: 'choice_made', choice: value});
const completed = value => ({if: 'quest_completed', quest: value});
const open = value => ({if: 'quest_open', quest: value});
const resume = (goto, ...conditions) => ({goto, conditions});
const option = (text, goto, ...conditions) => ({text, goto, conditions});
const record = value => ({type: 'record_choice', choice: value});
const handout = value => ({type: 'handout_quest', quest: value});
const finish = value => ({type: 'complete_quest', quest: value});
const enoughRats = {if: 'killed_mob', mob: Types.Entities.RAT, amount: 3};

const quests = [
    {id: BASKET, name: 'The Lantern Picnic: A Borrowed Basket', npc: Types.Entities.VILLAGER,
        eventType: 'NPC_TALKED', target: 'FLOW', amount: 1, level: 1,
        startText: 'Ask Bstrat515 why she borrowed Adam\'s basket. Choose a solution, then report to Adam.',
        endText: 'You helped Adam and Bstrat agree on the basket.'},
    {id: SAFETY, name: 'The Lantern Picnic: A Safe Path', npc: Types.Entities.GUARD,
        eventType: 'KILL_MOB', target: Types.Entities.RAT, amount: 3, level: 1,
        requiredQuest: BASKET, needToReturn: true, returnToNpc: Types.Entities.GUARD,
        startText: 'Defeat three rats, then tell Town Watch the path is safe. Earlier rat kills count too.',
        endText: 'Town Watch can watch the gate while the neighbours prepare the picnic.'},
    {id: INVITE, name: 'The Lantern Picnic: Everyone Is Invited', npc: Types.Entities.VILLAGEGIRL,
        eventType: 'NPC_TALKED', target: 'FLOW', amount: 1, level: 1, requiredQuest: SAFETY,
        startText: 'Visit Bstrat515. Choose a quiet picnic or a picnic with music, and invite Town Watch.',
        endText: 'The invitation is ready. The neighbours will remember how you helped.'}
];

const dialogues = [
    {npc: Types.Entities.VILLAGER, name: 'Ordinary Adam', start: 'welcome',
        resume_conditions: [resume('waiting', open(BASKET)), resume('report', open(BASKET), choice(FOUND)),
            resume('path', completed(BASKET)), resume('safe', completed(SAFETY)), resume('thanks', completed(INVITE))],
        nodes: {
            welcome: {text: ['I am gathering supplies for tonight\'s lantern picnic. That is why I keep walking between my house and the market.',
                'Bstrat borrowed my basket. I need it for bread, but she may have a good reason. Would you ask her?'],
                options: [option('I will help you sort out the basket.', 'accept'), option('Tell me about your rounds.', 'rounds'), option('Maybe later.', 'later')]},
            rounds: {text: ['First I check the market, then water the plants, then rest by the path.',
                'The picnic gives me a reason to make these rounds. When you click me, I stop because I am listening to you.'], goto: 'welcome'},
            later: {text: 'No hurry. I will keep checking the supplies. Come back when you feel like helping.'},
            accept: {text: ['Thank you. Find Bstrat515 near the market or along the western path by day. After supper, she is in the guesthouse east of the market.',
                'Ask about the basket. You can ask her to return it, or suggest we share it. Then come back and tell me what you agreed.'], actions: [handout(BASKET)]},
            waiting: {text: 'You offered to ask Bstrat about my basket. I have not heard her answer yet. She visits the market and the western path by day. After supper, look in the guesthouse east of the market.'},
            report: {text: 'You found Bstrat! What did you agree?', options: [
                option('She will return your basket after unpacking the blankets.', 'returned', choice(RETURN)),
                option('Share the basket: blankets first, bread afterwards.', 'shared', choice(SHARE))]},
            returned: {text: ['Bstrat sent word that you asked her to return it. That works: I can pack the bread while she lays out the blankets.',
                'I will remember that you helped us agree. Next, speak to Town Watch about the rats near the picnic path.'], actions: [finish(BASKET)]},
            shared: {text: ['Bstrat told me you suggested sharing it. Good idea. I will wait until she has unpacked the blankets before filling it with bread.',
                'I will remember your compromise. Next, speak to Town Watch about the rats near the picnic path.'], actions: [finish(BASKET)]},
            path: {text: 'The basket is sorted because you spoke to Bstrat. Town Watch still needs help with the rats. Please speak to the watch before the picnic.'},
            safe: {text: 'Town Watch told me you cleared the path. Now Bstrat can send the invitations. Find her and decide what kind of picnic we should have.'},
            thanks: {text: 'The basket, the path and the invitations are ready because of your help.', conditions: [
                { ...choice(SHARE), text: 'I remember your sharing idea: blankets first, bread next. Your help with the basket, the rats and the invitations made this picnic possible.'},
                { ...choice(RETURN), text: 'I remember you asking Bstrat to return my basket. I packed the bread as soon as she had laid out the blankets. Thank you for seeing all three jobs through.'}]}
        }},
    {npc: Types.Entities.VILLAGEGIRL, name: 'Bstrat515', start: 'welcome',
        resume_conditions: [resume('basket', open(BASKET)), resume('agreed', choice(FOUND)),
            resume('invite', completed(SAFETY)), resume('finished', completed(INVITE))],
        nodes: {
            welcome: {text: ['I borrowed Adam\'s basket to carry blankets for tonight\'s picnic. I stop at the market to see who still needs an invitation.',
                'If you want to help with the preparations, start by speaking to Ordinary Adam.']},
            basket: {text: ['Adam sent you about his basket? I brought blankets in it. I did not realise he needed it for bread.',
                'What should we do?'], options: [option('Please return it after unpacking the blankets.', 'return'),
                    option('Share it: blankets first, bread afterwards.', 'share')]},
            return: {text: ['Fair enough. I will unpack the blankets and return the basket to Adam.',
                'I have sent him word of your suggestion. Go back and confirm our plan with him.'], actions: [record(RETURN), record(FOUND)]},
            share: {text: ['I like that. One basket can do both jobs. I will send Adam word that the bread goes in after the blankets come out.',
                'Go back to Adam and confirm the plan. I will remember that you helped us share.'], actions: [record(SHARE), record(FOUND)]},
            agreed: {text: 'We already agreed on the basket because you came to ask. Tell Adam our plan, then help Town Watch with the path.'},
            invite: {text: ['Town Watch told me you cleared the path. The neighbours can come safely now.',
                'One last job: decide what kind of picnic we should have. I will include the watch in the invitation.'],
                actions: [handout(INVITE)], options: [option('A quiet picnic so the watch can rest.', 'quiet'), option('A picnic with music so everyone can join in.', 'music')]},
            quiet: {text: ['A quiet picnic it is. I wrote: "Come sit by the lanterns when your patrol ends."',
                'I sent Town Watch your invitation. When we greet you later, we will mention the quiet evening you chose.'], actions: [record(QUIET), finish(INVITE)]},
            music: {text: ['Music it is. I wrote: "Come join the songs when your patrol ends."',
                'I sent Town Watch your invitation. When we greet you later, we will mention the music you chose.'], actions: [record(MUSIC), finish(INVITE)]},
            finished: {text: 'Everyone is invited because you helped us finish the preparations.', conditions: [
                {...choice(QUIET), text: 'You chose a quiet picnic. I kept the invitation gentle so Town Watch can rest after the patrol. I remember your thoughtfulness.'},
                {...choice(MUSIC), text: 'You chose a picnic with music. I invited Town Watch to join the songs after the patrol. I remember you wanting everyone involved.'}]}
        }},
    {npc: Types.Entities.GUARD, name: 'Town Watch', start: 'welcome',
        resume_conditions: [resume('offer', completed(BASKET)), resume('progress', open(SAFETY)),
            resume('ready', open(SAFETY), enoughRats), resume('safe', completed(SAFETY)), resume('invited', completed(INVITE))],
        nodes: {
            welcome: {text: ['I patrol the gate, the road and the market because the neighbours are preparing a picnic.',
                'Adam and Bstrat still need to sort out the basket. Help Adam first; then I can give you a job on the path.']},
            offer: {text: ['Adam said you sorted out the basket. Next, we need a safe path for the neighbours.',
                'Show me that you have defeated three rats, then report back. Rats you already defeated count; you do not need to repeat that work.'],
                options: [option('I will help clear the path.', 'accept'), option('Why do you keep patrolling?', 'patrol'), option('I will come back later.', 'later')]},
            patrol: {text: 'I keep checking the gate while Adam checks supplies and Bstrat gathers neighbours. Even when you clear the path, someone still needs to watch the entrance.', goto: 'offer'},
            later: {text: 'All right. I will keep patrolling until you are ready.'},
            accept: {text: 'Defeat three rats in total, then click me and report that the path is clear. I will keep watching the gate while you work.', actions: [handout(SAFETY)]},
            progress: {text: 'You agreed to clear the picnic path. I need to see three rat kills in total before I can approve it. Earlier kills count. Come back when all three are done.'},
            ready: {text: 'You have defeated three rats. Are you ready to report that the path is clear?',
                options: [option('The path is clear. The neighbours can come.', 'finish', enoughRats), option('I will check it once more.', 'later')]},
            finish: {text: ['Good work. I told Adam and Bstrat you cleared the path, so they know why the picnic can go ahead.',
                'Please visit Bstrat to help with the invitations. I will continue my gate patrol; the cleared path does not remove that job.'], actions: [finish(SAFETY)]},
            safe: {text: 'I remember your three rat kills and your report. Bstrat can finish the invitations now. Thank you for making my patrol easier.'},
            invited: {text: 'Bstrat delivered your invitation. I will join after my patrol.', conditions: [
                {...choice(QUIET), text: 'Bstrat told me you chose a quiet picnic so I could rest after patrol. Thank you. I will finish my gate check, then sit by the lanterns.'},
                {...choice(MUSIC), text: 'Bstrat told me you chose music and invited me to join the songs. Thank you for including me. I will finish my gate check first.'}]}
        }}
];

// The existing choice popup displays one question string. Keep all context in
// that question; arrays are reserved for successive non-choice speech bubbles.
for (const dialogue of dialogues) {
    for (const node of Object.values(dialogue.nodes)) {
        if (node.options && Array.isArray(node.text)) node.text = node.text.join('<br><br>');
    }
}

const behavior = JSON.parse(JSON.stringify(base));
behavior.ambience.particleCount = 18;
for (const npc of behavior.npcs) {
    npc.questIds = [BASKET, SAFETY, INVITE];
    npc.lines.quest = ['I heard about your help with the picnic. Click me if you want to talk about what we still need.'];
    npc.reactions = [
        {when: {questCompleted: BASKET, choice: SHARE}, lines: {return: ['Bstrat told me you suggested sharing the basket. That solved our bread-and-blankets problem.']}},
        {when: {questCompleted: BASKET, choice: RETURN}, lines: {return: ['Bstrat told me you arranged the basket\'s return. Adam can pack the bread now.']}},
        {when: {questCompleted: SAFETY}, lines: {return: ['Town Watch told me you cleared three rats from the picnic path. Thank you for helping our neighbours.'],
            kill: ['Another rat down! After your help with the picnic path, I knew we could count on you.']}},
        {when: {questCompleted: INVITE, choice: QUIET}, lines: {return: ['You chose a quiet picnic so the watch could rest. We remember your kindness.'], quest: ['Bstrat sent your quiet-picnic invitation. The watch can rest after patrol.']}},
        {when: {questCompleted: INVITE, choice: MUSIC}, lines: {return: ['You chose music and invited the watch to join in. We remember you including everyone.'], quest: ['Bstrat sent your invitation to join the songs. The watch will come after patrol.']}}
    ];
}
behavior.npcs[0].lines.greeting = ['I am checking supplies for the lantern picnic. Click me if you would like to help with a missing basket.'];
behavior.npcs[1].lines.greeting = ['I am patrolling so the neighbours can prepare their picnic. Adam has the first job if you want to help.'];
behavior.npcs[2].lines.greeting = ['I am bringing blankets to the picnic. Speak to Adam first if you want to help us prepare.'];
behavior.conversations = [
    {cooldownSeconds: 120, steps: [
        {npc: 'town-gardener', text: 'Bstrat, are those the picnic blankets? I wondered why my basket felt so heavy.'},
        {npc: 'town-neighbour', text: 'Blankets first, bread next. I was trying to carry everything in one trip.'},
        {npc: 'town-gardener', text: 'Then I will check the bread while you lay them out.'},
        {npc: 'town-neighbour', text: 'And I will ask who still needs an invitation.'},
        {npc: 'town-gardener', text: 'I keep stopping at the market because this is where we can find each other.'},
        {npc: 'town-neighbour', text: 'That is why I come here too. A picnic needs neighbours, not just supplies.'}]},
    {cooldownSeconds: 120, steps: [
        {npc: 'town-watch', text: 'I am checking the picnic path before my next gate patrol.'},
        {npc: 'town-gardener', text: 'We can handle the bread and blankets. Leave a little time to join us.'},
        {npc: 'town-watch', text: 'I would like that. But I must finish the gate check first.'},
        {npc: 'town-gardener', text: 'Of course. I will keep a place for you by the lanterns.'},
        {npc: 'town-watch', text: 'Thank you. It is easier to patrol when you know someone is saving you a seat.'}]},
    {cooldownSeconds: 120, steps: [
        {npc: 'town-neighbour', text: 'Watch, you are on the invitation list. I have not forgotten you.'},
        {npc: 'town-watch', text: 'Even if I arrive after everyone else?'},
        {npc: 'town-neighbour', text: 'Especially then. Adam will keep some bread aside.'},
        {npc: 'town-watch', text: 'Then I will finish my rounds and look for the lanterns.'},
        {npc: 'town-neighbour', text: 'I keep visiting the market so I can tell people exactly where to meet us.'}]}
];

// Existing village jobs remain available alongside the prologue.
const neighbour = dialogues[1];
neighbour.nodes.welcome.text = neighbour.nodes.welcome.text.join('<br><br>');
neighbour.nodes.welcome.options = [option('Ask about other village jobs.', 'local-jobs')];
neighbour.nodes.finished.options = [option('Ask about other village jobs.', 'local-jobs')];
neighbour.nodes['local-jobs'] = {legacyQuests: true};

dialogues[0].key = 'town-gardener';
dialogues[1].key = 'town-neighbour';
dialogues[2].key = 'town-watch';
for (const tree of dialogues) {
    tree.nodes['daily-routine'] = {npcContext: true, text: '',
        options: [option('I wanted to ask about the picnic.', tree.start), option('Sleep well. I will see you later.', 'routine-later')]};
    tree.nodes['routine-later'] = {text: 'Take care. We can talk whenever you find me.'};

}
for (const quest of quests) {
    quest.dialogueOnly = true;
    quest.npcKey = dialogues.find(tree => tree.npc === quest.npc)?.key;
}

function install() {
    const registry = require('../js/quests/quests').questsByID;
    for (const quest of quests) registry[quest.id] = quest;
    const trees = require('../js/dialogue/main').dialogues;
    for (const dialogue of dialogues) if (!trees.some(tree => tree.key === dialogue.key)) trees.push(dialogue);
}

function progress(data = {}) {
    const done = id => ['COMPLETED', 'FINISHED'].some(status => (data.quests?.[status] || []).some(quest => (quest.questKey || quest.id) === id));
    const active = id => (data.quests?.IN_PROGRESS || []).some(quest => (quest.questKey || quest.id) === id);
    if (done(INVITE)) return 'Picnic ready! Revisit all three neighbours: they remember your basket plan and picnic choice.';
    if (done(SAFETY)) return 'Visit Bstrat515 to choose a quiet picnic or music and invite the watch.';
    if (active(SAFETY)) return 'Defeat rats: ' + Math.min(3, data.mobKills?.[Types.Entities.RAT] || 0) + '/3. Then report to Town Watch.';
    if (done(BASKET)) return 'Talk to Town Watch about clearing the picnic path.';
    if ((data.choices || []).includes(FOUND)) return 'Return to Ordinary Adam and confirm your basket plan.';
    if (active(BASKET)) return 'Find Bstrat515 at the market by day, or in the guesthouse east of the market after supper. Ask about the basket and choose a plan.';
    return 'Start with Ordinary Adam at the market by day, or in the guesthouse east of the market after supper. Ask to help with his missing basket.';
}

module.exports = {install, behavior, dialogues, quests, progress, BASKET, SAFETY, INVITE, SHARE, RETURN, QUIET, MUSIC, FOUND};
