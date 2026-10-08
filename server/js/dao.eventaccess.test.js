const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadDao(enabled, client) {
    class Cache {
        constructor() {this.values = new Map();}
        get(key) {return this.values.get(key);}
        set(key, value) {this.values.set(key, value);}
    }
    const sandbox = {
        console: {error: jest.fn(), log: jest.fn()}, module: {exports: {}},
        process: {env: {EVENT_EQUIPMENT_ENABLED: String(enabled)}}, setInterval: jest.fn(),
        require: id => {
            if (id === 'node-cache') return Cache;
            if (id === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: class {constructor() {Object.assign(this, client);}}};
            return {};
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'dao.js'), 'utf8'), sandbox);
    return sandbox.module.exports;
}

test('expired event avatar and weapon access cannot reuse a cached positive ownership result', async () => {
    const client = {checkOwnership: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)};
    const dao = loadDao(true, client);
    expect(await dao.walletHasNFT('wallet', 'rental')).toBe(true);
    expect(await dao.walletHasNFT('wallet', 'rental')).toBe(false);
    expect(client.checkOwnership).toHaveBeenCalledTimes(2);
});

test('ordinary ownership keeps its existing cache when event equipment is disabled', async () => {
    const client = {checkOwnership: jest.fn().mockResolvedValue(true)};
    const dao = loadDao(false, client);
    expect(await dao.walletHasNFT('wallet', 'owned')).toBe(true);
    expect(await dao.walletHasNFT('wallet', 'owned')).toBe(true);
    expect(client.checkOwnership).toHaveBeenCalledTimes(1);
});
