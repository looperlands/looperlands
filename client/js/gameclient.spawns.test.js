const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function setup() {
    let GameClient;
    class Player { constructor(id) { this.id = id; } }
    const createEntity = jest.fn((kind, id) => kind === Types.Entities.WARRIOR ? new Player(id) : {id, kind});
    const loads = [];
    const errors = jest.fn();
    const sandbox = {
        _, console: {log() {}, error: errors},
        loadDynamicNFTByKind: jest.fn((kind, session, done) => loads.push({kind, done})),
        define: (dependencies, factory) => {
            if (dependencies[0] === 'mapmakerentities') {
                return factory(require('../../shared/js/mapmakerentities.json'));
            }
            GameClient = factory(Player, {createEntity});
        },
    };
    vm.createContext(sandbox);
    for (const file of ['./lib/class', '../../shared/js/gametypes', './gameclient']) {
        vm.runInContext(fs.readFileSync(require.resolve(file), 'utf8'), sandbox);
    }
    const Types = sandbox.Types, M = Types.Messages;
    const client = new GameClient('localhost', 8000, 'http', 'session', 'main');
    const spawned = jest.fn();
    client.onSpawnCharacter(spawned);
    sandbox.client = client;
    const receive = actions => vm.runInContext(`client.receiveMessage(${JSON.stringify(actions)})`, sandbox);
    const player = (values = {}) => {
        const state = {x: 2, y: 2, name: 'Player', title: 'Title', target: 7,
            armor: 900000001, weapon: Types.Entities.SWORD1, ...values};
        return [M.SPAWN, 42, Types.Entities.WARRIOR, state.x, state.y, state.name,
            Types.Orientations.DOWN, state.armor, state.weapon, state.title, 20, state.target];
    };
    return {client, receive, player, loads, spawned, errors, createEntity, M, Types, sandbox};
}

test('existing entities refresh without constructing an entity or requesting NFT metadata', () => {
    const s = setup();
    const refresh = jest.fn(() => true);
    s.client.onEntityState(refresh);
    s.receive(s.player());
    expect(refresh).toHaveBeenCalledWith(expect.objectContaining({id: 42, x: 2, target: 7}));
    expect(s.createEntity).not.toHaveBeenCalled();
    expect(s.loads).toEqual([]);
    expect(s.spawned).not.toHaveBeenCalled();
});

test('overlapping snapshots share one asset load and publish the newest position and target', () => {
    const s = setup();
    s.receive(s.player());
    s.receive(s.player({x: 5, y: 4, name: 'Renamed', title: 'New title', target: 8}));
    expect(s.loads).toHaveLength(1);
    expect(s.createEntity).toHaveBeenCalledTimes(1);
    s.loads[0].done({nftId: '0xavatar'});
    expect(s.spawned).toHaveBeenCalledTimes(1);
    expect(s.spawned).toHaveBeenCalledWith(expect.objectContaining({name: 'Renamed', title: 'New title'}),
        5, 4, s.Types.Orientations.DOWN, 8);
    expect(s.client.pendingSpawns.size).toBe(0);
});

test('movement and attacks during loading replay their latest values in arrival order', () => {
    const s = setup(), handled = [];
    s.client.onSpawnCharacter(() => handled.push('spawn'));
    s.client.onEntityMove((id, x) => handled.push(['move', x]));
    s.client.onEntityAttack((id, target) => handled.push(['attack', target]));
    s.receive([s.player(), [s.M.MOVE, 42, 3, 2], [s.M.ATTACK, 42, 7], [s.M.MOVE, 42, 4, 2]]);
    expect(handled).toEqual([]);
    s.loads[0].done({nftId: '0xavatar'});
    expect(handled).toEqual(['spawn', ['attack', 7], ['move', 4]]);
});

test('a fresh snapshot supersedes older buffered movement and attacks', () => {
    const s = setup(), moved = jest.fn(), attacked = jest.fn();
    s.client.onEntityMove(moved);
    s.client.onEntityAttack(attacked);
    s.receive([s.player(), [s.M.MOVE, 42, 3, 2], [s.M.ATTACK, 42, 7], s.player({x: 5, target: 8})]);
    s.loads[0].done({nftId: '0xavatar'});
    expect(s.spawned).toHaveBeenCalledWith(expect.anything(), 5, 2, s.Types.Orientations.DOWN, 8);
    expect(moved).not.toHaveBeenCalled();
    expect(attacked).not.toHaveBeenCalled();
});

test('armor and weapon updates each survive an outstanding avatar load', () => {
    const s = setup(), equipped = jest.fn();
    s.client.onPlayerEquipItem(equipped);
    s.receive([s.player(), [s.M.EQUIP, 42, s.Types.Entities.SWORD2],
        [s.M.EQUIP, 42, s.Types.Entities.LEATHERARMOR], [s.M.EQUIP, 42, s.Types.Entities.AXE]]);
    s.loads[0].done({nftId: '0xavatar'});
    expect(equipped.mock.calls).toEqual([[42, s.Types.Entities.LEATHERARMOR], [42, s.Types.Entities.AXE]]);
});

