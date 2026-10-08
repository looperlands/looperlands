const content = require('../npc-behaviors/lantern-road');
const state = require('../npc-behaviors/lantern-road-state');
const Types = require('../../shared/js/gametypes');
const dao = require('./dao');
const Messages = require('./message');

// Only server-observed positions and active objectives can create story facts.
// Quest and choice persistence stays in the normal backend for cross-server saves.
class LanternRoadController {
    constructor(world) {
        this.world = world;
        this.pending = new Map();
        this.snapshots = new Map();
        this.discoveries = new Map();
        for (const definition of content.npcs) {
            let npc = Object.values(world.npcs).find(npc => npc.kind === Types.getKindFromString(definition.kind) &&
                npc.x === definition.x && npc.y === definition.y);
            if (!npc && definition.spawn) {
                if (world.map.isColliding(definition.x, definition.y) || world.map.isOutOfBounds(definition.x, definition.y)) {
                    throw new Error('Blocked story NPC: ' + definition.key);
                }
                npc = world.addNpc(Types.getKindFromString(definition.kind), definition.x, definition.y);
            }
            if (!npc) throw new Error('Missing story NPC: ' + definition.key);
            npc.behaviorState = {...npc.behaviorState, key: definition.key, label: definition.label,
                activity: npc.behaviorState?.activity || 'waiting with news from the lantern road', orientation: Types.Orientations.DOWN};
        }
        if (world.npcBehavior) {
            for (const routine of content.gatheringRoutines) world.npcBehavior.registerRoutine(routine);
            for (const npc of content.npcs) {
                const quests = content.quests.filter(q => q.npcKey === npc.key);
                if (!world.npcBehavior.routines.has(npc.key)) {
                    world.npcBehavior.registerRoutine({key: npc.key, kind: npc.kind, label: npc.label, preset: 'work',
                        origin: {x: npc.x, y: npc.y}, area: {x: npc.x - 8, y: npc.y - 8, width: 17, height: 17}, stepMs: 650,
                        route: [{x: npc.x, y: npc.y, waitSeconds: 30, activity: 'keeping watch over the local road'}],
                        lines: {greeting: [npc.presence], return: [npc.presence]}});
                }
                const routine = world.npcBehavior.routines.get(npc.key);
                if (!routine) continue;
                routine.definition.questIds = [...(routine.definition.questIds || []), ...quests.map(q => q.id)];
                routine.definition.reactions = [...(routine.definition.reactions || []), ...quests.map(q => ({
                    when: {questCompleted: q.id}, lines: {return: [q.dialogue.reply], quest: [q.dialogue.reply]}
                }))];
            }
            world.npcBehavior.config.conversations.push(content.gatheringConversation);
        }
    }

    data(player) { return this.world.server.cache.get(player.sessionId)?.gameData || {}; }

    async record(player, flag) {
        const session = this.world.server.cache.get(player.sessionId);
        if (!session || state.has(session.gameData, flag)) return;
        const response = await dao.registerChoice(session.nftId, flag);
        if (response === undefined) throw new Error('Could not save this discovery. Please try again.');
        const latest = this.world.server.cache.get(player.sessionId);
        if (!latest || latest.nftId !== session.nftId) return;
        latest.gameData.choices = [...new Set([...(latest.gameData.choices || []), flag])];
        this.world.server.cache.set(player.sessionId, latest);
    }

    async inspect(player, id) {
        const previous = this.pending.get(player.nftId) || Promise.resolve();
        const operation = previous.catch(() => {}).then(async () => {
            if (!player.hasEnteredGame || player.isDead || this.world.players[player.id] !== player) throw new Error('Enter the world before inspecting a story location.');
            const q = content.quests.find(q => q.objectives.some(o => q.id + ':' + o.key === id));
            const objective = q?.objectives.find(o => q.id + ':' + o.key === id);
            const data = this.data(player);
            if (!q || !objective || objective.type !== 'inspect' || !state.active(data, q.id) || !state.applicable(data, objective) ||
                Math.abs(player.x - objective.x) + Math.abs(player.y - objective.y) > 3) throw new Error('This objective is not available here.');
            await this.record(player, content.objectiveFlag(q, objective));
            this.discoveries.set(player.id, {text: objective.result, until: Date.now() + 120000});
            this.snapshots.delete(player.id);
            return {text: objective.result, quest: q.id, objective: objective.key};
        });
        this.pending.set(player.nftId, operation);
        try { return await operation; }
        finally { if (this.pending.get(player.nftId) === operation) this.pending.delete(player.nftId); }
    }

    travel(player, id) {
        const passage = content.passages.find(p => p.id === id);
        if (!player.hasEnteredGame || player.isDead || this.world.players[player.id] !== player || !passage ||
            !state.done(this.data(player), passage.requires) ||
            Math.abs(player.x - passage.x) + Math.abs(player.y - passage.y) > 3 ||
            !this.world.isValidPosition(passage.tx, passage.ty)) throw new Error('This passage is not available here.');
        player.setPosition(passage.tx, passage.ty);
        player.clearTarget();
        player.broadcast(new Messages.Teleport(player));
        this.world.pushToPlayer(player, new Messages.Teleport(player));
        this.world.handlePlayerVanish(player);
        this.world.pushRelevantEntityListTo(player);
        return {text: 'You follow the passage. ' + passage.label + '.'};
    }

