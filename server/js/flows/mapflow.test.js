const fs = require('fs');
const path = require('path');
const vm = require('vm');
const _ = require('underscore');
const {PlayerMapFlowEventConsumer} = require('./playermapfloweventconsumer');
const {WorldMapFlowEventConsumer} = require('./worldfloweventconsumer');

const read = filename => fs.readFileSync(path.join(__dirname, filename), 'utf8');
const source = read('mapflow.js');

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
}

function createFlows() {
    const dao = {loadMapFlow: jest.fn()};
    const playerBroker = {playerEventConsumers: []};
    const worldBroker = {worldEventConsumers: []};
    const eventInstances = [];
    const inheritance = {exports: {}};
    vm.runInNewContext(read('../lib/class.js'), inheritance);
    const legacyBlock = filename => {
        const context = {module: {exports: {}}, require: name => name === '../../lib/class' ? inheritance.exports : {}};
        vm.runInNewContext(read(filename), context);
        return context.module.exports;
    };
    const all = legacyBlock('special/all.js');
    const notify = legacyBlock('then/send_notification.js');
    const exports = {};
    vm.runInNewContext(source, {
        exports, _,
        // Use Node's native clone outside Jest's VM.
        structuredClone: vm.runInThisContext('structuredClone'),
        require: name => {
            if (name === '../dao.js') return dao;
            if (name === 'underscore') return _;
            if (name === './playermapfloweventconsumer.js') return {PlayerMapFlowEventConsumer};
            if (name === './worldfloweventconsumer.js') return {WorldMapFlowEventConsumer};
            if (name === '../quests/playereventbroker.js') return {PlayerEventBroker: playerBroker};
            if (name === './worldeventbroker.js') return {WorldEventBroker: worldBroker};
            if (name === './special/all.js') return all;
            if (name === './then/send_notification.js') return notify;
            if (name.startsWith('./when/')) {
                return class {
                    constructor(options) {
                        this.options = options;
                        this.eventType = path.basename(name, '.js');
                        eventInstances.push(this);
                    }
                    handle() { return true; }
                };
            }
            return {};
        },
    });
    const player = id => ({player: {nftId: id}});
    const world = map => ({id: 'world_' + map, sendNotifications: jest.fn()});
    const emit = (broker, eventType) => playerBroker.playerEventConsumers[0].consume({eventType, data: {player: broker.player}});
    return {...exports, dao, player, world, emit, eventInstances};
}

function definition(message = 'hello') {
    return {handlers: [{idx: 1, type: 'player.spawned', options: {nested: {value: 'original'}}, then: [
        {idx: 2, type: 'send_notification', options: {message}, then: []},
    ]}]};
}

test('shares a pending map fetch across 60 players and registers their handlers independently', async () => {
    const system = createFlows(), response = deferred(), world = system.world('main');
    const players = Array.from({length: 60}, (_, i) => system.player('player' + i));
    system.dao.loadMapFlow.mockReturnValue(response.promise);
    const loading = players.map(player => system.loadFlow('main', player, world));
    await Promise.resolve();
    expect(system.dao.loadMapFlow).toHaveBeenCalledTimes(1);
    expect(system.dao.loadMapFlow).toHaveBeenCalledWith('main');
    response.resolve(definition());
    await Promise.all(loading);
    for (const player of players) system.emit(player, 'player.spawned');
    expect(world.sendNotifications).toHaveBeenCalledTimes(60);
    players.forEach((player, i) => expect(world.sendNotifications).toHaveBeenNthCalledWith(i + 1, player.player, 'hello', false));
});

test('fetches different maps concurrently and handles out-of-order responses', async () => {
    const system = createFlows(), first = deferred(), second = deferred();
    const alice = system.player('alice'), bob = system.player('bob');
    const firstWorld = system.world('first'), secondWorld = system.world('second');
    system.dao.loadMapFlow.mockImplementation(map => map === 'first' ? first.promise : second.promise);
    const firstLoad = system.loadFlow('first', alice, firstWorld);
    const secondLoad = system.loadFlow('second', bob, secondWorld);
    await Promise.resolve();
    expect(system.dao.loadMapFlow).toHaveBeenCalledTimes(2);
    second.resolve(definition('second'));
    await secondLoad;
    system.emit(bob, 'player.spawned');
    expect(secondWorld.sendNotifications).toHaveBeenCalledWith(bob.player, 'second', false);
    first.resolve(definition('first'));
    await firstLoad;
    system.emit(alice, 'player.spawned');
    expect(firstWorld.sendNotifications).toHaveBeenCalledWith(alice.player, 'first', false);
});

