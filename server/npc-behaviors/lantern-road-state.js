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
function nextStep(data, q) {
    const npc = content.npcs.find(n => n.key === q.npcKey);
    if (!active(data, q.id)) return 'Speak to ' + npc.label + ' (' + npc.x + ', ' + npc.y + ') to begin.';
    const pending = progress(data, q).find(o => !o.done);
    if (pending) return pending.label + ' — ' + pending.scene + (pending.x ? ' (' + pending.x + ', ' + pending.y + '). Walk to the marker and click it or press E to inspect it.' : '.');
    return 'Report to ' + npc.label + ' (' + npc.x + ', ' + npc.y + ').';
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
        known: !prologueDone ? 'Adam needs a basket for bread. Bstrat borrowed it for blankets. The watch needs a safe path.' :
            done(data, 'LANTERN_UNDELIVERED_LETTER') ? 'Elian wanted the road kept open. Rowan shut it down after a failed rescue, trying to protect the neighbours.' :
            done(data, 'LANTERN_KEEPER_KNOTS') ? 'Rowan deliberately disconnected the forest relay. The ledger and coastal letters can explain why.' :
            'Rowan used to carry invitations between the regions. His empty place at the picnic starts the search.',
        memories: memories(data),
        quests: available.map(q => ({id: q.id, name: q.name, optional: !!q.optional, active: active(data, q.id), next: nextStep(data, q)}))
    };
}
module.exports = {has, done, active, unlocked, applicable, objectiveDone, ready, progress, memories, nextStep, journal};
