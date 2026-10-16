const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function setup() {
    let GameClient;
    const errors = jest.fn();
    const sandbox = {
        _, console: {log() {}, error: errors},
        define: (_, factory) => {
            GameClient = factory(null, {createEntity: (kind, id) => ({kind, id})});
        },
    };
    vm.createContext(sandbox);
    for (const file of ['./lib/class', '../../shared/js/gametypes', './gameclient']) {
        vm.runInContext(fs.readFileSync(require.resolve(file), 'utf8'), sandbox);
    }
    const client = new GameClient('localhost', 8000, 'http', 'session', 'main');
    // Construct incoming arrays in the client's realm, as Socket.IO does in-browser.
    sandbox.client = client;
    const receive = actions => vm.runInContext(`client.receiveMessage(${JSON.stringify(actions)})`, sandbox);
    return {client, receive, errors, messages: sandbox.Types.Messages};
}

test('a failed damage callback does not discard mob/chest despawns and the following drop', () => {
    const {client, receive, errors, messages: M} = setup();
    const failure = new Error('Damage feedback failed');
    const entities = new Set([42, 43]);
    const handled = [];
    client.onPlayerDamageMob(() => { throw failure; });
    client.onDespawnEntity(id => { entities.delete(id); handled.push(['despawn', id]); });
    client.onDropItem((item, mobId) => { handled.push(['drop', mobId, item]); });

    expect(() => receive([
        [M.DAMAGE, 42, 10], [M.DESPAWN, 42], [M.DESPAWN, 43], [M.DROP, 42, 99, 35, []],
    ])).not.toThrow();
    expect([...entities]).toEqual([]);
    expect(handled).toEqual([['despawn', 42], ['despawn', 43],
        ['drop', 42, {id: 99, kind: 35, wasDropped: true, playersInvolved: []}]]);
    expect(errors).toHaveBeenCalledWith('Failed to process game action', M.DAMAGE, failure);
    expect(errors).toHaveBeenCalledTimes(1);
});

test('a failed despawn does not prevent other entities from despawning', () => {
    const {client, receive, errors, messages: M} = setup();
    const removed = [];
    client.onDespawnEntity(id => {
        if (id === 42) throw new Error('Broken entity animation');
        removed.push(id);
    });
    expect(() => receive([[M.DESPAWN, 42], [M.DESPAWN, 43]])).not.toThrow();
    receive([[M.DESPAWN, 44]]);
    expect(removed).toEqual([43, 44]);
    expect(errors).toHaveBeenCalledTimes(1);
});

test('single actions report callback failures and later messages still work', () => {
    const {client, receive, errors, messages: M} = setup();
    const removed = jest.fn();
    client.onPlayerDamageMob(() => { throw new Error('Damage feedback failed'); });
    client.onDespawnEntity(removed);
    expect(() => receive([M.DAMAGE, 42, 10])).not.toThrow();
    receive([M.DESPAWN, 42]);
    expect(removed).toHaveBeenCalledWith(42);
    expect(errors).toHaveBeenCalledTimes(1);
});

test('successful batches preserve order and disabled clients ignore incoming actions', () => {
    const {client, receive, errors, messages: M} = setup();
    const handled = [];
    client.onPlayerDamageMob(id => handled.push(['damage', id]));
    client.onDespawnEntity(id => handled.push(['despawn', id]));
    receive([[M.DAMAGE, 42, 10], [M.DESPAWN, 42]]);
    client.disable();
    receive([[M.DESPAWN, 43]]);
    expect(handled).toEqual([['damage', 42], ['despawn', 42]]);
    expect(errors).not.toHaveBeenCalled();
});
