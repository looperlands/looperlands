const fs = require('fs'), vm = require('vm');
const extension = require('./footstep-renderer-worker');
function setup() {
    let Feedback;
    const document = {hidden: false};
    vm.runInNewContext(fs.readFileSync(require.resolve('./footstepfeedback'), 'utf8'), {
        document, define: factory => { Feedback = factory(); },
    });
    const settings = {getReducedMotion: () => false, getCombatEffectsEnabled: () => true};
    const game = {started: true, mapId: 'main', sessionId: 'one', app: {settings},
        player: {x: 32, y: 48, isMoving: () => true, getScene: () => ({name: 'Beach'})},
        audioManager: {playFootstep: jest.fn()}};
    return {feedback: new Feedback(game), game, settings, document, Feedback};
}
test('walking emits by distance, while standing still emits nothing', () => {
    const {feedback, game} = setup();
    feedback.getFrame(1000);
    game.player.x += 6; feedback.getFrame(1050);
    expect(game.audioManager.playFootstep).not.toHaveBeenCalled();
    game.player.x += 6;
    expect(feedback.getFrame(1100)).toHaveLength(1);
    expect(game.audioManager.playFootstep).toHaveBeenCalledWith('sand');
    feedback.getFrame(1200);
    expect(game.audioManager.playFootstep).toHaveBeenCalledTimes(1);
    expect(feedback.getFrame(1750)).toHaveLength(0);
});
test.each(['teleport', 'tab gap', 'stop', 'map', 'session', 'hidden', 'death'])('%s does not replay footsteps', reason => {
    const {feedback, game, document} = setup();
    feedback.getFrame(1000);
    game.player.x += 12;
    if (reason === 'teleport') game.player.x += 200;
    if (reason === 'stop') game.player.isMoving = () => false;
    if (reason === 'map') game.mapId = 'other';
    if (reason === 'session') game.sessionId = 'two';
    if (reason === 'hidden') document.hidden = true;
    if (reason === 'death') game.player.isDead = true;
    expect(feedback.getFrame(reason === 'tab gap' ? 60000 : 1100)).toHaveLength(0);
    expect(game.audioManager.playFootstep).not.toHaveBeenCalled();
});
test.each(['reduced', 'disabled'])('%s suppresses marks while keeping walking audio', reason => {
    const {feedback, game, settings} = setup();
    if (reason === 'reduced') settings.getReducedMotion = () => true;
    else settings.getCombatEffectsEnabled = () => false;
    feedback.getFrame(1000); game.player.x += 12;
    expect(feedback.getFrame(1100)).toHaveLength(0);
    expect(game.audioManager.playFootstep).toHaveBeenCalledTimes(1);
});
test('region names select materials and marks follow camera/scale', () => {
    const {Feedback} = setup();
    expect(['Forest', 'Desert', 'Cave', 'Town'].map(Feedback.surfaceFor)).toEqual(['grass', 'sand', 'stone', 'ground']);
    const context = {fillRect: jest.fn()};
    extension.draw(context, [{x: 40, y: 62, surface: 'sand', progress: 0}], {cameraX: 16, cameraY: 32, scale: 3});
    expect(context.fillRect).toHaveBeenNthCalledWith(1, 63, 90, 6, 3);
});

test.each(['Town', 'Forest'])('%s marks remain visible after the original faint marks would have expired', scene => {
    const {feedback, game} = setup();
    game.player.getScene = () => ({name: scene});
    feedback.getFrame(1000);
    game.player.x += 12;
    feedback.getFrame(1100);
    expect(feedback.getFrame(1450)).toHaveLength(1);
    expect(feedback.getFrame(1480)).toHaveLength(0);
});
