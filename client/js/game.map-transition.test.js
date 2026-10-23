const fs = require('fs'), vm = require('vm'), _ = require('underscore');

beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.clearAllTimers(); jest.useRealTimers();});

function setup() {
    const modules = {}, workers = [], elements = new Map();
    function $(selector) {
        if (!elements.has(selector)) {
            const element = {classes: new Set(), focused: false};
            for (const name of ['removeAttr', 'off', 'hide', 'attr', 'prop']) element[name] = () => element;
            element.removeClass = name => {element.classes.delete(name); return element;};
            element.hasClass = name => element.classes.has(name);
            element.blur = () => {element.focused = false; return element;};
            elements.set(selector, element);
        }
        return elements.get(selector);
    }
    class Worker {
        constructor() {this.postMessage = jest.fn(); this.terminate = jest.fn(); workers.push(this);}
    }
    const http = {get: jest.fn().mockResolvedValue({data: []})};
    const sandbox = {_, $, Worker, axios: http, document: {getElementById: id => $('#' + id)}, console: {log() {}, debug() {}, error: jest.fn()},
        setTimeout, clearTimeout, setInterval, clearInterval,
        AltNames: {getAltNameFromKind() {}, getName() {}},
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => name === 'jquery' ? $ : modules[name] || function () {}));
        },
    };
    vm.createContext(sandbox);
    for (const name of ['./lib/class', '../../shared/js/gametypes']) {
        vm.runInContext(fs.readFileSync(require.resolve(name), 'utf8'), sandbox);
    }
    for (const name of ['entity', 'transition', 'timer', 'animation', 'character', 'player', 'warrior',
        'mob', 'item', 'projectile', 'area', 'audio', 'storage', 'bubble', 'tileactions', 'worldambience', 'worldscenery', 'renderer', 'app', 'game']) {
        vm.runInContext(fs.readFileSync(require.resolve('./' + name), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    const Pathfinder = vm.runInContext(fs.readFileSync(require.resolve('./pathfinder'), 'utf8') + '\nPathfinder;', sandbox);
    const Keyboard = vm.runInContext(fs.readFileSync(require.resolve('./keyboardhandler'), 'utf8') + '\nKeyBoardHandler;', sandbox);
    const storage = new modules.storage('source-session');
    storage.data = {mapId: 'source', hasAlreadyPlayed: true, player: {name: 'Looper', armor: 'clotharmor', weapon: 'sword1'}};
    const app = Object.assign(Object.create(modules.app.prototype), {storage, sessionId: storage.sessionId,
        settings: {getRenderText: () => true}, socialChat: {close: jest.fn()},
        closeChoicesPopup: jest.fn(), hideWindows: jest.fn(), hideFishing: jest.fn(),
        fieldGuide: {close: jest.fn()}, eventBoard: {close: jest.fn()}, refreshConsumableHud: jest.fn(),
        initAchievementList: jest.fn(), initUnlockedAchievements: jest.fn(), showPlayerClassSelection: jest.fn(),
    });
    const renderer = Object.assign(Object.create(modules.renderer.prototype), {
        upscaledRendering: true, mobile: false, tablet: false, scale: 2,
        worker: {postMessage: jest.fn()}, syncedLights: true, redrawTerrain: false,
        staticTileData: {source: true}, extensionData: {},
    });
    renderer.setTileset = jest.fn();
    const audio = Object.assign(Object.create(modules.audio.prototype), {
        areas: [], updateMusic: jest.fn(), playStreamMusic: jest.fn(), destroy: jest.fn(),
    });
    const sprite = name => ({name, animationData: {}, createAnimations: () => Object.fromEntries(
        ['idle_down', 'idle_up', 'idle_right', 'walk_down', 'walk_up', 'walk_right', 'atk_down', 'fly', 'impact']
            .map(name => [name, new modules.animation(name, 2, 0, 16, 16)]))});
    const sprites = {clotharmor: sprite('clotharmor'), rat: sprite('rat'), shortarrow: sprite('shortarrow'),
        sword1: {projectiles: {short: 'shortarrow'}}};
    const effect = () => ({clear: jest.fn(), startAction: jest.fn(), stopAction: jest.fn()});
    const game = Object.assign(Object.create(modules.game.prototype), {
        app, storage, sessionId: storage.sessionId, mapId: 'source', username: 'Looper',
        started: true, isStopped: false, playerPositionReady: true, currentTime: 100,
        renderer, audioManager: audio, sprites, spritesets: [sprites], cursors: {hand: {}},
        camera: {isVisible: () => false}, entities: {}, floats: {}, deathpositions: {},
        pendingEntityTargets: new Map(), pendingEntityAttackers: new Map(),
        zoningQueue: [], currentZoning: null, toggledLayers: {}, tileStages: {}, tileStageRevisions: {},
        tileActionStageRequestId: 0, worldAmbience: new modules.worldambience(),
        combatFeedback: effect(), toolImpactFeedback: effect(), worldFx: effect(), combatPrototype: effect(),
        infoManager: effect(), footstepFeedback: effect(), pickupFeedback: effect(),
        conversationHold: {start: jest.fn(), stop: jest.fn()}, arcadeSession: {close: jest.fn()},
        client: {disable: jest.fn(), dispose: jest.fn()}, bubbleManager: new modules.bubble('#bubbles'),
    });
    app.game = game;
    sandbox.self = game;
    const map = (mapId, width, height) => ({mapId, width, height, hiddenLayers: {},
        grid: Array.from({length: height}, () => Array(width).fill(0)),
        tilesets: [{src: mapId + '.png'}], musicAreas: [],
        isOutOfBounds: (x, y) => x < 0 || y < 0 || x >= width || y >= height,
        isDoor: () => false, isColliding(x, y) {return this.isOutOfBounds(x, y) || this.grid[y][x] === 1;},
        getLakeName: () => 'pond', getCurrentTrigger: () => null,
        stopStreamCheck: jest.fn(), _initStreamCheck: jest.fn(), ready: callback => callback(),
    });
    game.map = map('source', 4, 4);
    for (const name of ['initEntityGrid', 'initItemGrid', 'initPathingGrid', 'initRenderingGrid']) game[name]();
    const actor = (id, mob = false) => {
        const actor = mob ? new modules.mob(id, sandbox.Types.Entities.RAT) : new modules.warrior(id, 'Looper');
        actor.setSprite(sprites[mob ? 'rat' : 'clotharmor']);
        actor.setGridPosition(1, 1);
        actor.idle();
        game.addEntity(actor);
        return actor;
    };
    game.player = actor(42);
    game.playerId = 42;
    game.pathfinder = new Pathfinder(4, 4);
    game.tileActions = new modules.tileactions(game);
    game.keyboardHandler = Object.assign(Object.create(Keyboard.prototype), {
        keys: {w: 1, a: 0, s: 0, d: 0, arrowup: 0, arrowleft: 0, arrowdown: 0, arrowright: 0}, game, app, interval: false,
    });
    game.touchListener = {direction: {dx: 1, dy: 0}, reset: jest.fn(function () {this.direction = {dx: 0, dy: 0};})};
    const destination = () => {
        const nextStorage = new modules.storage('destination-session');
        nextStorage.data = {mapId: 'destination', hasAlreadyPlayed: true,
            player: {name: 'Arriving Looper', armor: 'clotharmor', weapon: 'sword2'}};
        const nextMap = map('destination', 3, 2);
        nextMap.grid[0][2] = 1;
        nextMap.musicAreas = [{x: 0, y: 0, w: 3, h: 2, id: 'forest'}];
        return {map: nextMap, storage: nextStorage};
    };
    return {game, app, modules, actor, workers, renderer, audio, sprites, http, $, destination, sandbox};
}

test('pausing portal travel stops movement, held input and map timers before closing focused chat', () => {
    const {game, app, $} = setup();
    const scene = jest.fn(), fish = jest.fn(), keyboard = jest.fn();
    game.scenePollingInterval = setInterval(scene, 100);
    game.uniFishTimeout = setTimeout(fish, 100);
    game.slidingFish = setInterval(fish, 10);
    game.keyboardHandler.interval = setInterval(keyboard, 25);
    game.player.path = [[1, 1], [2, 1]];
    game.player.movement.start(0, jest.fn(), jest.fn(), 16, 32, 120);
    $('#chatbox').classes.add('active');
    $('#chatinput').focused = true;

    game.pauseForMapTransition();
    jest.advanceTimersByTime(1000);

    expect(game.started).toBe(false);
    expect(game.isStopped).toBe(true);
    expect(game.client.disable).toHaveBeenCalledTimes(1);
    expect(game.playerPositionReady).toBe(false);
    expect(game.player.isMoving()).toBe(false);
    expect(game.player.movement.inProgress).toBe(false);
    expect(game.keyboardHandler.keys.w).toBe(0);
    expect(game.touchListener.direction).toEqual({dx: 0, dy: 0});
    expect(scene).not.toHaveBeenCalled();
    expect(fish).not.toHaveBeenCalled();
    expect(keyboard).not.toHaveBeenCalled();
    expect($('#chatbox').classes.has('active')).toBe(false);
    expect($('#chatinput').focused).toBe(false);
    expect(app.socialChat.close).toHaveBeenCalledTimes(1);
});

test('switching maps cancels old entity work and retains loaded rendering and audio assets', async () => {
    const {game, actor, workers, renderer, audio, sprites, destination} = setup();
    const oldPlayer = game.player, mob = actor(7, true), oldPathfinder = game.pathfinder, oldActions = game.tileActions;
    const leaked = jest.fn();
    oldPlayer.blink(20);
    mob.blink(20);
    mob.hurting = setTimeout(leaked, 100);
    mob.exitingCombat = setTimeout(leaked, 100);
    game.playerDeathTimer = setTimeout(leaked, 100);
    game.reviveTimer = setTimeout(leaked, 100);
    game.buffTickInterval = setInterval(leaked, 100);
    game.floats[42] = {despawnTimeout: setTimeout(leaked, 100)};
    oldPlayer.onRequestPath((x, y) => oldPathfinder.findPath(game.pathingGrid, oldPlayer, x, y));
    oldPlayer.moveTo_(3, 3);
    const oldWorker = workers[0], lateReply = oldWorker.onmessage;
    const requestId = oldWorker.postMessage.mock.calls[0][0].requestId;
    const toolAction = oldActions.showActionAnimation({entityId: 7, duration: 1000, orientation: 2});
    game.pauseForMapTransition();
    const next = destination();
    game.resetForMapTransition(next.map, next.storage);
    lateReply({data: {requestId, path: [[1, 1], [3, 3]]}});
    await Promise.resolve();
    jest.advanceTimersByTime(1100);

    expect(await toolAction).toBe(false);
    expect(leaked).not.toHaveBeenCalled();
    expect(oldPlayer.path).toBeNull();
    expect(mob.visible).toBe(true);
    expect(oldPlayer.visible).toBe(true);
    expect(oldPathfinder.destroyed).toBe(true);
    expect(workers.slice(0, 2).every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
    expect(oldActions.isDisposed).toBe(true);
    expect(game.player).not.toBe(oldPlayer);
    expect(game.tileActions).not.toBe(oldActions);
    expect(game.player.getSpriteName()).toBe('clotharmor');
    expect(game.player.getWeaponName()).toBe('sword2');
    expect(game.player.scene).toBeNull();
    expect(game.player.isDead).toBe(false);
    expect(game.player.target).toBeNull();
    expect(game.renderer).toBe(renderer);
    expect(game.audioManager).toBe(audio);
    expect(game.sprites).toBe(sprites);
    expect(game.player.sprite).toBe(sprites.clotharmor);
    expect(audio.destroy).not.toHaveBeenCalled();
    expect(game.entities).toEqual({});
    expect(game.floats).toEqual({});
    expect(jest.getTimerCount()).toBe(0);
});

test('arrival rebuilds destination collisions and discards source tiles, scenery and session identity', () => {
    const {game, app, modules, renderer, destination, $} = setup();
    $('body').classes.add('death');
    const sourceGrid = game.entityGrid, sourcePathing = game.pathingGrid;
    game.toggledLayers = {bridge: true};
    game.tileStages = {'1.1': {tile: 9}};
    game.tileStageRevisions = {'1.1': 45};
    game.tileActions.cacheStage({gridX: 1, gridY: 1}, {name: 'Source plot'});
    game.pendingEntityTargets.set(7, 42);
    game.pendingEntityAttackers.set(42, new Set([7]));
    game.currentZoning = {inProgress: true};
    game.zoningQueue = [{source: true}];
    game.worldAmbience.config = {particles: 'snow', particleCount: 30};
    game.previewTimeMode = 'midnight';
    modules.worldscenery.update(renderer, {rendererExtensions: [{id: 'source-scenery', script: 'source-worker.js', data: {}}]}, game);
    renderer.staticTileData = {source: true};
    game.hoveringMinigamePrompt = game.minigameLoaded = true;
    const next = destination();
    game.pauseForMapTransition();
    game.resetForMapTransition(next.map, next.storage);

    expect(game.storage).toBe(next.storage);
    expect(app.storage).toBe(next.storage);
    expect(game.sessionId).toBe('destination-session');
    expect(app.sessionId).toBe('destination-session');
    expect(app.storage.sessionId).toBe('destination-session');
    expect(game.mapId).toBe('destination');
    expect($('body').classes.has('death')).toBe(false);
    expect(game.map).toBe(next.map);
    expect(game.entityGrid).not.toBe(sourceGrid);
    expect(game.pathingGrid).not.toBe(sourcePathing);
    expect(game.pathingGrid).toEqual([[0, 0, 1], [0, 0, 0]]);
    expect(game.entityGrid).toHaveLength(2);
    expect(game.entityGrid.every(row => row.length === 3 && row.every(cell => Object.keys(cell).length === 0))).toBe(true);
    game.entityGrid[0][0].one = true;
    expect(game.entityGrid[0][1]).toEqual({});
    expect(game.itemGrid[0][0]).toEqual({});
    expect(game.renderingGrid[0][0]).toEqual({});
    expect(game.toggledLayers).toEqual({});
    expect(game.tileStages).toEqual({});
    expect(game.tileStageRevisions).toEqual({});
    expect(game.tileActions.getImmediateStage({gridX: 1, gridY: 1, name: 'door'}).name).toBe('Use');
    expect(game.pendingEntityTargets.size).toBe(0);
    expect(game.pendingEntityAttackers.size).toBe(0);
    expect(game.zoningQueue).toEqual([]);
    expect(game.currentZoning).toBeNull();
    expect(game.worldAmbience.getRenderState()).toBeNull();
    expect(game.previewTimeMode).toBeUndefined();
    expect(renderer.extensionData['source-scenery']).toBeUndefined();
    expect(renderer.syncedLights).toBe(false);
    expect(renderer.staticTileData).toBeNull();
    expect(renderer.redrawTerrain).toBe(true);
    expect(game.audioManager.areas.map(area => area.musicName)).toEqual(['forest']);
    expect(game.hoveringMinigamePrompt).toBe(false);
    expect(game.minigameLoaded).toBe(false);
});

test('a source-map polling response cannot overwrite destination avatar health or equipment', async () => {
    const {game, app, http, destination} = setup();
    let respond;
    http.get.mockImplementationOnce(() => new Promise(resolve => {respond = resolve;}));
    game.getServerInfo();
    expect(http.get).toHaveBeenCalledWith('/session/source-session/polling');
    const next = destination();
    game.pauseForMapTransition();
    game.resetForMapTransition(next.map, next.storage);
    game.player.id = 42;
    game.player.setMaxHitPoints(100);
    game.player.switchArmor = jest.fn();
    game.addEntity(game.player);
    respond({data: {playerInfo: {playerClass: null, level: 8, powerUpActive: false, armor: 'rat'},
        characterInfo: {42: {hitPoints: 1, maxHitPoints: 1}}}});
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(game.player.hitPoints).toBe(100);
    expect(game.player.maxHitPoints).toBe(100);
    expect(game.player.switchArmor).not.toHaveBeenCalled();
    expect(app.showPlayerClassSelection).not.toHaveBeenCalled();
});

test('the retained keyboard handler continues held movement on the new player', () => {
    const {game, destination} = setup();
    const keyboard = game.keyboardHandler, next = destination();
    game.pauseForMapTransition();
    game.resetForMapTransition(next.map, next.storage);
    game.started = true;
    game.keyboardMovement = true;
    keyboard.movementIsBlocked = () => false;
    keyboard.keys.d = 1;
    game.player.setGridPosition(0, 1);
    game.player.followPath([[0, 1], [1, 1]]);
    game.player.step = 1;
    game.player.nextStep();
    expect(game.keyboardHandler).toBe(keyboard);
    expect(game.player.isMoving()).toBe(true);
    expect(game.player.path).toEqual([[1, 1], [2, 1]]);
    expect(game.player.nextGridX).toBe(2);
});

test('a delayed projectile cleanup from the source cannot access destination coordinates or remove a reused id', () => {
    const {game, actor, modules, destination, sandbox} = setup();
    game.unregisterEntityPosition(game.player);
    game.player.setGridPosition(3, 3);
    game.registerEntityPosition(game.player);
    actor(7, true);
    let spawn;
    game.client.onSpawnProjectile = callback => {spawn = callback;};
    const source = fs.readFileSync(require.resolve('./game'), 'utf8');
    const start = source.indexOf('                    function cleanProjectile(');
    const end = source.indexOf('                    self.client.onOutOfAmmo(', start);
    vm.runInContext(source.slice(start, end), Object.assign(sandbox, {Projectile: modules.projectile, Mob: modules.mob}));
    spawn(42, 'short', 7);
    const oldProjectile = Object.values(game.entities).find(entity => entity instanceof modules.projectile);
    expect(oldProjectile.gridX).toBe(3);
    const next = destination();
    game.pauseForMapTransition();
    game.resetForMapTransition(next.map, next.storage);
    game.player.setWeaponName('sword1');
    const replacement = new modules.projectile('short', game.player);
    replacement.id = oldProjectile.id;
    game.addEntity(replacement);
    expect(() => jest.advanceTimersByTime(5001)).not.toThrow();
    expect(game.entities[replacement.id]).toBe(replacement);
    expect(replacement.visible).toBe(true);
});

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
    return {promise, resolve, reject};
}
const flush = async () => {for (let i = 0; i < 8; i++) await Promise.resolve();};

function leaveSource(state, reset = true) {
    state.game.mapTransition = {active: true};
    state.game.pauseForMapTransition();
    if (reset) {
        const next = state.destination();
        state.game.resetForMapTransition(next.map, next.storage);
        state.game.mapTransition.active = false;
    }
}

function npcFixture(state) {
    const npc = state.actor(7, true);
    Object.assign(npc, {name: 'taikoguard', thoughts: [], hasTalked: jest.fn(), talk: jest.fn(() => 'Hello'),
        addThoughts(messages, callback) {this.thoughts.push(...messages); this.thoughtsClearedCallback = callback;},
    });
    const game = state.game;
    game.createBubble = jest.fn();
    game.assignBubbleTo = jest.fn();
    game.audioManager.playSound = jest.fn();
    game.showNewQuestPopup = jest.fn();
    game.handleInputOptions = jest.fn();
    game.showQuestCompleteNotification = jest.fn();
    return npc;
}

test('current-map quests, partner completion and dialogue choices still update the active game', async () => {
    const state = setup(), {game, app, http} = state, npc = npcFixture(state);
    game.makeNpcTalk = jest.fn();
    http.get.mockResolvedValueOnce({data: []}).mockResolvedValueOnce({data: true}).mockResolvedValueOnce({data: true});
    game.initAchievements();
    game.checkForPartnerTask(npc);
    game.makeChoice(npc.id, 'yes');
    await flush();
    expect(app.initAchievementList).toHaveBeenCalledWith([]);
    expect(app.initUnlockedAchievements).toHaveBeenCalledWith([]);
    expect(game.showQuestCompleteNotification).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(game.makeNpcTalk).toHaveBeenCalledWith(npc);
});

test.each([false, true])('old quest, NPC and fishing responses stay silent during and after map travel (reset=%s)', async reset => {
    const state = setup(), {game, app, http, sandbox} = state;
    const npc = npcFixture(state), quests = deferred(), partner = deferred(), dialogue = deferred(), fishing = deferred();
    game.achievements = ['current-quests'];
    game.castFloat = jest.fn();
    game.showNotification = jest.fn();
    http.get.mockReturnValueOnce(quests.promise).mockReturnValueOnce(partner.promise)
        .mockReturnValueOnce(dialogue.promise).mockReturnValueOnce(fishing.promise);
    game.initAchievements();
    game.checkForPartnerTask(npc);
    game.checkForQuests(npc);
    game.startFishing(2, 2);
    leaveSource(state, reset);
    const timers = jest.getTimerCount();

    quests.resolve({data: [{id: 999, status: 'COMPLETED'}]});
    partner.resolve({data: true});
    dialogue.resolve({data: {options: ['Old dialogue']}});
    fishing.resolve({data: {allowed: true, fish: 'old-fish'}});
    await flush();

    expect(game.achievements).toEqual(['current-quests']);
    expect(app.initAchievementList).not.toHaveBeenCalled();
    expect(app.initUnlockedAchievements).not.toHaveBeenCalled();
    expect(game.showQuestCompleteNotification).not.toHaveBeenCalled();
    expect(game.handleInputOptions).not.toHaveBeenCalled();
    expect(game.createBubble).not.toHaveBeenCalled();
    expect(game.castFloat).not.toHaveBeenCalled();
    expect(game.showNotification).not.toHaveBeenCalled();
    expect(sandbox.console.error).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(timers);
});

test('old request failures cannot clear destination fishing, stop its conversation or show errors', async () => {
    const state = setup(), {game, http, sandbox} = state, npc = npcFixture(state);
    const quests = deferred(), partner = deferred(), dialogue = deferred(), fishing = deferred(), choice = deferred();
    game.showNotification = jest.fn();
    http.get.mockReturnValueOnce(quests.promise).mockReturnValueOnce(partner.promise)
        .mockReturnValueOnce(dialogue.promise).mockReturnValueOnce(fishing.promise).mockReturnValueOnce(choice.promise);
    game.initAchievements();
    game.checkForPartnerTask(npc);
    game.checkForQuests(npc);
    game.startFishing(2, 2);
    game.makeChoice(npc.id, 'yes');
    leaveSource(state);
    game.player.isFishing = true;
    game.conversationHold.stop.mockClear();
    for (const request of [quests, partner, dialogue, fishing, choice]) request.reject(new Error('source offline'));
    await flush();
    expect(game.player.isFishing).toBe(true);
    expect(game.conversationHold.stop).not.toHaveBeenCalled();
    expect(game.showNotification).not.toHaveBeenCalled();
    expect(sandbox.console.error).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
});

test.each([false, true])('old NPC quest popups are suppressed after their dialogue was shown (multiple=%s)', async multiple => {
    const state = setup(), {game, http} = state, npc = npcFixture(state);
    http.get.mockResolvedValue({data: {text: multiple ? ['First', 'Last'] : 'Only line', quest: {id: 999}}});
    game.checkForQuests(npc);
    await flush();
    expect(game.createBubble).toHaveBeenCalledTimes(1);
    if (multiple) {
        game.checkForQuests(npc);
        expect(game.createBubble).toHaveBeenCalledTimes(2);
    }
    leaveSource(state);
    jest.advanceTimersByTime(2000);
    expect(game.showNewQuestPopup).not.toHaveBeenCalled();
});

test.each(['request', 'delay'])('an old NPC choice cannot reopen dialogue after switching maps (phase=%s)', async phase => {
    const state = setup(), {game, http} = state, npc = npcFixture(state), response = deferred();
    http.get.mockReturnValue(response.promise);
    game.makeNpcTalk = jest.fn();
    game.makeChoice(npc.id, 'yes');
    if (phase === 'delay') {response.resolve({data: true}); await flush();}
    leaveSource(state);
    if (phase === 'request') {response.resolve({data: true}); await flush();}
    jest.advanceTimersByTime(1000);
    expect(game.makeNpcTalk).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
});

test('a removed NPC response cannot open dialogue on another actor with the same id', async () => {
    const state = setup(), {game, http} = state, npc = npcFixture(state), response = deferred();
    http.get.mockReturnValue(response.promise);
    game.checkForQuests(npc);
    game.removeEntity(npc);
    state.actor(npc.id, true);
    response.resolve({data: {options: ['Old NPC options']}});
    await flush();
    expect(game.handleInputOptions).not.toHaveBeenCalled();
    expect(game.createBubble).not.toHaveBeenCalled();
});

test('the fishing bite timer cannot restart fishing when map travel has begun', async () => {
    const state = setup(), {game, http} = state;
    game.castFloat = jest.fn();
    game.playCatchFish = jest.fn();
    http.get.mockResolvedValue({data: {allowed: true, fish: 'fish'}});
    game.startFishing(2, 2);
    await flush();
    expect(game.castFloat).toHaveBeenCalledTimes(1);
    // Exercise the timer guard independently of pause clearing the timer.
    game.mapTransition = {active: true};
    jest.advanceTimersByTime(13000);
    expect(game.playCatchFish).not.toHaveBeenCalled();
});

test.each(['ownership', 'trigger'])('a remote player gate response cannot move a removed player into destination grids (phase=%s)', async phase => {
    const state = setup(), {game, http, actor, destination, sandbox} = state;
    const remote = actor(7);
    remote.destination = {gridX: 2, gridY: 2};
    const ownership = deferred(), trigger = deferred();
    http.get.mockReturnValueOnce(ownership.promise).mockReturnValueOnce(trigger.promise);
    game.map.isDoor = () => true;
    game.map.getDoorDestination = () => ({x: 3, y: 3, nft: 'token', triggerId: 'gate'});
    const source = fs.readFileSync(require.resolve('./game'), 'utf8');
    const start = source.indexOf('                                        entity.onStopPathing(');
    const end = source.indexOf('                                        entity.onRequestPath(', start);
    vm.runInContext(source.slice(start, end), Object.assign(sandbox, {entity: remote, Player: state.modules.player}));
    remote.stop_pathing_callback(1, 1);
    if (phase === 'trigger') {ownership.resolve({data: true}); await flush();}
    const requests = http.get.mock.calls.length;
    game.pauseForMapTransition();
    const next = destination();
    game.resetForMapTransition(next.map, next.storage);
    // A newly visible actor may reuse the departed server's numeric entity id.
    const replacement = actor(7);
    const update = jest.spyOn(game, 'updatePos');
    if (phase === 'ownership') ownership.resolve({data: true});
    else trigger.resolve({data: true});
    await flush();
    expect(http.get).toHaveBeenCalledTimes(requests);
    expect(update).not.toHaveBeenCalled();
    expect(game.entities[7]).toBe(replacement);
    expect(game.entityGrid[1][1][7]).toBe(replacement);
    expect(remote.gridX).toBe(1);
    expect(remote.gridY).toBe(1);
    expect(sandbox.console.error).not.toHaveBeenCalled();
});
