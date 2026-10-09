const fs = require('fs'), vm = require('vm');
const extension = require('./tool-impact-renderer-worker');
function setup() {
    let Feedback;
    vm.runInNewContext(fs.readFileSync(require.resolve('./toolimpactfeedback'), 'utf8'), {
        define: factory => {Feedback = factory();},
    });
    const animation = {length: 5, currentFrame: {index: 0}};
    const actor = {id: 1, currentAnimation: animation, isMoving: () => false};
    const settings = {getReducedMotion: () => false, getCombatEffectsEnabled: () => true};
    const game = {started: true, mapId: 'main', sessionId: 'session', player: {}, app: {settings},
        getEntityById: id => actors.get(id)};
    const actors = new Map([[1, actor]]);
    const feedback = new Feedback(game, () => 0.5);
    const state = {tileX: 10, tileY: 20,
        impactFeedback: {impactFrame: 3, count: 8, colors: ['#895737'], lifetimeMs: 450, speed: 20, gravity: 80}};
    feedback.startAction(actor, state, animation);
    return {feedback, actor, animation, state, game, settings, actors};
}
test('one burst per contact frame, repeated each swing, anchored at the affected tile', () => {
    const {feedback, animation} = setup();
    expect(feedback.getFrame(0)).toHaveLength(0);
    animation.currentFrame.index = 3;
    const burst = feedback.getFrame(420);
    expect(burst).toHaveLength(8);
    expect(burst[0]).toMatchObject({x: 168, y: 332, color: '#895737', alpha: 1});
    expect(feedback.getFrame(450)).toHaveLength(8);
    expect(feedback.getFrame(870)).toHaveLength(0);
    animation.currentFrame.index = 0; feedback.getFrame(1000);
    animation.currentFrame.index = 3;
    expect(feedback.getFrame(1420)).toHaveLength(8);
});
test('particle motion uses elapsed seconds and fades without changing world coordinates', () => {
    const {feedback, animation} = setup();
    animation.currentFrame.index = 3; feedback.getFrame(1000);
    const p = feedback.getFrame(1200)[0];
    expect(p.x).toBe(168);
    expect(p.y).toBeCloseTo(332 - 20 * 0.2 + 40 * 0.2 * 0.2);
    expect(p.alpha).toBeCloseTo(1 - 200 / 450);
});
test.each(['disabled', 'reduced motion'])('%s suppresses particles without replaying an old contact', option => {
    const {feedback, animation, settings} = setup();
    if (option === 'disabled') settings.getCombatEffectsEnabled = () => false;
    else settings.getReducedMotion = () => true;
    animation.currentFrame.index = 3;
    expect(feedback.getFrame(420)).toHaveLength(0);
    settings.getCombatEffectsEnabled = () => true; settings.getReducedMotion = () => false;
    expect(feedback.getFrame(450)).toHaveLength(0);
});
test.each(['move', 'death', 'despawn', 'animation', 'map', 'session', 'stop', 'disconnect'])('%s clears old particles and emissions', reason => {
    const {feedback, animation, actor, game, actors} = setup();
    animation.currentFrame.index = 3; feedback.getFrame(420);
    if (reason === 'move') actor.isMoving = () => true;
    if (reason === 'death') actor.isDead = true;
    if (reason === 'despawn') actors.delete(1);
    if (reason === 'animation') actor.currentAnimation = {};
    if (reason === 'map') game.mapId = 'other';
    if (reason === 'session') game.sessionId = 'new';
    if (reason === 'stop') game.isStopped = true;
    if (reason === 'disconnect') game.started = false;
    expect(feedback.getFrame(450)).toHaveLength(0);
    expect(feedback.actions.size).toBe(0);
});
test('completion leaves the last burst to fade; interruption clears it immediately', () => {
    const {feedback, animation, actor} = setup();
    animation.currentFrame.index = 3; feedback.getFrame(420);
    feedback.stopAction(actor, false);
    expect(feedback.getFrame(450)).toHaveLength(8);
    feedback.stopAction(actor, true);
    expect(feedback.getFrame(460)).toHaveLength(0);
});
test('nearby actors share a bounded budget and configuration values are clamped', () => {
    const {feedback, actors, state} = setup();
    for (let id = 2; id < 80; id++) {
        const animation = {length: 5, currentFrame: {index: 3}};
        const actor = {id, currentAnimation: animation, isMoving: () => false};
        actors.set(id, actor);
        feedback.startAction(actor, {...state, impactFeedback: {...state.impactFeedback, count: 10000}}, animation);
    }
    expect(feedback.actions.size).toBe(64);
    expect(feedback.getFrame(420)).toHaveLength(192);
});
test('worker keeps particles aligned across camera scrolling and scales', () => {
    const context = {fillRect: jest.fn()};
    for (const view of [{cameraX: 160, cameraY: 320, scale: 2}, {cameraX: 144, cameraY: 304, scale: 3}]) {
        extension.draw(context, [{x: 168, y: 332, size: 2, color: '#895737', alpha: 0.5}], view);
        expect(context.fillRect).toHaveBeenLastCalledWith((168 - view.cameraX) * view.scale,
            (332 - view.cameraY) * view.scale, 2 * view.scale, 2 * view.scale);
        expect(context.fillStyle).toBe('#895737');
        expect(context.globalAlpha).toBe(0.5);
    }
});
