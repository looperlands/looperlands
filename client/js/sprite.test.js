const fs = require('fs');
const path = require('path');
const vm = require('vm');

beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.clearAllTimers(); jest.useRealTimers();});

function createSprite(name, href = 'https://looperlands.io/game/', nft = false, deferImage = false, options = {}) {
    let Sprite;
    const requests = [];
    const listeners = [];
    const renderWorker = {postMessage: jest.fn(), addEventListener: jest.fn((type, listener) => listeners.push(listener))};
    const data = {id: name, width: 16, height: 16, animations: {idle: {length: 1, row: 0}}, ...options.data};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sprite.js'), 'utf8'), {
        define: (deps, factory) => { Sprite = factory({}, function () {}, {[name]: data, clotharmor: data, redsword: data}); },
        Class: {extend: methods => function (...args) { Object.assign(this, methods); this.init(...args); }},
        Image: function () {
            Object.defineProperty(this, 'src', {set(url) {
                requests.push({url, crossOrigin: this.crossOrigin, onload: this.onload, onerror: this.onerror});
            }});
        },
        window: {location: {href}}, document: options.document, self: {}, URL, setTimeout, clearTimeout,
        console: {log: jest.fn(), error: jest.fn()}
    });
    const sprite = nft ? new Sprite(name, 1, renderWorker, 'token-hash', options.assetType || 'armor', '0xabc')
        : new Sprite(name, 1, renderWorker, undefined, undefined, undefined, deferImage);
    return {sprite, requests, renderWorker, Sprite, data, receive: message => listeners.forEach(listener => listener({data: message}))};
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


test('avatar forms use isolated renderer image identities despite sharing one NFT', async () => {
    const {sprite, renderWorker, requests} = createSprite('NFT_abc__form_stage-two', undefined, true);
    expect(sprite.id).toBe('NFT_abc__form_stage-two');
    expect(renderWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({id: sprite.id, spriteName: sprite.name}));
    const ready = sprite.whenImageLoaded();
    requests[0].onload();
    await expect(ready).resolves.toBe(true);
    await expect(sprite.whenImageLoaded()).resolves.toBe(true);
});

test('appearance preload resolves a failed image without replacing the previous avatar', async () => {
    const {sprite, requests} = createSprite('NFT_abc__form_failed', undefined, true);
    const ready = sprite.whenImageLoaded();
    requests[0].onerror();
    await expect(ready).resolves.toBe(false);
});

const avatarFrame = {width: 32, height: 32, offset_x: -8, offset_y: -12,
    animations: {idle_down: {length: 2, row: 8}}};

test.each(['armor', 'looper'])('dynamic %s requests worker anchor detection without fetching a main-thread image', assetType => {
    const {sprite, requests, renderWorker, receive} = createSprite('avatar', undefined, true, false, {data: avatarFrame, assetType});
    expect(requests).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
    expect(sprite.groundOffsetY).toBe(0);
    const registration = renderWorker.postMessage.mock.calls[0][0];
    expect(registration).toMatchObject({autoGroundAnchor: true, sourceScale: 1, requestId: expect.any(Number)});
    receive({...registration, type: 'spriteGroundAnchor', groundOffsetY: -4});
    expect(sprite).toMatchObject({groundOffsetY: -4, groundAnchorSpriteName: 'avatar', offsetY: -12});
    expect(renderWorker.postMessage).toHaveBeenLastCalledWith({type: 'spriteGroundAnchorApplied',
        requestId: registration.requestId, spriteName: 'avatar', src: registration.src});
    expect(requests).toHaveLength(0);
});

test.each(['weapon', 'companion', 'bot'])('dynamic %s retains legacy placement without automatic detection', assetType => {
    const {sprite, renderWorker} = createSprite('avatar', undefined, true, false, {data: avatarFrame, assetType});
    expect(sprite.groundOffsetY).toBe(0);
    expect(sprite.groundAnchorSpriteName).toBeUndefined();
    expect(renderWorker.postMessage.mock.calls[0][0]).toMatchObject({autoGroundAnchor: false});
    expect(renderWorker.addEventListener).not.toHaveBeenCalled();
});

test('static avatar sheets retain legacy offsets and the existing deferred loading path', () => {
    const {sprite, requests, renderWorker} = createSprite('NFT_static', undefined, false, true, {data: avatarFrame});
    expect(sprite.groundOffsetY).toBe(0);
    expect(requests).toHaveLength(0);
    expect(renderWorker.postMessage.mock.calls[0][0]).toMatchObject({autoGroundAnchor: false});
    expect(renderWorker.addEventListener).not.toHaveBeenCalled();
});

