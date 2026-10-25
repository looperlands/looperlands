const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function setup(centered = false, {sceneBounded = false} = {}) {
    const modules = {};
    const element = () => ({style: {}, append() {}, setAttribute() {}, remove() {}});
    const sandbox = {
        _, Date, console: {debug() {}},
        document: {createElement: element, body: element(), addEventListener() {}, removeEventListener() {}},
        window: {matchMedia: () => ({matches: false})},
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name]));
        },
    };
    vm.createContext(sandbox);
    for (const name of ['lib/class', 'area', 'camera', 'tile', 'renderer', 'scriptedsequenceplayer', 'game']) {
        vm.runInContext(fs.readFileSync(require.resolve(`./${name}`), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    const scenes = sceneBounded ? [new modules.area(0, 0, 40, 30), new modules.area(70, 60, 50, 45)] : [];
    const map = {
        width: 140, height: 120, tilesize: 16, isLoaded: true,
        data: Array.from({length: 140 * 120}, () => [1, 2]),
        isLightTile: () => false,
        isHighTile: id => id === 1 || id === 3,
        isAnimatedTile: id => id === 2 || id === 3,
        isOutOfBounds(x, y) { return x < 0 || y < 0 || x >= this.width || y >= this.height; },
        GridPositionToTileIndex(x, y) { return y * this.width + x + 1; },
        getCurrentScene: entity => scenes.find(scene => scene.contains(entity)),
        forEachPosition(callback) { for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) callback(x, y); },
        tileIndexToGridPosition: index => ({x: index % 140, y: Math.floor(index / 140)}),
        getTileAnimationProps: () => ({length: 2}),
    };
    const renderer = Object.assign(Object.create(modules.renderer.prototype), {
        mobile: false, tilesize: 16, scale: 1, tileset: {width: 256, height: 256},
    });
    const camera = renderer.camera = new modules.camera(renderer);
    const game = Object.assign(Object.create(modules.game.prototype), {
        started: true, map, renderer, camera, tileStages: {},
        player: {x: 240, y: 112, gridX: 15, gridY: 7, getScene: () => scenes[0], stop() {}, disengage() {}},
        animatedTiles: [{id: 2, x: 15, y: 7}, {id: 2, x: 90, y: 80}],
        highAnimatedTiles: [{id: 3, x: 15, y: 7}, {id: 3, x: 90, y: 80}],
        canUseCenteredCamera: () => centered,
        updater: {update() {}}, updateCursorLogic() {},
        toolImpactFeedback: {render() {}}, gamepadListener: {update() {}},
    });
    game.entities = {};
    game.getEntityById = id => game.entities[id];
    if (sceneBounded) camera.setBoundingBox(0, 0, 40, 30);
    renderer.game = game;
    const frames = [];
    renderer.renderFrame = () => frames.push({
        ground: renderer.drawTerrain(), high: renderer.drawHighTiles(),
        animated: game.visibleAnimatedTiles, animatedHigh: game.visibleAnimatedHighTiles,
    });
    const sequence = game.scriptedSequence = new modules.scriptedsequenceplayer(game);
    sequence.packet({type: 'start', runId: 'one', name: 'Camera tour', cinematic: true});
    game.findVisibleTiles();
    game.tick();
    function frame(time) { jest.setSystemTime(time); game.tick(); return frames.at(-1); }
    function pan() {
        sequence.packet({type: 'step', runId: 'one', step: {type: 'camera', x: 90, y: 80, seconds: 2}});
    }
    return {game, camera, sequence, map, scenes, frame, pan};
}

function expectTerrainAt(frame, map, x, y) {
    const cellid = map.GridPositionToTileIndex(x, y) - 1;
    expect(frame.ground.tiles).toContainEqual(expect.objectContaining({cellid, tileid: 0}));
    expect(frame.high.tiles).toContainEqual(expect.objectContaining({cellid, tileid: 1}));
}

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(1000); });
afterEach(() => jest.useRealTimers());