test.each(['despawn', 'destroy', 'list', 'disable', 'revive', 'dispose'])(
    '%s invalidates an outstanding spawn before its asset callback completes', action => {
        const s = setup();
        s.receive(s.player());
        if (action === 'despawn') s.receive([s.M.DESPAWN, 42]);
        if (action === 'destroy') s.receive([s.M.DESTROY, 42]);
        if (action === 'list') s.receive([s.M.LIST, 7]);
        if (action === 'disable') s.client.disable();
        if (action === 'revive') s.client.resetPendingSpawns();
        if (action === 'dispose') s.client.dispose();
        s.loads[0].done({nftId: '0xavatar'});
        expect(s.spawned).not.toHaveBeenCalled();
        expect(s.client.pendingSpawns.size).toBe(0);
    }
);

test('disposing abandons dynamic armor and weapon loads without repopulating appearance state', () => {
    const s = setup();
    s.receive(s.player({weapon: 900000002}));
    s.client.dispose();
    s.loads[0].done({nftId: '0xavatar'});
    s.client.receiveSpawn(s.player({x: 8}));
    expect(s.loads).toHaveLength(1);
    expect(s.spawned).not.toHaveBeenCalled();
    expect(s.client.pendingSpawns.size).toBe(0);
    expect(s.client.dynamicAppearances.size).toBe(0);
});

test('returning to an area cannot publish the asset callback from a previous visit', () => {
    const s = setup();
    s.receive(s.player());
    s.receive([s.M.LIST, 7]);
    s.receive(s.player({x: 6, target: 8}));
    s.loads[0].done({nftId: '0xold'});
    expect(s.spawned).not.toHaveBeenCalled();
    s.loads[1].done({nftId: '0xnew'});
    expect(s.spawned).toHaveBeenCalledTimes(1);
    expect(s.spawned).toHaveBeenCalledWith(expect.objectContaining({spriteName: 'NFT_new'}),
        6, 2, s.Types.Orientations.DOWN, 8);
});

test('a changed appearance replaces the loading generation', () => {
    const s = setup();
    s.receive(s.player());
    s.receive(s.player({armor: 900000002}));
    s.loads[0].done({nftId: '0xold'});
    expect(s.spawned).not.toHaveBeenCalled();
    s.loads[1].done({nftId: '0xnew'});
    expect(s.spawned).toHaveBeenCalledTimes(1);
});

test('a cancelled armor load does not start another request for its dynamic weapon', () => {
    const s = setup();
    s.receive(s.player({weapon: 900000002}));
    s.receive([s.M.DESTROY, 42]);
    s.loads[0].done({nftId: '0xavatar'});
    expect(s.loads).toHaveLength(1);
    expect(s.spawned).not.toHaveBeenCalled();
});

test('a long asset load retains one movement update instead of every intermediate tile', () => {
    const s = setup(), moved = jest.fn();
    s.client.onEntityMove(moved);
    s.receive(s.player());
    for (let x = 0; x < 1000; x++) s.receive([s.M.MOVE, 42, x, 2]);
    expect(s.client.pendingSpawns.get(42).actions.size).toBe(1);
    s.loads[0].done({nftId: '0xavatar'});
    expect(moved).toHaveBeenCalledTimes(1);
    expect(moved).toHaveBeenCalledWith(42, 999, 2);
    expect(s.errors).not.toHaveBeenCalled();
});

test('a failed metadata request can retry on the next visibility snapshot', async () => {
    const s = setup();
    s.sandbox.loadDynamicNFTByKind.mockImplementationOnce(() => Promise.resolve());
    s.receive(s.player());
    await Promise.resolve();
    expect(s.client.pendingSpawns.size).toBe(0);
    s.receive(s.player());
    s.loads[0].done({nftId: '0xavatar'});
    expect(s.spawned).toHaveBeenCalledTimes(1);
});

test('a rejected metadata request releases the pending generation', async () => {
    const s = setup();
    s.sandbox.loadDynamicNFTByKind.mockImplementationOnce(() => Promise.reject(new Error('Unavailable')));
    s.receive(s.player());
    await Promise.resolve();
    expect(s.client.pendingSpawns.size).toBe(0);
    expect(s.spawned).not.toHaveBeenCalled();
    expect(s.errors).toHaveBeenCalled();
});

test('a broken entity constructor cannot retain a pending spawn', () => {
    const s = setup();
    s.createEntity.mockImplementationOnce(() => {throw new Error('Invalid kind');});
    s.receive(s.player());
    expect(s.client.pendingSpawns.size).toBe(0);
    expect(s.errors).toHaveBeenCalled();
});

test('a known dynamic kind still provides the metadata required to load its sprite', () => {
    const s = setup();
    const nft = {nftId: '0x12345678', assetType: 'armor'};
    const sprite = s.Types.addDynamicNFT(nft);
    s.receive(s.player({armor: s.Types.getKindFromString(sprite)}));
    expect(s.loads).toHaveLength(1);
    s.loads[0].done(nft);
    expect(s.spawned).toHaveBeenCalledWith(expect.objectContaining({dynamicArmorNFTData: nft}),
        2, 2, s.Types.Orientations.DOWN, 7);
});

test('re-entering an area reuses appearance metadata cached by an earlier load', () => {
    const s = setup();
    s.receive(s.player());
    s.loads[0].done({nftId: '0xavatar'});
    s.receive(s.player({x: 5}));
    expect(s.loads).toHaveLength(1);
    expect(s.spawned).toHaveBeenCalledTimes(2);
    expect(s.spawned).toHaveBeenLastCalledWith(expect.objectContaining({dynamicArmorNFTData: {nftId: '0xavatar'}}),
        5, 2, s.Types.Orientations.DOWN, 7);
});