test('one worker registration shares its detected anchor across scales and later instances', () => {
    const {sprite, Sprite, requests, renderWorker, receive} = createSprite('avatar', undefined, true, false, {data: avatarFrame});
    const scaled = new Sprite('avatar', 2, renderWorker, 'token-hash', 'looper', '0xabc');
    expect(renderWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(renderWorker.addEventListener).toHaveBeenCalledTimes(1);
    const registration = renderWorker.postMessage.mock.calls[0][0];
    receive({...registration, type: 'spriteGroundAnchor', groundOffsetY: -4});
    const later = new Sprite('avatar', 3, renderWorker, 'token-hash', 'armor', '0xabc');
    for (const instance of [sprite, scaled, later]) expect(instance.groundOffsetY).toBe(-4);
    expect(renderWorker.postMessage).toHaveBeenCalledTimes(2); // One load and one acknowledgement.
    expect(requests).toHaveLength(0);
});

test('replaced registrations reject stale source and request replies without releasing the new image', () => {
    const {sprite, Sprite, renderWorker, receive} = createSprite('avatar', undefined, true, false, {data: avatarFrame});
    const oldRegistration = renderWorker.postMessage.mock.calls[0][0];
    const replacement = new Sprite('avatar', 1, renderWorker, 'new-token', 'looper', '0xabc');
    const current = renderWorker.postMessage.mock.calls[1][0];
    receive({...oldRegistration, type: 'spriteGroundAnchor', groundOffsetY: -4});
    receive({...current, src: oldRegistration.src, type: 'spriteGroundAnchor', groundOffsetY: -4});
    expect(renderWorker.postMessage).toHaveBeenCalledTimes(2);
    expect(sprite.groundOffsetY).toBe(0);
    expect(replacement.groundOffsetY).toBe(0);
    receive({...current, type: 'spriteGroundAnchor', groundOffsetY: -2});
    expect(replacement.groundOffsetY).toBe(-2);
    expect(sprite.groundOffsetY).toBe(0);
    expect(renderWorker.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({type: 'spriteGroundAnchorApplied', requestId: current.requestId}));
});

test('registering a static replacement discards pending dynamic anchor state', () => {
    const {Sprite, renderWorker, receive} = createSprite('avatar', undefined, true, false, {data: avatarFrame});
    const registration = renderWorker.postMessage.mock.calls[0][0];
    const replacement = new Sprite('avatar', 1, renderWorker, undefined, undefined, undefined, true);
    receive({...registration, type: 'spriteGroundAnchor', groundOffsetY: -4});
    expect(replacement.groundOffsetY).toBe(0);
    expect(renderWorker.postMessage).toHaveBeenCalledTimes(2);
});

test.each([0, 2, -100, NaN])('a zero or invalid detected offset %s falls back to legacy placement and acknowledges readiness', groundOffsetY => {
    const {sprite, renderWorker, receive} = createSprite('avatar', undefined, true, false, {data: avatarFrame});
    const registration = renderWorker.postMessage.mock.calls[0][0];
    receive({...registration, type: 'spriteGroundAnchor', groundOffsetY});
    expect(sprite.groundOffsetY).toBe(0);
    expect(renderWorker.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({type: 'spriteGroundAnchorApplied'}));
});

test('derived selection and hurt sprites follow the original avatar result', () => {
    const ctx = {drawImage() {}, getImageData: () => ({data: new Uint8ClampedArray(4)}), putImageData() {}};
    const document = {createElement: () => ({getContext: () => ctx, toDataURL: () => 'data:image/png;base64,AA=='})};
    const {sprite, renderWorker, receive} = createSprite('avatar', undefined, true, false, {data: avatarFrame, document});
    const registration = renderWorker.postMessage.mock.calls[0][0];
    sprite.image = {width: 1, height: 1};
    sprite.createHurtSprite(); sprite.createSilhouette();
    receive({...registration, type: 'spriteGroundAnchor', groundOffsetY: -4});
    for (const derived of [sprite.whiteSprite, sprite.silhouetteSprite]) {
        expect(derived).toMatchObject({groundOffsetY: -4, groundAnchorSpriteName: 'avatar', offsetY: -12});
    }
    sprite.createHurtSprite();
    expect(sprite.whiteSprite.groundOffsetY).toBe(-4);
});
