const fs = require('fs');
const os = require('os');
const path = require('path');
// The legacy inheritance helper relies on sloppy-mode arguments.callee.
// Load its real source without Babel's strict-mode wrapper.
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
global.Types = {};
const Types = require('../../shared/js/gametypes');
const {NpcBehavior, validateConfig, loadConfig} = require('./npcbehavior');
const {NpcMemory} = require('./npcmemory');

function setup(options = {}) {
    let time = 1000000;
    const definitions = options.npcs || [{key: 'watch', kind: 'guard', label: 'Watch', preset: 'patrol',
        origin: {x: 2, y: 2}, area: {x: 1, y: 1, width: 18, height: 18}, stepMs: 500,
        route: [{x: 5, y: 2, waitSeconds: 3, activity: 'watching'}],
        questIds: ['HELP'], lines: {greeting: ['Hello'], return: ['Welcome back'], talk: ['On patrol'],
            kill: ['Well fought'], quest: ['Thanks for helping']}}];
    const npcs = Object.fromEntries(definitions.map((definition, index) => [index + 100, {
        id: index + 100, type: 'npc', kind: Types.getKindFromString(definition.kind), ...definition.origin, group: '0-0'
    }]));
    const player = {id: 1, nftId: 'avatar-one', sessionId: 'session-one', x: 12, y: 12, hasEnteredGame: true,
        isBot: () => false};
    const blocked = new Set();
    const session = {gameData: {quests: {}}};
    const world = {id: 'world_test', npcs, entities: {...npcs, 1: player}, players: {1: player},
        server: {cache: {get: () => session}},
        map: {isOutOfBounds: (x, y) => x < 1 || y < 1 || x > 19 || y > 19,
            isColliding: (x, y) => blocked.has(x + ',' + y), doors: [],
            getSceneAt: () => ({name: 'Town'})},
        pushToPlayer: jest.fn(), pushToAdjacentGroups: jest.fn(), pushToGroup: jest.fn(),
        moveNpc: jest.fn((npc, x, y) => { npc.x = x; npc.y = y; })};
    const memory = options.memory || new NpcMemory();
    const controller = new NpcBehavior(world, {enabled: true, npcs: definitions, conversations: options.conversations || [],
        ambience: {scene: 'Town', cycleSeconds: 180, nightOpacity: 0.12, particles: 'fireflies', particleCount: 12}}, memory, () => time);
    return {controller, world, player, blocked, session, memory, npc: npcs[100],
        advance: milliseconds => {time += milliseconds; controller.tick();}};
}

const chatTexts = world => world.pushToPlayer.mock.calls.map(([, message]) => message.serialize())
    .filter(message => message[0] === Types.Messages.CHAT).map(message => message[2]);

test('one world controller moves one tile per interval with two connected players', () => {
    const {controller, world, advance, npc, player} = setup();
    world.players[2] = {...player, id: 2, nftId: 'avatar-two'};
    world.entities[2] = world.players[2];
    advance(2000);
    expect(world.moveNpc).toHaveBeenCalledTimes(1);
    expect({x: npc.x, y: npc.y}).toEqual({x: 3, y: 2});
    controller.tick();
    expect(world.moveNpc).toHaveBeenCalledTimes(1);
    advance(500);
    expect({x: npc.x, y: npc.y}).toEqual({x: 4, y: 2});
});

test('routes avoid walls, doors and occupied tiles', () => {
    const {controller, world, blocked, npc} = setup();
    blocked.add('3,2');
    world.map.doors = [{x: 2, y: 1}];
    world.entities[7] = {id: 7, type: 'player', x: 3, y: 3};
    const route = controller.findPath(controller.routines.get('watch'), {x: 5, y: 2});
    expect(route.length).toBeGreaterThan(3);
    expect(route).not.toContainEqual({x: 3, y: 2});
    expect(route).not.toContainEqual({x: 2, y: 1});
    expect(route).not.toContainEqual({x: 3, y: 3});
    let previous = npc;
    for (const point of route) {
        expect(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)).toBe(1);
        previous = point;
    }
});