test('fetches a new definition on the next refresh and replaces the existing player handler', async () => {
    const system = createFlows(), alice = system.player('alice'), world = system.world('main');
    system.dao.loadMapFlow.mockResolvedValueOnce(definition('old')).mockResolvedValueOnce(definition('new'));
    await system.loadFlow('main', alice, world);
    system.emit(alice, 'player.spawned');
    await system.loadFlow('main', alice, world);
    system.emit(alice, 'player.spawned');
    expect(system.dao.loadMapFlow).toHaveBeenCalledTimes(2);
    expect(world.sendNotifications.mock.calls.map(call => call[1])).toEqual(['old', 'new']);
});

test.each(['rejection', 'synchronous throw'])('releases a shared %s and allows a subsequent retry', async failure => {
    const system = createFlows(), world = system.world('main');
    system.dao.loadMapFlow.mockImplementationOnce(() => {
        if (failure === 'synchronous throw') throw new Error('offline');
        return Promise.reject(new Error('offline'));
    });
    const players = [system.player('alice'), system.player('bob')];
    const results = await Promise.allSettled(players.map(player => system.loadFlow('main', player, world)));
    expect(results.every(result => result.status === 'rejected' && result.reason.message === 'offline')).toBe(true);
    expect(system.dao.loadMapFlow).toHaveBeenCalledTimes(1);
    system.dao.loadMapFlow.mockResolvedValue(definition());
    await system.loadFlow('main', players[0], world);
    system.emit(players[0], 'player.spawned');
    expect(system.dao.loadMapFlow).toHaveBeenCalledTimes(2);
    expect(world.sendNotifications).toHaveBeenCalledTimes(1);
});

test.each([undefined, null])('does not retain an absent definition (%s) for later loads', async absent => {
    const system = createFlows(), alice = system.player('alice'), world = system.world('main');
    system.dao.loadMapFlow.mockResolvedValueOnce(absent).mockResolvedValueOnce(definition());
    await system.loadFlow('main', alice, world);
    system.emit(alice, 'player.spawned');
    expect(world.sendNotifications).not.toHaveBeenCalled();
    await system.loadFlow('main', alice, world);
    system.emit(alice, 'player.spawned');
    expect(system.dao.loadMapFlow).toHaveBeenCalledTimes(2);
    expect(world.sendNotifications).toHaveBeenCalledTimes(1);
});

test('gives each player independent nested definition options', async () => {
    const system = createFlows(), flow = definition(), world = system.world('main');
    system.dao.loadMapFlow.mockResolvedValue(flow);
    await Promise.all(['alice', 'bob'].map(id => system.loadFlow('main', system.player(id), world)));
    system.eventInstances[0].options.nested.value = 'changed by alice';
    expect(system.eventInstances[1].options.nested.value).toBe('original');
    expect(flow.handlers[0].options.nested.value).toBe('original');
});

test('keeps real all-block execution state separate between players sharing a fetch', async () => {
    const system = createFlows(), alice = system.player('alice'), bob = system.player('bob'), world = system.world('main');
    const gate = {idx: 3, type: 'all', options: {}, then: [{idx: 4, type: 'send_notification', options: {message: 'both'}, then: []}]};
    system.dao.loadMapFlow.mockResolvedValue({handlers: [
        {idx: 1, type: 'player.spawned', options: {}, then: [gate]},
        {idx: 2, type: 'player.died', options: {}, then: [gate]},
    ]});
    await Promise.all([system.loadFlow('main', alice, world), system.loadFlow('main', bob, world)]);
    system.emit(alice, 'player.spawned');
    system.emit(bob, 'player.died');
    expect(world.sendNotifications).not.toHaveBeenCalled();
    system.emit(alice, 'player.died');
    expect(world.sendNotifications).toHaveBeenCalledTimes(1);
    expect(world.sendNotifications).toHaveBeenLastCalledWith(alice.player, 'both', false);
    system.emit(bob, 'player.spawned');
    expect(world.sendNotifications).toHaveBeenCalledTimes(2);
    expect(world.sendNotifications).toHaveBeenLastCalledWith(bob.player, 'both', false);
});
