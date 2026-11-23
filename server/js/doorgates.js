const {create} = require('../../shared/js/scriptedsequences');

// Tiled properties acquire a "t" prefix in both runtime map exports.
const gates = ['nft', 'item', 'quest', 'collection', 'http_redirect', 'level', 'weapon_level'];
function questAloneOpensDoor(properties, prefix = '') {
    return !!properties[prefix + 'quest'] && !properties[prefix + 'tid'] && !properties[prefix + 'time_range'] &&
        gates.every(gate => gate === 'quest' || !Object.hasOwn(properties, prefix + gate));
}

function questGateReveals(doors) {
    const reveals = [];
    for (const door of doors) {
        const caption = door.tquest_reveal;
        if (typeof caption !== 'string' || !caption.trim() || !questAloneOpensDoor(door, 't')) continue;
        const {x, y} = door;
        reveals.push({
            ...create('quest-gate:' + x + ',' + y),
            name: 'Gate opened',
            when: {type: 'quest.completed', value: door.tquest},
            steps: [
                {type: 'camera', x, y, seconds: 0.65},
                {type: 'caption', text: caption, seconds: Math.max(2, caption.length / 20)},
                {type: 'camera_reset', seconds: 0}
            ]
        });
    }
    return reveals;
}

module.exports = {gates, questAloneOpensDoor, questGateReveals};
