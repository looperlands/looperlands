const {definitions} = require('../js/worlddefinitions');
const installed = new WeakSet();
function register(target = definitions, options = {}) {
    if (installed.has(target)) return target;
    for (const map of ['main', 'oa', 'cobsfarm', 'cobsfarmcity', 'm88n', 'MRMlabs', 'shortdestroyers', 'robits', 'taikotown', 'bitcorn']) {
        target.register(map, {id: 'map-quests', quests: require('../js/quests/' + map).quests});
    }
    require('./main').register(target);
    if (options.local !== false) {
        const root = require('path').resolve(__dirname, '../..');
        require('../js/localquestbuilder').registerLocalQuests(root, target);
        require('../js/localworldauthoring').registerDialogues(root, target);
    }
    installed.add(target); return target;
}
module.exports = {register};