    forget(player) { this.snapshots.delete(player.id); this.discoveries.delete(player.id); }

    packet(player) {
        const data = this.data(player);
        const snapshot = JSON.stringify([data.quests, data.choices, player.x, player.y, this.discoveries.get(player.id)?.until > Date.now()]);
        const cached = this.snapshots.get(player.id);
        if (cached?.snapshot === snapshot) return cached.packet;
        const journal = state.journal(data);
        const active = content.quests.filter(q => state.active(data, q.id));
        journal.inspect = active.flatMap(q => state.progress(data, q).filter(o => !o.done && o.type === 'inspect' &&
            Math.abs(player.x - o.x) + Math.abs(player.y - o.y) <= 3).map(o => ({id: q.id + ':' + o.key, label: o.label})));
        const markers = active.flatMap(q => state.progress(data, q).filter(o => !o.done && o.type === 'inspect').map(o => ({
            id: q.id + ':' + o.key, x: o.x, y: o.y, kind: 'marker', label: o.label
        })));
        const passages = content.passages.filter(p => state.done(data, p.requires));
        journal.passages = passages.filter(p => Math.abs(player.x - p.x) + Math.abs(player.y - p.y) <= 3).map(p => ({id: p.id, label: p.label}));
        markers.push(...passages.map(p => ({id: p.id, x: p.x, y: p.y, kind: 'passage', label: p.label})));
        const lights = [];
        const add = (quest, x, y, label, kind = 'lantern') => {if (state.done(data, quest)) lights.push({x, y, label, kind});};
        add('LANTERN_COAST_SIGNAL', 57, 260, 'Coastal signal restored');
        add('LANTERN_STILL_WAITING', 43, 176, 'Mara\'s trail lantern');
        add('LANTERN_MISSING_LIGHT', 47, 128, state.has(data, 'lantern:public-memorial') ? 'A memorial for the missing' : 'A quiet remembrance', 'memorial');
        add('LANTERN_ROAD_WE_TAKE', state.has(data, 'lantern:caravan-detour') ? 64 : 44, 77, 'Nessa\'s chosen caravan route');
        add('LANTERN_MISSING_REGULATOR', 91, 28, 'Northern regulator fitted');
        if (state.done(data, 'LANTERN_LIGHT_SHARED')) {
            lights.push({x: 68, y: 378, kind: 'lantern', label: 'The lantern road is open'});
            journal.event = state.has(data, 'lantern:rowan-keeper') ? 'Rowan is sharing the keeper\'s watch.' : 'Orin and Mara are taking over while Rowan rests.';
        }
        const gathering = state.done(data, 'LANTERN_BRING_WITH_US') || state.active(data, 'LANTERN_BRING_WITH_US') || state.active(data, 'LANTERN_LONG_TABLE');
        const picnic = gathering ? {phase: 'celebrating', center: {x: 40, y: 450}, longTable: true,
            music: state.has(data, 'lantern:music-picnic'), golden: state.done(data, 'LANTERN_SPARK_TOOL'),
            keepsake: state.done(data, 'LANTERN_MISSING_PLACES'), watchRelief: state.done(data, 'LANTERN_WATCH_INVITED')} : null;
        const discovery = this.discoveries.get(player.id);
        if (discovery?.until > Date.now()) journal.event = discovery.text;
        const packet = {story: journal, storyScenery: [...lights, ...markers], finalePicnic: picnic};
        this.snapshots.set(player.id, {snapshot, packet});
        return packet;
    }

