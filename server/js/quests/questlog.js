const road = require('../../npc-behaviors/lantern-road-state');
const picnic = require('../../npc-behaviors/lantern-picnic');
const text = value => Array.isArray(value) ? value.join('<br>') : value || '';

// Build a personal snapshot without changing shared quest definitions.
function buildQuestLog(registry, data = {}) {
    const entries = [];
    for (const quest of Object.values(registry)) {
        const completed = road.done(data, quest.id);
        if (!completed && !road.active(data, quest.id)) continue;
        let progressCount = completed ? quest.amount : 0;
        let amount = quest.amount;
        let desc = completed ? quest.endText || quest.startText : quest.questLogText || quest.startText;
        let longDesc = completed ? quest.endText || quest.startText : quest.longText || quest.startText;
        if (quest.objectives) {
            const objectives = road.progress(data, quest);
            amount = objectives.length;
            progressCount = completed ? amount : objectives.filter(o => o.done).length;
            desc = completed ? quest.conclusion : road.nextStep(data, quest);
            const handoff = completed ? road.handoff(data, quest) : '';
            if (handoff) desc += '<br><br>Where this leads: ' + handoff;
            longDesc = quest.reason + '<br><br>' + objectives.map(o => (o.done ? 'Done: ' : 'Next: ') + o.label + ' — ' + o.scene).join('<br>') +
                '<br><br>' + desc + '<br><br>' + road.memories(data).join('<br>');
        } else if (!completed) {
            if (quest.eventType === 'LOOT_ITEM') progressCount = data.items?.[quest.target] || 0;
            if (quest.eventType === 'KILL_MOB') progressCount = data.mobKills?.[quest.target] || 0;
            if ([picnic.BASKET, picnic.SAFETY, picnic.INVITE].includes(quest.id)) {
                desc = picnic.progress(data);
                longDesc = text(quest.startText) + '<br><br>' + desc;
                if (quest.id === picnic.BASKET && road.has(data, picnic.FOUND)) progressCount = 1;
            }
        }
        entries.push({id: quest.id, name: quest.name, desc, longDesc,
            type: quest.eventType, target: quest.target, medal: quest.medal, level: quest.level,
            progressCount: Math.min(progressCount, amount), amount, status: completed ? 'COMPLETED' : 'IN_PROGRESS'});
    }
    return entries.sort((a, b) => (a.status === 'COMPLETED' ? 0 : 1) - (b.status === 'COMPLETED' ? 0 : 1));
}
module.exports = {buildQuestLog};
