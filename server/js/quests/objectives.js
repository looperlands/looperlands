// Declarative objective evaluation inside the existing quest/event consumer.
// Durable facts use the existing choice store; item ownership uses normal balances.
const dao = require('../dao');
const types = ['NPC_TALKED', 'KILL_MOB', 'LOOT_ITEM', 'AREA_ENTERED', 'DELIVER_ITEM'];
const flag = (q, o, count) => 'quest-progress:' + encodeURIComponent(q.id) + ':' + encodeURIComponent(o.id) + ':' + count;
const amount = o => o.amount ?? 1;
function validate(quest) {
    if (!quest.objectives) return;
    const ids = new Set();
    if (!Array.isArray(quest.objectives) || !quest.objectives.length) throw new Error('Quest objectives must be nonempty');
    for (const [index, o] of quest.objectives.entries()) {
        if (!o.id || ids.has(o.id) || !types.includes(o.eventType) || !Number.isInteger(amount(o)) || amount(o) < 1 || o.target === undefined ||
            (o.area && !['x', 'y', 'width', 'height'].every(key => Number.isInteger(o.area[key]))) ||
            (o.area && (o.area.width < 1 || o.area.height < 1)) ||
            (o.eventType === 'DELIVER_ITEM' && (index !== quest.objectives.length - 1 || quest.ordered === false || !o.recipient ||
                (o.recipient.npc === undefined && o.recipient.area === undefined)))) throw new Error('Invalid quest objective: ' + o.id);
        ids.add(o.id);
    }
}
function count(data, quest, objective) {
    const choices = new Set(data.choices || []);
    for (let n = amount(objective); n > 0; n--) if (choices.has(flag(quest, objective, n))) return n;
    return 0;
}
function progress(data, quest) {
    return quest.objectives.map(o => ({...o, count: count(data, quest, o), done: count(data, quest, o) >= amount(o)}));
}
function ready(data, quest) {
    return progress(data, quest).every(o => o.done && (o.eventType !== 'DELIVER_ITEM' || (data.items?.[o.target] || 0) >= amount(o)));
}
function recipientMatches(recipient, event) {
    return recipient.npc !== undefined ? event.eventType === 'NPC_TALKED' && Number(event.data.npc) === Number(recipient.npc) && (!recipient.npcKey || event.data.npcKey === recipient.npcKey) :
        event.eventType === 'AREA_ENTERED' && String(event.data.area?.name || event.data.area?.id) === String(recipient.area);
}
function matches(o, event) {
    if (o.eventType === 'DELIVER_ITEM') return recipientMatches(o.recipient, event) && (event.playerCache.gameData.items?.[o.target] || 0) >= amount(o);
    if (o.eventType !== event.eventType) return false;
    switch (o.eventType) {
        case 'NPC_TALKED': return Number(event.data.npc) === Number(o.target) && (!o.npcKey || event.data.npcKey === o.npcKey);
        case 'AREA_ENTERED': return String(event.data.area?.name || event.data.area?.id) === String(o.target);
        case 'LOOT_ITEM': return (event.data.amount ?? 1) > 0 && Number(event.data.kind ?? event.data.item?.kind) === Number(o.target);
        case 'KILL_MOB': {
            const mob = event.data.mob;
            return mob?.kind === o.target && (!o.area || mob.x >= o.area.x && mob.y >= o.area.y && mob.x < o.area.x + o.area.width && mob.y < o.area.y + o.area.height);
        }
        default: return false;
    }
}
async function consume(quest, event) {
    const objectives = progress(event.playerCache.gameData, quest);
    for (const o of objectives) {
        if (o.done) continue;
        if (event.data.allowedObjectives && !event.data.allowedObjectives[quest.id]?.includes(o.id)) continue;
        if (matches(o, event)) {
            const increment = o.eventType === 'LOOT_ITEM' ? (event.data.amount || 1) : o.eventType === 'DELIVER_ITEM' ? amount(o) : 1;
            const next = Math.min(amount(o), o.count + increment), key = flag(quest, o, next);
            const response = await dao.registerChoice(event.playerCache.nftId, key);
            if (response === undefined || response === false || response?.status === false) throw new Error('Could not save quest progress. Please try again.');
            const sessionId = event.data.player?.sessionId;
            const latest = event.data.cache?.get(sessionId);
            if (event.data.cache && !latest) return false;
            if (latest) event.playerCache.gameData = latest.gameData;
            event.playerCache.gameData.choices = [...new Set([...(event.playerCache.gameData.choices || []), key])];
            if (latest) event.data.cache.set(sessionId, {...latest, gameData: event.playerCache.gameData});
        }
        // Ordered objectives consume an event at most once. Future talks/kills
        // cannot be credited before the preceding task is completed.
        if (quest.ordered !== false) break;
    }
    return ready(event.playerCache.gameData, quest);
}
module.exports = {validate, progress, ready, consume};
