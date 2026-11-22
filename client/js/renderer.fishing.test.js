const fs = require('fs');
const vm = require('vm');

function setup() {
    const modules = {}, image = {width: 96};
    const canvas = {};
    const context = Object.fromEntries(['save', 'restore', 'scale', 'drawImage', 'fillRect', 'ellipse',
        'beginPath', 'stroke', 'moveTo', 'quadraticCurveTo', 'rect', 'clip'].map(name => [name, jest.fn()]));
    const pixels = new Uint8ClampedArray(48 * 48 * 4);
    const sampler = {canvas, drawImage: jest.fn(), getImageData: jest.fn(() => ({data: pixels}))};
    const sandbox = {document: {createElement: () => ({getContext: () => sampler})}};
    vm.createContext(sandbox);
    for (const name of ['lib/class', 'float', 'fishingcast', 'renderer']) {
        sandbox.define = (deps, factory) => {
            modules[name] = factory ? factory(...deps.map(dep => modules[dep])) : deps();
        };
        vm.runInContext(fs.readFileSync(require.resolve('./' + name), 'utf8'), sandbox);
    }
    const float = new modules.float(5, 4, 1, 'rod');
    const caster = {x: 48, y: 64, gridX: 3, gridY: 4, isVisible: () => true,
        currentAnimation: {name: 'idle_right', currentFrame: {index: 0}}};
    const sprite = {getImage: jest.fn(() => image), width: 16, height: 16, offsetX: 0, offsetY: 0,
        scale: 1, animationData: {idle: {length: 6, row: 0}}};
    const renderer = Object.assign(Object.create(modules.renderer.prototype), {
        camera: {isVisiblePosition: () => true}, context, tilesize: 16, scale: 2,
        game: {getEntityById: () => caster, sprites: {'item-rod': sprite}, app: {settings: {getReducedMotion: () => false}}}
    });
    const draw = time => {
        renderer.game.currentTime = time;
        renderer.drawFishingFloat(float);
        return context.quadraticCurveTo.mock.lastCall?.slice(2);
    };
    return {renderer, caster, context, sprite, float, draw, pixels, sampler};
}

test('the rod pays out an airborne bobber, splashes on its selected tile and reels back to the tip', () => {
    const {context, float, draw} = setup();
    const launch = draw(float.releaseAt);
    const flight = draw((float.releaseAt + float.landAt) / 2);
    expect(flight[0]).toBeGreaterThan(launch[0]);
    expect(flight[0]).toBeLessThan(88);
    expect(flight[1]).toBeLessThan(launch[1]);
    expect(context.ellipse).not.toHaveBeenCalled();
    expect(draw(float.landAt)).toEqual([88, 72]);
    expect(context.ellipse).toHaveBeenCalled();
    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(context.drawImage.mock.lastCall.slice(-4)).toEqual([80, 64, 16, 16]);
    float.biteAt = float.landAt + 6000;
    expect(draw(float.biteAt)[1]).toBeGreaterThan(72);
    expect(context.clip).toHaveBeenCalledTimes(1);
    float.reelAt = float.biteAt + 800;
    const halfway = draw(float.reelAt + float.reelDuration / 2);
    expect(halfway[0]).toBeLessThan(88);
    expect(halfway[0]).toBeGreaterThan(launch[0]);
    expect(draw(float.reelAt + float.reelDuration)).toEqual(context.moveTo.mock.lastCall);
});

test('the attachment follows mirrored artwork and the avatar ground offset, sampling a pose once', () => {
    const {float, caster, renderer, pixels, sampler, context, draw} = setup();
    float.gridX = 1;
    caster.flipSpriteX = true;
    caster.sprite = {groundOffsetY: -3};
    renderer.game.sprites.rod = {width: 48, height: 48, offsetX: -16, offsetY: -20,
        scale: 1, getImage: () => ({}), animationData: {idle_right: {row: 2, length: 2}}};
    pixels[(10 * 48 + 40) * 4 + 3] = 255;
    draw(float.landAt); draw(float.landAt + 400);
    expect(context.moveTo.mock.lastCall).toEqual([caster.x + 16 - 24.5, caster.y - 9.5 - 3]);
    expect(sampler.getImageData).toHaveBeenCalledTimes(1);
});

test('an unseen caster has no tether and lazy float artwork replaces the fallback as it loads', () => {
    const {renderer, float, sprite, context, draw} = setup();
    renderer.game.getEntityById = () => undefined;
    sprite.getImage.mockReturnValueOnce(null);
    draw(float.landAt + 1450);
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.quadraticCurveTo).not.toHaveBeenCalled();
    draw(float.landAt + 1680);
    expect(context.drawImage.mock.lastCall.slice(1)).toEqual([16, 0, 16, 16, 80, 63, 16, 16]);
    renderer.camera.isVisiblePosition = () => false;
    draw(float.landAt + 2000);
    expect(sprite.getImage).toHaveBeenCalledTimes(2);
});

test('reduced motion holds the bobber steady and preserves a visible bite', () => {
    const {renderer, float, draw} = setup();
    renderer.game.app.settings.getReducedMotion = () => true;
    expect(draw(float.landAt + 240)).toEqual(draw(float.landAt + 1680));
    float.biteAt = float.landAt + 6000;
    expect(draw(float.biteAt)).toEqual([88, 76]);
    expect(draw(float.biteAt + 410)).toEqual([88, 76]);
});