    static memories(data, key) {
        const lines = [];
        if (['town-gardener', 'town-neighbour', 'party-wildwill'].includes(key)) {
            if (state.has(data, 'lantern:share-basket')) lines.push('I remember your sharing idea: blankets first, bread next. One basket brought us together.');
            if (state.has(data, 'lantern:return-basket')) lines.push(key === 'town-gardener' ?
                'I remember you asking Bstrat to return my basket. I could pack the bread as soon as the blankets were out.' :
                'I remember you asking Bstrat to return the basket. Adam could pack the bread as soon as the blankets were out.');
        }
        if (['town-gardener', 'town-neighbour', 'town-watch', 'party-wildwill'].includes(key)) {
            if (state.has(data, 'lantern:quiet-picnic')) lines.push('You chose a quiet picnic so the watch could rest. I kept that invitation in mind.');
            if (state.has(data, 'lantern:music-picnic')) lines.push('You chose music and invited the watch to join the songs. I remember that welcome.');
        }
        if (['town-priest', 'lantern-keeper', 'party-wildwill'].includes(key)) {
            if (state.has(data, 'lantern:public-memorial')) lines.push('Because you chose to remember together, I can speak of the memorial names with care.');
            if (state.has(data, 'lantern:private-memorial')) lines.push("I remember your quiet memorial. I keep Elian's personal words private.");
        }
        if (['desert-courier', 'party-wildwill'].includes(key)) {
            if (state.has(data, 'lantern:caravan-detour')) lines.push('I remember you choosing shelter for the tired travellers. The eastern detour meant lantern oil could come with them.');
            if (state.has(data, 'lantern:caravan-direct')) lines.push('I remember you choosing the direct road for the heavy parts. The repair tools could travel along the central road.');
        }
        if (['lantern-keeper', 'party-wildwill'].includes(key)) {
            if (state.has(data, 'lantern:rowan-keeper')) lines.push(key === 'lantern-keeper' ?
                'You asked me to share the watch. I can keep the flame without keeping everyone away.' : 'I heard Rowan chose to share the watch. I saved a place for a keeper who can finally have company.');
            if (state.has(data, 'lantern:rowan-handover')) lines.push(key === 'lantern-keeper' ?
                'You gave me room to teach new keepers and rest. I did not know how much I needed that choice.' : 'I heard Rowan chose to teach new keepers and rest. I saved him a quiet place beside us.');
        }
        if (key === 'party-wildwill' && state.done(data, 'LANTERN_LONG_TABLE')) {
            if (state.done(data, 'LANTERN_WATCH_INVITED')) lines.push('The watch can stay all evening because you arranged a relief patrol. I kept a chair free.');
            if (state.done(data, 'LANTERN_MISSING_PLACES')) lines.push('I left the keepsake lantern beside the table. Those families asked for their private messages to stay private.');
            if (state.done(data, 'LANTERN_WILL_NEIGHBOUR')) lines.push('Jimi is welcome beside me because you carried my personal invitation. I am glad I finally asked.');
        }
        return lines;
    }

    static decorate(node, session) {
        const data = session.gameData || {};
        const key = node.storyMenu || node.storyPresence || node.storyMemory || node.storyLead;
        const npc = content.npcs.find(npc => npc.key === key);
        if (node.storyMenu) {
            const completedHere = content.quests.filter(q => q.npcKey === key && state.done(data, q.id));
            const local = content.quests.filter(q => q.npcKey === key && !state.done(data, q.id));
            const current = local.find(q => state.active(data, q.id));
            node.text = current ? (state.ready(data, current) ? current.dialogue.ready : current.dialogue.waiting) :
                completedHere.length ? completedHere.at(-1).dialogue.reply : npc.presence;
            if (!current && !completedHere.length && key === 'town-priest') node.text = state.npcStatus(data, key);
            if (['town-gardener', 'town-neighbour', 'town-watch', 'desert-courier', 'town-priest'].includes(key)) {
                node.text += '<br><br>' + LanternRoadController.memories(data, key).slice(0, 1).join('');
            }
        }
        if (node.storyPresence) node.text = npc.presenceAfter && state.done(data, npc.presenceAfter.quest) ? npc.presenceAfter.text : npc.presence;
        if (node.storyMemory) node.text = LanternRoadController.memories(data, key).join('<br><br>') ||
            'We have not shared that much of the road yet. Tell me what you learn; I would like to hear it.';
        if (node.storyLead) {
            const q = content.quests.find(q => state.active(data, q.id) && !q.optional) ||
                content.quests.find(q => state.unlocked(data, q) && !state.done(data, q.id) && !q.optional);
            const target = q && content.npcs.find(npc => npc.key === q.npcKey);
            if (!state.done(data, 'LANTERN_INVITATION')) {
                node.text = 'Ask Ordinary Adam on his Town market rounds about the first picnic. Help him and Bstrat prepare it, then we can follow the invitations along the road.';
            } else if (!state.done(data, 'LANTERN_WRECK_LETTERS') && !state.done(data, 'LANTERN_FOREST_MARKERS')) {
                node.text = 'Jimi last saw Rowan on the coast. Mara keeps the old forest markers. Ask Jimi at his Beach landing or Mara on the southern Forest trail. You can follow either lead first.';
            } else if (q && target.key === key) {
                node.text = state.active(data, q.id) ? (state.ready(data, q) ? q.dialogue.ready : q.dialogue.waiting) : q.dialogue.offer;
            } else if (q) {
                node.text = 'Ask ' + state.npcLocation(target) + ' about what you have learned. They can help you with ' + q.name + '.';
            } else {
                node.text = 'The road is open. Stay for a while, or ask our neighbours about the things they still need help with. You have a place here.';
            }
        }
        if (node.storyQuest) {
            const q = content.quests.find(q => q.id === node.storyQuest);
            node.text = state.ready(data, q) ? q.dialogue.ready : q.dialogue.waiting;
        }
        if (node.storyDirections) {
            const q = content.quests.find(q => q.id === node.storyDirections);
            const pending = state.progress(data, q).find(o => !o.done);
            node.text = pending ? pending.where + '<br><br>Look for the marker called “' + pending.label +
                '”. Walk beside it, then click it or press E.' : 'You have checked everything I asked for. Tell me what you found when you are ready.';
        }
        return node;
    }
}
module.exports = {LanternRoadController};
