const fs = require('fs');
const vm = require('vm');

test('platform shutdown waits for activity persistence before exiting', async () => {
    const handlers = {};
    const processStub = {env: {}, on: (event, handler) => {handlers[event] = handler;}, exit: jest.fn()};
    const moduleStub = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./looperlandsplatformclient'), 'utf8'), {
        module: moduleStub, exports: moduleStub.exports, process: processStub, console,
        require: () => ({create: () => ({})}),
    });
    const client = new moduleStub.exports.LooperLandsPlatformClient('key', 'https://example.test');
    let release;
    client.beforeShutdown = () => new Promise(resolve => {release = resolve;});
    client.takeGameServerOffline = jest.fn(async () => {});
    const shutdown = handlers.SIGTERM();
    await Promise.resolve();
    expect(client.takeGameServerOffline).not.toHaveBeenCalled();
    expect(processStub.exit).not.toHaveBeenCalled();
    release(); await shutdown;
    expect(client.takeGameServerOffline).toHaveBeenCalledTimes(1);
    expect(processStub.exit).toHaveBeenCalledWith(0);
});
