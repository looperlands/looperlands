const fs = require('fs'), vm = require('vm'), _ = require('underscore');
let MapAssets;
vm.runInNewContext(fs.readFileSync(require.resolve('./mapassets'), 'utf8'), {
    define: factory => {MapAssets = factory();},
});
const raw = () => ({width: 2, height: 2, tilesize: 16, data: [1, 1, 1, 1],
    collisions: [1], blocking: [2], plateau: [3], doors: [], triggers: [], checkpoints: []});
beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.clearAllTimers(); jest.useRealTimers();});

function fixture(options = {}) {
    let Mapx;
    const workers = [], images = [], requests = [];
    const $ = {ajax: jest.fn(config => {
        const request = {config, done(callback) {this.resolve = callback; return this;},
            fail(callback) {this.reject = callback; return this;}};
        requests.push(request);
        return request;
    })};
    const sandbox = {_, console: {log: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn()},
        setTimeout, clearTimeout, Class: {extend: methods => {
            function Map(...args) {this.init(...args);}
            Object.assign(Map.prototype, methods); return Map;
        }},
        define: (_dependencies, factory) => {Mapx = factory($, undefined, MapAssets);},
        Worker: function () {
            if (options.workerThrows) throw new Error('Worker blocked');
            this.postMessage = jest.fn(() => {if (options.postThrows) throw new Error('Message failed');});
            this.terminate = jest.fn(); workers.push(this);
        },
        Image: function () {
            this.width = 32;
            Object.defineProperty(this, 'src', {set(value) {
                this.filepath = value;
                if (options.cachedImage) this.onload();
                if (options.brokenImage) this.onerror();
            }});
            images.push(this);
        }};
    vm.runInNewContext(fs.readFileSync(require.resolve('./map'), 'utf8'), sandbox);
    const game = {renderer: {mobile: !!options.mobile, tablet: false}};
    const map = new Mapx(false, game, 'duckville');
    const ready = jest.fn(), failed = jest.fn(); map.ready(ready, failed);
    const workerMap = () => ({...raw(), grid: [[0, 1], [1, 0]], plateauGrid: [[0, 0], [0, 1]]});
    return {map, ready, failed, workers, images, requests, $, workerMap};
}

test('the normal worker load publishes its grids only after the tilesheet is ready', () => {
    const f = fixture(), worker = f.workers[0];
    worker.onmessage({data: f.workerMap()});
    expect(f.ready).not.toHaveBeenCalled();
    f.images[0].onload();
    expect(f.map.isLoaded).toBe(true);
    expect(f.map.grid).toEqual([[0, 1], [1, 0]]);
    expect(f.ready).toHaveBeenCalledTimes(1);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(30000);
    expect(f.$.ajax).not.toHaveBeenCalled();
    expect(f.failed).not.toHaveBeenCalled();
});

test.each(['error', 'messageerror'])('a worker %s falls back to JSON and builds usable map grids', event => {
    const f = fixture(), worker = f.workers[0];
    f.images[0].onload();
    worker['on' + event]({preventDefault: jest.fn()});
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(f.requests[0].config).toMatchObject({url: 'maps/world_client_duckville.json', dataType: 'json', timeout: 20000});
    f.requests[0].resolve(raw());
    expect(f.map.grid).toEqual([[0, 1], [1, 0]]);
    expect(f.map.plateauGrid).toEqual([[0, 0], [0, 1]]);
    expect(f.map.isLoaded).toBe(true);
    expect(f.ready).toHaveBeenCalledTimes(1);
    expect(f.failed).not.toHaveBeenCalled();
});

test.each(['workerThrows', 'postThrows'])('%s also falls back without escaping map initialization', failure => {
    const f = fixture({[failure]: true});
    f.requests[0].resolve(raw()); f.images[0].onload();
    expect(f.ready).toHaveBeenCalledTimes(1);
    expect(f.map.isLoaded).toBe(true);
});

test('a silent worker times out once and a late reply cannot overwrite the JSON fallback', () => {
    const f = fixture(), worker = f.workers[0], lateMessage = worker.onmessage;
    f.images[0].onload();
    jest.advanceTimersByTime(14999);
    expect(f.requests).toHaveLength(0);
    jest.advanceTimersByTime(1);
    expect(f.requests).toHaveLength(1);
    f.requests[0].resolve(raw());
    lateMessage({data: {...f.workerMap(), width: 99}});
    jest.advanceTimersByTime(30000);
    expect(f.map.width).toBe(2);
    expect(f.ready).toHaveBeenCalledTimes(1);
    expect(f.requests).toHaveLength(1);
});

test('a failed JSON fallback reports a failure once and cannot later become ready', () => {
    const f = fixture();
    f.workers[0].onerror({preventDefault: jest.fn()});
    f.requests[0].reject();
    f.images[0].onload();
    expect(f.map.isLoaded).toBe(false);
    expect(f.ready).not.toHaveBeenCalled();
    expect(f.failed).toHaveBeenCalledTimes(1);
    expect(f.map.loadError.message).toContain('world_client_duckville.json');
    jest.advanceTimersByTime(30000);
    expect(f.failed).toHaveBeenCalledTimes(1);
});

test('mobile map loading still generates collision and plateau grids without a worker', () => {
    const f = fixture({mobile: true});
    f.images[0].onload(); f.requests[0].resolve(raw());
    expect(f.workers).toHaveLength(0);
    expect(f.map.grid).toEqual([[0, 1], [1, 0]]);
    expect(f.map.plateauGrid).toEqual([[0, 0], [0, 1]]);
    expect(f.ready).toHaveBeenCalledTimes(1);
});

test.each(['network', 'timeout'])('a tilesheet %s produces a recoverable failure instead of waiting forever', failure => {
    const f = fixture();
    f.workers[0].onmessage({data: f.workerMap()});
    if (failure === 'network') f.images[0].onerror();
    else jest.advanceTimersByTime(20000);
    f.images[0].onload();
    expect(f.map.loadError.message).toContain('tilesheet_duckville.png');
    expect(f.failed).toHaveBeenCalledTimes(1);
    expect(f.ready).not.toHaveBeenCalled();
});

test('a cached tilesheet is observed and an already loaded map delivers its ready callback', () => {
    const f = fixture({cachedImage: true});
    f.workers[0].onmessage({data: f.workerMap()});
    const lateReady = jest.fn(); f.map.ready(lateReady);
    expect(f.map.isLoaded).toBe(true);
    expect(f.ready).toHaveBeenCalledTimes(1);
    expect(lateReady).toHaveBeenCalledTimes(1);
});

test('an image failure before the error listener is registered is still delivered', () => {
    const f = fixture({brokenImage: true});
    expect(f.failed).toHaveBeenCalledTimes(1);
    expect(f.map.loadError.message).toContain('tilesheet_duckville.png');
});
