const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('arrow keys in focused chat history do not start player movement', () => {
    const history = { tagName: 'DIV', closest: selector => selector === '#global' ? history : null };
    const document = { activeElement: history, addEventListener: jest.fn() };
    const setInterval = jest.fn();
    const source = fs.readFileSync(path.join(__dirname, 'keyboardhandler.js'), 'utf8');
    const KeyboardHandler = vm.runInNewContext(`${source}\nKeyBoardHandler;`, {
        document,
        window: { addEventListener: jest.fn() },
        console: { log: jest.fn() },
        setInterval,
    });
    const handler = new KeyboardHandler({ player: { onPathContinuation: jest.fn() } }, { settings: { getRenderText: () => true } });
    handler.handleMovement = jest.fn();
    handler.handleKeyDown({ key: 'ArrowUp', code: 'ArrowUp' });

    expect(handler.keys.arrowup).toBe(0);
    expect(handler.handleMovement).not.toHaveBeenCalled();
    expect(setInterval).not.toHaveBeenCalled();
});

// Use the real character, transition and animation code to exercise tile boundaries.
function createMovementGame() {
    const document = { activeElement: null, addEventListener: jest.fn() };
    const panels = new Set();
    const context = vm.createContext({
        document,
        window: { addEventListener: jest.fn() },
        console: { log: jest.fn(), debug: jest.fn(), error: jest.fn() },
        setInterval: jest.fn(() => 1),
        clearInterval: jest.fn(),
        _: { indexOf: (values, value) => values.indexOf(value) },
        Types: {
            Orientations: { UP: 1, DOWN: 2, LEFT: 3, RIGHT: 4 },
            getOrientationAsString: orientation => ['up', 'down', 'left', 'right'][orientation - 1],
        },
        $: selector => ({ hasClass: () => panels.has(selector), filter: () => ({ length: 0 }) }),
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'lib/class.js'), 'utf8'), context);
    const modules = {};
    context.define = (dependencies, factory) => {
        if (typeof dependencies === 'function') {
            factory = dependencies;
            dependencies = [];
        }
        context.loaded = factory(...dependencies.map(name => modules[name]));
    };
    for (const name of ['entity', 'transition', 'timer', 'character', 'animation', 'updater']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, `${name}.js`), 'utf8'), context);
        modules[name] = context.loaded;
    }
    const player = new modules.character(1, 1);
    player.setGridPosition(2, 2);
    player.isLoaded = true;
    player.animations = {};
    for (const direction of ['up', 'down', 'left', 'right']) {
        for (const action of ['walk', 'idle']) {
            const name = `${action}_${direction}`;
            player.animations[name] = new modules.animation(name, 4, 0, 16, 16);
        }
    }
    player.idle();
    const requestPath = jest.fn((x, y) => Promise.resolve([[player.gridX, player.gridY], [x, y]]));
    const sendMove = jest.fn();
    const stopped = jest.fn();
    player.onRequestPath(requestPath);
    player.onStartPathing(sendMove);
    player.onStopPathing(stopped);
    const game = {
        player, started: true, keyboardMovement: false,
        currentTime: 1000, renderer: { FPS: 60 },
        finalPathingGrid: Array.from({ length: 20 }, () => Array(20).fill(0)),
        map: { isDoor: jest.fn(() => false), isColliding: jest.fn(() => false) },
        isItemAt: jest.fn(() => false), getItemAt: jest.fn(() => null), getEntityAt: jest.fn(() => null), canFish: jest.fn(() => false),
        forEachEntity: callback => callback(player),
        click: jest.fn(pos => {
            game.keyboardMovement = !!pos.keyboard;
            player.moveTo_(pos.x, pos.y);
        }),
    };
    const KeyboardHandler = vm.runInContext(`${fs.readFileSync(path.join(__dirname, 'keyboardhandler.js'), 'utf8')}\nKeyBoardHandler;`, context);
    const handler = new KeyboardHandler(game, { settings: { getRenderText: () => true } });
    const updater = new modules.updater(game);
    function frame() {
        game.currentTime += 16;
        updater.updateCharacter(player);
        updater.updateTransitions();
        updater.updateAnimations();
    }
    return { game, player, handler, document, panels, requestPath, sendMove, stopped, frame };
}

