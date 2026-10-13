const fs = require('fs'), vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const Properties = require('./properties');
const Collectables = require('./collectables');
const {PlayerClassModifiers} = require('./playerclassmodifiers');
const {getConsumableEffects} = require('./consumableeffects');

function modifiers() {
    return new PlayerClassModifiers({getLooperModifierData: async () => ({xp: 1, moveSpeed: 1})}, 'local', 'fighter');
}
function player() {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module, Date, setTimeout: (...args) => setTimeout(...args), clearTimeout: timer => clearTimeout(timer),
        process: {env: {}}, Character: {extend: methods => methods},
        require: name => name === '../../shared/js/gametypes' ? Types
            : name === './looperlandsplatformclient.js' ? {LooperLandsPlatformClient: class {}} : {}
    });
    return {...module.exports, playerClassModifiers: modifiers(), consumableBuff: {}, invincible: false,
        getBot: () => ({playerClassModifiers: modifiers()}), equip: jest.fn(), broadcast: jest.fn(), regenHealthBy: jest.fn()};
}
beforeEach(() => {jest.useFakeTimers(); jest.setSystemTime(1000);});
afterEach(() => jest.useRealTimers());

test('a taco applies and reports 2x XP for 60 seconds, separate from its 120-second cooldown', async () => {
    const owner = player();
    await owner.playerClassModifiers.loadModifierData();
    Collectables.consume(String(Types.Entities.M88NTACO), owner);
    expect(owner.playerClassModifiers.xp).toBe(2);
    expect(getConsumableEffects(owner)).toEqual({effectsUpdatedAt: 1000,
        effects: [{id: 'xp', label: '2x XP', expiresAt: 61000}]});
    expect(Collectables.getCooldownData(Types.Entities.M88NTACO).duration).toBe(120000);
    jest.advanceTimersByTime(60000);
    expect(owner.playerClassModifiers.xp).toBe(1);
    expect(getConsumableEffects(owner).effects).toEqual([]);
});

const timedItems = Object.entries(Properties).filter(([, data]) => data?.consumable &&
    /applyTemporaryModifierWithTimeout|setDropOverride|startInvincibility/.test(String(data.onConsume))).map(([name]) => name);
test.each(timedItems)('%s reports its real timed effect', name => {
    const owner = player();
    const companion = {playerClassModifiers: modifiers()};
    owner.getBot = () => companion;
    Collectables.consume(Types.Entities[name.toUpperCase()], owner);
    const effects = getConsumableEffects(owner).effects;
    expect(effects).toHaveLength(1);
    expect(effects[0].label).toEqual(expect.any(String));
    expect(effects[0].expiresAt).toBeGreaterThan(Date.now());
});

test('independent player, companion and fish effects coexist and expire individually', () => {
    const owner = player(), companion = {playerClassModifiers: modifiers()};
    owner.getBot = () => companion;
    owner.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 60000);
    companion.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 3, 120000);
    owner.consumableBuff = {buff: {stat: 'atk', percent: 10}, expireTime: 301000};
    expect(getConsumableEffects(owner).effects.map(effect => effect.label)).toEqual(['2x XP', 'Companion 3x XP', '+10% attack']);
    jest.advanceTimersByTime(60000);
    expect(getConsumableEffects(owner).effects.map(effect => effect.id)).toEqual(['companion:xp', 'fish']);
    owner.getBot = () => undefined;
    expect(getConsumableEffects(owner).effects.map(effect => effect.id)).toEqual(['fish']);
    owner.isDead = true;
    expect(getConsumableEffects(owner).effects).toEqual([]);
    expect(getConsumableEffects(undefined).effects).toEqual([]);
});

test('healing and companion treats without a companion do not invent an active timer', () => {
    const owner = player();
    owner.getBot = () => undefined;
    Collectables.consume(Types.Entities.M88NCLOVER, owner);
    Collectables.consume(Types.Entities.M88NPIE, owner);
    expect(owner.regenHealthBy).toHaveBeenCalledWith(600);
    expect(getConsumableEffects(owner).effects).toEqual([]);
});

test('refreshing a drop override cancels the old expiration', () => {
    const owner = player();
    owner.setDropOverride(Types.Entities.WOOD, 10000);
    jest.advanceTimersByTime(5000);
    owner.setDropOverride(Types.Entities.ORE, 20000);
    jest.advanceTimersByTime(5000);
    expect(owner.dropOverride).toBe(Types.Entities.ORE);
    expect(getConsumableEffects(owner).effects[0]).toMatchObject({id: 'drops', expiresAt: 26000});
    jest.advanceTimersByTime(15000);
    expect(getConsumableEffects(owner).effects).toEqual([]);
});

test('invincibility uses its actual expiry and refreshes without an early timeout', () => {
    const owner = player();
    owner.startInvincibility();
    const duration = Types.timeouts[Types.Entities.FIREFOX];
    expect(getConsumableEffects(owner).effects).toEqual([{id: 'invincibility', label: 'Invincible', expiresAt: 1000 + duration}]);
    jest.advanceTimersByTime(1000);
    owner.startInvincibility();
    jest.advanceTimersByTime(duration - 1000);
    expect(owner.invincible).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(owner.invincible).toBe(false);
    expect(getConsumableEffects(owner).effects).toEqual([]);
});
