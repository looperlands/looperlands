const picnic = require('../npc-behaviors/lantern-picnic');
const content = require('../npc-behaviors/lantern-road');
const state = require('../npc-behaviors/lantern-road-state');
const {LanternRoadController} = require('../npc-behaviors/lantern-road-controller');
const PicnicScene = require('../npc-behaviors/lantern-picnic-scene');
const {buildDialogues} = require('../npc-behaviors/lantern-road-dialogue');
const questIds = new Set(content.quests.map(q => q.id));
const prologueIds = new Set(picnic.quests.map(q => q.id));

function questLog(quest, data, completed) {
    if (questIds.has(quest.id)) {
        const objectives = state.progress(data, quest), amount = objectives.length;
        let desc = completed ? quest.conclusion : state.nextStep(data, quest);
        const handoff = completed ? state.handoff(data, quest) : '';
        if (handoff) desc += '<br><br>Where this leads: ' + handoff;
        let longDesc = quest.reason + '<br><br>' + objectives.map(o => (o.done ? 'Done: ' : 'Next: ') + o.label + '. ' + o.where).join('<br>') +
            '<br><br>' + desc + '<br><br>' + state.memories(data).join('<br>');
        const satchel = state.bag(data);
        if (satchel.length) longDesc += '<br><br>Story satchel: ' + satchel.map(item => item.name).join(', ') + '.';
        return {amount, progressCount: completed ? amount : objectives.filter(o => o.done).length, desc, longDesc};
    }
    if (!completed && prologueIds.has(quest.id)) {
        const desc = picnic.progress(data);
        return {desc, longDesc: quest.startText + '<br><br>' + desc,
            ...(quest.id === picnic.BASKET && state.has(data, picnic.FOUND) ? {progressCount: 1} : {})};
    }
}

const definition = {
    id: 'lantern-road', quests: [...picnic.quests, ...content.quests], dialogues: buildDialogues(), npcBehavior: picnic.behavior,
    conditions: {story_objectives_done: (condition, session) => {
        const quest = content.quests.find(q => q.id === condition.quest);
        return quest ? state.ready(session.gameData, quest) : undefined;
    }},
    canStartQuest: quest => questIds.has(quest?.id) ? !quest.archived : undefined,
    canCompleteQuest: (quest, data) => questIds.has(quest?.id) ? state.ready(data, quest) : undefined,
    questLog,
    decorateDialogue: (node, session) => {
        if (node.storyMenu || node.storyQuest || node.storyConclusion || node.storyDirections || node.storyPresence || node.storyMemory || node.storyLead) {
            LanternRoadController.decorate(node, session);
            if (node.storyMenu && ['town-gardener', 'town-neighbour', 'town-watch'].includes(node.storyMenu)) node.npcContext = true;
        }
    },
    create(world) {
        if (!world.npcBehavior) return null;
        const picnicScene = new PicnicScene(world), road = new LanternRoadController(world);
        return {
            picnicScene, road,
            tick: () => {picnicScene.tick(); road.tick();}, forget: player => road.forget(player),
            talk: (player, npc) => road.talk(player, npc), kill: (player, mob) => road.kill(player, mob),
            ownsAction: (type, id) => type === 'travel' ? content.passages.some(p => p.id === id) :
                type === 'inspect' && content.quests.some(q => q.objectives.some(o => q.id + ':' + o.key === id)),
            travel: (player, id) => road.travel(player, id), inspect: (player, id) => road.inspect(player, id),
            packet(player) {
                const result = road.packet(player);
                const data = world.server.cache.get(player.sessionId)?.gameData || {};
                const scene = result.finalePicnic || (picnicScene.state && {...picnicScene.state, music: state.has(data, picnic.MUSIC)});
                const story = result.story || {title: 'The Lantern Picnic', goal: picnic.progress(data)};
                return {...result, story,
                    rendererExtensions: [{id: 'picnic', script: 'picnic-renderer-worker.js', data: scene},
                        {id: 'lantern-road', script: 'lantern-road-renderer-worker.js', data: result.storyScenery}],
                    worldActions: result.storyScenery.filter(o => o.id && o.action !== false && ['marker', 'parcel', 'passage'].includes(o.kind))
                        .map(o => ({id: o.id, type: o.kind === 'passage' ? 'travel' : 'inspect', label: o.label, x: o.x, y: o.y})),
                    musicAreas: scene?.phase === 'celebrating' && scene.music ?
                        [{x: scene.center.x - 8, y: scene.center.y - 6, width: 16, height: 12, track: 'fluteguitar'}] : []};
            }
        };
    }
};
module.exports = {definition, register: registry => registry.register('main', definition)};
