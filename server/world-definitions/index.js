const fs = require('fs');
const path = require('path');
const {registry} = require('../js/worldextensions');
const installed = new WeakSet();
function register(target = registry) {
    if (installed.has(target)) return target;
    const legacy = ['main', 'oa', 'cobsfarm', 'cobsfarmcity', 'm88n', 'MRMlabs', 'shortdestroyers', 'robits', 'taikotown', 'bitcorn'];
    for (const mapId of legacy) target.register(mapId, {id: 'legacy-quests', quests: require('../js/quests/' + mapId).quests});
    for (const file of fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js').sort()) {
        require(path.join(__dirname, file)).register(target);
    }
    installed.add(target);
    return target;
}
module.exports = {register};
