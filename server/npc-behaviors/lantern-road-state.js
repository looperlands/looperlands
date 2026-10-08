const content = require('./lantern-road');
const picnic = require('./lantern-picnic');
const has = (data, flag) => (data?.choices || []).includes(flag);
const done = (data, id) => ['COMPLETED', 'FINISHED'].some(status =>
    (data?.quests?.[status] || []).some(q => (q.questKey || q.id) === id));
const active = (data, id) => !done(data, id) && (data?.quests?.IN_PROGRESS || []).some(q => (q.questKey || q.id) === id);
const unlocked = (data, q) => q.requiredQuests.every(id => done(data, id));
const applicable = (data, objective) => !objective.when || has(data, objective.when);
const objectiveDone = (data, q, objective) => has(data, content.objectiveFlag(q, objective, objective.type === 'kill' ? objective.amount : undefined));
const ready = (data, q) => active(data, q.id) && q.objectives.filter(o => applicable(data, o)).every(o => objectiveDone(data, q, o));
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
    if (has(data, 'lantern:caravan-direct')) lines.push('Nessa took the direct road and brings the heavier repair tools.');
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
    const pending = progress(data, q).find(o => !o.done);
    if (pending) return pending.label + '. ' + pending.where + ' Walk beside its marker and click it or press E.';
    return 'Report to ' + npcLocation(npc) + '.';
}
// Link only discoveries the player has actually made. Unfinished parallel
// reports explain why a later conversation is still waiting.
function handoff(data, q) {
    const next = content.quests.filter(candidate => candidate.optional === q.optional &&
        candidate.requiredQuests.includes(q.id) && !done(data, candidate.id));
    const available = next.filter(candidate => unlocked(data, candidate));
    if (available.length) return available.map(candidate => candidate.name + ': ' + nextStep(data, candidate)).join('<br>');
    const waiting = next[0];
    if (!waiting) return '';
    const missing = waiting.requiredQuests.filter(id => !done(data, id)).map(id => content.quests.find(candidate => candidate.id === id)).filter(Boolean);
    return 'Before ' + waiting.name + ', we still need ' + missing.map(candidate => candidate.name + ' from ' +
        npcLocation(content.npcs.find(npc => npc.key === candidate.npcKey))).join(' and ') + '.';
}
function npcStatus(data, key) {
    const local = content.quests.filter(q => q.npcKey === key && !done(data, q.id));
    const current = local.find(q => active(data, q.id)) || local.find(q => unlocked(data, q));
    if (current) return active(data, current.id) ?
        (ready(data, current) ? current.dialogue.ready : current.dialogue.waiting) : current.dialogue.offer;
    const waiting = local.sort((a, b) => a.chapter - b.chapter)[0];
    // Town hosts should point to the current search, not request a finale
    // invitation before the road has even been repaired.
    if (!waiting || (waiting.chapter === 8 && !done(data, 'LANTERN_LIGHT_SHARED'))) return '';
    const missing = waiting.requiredQuests.filter(id => !done(data, id));
    if (missing.includes(picnic.INVITE)) return 'Have you spoken to Adam and Bstrat in Town? They are still preparing the first picnic. I would like to hear from them before we set out.';
    return 'I still need news from ' + missing.map(id => {
        const q = content.quests.find(q => q.id === id);
        return q ? npcLocation(content.npcs.find(npc => npc.key === q.npcKey)) : 'our neighbours in Town';
    }).join(' and ') + '. Will you ask them what they found?';
}
function knowledge(data) {
    if (done(data, 'LANTERN_LONG_TABLE')) return 'The restored road brought the communities to one table. Remembering the missing did not mean leaving the living alone.';
    if (done(data, 'LANTERN_LIGHT_SHARED')) return 'The safe regulator and shared watch let every community keep its light. The road is open; the invitations can finally reach their neighbours.';
    if (done(data, 'LANTERN_KEEPER_CHOICE')) return has(data, 'lantern:rowan-handover') ?
        'Rowan read Elian\'s letter and chose to teach new keepers, then rest. Orin and Mara can share the controls.' :
        'Rowan read Elian\'s letter and chose to return with a shared watch. He no longer has to keep the flame alone.';
    if (done(data, 'LANTERN_ROWAN_PROTECTED')) return 'Rowan stayed alone in the Gauntlet after the rescue. Orin\'s regulator now makes it safe to share the flame; carry that evidence and Elian\'s letter to him.';
    if (done(data, 'LANTERN_MISSING_REGULATOR')) return 'The missing regulator was left in the northern store. Fitting it made the flame safe; Rowan\'s solitary watch is no longer necessary.';
    if (done(data, 'LANTERN_LAST_DELIVERY')) return 'Nessa\'s dispatch confirmed Rowan ordered the north closed. The undelivered regulator can make the route safe again.';
    if (done(data, 'LANTERN_UNDELIVERED_LETTER')) return 'Elian wanted the road kept open. Rowan shut it down after a failed rescue, trying to protect the neighbours.';
    if (done(data, 'LANTERN_KEEPER_KNOTS')) return 'Rowan deliberately disconnected the forest relay. The ledger and coastal letters can explain why.';
    return 'Rowan used to carry invitations between the regions. His empty place at the picnic starts the search.';
}
function journal(data = {}) {
    const prologueDone = done(data, picnic.INVITE);
    const available = content.quests.filter(q => unlocked(data, q) && !done(data, q.id));
    const current = available.find(q => active(data, q.id) && !q.optional) || available.find(q => !q.optional) || available[0];
    const finished = done(data, 'LANTERN_LONG_TABLE');
    return {
        title: 'The Lantern Road', version: content.version,
        chapter: !prologueDone ? '1 · The Lantern Picnic' : finished ? 'The road is open' : current ?
            current.chapter + ' · ' + content.chapters[current.chapter - 1].name : 'The Lantern Road',
        goal: !prologueDone ? picnic.progress(data) : finished && !current ? 'Revisit your neighbours. They remember your choices.' : current ? nextStep(data, current) : 'Speak to the neighbours in Town.',
        why: current?.reason || 'Every character keeps their own progress. Shared gatherings do not complete another player\'s story.',
        known: !prologueDone ? 'Adam needs a basket for bread. Bstrat borrowed it for blankets. The watch needs a safe path.' : knowledge(data),
        memories: memories(data),
        quests: available.map(q => ({id: q.id, name: q.name, optional: !!q.optional, active: active(data, q.id), next: nextStep(data, q)}))
    };
}
module.exports = {has, done, active, unlocked, applicable, objectiveDone, ready, progress, memories, npcLocation, nextStep, handoff, npcStatus, knowledge, journal};
