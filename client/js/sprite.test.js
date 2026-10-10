const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createSprite(name, href = 'https://looperlands.io/game/', nft = false) {
    let Sprite;
    const requests = [];
    const renderWorker = {postMessage: jest.fn()};
    const timers = [];
    const data = {id: name, width: 16, height: 16, animations: {idle: {length: 1, row: 0}}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sprite.js'), 'utf8'), {
        define: (deps, factory) => { Sprite = factory({}, function () {}, {[name]: data, clotharmor: data}); },
        Class: {extend: methods => function (...args) { Object.assign(this, methods); this.init(...args); }},
        Image: function () {
            Object.defineProperty(this, 'src', {set(url) {
                requests.push({url, crossOrigin: this.crossOrigin, onload: this.onload, onerror: this.onerror});
            }});
        },
        window: {location: {href}}, URL, console: {log: jest.fn(), error: jest.fn()},
        setTimeout: callback => timers.push(callback)
    });
    const sprite = nft ? new Sprite(name, 1, renderWorker, 'token-hash', 'armor', '0xabc')
        : new Sprite(name, 1, renderWorker);
    return {sprite, requests, renderWorker, timers};
}

test('startup sprites load from the repository and send the same URL to the worker', () => {
    const {sprite, requests, renderWorker} = createSprite('villager9');
    const url = 'https://raw.githubusercontent.com/looperlands/looperlands/main/client/img/1/villager9.png';
    expect(requests[0]).toEqual({url, crossOrigin: 'Anonymous', onload: expect.any(Function), onerror: expect.any(Function)});
    expect(sprite.isLoaded).toBe(false);
    requests[0].onload();
    expect(sprite.isLoaded).toBe(true);
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({src: url}));
});

test('a failed item image retries and becomes ready only after it loads', () => {
    const {sprite, requests, renderWorker, timers} = createSprite('item-test');
    requests[0].onerror();
    expect(sprite.isLoaded).toBe(false);
    expect(renderWorker.postMessage).not.toHaveBeenCalled();
    timers.shift()();
    expect(requests).toHaveLength(2);
    requests[1].onload();
    expect(sprite.isLoaded).toBe(true);
    expect(renderWorker.postMessage).toHaveBeenCalledTimes(1);
});

test('static NFT sprites also bypass the CDN when loaded directly by the worker', () => {
    const {sprite, requests, renderWorker} = createSprite('NFT_abc');
    expect(requests).toHaveLength(0);
    expect(sprite.isLoaded).toBe(true);
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        src: 'https://raw.githubusercontent.com/looperlands/looperlands/main/client/img/1/NFT_abc.png'
    }));
});

test('local sprites keep local image requests and absolute worker URLs', () => {
    const {requests, renderWorker} = createSprite('villager9', 'http://127.0.0.1:8000/');
    expect(requests[0].url).toBe('img/1/villager9.png');
    requests[0].onload();
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        src: 'http://127.0.0.1:8000/img/1/villager9.png'
    }));
});

test('dynamic NFT sprites keep their Spaces asset URL', () => {
    const {renderWorker} = createSprite('avatar', undefined, true);
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        src: 'https://looperlands.sfo3.digitaloceanspaces.com/assets/looper/1/token-hash.png'
    }));
});
