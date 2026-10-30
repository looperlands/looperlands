const {definitions} = require('../js/worlddefinitions');
const installed = new WeakSet();
function register(target = definitions, options = {}) {
    if (installed.has(target)) return target;
    for (const map of ['main', 'oa', 'cobsfarm', 'cobsfarmcity', 'm88n', 'MRMlabs', 'shortdestroyers', 'robits', 'taikotown', 'bitcorn']) {
        target.register(map, {id: 'map-quests', quests: require('../js/quests/' + map).quests});
    }
    require('./main').register(target);
    const root = options.root || require('path').resolve(__dirname, '../..');
    for (const mapId of require(require('path').join(root, 'server/config.json')).maps) {
        target.register(mapId, {id: 'scene-parallax', createScene: require('./parallax').createParallaxScene});
    }
    if (options.authored !== false && options.local !== false) {
        const root = options.root || require('path').resolve(__dirname, '../..');
        require('../js/localquestbuilder').registerLocalQuests(root, target, {strict: process.env.NODE_ENV === 'production'});
        require('../js/localworldauthoring').registerDialogues(root, target);
        require('../js/scriptedsequenceloader').register(root, target);
    }
    installed.add(target); return target;
}
module.exports = {register};
