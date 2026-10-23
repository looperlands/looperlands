const fs = require('fs'), vm = require('vm');
const turn = async () => {for (let i = 0; i < 30; i++) await Promise.resolve();};
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function fixture() {
    let MapTransition;
    const maps = [], storages = [], order = [];
    const nextClient = () => ({disable: jest.fn()});
    const game = {sessionId: 'old', client: nextClient(), renderer: {upscaledRendering: true, whenTilesetReady: jest.fn().mockResolvedValue()},
        app: {setMapTransition: jest.fn(), showMapTransitionFailure: jest.fn()},
        pauseForMapTransition: jest.fn(), tick: jest.fn(), initAchievements: jest.fn(),
        resetForMapTransition: jest.fn((map, storage) => {
            order.push('adopt'); game.sessionId = storage.sessionId; game.mapId = map.mapId;
        }),
        connect: jest.fn(() => {order.push('connect'); game.client = nextClient();}),
    };
    const storageLoad = jest.fn().mockResolvedValue();
    const http = {post: jest.fn(async () => {order.push('ticket'); return {status: 200, data: {sessionId: 'new-' + (storages.length + 1)}};})};
    const history = {replaceState: jest.fn()};
    vm.runInNewContext(fs.readFileSync(require.resolve('./maptransition'), 'utf8'), {
        define: (names, factory) => {
            MapTransition = factory(function Mapx(multi, currentGame, mapId) {
                this.mapId = mapId; this.ready = (resolve, reject) => {this.resolve = resolve; this.reject = reject;}; maps.push(this);
            }, function Storage(sessionId) {
                this.sessionId = sessionId; this.data = {mapId: 'destination'};
                this.loadData = (...args) => {order.push('session'); return storageLoad(...args);}; storages.push(this);
            });
        }, setTimeout, clearTimeout, URL, console: {error: jest.fn()},
    });
    const transition = game.mapTransition = new MapTransition(game, {http, history,
        location: {href: 'https://game.test/?sessionId=old&test=1#hud'}});
    return {game, transition, maps, storages, storageLoad, http, history, order};
}

test('travel loads map and session once, updates URL without navigation, and waits for WELCOME', async () => {
    const f = fixture();
    const pending = f.transition.start({map: 'destination', x: 7, y: 9});
    expect(f.game.pauseForMapTransition).toHaveBeenCalledTimes(1);
    expect(f.http.post).not.toHaveBeenCalled();
    expect(f.transition.start({map: 'other'})).toBe(pending);
    f.maps[0].resolve();
    await turn();
    expect(f.order).toEqual(['ticket', 'session', 'adopt', 'connect']);
    expect(f.storageLoad).toHaveBeenCalledTimes(1);
    expect(f.http.post).toHaveBeenCalledWith('/session/old/teleport', {map: 'destination', x: 7, y: 9}, {timeout: 15000});
    expect(f.history.replaceState).toHaveBeenCalledWith(null, '', 'https://game.test/?sessionId=new-1&test=1#hud');
    expect(f.transition.active).toBe(true);
    f.transition.complete();
    expect(await pending).toBe(true);
    expect(f.transition.active).toBe(false);
    expect(f.game.started).toBe(true);
    expect(f.game.tick).toHaveBeenCalledTimes(1);
    expect(f.game.app.setMapTransition).toHaveBeenLastCalledWith(false);
});

test('a failed map download leaves the old session intact and explicit retry resumes travel', async () => {
    const f = fixture();
    const pending = f.transition.start({map: 'destination'});
    f.maps[0].reject(new Error('offline'));
    expect(await pending).toBe(false);
    expect(f.http.post).not.toHaveBeenCalled();
    expect(f.game.resetForMapTransition).not.toHaveBeenCalled();
    expect(f.transition.active).toBe(true);
    const retry = f.game.app.showMapTransitionFailure.mock.calls[0][0]();
    f.maps[1].resolve();
    await turn();
    f.transition.complete();
    expect(await retry).toBe(true);
});

test('a lost session response rotates its possibly consumed ticket using the still-live original session', async () => {
    const f = fixture(); f.storageLoad.mockRejectedValueOnce(new Error('503'));
    const pending = f.transition.start({map: 'destination'});
    f.maps[0].resolve();
    expect(await pending).toBe(false);
    const retry = f.transition.retry();
    await turn();
    f.transition.complete(); await retry;
    expect(f.http.post).toHaveBeenCalledTimes(2);
    expect(f.http.post.mock.calls.map(([url]) => url)).toEqual(['/session/old/teleport', '/session/old/teleport']);
    expect(f.storages.map(storage => storage.sessionId)).toEqual(['new-1', 'new-2']);
});

test('a renderer failure retries with cached Storage without consuming the session twice', async () => {
    const f = fixture(); f.game.renderer.whenTilesetReady.mockRejectedValueOnce(new Error('tilesheet'));
    const pending = f.transition.start({map: 'destination'});
    f.maps[0].resolve();
    expect(await pending).toBe(false);
    expect(f.game.connect).not.toHaveBeenCalled();
    const retry = f.transition.retry();
    await turn(); f.transition.complete(); await retry;
    expect(f.storageLoad).toHaveBeenCalledTimes(1);
    expect(f.http.post).toHaveBeenCalledTimes(1);
});

test('a stalled connection offers retry, mints a fresh session, and ignores a stale client welcome', async () => {
    const f = fixture();
    const pending = f.transition.start({map: 'destination'});
    f.maps[0].resolve(); await turn();
    const oldClient = f.game.client;
    jest.advanceTimersByTime(20000);
    expect(await pending).toBe(false);
    f.transition.complete();
    expect(f.transition.active).toBe(true);
    const retry = f.transition.retry();
    await turn();
    expect(f.http.post).toHaveBeenLastCalledWith('/session/new-1/teleport', {map: 'destination'}, {timeout: 15000});
    f.game.client = oldClient; f.transition.complete();
    expect(f.transition.active).toBe(true);
    f.game.client = f.transition.context.client; f.transition.complete();
    expect(await retry).toBe(true);
    expect(f.storageLoad).toHaveBeenCalledTimes(2);
});

test('a disconnect during the destination handshake shows recovery promptly', async () => {
    const f = fixture();
    const pending = f.transition.start({map: 'destination'});
    f.maps[0].resolve(); await turn();
    f.transition.connectionLost();
    expect(await pending).toBe(false);
    expect(f.game.app.showMapTransitionFailure).toHaveBeenCalledTimes(1);
});

test('a stalled renderer times out and keeps normal gameplay blocked until retry', async () => {
    const f = fixture(); f.game.renderer.whenTilesetReady.mockReturnValue(new Promise(() => {}));
    const pending = f.transition.start({map: 'destination'});
    f.maps[0].resolve(); await turn(); jest.advanceTimersByTime(20000);
    expect(await pending).toBe(false);
    expect(f.game.connect).not.toHaveBeenCalled();
    expect(f.game.started).toBe(false);
    expect(f.transition.active).toBe(true);
});

test('an expired source session offers character recovery without an endless retry or automatic refresh', async () => {
    const f = fixture();
    f.http.post.mockRejectedValue({response: {status: 404}});
    const pending = f.transition.start({map: 'destination'});
    f.maps[0].resolve();
    expect(await pending).toBe(false);
    expect(f.game.app.showMapTransitionFailure).toHaveBeenCalledWith(null, expect.stringContaining('expired'));
    expect(f.history.replaceState).not.toHaveBeenCalled();
});
