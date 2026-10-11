const {definitions} = require('../js/worlddefinitions');
const installed = new WeakSet();
const fs = require('fs');
const path = require('path');
const {loadMapQuests} = require('../js/questboard/config');
function register(target = definitions) {
    if (installed.has(target)) return target;
    require('./main').register(target);
    const directory = process.env.QUEST_BOARD_CONFIG_DIR || path.resolve(__dirname, '../js/quests');
    const maps = new Set(['main', 'oa', 'cobsfarm', 'cobsfarmcity', 'm88n', 'MRMlabs', 'shortdestroyers', 'robits', 'taikotown', 'bitcorn']);
    if (fs.existsSync(directory)) for (const file of fs.readdirSync(directory)) if (file.endsWith('.json')) maps.add(file.slice(0, -5));
    for (const map of maps) {
        const loaded = loadMapQuests(map, directory, {storyIds: target.quests.map(q => q.id)});
        target.register(map, {id: 'map-quests', quests: loaded.json ? loaded.config.stories : loaded.quests});
        if (loaded.json) target.questBoards.set(map, loaded.config);
    }
    const questIds = new Set(target.quests.map(q => q.id));
    for (const config of target.questBoards.values()) for (const q of config.quests) {
        if (questIds.has(q.id)) throw new Error('Duplicate quest ID: ' + q.id);
        questIds.add(q.id);
    }
    installed.add(target); return target;
}
module.exports = {register};
