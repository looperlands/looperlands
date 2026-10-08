const path = require('path');
jest.mock('../js/lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('../js/lib/class'), 'utf8'), {exports});
    return exports;
});
global.Types = {};
const Types = require('../../shared/js/gametypes');
const ServerMap = require('../js/map');
const {NpcBehavior} = require('../js/npcbehavior');
const {NpcMemory} = require('../js/npcmemory');
const picnic = require('./lantern-picnic');
const LanternPicnicScene = require('./lantern-picnic-scene');

test.each([true, false])('completed preparations lead to an actual gathering and remembered picnic; music=%s', async music => {
    const map = await new Promise(resolve => {
        const loaded = new ServerMap(path.join(__dirname, '../maps/world_server_main.json'));
        loaded.ready(() => resolve(loaded));
    });
    map.generateCollisionGrid();
    let time = 1000000;
    const config = JSON.parse(JSON.stringify(picnic.behavior));
    const npcs = Object.fromEntries(config.npcs.map((definition, index) => [100 + index, {
        id: 100 + index, type: 'npc', kind: Types.getKindFromString(definition.kind), ...definition.origin, group: '0-0'
    }]));
    const player = {id: 1, type: 'player', nftId: 'local-avatar-one', sessionId: 'one', hasEnteredGame: true,
        x: 40, y: 215, isBot: () => false}; // Occupy Adam's preferred seat.
    const data = {quests: {COMPLETED: [{questKey: picnic.INVITE}]}, choices: [picnic.SHARE, music ? picnic.MUSIC : picnic.QUIET]};
    const world = {id: 'world_main', map, npcs, entities: {...npcs, 1: player}, players: {1: player},
        server: {cache: {get: () => ({gameData: data})}}, pushToPlayer: jest.fn(),
        pushToAdjacentGroups: jest.fn(), pushToGroup: jest.fn(), moveNpc: jest.fn((npc, x, y) => {
            expect(Math.abs(npc.x - x) + Math.abs(npc.y - y)).toBe(1);
            npc.x = x; npc.y = y;
        })};
    const memory = new NpcMemory();
    const behavior = world.npcBehavior = new NpcBehavior(world, config, memory, () => time);
    const scene = new LanternPicnicScene(world, () => time);
    const routes = [...behavior.routines.values()].map(actor => actor.definition.route);
    scene.tick();
    expect(scene.state.phase).toBe('gathering');
    expect(scene.state.music).toBe(music);
    expect(scene.actors[0].seat).not.toEqual({x: 40, y: 215});
    for (let index = 0; index < 1200 && scene.state.phase !== 'finished'; index++) {
        time += 200;
        behavior.tick();
        scene.tick();
    }
    expect(scene.state.phase).toBe('finished');
    expect(world.moveNpc.mock.calls.length).toBeGreaterThan(20);
    expect([...behavior.routines.values()].map(actor => actor.definition.route)).toEqual(routes);
    const messages = world.pushToPlayer.mock.calls.map(([, message]) => message.serialize())
        .filter(message => message[0] === Types.Messages.CHAT).map(message => message[2]);
    expect(messages).toContain('One place is still empty. Rowan used to bring invitations from the other parts of the island.');
    expect(messages.some(text => text.includes('You chose'))).toBe(false);
    expect(memory.has('main', 'lantern-picnic', player, 'celebrated')).toBe(true);
    const returning = new LanternPicnicScene(world, () => time);
    returning.tick();
    expect(returning.state).toBeNull();
});
