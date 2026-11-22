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

test.each([
    [{}, 0.5], [{attackingMode: true}, 1], [{followingMode: true}, 1],
    [{inCombat: true}, 1]
])('restore legacy name opacity for mob state %p', (state, globalAlpha) => {
    const {actor, labels} = fixture();
    Object.assign(actor, state);
    const name = labels()[0];
    expect(name).toMatchObject({
        id: 'text', type: 'text', text: '6 Looper', x: 80, y: 64,
        pixelAligned: true, centered: true, color: 'green', globalAlpha
    });
    expect(name).not.toHaveProperty('strokeColor');
});

test.each([
    [0, 'black'], [4, 'black'], [5, 'red'], [9, 'red'], [10, 'orangered'],
    [24, 'orangered'], [25, 'orange'], [49, 'orange'], [50, 'yellow'],
    [79, 'yellow'], [80, 'greenyellow'], [89, 'greenyellow'],
    [90, 'forestgreen'], [94, 'forestgreen'], [95, 'green'], [100, 'green']
])('restore HP-based mob name color at %i HP', (hp, color) => {
    const {actor, labels} = fixture();
    actor.hitPoints = hp;
    expect(labels()[0]).toMatchObject({color, globalAlpha: 0.5});
});

test.each([
    [0, 0.5], [64, 0.5], [80, 0.421875], [96, 0.25], [112, 0.078125]
])('idle enemy names smoothly fade with distance %i', (distance, alpha) => {
    const {actor, host, labels} = fixture();
    host.game.player = {x: actor.x + distance, y: actor.y};
    expect(labels()[0].globalAlpha).toBeCloseTo(alpha, 6);
});

test('enemy names disappear only after fading out entirely', () => {
    const {actor, host, labels} = fixture();
    host.game.player = {x: actor.x + 127, y: actor.y};
    expect(labels()[0].globalAlpha).toBeGreaterThan(0);
    expect(labels()[0].globalAlpha).toBeLessThan(0.001);
    for (const distance of [128, 129, 4000]) {
        host.game.player.x = actor.x + distance;
        expect(labels()).toEqual([]);
    }
});

test('missing player or enemy coordinates retain name visibility', () => {
    const {actor, host, labels} = fixture();
    host.game.player = null;
    actor.x = 5000;
    expect(labels()[0].globalAlpha).toBe(0.5);
    host.game.player = {x: NaN, y: 48};
    expect(labels()).toHaveLength(1);
    actor.x = undefined;
    host.game.player = {x: 32, y: 48};
    expect(labels()).toHaveLength(1);
});

test.each(['inCombat', 'attackingMode', 'followingMode'])(
    'distant %s mobs keep their names at normal engaged opacity', flag => {
        const {actor, host, labels} = fixture();
        host.game.player = {x: actor.x + 4000, y: actor.y};
        actor[flag] = true;
        expect(labels()[0].globalAlpha).toBe(1);
    }
);

test('targeted or injured distant enemies remain identifiable', () => {
    const {actor, host, labels} = fixture();
    host.game.player = {x: actor.x + 4000, y: actor.y, target: {id: actor.id}};
    expect(labels()[0].globalAlpha).toBe(0.5);
    host.game.player.target = null;
    host.game.combatPrototype = {getHealthTargetId: () => actor.id};
    expect(labels()[0].globalAlpha).toBe(0.5);
    host.game.combatPrototype = null;
    actor.hitPoints = 95;
    expect(labels()[0].globalAlpha).toBe(0.5);
});

test('enemy titles fade with names, while retaining their original full opacity nearby', () => {
    const {actor, host, labels} = fixture();
    actor.title = 'Elite';
    expect(labels()[1]).toMatchObject({color: 'orange', globalAlpha: 1});
    host.game.player = {x: actor.x + 96, y: actor.y};
    const [name, title] = labels();
    expect(name.globalAlpha).toBeCloseTo(0.25);
    expect(title.globalAlpha).toBeCloseTo(0.5);
    host.game.player.x = actor.x + 128;
    expect(labels()).toEqual([]);
});

test('remote players remain visible regardless of distance; local names remain gold', () => {
    const {actor, host, labels} = fixture({self: true});
    actor.hitPoints = 1;
    expect(labels()[0]).toMatchObject({color: '#fcda5c', globalAlpha: 1});
    actor.id = 99;
    host.game.player = {x: 4000, y: 4000};
    expect(labels()[0]).toMatchObject({color: 'black', globalAlpha: 0.5});
});

test.each([{self: false, renderNames: false}, {self: true, renderMyName: false}])(
    'name visibility settings remain authoritative: %p', settings => {
        expect(fixture(settings).labels()).toEqual([]);
    }
);

test('the combat trainer keeps its special nameplate', () => {
    const {actor, host, labels} = fixture();
    host.game.combatPrototype = {state: {mob: actor}};
    expect(labels()).toEqual([]);
});

test.each([false, true])('titles retain original positions and colors for self=%s', self => {
    const {actor, labels} = fixture({self});
    actor.title = 'Explorer';
    actor.sprite = {groundOffsetY: -4};
    const [name, title] = labels();
    expect(name).not.toHaveProperty('strokeColor');
    expect(title).toMatchObject({
        id: 'text', type: 'text', text: 'Explorer', x: 80, y: self ? 90 : 76,
        pixelAligned: true, centered: true, title: true,
        color: self ? 'white' : 'orange'
    });
    expect(title).not.toHaveProperty('strokeColor');
});
