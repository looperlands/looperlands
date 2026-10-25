const {isLocalPlaytest} = require('./localplaytest');
const WorldTime = require('../../client/js/worldtime-worker');

let offset;

function parseTimeOfDay(value) {
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        throw new Error('Choose a time of day between 00:00 and 23:59.');
    }
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60 + minutes) / 1440 * WorldTime.duration;
}

function hasOverride() {
    return isLocalPlaytest() && offset !== undefined;
}

function now() {
    return performance.now() + (hasOverride() ? offset : 0);
}

function startAt(value) {
    if (!isLocalPlaytest()) return;
    offset = parseTimeOfDay(value) - performance.now();
}

function syncPlayer(player) {
    if (hasOverride() && player.hasEnteredGame && !player.isBot()) {
        player.send([require('../../shared/js/gametypes').Messages.WORLD_TIME, now()]);
    }
}

module.exports = {parseTimeOfDay, hasOverride, now, startAt, syncPlayer};
