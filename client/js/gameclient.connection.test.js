const fs=require('fs'), vm=require('vm');
function fixture() {
    let methods;
    const sockets=[];
    const addError=jest.fn();
    vm.runInNewContext(fs.readFileSync(require.resolve('./gameclient'),'utf8'), {
        Class:{extend:value => value}, Types:{Messages:{}}, console,
        $:() => ({addClass:addError}),
        define:(_dependencies,factory) => {methods=factory();},
        io:() => {
            const handlers={};
            const socket={handlers,connected:true,on:jest.fn((event,callback) => {handlers[event]=callback;}),
                emit:jest.fn(),disconnect:jest.fn(),removeAllListeners:jest.fn(() => {
                    for (const event of Object.keys(handlers)) delete handlers[event];
                })};
            sockets.push(socket); return socket;
        }
    });
    const client=Object.assign(Object.create(methods), {protocol:'https',host:'game.test',port:443,mapId:'main',
        resetPendingSpawns:jest.fn(),disconnected_callback:jest.fn()});
    return {client,sockets,addError};
}
test('dispatcher asks again after a reconnect and closes before moving to the game socket', () => {
    const {client,sockets}=fixture();
    client.dispatched_callback=jest.fn(); client.connect(true);
    const dispatcher=sockets[0];
    dispatcher.handlers.connect(); dispatcher.handlers.connect();
    expect(dispatcher.emit.mock.calls).toEqual([['dispatch',true],['dispatch',true]]);
    dispatcher.handlers.dispatched({status:'OK',host:'game.test',port:443});
    expect(dispatcher.disconnect).toHaveBeenCalledTimes(1);
    expect(client.dispatched_callback).toHaveBeenCalledWith('game.test',443);
});
test('pre-welcome recovery disconnects retry quietly and normal disconnect behavior resumes after welcome', () => {
    const {client,sockets}=fixture();
    client.isRecovering=true; client.connect(false);
    sockets[0].handlers.disconnect();
    expect(client.disconnected_callback).not.toHaveBeenCalled();
    client.welcome_callback=jest.fn();
    client.receiveWelcome([1,42,'Player',16,210,41,'',1000]);
    expect(client.isRecovering).toBe(false);
    sockets[0].handlers.disconnect();
    expect(client.disconnected_callback).toHaveBeenCalledTimes(1);
});

test('disposing disconnects once and queued socket events cannot affect the destination map', () => {
    const {client,sockets,addError}=fixture();
    client.connected_callback=jest.fn(); client.receiveMessage=jest.fn();
    client.dynamicAppearances=new Map([[1,{nftId:'0xavatar'}]]);
    client.connect(false);
    const oldSocket=sockets[0], queuedMessage=oldSocket.handlers.message, queuedDisconnect=oldSocket.handlers.disconnect;

    client.dispose(); client.dispose();
    queuedMessage('go'); queuedMessage('timeout'); queuedMessage([1,42]); queuedDisconnect();
    client.sendMessage([1,42]); client.enable(); client.connect(false);

    expect(oldSocket.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(oldSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(client.connection).toBeNull();
    expect(client.isDisposed).toBe(true);
    expect(client.isListening).toBe(false);
    expect(client.dynamicAppearances.size).toBe(0);
    expect(client.resetPendingSpawns).toHaveBeenCalledTimes(1);
    expect(client.connected_callback).not.toHaveBeenCalled();
    expect(client.receiveMessage).not.toHaveBeenCalled();
    expect(client.isTimeout).toBeUndefined();
    expect(client.disconnected_callback).not.toHaveBeenCalled();
    expect(addError).not.toHaveBeenCalled();
    expect(oldSocket.emit).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(1);
});

test('dispatcher callbacks cannot reconnect after the game socket replaces it', () => {
    const {client,sockets}=fixture();
    client.dispatched_callback=jest.fn(() => client.connect(false));
    client.connected_callback=jest.fn();
    client.connect(true);
    const dispatcher=sockets[0], queuedDispatch=dispatcher.handlers.dispatched, queuedConnect=dispatcher.handlers.connect;
    queuedDispatch({status:'OK',host:'game.test',port:443});
    queuedConnect(); queuedDispatch({status:'OK',host:'stale.test',port:80});
    sockets[1].handlers.message('go');

    expect(dispatcher.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(dispatcher.disconnect).toHaveBeenCalledTimes(1);
    expect(dispatcher.emit).not.toHaveBeenCalled();
    expect(client.dispatched_callback).toHaveBeenCalledTimes(1);
    expect(client.connected_callback).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(2);
    expect(client.connection).toBe(sockets[1]);
});

test('replacing an existing connection ignores its queued handshake and disconnect', () => {
    const {client,sockets,addError}=fixture();
    client.connected_callback=jest.fn(); client.receiveMessage=jest.fn();
    client.connect(false);
    const oldSocket=sockets[0], queuedMessage=oldSocket.handlers.message, queuedDisconnect=oldSocket.handlers.disconnect;
    client.connect(false);
    queuedMessage('go'); queuedMessage([1,42]); queuedDisconnect();
    sockets[1].handlers.message('go');

    expect(oldSocket.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(oldSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(client.connected_callback).toHaveBeenCalledTimes(1);
    expect(client.receiveMessage).not.toHaveBeenCalled();
    expect(client.disconnected_callback).not.toHaveBeenCalled();
    expect(addError).not.toHaveBeenCalled();
});