test.each(['d', 'ArrowRight'])('holding %s keeps walking and animating across tile boundaries', async key => {
    const { player, handler, requestPath, sendMove, stopped, frame } = createMovementGame();
    handler.handleKeyDown({ key, code: key });
    await Promise.resolve();
    const animation = player.currentAnimation;
    const frames = new Set();
    for (let i = 0; i < 40; i++) {
        frame();
        expect(player.currentAnimation).toBe(animation);
        expect(player.isMoving()).toBe(true);
        frames.add(animation.currentFrame.index);
    }
    expect(player.gridX).toBeGreaterThanOrEqual(6);
    expect(frames.size).toBe(4);
    expect(requestPath).toHaveBeenCalledTimes(1);
    expect(sendMove.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(stopped).not.toHaveBeenCalled();

    handler.handleKeyUp({ key });
    for (let i = 0; i < 10; i++) { frame(); }
    expect(player.isMoving()).toBe(false);
    expect(player.currentAnimation.name).toBe('idle_right');
    expect(stopped).toHaveBeenCalledTimes(1);
});

test('direction changes take effect at the next tile boundary', async () => {
    const { player, handler, frame } = createMovementGame();
    handler.handleKeyDown({ key: 'd', code: 'KeyD' });
    await Promise.resolve();
    frame();
    handler.handleKeyUp({ key: 'd' });
    handler.handleKeyDown({ key: 'w', code: 'KeyW' });
    for (let i = 0; i < 15; i++) { frame(); }
    expect(player.gridX).toBe(3);
    expect(player.currentAnimation.name).toBe('walk_up');
    expect(player.nextGridY).toBe(1);
});

test.each([
    ['key release', state => state.handler.handleKeyUp({ key: 'd' })],
    ['window blur', state => state.handler.handleBlur()],
    ['opposing keys', state => { state.handler.keys.a = 1; }],
    ['chat focus', state => { state.document.activeElement = { tagName: 'INPUT' }; }],
    ['inventory', state => state.panels.add('body')],
    ['dialogue', state => state.panels.add('#dialogue-popup')],
    ['rooting', state => { state.player.isRooted = true; }],
    ['interruption', state => state.player.stop()],
    ['combat target', state => { state.player.target = {}; }],
    ['blocked next tile', state => { state.game.finalPathingGrid[2][4] = 1; }],
    ['map boundary', state => { state.game.finalPathingGrid[2].length = 4; }],
    ['map collision', state => state.game.map.isColliding.mockReturnValue(true)],
    ['entity on next tile', state => state.game.getEntityAt.mockReturnValue({ id: 2 })],
    ['door', state => state.game.map.isDoor.mockReturnValue(true)],
    ['fishing', state => state.game.canFish.mockReturnValue({ gridX: 4, gridY: 2 })],
    ['mouse navigation', state => { state.game.keyboardMovement = false; }],
])('%s ends keyboard continuation at the tile boundary', async (name, change) => {
    const state = createMovementGame();
    state.handler.handleKeyDown({ key: 'd', code: 'KeyD' });
    await Promise.resolve();
    state.frame();
    change(state);
    for (let i = 0; i < 20; i++) { state.frame(); }
    expect(state.player.gridX).toBe(3);
    expect(state.player.isMoving()).toBe(false);
    expect(state.stopped).toHaveBeenCalledTimes(1);
});

test('diagonal continuation moves directly in open space and avoids blocked corners', () => {
    const { game, handler } = createMovementGame();
    game.keyboardMovement = true;
    handler.keys.d = handler.keys.s = 1;
    expect(handler.getContinuationPath()).toEqual([[2, 2], [3, 3]]);
    game.finalPathingGrid[2][3] = 1;
    expect(handler.getContinuationPath()).toEqual([[2, 2], [2, 3], [3, 3]]);
    game.finalPathingGrid[3][2] = 1;
    expect(handler.getContinuationPath()).toBeNull();
});

test('WASD and arrow keys together still move one tile per axis', () => {
    const { game, handler } = createMovementGame();
    handler.keys.d = handler.keys.arrowright = 1;
    handler.handleMovement();
    expect(game.click).toHaveBeenCalledWith({ x: 3, y: 2, keyboard: true });
});

test('mouse paths retain normal multi-tile movement and stop at their destination', () => {
    const { player, handler, frame, stopped } = createMovementGame();
    handler.keys.d = 1;
    player.followPath([[2, 2], [3, 2], [4, 2], [5, 2]]);
    for (let i = 0; i < 30; i++) { frame(); }
    expect(player.gridX).toBe(5);
    expect(player.isMoving()).toBe(false);
    expect(stopped).toHaveBeenCalledTimes(1);
});

test.each([{keys: ['d']}, {keys: ['d', 's']}])('held movement with $keys uses the real pathfinder without worker requests', async ({keys}) => {
    const {game, player, handler, requestPath, sendMove, stopped, frame} = createMovementGame();
    const postMessage = jest.fn();
    class Worker {
        postMessage(data) { postMessage(data); }
    }
    const Pathfinder = vm.runInNewContext(`${fs.readFileSync(path.join(__dirname, 'pathfinder.js'), 'utf8')}\nPathfinder;`, {Worker});
    const pathfinder = new Pathfinder(20, 20);
    requestPath.mockImplementation((x, y) => {
        pathfinder.ignoreEntity(player);
        return pathfinder.findPath(game.finalPathingGrid, player, x, y);
    });
    keys.forEach(key => { handler.keys[key] = 1; });
    handler.handleMovement();
    await Promise.resolve();
    for (let i = 0; i < 40; i++) {
        frame();
        expect(player.isMoving()).toBe(true);
        expect(player.currentAnimation.name).toMatch(/^walk_/);
    }
    expect(player.gridX).toBeGreaterThan(2);
    if (keys.includes('s')) expect(player.gridY).toBeGreaterThan(2);
    expect(requestPath).toHaveBeenCalledTimes(1);
    expect(postMessage).not.toHaveBeenCalled();
    expect(sendMove.mock.calls.length).toBeGreaterThan(1);
    expect(stopped).not.toHaveBeenCalled();
    keys.forEach(key => handler.handleKeyUp({key}));
    for (let i = 0; i < 20; i++) frame();
    expect(player.isMoving()).toBe(false);
});


test('dialogue captures Enter and arrows before chat or movement, while typing retains input', () => {
    const {game, handler, document, panels} = createMovementGame();
    handler.app.handleChoiceKeyboardInput = jest.fn(); panels.add('#dialogue-popup');
    const event = key => ({key, preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()});
    const enter = event('Enter'); handler.handleConversationKey(enter);
    expect(handler.app.handleChoiceKeyboardInput).toHaveBeenCalledWith(enter);
    expect(enter.stopImmediatePropagation).toHaveBeenCalled();
    const down = event('ArrowDown'); handler.handleConversationKey(down);
    expect(down.preventDefault).toHaveBeenCalled(); expect(game.click).not.toHaveBeenCalled();
    handler.handleConversationKey({...event('Enter'), repeat: true});
    expect(handler.app.handleChoiceKeyboardInput).toHaveBeenCalledTimes(2);
    document.activeElement = {tagName: 'TEXTAREA'}; handler.handleConversationKey(event('Enter'));
    document.activeElement = {tagName: 'DIV', isContentEditable: true}; handler.handleConversationKey(event('Enter'));
    expect(handler.app.handleChoiceKeyboardInput).toHaveBeenCalledTimes(2);
    document.activeElement = null; panels.clear(); handler.handleConversationKey(event('Enter'));
    expect(handler.app.handleChoiceKeyboardInput).toHaveBeenCalledTimes(2);
});


test('touch drag continues across tiles without restarting the path and stops after release', async () => {
    const {game, player, handler, requestPath, stopped, frame} = createMovementGame();
    game.touchListener = {direction: {dx: 1, dy: 0}};
    handler.handleMovement();
    await Promise.resolve();
    for (let i = 0; i < 40; i++) {
        handler.handleMovement();
        frame();
        expect(player.isMoving()).toBe(true);
        expect(player.currentAnimation.name).toBe('walk_right');
    }
    expect(player.gridX).toBeGreaterThanOrEqual(6);
    expect(requestPath).toHaveBeenCalledTimes(1);
    game.touchListener.direction = {dx: 0, dy: 0};
    for (let i = 0; i < 10; i++) frame();
    expect(player.isMoving()).toBe(false);
    expect(stopped).toHaveBeenCalledTimes(1);
});


test('held diagonal movement keeps its walk animation across tile boundaries', () => {
    const {game, player, handler, frame} = createMovementGame();
    game.keyboardMovement = true;
    handler.keys.d = handler.keys.s = 1;
    player.followPath([[2, 2], [3, 3]]);
    const animation = player.currentAnimation;
    const reset = jest.spyOn(animation, 'reset');
    const frames = new Set();
    for (let i = 0; i < 60; i++) {
        frame();
        expect(player.x - 32).toBe(player.y - 32);
        expect(player.currentAnimation).toBe(animation);
        frames.add(animation.currentFrame.index);
    }
    expect(player.gridX).toBeGreaterThan(5);
    expect(reset).not.toHaveBeenCalled();
    expect(frames.size).toBe(4);
});

test.each([60, 100, 150])('a level 100 key press lasting %i ms moves exactly one tile', async pressTime => {
    const {player, handler, frame, sendMove, stopped} = createMovementGame();
    player.moveSpeed = 87;
    handler.handleKeyDown({key: 'd', code: 'KeyD'});
    await Promise.resolve();
    for (let time = 0; time < pressTime; time += 16) frame();
    handler.handleKeyUp({key: 'd'});
    for (let i = 0; i < 30; i++) frame();
    expect(player.gridX).toBe(3);
    expect(player.x).toBe(48);
    expect(player.isMoving()).toBe(false);
    expect(sendMove).toHaveBeenCalledTimes(1);
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(player.manualMovementTime).toBeUndefined();
});

test('separate taps reset acceleration after stopping', async () => {
    const {player, handler, frame} = createMovementGame();
    player.moveSpeed = 87;
    for (let tap = 0; tap < 2; tap++) {
        handler.handleKeyDown({key: 'd', code: 'KeyD'});
        await Promise.resolve();
        for (let i = 0; i < 7; i++) frame();
        handler.handleKeyUp({key: 'd'});
        for (let i = 0; i < 20; i++) frame();
        expect(player.gridX).toBe(3 + tap);
    }
});

function addGroundLoot(state, mode = 'normal') {
    const items = new Map([3, 4, 5, 6].map(x => [x, {
        id: x, kind: 1, type: mode === 'nft-weapon' ? 'weapon' : 'object',
        unlootable: mode === 'unlootable', getLootMessage: () => 'Picked up',
    }]));
    class LootException extends Error {}
    let definition;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), {
        Class: { extend: methods => methods },
        define: (dependencies, factory) => {
            definition = factory(...dependencies.map(name => name === 'exceptions' ? { LootException } : {}));
        },
        Types: { Entities: { LOOPRING: 99 }, isHealingItem: () => false },
        console: { log: jest.fn() },
    });
    const { game, player } = state;
    game.getItemAt.mockImplementation((x, y) => y === 2 ? items.get(x) || null : null);
    game.isItemAt.mockImplementation((x, y) => !!game.getItemAt(x, y));
    game.getEntityAt.mockImplementation((x, y) => game.getItemAt(x, y));
    game.client = { sendLoot: jest.fn() };
    game.removeItem = jest.fn(item => items.delete(item.id));
    game.showNotification = jest.fn();
    game.audioManager = { playSound: jest.fn() };
    game.lootItemAt = definition.lootItemAt;
    player.getWeaponName = () => 'NFT_test';
    player.loot = jest.fn(() => {
        if (mode === 'rejected') throw new LootException('Inventory full');
    });
    player.onStep(() => { if (game.keyboardMovement) game.lootItemAt(player.gridX, player.gridY); });
    return items;
}

