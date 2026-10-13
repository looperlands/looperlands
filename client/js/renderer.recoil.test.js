const fs = require('fs'), vm = require('vm');
class Character {}
class Mob extends Character {}
class Item {}
class Npc extends Character {}
let renderer;
vm.runInNewContext(fs.readFileSync(require.resolve('./renderer'), 'utf8'), {
    Class: {extend: methods => methods},
    Types: {Orientations: {UP: 1}, alwaysOnTop: () => false},
    define: (_, factory) => { renderer = factory(null, Item, Character, Character, null, Mob, Npc); },
});
test.each([false, true])('body and equipment recoil together with flipped=%s; shadow stays planted', flip => {
    const actor = Object.assign(new Mob(), {x: 32, y: 48, flipSpriteX: flip, orientation: 2,
        sprite: {id: 1, name: 'body', width: 32, height: 32, offsetX: -8, offsetY: -12},
        currentAnimation: {name: 'atk_down', currentFrame: {x: 0, y: 0, index: 0}},
        hasShadow: () => true, hasWeapon: () => true, getWeaponName: () => 'sword', isVisible: () => true});
    const host = {scale: 2, tilesize: 16, upscaledRendering: true, drawEntityName: jest.fn(),
        game: {currentTime: 1000, combatFeedback: {getOffset: () => ({x: 2, y: 0})},
            shadows: {small: {id: 2, width: 16, height: 16}},
            sprites: {sword: {id: 3, width: 24, height: 24, offsetX: -4, offsetY: -8,
                animationData: {atk_down: {length: 5, row: 0}}}}}};
    actor.shadowOffsetX = actor.shadowOffsetY = 0;
    const [, data] = renderer.drawEntity.call(host, actor);
    const amount = flip ? -4 : 4;
    expect(data.drawData.find(draw => draw.spriteName === 'body').dx).toBe(-16 + amount);
    expect(data.drawData.find(draw => draw.spriteName === 'sword').dx).toBe(-8 + amount);
    expect(data.drawData.find(draw => draw.spriteName === 'shadow16').dx).toBe(0);
    expect(actor.x).toBe(32);
});
