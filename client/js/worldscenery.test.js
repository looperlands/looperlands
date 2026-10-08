const fs = require('fs'), path = require('path'), vm = require('vm');
function setup() {
    const fetch = jest.fn(); let scenery;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'worldscenery.js'), 'utf8'), {fetch, define: factory => {scenery = factory();}});
    const renderer = {registerExtension: jest.fn(), setExtensionData: jest.fn()};
    const game = {sessionId: 'one', started: true, player: {gridX: 53, gridY: 285}, showNotification: jest.fn(),
        destroyBubble: jest.fn(), showNewQuestPopup: jest.fn(), showTileActionBubble: jest.fn()};
    const packet = {storyScenery: [{kind: 'marker', id: 'LANTERN_WRECK_LETTERS:letters', label: 'Recover the invitation pouch', x: 53, y: 285},
        {kind: 'passage', id: 'old-mill', label: 'Enter the old windmill', x: 39, y: 243},
        {kind: 'lantern', x: 57, y: 260}]};
    scenery.update(renderer, packet);
    return {scenery, renderer, game, fetch, packet};
}

test('ground markers and passages use normal world interaction coordinates and clear on disconnect', () => {
    const {scenery, renderer} = setup();
    scenery.attach(renderer);
    expect(renderer.registerExtension).toHaveBeenCalledWith('lantern-road-renderer-worker.js');
    expect(scenery.nearestAction(53, 285)).toMatchObject({gridX: 53, gridY: 285, x: 848, y: 4560, storyType: 'inspect'});
    expect(scenery.nearestAction(39, 243).storyType).toBe('travel');
    expect(scenery.nearestAction(57, 260)).toBeUndefined();
    expect(scenery.nearestAction(55, 285)).toBeUndefined();
    scenery.update(renderer, null);
    expect(scenery.actionAt(53, 285)).toBeUndefined();
    expect(renderer.setExtensionData).toHaveBeenCalledWith('lantern-road', null);
});

test('clicks and E share a single authenticated inspection request and display its discovery once', async () => {
    const {scenery, game, fetch} = setup(); const action = scenery.actionAt(53, 285);
    let resolve; fetch.mockReturnValue(new Promise(done => {resolve = done;}));
    const first = scenery.execute(game, action), duplicate = scenery.execute(game, action);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/session/one/story/inspect/LANTERN_WRECK_LETTERS%3Aletters', {method: 'POST'});
    resolve({ok: true, json: async () => ({text: 'The letters never arrived.'})});
    await Promise.all([first, duplicate]);
    expect(game.showNewQuestPopup).toHaveBeenCalledWith({heading: 'Discovery', name: action.label, startText: 'The letters never arrived.'});
    expect(scenery.actionAt(53, 285)).toBeUndefined();
});

test('failed saves remain retryable, remote clicks do nothing, and travel does not pretend to complete a quest', async () => {
    const {scenery, game, fetch} = setup(); const action = scenery.actionAt(53, 285);
    game.player.gridX = 56; await scenery.execute(game, action); expect(fetch).not.toHaveBeenCalled();
    game.player.gridX = 53;
    fetch.mockResolvedValueOnce({ok: false, json: async () => ({error: 'Could not save this discovery.'})});
    await scenery.execute(game, action);
    expect(game.showNotification).toHaveBeenCalledWith('Could not save this discovery.');
    expect(scenery.actionAt(53, 285)).toBe(action);
    game.player.gridX = 39; game.player.gridY = 243;
    fetch.mockResolvedValueOnce({ok: true, json: async () => ({text: 'Entered the old windmill.'})});
    await scenery.execute(game, scenery.actionAt(39, 243));
    expect(fetch.mock.calls[1][0]).toBe('/session/one/story/travel/old-mill');
    expect(game.showNewQuestPopup).not.toHaveBeenCalled();
});
