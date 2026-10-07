global.Types = {};
const Types = require('../../shared/js/gametypes');
const Collectables = require('./collectables');
const Properties = require('./properties');
const Lakes = require('./lakes');

// A gifted consumable must still work through the normal inventory dispatcher.
const consumables = Object.entries(Properties).filter(([, data]) => data?.consumable && data.onConsume).map(([name]) => name);
test.each(consumables)('giftable %s dispatches exactly one inventory effect', name => {
    const effect = jest.fn();
    const player = {
        regenHealthBy: effect, startInvincibility: effect, releaseMob: effect,
        releaseNpc: effect, releaseItem: effect, setDropOverride: effect,
        playerClassModifiers: {applyTemporaryModifierWithTimeout: effect},
        getBot: () => ({playerClassModifiers: {applyTemporaryModifierWithTimeout: effect}})
    };
    const kind = Types.Entities[name.toUpperCase()];
    expect(kind).toBeDefined();
    expect(Collectables.isCollectable(kind)).toBe(true);
    expect(Collectables.isConsumable(kind)).toBe(true);
    Collectables.consume(kind, player);
    expect(effect).toHaveBeenCalledTimes(1);
    expect(typeof Collectables.getCollectableImageName(kind)).toBe('string');
    expect(Collectables.getCollectAmount(kind)).toBeGreaterThan(0);
    expect(Collectables.getCollectItem(kind)).toBeDefined();
    expect(Collectables.getCooldownData(kind)).toBeDefined();
    Collectables.getEffectDescription(kind);
});

test('potions preserve healing and companion items are harmless without a companion', () => {
    const heal = jest.fn();
    Collectables.consume(Types.Entities.CPOTION_S, {regenHealthBy: heal});
    expect(heal).toHaveBeenCalledWith(75);
    Collectables.consume(Types.Entities.M88NCLOVER, {getBot: () => undefined});
    expect(Collectables.isConsumable(Types.Entities.GOLD)).toBe(false);
    expect(Collectables.isConsumable('unknown-item')).toBe(false);
    expect(Collectables.getInventoryDescription('unknown-item')).toBe('');
    expect(Collectables.getEffectDescription('unknown-item')).toBe('');
    expect(Collectables.getCooldownData('unknown-item')).toEqual({duration: 0, group: ''});
    expect(Collectables.getCollectItem('unknown-item')).toBe('unknown-item');
    expect(Collectables.getCollectAmount('unknown-item')).toBe(1);
    expect(Collectables.getCollectableImageName('unknown-item')).toBe('unknown-item');
    expect(Collectables.isCollectable('unknown-item')).toBe(false);
    expect(Properties.getCdItemsByGroup('healing')).toEqual(expect.any(Array));
});

test('consumable fish retain descriptions and gift eligibility while ordinary fish are excluded', () => {
    expect(Collectables.isConsumable('cobparadisefish')).toBe(true);
    expect(Collectables.getInventoryDescription('cobparadisefish')).toBe('5% hp');
    expect(Lakes.getBuffByFish('cobguppy')).toBe(false);
    expect(Collectables.isConsumable('cobguppy')).toBe(false);
    expect(Collectables.getCollectItem('cobparadisefish')).toBe('cobparadisefish');
    expect(Collectables.getCollectAmount('cobparadisefish')).toBe(1);
    expect(Collectables.getCollectableImageName('cobparadisefish')).toBe('cobparadisefish');
});
