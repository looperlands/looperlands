const fs = require('fs');
const path = require('path');
const vm = require('vm');
const WorldTime = require('./worldtime-worker');
const at = hour => hour / 24 * WorldTime.duration;

test.each([
    ['08:00-18:00', 7.99, false], ['08:00-18:00', 8, true],
    ['08:00-18:00', 17.99, true], ['08:00-18:00', 18, false],
    ['22:00-06:00', 22, true], ['22:00-06:00', 0, true],
    ['22:00-06:00', 5.99, true], ['22:00-06:00', 6, false],
    ['22:00-06:00', 21.99, false], ['00:00-00:00', 12, true],
    ['08:30-09:15', 8.5, true], ['08:30-09:15', 9.25, false],
    [undefined, 12, true], ['', 12, false], ['24:00-06:00', 0, false],
    ['08:60-18:00', 12, false], ['bad', 12, false], [null, 12, false],
])('%s at game hour %s permits entry: %s', (range, hour, allowed) => {
    expect(WorldTime.isInRange(at(hour), range)).toBe(allowed);
});

test('opening hours repeat each game day, including before the clock epoch', () => {
    expect(WorldTime.isInRange(at(8) + WorldTime.duration * 3, '08:00-18:00')).toBe(true);
    expect(WorldTime.isInRange(at(-1), '22:00-06:00')).toBe(true);
});

function loadDefinition(file, dependencies = {}, globals = {}) {
    let definition;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), {
        Class: {extend: value => value},
        define: (names, factory) => {definition = factory(...names.map(name => dependencies[name] || {}));},
        ...globals,
    });
    return definition;
}

test.each([0, 1])('map loading preserves opening hours for entrance type %s', p => {
    const map = Object.create(loadDefinition('map.js', {}, {
        _: require('underscore'), Types: {Orientations: {DOWN: 4}},
    }));
    map.width = 100;
    const doors = map._getDoors({doors: [{x: 10, y: 20, tx: 30, ty: 40, p,
        ttime_range: '22:00-06:00', ttime_message: 'Opens at night.'}]});
    const dest = doors[map.GridPositionToTileIndex(10, 20)];
    expect(dest.timeRange).toBe('22:00-06:00');
    expect(dest.time_message).toBe('Opens at night.');
    expect(dest.portal).toBe(p === 1);
});

function entrance(dest, hour = 12) {
    const game = Object.create(loadDefinition('game.js', {'worldtime-worker': WorldTime}));
    const axios = {get: jest.fn(() => Promise.resolve({data: true})),
        post: jest.fn(() => Promise.resolve({status: 200, data: {sessionId: 'next'}}))};
    const window = {location: {}, open: jest.fn()};
    let stop;
    Object.assign(game, {
        getWorldTime: () => at(hour), showNotification: jest.fn(),
        handleScene: jest.fn(), isItemAt: () => false, updatePos: jest.fn(),
        map: {isDoor: () => true, getDoorDestination: () => dest, getCurrentTrigger: () => undefined},
        player: {hasTarget: () => false, forEachAttacker: jest.fn(),
            onStopPathing: callback => {stop = callback;}},
    });
    // Register the real stop-pathing callback without connecting to a live server.
    const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
    const start = source.indexOf('self.player.onStopPathing(function');
    const end = source.indexOf('self.player.onRequestPath', start);
    vm.runInNewContext(source.slice(start, end), {self: game, axios, window, Chest: function () {}});
    return {game, axios, window, stop: () => stop(10, 20)};
}

test('closed hours block cross-map travel and other gate requests with a custom message', () => {
    const {game, axios, stop} = entrance({map: 'main', nft: 'token', timeRange: '22:00-06:00', time_message: 'Closed.'});
    stop();
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(game.showNotification).toHaveBeenCalledWith('Closed.');
});

test.each([undefined, '08:00-18:00'])('open or unrestricted hours preserve NFT and trigger checks (%s)', async timeRange => {
    const {axios, window, stop} = entrance({map: 'main', nft: 'token', triggerId: 'switch', timeRange});
    stop();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/?sessionId=next');
});

test('hours are checked again if an ownership request finishes after closing', async () => {
    const {game, axios, stop} = entrance({map: 'main', nft: 'token', timeRange: '08:00-18:00'});
    stop();
    game.getWorldTime = () => at(18);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(axios.post).not.toHaveBeenCalled();
    expect(game.showNotification).toHaveBeenCalledWith('This entrance is closed at this time of day.');
});

test('closed hours prevent HTTP redirects and fall back to the general gate message', () => {
    const {game, window, stop} = entrance({http_redirect: 'https://example.com', timeRange: '22:00-06:00', message: 'Come back tonight.'});
    stop();
    expect(window.open).not.toHaveBeenCalled();
    expect(game.showNotification).toHaveBeenCalledWith('Come back tonight.');
});

test('local portals teleport only inside their opening range', () => {
    const {game, stop} = entrance({x: 30, y: 40, portal: true, timeRange: '08:00-18:00'});
    Object.assign(game.player, {setGridPosition: jest.fn(), turnTo: jest.fn()});
    Object.assign(game, {
        client: {sendTeleport: jest.fn()}, renderer: {}, assignBubbleTo: jest.fn(),
        updatePlateauMode: jest.fn(), audioManager: {playSound: jest.fn(), updateMusic: jest.fn()},
    });
    stop();
    expect(game.client.sendTeleport).toHaveBeenCalledWith(30, 40);
    expect(game.audioManager.playSound).toHaveBeenCalledWith('teleport');
    game.client.sendTeleport.mockClear();
    game.getWorldTime = () => at(18);
    stop();
    expect(game.client.sendTeleport).not.toHaveBeenCalled();
});

test('opening hours do not bypass a failed level gate', () => {
    const {game, axios, stop} = entrance({map: 'main', level: 10, timeRange: '08:00-18:00'});
    game.player.level = 5;
    stop();
    expect(axios.post).not.toHaveBeenCalled();
    expect(game.showNotification).toHaveBeenCalledWith('You need to be level 10 to enter.');
});