test('interaction pauses movement and resumes without teleporting when the player leaves', () => {
    const {controller, world, player, advance, npc} = setup();
    player.x = 2; player.y = 3;
    expect(controller.interact(player, npc.kind, npc.id)).toEqual({text: 'Hello'});
    player.x = 12; player.y = 12;
    advance(19000);
    expect(world.moveNpc).not.toHaveBeenCalled();
    advance(1200);
    expect(world.moveNpc).toHaveBeenCalledTimes(1);
});

test('greetings stay private, are throttled, and remember the avatar in a new session', () => {
    const {controller, world, player, advance, memory} = setup();
    player.x = 2; player.y = 3;
    advance(200);
    expect(chatTexts(world)).toEqual(['Hello']);
    advance(6000);
    expect(chatTexts(world)).toEqual(['Hello']);
    player.x = 12; player.y = 12; advance(200);
    player.x = 2; player.y = 3; advance(200);
    expect(chatTexts(world)).toEqual(['Hello']);
    const next = setup({memory});
    next.player.x = 2; next.player.y = 3;
    next.advance(200);
    expect(chatTexts(next.world)).toEqual(['Welcome back']);
    expect(controller.playerStates.size).toBe(1);
    delete world.players[1]; advance(200);
    expect(controller.playerStates.size).toBe(0);
});

test('an NPC approached during speech greets once after the speech ends', () => {
    const {controller, world, player, advance} = setup();
    controller.routines.get('watch').speechUntil = 1001000;
    player.x = 2; player.y = 3;
    advance(200); expect(chatTexts(world)).toEqual([]);
    advance(1000); expect(chatTexts(world)).toEqual(['Hello']);
});

test('three nearby NPCs share a speech cooldown while direct dialogue stays immediate', () => {
    const base = setup().controller.config.npcs[0];
    const {controller, world, player, advance} = setup({npcs: [base,
        {...base, key: 'friend', kind: 'villager', origin: {x: 4, y: 2}},
        {...base, key: 'neighbour', kind: 'villagegirl', origin: {x: 3, y: 4}}]});
    player.x = 3; player.y = 3;
    advance(200);
    expect(chatTexts(world)).toEqual(['Hello']);
    advance(6000);
    expect(chatTexts(world)).toEqual(['Hello']);
    expect(controller.interact(player, Types.Entities.VILLAGER, 101)).toEqual({text: 'Hello'});
    expect(controller.canSpeak(controller.routines.get('neighbour'), 1007000)).toBe(false);
    expect(controller.canSpeak(controller.routines.get('neighbour'), 1030000)).toBe(true);
});

test('NPC conversations take priority over overlapping player greetings', () => {
    const base = setup().controller.config.npcs[0];
    const {controller, world, player, advance} = setup({npcs: [base,
        {...base, key: 'friend', kind: 'villager', origin: {x: 4, y: 2}}],
        conversations: [{cooldownSeconds: 60, steps: [{npc: 'watch', text: 'Hello friend'}, {npc: 'friend', text: 'Hello watch'}]}]});
    player.x = 3; player.y = 3;
    controller.nextConversation = 1000000;
    advance(200); advance(200); advance(6000);
    expect(chatTexts(world)).toEqual(['Hello friend', 'Hello watch']);
});

test('quest recognition is persistent even if completion happens away from the NPC', () => {
    const memory = new NpcMemory();
    const {controller, player} = setup({memory});
    controller.react('quest', player, {quest: {id: 'UNRELATED'}});
    expect(memory.has('test', 'watch', player, 'helped')).toBe(false);
    controller.react('quest', player, {quest: {id: 'HELP'}});
    const next = setup({memory});
    next.player.x = 2; next.player.y = 3;
    expect(next.controller.interact(next.player, next.npc.kind, next.npc.id)).toEqual({text: 'Thanks for helping'});
});

