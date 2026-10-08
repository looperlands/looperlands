const content = require('../server/npc-behaviors/lantern-road');
const picnic = require('../server/npc-behaviors/lantern-picnic');
const state = require('../server/npc-behaviors/lantern-road-state');
const escape = text => String(text).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const npcKeys = ['town-gardener', 'town-watch', 'town-neighbour'];
const targets = new Map([
    ...picnic.behavior.npcs.flatMap(npc => npc.schedule?.buildings.map(b => ['building:' + b.key, b.entrance]) || []),
    ...content.npcs.map(npc => ['npc:' + npc.key, {x: npc.x, y: npc.y, npcKey: npc.key}]),
    ...content.quests.flatMap(q => q.objectives.map(o => ['objective:' + q.id + ':' + o.key,
        {x: o.x, y: o.y, npcKey: o.npcKey, quest: q.id, when: o.when}]))
]);
function storyData(saved) {
    const quests = {};
    for (const q of saved.quests || []) (quests[q.status] ||= []).push(q);
    return {...saved, quests};
}
function targetFor(id, data, world) {
    const target = targets.get(id);
    if (!target || (target.quest && (!state.active(data, target.quest) || (target.when && !state.has(data, target.when))))) return null;
    // Mobile Town hosts can have left their authored starting position.
    const npc = target.npcKey && Object.values(world.npcs).find(npc => npc.behaviorState?.key === target.npcKey);
    return npc ? {x: npc.x, y: npc.y} : {x: target.x, y: target.y};
}
function render(saved, index) {
    const data = storyData(saved);
    const button = (label, target, disabled = false) => '<button data-target="' + escape(target) + '"' +
        (disabled ? ' disabled' : '') + '>' + escape(label) + '</button>';
    const status = id => state.done(data, id) ? 'Completed' : state.active(data, id) ? 'In progress' : 'Not started';
    const prologue = picnic.quests.map((q, i) => {
        const npc = content.npcs.find(npc => npc.key === npcKeys[i]);
        return '<li><strong>' + escape(q.name) + '</strong> · ' + status(q.id) + '<p>' + escape(q.startText) + '</p>' +
            button('Visit ' + npc.label, 'npc:' + npc.key) + '</li>';
    }).join('');
    const quests = content.quests.map(q => {
        const npc = content.npcs.find(npc => npc.key === q.npcKey);
        const unlocked = state.unlocked(data, q);
        const objectives = state.progress(data, q);
        return '<article><h3>' + escape(q.name) + (q.optional ? ' · optional' : '') + '</h3><p class="status">' + status(q.id) +
            (!unlocked && !state.done(data, q.id) ? ' · Waiting for: ' + escape(q.requiredQuests.filter(id => !state.done(data, id)).map(id =>
                [...picnic.quests, ...content.quests].find(q => q.id === id).name).join(', ')) : '') + '</p>' +
            button('Visit ' + npc.label, 'npc:' + npc.key) + '<p><strong>Say:</strong> ' + escape(q.dialogue.topic) +
            '<br><strong>Ask:</strong> ' + escape(q.dialogue.question) + '<br><strong>Accept:</strong> ' + escape(q.dialogue.accept) + '</p>' +
            '<ol>' + objectives.map(o => '<li>' + escape(o.label) + (o.done ? ' · done' : o.type === 'kill' ? ' · ' + state.objectiveCount(data, q, o) + '/' + o.amount : '') + '<p>' + escape(o.where) + ' ' + escape(state.instruction(o)) + '</p>' +
                button(o.type === 'talk' ? 'Visit conversation partner' : o.type === 'kill' ? 'Go to the combat area' : 'Go to this objective', 'objective:' + q.id + ':' + o.key, !state.active(data, q.id) || o.done) + '</li>').join('') + '</ol>' +
            '<p>Follow the instructions for each objective, then return to ' + escape(npc.label) + '.</p>' +
            '<details><summary>Expected report and reply</summary><p><strong>You:</strong> ' + escape(q.dialogue.report) +
            '</p><p><strong>' + escape(npc.label) + ':</strong> ' + escape(q.dialogue.reply) + '</p>' +
            (q.choices ? '<p>Choose one: ' + q.choices.map(c => escape(c.label) + ' → ' + escape(c.response)).join('<br>') + '</p>' : '') + '</details></article>';
    });
    const main = content.chapters.slice(1).map(ch => '<h2>' + ch.number + '. ' + escape(ch.name) + '</h2>' +
        content.quests.map((q, i) => q.chapter === ch.number && !q.archived ? quests[i] : '').join('')).join('');
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Lantern Road · Local walkthrough</title><style>body{font:17px/1.55 system-ui;margin:32px auto;padding:0 20px;max-width:900px;color:#292334;background:#fffaf0}' +
        'article{border:1px solid #dfd4c4;border-radius:8px;padding:18px;margin:18px 0}h2{margin-top:48px}h3{margin-top:0}' +
        'button,select{font:inherit;padding:8px 12px;cursor:pointer;margin:4px 8px 4px 0}button:disabled{opacity:.45;cursor:default}' +
        'li{margin:16px 0}li p{margin:6px 0}.status{color:#625944}details{margin-top:16px}#feedback{position:sticky;top:0;background:#fffaf0;padding:12px 0}</style>' +
        '<h1>The Lantern Road walkthrough</h1><p>Local test player: level 40 avatar, level 40 golden sword, moderately faster movement and extra health.</p>' +
        '<form><label>Player <select name="player" onchange="this.form.submit()"><option value="2"' + (index === 2 ? ' selected' : '') +
        '>2 · Continue your save</option><option value="1"' + (index === 1 ? ' selected' : '') + '>1 · Separate test save</option></select></label></form>' +
        '<p><a href="/preview/player/' + index + '" target="lantern-game">Open a fresh game session</a> · <a href="?player=' + index + '">Refresh saved progress</a></p>' +
        '<p>Keep this page beside the game. Travel buttons move your connected player to a named NPC or active marker. They do not accept, inspect or complete quests. ' +
        'After accepting a quest or choosing a route, refresh this page to enable its markers. The main chapters run in order: coast, forest, memorial, desert, northern works, keeper and long table. Optional stories have their own prerequisites.</p>' +
        '<p>Conversations use speech bubbles: press E or Enter, or click Continue, to hear the next line. Use arrow keys to select a reply, and Enter to answer; clicking replies also works. A choice panel opens when a decision matters. Press Escape or walk away to leave. NPCs stay still while you are talking.</p><p>Shared world time: <button data-mode="day">Day</button><button data-mode="night">Night</button><button data-mode="cycle">Cycle</button></p>' +
        '<details><summary>Test daily NPC routines</summary><p>Everyone shares the same clock and NPC positions. Changing the time changes lighting and schedules together. ' +
        'Allow the neighbours time to walk; conversations and the picnic finish before they resume their day.</p><p>' +
        '<button data-hour="8">08:00 · breakfast and shift change</button><button data-hour="14">14:00 · work</button>' +
        '<button data-hour="16.5">16:30 · free time</button><button data-hour="19">19:00 · home</button><button data-hour="22">22:00 · sleep and night watch</button></p>' +
        button('Go to the guesthouse entrance', 'building:guesthouse') + button('Go to the town hall entrance', 'building:town-hall') +
        '<p>Follow an NPC through the door, or use a Visit button to find them indoors. Their conversation hints at their current activity; there is no schedule question or timetable in the game. Sleeping neighbours stay quiet until you speak to them.</p>' +
        '<ul id="routines"></ul></details>' +
        '<div id="feedback" role="status" aria-live="polite">Travel requires the selected player to be connected.</div>' +
        '<h2>1. The Lantern Picnic</h2><ol>' + prologue + '</ol>' + main + '<h2>Earlier test quests still in progress</h2>' +
        content.quests.map((q, i) => q.archived && state.active(data, q.id) ? quests[i] : '').join('') +
        '<script>document.querySelectorAll("button[data-target]").forEach(button=>button.addEventListener("click",async()=>{' +
        'const feedback=document.getElementById("feedback");try{const response=await fetch("/preview/player/' + index + '/travel",' +
        '{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({target:button.dataset.target})});' +
        'feedback.textContent=response.ok?"Your player is there. Continue in the game with E or a click.":"Connect this player and refresh progress before travelling.";' +
        '}catch(error){feedback.textContent="The local test server is unavailable.";}}));' +
        'document.querySelectorAll("button[data-mode]").forEach(button=>button.addEventListener("click",async()=>{' +
        'const feedback=document.getElementById("feedback");try{const response=await fetch("/preview/ambience",' +
        '{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:button.dataset.mode})});' +
        'feedback.textContent=response.ok?"World time: "+button.textContent:"Time could not be changed.";' +
        '}catch(error){feedback.textContent="The local test server is unavailable.";}}));' +
        'document.querySelectorAll("button[data-hour]").forEach(button=>button.addEventListener("click",async()=>{' +
        'const response=await fetch("/preview/time",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hour:Number(button.dataset.hour)})});' +
        'document.getElementById("feedback").textContent=response.ok?"Clock changed. Watch the NPCs walk to their next activity.":"Time could not be changed.";refreshRoutines();}));' +
        'async function refreshRoutines(){try{const response=await fetch("/preview/state");const state=await response.json();' +
        'const list=document.getElementById("routines");list.replaceChildren();state.npcs.filter(npc=>npc.schedule).forEach(npc=>{' +
        'const row=document.createElement("li");row.textContent=npc.label+": "+npc.activity+" · "+npc.scheduleLocation;list.append(row);});}catch(error){}}' +
        'refreshRoutines();setInterval(refreshRoutines,5000);</script></html>';
}
module.exports = {targets, storyData, targetFor, render};