test.each([false, true])('a cutscene pan refreshes terrain and animated tiles before rendering (centered=%s)', centered => {
    const h = setup(centered);
    const distantAnimation = h.game.animatedTiles[1];
    h.pan();
    for (const time of [1500, 2000, 3000]) {
        const frame = h.frame(time);
        expectTerrainAt(frame, h.map, h.camera.gridX + 15, h.camera.gridY + 7);
    }
    const frame = h.frame(3100);
    expectTerrainAt(frame, h.map, 90, 80);
    expect(frame.animated).toEqual([distantAnimation]);
    expect(frame.animatedHigh).toEqual([h.game.highAnimatedTiles[1]]);
    expect(h.game.animatedTiles[1]).toBe(distantAnimation);
});

test.each(['camera_reset', 'end', 'timeout', 'disconnect'])('%s restores the player terrain without requiring movement', reason => {
    const h = setup();
    h.pan();
    expectTerrainAt(h.frame(3000), h.map, 90, 80);
    if (reason === 'camera_reset') h.sequence.packet({type: 'step', runId: 'one', step: {type: reason}});
    else if (reason === 'end') h.sequence.packet({type: reason, runId: 'one'});
    else if (reason === 'disconnect') h.sequence.reset();
    const frame = h.frame(reason === 'timeout' ? 17001 : 3100);
    expect(h.sequence.cameraActive).toBe(false);
    expect([h.camera.x, h.camera.y]).toEqual([0, 0]);
    expectTerrainAt(frame, h.map, 15, 7);
    expect(frame.animated).toEqual([h.game.animatedTiles[0]]);
    expect(frame.animatedHigh).toEqual([h.game.highAnimatedTiles[0]]);
});

test('direct camera moves refresh cached terrain while sub-tile movement reuses it', () => {
    const h = setup();
    h.camera.setGridPosition(70, 65);
    const first = h.frame(1100);
    expectTerrainAt(first, h.map, 85, 72);
    h.camera.setPosition(h.camera.x + 0.5, h.camera.y + 0.5);
    const fractional = h.frame(1200);
    expect(fractional.ground.tiles).toBe(first.ground.tiles);
    expect(fractional.high.tiles).toBe(first.high.tiles);
    h.camera.setPosition(h.camera.x + 16, h.camera.y);
    const next = h.frame(1300);
    expect(next.ground.tiles).not.toBe(first.ground.tiles);
    expectTerrainAt(next, h.map, 86, 72);
});

test('resizing the camera refreshes newly visible tiles even without a position change', () => {
    const h = setup();
    h.camera.gridW = 60;
    const frame = h.frame(1100);
    expectTerrainAt(frame, h.map, 50, 7);
});

test('a cutscene reaches absolute map coordinates outside the player scene and renders the destination scene', () => {
    const h = setup(true, {sceneBounded: true});
    const playerScene = h.game.player.getScene(), bounds = h.camera.bounds;
    h.pan();
    const frame = h.frame(3000);
    expect([h.camera.x, h.camera.y]).toEqual([75 * 16, 73 * 16]);
    expectTerrainAt(frame, h.map, 90, 80);
    expect(frame.animated).toEqual([h.game.animatedTiles[1]]);
    expect(frame.animatedHigh).toEqual([h.game.highAnimatedTiles[1]]);
    expect(h.game.getViewScene()).toBe(h.scenes[1]);
    expect(h.game.player.getScene()).toBe(playerScene);
    expect(h.camera.bounds).toBe(bounds);
    h.sequence.packet({type: 'step', runId: 'one', step: {type: 'camera_reset'}});
    expectTerrainAt(h.frame(3100), h.map, 15, 7);
    expect([h.camera.x, h.camera.y]).toEqual([0, 0]);
    expect(h.game.getViewScene()).toBe(playerScene);
    h.camera.setGridPosition(70, 65);
    expect([h.camera.gridX, h.camera.gridY]).toEqual([10, 16]);
});

test('animations outside the player scene are available when a cutscene reveals them', () => {
    const h = setup(false, {sceneBounded: true});
    h.map.data[h.map.GridPositionToTileIndex(90, 80) - 1] = [1, 2, 3, 4];
    h.game.initAnimatedTiles();
    expect(h.game.animatedTiles).toHaveLength(1);
    expect(h.game.visibleAnimatedTiles).toHaveLength(0);
    h.pan();
    const frame = h.frame(3000);
    expect(frame.animated).toEqual(h.game.animatedTiles);
    expect(frame.animatedHigh).toEqual(h.game.highAnimatedTiles);
});

