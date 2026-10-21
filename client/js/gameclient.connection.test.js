const fs=require('fs'), vm=require('vm');
function fixture() {
    let methods;
    const sockets=[];
    vm.runInNewContext(fs.readFileSync(require.resolve('./gameclient'),'utf8'), {
        Class:{extend:value => value}, Types:{Messages:{}}, console,
        $:() => ({addClass:jest.fn()}),
        define:(_dependencies,factory) => {methods=factory();},
        io:() => {
            const handlers={};
            const socket={handlers,on:jest.fn((event,callback) => {handlers[event]=callback;}),emit:jest.fn(),disconnect:jest.fn()};
            sockets.push(socket); return socket;
        }
    });
    const client=Object.assign(Object.create(methods), {protocol:'https',host:'game.test',port:443,mapId:'main',
        resetPendingSpawns:jest.fn(),disconnected_callback:jest.fn()});
    return {client,sockets};
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
