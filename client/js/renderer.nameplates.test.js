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

test('distant idle mobs remain labelled, regardless of distance or player presence', () => {
    const {actor, host, labels} = fixture();
    host.game.player = {x: 5000, y: 5000};
    expect(labels()).toHaveLength(1);
    host.game.player = null;
    expect(labels()).toHaveLength(1);
});

test('remote players use HP colors and idle opacity; local names remain gold', () => {
    const {actor, labels} = fixture({self: true});
    actor.hitPoints = 1;
    expect(labels()[0]).toMatchObject({color: '#fcda5c', globalAlpha: 1});
    actor.id = 99;
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
