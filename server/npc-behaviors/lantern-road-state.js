const content = require('./lantern-road');
const picnic = require('./lantern-picnic');
const has = (data, flag) => (data?.choices || []).includes(flag);
const done = (data, id) => ['COMPLETED', 'FINISHED'].some(status =>
    (data?.quests?.[status] || []).some(q => (q.questKey || q.id) === id));
const active = (data, id) => !done(data, id) && (data?.quests?.IN_PROGRESS || []).some(q => (q.questKey || q.id) === id);
const unlocked = (data, q) => q.requiredQuests.every(id => done(data, id));
const applicable = (data, objective) => !objective.when || has(data, objective.when);
const objectiveDone = (data, q, objective) => has(data, content.objectiveFlag(q, objective)) ||
    has(data, content.objectiveFlag(q, objective, objective.type === 'kill' ? objective.amount : undefined));
const objectiveCount = (data, q, o) => objectiveDone(data, q, o) ? (o.amount || 1) :
    Array.from({length: o.amount || 1}, (_, i) => i + 1).filter(i => has(data, content.objectiveFlag(q, o, i))).length;
function itemFact(data, reference) {
    const q = content.quests.find(q => q.id === 'LANTERN_' + reference[0]);
    return reference[1] ? done(data, q.id) || objectiveDone(data, q, q.objectives.find(o => o.key === reference[1])) : done(data, q.id);
}
const bag = data => content.storyItems.filter(item => itemFact(data, item.from) && !itemFact(data, item.spent));
const hasItems = (data, objective) => (objective.items || []).every(key => bag(data).some(item => item.key === key));
function instruction(objective) {
    switch (objective.type) {
        case 'talk': return 'Talk to the named NPC with E or a click.';
        case 'visit': return 'Walk to the landmark. Arriving beside it records your visit.';
        case 'kill': return 'Defeat the named creatures in this area after accepting the quest. Your combat contributions count.';
        case 'collect': return 'Pick up the parcel with E or a click. It stays in your personal story satchel until delivered.';
        case 'deliver': return 'Bring the items in your story satchel here, then place them with E or a click.';
        default: return 'Walk beside its marker and click it or press E.';
    }
}
const currentMain = data => content.quests.find(q => !q.optional && !done(data, q.id));
const ready = (data, q) => active(data, q.id) && unlocked(data, q) && q.objectives.filter(o => applicable(data, o)).every(o => objectiveDone(data, q, o));
const progress = (data, q) => q.objectives.filter(o => applicable(data, o)).map(o => ({...o, done: objectiveDone(data, q, o)}));
function memories(data) {
    const lines = [];
    if (has(data, picnic.SHARE)) lines.push('Adam remembers your sharing idea: blankets first, bread next.');
    else if (has(data, picnic.RETURN)) lines.push('You asked Bstrat to return Adam\'s basket before he packed the bread.');
    if (has(data, picnic.QUIET)) lines.push('You chose a quiet picnic so the watch could rest.');
    else if (has(data, picnic.MUSIC)) lines.push('You chose music and invited the watch to join the songs.');
    if (has(data, 'lantern:public-memorial')) lines.push('Vince explains the memorial publicly because you chose to remember together.');
    if (has(data, 'lantern:private-memorial')) lines.push('Vince keeps Elian\'s personal letter private because you asked for a quiet memorial.');
    if (has(data, 'lantern:caravan-detour')) lines.push('Nessa took the sheltered detour and brings lantern oil.');
    if (has(data, 'lantern:caravan-direct')) lines.push("Nessa took the direct road so the caravan’s loaded packs could travel together.");
    if (has(data, 'lantern:rowan-keeper')) lines.push('Rowan returned as a keeper sharing the watch with the communities.');
    if (has(data, 'lantern:rowan-handover')) lines.push('Rowan taught new keepers and chose to rest.');
    return lines;
}
function npcLocation(npc) {
    return npc.label + ' at ' + npc.location;
}
function nextStep(data, q) {
    const npc = content.npcs.find(n => n.key === q.npcKey);
    if (!active(data, q.id)) return 'Speak to ' + npcLocation(npc) + ' to begin.';
    if (!unlocked(data, q)) {
        const earlier = currentMain(data);
        if (earlier && earlier.id !== q.id) return 'First finish ' + earlier.name + '. ' + nextStep(data, earlier) + ' Your earlier progress stays saved.';
    }
    const pending = progress(data, q).find(o => !o.done);
    if (pending) return pending.label + (pending.type === 'kill' ? ' (' + objectiveCount(data, q, pending) + '/' + pending.amount + ')' : '') + '. ' + pending.where + ' ' + instruction(pending);
    return 'Report to ' + npcLocation(npc) + '.';
}
// Link only reports the player has actually completed. The next missing report
// explains why a later conversation is still waiting.
function handoff(data, q) {
    const next = content.quests.filter(candidate => candidate.optional === q.optional &&
        candidate.requiredQuests.includes(q.id) && !done(data, candidate.id));
    const available = next.filter(candidate => unlocked(data, candidate));
    if (available.length) return available.map(candidate => candidate.name + ': ' + nextStep(data, candidate)).join('<br>');
    const waiting = next[0];
    if (!waiting) return '';
    const missing = waiting.requiredQuests.filter(id => !done(data, id));
    return 'Before ' + waiting.name + ', we still need ' + missing.map(id => {
        const candidate = content.quests.find(q => q.id === id);
        return candidate ? candidate.name + ' from ' + npcLocation(content.npcs.find(npc => npc.key === candidate.npcKey)) :
            picnic.quests.find(q => q.id === id).name + ' in Town';
    }).join(' and ') + '.';
}
function npcStatus(data, key) {
    const local = content.quests.filter(q => q.npcKey === key && !q.archived && !done(data, q.id));
    const current = local.find(q => active(data, q.id)) || local.find(q => unlocked(data, q));
    if (current) return active(data, current.id) ?
        (ready(data, current) ? current.dialogue.ready : current.dialogue.waiting) : current.dialogue.offer;
    const waiting = local.sort((a, b) => a.chapter - b.chapter)[0];
    // Town hosts should point to the current search, not request a finale
    // invitation before the road has even been repaired.
    if (!waiting || (waiting.chapter === 8 && !done(data, 'LANTERN_LIGHT_SHARED'))) return '';
    const missing = waiting.requiredQuests.filter(id => !done(data, id));
    if (missing.includes(picnic.INVITE)) return 'Have you spoken to Adam and Bstrat in Town? They are still preparing the first picnic. I would like to hear from them before we set out.';
    return 'I still need news from ' + missing.slice(0, 1).map(id => {
        const q = content.quests.find(q => q.id === id);
        return q ? npcLocation(content.npcs.find(npc => npc.key === q.npcKey)) : 'our neighbours in Town';
    }).join(' and ') + '. Will you ask them what they found?';
}
function knowledge(data) {
    if (done(data, 'LANTERN_LONG_TABLE')) return 'The invitations reached their friends. There is bread, company and a place for you at the long table.';
    if (done(data, 'LANTERN_KEEPER_CHOICE')) return 'Rowan learned that his friends still want his company. He chose his own pace for reconnecting.';
    if (done(data, 'LANTERN_MISSING_REGULATOR')) return 'Orin kept Rowan’s satchel ready. They had missed each other while both waited for a sign.';
    if (done(data, 'LANTERN_ROAD_WE_TAKE')) return 'Nessa can bring the caravan together along the route you checked. Nobody has to be left behind.';
    if (done(data, 'LANTERN_UNDELIVERED_LETTER')) return 'Elian’s letter says there is always a place for Rowan. Carry that answer to him.';
    if (done(data, 'LANTERN_FOREST_MARKERS')) return 'Rowan’s knot is still on the forest trail. Mara remembers the walks they shared.';
    if (done(data, 'LANTERN_WRECK_LETTERS')) return 'The storm scattered Rowan’s invitations. His friends did not choose to ignore him.';
    return 'Adam kept Rowan a place at the picnic. The lost invitations start the search for an old friend.';
}
function journal(data = {}) {
    const prologueDone = done(data, picnic.INVITE);
    const available = content.quests.filter(q => (!q.archived || active(data, q.id)) && unlocked(data, q) && !done(data, q.id));
    const current = currentMain(data) || available.find(q => q.optional);
    const satchel = bag(data).map(item => ({key: item.key, name: item.name}));
    const finished = done(data, 'LANTERN_LONG_TABLE');
    return {
        title: 'The Lantern Road', version: content.version,
        chapter: !prologueDone ? '1 · The Lantern Picnic' : finished ? 'The road is open' : current ?
            current.chapter + ' · ' + content.chapters[current.chapter - 1].name : 'The Lantern Road',
        goal: !prologueDone ? picnic.progress(data) : finished && !current ? 'Revisit your neighbours. They remember your choices.' : current ? nextStep(data, current) : 'Speak to the neighbours in Town.',
        why: current?.reason || 'Every character keeps their own progress. Shared gatherings do not complete another player\'s story.',
        known: !prologueDone ? 'Adam needs a basket for bread. Bstrat borrowed it for blankets. The watch needs a safe path.' : knowledge(data),
        memories: memories(data), satchel,
        quests: available.map(q => ({id: q.id, name: q.name, optional: !!q.optional, active: active(data, q.id), next: nextStep(data, q)}))
    };
}
module.exports = {has, done, active, unlocked, applicable, objectiveDone, objectiveCount, bag, hasItems, instruction, currentMain, ready, progress, memories, npcLocation, nextStep, handoff, npcStatus, knowledge, journal};
