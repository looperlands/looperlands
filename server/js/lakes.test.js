global.Types = {};
const fs = require('fs');
const vm = require('vm');
const Lakes = require('./lakes');
const Utils = require('./utils');

afterEach(() => jest.restoreAllMocks());

const rolls = [
    ['common', 0], ['uncommon', 700], ['rare', 943], ['epic', 983], ['legendary', 998],
];

test.each(rolls)('every lake produces a valid catch when rolling %s', (rarity, roll) => {
    jest.spyOn(Utils, 'random').mockReturnValue(roll);
    for (const [name, lake] of Object.entries(Lakes).filter(([, lake]) => lake.fish)) {
        const fish = Lakes.getRandomFish(name, false);
        const expectedRarity = Object.values(lake.fish).includes(rarity) ? rarity : 'common';
        expect({lake: name, rarity: lake.fish[fish]}).toEqual({lake: name, rarity: expectedRarity});
        expect(Lakes.getFishSpeed(fish, name)).toBeGreaterThan(0);
        expect(Lakes.calculateFishExp(fish, name)).toBeGreaterThan(0);
    }
});

test('lucky catches also recover when both rolls select a missing rarity', () => {
    jest.spyOn(Utils, 'random').mockReturnValue(998);
    for (const [name, lake] of Object.entries(Lakes).filter(([, lake]) => lake.fish)) {
        const fish = Lakes.getRandomFish(name, true);
        const expectedRarity = Object.values(lake.fish).includes('legendary') ? 'legendary' : 'common';
        expect({lake: name, rarity: lake.fish[fish]}).toEqual({lake: name, rarity: expectedRarity});
    }
});

test.each([[943, 998], [998, 943]])('lucky keeps the rarer fish when one roll falls back (%s, %s)', (first, second) => {
    jest.spyOn(Utils, 'random').mockReturnValueOnce(first).mockReturnValueOnce(second);
    expect(Lakes.getRandomFish('m88nocean1', true)).toBe('m88nclam');
});

test.each([false, true])('a missing rarity returns an allowed fishing response and a server pending catch (lucky=%s)', async lucky => {
    jest.spyOn(Utils, 'random').mockReturnValue(943); // This pond has common and uncommon fish only.
    const player = {
        getNFTWeapon: () => ({getLevel: () => 1}),
        getNFTSpecialItemActiveTrait: () => lucky ? 'lucky' : null,
        playerClassModifiers: {isModiferActive: () => false},
    };
    const world = {getPlayerById: () => player, announceSpawnFloat: jest.fn()};
    let handler;
    const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
    const start = source.indexOf('        app.get("/session/:sessionId/requestFish/');
    const end = source.indexOf('        app.post(', start);
    vm.runInNewContext(source.slice(start, end), {
        app: {get: (url, callback) => { handler = callback; }}, Lakes,
        cache: {get: () => ({mapId: 'main', entityId: 1})},
        self: {worldsMap: {main: world}},
    });
    const res = {status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn()};
    await handler({params: {sessionId: 'session', lakeName: 'm88nDreamPond1', x: '2', y: '3'}}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({allowed: true, fish: 'm88ndreamduckyy'}));
    expect(player.pendingFish).toEqual(expect.objectContaining({name: 'm88ndreamduckyy', lakeName: 'm88nDreamPond1'}));
    expect(world.announceSpawnFloat).toHaveBeenCalledWith(player, '2', '3');
});
