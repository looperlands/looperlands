const fs = require('fs');
const vm = require('vm');

function fixture(renderer = {}, connection = {}) {
    let MapAssets;
    vm.runInNewContext(fs.readFileSync(require.resolve('./mapassets'), 'utf8'), {
        define: factory => {MapAssets = factory();}, URL, AbortSignal,
    });
    const fetch = jest.fn(async () => ({ok: true, arrayBuffer: async () => new ArrayBuffer(0)}));
    const document = {baseURI: 'https://game.test/_client/' + 'a'.repeat(40) + '/'};
    return {MapAssets, preloader: new MapAssets(renderer, {fetch, document, navigator: {connection}}), fetch, document};
}

const settle = async () => {for (let i = 0; i < 40; i++) await Promise.resolve();};
const map = doors => ({mapId: 'main', width: 100, doors});

test.each([
    [{upscaledRendering: true}, ['maps/world_client_oadungeon.js', 'img/1/tilesheet_oa.png']],
    [{upscaledRendering: true, mobile: true}, ['maps/world_client_oadungeon.json', 'img/1/tilesheet_oa.png']],
    [{tablet: true}, ['maps/world_client_oadungeon.json', 'img/2/tilesheet_oa.png']],
    [{}, ['maps/world_client_oadungeon.js', 'img/2/tilesheet_oa.png', 'img/3/tilesheet_oa.png']],
])('prefetch uses the same map format and shared tilesheets as renderer %j', async (renderer, paths) => {
    const f = fixture(renderer);
    f.preloader.near(map({2011: {map: 'oadungeon'}}), 10, 20);
    await settle();
    expect(f.fetch.mock.calls.map(([url]) => url)).toEqual(paths.map(path => f.document.baseURI + path));
    for (const [, options] of f.fetch.mock.calls) {
        expect(options).toMatchObject({cache: 'force-cache', credentials: 'same-origin', priority: 'low'});
    }
});

test('only nearby cross-map doors are warmed, without evaluating or bypassing their gates', async () => {
    const f = fixture({upscaledRendering: true});
    const doors = map({2011: {map: 'main'}, 2012: {x: 90, y: 90}, 2013: {map: '../private'},
        2014: {map: 'duckville', nft: 'locked', triggerId: 'inactive'}, 2091: {map: 'faraway'}});
    f.preloader.near(doors, 10, 20);
    f.preloader.near(doors, 10, 20);
    await settle();
    expect(f.fetch.mock.calls.map(([url]) => url)).toEqual([
        f.document.baseURI + 'maps/world_client_duckville.js', f.document.baseURI + 'img/1/tilesheet_duckville.png',
    ]);
});

test('three nearest destinations and two active fetches bound speculative work', async () => {
    const f = fixture({upscaledRendering: true});
    const pending = [];
    f.fetch.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    f.preloader.near(map({2015: {map: 'fourth'}, 2014: {map: 'third'}, 2013: {map: 'second'}, 2012: {map: 'first'}}), 10, 20);
    await settle();
    expect(f.fetch).toHaveBeenCalledTimes(2);
    expect(f.preloader.queue).toHaveLength(4);
    const urls = [...f.preloader.maps];
    expect(urls.map(url => url.split('/').pop())).toEqual(['world_client_first.js', 'world_client_second.js', 'world_client_third.js']);
    pending.shift()({ok: true, arrayBuffer: async () => new ArrayBuffer(0)});
    await settle();
    expect(f.fetch).toHaveBeenCalledTimes(3);
});

test('shared tilesheets are fetched once, and failed speculative requests stay nonfatal', async () => {
    const f = fixture({upscaledRendering: true});
    f.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ok: false});
    const doors = map({2011: {map: 'oa'}, 2012: {map: 'oadungeon'}});
    f.preloader.near(doors, 10, 20);
    await settle();
    expect(f.fetch).toHaveBeenCalledTimes(3);
    expect(f.preloader.active).toBe(0);
    f.preloader.near(doors, 10, 20);
    await settle();
    expect(f.fetch).toHaveBeenCalledTimes(3);
});

test.each([{saveData: true}, {effectiveType: '2g'}, {effectiveType: 'slow-2g'}])('constrained connections skip preloading: %j', async connection => {
    const f = fixture({}, connection);
    f.preloader.near(map({2011: {map: 'duckville'}}), 10, 20);
    await settle();
    expect(f.fetch).not.toHaveBeenCalled();
});

test('preloads follow the current asset base after a client release is adopted', async () => {
    const f = fixture({upscaledRendering: true});
    const doors = map({2011: {map: 'duckville'}});
    f.preloader.near(doors, 10, 20);
    await settle();
    f.document.baseURI = 'https://game.test/_client/' + 'b'.repeat(40) + '/';
    f.preloader.near(doors, 10, 20);
    await settle();
    expect(f.fetch).toHaveBeenCalledTimes(4);
    expect(f.fetch.mock.calls[2][0]).toBe(f.document.baseURI + 'maps/world_client_duckville.js');
});
