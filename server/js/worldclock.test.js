const fs = require('fs'), vm = require('vm');
const WorldTime = require('../../client/js/worldtime-worker');
global.Types = {};
const Types = require('../../shared/js/gametypes');

function setup(local = true) {
    const state = {time: 123456, local}, module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./worldclock'), 'utf8'), {
        module, performance: {now: () => state.time},
        require: name => name === './localplaytest' ? {isLocalPlaytest: () => state.local}
            : name.endsWith('gametypes') ? Types : WorldTime
    });
    return {clock: module.exports, state};
}

test('local time starts at the requested minute, keeps advancing and wraps at midnight', () => {
    const {clock, state} = setup();
    expect(clock.now()).toBe(state.time);
    expect(clock.hasOverride()).toBe(false);
    clock.startAt('23:59');
    expect(clock.now()).toBeCloseTo(WorldTime.duration - 2500);
    state.time += 5000;
    expect(clock.now()).toBeCloseTo(WorldTime.duration + 2500);
    expect(WorldTime.isInRange(clock.now(), '00:00-06:00')).toBe(true);
    clock.startAt('00:00');
    expect(clock.now()).toBe(0);
});

test('a local override synchronizes players on any map and leaves bots and unjoined players alone', () => {
    const {clock} = setup();
    const player = {hasEnteredGame: true, isBot: () => false, send: jest.fn()};
    clock.syncPlayer(player);
    expect(player.send).not.toHaveBeenCalled();
    clock.startAt('20:00');
    clock.syncPlayer(player);
    expect(player.send).toHaveBeenCalledWith([Types.Messages.WORLD_TIME, 3000000]);
    clock.syncPlayer({...player, isBot: () => true});
    clock.syncPlayer({...player, hasEnteredGame: false});
    expect(player.send).toHaveBeenCalledTimes(1);
});

test('production cannot set or synchronize a local override', () => {
    const {clock, state} = setup(false), player = {send: jest.fn()};
    clock.startAt('20:00');
    expect(clock.hasOverride()).toBe(false);
    expect(clock.now()).toBe(state.time);
    state.local = true;
    clock.startAt('08:00');
    state.local = false;
    expect(clock.now()).toBe(state.time);
    clock.syncPlayer(player);
    expect(player.send).not.toHaveBeenCalled();
});
