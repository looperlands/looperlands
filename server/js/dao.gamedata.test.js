const fs = require('fs');
const vm = require('vm');

function loadDao(getGameData) {
    const sandbox = {
        console: {error: jest.fn(), log: jest.fn()}, module: {exports: {}}, process: {env: {}},
        require: name => {
            if (name === 'node-cache') return class {};
            if (name === './looperlandsplatformclient.js') return {
                LooperLandsPlatformClient: class {constructor() {this.getGameData = getGameData;}}
            };
            return {};
        }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./dao'), 'utf8'), sandbox);
    return sandbox.module.exports;
}

test.each([undefined, {}, {items: [], quests: null}])('invalid platform data %j rejects instead of producing a playable empty inventory', async response => {
    const dao = loadDao(jest.fn().mockResolvedValue(response));
    await expect(dao.loadAvatarGameData('avatar')).rejects.toBeDefined();
});

test('platform failures propagate and a later request can load existing inventory', async () => {
    const getGameData = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
        kills: {rat: 3}, items: [{item: 'gold', quantity: 42}], quests: [{questKey: 'first', status: 'COMPLETED'}], choices: {}
    });
    const {loadAvatarGameData} = loadDao(getGameData);
    await expect(loadAvatarGameData('avatar')).rejects.toThrow('offline');
    await expect(loadAvatarGameData('avatar')).resolves.toEqual({
        mobKills: {rat: 3}, items: {gold: 42}, quests: {COMPLETED: [{questKey: 'first', status: 'COMPLETED'}]}, choices: {}
    });
});

test('explicit retries work without a DAO method receiver', async () => {
    const getGameData = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({kills: {}, items: [], quests: []});
    const {loadAvatarGameData} = loadDao(getGameData);
    await expect(loadAvatarGameData('avatar', 2)).resolves.toMatchObject({items: {}, quests: {}});
    expect(getGameData).toHaveBeenCalledTimes(2);
});
