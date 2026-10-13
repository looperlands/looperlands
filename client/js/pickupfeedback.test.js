const fs = require('fs'), vm = require('vm');
const extension = require('./pickup-renderer-worker');
function setup() {
    let Feedback;
    vm.runInNewContext(fs.readFileSync(require.resolve('./pickupfeedback'), 'utf8'), {
        define: factory => {Feedback = factory();},
    });
    const settings = {getCombatEffectsEnabled: () => true, getReducedMotion: () => false};
    const game = {started: true, mapId: 'main', sessionId: 'one', player: {x: 32, y: 48}, app: {settings}};
    return {feedback: new Feedback(game), game, settings};
}
test('a pickup converges toward the moving player and expires without moving the item', () => {
    const {feedback, game} = setup();
    const item = {x: 32, y: 48};
    feedback.add(item, 1000);
    expect(feedback.getFrame(1000)[0]).toMatchObject({x: 34, y: 56, alpha: 1});
    game.player.x = 48;
    expect(feedback.getFrame(1120)[0].x).toBe(51);
    expect(item).toEqual({x: 32, y: 48});
    expect(feedback.getFrame(1240)).toHaveLength(0);
});
test.each(['map', 'session', 'death', 'stop', 'disconnect', 'reduced', 'disabled'])('%s clears pickup trails', reason => {
    const {feedback, game, settings} = setup();
    feedback.add({x: 32, y: 48}, 1000);
    if (reason === 'map') game.mapId = 'other';
    if (reason === 'session') game.sessionId = 'two';
    if (reason === 'death') game.player.isDead = true;
    if (reason === 'stop') game.isStopped = true;
    if (reason === 'disconnect') game.started = false;
    if (reason === 'reduced') settings.getReducedMotion = () => true;
    if (reason === 'disabled') settings.getCombatEffectsEnabled = () => false;
    expect(feedback.getFrame(1050)).toHaveLength(0);
});
test('repeated pickups share a bounded budget and render in map pixels at every scale', () => {
    const {feedback} = setup();
    for (let index = 0; index < 50; index++) feedback.add({x: 32, y: 48}, 1000);
    expect(feedback.getFrame(1000)).toHaveLength(64);
    const context = {fillRect: jest.fn()};
    extension.draw(context, [{x: 34, y: 56, alpha: 0.5}], {cameraX: 16, cameraY: 32, scale: 3});
    expect(context.fillRect).toHaveBeenCalledWith(54, 72, 3, 3);
});

test.each([false, true])('pickup particles only run after successful loot validation: rejected=%s', rejected => {
    class LootException {}
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
        Class: {extend: value => value},
        Types: {Entities: {LOOPRING: 1}, isHealingItem: () => false},
        define: (deps, factory) => {
            methods = factory(...deps.map(dep => dep === 'exceptions' ? {LootException} : undefined));
        },
    });
    const item = {kind: 7, getLootMessage: () => 'Picked up'};
    const game = {currentTime: 1000, isItemAt: () => true, getItemAt: () => item,
        player: {loot: () => {if (rejected) throw new LootException();}},
        client: {sendLoot: jest.fn()}, pickupFeedback: {add: jest.fn()},
        removeItem: jest.fn(), showNotification: jest.fn(), audioManager: {playSound: jest.fn()}};
    methods.lootItemAt.call(game, 2, 3);
    expect(game.pickupFeedback.add).toHaveBeenCalledTimes(rejected ? 0 : 1);
    expect(game.client.sendLoot).toHaveBeenCalledTimes(rejected ? 0 : 1);
});
