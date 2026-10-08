const fs = require('fs');
const path = require('path');
const vm = require('vm');
const _ = require('underscore');

function createWorlds() {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'worldserver.js'), 'utf8'), {
        module,
        require: name => {
            if (name === './lib/class') return {Class: {extend: methods => methods}};
            if (name === 'underscore') return _;
            if (name === './flows/worldeventbroker.js') return {WorldEventBroker: function () {}};
            if (name === './message') return {
                Population: function (mapCount, totalCount) {
                    this.mapCount = mapCount;
                    this.totalCount = totalCount;
                },
            };
            return {};
        },
    });
    const server = {worldsMap: {}};
    for (const map of ['main', 'taikotown', 'empty']) {
        const world = Object.create(module.exports);
        world.init('world_' + map, 100, server);
        world.pushBroadcast = jest.fn();
        world.onPlayerAdded(world.updatePopulation);
        world.onPlayerRemoved(world.updatePopulation);
        server.worldsMap[map] = world;
    }
    return server.worldsMap;
}

test('leaving another map updates the remaining player total from two to one', () => {
    const worlds = createWorlds();
    worlds.main.playerCount = 1;
    worlds.taikotown.playerCount = 1;
    worlds.main.updatePopulation();
    expect(worlds.main.pushBroadcast).toHaveBeenLastCalledWith({mapCount: 1, totalCount: 2});

    worlds.taikotown.decrementPlayerCount();
    worlds.taikotown.removed_callback();

    expect(worlds.main.pushBroadcast).toHaveBeenLastCalledWith({mapCount: 1, totalCount: 1});
    expect(worlds.taikotown.pushBroadcast).toHaveBeenLastCalledWith({mapCount: 0, totalCount: 1});
});

test('joining another map updates every map with its own count and the shared total', () => {
    const worlds = createWorlds();
    worlds.main.playerCount = 1;
    worlds.taikotown.incrementPlayerCount();
    worlds.taikotown.added_callback();

    expect(worlds.main.pushBroadcast).toHaveBeenCalledWith({mapCount: 1, totalCount: 2});
    expect(worlds.taikotown.pushBroadcast).toHaveBeenCalledWith({mapCount: 1, totalCount: 2});
    expect(worlds.empty.pushBroadcast).toHaveBeenCalledWith({mapCount: 0, totalCount: 2});
});
