const fs = require('fs');
const path = require('path');
const vm = require('vm');
const syncExperience = require('./experiencesync.js');

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function createAsset(kind, save) {
    const formulas = { level: () => 1, toolLevel: () => 1, MAX_LEVEL: 100 };
    const dao = { updateExperience: save, saveNFTWeaponExperience: save, saveNFTSpecialItemExperience: save };
    const sandbox = {
        console,
        exports: {},
        module: { exports: {} },
        process: { env: {} },
        Character: { extend: definition => definition },
        require: id => {
            if (id === './dao.js') return dao;
            if (id === './formulas' || id === './formulas.js') return formulas;
            if (id === './experiencesync.js') return syncExperience;
            if (id === './looperlandsplatformclient.js') return { LooperLandsPlatformClient: class {} };
            return {};
        }
    };
    const filename = kind === 'avatar' ? 'player.js' : kind === 'weapon' ? 'nftweapon.js' : 'nftspecialitem.js';
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, filename), 'utf8'), sandbox, { filename });

    let owner, readXp, addXp;
    if (kind === 'avatar') {
        const session = { xp: 10000 };
        owner = {
            ...sandbox.module.exports,
            accumulatedExperience: 0,
            nftId: 'asset',
            sessionId: 'session',
            level: 1,
            server: { server: { cache: { get: () => session, set: jest.fn() } } }
        };
        readXp = () => session.xp;
        addXp = xp => owner.handleExperience(xp);
    } else {
        owner = kind === 'weapon'
            ? new sandbox.exports.NFTWeapon('wallet', 'NFT_asset', { playerClassModifiers: { xp: 1 } })
            : new sandbox.exports.NFTSpecialItem('wallet', 'NFT_asset');
        owner.experience = 10000;
        readXp = () => owner.experience;
        addXp = xp => owner.incrementExperience(kind === 'weapon' ? xp * 4 : xp);
    }
    return { owner, readXp, addXp, sync: () => owner.syncExperience() };
}

describe.each(['avatar', 'weapon', 'tool'])('%s XP persistence', kind => {
    let errors;
    beforeEach(() => { errors = jest.spyOn(console, 'error').mockImplementation(() => {}); });
    afterEach(() => { errors.mockRestore(); });

    test('combines all targets in one attack into one exact XP increment', async () => {
        const save = jest.fn().mockResolvedValue(11000);
        const asset = createAsset(kind, save);
        await Promise.all(Array.from({ length: 10 }, () => asset.addXp(100)));
        await asset.sync();
        expect(save).toHaveBeenCalledTimes(1);
        expect(save.mock.calls[0].at(-1)).toBe(1000);
        expect(asset.owner.accumulatedExperience).toBe(0);
        expect(asset.readXp()).toBe(11000);
    });

    test('preserves subthreshold XP earned while the response is pending', async () => {
        const first = deferred();
        const save = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(10700);
        const asset = createAsset(kind, save);
        const started = asset.addXp(600);
        await Promise.resolve();
        await asset.addXp(100);
        expect(save).toHaveBeenCalledTimes(1);
        first.resolve(10600);
        await started;
        await Promise.resolve();
        expect(asset.readXp()).toBe(10700);
        expect(asset.owner.accumulatedExperience).toBe(100);
        await asset.sync();
        expect(save.mock.calls.map(call => call.at(-1))).toEqual([600, 100]);
        expect(asset.readXp()).toBe(10700);
    });

    test('serializes a second full batch without resending the first', async () => {
        const first = deferred(), second = deferred();
        const save = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        const asset = createAsset(kind, save);
        const a = asset.addXp(600);
        await Promise.resolve();
        const b = asset.addXp(600);
        expect(save).toHaveBeenCalledTimes(1);
        first.resolve(10600);
        await Promise.resolve();
        await Promise.resolve();
        expect(save.mock.calls.map(call => call.at(-1))).toEqual([600, 600]);
        second.resolve(11200);
        await Promise.all([a, b]);
        await asset.sync();
        expect(asset.readXp()).toBe(11200);
        expect(asset.owner.accumulatedExperience).toBe(0);
    });

    test('an explicit flush during a request also drains smaller pending rewards', async () => {
        const first = deferred();
        const save = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(10620);
        const asset = createAsset(kind, save);
        const started = asset.addXp(600);
        await Promise.resolve();
        await asset.addXp(20);
        const flushed = asset.sync();
        first.resolve(10600);
        await Promise.all([started, flushed]);
        expect(save.mock.calls.map(call => call.at(-1))).toEqual([600, 20]);
        expect(asset.readXp()).toBe(10620);
        expect(asset.owner.accumulatedExperience).toBe(0);
    });

    test.each(['rejection', 'invalid response'])('retains pending XP after %s and permits a later flush', async failure => {
        const first = deferred();
        const save = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(10620);
        const asset = createAsset(kind, save);
        const started = asset.addXp(600);
        await Promise.resolve();
        await asset.addXp(20);
        const inFlight = asset.sync();
        if (failure === 'rejection') first.reject(new Error('offline'));
        else first.resolve(undefined);
        await Promise.all([started, inFlight]);
        expect(asset.owner.accumulatedExperience).toBe(620);
        expect(save).toHaveBeenCalledTimes(1);
        expect(errors).toHaveBeenCalled();
        await asset.sync();
        expect(save.mock.calls.map(call => call.at(-1))).toEqual([600, 620]);
        expect(asset.readXp()).toBe(10620);
        expect(asset.owner.accumulatedExperience).toBe(0);
    });

    test('does not write zero XP on an empty flush', async () => {
        const save = jest.fn();
        await createAsset(kind, save).sync();
        expect(save).not.toHaveBeenCalled();
    });
});

test('different assets can persist independently', async () => {
    const first = deferred(), second = deferred();
    const a = createAsset('weapon', jest.fn().mockReturnValue(first.promise));
    const b = createAsset('weapon', jest.fn().mockReturnValue(second.promise));
    const jobs = [a.addXp(600), b.addXp(700)];
    await Promise.resolve();
    first.resolve(10600);
    second.resolve(10700);
    await Promise.all(jobs);
    await Promise.all([a.sync(), b.sync()]);
    expect(a.readXp()).toBe(10600);
    expect(b.readXp()).toBe(10700);
});
