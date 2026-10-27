const fs = require('fs');
const path = require('path');
const vm = require('vm');

beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.clearAllTimers(); jest.useRealTimers();});

function createSprite(name, href = 'https://looperlands.io/game/', nft = false, deferImage = false) {
    let Sprite;
    const requests = [];
    const renderWorker = {postMessage: jest.fn()};
    const data = {id: name, width: 16, height: 16, animations: {idle: {length: 1, row: 0}}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sprite.js'), 'utf8'), {
        define: (deps, factory) => { Sprite = factory({}, function () {}, {[name]: data, clotharmor: data}); },
        Class: {extend: methods => function (...args) { Object.assign(this, methods); this.init(...args); }},
        Image: function () {
            Object.defineProperty(this, 'src', {set(url) {
                requests.push({url, crossOrigin: this.crossOrigin, onload: this.onload, onerror: this.onerror});
            }});
        },
        window: {location: {href}}, URL, setTimeout, clearTimeout, console: {log: jest.fn(), error: jest.fn()}
    });
    const sprite = nft ? new Sprite(name, 1, renderWorker, 'token-hash', 'armor', '0xabc')
        : new Sprite(name, 1, renderWorker, undefined, undefined, undefined, deferImage);
    return {sprite, requests, renderWorker};
}

test('startup sprites load from the repository and send the same URL to the worker', () => {
    const {sprite, requests, renderWorker} = createSprite('villager9');
    const url = 'https://raw.githubusercontent.com/looperlands/looperlands/main/client/img/1/villager9.png';
    expect(requests[0]).toEqual(expect.objectContaining({url, crossOrigin: 'Anonymous', onload: expect.any(Function)}));
    expect(sprite.isLoaded).toBe(false);
    requests[0].onload();
    expect(sprite.isLoaded).toBe(true);
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({src: url}));
});

test('static NFT sprites also bypass the CDN when loaded directly by the worker', () => {
    const {sprite, requests, renderWorker} = createSprite('NFT_abc');
    expect(requests).toHaveLength(0);
    expect(sprite.isLoaded).toBe(true);
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        src: 'https://raw.githubusercontent.com/looperlands/looperlands/main/client/img/1/NFT_abc.png'
    }));
});

test('deferred world sprites register metadata without starting an image request or timeout', () => {
    const {sprite, requests, renderWorker} = createSprite('rat', undefined, false, true);
    expect(requests).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
    expect(sprite.isLoaded).toBe(true);
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({spriteName: 'rat'}));
});

test('a main-thread drawing requests deferred artwork once and waits for it to load', () => {
    const {sprite, requests, renderWorker} = createSprite('item-float', undefined, false, true);
    expect(sprite.getImage()).toBeNull();
    expect(sprite.getImage()).toBeNull();
    expect(requests).toHaveLength(1);
    requests[0].onload();
    expect(sprite.getImage()).toBe(sprite.image);
    expect(renderWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
});

test('failed deferred artwork stays unavailable without retrying every frame', () => {
    const {sprite, requests} = createSprite('item-float', undefined, false, true);
    sprite.getImage(); requests[0].onerror();
    expect(sprite.getImage()).toBeNull();
    expect(requests).toHaveLength(1);
});

test.each(['127.0.0.1', 'localhost', '[::1]'])('local sprites use the checkout on %s', host => {
    const {requests, renderWorker} = createSprite('villager9', `http://${host}:8000/`);
    expect(requests[0].url).toBe('img/1/villager9.png');
    requests[0].onload();
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        src: `http://${host}:8000/img/1/villager9.png`
    }));
});

test('an image 404 becomes a load error without sending broken artwork to the renderer', () => {
    const {sprite, requests, renderWorker} = createSprite('missing-sprite');
    requests[0].onerror();
    expect(sprite.loadError.message).toContain('missing-sprite.png');
    expect(sprite.isLoaded).toBe(false);
    expect(renderWorker.postMessage).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    requests[0].onload();
    expect(renderWorker.postMessage).not.toHaveBeenCalled();
});

test('an image request that never finishes times out and ignores a late load', () => {
    const {sprite, requests, renderWorker} = createSprite('stalled-sprite');
    jest.advanceTimersByTime(120000);
    expect(sprite.loadError.message).toContain('stalled-sprite.png');
    requests[0].onload();
    expect(sprite.isLoaded).toBe(false);
    expect(renderWorker.postMessage).not.toHaveBeenCalled();
});

test('success clears the image timeout', () => {
    const {sprite, requests} = createSprite('villager9');
    jest.advanceTimersByTime(20000);
    expect(sprite.loadError).toBeUndefined();
    requests[0].onload();
    jest.advanceTimersByTime(120000);
    expect(sprite.loadError).toBeUndefined();
    expect(sprite.isLoaded).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
});

test('dynamic NFT sprites keep their Spaces asset URL', () => {
    const {renderWorker} = createSprite('avatar', undefined, true);
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        src: 'https://looperlands.sfo3.digitaloceanspaces.com/assets/looper/1/token-hash.png'
    }));
});
