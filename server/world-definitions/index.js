const {definitions} = require('../js/worlddefinitions');
const installed = new WeakSet();
function register(target = definitions, options = {}) {
    if (installed.has(target)) return target;
    for (const map of ['main', 'oa', 'cobsfarm', 'cobsfarmcity', 'm88n', 'MRMlabs', 'shortdestroyers', 'robits', 'taikotown', 'bitcorn']) {
        target.register(map, {id: 'map-quests', quests: require('../js/quests/' + map).quests});
    }
    require('./main').register(target);
    if (options.authored !== false && options.local !== false) {
        const root = options.root || require('path').resolve(__dirname, '../..');
        require('../js/localquestbuilder').registerLocalQuests(root, target, {strict: process.env.NODE_ENV === 'production'});
        require('../js/localworldauthoring').registerDialogues(root, target);
        require('../js/scriptedsequenceloader').register(root, target);
    }
    installed.add(target); return target;
}
module.exports = {register};