test.each(['normal', 'unlootable', 'nft-weapon', 'rejected'])(
    'held movement keeps the same pace across %s items', async mode => {
        const empty = createMovementGame();
        const loot = createMovementGame();
        empty.player.moveSpeed = loot.player.moveSpeed = 87;
        addGroundLoot(loot, mode);
        for (const state of [empty, loot]) {
            state.handler.handleKeyDown({ key: 'd', code: 'KeyD' });
            await Promise.resolve();
        }
        for (let i = 0; i < 40; i++) {
            empty.frame(); loot.frame();
            expect(loot.player.x).toBe(empty.player.x);
            expect(loot.player.manualMovementTime).toBe(empty.player.manualMovementTime);
            expect(loot.player.isMoving()).toBe(true);
        }
        expect(loot.stopped).not.toHaveBeenCalled();
        expect(loot.requestPath).toHaveBeenCalledTimes(1);
        expect(loot.game.client.sendLoot).toHaveBeenCalledTimes(mode === 'normal' ? 4 : 0);
        expect(loot.game.removeItem).toHaveBeenCalledTimes(mode === 'normal' ? 4 : 0);
        if (mode === 'rejected') expect(loot.game.showNotification).toHaveBeenCalledWith('Inventory full');
        loot.handler.handleKeyUp({ key: 'd' });
        const destination = loot.player.path[loot.player.step][0];
        for (let i = 0; i < 10; i++) loot.frame();
        expect(loot.player.gridX).toBe(destination);
        expect(loot.player.isMoving()).toBe(false);
    }
);

test('an entity sharing an item tile still blocks keyboard continuation', () => {
    const state = createMovementGame();
    addGroundLoot(state);
    state.game.keyboardMovement = true;
    state.handler.keys.d = 1;
    state.game.getEntityAt.mockReturnValue({ id: 'mob' });
    expect(state.handler.getContinuationPath()).toBeNull();
});
