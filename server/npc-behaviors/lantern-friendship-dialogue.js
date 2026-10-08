const picnic = require('./lantern-picnic');
const {ids: Q, choices: C, actors, quests} = require('./lantern-friendship');
const prefix = 'friendship:';
// These are existing engine-owned objective facts, never authored story flags.
const ready = (id, count = Infinity) => quests.find(q => q.id === id).objectives.slice(0, count).map(o => ({if: 'choice_made', choice: 'quest-progress:' + encodeURIComponent(id) + ':' + encodeURIComponent(o.id) + ':' + (o.amount || 1)}));
const choice = key => ({if: 'choice_made', choice: C[key] || key});
const notChoice = key => ({if_not: 'choice_made', choice: C[key] || key});
const done = quest => ({if: 'quest_completed', quest});
const notDone = quest => ({if_not: 'quest_completed', quest});
const active = quest => [{if: 'quest_open', quest}, notDone(quest)];
const available = quest => [done(quests.find(q => q.id === quest).requiredQuest), {if_not: 'quest_open', quest}];
const record = key => ({type: 'record_choice', choice: C[key]});
const finish = quest => ({type: 'complete_quest', quest});
const option = (text, node, conditions = []) => ({text, goto: prefix + node, conditions});
const unchosen = (first, second) => [notChoice(first), notChoice(second)];
// Every entry is guarded at the action too: a cached node is not authority.
function compose(base, who) {
    const tree = base ? JSON.parse(JSON.stringify(base)) : {npc: actors[who].npc, key: actors[who].npcKey, name: who === 'rowan' ? 'Rowan' : 'Jimi', start: prefix + 'home', nodes: {}, resume_conditions: []};
    const nodes = tree.nodes;
    const node = (name, text, options = [], guards = [], actions = []) => {
        nodes[prefix + name] = {text, options: [...options, option('Back.', 'home')],
            actions: actions.map(action => ({...action, conditions: [...guards, ...(action.conditions || [])]}))};
    };
    const home = [];
    let reportIndex = 0;
    node('home', who === 'rowan' ? 'If those are more invitations, someone else will have to carry them. What brings you here?' : 'What would you like to talk about?', home);
    // node() copies options; install the hub after authoring all branches.
    node('jobs', 'Other jobs'); nodes[prefix + 'jobs'] = {legacyQuests: true};
    home.push(option('Ask about other jobs.', 'jobs'));
    function offer(id, text, reply) {
        const guards = available(id);
        home.push(option(text, 'accept-' + id, guards));
        node('accept-' + id, reply, [], guards, [{type: 'handout_quest', quest: id}]);
    }
    function report(id, label, text, guards = []) {
        const all = [...active(id), ...ready(id), ...guards];
        const name = 'finish-' + id + '-' + reportIndex++;
        home.push(option(label, name, all));
        node(name, text, [], all, [finish(id)]);
    }
    if (who === 'bstrat') {
        offer(Q.EMPTY_PLACE, 'Was Rowan expecting an invitation?', 'We saved Rowan a place. He used to deliver the invitations. I thought he knew he was included. I never asked. Ask Adam what we actually said, then Town Watch, then come back.');
        report(Q.EMPTY_PLACE, "I'll ask Rowan what happened.", 'Thank you for asking them both. Rowan is taking time for himself, not missing. Ask whether he would like company.');
        offer(Q.MESSENGER, 'Where can I ask Rowan?', 'Leave Town through the northern gate. Rowan rests just beyond it on the southern Forest path. Ask whether he would like company.');
        offer(Q.NAME, 'Can we clear up the invitations?', 'Ask Adam what he assumed. Then come back: we should compare his account with Town Watch.');
        node('cover', 'I could organise Adam\'s baskets while he talks to Watch. What should I do?', [
            option('Just watch them. Leave every basket exactly where it is.', 'covered', [...active(Q.NAME), ...ready(Q.NAME, 2), choice('adam-account')]),
            option('Put the small basket inside the large one.', 'organise')]);
        home.push(option('Ask Bstrat to mind the supplies.', 'cover', [...active(Q.NAME), ...ready(Q.NAME, 2), choice('adam-account')]));
        node('organise', 'Adam said it took him three days to find it last time. Perhaps we should leave them where he expects them.');
        node('covered', 'Even the small one beside the large one? A challenging assignment. I will do my best. Ask Town Watch to meet Adam briefly.', [], [...active(Q.NAME), ...ready(Q.NAME, 2), choice('adam-account')], [record('stall-covered')]);
        const comparison = [...active(Q.NAME), ...ready(Q.NAME, 2), choice('adam-account'), choice('stall-covered'), choice('compare-requested')];
        home.push(option('Compare the two accounts.', 'explain', comparison));
        node('explain', 'Adam and Watch can each repeat their account if you missed the meeting. What went wrong?', [
            option('Rowan lost his invitation.', 'lost'), option('Watch deliberately kept Rowan away.', 'deliberate'),
            option('Each thought the other had invited him. Nobody actually asked Rowan to stay.', 'understood', comparison),
            option('Could you give me a hint?', 'hint-meeting')]);
        node('lost', 'Did either of them say they gave him one?', [option('Try again.', 'explain', comparison)]);
        node('deliberate', 'What did he say that made you think it was deliberate?', [option('Try again.', 'explain', comparison)]);
        node('hint-meeting', 'Listen for what each thought the other had done. A delivered invitation is not always an invitation to the person delivering it.');
        node('understood', 'Then this time I will use his name. Possibly twice.', [option('What do you actually want?', 'invitation', [...comparison, choice('invitation-understood')])], comparison, [record('invitation-understood')]);
        const understood = [...comparison, choice('invitation-understood')];
        home.push(option('Help Bstrat word the invitation.', 'invitation', understood));
        node('invitation', 'I was going to say we need his lantern. There I go again. I want to sit with my friend. How should I begin?', [
            option('Start with the apology. Let him hear that you understand.', 'apology', [...understood, ...unchosen('apology-first', 'invitation-first')]),
            option('Say his name and invite him clearly. Then explain.', 'invite-first', [...understood, ...unchosen('apology-first', 'invitation-first')]),
            option('Remind me of the apology we chose.', 'words-apology', [choice('apology-first')]),
            option('Remind me of the invitation we chose.', 'words-invitation', [notChoice('apology-first'), choice('invitation-first')])]);
        const apology = "Tell him: 'Rowan, I'm sorry I only spoke about the deliveries. I want your company. Please come and sit with us. Bring nothing.'";
        const invitation = "Tell him: 'Rowan, will you come and sit with me? Bring nothing. I'm sorry I left that invitation unsaid.'";
        node('apology', apology, [], [...understood, ...unchosen('apology-first', 'invitation-first')], [record('apology-first')]);
        node('invite-first', invitation, [], [...understood, ...unchosen('apology-first', 'invitation-first')], [record('invitation-first')]);
        node('words-apology', apology); node('words-invitation', invitation);
        for (const pref of ['apology-first', 'invitation-first']) report(Q.NAME, 'I will carry that invitation to Rowan.', 'An invitation, with his name and no job attached. Ask me when you are ready to carry it north.', [...understood.slice(2), ...(pref === 'invitation-first' ? [notChoice('apology-first')] : []), choice(pref)]);
        offer(Q.STAY, 'I am ready to take Rowan the invitation.', 'Ask Rowan what he wants. Then come back with his answer. He does not owe us a yes.');
        report(Q.STAY, 'Rowan says he misses your terrible tea and would like some again.', 'Tell him the tea has not improved. Neither has my company. I am glad he wants both.', [choice('rowan-accepted')]);
        home.push(option('Remind me what we agreed.', 'coda', [done(Q.STAY)]));
        node('coda', 'Tell him the tea has not improved. Neither has my company. I am glad he wants both.');
        nodes[prefix + 'home'].conditions = [{...done(Q.STAY), text: 'Rowan wants terrible tea and my company again. I am glad he wants both. What would you like to talk about?'}, {...choice(picnic.MUSIC), text: 'I remember the music you chose for the picnic. What would you like to talk about?'}, {...choice(picnic.QUIET), text: 'I remember your quiet picnic. What would you like to talk about?'}];
    }
    if (who === 'adam') {
        home.push(option('What did you say to Rowan?', 'empty', active(Q.EMPTY_PLACE)));
        node('empty', 'I asked Rowan to take the invitations round. Nothing about coming back. I wanted him there. That was the part I left unsaid. Ask Town Watch where he went.');
        nodes[prefix + 'empty'].conditions = [{...choice(picnic.SHARE), text: 'You helped us share one basket. With Rowan, I said: Could you take these round? Nothing about coming back.'}, {...choice(picnic.RETURN), text: 'You helped Bstrat return my basket. With Rowan, I remembered the job and forgot to say there was bread for him too.'}];
        const parcel = [...active(Q.LIGHT), ...ready(Q.LIGHT), choice('rowan-project'), choice('jimi-memory')];
        home.push(option('Ask about the marked parcel.', 'parcel', active(Q.LIGHT)));
        node('parcel', 'I saved three wood for the artist repairing a lantern. The wrapping shows a basket wearing boots. An outrageous likeness. Who was it for?', [
            option('That is obviously addressed to a basket.', 'basket'), option('It must be yours. It looks just like you.', 'likeness'),
            option('Rowan draws you as a basket wearing boots. You saved that wood for his lantern.', 'parcel-solved', [...parcel, choice('parcel-described')]),
            option('Could you give me a hint?', 'hint-parcel')], parcel, [record('parcel-described')]);
        node('basket', 'My baskets already have all the wood they need.', [option('Try another answer.', 'parcel', active(Q.LIGHT))]);
        node('likeness', 'An outrageous likeness is not a postal address.', [option('Try another answer.', 'parcel', active(Q.LIGHT))]);
        node('hint-parcel', 'Ask somebody who spent time with Rowan off duty. Jimi is on Beach. And ask Rowan what he is making.');
        node('parcel-solved', 'Rowan! Of course. I was waiting for the fellow who usually delivers things to collect his own parcel. Here are the three wood I saved for his lantern.', [], [...parcel, choice('parcel-described'), ...ready(Q.LIGHT)], [finish(Q.LIGHT)]);
        offer(Q.SHORE, 'Take the wood to Rowan.', 'Take three wood north through the gate into Forest. Give them to Rowan explicitly. If the gift was spent, ordinary collected wood will do.');
        home.push(option('What did you assume about the invitations?', 'account', active(Q.NAME)));
        node('account', 'Watch told me the invitations were covered. Naturally, I stopped worrying. I thought he had invited Rowan. I will compare accounts, but I cannot leave my supplies.', [option('Why not ask Bstrat to cover?', 'baskets', active(Q.NAME))], [...active(Q.NAME), ...ready(Q.NAME, 1)], [record('adam-account')]);
        node('baskets', 'Last time I could not find the small basket for three days. It was inside the large one. Organised. Ask Bstrat to mind them without moving anything.');
        offer(Q.SPARE_WOOD, 'Could I replenish your supplies? (Optional)', 'Visit Forest, then collect two new wood and bring them back to me. This is a favour, not a condition of friendship.');
        home.push(option('About those spare supplies.', 'wood-thanks', [done(Q.SPARE_WOOD)])); node('wood-thanks', 'Two wood back in stock. A voluntary favour: my favourite kind of accounting.');
    }
    if (who === 'watch') {
        home.push(option('Did you see Rowan?', 'where', active(Q.EMPTY_PLACE)));
        node('where', 'Rowan passed the northern gate. He is taking time for himself on the southern Forest path. Ask whether he would like company. You can find me at the eastern gate, market or town hall.');
        home.push(option('Can you compare invitations with Adam?', 'meeting', active(Q.NAME)));
        const meeting = [...active(Q.NAME), ...ready(Q.NAME, 3), ...ready(Q.NAME, 2), choice('adam-account'), choice('stall-covered')];
        node('meeting', 'A patrol can spare a short conversation. What arrangement did you have in mind?', [
            option('Abandon the patrol until Rowan comes back.', 'patrol'), option('Declare Rowan wrong.', 'wrong'),
            option('Bstrat can mind the supplies. Meet Adam briefly and compare who invited Rowan.', 'requested', meeting)]);
        node('patrol', 'A short meeting is one thing. Abandoning the patrol is quite another. Find somebody to cover Adam\'s supplies first.');
        node('wrong', 'I can compare what was said. I cannot issue a ruling on how someone should feel.');
        node('requested', 'Meet us at the old picnic spot south of the market. We will come when the others are free. I said the invitations were delivered; I thought Adam had asked Rowan.', [], meeting, [record('compare-requested')]);
        home.push(option('Repeat your own account.', 'account', [...active(Q.NAME), choice('compare-requested')]));
        node('account', 'I told Adam the invitations were delivered. Rowan delivered them. I thought Adam had asked Rowan himself.');
    }
    if (who === 'rowan') {
        nodes[prefix + 'home'].conditions = [
            {...done(Q.MESSENGER), text: 'Good to see you. You can ask about my lantern or our old afternoons on Beach.'},
            {...done(Q.SHORE), text: 'The lantern holds together now. Thank you. Ask Bstrat to clear up those invitations.'},
            {...done(Q.STAY), text: 'Good to see you. Company without another errand. What would you like to talk about?'}];
        const listening = [...active(Q.MESSENGER), ...ready(Q.MESSENGER), ...unchosen('listen-first', 'ask-directly')];
        home.push(option('No errand. Would you like some company?', 'listen', listening), option('Bstrat missed you. What made you stay away?', 'direct', listening));
        node('listen', 'You can stay a moment. I used to bring the invitations back and wait for somebody to ask me to stay. It seems a silly thing to have waited for.', [option("It isn't silly to want to be asked.", 'listen-answer', active(Q.MESSENGER))], listening, [record('listen-first')]);
        node('listen-answer', 'Thank you for not hurrying past that. Jimi remembers when my walks were not all deliveries. You can ask him about those afternoons.');
        node('direct', 'Did she miss me, or the person who knew all the roads?', [option("She doesn't know how it felt to you. I'm asking so I don't guess.", 'direct-answer', active(Q.MESSENGER))], listening, [record('ask-directly')]);
        node('direct-answer', 'Then here is the plain answer: I wanted an invitation with my name on it. Jimi remembers when my walks were not all deliveries.');
        for (const pref of ['listen-first', 'ask-directly']) report(Q.MESSENGER, 'May I tell Bstrat what you told me?', 'Yes. Tell her I missed being her friend. You do not have to repeat every word. Ask me about my lantern next.', [...(pref === 'ask-directly' ? [notChoice('listen-first')] : []), choice(pref)]);
        home.push(option('Remind me what you said.', 'listening-memory', [done(Q.MESSENGER)]));
        node('listening-memory', 'I missed being a friend. Jimi remembers our afternoons on Beach. You can ask him.');
        offer(Q.LIGHT, 'What does your lantern need?', 'The lantern is mine. For once, the broken thing is not somebody else\'s errand. Ask about the project, then walk south through Town to Jimi on Beach.');
        home.push(option('Tell me about your lantern project.', 'project', active(Q.LIGHT)));
        node('project', 'Three pieces of wood. There are usually offcuts at the Town market. Try asking rather than helping yourself. Adam counts things.', [], active(Q.LIGHT), [record('rowan-project')]);
        report(Q.SHORE, 'Give Rowan three wood.', 'My parcel made it through the delivery system. I can start with my lantern. Then perhaps an unflattering portrait. Ask Bstrat to clear up the invitations.', [{if: 'has_item', item: require('../../shared/js/gametypes').Entities.WOOD, amount: 3}]);
        home.push(option('I no longer have all three wood.', 'missing', active(Q.SHORE)));
        node('missing', 'You still need three wood. Ordinary Forest pickups can replace what was spent; Adam cannot give the gift twice.');
        nodes[prefix + 'missing'].conditions = [1, 2, 3].map(amount => ({if: 'has_item', item: require('../../shared/js/gametypes').Entities.WOOD, amount, text: amount === 3 ? 'You have all three wood. Click me and choose Give Rowan three wood.' : 'You still need ' + (3 - amount) + ' wood. Collect the missing pieces from the ordinary Forest pickups.'}));
        const acceptance = [...active(Q.STAY), ...ready(Q.STAY, 2)];
        home.push(option("Bstrat says: Rowan, I'm sorry I only spoke about deliveries. I want your company. Bring nothing.", 'accept-apology', [...acceptance, choice('apology-first')]));
        home.push(option("Bstrat says: Rowan, will you come and sit with me? Bring nothing. I'm sorry I left that invitation unsaid.", 'accept-invitation', [...acceptance, notChoice('apology-first'), choice('invitation-first')]));
        // Neutral recovery for older/imported saves without either preference.
        home.push(option('Bstrat wants your company and is sorry she never asked. Would you like to come?', 'accept-neutral', [...acceptance, ...unchosen('apology-first', 'invitation-first')]));
        for (const [name, text, guard] of [
            ['apology', 'She noticed the difference. That is what I needed to hear. Yes.', [choice('apology-first')]],
            ['invitation', 'My name, and no job after it. Yes. Tell her yes.', [notChoice('apology-first'), choice('invitation-first')]],
            ['neutral', 'Company, without another errand. Yes. Tell her yes.', unchosen('apology-first', 'invitation-first')]]) {
            node('accept-' + name, text, [option('What shall I tell Bstrat?', 'answer', [...acceptance, choice('rowan-accepted')])], [...acceptance, ...guard], [record('rowan-accepted')]);
        }
        home.push(option('Remind me of your answer.', 'answer', [choice('rowan-accepted')]));
        node('answer', 'Tell her I miss her terrible tea. And that I would like to have some again. That should sound like me.');
        nodes[prefix + 'answer'].conditions = [{...choice('ask-directly'), text: 'You asked instead of deciding for me. Tell her I miss her terrible tea and would like some again.'}, {...choice('listen-first'), text: 'You gave me time before asking. Tell her I miss her terrible tea and would like some again.'}];
        home.push(option('Are you glad you said yes?', 'coda', [done(Q.STAY)]), option('Remind me what we agreed.', 'coda', [done(Q.STAY)]));
        node('coda', 'Yes. We do not have to solve everything before spending time together.', [option('And our conversation?', 'coda-listening', [done(Q.STAY)])]);
        node('coda-listening', 'You asked what I wanted. I remember that.', [option('And your place with your friends?', 'coda-invitation', [done(Q.STAY)])]);
        nodes[prefix + 'coda-listening'].conditions = [{...choice('ask-directly'), text: 'You asked what was wrong instead of deciding for me. I remember that.'}, {...choice('listen-first'), text: 'You gave me time before asking for an answer. I remember that.'}];
        node('coda-invitation', 'They asked for my company. That is enough.');
        nodes[prefix + 'coda-invitation'].conditions = [{...choice('invitation-first'), text: 'This time, I was asked to stay.'}, {...choice('apology-first'), text: 'I did not have to earn my place.'}];
    }
    if (who === 'jimi') {
        home.push(option('Do you remember Rowan off duty?', 'drawing', [...active(Q.LIGHT), ...ready(Q.LIGHT, 2), choice('rowan-project')]));
        node('drawing', 'Rowan drew Adam as a basket wearing boots.', [option('Did Adam like it?', 'boots', active(Q.LIGHT))], [...active(Q.LIGHT), ...ready(Q.LIGHT, 2), choice('rowan-project')], [record('jimi-memory')]);
        node('boots', 'He complained about the boots. Apparently he owns a better pair. Rowan used to stay after his errands, drawing in the sand. It was good to do nothing useful together.');
        offer(Q.SHORE_SPACE, 'I will help clear a little space. (Optional)', 'Two crabs on Beach have decided the path belongs to them. I admire their confidence more than their manners. Defeat two from now, then report to me.');
        report(Q.SHORE_SPACE, 'Report on the two Beach crabs.', 'Two fewer arguments with crabs. Thank you for a little breathing room.');
        home.push(option('About that breathing room.', 'crab-thanks', [done(Q.SHORE_SPACE)])); node('crab-thanks', 'Thank you. The shore feels rather less argumentative.');
    }
    nodes[prefix + 'home'].options = home;
    if (base) {
        const recall = base.nodes[base.resume_conditions.at(-1).goto];
        nodes[prefix + 'home'].text = recall.text;
        nodes[prefix + 'home'].conditions = [...(recall.conditions || [])].sort((a, b) => Number([picnic.RETURN, picnic.QUIET].includes(a.choice)) - Number([picnic.RETURN, picnic.QUIET].includes(b.choice)));
        if (who === 'bstrat') nodes[prefix + 'home'].conditions.push({...done(Q.STAY), text: 'Rowan wants terrible tea and my company again. I am glad he wants both.'});
        tree.resume_conditions.push({goto: prefix + 'home', conditions: [done(picnic.INVITE)]});
        nodes[prefix + 'picnic-recall'] = {text: recall.text, conditions: nodes[prefix + 'home'].conditions.filter(condition => condition.choice), options: [option('Back.', 'home')]};
        home.push(option('Remember the Lantern Picnic.', 'picnic-recall'));
    }
    return tree;
}
const dialogues = picnic.dialogues.map((tree, index) => compose(tree, ['adam', 'bstrat', 'watch'][index]));
// This main baseline has no unkeyed guard tree. Preserve other guards' legacy NPC fallback.
dialogues.push(compose(null, 'rowan'), compose(null, 'jimi'));
module.exports = {dialogues};
