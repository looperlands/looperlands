const {definitions} = require('../js/worlddefinitions');
const installed = new WeakSet();
function register(target = definitions) {
    if (installed.has(target)) return target;
    for (const map of ['main', 'oa', 'cobsfarm', 'cobsfarmcity', 'm88n', 'MRMlabs', 'shortdestroyers', 'robits', 'taikotown', 'bitcorn']) {
        target.register(map, {id: 'map-quests', quests: require('../js/quests/' + map).quests});
    }
    require('./main').register(target);
    installed.add(target); return target;
}
module.exports = {register};
