const fs = require('fs'), vm = require('vm');
const template = require('../sprites/clotharmor.json');

class Character {}
class Player extends Character {}
class Mob extends Character {}
class Item {}
class Npc extends Character {}
let renderer, spriteMethods;
const Class = {extend: methods => methods};
vm.runInNewContext(fs.readFileSync(require.resolve('./renderer'), 'utf8'), {
    Class,
    Types: {Orientations: {UP: 1}, alwaysOnTop: () => false, isFieldEffect: () => false, isChest: () => false},
    define: (_, factory) => {renderer = factory(null, Item, Character, Player, null, Mob, Npc);},
});
vm.runInNewContext(fs.readFileSync(require.resolve('./sprite'), 'utf8'), {
    Class, define: (_, factory) => {spriteMethods = factory();},
});

function fixture({groundOffsetY, scale = 1, upscaledRendering = true, Actor = Player, orientation = 2,
    flipSpriteX = false, flipSpriteY = false, recoil} = {}) {
    const sprite = {...spriteMethods, name: 'body', baseImageURL: 'img/', scale: 1, load() {}};
    sprite.loadJSON({...template, id: 'body'});
    // The main-thread sprite receives this once from the image-loading worker.
    if (groundOffsetY !== undefined) {
        sprite.groundOffsetY = groundOffsetY;
        sprite.groundAnchorSpriteName = 'body';
    }
    const actor = Object.assign(new Actor(), {
        id: 1, x: 32, y: 48, gridX: 2, gridY: 3, orientation, flipSpriteX, flipSpriteY,
        name: 'Hero', title: 'Explorer', level: 1, nameOffsetY: -4, hitPoints: 60, maxHitPoints: 100,
        sprite, shadowOffsetX: 0, shadowOffsetY: 0,
        currentAnimation: {name: 'idle_down', currentFrame: {x: 0, y: 0, index: 0}},
        hasShadow: () => true, hasWeapon: () => true, getWeaponName: () => 'sword', isVisible: () => true,
    });
    const host = Object.assign({}, renderer, {
        scale, tilesize: 16, upscaledRendering, camera: {x: 0, y: 0},
        game: {
            playerId: 1, player: {target: actor}, currentTime: 100,
            app: {settings: {getRenderText: () => true, getRenderMyText: () => true}},
            combatFeedback: {getOffset: () => recoil},
            shadows: {small: {id: 'shadow', width: 16, height: 16}},
            sprites: {sword: {id: 'sword', width: 48, height: 48, offsetX: -16, offsetY: -20,
                animationData: {idle_down: {length: 2, row: 0}}}},
        },
    });
    const [text, data] = host.drawEntity(actor);
    return {actor, host, text, data, body: data.drawData.find(draw => draw.spriteName === 'body')};
}

test.each([1, 2, 3])('full-height artwork stops at the roof-interior boundary at scale %s', scale => {
    // A high roof-edge tile occupies y=48..63; the blocked interior below is background.
    // A fully opaque frame must not leak into that next row at y=64..67.
    const legacy = fixture({scale}), anchored = fixture({scale, groundOffsetY: -4});
    const bottom = result => (result.data.translateY + result.body.dy + result.body.dH) / scale;
    expect(bottom(legacy)).toBe(68);
    expect(bottom(anchored)).toBe(64);
    expect(anchored.body).toMatchObject({sx: 0, sy: 0, sW: 32, sH: 32, dW: 32 * scale, dH: 32 * scale});
    expect(anchored.data).toMatchObject({translateX: 32 * scale, translateY: 48 * scale, depthY: 64});
    expect(anchored.actor).toMatchObject({x: 32, y: 48, gridX: 2, gridY: 3});
    expect(anchored.data.drawData[0]).toEqual(legacy.data.drawData[0]);
});

test('a padded avatar retains legacy placement when the detector returns zero', () => {
    const legacy = fixture(), actual = fixture({groundOffsetY: 0});
    const {bodySpriteName, groundOffsetY, ...data} = actual.data;
    expect(bodySpriteName).toBe('body');
    expect(groundOffsetY).toBe(0);
    expect(data).toEqual(legacy.data);
    expect(actual.text.map(({bodySpriteName, groundOffsetY, ...label}) => {
        expect(bodySpriteName).toBe('body');
        expect(groundOffsetY).toBe(0);
        return label;
    })).toEqual(legacy.text);
    expect(actual.host.getEntityBoundingRect(actual.actor)).toEqual(legacy.host.getEntityBoundingRect(legacy.actor));
});

test.each([true, false])('source and destination sizes stay intact with upscaled rendering %s', upscaledRendering => {
    const legacy = fixture({upscaledRendering, scale: 3});
    const anchored = fixture({upscaledRendering, scale: 3, groundOffsetY: -4});
    for (const key of ['sx', 'sy', 'sW', 'sH', 'dx', 'dW', 'dH']) expect(anchored.body[key]).toBe(legacy.body[key]);
    expect(anchored.body.dy - legacy.body.dy).toBe(-12);
});

test.each([1, 2])('held equipment stays aligned on both sides of the body in orientation %s', orientation => {
    const legacy = fixture({orientation, scale: 2});
    const anchored = fixture({orientation, scale: 2, groundOffsetY: -4});
    expect(anchored.data.drawData.map(draw => draw.spriteName)).toEqual(legacy.data.drawData.map(draw => draw.spriteName));
    for (const name of ['body', 'sword']) {
        expect(anchored.data.drawData.find(draw => draw.spriteName === name).dy)
            .toBe(legacy.data.drawData.find(draw => draw.spriteName === name).dy - 8);
    }
});

test.each([
    {flipSpriteX: true}, {flipSpriteY: true}, {flipSpriteX: true, flipSpriteY: true},
])('the anchor moves world-up under the actual flip transform %p', flip => {
    const legacy = fixture({...flip, scale: 2, recoil: {x: 2, y: 1}});
    const anchored = fixture({...flip, scale: 2, recoil: {x: 2, y: 1}, groundOffsetY: -4});
    const direction = anchored.data.scaleY || 1;
    expect((anchored.body.dy - legacy.body.dy) * direction).toBe(-8);
    expect(anchored.data.drawData[0]).toEqual(legacy.data.drawData[0]);
    expect(anchored.body.dx).toBe(legacy.body.dx);
});

test('name, title and visual bounds follow the anchored body and equipment', () => {
    const legacy = fixture({scale: 2}), anchored = fixture({scale: 2, groundOffsetY: -4});
    expect(anchored.text.map(label => label.y)).toEqual(legacy.text.map(label => label.y - 8));
    for (const label of anchored.text) expect(label).toMatchObject({bodySpriteName: 'body', groundOffsetY: -4});
    expect(anchored.host.getEntityBoundingRect(anchored.actor)).toMatchObject({y: 48, bottom: 144});
    anchored.actor.hasWeapon = () => false;
    expect(anchored.host.getEntityBoundingRect(anchored.actor)).toMatchObject({y: 64, bottom: 128});
});

test('a target health bar follows the body without shifting its depth', () => {
    const legacy = fixture({Actor: Mob}), anchored = fixture({Actor: Mob, groundOffsetY: -4});
    expect(anchored.data.healthBar.y).toBe(legacy.data.healthBar.y - 4);
    expect(anchored.data.depthY).toBe(legacy.data.depthY);
});
