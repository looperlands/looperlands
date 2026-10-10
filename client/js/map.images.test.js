const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createMap(immediate = false) {
    let methods;
    const timers = [];
    const requests = [];
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'map.js'), 'utf8'), {
        define: (deps, factory) => factory({}, function () {}),
        Class: {extend: value => { methods = value; return value; }},
        Image: function () {
            this.width = 32;
            Object.defineProperty(this, 'src', {set: url => {
                requests.push({url, image: this});
                if (immediate) this.onload();
            }});
        },
        console: {log() {}, debug() {}, error() {}},
        setTimeout: callback => timers.push(callback)
    });
    const map = {...methods, tilesize: 16, tilesetCount: 1, mapLoaded: true, ready_func: jest.fn()};
    return {map, requests, timers};
}

test('handles a tilesheet that loads immediately when src is assigned', () => {
    const {map} = createMap(true);
    map._loadTileset('tiles.png');
    expect(map.isLoaded).toBe(true);
    expect(map.ready_func).toHaveBeenCalledTimes(1);
    const ready = jest.fn();
    map.ready(ready);
    expect(ready).toHaveBeenCalledTimes(1);
});

test('retries a failed tilesheet without counting it as loaded', () => {
    const {map, requests, timers} = createMap();
    const image = map._loadTileset('tiles.png');
    image.onerror();
    expect(map.tilesetCount).toBe(1);
    timers.shift()();
    expect(requests).toHaveLength(2);
    image.onload();
    image.onload();
    expect(map.tilesetCount).toBe(0);
    expect(map.ready_func).toHaveBeenCalledTimes(1);
});

test('stops tilesheet retries after three failures', () => {
    const {map, requests, timers} = createMap();
    const image = map._loadTileset('tiles.png');
    for (let i = 0; i < 3; i++) {
        image.onerror();
        if (timers.length) timers.shift()();
    }
    expect(requests).toHaveLength(3);
    expect(timers).toHaveLength(0);
    expect(map.tilesetCount).toBe(1);
});
