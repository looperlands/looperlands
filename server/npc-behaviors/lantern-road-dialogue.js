const content = require('./lantern-road');
const picnic = require('./lantern-picnic');
const done = id => ({if: 'quest_completed', quest: id});
const open = id => ({if: 'quest_open', quest: id});
const notDone = id => ({if_not: 'quest_completed', quest: id});
const notOpen = id => ({if_not: 'quest_open', quest: id});
const handout = id => ({type: 'handout_quest', quest: id});
const finish = id => ({type: 'complete_quest', quest: id});
const ready = id => ({if: 'story_objectives_done', quest: id});

function buildDialogues() {
    return content.npcs.map(npc => {
        const existing = picnic.dialogues.find(tree => tree.key === npc.key);
        const tree = existing ? JSON.parse(JSON.stringify(existing)) : {npc: require('../../shared/js/gametypes').getKindFromString(npc.kind),
            key: npc.key, name: npc.label, start: 'road-menu', nodes: {}, resume_conditions: []};
        tree.resume_conditions.push({goto: 'road-menu', conditions: [done(picnic.INVITE)]});
        const local = content.quests.filter(q => q.npcKey === npc.key);
        const returnToMenu = [{text: 'There is something else I wanted to ask.', goto: 'road-menu'},
            {text: 'I will see you later.', goto: 'road-later'}];
        tree.nodes['road-menu'] = {storyMenu: npc.key,
            options: local.flatMap(q => [
                {text: q.dialogue.topic, goto: q.id + ':offer', conditions: [...q.requiredQuests.map(done), notOpen(q.id)]},
                {text: 'About ' + q.name + '...', goto: q.id + ':progress', conditions: [open(q.id), notDone(q.id)]}
            ]).concat([
                {text: 'Where should I go from here?', goto: 'road-lead'},
                {text: 'What keeps you at this post?', goto: 'road-presence'},
                {text: 'Do you remember how we got here?', goto: 'road-memory'},
                {text: 'Is there other local work I can help with?', goto: 'road-local'},
                {text: 'I will see you later.', goto: 'road-later'}])};
        if (existing) tree.nodes['road-menu'].options.push({text: 'Do you remember our first picnic?', goto: existing.key === 'town-gardener' ? 'thanks' : existing.key === 'town-watch' ? 'invited' : 'finished'});
        tree.nodes['road-lead'] = {storyLead: npc.key, options: returnToMenu};
        tree.nodes['road-presence'] = {storyPresence: npc.key, options: returnToMenu};
        tree.nodes['road-memory'] = {storyMemory: npc.key, options: returnToMenu};
        tree.nodes['road-local'] = {legacyQuests: true};
        tree.nodes['road-later'] = {text: 'All right. Take care on the road.'};
        for (const q of local) {
            const d = q.dialogue;
            const prerequisites = [...q.requiredQuests.map(done), notOpen(q.id)];
            const offerOptions = [{text: d.question, goto: q.id + ':context', conditions: prerequisites},
                {text: 'Where should I look?', goto: q.id + ':offer-directions', conditions: prerequisites},
                {text: d.accept, goto: q.id + ':accept', conditions: prerequisites},
                {text: 'I need a little time.', goto: 'road-later'}];
            tree.nodes[q.id + ':offer'] = {text: d.offer, requires: prerequisites, options: offerOptions};
            tree.nodes[q.id + ':context'] = {text: d.answer, requires: prerequisites, options: offerOptions.filter(o => o.goto !== q.id + ':context')};
            tree.nodes[q.id + ':offer-directions'] = {storyDirections: q.id, requires: prerequisites,
                options: offerOptions.filter(o => o.goto !== q.id + ':offer-directions')};
            tree.nodes[q.id + ':accept'] = {text: 'Thank you. Come back and tell me what you find.', requires: prerequisites,
                actions: [handout(q.id)], goto: 'road-menu', options: [{text: 'Remind me where to start.', goto: q.id + ':directions'}, ...returnToMenu]};
            const progressOptions = (q.choices || [{label: d.report}]).map((choice, index) => ({text: choice.label,
                goto: q.id + ':finish:' + index, conditions: [ready(q.id)]})).concat([
                {text: 'Where should I look next?', goto: q.id + ':directions'},
                {text: d.question, goto: q.id + ':remind'}, ...returnToMenu]);
            const inProgress = [open(q.id), notDone(q.id)];
            tree.nodes[q.id + ':progress'] = {storyQuest: q.id, requires: inProgress, options: progressOptions};
            tree.nodes[q.id + ':directions'] = {storyDirections: q.id, requires: inProgress,
                options: [{text: 'All right. Let us go over what I found.', goto: q.id + ':progress'}, ...returnToMenu]};
            tree.nodes[q.id + ':remind'] = {text: d.answer, requires: inProgress,
                options: [{text: 'Let us go over what I found.', goto: q.id + ':progress'}, ...returnToMenu]};
            (q.choices || [{}]).forEach((choice, index) => {
                tree.nodes[q.id + ':finish:' + index] = {text: d.reply + (choice.response ? '<br><br>' + choice.response : ''),
                    requires: [ready(q.id)], actions: [...(choice.flag ? [{type: 'record_choice', choice: choice.flag}] : []), finish(q.id)],
                    storyConclusion: q.id, goto: 'road-menu', options: [
                        {text: 'Where do we go from here?', goto: 'road-lead'},
                        ...(q.id === 'LANTERN_LONG_TABLE' ? [{text: 'Do you remember how we got here?', goto: 'road-memory'}] : []),
                        ...returnToMenu]};
            });
        }
        return tree;
    });
}
module.exports = {buildDialogues};