test('combat reactions are local, throttled and do not overwrite a conversation', () => {
    const {controller, world, player, advance, npc} = setup();
    const mob = {kind: Types.Entities.RAT, x: 3, y: 2};
    player.x = 10; player.y = 2;
    controller.react('kill', player, {mob});
    controller.react('kill', player, {mob});
    expect(chatTexts(world)).toEqual(['Well fought']);
    player.x = 2; player.y = 3;
    controller.interact(player, npc.kind, npc.id);
    controller.react('kill', player, {mob});
    expect(chatTexts(world)).toEqual(['Well fought']);
    player.x = 18; player.y = 18;
    advance(31000);
    controller.react('kill', player, {mob});
    expect(chatTexts(world)).toEqual(['Well fought']);
});

test('idle worlds do not move NPCs and leaving Town removes ambience', () => {
    const {world, advance, player} = setup();
    world.map.getSceneAt = () => ({name: 'Forest'});
    player.x = 19; player.y = 19;
    advance(2000);
    const messages = world.pushToPlayer.mock.calls.map(([, message]) => message.serialize());
    expect(messages).toContainEqual([Types.Messages.WORLD_AMBIENCE, null]);
    delete world.players[1];
    const moves = world.moveNpc.mock.calls.length;
    advance(5000);
    expect(world.moveNpc).toHaveBeenCalledTimes(moves);
});

test('duplicate NPC kinds are selected by entity identity and distant requests do not pause them', () => {
    const base = setup().controller.config.npcs[0];
    const {controller, player, npc} = setup({npcs: [base, {...base, key: 'other-watch', origin: {x: 4, y: 2}}]});
    player.x = 2; player.y = 3;
    controller.interact(player, npc.kind, 101);
    expect(controller.routines.get('watch').pauseUntil).toBe(0);
    expect(controller.routines.get('other-watch').pauseUntil).toBeGreaterThan(0);
    player.x = 18; player.y = 18;
    expect(controller.interact(player, npc.kind, npc.id)).toBeNull();
});

test('conversation steps run once for both nearby players', () => {
    const base = setup().controller.config.npcs[0];
    const {controller, world, player, advance} = setup({npcs: [base,
        {...base, key: 'friend', kind: 'villager', origin: {x: 4, y: 2}}],
        conversations: [{cooldownSeconds: 60, steps: [{npc: 'watch', text: 'Hello friend'}, {npc: 'friend', text: 'Hello watch'}]}]});
    player.x = 10; player.y = 3;
    world.players[2] = {...player, id: 2, nftId: 'avatar-two'};
    controller.nextConversation = 1000000;
    advance(200); advance(200);
    expect(chatTexts(world).filter(text => text === 'Hello friend')).toHaveLength(2);
    advance(6000);
    expect(chatTexts(world).filter(text => text === 'Hello watch')).toHaveLength(2);
});

test('recognition survives loading the store from disk and keeps raw identity out of the file', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'npc-memory-test-'));
    const filename = path.join(directory, 'memory.json');
    try {
        const player = {nftId: 'avatar-one'};
        new NpcMemory(filename).remember('main', 'watch', player, 'met');
        expect(new NpcMemory(filename).has('main', 'watch', player, 'met')).toBe(true);
        expect(fs.readFileSync(filename, 'utf8')).not.toContain('avatar-one');
        fs.writeFileSync(filename, '{broken');
        expect(() => new NpcMemory(filename)).toThrow();
        expect(fs.readFileSync(filename, 'utf8')).toBe('{broken');
    } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('failed memory writes leave the in-memory recognition unchanged', () => {
    const memory = new NpcMemory();
    memory.filename = '/does-not-exist/npc-memory.json';
    const player = {nftId: 'avatar-one'};
    expect(() => memory.remember('main', 'watch', player, 'met')).toThrow();
    expect(memory.has('main', 'watch', player, 'met')).toBe(false);
});

test('memory write failures do not stop a world tick or player interaction', () => {
    const memory = new NpcMemory();
    memory.remember = () => { throw new Error('Disk unavailable'); };
    const {world, controller, advance, player, npc} = setup({memory});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        player.x = 2; player.y = 3;
        expect(() => advance(200)).not.toThrow();
        expect(chatTexts(world)).toEqual(['Hello']);
        expect(() => controller.interact(player, npc.kind, npc.id)).not.toThrow();
        expect(error).toHaveBeenCalledTimes(1);
    } finally { error.mockRestore(); }
});

