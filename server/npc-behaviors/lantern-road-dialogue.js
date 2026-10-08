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
    const trees = content.npcs.map(npc => {
        const existing = picnic.dialogues.find(tree => tree.key === npc.key);
        const tree = existing ? JSON.parse(JSON.stringify(existing)) : {npc: require('../../shared/js/gametypes').getKindFromString(npc.kind),
            key: npc.key, name: npc.label, start: 'road-menu', nodes: {}, resume_conditions: []};
        tree.resume_conditions.push({goto: 'road-menu', conditions: [done(picnic.INVITE)]});
        const local = content.quests.filter(q => q.npcKey === npc.key);
        tree.nodes['road-menu'] = {storyMenu: npc.key,
            text: 'I have news from the lantern road. What would you like to discuss?',
            options: local.flatMap(q => [
                {text: (q.optional ? 'Optional: ' : '') + q.name, goto: q.id + ':offer', conditions: [...q.requiredQuests.map(done), notOpen(q.id)]},
                {text: 'Report on: ' + q.name, goto: q.id + ':progress', conditions: [open(q.id), notDone(q.id)]}
            ]).concat([{text: 'Ask about other local work.', goto: 'road-local'}, {text: 'I will return later.', goto: 'road-later'}])};
        if (existing) tree.nodes['road-menu'].options.push({text: 'Remember our first picnic.', goto: existing.key === 'town-gardener' ? 'thanks' : existing.key === 'town-watch' ? 'invited' : 'finished'});
        tree.nodes['road-local'] = {legacyQuests: true};
        tree.nodes['road-later'] = {text: 'Take your time. Your journal keeps the next step and what you have learned.'};
        for (const q of local) {
            const prerequisites = [...q.requiredQuests.map(done), notOpen(q.id)];
            tree.nodes[q.id + ':offer'] = {text: q.reason + '<br><br>' + q.objectives.map(o => o.label + ' — ' + o.scene).join('<br>'),
                requires: prerequisites, options: [{text: 'I will help.', goto: q.id + ':accept', conditions: prerequisites},
                    {text: 'I need time to think.', goto: 'road-later'}]};
            tree.nodes[q.id + ':accept'] = {text: q.reason + ' Your journal will show the next objective.', requires: prerequisites, actions: [handout(q.id)], storyQuest: q.id};
            tree.nodes[q.id + ':progress'] = {text: q.reason, storyQuest: q.id,
                options: (q.choices || [{label: 'Here is my report.'}]).map((choice, index) => ({text: choice.label,
                    goto: q.id + ':finish:' + index, conditions: [ready(q.id)]})).concat([{text: 'I will keep working on it.', goto: 'road-later'}])};
            (q.choices || [{}]).forEach((choice, index) => {
                tree.nodes[q.id + ':finish:' + index] = {text: q.conclusion + (choice.response ? ' ' + choice.response : ''),
                    requires: [ready(q.id)], actions: [...(choice.flag ? [{type: 'record_choice', choice: choice.flag}] : []), finish(q.id)],
                    storyConclusion: q.id};
            });
        }
        return tree;
    });
    return trees;
}
module.exports = {buildDialogues};
