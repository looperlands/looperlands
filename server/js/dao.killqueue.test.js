const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadDao(storeKills) {
    let tick;
    const sandbox = {
        console,
        module: { exports: {} },
        process: { env: {} },
        setInterval: callback => { tick = callback; return 1; },
        require: id => {
            if (id === 'node-cache') return class {};
            if (id === './looperlandsplatformclient.js') return {
                LooperLandsPlatformClient: class { constructor() { this.storeKills = storeKills; } }
            };
            return {};
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'dao.js'), 'utf8'), sandbox);
    return { dao: sandbox.module.exports, tick: () => tick() };
}

test('does not resubmit a slow batch and preserves kills collected during it', async () => {
    let resolve;
    const first = new Promise(done => { resolve = done; });
    const save = jest.fn().mockReturnValueOnce(first).mockResolvedValue(undefined);
    const { dao, tick } = loadDao(save);
    await dao.saveMobKillEvent('asset', 'first');
    const request = tick();
    await dao.saveMobKillEvent('asset', 'second');
    await tick();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].map(event => event.mob)).toEqual(['first']);
    resolve();
    await request;
    await tick();
    expect(save.mock.calls[1][0].map(event => event.mob)).toEqual(['second']);
    await tick();
    expect(save).toHaveBeenCalledTimes(2);
});

test('restores a failed batch ahead of kills collected during the request', async () => {
    let reject;
    const first = new Promise((resolve, fail) => { reject = fail; });
    const save = jest.fn().mockReturnValueOnce(first).mockResolvedValue(undefined);
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        const { dao, tick } = loadDao(save);
        await dao.saveMobKillEvent('asset', 'first');
        const request = tick();
        await dao.saveMobKillEvent('asset', 'second');
        reject(new Error('offline'));
        await request;
        await tick();
        expect(save.mock.calls[1][0].map(event => event.mob)).toEqual(['first', 'second']);
        await tick();
        expect(save).toHaveBeenCalledTimes(2);
    } finally {
        errors.mockRestore();
    }
});