test('an authored conversation yields when a player talks to either participant', () => {
    const base = setup().controller.config.npcs[0];
    const {controller, world, player, advance} = setup({npcs: [base,
        {...base, key: 'friend', kind: 'villager', origin: {x: 4, y: 2}}],
        conversations: [{cooldownSeconds: 60, steps: [{npc: 'watch', text: 'First line'}, {npc: 'friend', text: 'Second line'}]}]});
    player.x = 10; player.y = 3;
    controller.nextConversation = 1000000;
    advance(200); advance(200);
    player.x = 2; player.y = 3;
    controller.interact(player, Types.Entities.GUARD, 100);
    advance(6000);
    expect(controller.conversation).toBeNull();
    expect(chatTexts(world)).not.toContain('Second line');
});

test('route-only NPCs preserve legacy dialogue instead of returning null text', () => {
    const base = setup().controller.config.npcs[0];
    const {controller, player, npc} = setup({npcs: [{...base, lines: {}}]});
    player.x = 2; player.y = 3;
    expect(controller.interact(player, npc.kind, npc.id)).toBeNull();
});

test('ambient reactions use quest and choice memory, survive a new session, and stay personal', () => {
    const base = setup().controller.config.npcs[0];
    const definition = {...base, reactions: [{when: {questCompleted: 'PICNIC', choice: 'quiet'},
        lines: {return: ['I remember your quiet picnic invitation.']}}]};
    const {controller, session, player, memory} = setup({npcs: [definition]});
    session.gameData = {quests: {COMPLETED: [{questKey: 'PICNIC'}]}, choices: ['quiet']};
    expect(controller.line(controller.routines.get('watch'), 'return', player)).toContain('quiet picnic');
    const returning = setup({npcs: [definition], memory});
    expect(returning.controller.line(returning.controller.routines.get('watch'), 'return', returning.player)).toContain('quiet picnic');
    const stranger = {...returning.player, nftId: 'avatar-other'};
    expect(returning.controller.line(returning.controller.routines.get('watch'), 'return', stranger)).toBe('Welcome back');
    expect(() => validateConfig({enabled: true, npcs: [{...definition,
        reactions: [{when: {invented: 'condition'}, lines: {return: ['Invalid']}}]}]})).toThrow();
});

test('pilot configuration is valid and rejects duplicate keys, invalid routes and markup', () => {
    const config = loadConfig('main');
    expect(config.npcs).toHaveLength(3);
    expect(() => validateConfig({...config, npcs: [config.npcs[0], config.npcs[0]]})).toThrow();
    expect(() => validateConfig({...config, npcs: [{...config.npcs[0], stepMs: 10}]})).toThrow();
    expect(() => validateConfig({...config, npcs: [{...config.npcs[0], lines: {greeting: ['<script>']}}]})).toThrow();
});

test('all pilot routes are connected on the actual map and avoid doors', async () => {
    const ServerMap = require('./map');
    const map = await new Promise(resolve => {
        const loaded = new ServerMap(path.join(__dirname, '../maps/world_server_main.json'));
        loaded.ready(() => resolve(loaded));
    });
    map.generateCollisionGrid();
    const config = loadConfig('main');
    const npcs = Object.fromEntries(config.npcs.map((definition, index) => [index + 100, {
        id: index + 100, type: 'npc', kind: Types.getKindFromString(definition.kind), ...definition.origin
    }]));
    const controller = new NpcBehavior({id: 'world_main', map, npcs, entities: npcs}, config, new NpcMemory());
    expect(controller.routines.size).toBe(3);
    for (const routine of controller.routines.values()) {
        for (const waypoint of routine.definition.route) {
            const route = controller.findPath(routine, waypoint);
            expect(route.length).toBeGreaterThan(0);
            expect(route.at(-1)).toEqual({x: waypoint.x, y: waypoint.y});
            Object.assign(routine.npc, waypoint);
        }
    }
});
