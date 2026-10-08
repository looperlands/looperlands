const {registry: definitions} = require('../worldextensions');
const hasQuest = (data, id, statuses) => statuses.some(status => (data.quests?.[status] || []).some(q => (q.questKey || q.id) === id));

// Build a personal snapshot without changing shared quest definitions.
function buildQuestLog(registry, data = {}) {
    const entries = [];
    for (const quest of Object.values(registry)) {
        const completed = hasQuest(data, quest.id, ['COMPLETED', 'FINISHED']);
        if (!completed && !hasQuest(data, quest.id, ['IN_PROGRESS'])) continue;
        let progressCount = completed ? quest.amount : 0;
        let amount = quest.amount;
        let desc = completed ? quest.endText || quest.startText : quest.questLogText || quest.startText;
        let longDesc = completed ? quest.endText || quest.startText : quest.longText || quest.startText;
        if (!completed) {
            if (quest.eventType === 'LOOT_ITEM') progressCount = data.items?.[quest.target] || 0;
            if (quest.eventType === 'KILL_MOB') progressCount = data.mobKills?.[quest.target] || 0;
        }
        const custom = definitions.questLog(quest, data, completed);
        if (custom) ({progressCount = progressCount, amount = amount, desc = desc, longDesc = longDesc} = custom);
        entries.push({id: quest.id, name: quest.name, desc, longDesc,
            type: quest.eventType, target: quest.target, medal: quest.medal, level: quest.level,
            progressCount: Math.min(progressCount, amount), amount, status: completed ? 'COMPLETED' : 'IN_PROGRESS'});
    }
    return entries.sort((a, b) => (a.status === 'COMPLETED' ? 0 : 1) - (b.status === 'COMPLETED' ? 0 : 1));
}
module.exports = {buildQuestLog};
