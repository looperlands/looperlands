const fs = require('fs'), vm = require('vm');

class Player {}
class Mob {}
let renderer;
vm.runInNewContext(fs.readFileSync(require.resolve('./renderer'), 'utf8'), {
    Class: {extend: methods => methods},
    define: (_, factory) => { renderer = factory(null, null, null, Player, null, Mob); },
});

function fixture({self = false, renderNames = true, renderMyName = true} = {}) {
    const actor = Object.assign(self ? new Player() : new Mob(), {
        id: self ? 1 : 2, name: 'Looper', level: 6, x: 32, y: 48,
        hitPoints: 100, maxHitPoints: 100, nameOffsetY: -4,
    });
    const host = Object.assign({}, renderer, {scale: 2, game: {
        playerId: 1,
        player: {x: 32, y: 48},
        app: {settings: {getRenderText: () => renderNames, getRenderMyText: () => renderMyName}},
    }});
    return {actor, host, labels: () => host.drawEntityName(actor, -16)};
}

function luminance(color) {
    const rgb = color === 'white' ? [255, 255, 255]
        : [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
    const linear = rgb.map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(label) {
    return (luminance(label.color) + 0.05) / (luminance(label.strokeColor) + 0.05);
}

test.each([{}, {attackingMode: true}, {followingMode: true}, {inCombat: true}])(
    'ordinary names remain opaque and outlined in state %p', state => {
        const {actor, labels} = fixture();
        Object.assign(actor, state);
        expect(labels()[0]).toMatchObject({
            id: 'text', type: 'text', text: '6 Looper', x: 80, y: 64,
            pixelAligned: true, centered: true, globalAlpha: 1,
        });
        expect(contrast(labels()[0])).toBeGreaterThanOrEqual(7);
    }
);

test('ordinary mob names use one neutral readable color regardless of HP', () => {
    const {actor, labels} = fixture();
    for (const hp of [100, 94, 79, 49, 24, 9, 0]) {
        actor.hitPoints = hp;
        const label = labels()[0];
        expect(label.color).toBe('#d8d5c8');
        expect(contrast(label)).toBeGreaterThanOrEqual(7);
    }
});

test('distant idle mobs are unlabelled until approached, targeted, hurt or engaged', () => {
    const {actor, host, labels} = fixture();
    host.game.player = {x: actor.x + 200, y: actor.y + 200};
    expect(labels()).toEqual([]);
    host.game.player = {x: actor.x + 80, y: actor.y};
    expect(labels()).toHaveLength(1);
    host.game.player.x = actor.x + 81;
    expect(labels()).toEqual([]);
    host.game.player.target = {id: actor.id};
    expect(labels()).toHaveLength(1);
    host.game.player.target = null;
    host.game.combatPrototype = {getHealthTargetId: () => actor.id};
    expect(labels()).toHaveLength(1);
    host.game.combatPrototype = null;
    actor.hitPoints = actor.maxHitPoints - 1;
    expect(labels()).toHaveLength(1);
    actor.hitPoints = actor.maxHitPoints;
    actor.inCombat = true;
    expect(labels()).toHaveLength(1);
    actor.inCombat = false;
    actor.attackingMode = true;
    expect(labels()).toHaveLength(1);
    actor.attackingMode = false;
    actor.followingMode = true;
    expect(labels()).toHaveLength(1);
});

test('remote and local player names are not proximity-culled', () => {
    const {actor, host, labels} = fixture({self: true});
    host.game.player = {x: 900, y: 900};
    expect(labels()[0]).toMatchObject({color: '#fcda5c'});
    actor.id = 99;
    expect(labels()[0]).toMatchObject({color: '#d8d5c8'});
});

test('mob nameplates default to legacy visibility when player position is unavailable', () => {
    const {actor, host, labels} = fixture();
    host.game.player = null;
    actor.x = 5000;
    expect(labels()).toHaveLength(1);
});

test('the local name keeps its gold color regardless of HP or other-name visibility', () => {
    const {actor, labels} = fixture({self: true, renderNames: false});
    actor.hitPoints = 1;
    expect(labels()[0]).toMatchObject({color: '#fcda5c', globalAlpha: 1});
    expect(contrast(labels()[0])).toBeGreaterThanOrEqual(7);
});

test.each([{self: false, renderNames: false}, {self: true, renderMyName: false}])(
    'name visibility settings remain authoritative: %p', settings => {
        expect(fixture(settings).labels()).toEqual([]);
    }
);

test('the trainer still uses its custom nameplate', () => {
    const {actor, host, labels} = fixture();
    host.game.combatPrototype = {state: {mob: actor}};
    expect(labels()).toEqual([]);
});

test.each([false, true])('titles retain their positions and readable outlines for self=%s', self => {
    const {actor, labels} = fixture({self});
    actor.title = 'Explorer';
    actor.sprite = {groundOffsetY: -4};
    const [name, title] = labels();
    expect(title).toMatchObject({
        id: 'text', type: 'text', text: 'Explorer', x: 80, y: self ? 90 : 76,
        pixelAligned: true, centered: true, title: true, strokeColor: name.strokeColor,
    });
    expect(contrast(title)).toBeGreaterThanOrEqual(7);
    if (self) expect(title.color).toBe('white');
});