test('a cutscene renders received entities beyond the player scene without changing the player scene', () => {
    const h = setup(false, {sceneBounded: true}), npc = {id: 9};
    h.game.renderingGrid = [];
    h.game.renderingGrid[80] = [];
    h.game.renderingGrid[80][90] = {9: npc};
    h.pan(); h.frame(3000);
    const visible = [];
    h.game.forEachVisibleEntityByDepth(entity => visible.push(entity));
    expect(visible).toEqual([npc]);
});

test('Move NPC follows rendered actor positions across scenes and yields to the next camera step', () => {
    const h = setup(true, {sceneBounded: true});
    const npc = h.game.entities[9] = {x: 85 * 16, y: 70 * 16};
    h.sequence.packet({type: 'step', runId: 'one', step: {type: 'move', actorId: 9, actorX: 85, actorY: 70, x: 90, y: 80, seconds: 10}});
    h.frame(1100);
    expect([h.camera.x, h.camera.y]).toEqual([70 * 16, 63 * 16]);
    npc.x += 8; npc.y += 12;
    h.frame(1200);
    expect([h.camera.x, h.camera.y]).toEqual([70 * 16 + 8, 63 * 16 + 12]);
    h.sequence.packet({type: 'move_complete', runId: 'one', actorId: 9, x: 90, y: 80});
    h.frame(1300);
    expect([h.camera.x, h.camera.y]).toEqual([75 * 16, 73 * 16]);
    h.sequence.packet({type: 'step', runId: 'one', step: {type: 'camera', x: 40, y: 35, seconds: 0}});
    h.frame(1400);
    expect([h.camera.x, h.camera.y]).toEqual([25 * 16, 28 * 16]);
});

test('Move NPC can follow server positions while the actor is outside normal entity visibility', () => {
    const h = setup(false, {sceneBounded: true});
    h.sequence.packet({type: 'step', runId: 'one', step: {type: 'move', actorId: 9, actorX: 85, actorY: 70, x: 90, y: 80, seconds: 10}});
    h.frame(1100);
    expect([h.camera.x, h.camera.y]).toEqual([70 * 16, 63 * 16]);
    h.sequence.packet({type: 'actor_move', runId: 'one', actorId: 9, x: 86, y: 70, durationMs: 400});
    h.frame(1300);
    expect([h.camera.x, h.camera.y]).toEqual([70 * 16 + 8, 63 * 16]);
    h.frame(1500);
    expect([h.camera.x, h.camera.y]).toEqual([71 * 16, 63 * 16]);
    h.sequence.packet({type: 'end', runId: 'one'});
    h.frame(1600);
    expect([h.camera.x, h.camera.y]).toEqual([0, 0]);
});

test.each(['camera_reset', 'end', 'timeout', 'disconnect'])('%s releases the cutscene map bounds and restores scene clipping', reason => {
    const h = setup(false, {sceneBounded: true});
    h.pan(); h.frame(3000);
    if (reason === 'camera_reset') h.sequence.packet({type: 'step', runId: 'one', step: {type: reason}});
    else if (reason === 'end') h.sequence.packet({type: reason, runId: 'one'});
    else if (reason === 'disconnect') h.sequence.reset();
    const frame = h.frame(reason === 'timeout' ? 17001 : 3100);
    expect(h.camera.boundsOverride).toBeNull();
    expect(h.sequence.followActor).toBeNull();
    expectTerrainAt(frame, h.map, 15, 7);
    expect(h.game.getViewScene()).toBe(h.scenes[0]);
    h.camera.setGridPosition(75, 73);
    expect([h.camera.gridX, h.camera.gridY]).toEqual([10, 16]);
});

test('idle cutscene actors remain in the render grid throughout a long camera shot', () => {
    const h = setup(), actor = {id: 9, lastUpdate: 0}, stale = {id: 10, lastUpdate: 0};
    h.game.renderingGrid = Array.from({length: h.map.height}, () => []);
    h.game.renderingGrid[80][90] = {9: actor, 10: stale};
    h.sequence.actors.set(9, []);
    h.pan(); h.frame(8000);
    h.game.garbageCollectEntities();
    expect(h.game.renderingGrid[80][90][9]).toBe(actor);
    expect(h.game.renderingGrid[80][90][10]).toBeUndefined();
});
