const fs = require('fs');
const vm = require('vm');
const typeContext = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../../shared/js/gametypes'), 'utf8'), typeContext);
const GameTypes = typeContext.Types;

class Character {}
class Mob extends Character {}
class Item {}
class Npc extends Character {}
let renderer;
vm.runInNewContext(fs.readFileSync(require.resolve('./renderer'), 'utf8'), {
    Class: {extend: methods => methods},
    Types: GameTypes,
    define: (_, factory) => { renderer = factory(null, Item, Character, Character, null, Mob, Npc); },
});

let assetId = 0;
function dynamicWeapon(options, assetType = 'weapon') {
    return GameTypes.addDynamicNFT({nftId: `0xweapon-layer-${assetId++}`, assetType, options});
}

function drawOrder(weaponName, orientation, animation = 'walk_up', actionToolName) {
    const actor = Object.assign(new Character(), {
        id: 1, x: 32, y: 48, orientation, actionToolName,
        sprite: {id: 'body', name: 'body', width: 32, height: 32, offsetX: -8, offsetY: -12},
        currentAnimation: {name: animation, currentFrame: {x: 0, y: 0, index: 0}},
        hasShadow: () => false, hasWeapon: () => true,
        getWeaponName: () => weaponName, isVisible: () => true,
    });
    const equipmentName = actionToolName || weaponName;
    const host = {
        scale: 2, tilesize: 16, upscaledRendering: true, drawEntityName: () => [],
        game: {shadows: {}, sprites: {[equipmentName]: {
            id: equipmentName, width: 48, height: 48, offsetX: -16, offsetY: -20,
            animationData: {[animation]: {length: 4, row: 0}},
        }}},
    };
    return Array.from(renderer.drawEntity.call(host, actor)[1].drawData, draw => draw.spriteName);
}

test.each([
    [true, true], ['true', true], [false, false], ['false', false], [undefined, false],
])('upward walking respects the platform alwaysOnTopOfPlayer option %s', (value, onTop) => {
    const weapon = dynamicWeapon(value === undefined ? undefined : {alwaysOnTopOfPlayer: value});
    expect(drawOrder(weapon, GameTypes.Orientations.UP)).toEqual(onTop ? ['body', weapon] : [weapon, 'body']);
});

test.each(['weapon', 'ranged_weapon', 'fishingrod'])('%s stays above the player for upward idle, walking and attacks when enabled', assetType => {
    const weapon = dynamicWeapon({alwaysOnTopOfPlayer: true}, assetType);
    for (const animation of ['idle_up', 'walk_up', 'atk_up']) {
        expect(drawOrder(weapon, GameTypes.Orientations.UP, animation)).toEqual(['body', weapon]);
    }
});

test('unchecked weapons still render above the player when facing sideways or down', () => {
    const weapon = dynamicWeapon({alwaysOnTopOfPlayer: false});
    for (const direction of ['LEFT', 'RIGHT', 'DOWN']) {
        expect(drawOrder(weapon, GameTypes.Orientations[direction])).toEqual(['body', weapon]);
    }
});

test('static weapons and temporary action tools keep their upward layering', () => {
    expect(drawOrder('redsword', GameTypes.Orientations.UP)).toEqual(['redsword', 'body']);
    const weapon = dynamicWeapon({alwaysOnTopOfPlayer: true});
    expect(drawOrder(weapon, GameTypes.Orientations.UP, 'atk_up', 'tool-shovel')).toEqual(['tool-shovel', 'body']);
});
