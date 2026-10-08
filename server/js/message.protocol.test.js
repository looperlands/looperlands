global.Types = {};
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
const Messages = require('./message');
const Types = require('../../shared/js/gametypes');
const fs = require('fs'), vm = require('vm');
const cls = require('./lib/class');

function client() {
    let GameClient;
    const sandbox = {Types, Class: cls.Class, _: require('underscore'), console: {log() {}, error: jest.fn()},
        define: (dependencies, factory) => { GameClient = factory(class {}, {createEntity: (kind, id) => ({kind, id, setShowIndicator(value) {this.showIndicator = value;}, applyBehaviorState(value) {this.behaviorState = value;}})}, {}, class {}); }};
    vm.runInNewContext(fs.readFileSync(require.resolve('../../client/js/gameclient'), 'utf8'), sandbox);
    return new GameClient('localhost', 8000, 'http', 'session', 'main');
}
const actor = {id: 81, x: 42, y: 216, kind: Types.Entities.GUARD};
const cases = [
    ['Move', [actor], 'move_callback', [81, 42, 216]],
    ['Despawn', [81], 'despawn_callback', [81]],
    ['Teleport', [actor], 'teleport_callback', [81, 42, 216]],
    ['LootMove', [actor, {id: 91}], 'lootmove_callback', [81, 91]],
    ['Attack', [81, 92], 'attack_callback', [81, 92]],
    ['Health', [73, false], 'health_callback', [73, false]],
    ['Health', [73, true], 'health_callback', [73, true]],
    ['HitPoints', [100], 'hp_callback', [100]],
    ['EquipItem', [actor, Types.Entities.SWORD1], 'equip_callback', [81, Types.Entities.SWORD1]],
    ['Chat', [actor, 'The path is safe.', true], 'chat_callback', [81, 'The path is safe.', {ambient: true}]],
    ['Chat', [actor, 'Your basket is ready.'], 'chat_callback', [81, 'Your basket is ready.', undefined]],
    ['Emote', [actor, 'happy'], 'emotion_callback', [81, 'happy']],
    ['Damage', [actor, 9], 'dmg_callback', [81, 9]],
    ['Population', [2, 25], 'population_callback', [2, 25]],
    ['Kill', [{kind: Types.Entities.RAT}, 4], 'kill_callback', [Types.Entities.RAT, 4]],
    ['List', [[81, 82]], 'list_callback', [[81, 82]]],
    ['Destroy', [actor], 'destroy_callback', [81]],
    ['Blink', [actor], 'blink_callback', [81]],
    ['MobDoSpecial', [actor], 'mobDoSpecial_callback', [81]],
    ['MobExitCombat', [actor], 'mobExitCombat_callback', [81]],
    ['QuestComplete', ['Lantern Picnic', ['Everyone is invited.'], 20, Types.Medals.RAT], 'questComplete_callback', ['Lantern Picnic', ['Everyone is invited.'], 20, Types.Medals.RAT]],
    ['Follow', [actor], 'follow_callback', [81]],
    ['Camera', [42, 216], 'camera_callback', [42, 216]],
    ['Sound', ['watersplash'], 'sound_callback', ['watersplash']],
    ['Music', ['fluteguitar'], 'music_callback', ['fluteguitar']],
    ['Layer', ['lanterns', false], 'layer_callback', ['lanterns', false]],
    ['Animate', [81, 'idle_down'], 'animate_callback', [81, 'idle_down']],
    ['NpcState', [{...actor, behaviorState: {key: 'town-watch', moveSpeed: 450}}], 'npcState_callback', [81, {key: 'town-watch', moveSpeed: 450}]],
    ['WorldAmbience', [{scene: 'Town', picnic: {phase: 'celebrating', center: {x: 42, y: 216}}}], 'worldAmbience_callback', [{scene: 'Town', picnic: {phase: 'celebrating', center: {x: 42, y: 216}}}]],
    ['WorldAmbience', [null], 'worldAmbience_callback', [null]],
    ['Indicator', [81, false], 'on_indicator_update_callback', [81, false]],
    ['TileStage', [{id: 'lantern', stage: 2}], 'tileStage_callback', [{id: 'lantern', stage: 2}]]
];
test.each(cases)('%s survives server serialization and client dispatch', (name, args, callback, expected) => {
    const game = client();
    game[callback] = jest.fn();
    // Cross the same JSON boundary as socket transport; no shared test objects.
    const packet = JSON.parse(JSON.stringify(new Messages[name](...args).serialize()));
    game.receiveAction(packet);
    expect(game[callback]).toHaveBeenCalledWith(...expected);
});

test('loot drops keep player attribution through the transport boundary', () => {
    const game = client(); game.drop_callback = jest.fn();
    const mob = {...actor, hatelist: [{id: 1}, {id: 2}]};
    const item = {id: 9, kind: Types.Entities.FLASK};
    game.receiveAction(JSON.parse(JSON.stringify(new Messages.Drop(mob, item).serialize())));
    expect(game.drop_callback).toHaveBeenCalledWith(expect.objectContaining({...item, wasDropped: true, playersInvolved: [1, 2]}), actor.id);
});

test('late NPC spawns preserve the indicator and routine state at their original offsets', () => {
    const game = client(); game.spawn_character_callback = jest.fn();
    const npc = {...actor, getState: () => [actor.id, actor.kind, 42, 216, true, {key: 'town-watch', orientation: Types.Orientations.LEFT, moveSpeed: 450}]};
    game.receiveAction(JSON.parse(JSON.stringify(new Messages.Spawn(npc).serialize())));
    const spawned = game.spawn_character_callback.mock.calls[0];
    expect(spawned[0].behaviorState).toEqual({key: 'town-watch', orientation: Types.Orientations.LEFT, moveSpeed: 450});
    expect(spawned[0].showIndicator).toBe(true);
    expect(spawned.slice(1, 3)).toEqual([42, 216]);
});
