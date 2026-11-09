const fs = require('fs'), vm = require('vm');
function setup() {
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
        Types: {Entities: {FIREFOX: 20}, isArmor: kind => kind === 20 || kind === 21, isWeapon: () => true, hasShadow: () => true},
        define: (_, factory) => factory(), Class: {extend: value => {methods = value;}}, console,
    });
    const entities = {}, pending = [];
    const player = id => entities[id] = {
        id, spriteName: 'NFT_avatar', weaponName: 'NFT_weapon', sprite: {name: 'base'},
        startInvincibility() {this.invincible = true;}, stopInvincibility() {this.invincible = false;},
        setWeaponName(name) {this.weaponName = name;},
        setSprite(sprite) {this.sprite = this.normalSprite = sprite; this.animations = {atk_down: {name: 'atk_down'}};},
        idle: jest.fn(), currentAnimation: {name: 'atk_down', count: 1, speed: [40, 60], lastTime: 500,
            currentFrame: {index: 1, x: 32, y: 64}, endcount_callback: jest.fn()},
    };
    const game = Object.assign({}, methods, {
        player: player(1), sessionId: 'session', map: {}, sprites: {}, getEntityById: id => entities[id],
        app: {initEquipmentIcons: jest.fn(), updateWeaponAppearanceNotice: jest.fn(), showEvolutionNotification: jest.fn(),
            progressionCards: {refreshAvatar: jest.fn()}},
        worldFx: {evolve: jest.fn()}, audioManager: {playSound: jest.fn()},
        loadSprite: jest.fn(name => ({name, whenImageLoaded: () => new Promise(resolve => pending.push(resolve))})),
    });
    const appearance = (level = 1, tokenHash = 'base', canHoldWeapon = true) => ({nftId: '0xavatar', assetType: 'looper', tokenHash, evolutionLevel: level, canHoldWeapon});
    const loaded = async (index = pending.length - 1, success = true) => {pending[index](success); await Promise.resolve();};
    return {game, player, entities, pending, appearance, loaded};
}

test('initial form hydration is silent and preserves identity, weapon and attack animation', async () => {
    const {game, appearance, loaded} = setup();
    const animation = game.player.currentAnimation;
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false));
    expect(game.player.sprite.name).toBe('base');
    expect(game.player.avatarSpriteName).toBeUndefined();
    expect(game.player.canHoldWeapon).toBe(false);
    await loaded();
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved');
    expect(game.player.spriteName).toBe('NFT_avatar');
    expect(game.player.weaponName).toBe('NFT_weapon');
    expect(game.player.currentAnimation).toMatchObject(animation);
    expect(game.app.showEvolutionNotification).not.toHaveBeenCalled();
    expect(game.worldFx.evolve).not.toHaveBeenCalled();
});

test('a runtime evolution celebrates once after artwork is ready and updates the portrait', async () => {
    const {game, appearance, loaded, pending} = setup();
    game.applyAvatarAppearance(game.player, appearance()); await loaded();
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false), true);
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false), true);
    expect(pending).toHaveLength(2);
    expect(game.worldFx.evolve).not.toHaveBeenCalled();
    await loaded();
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false), true);
    expect(game.worldFx.evolve).toHaveBeenCalledTimes(1);
    expect(game.app.showEvolutionNotification).toHaveBeenCalledWith(appearance(10, 'evolved', false));
    expect(game.player.dynamicArmorNFTData.tokenHash).toBe('evolved');
    expect(game.app.progressionCards.refreshAvatar).toHaveBeenCalledTimes(2);
});

test('two holders of the same NFT retain separate renderer images at different levels', async () => {
    const {game, player, appearance, loaded} = setup(), other = player(2);
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false));
    game.applyAvatarAppearance(other, appearance());
    await loaded(0); await loaded(1);
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved');
    expect(other.sprite.name).toBe('NFT_avatar__form_base');
    expect(Object.keys(game.sprites)).toHaveLength(2);
    expect(other.canHoldWeapon).toBe(true);
});

test('a superseded image cannot roll back the avatar or replay a celebration', async () => {
    const {game, appearance, loaded} = setup();
    game.applyAvatarAppearance(game.player, appearance()); await loaded();
    game.applyAvatarAppearance(game.player, appearance(10, 'stage-two'), true);
    game.applyAvatarAppearance(game.player, appearance(20, 'stage-three', false), true);
    await loaded(2); await loaded(1);
    expect(game.player.sprite.name).toBe('NFT_avatar__form_stage-three');
    expect(game.player.canHoldWeapon).toBe(false);
    expect(game.worldFx.evolve).toHaveBeenCalledTimes(1);
});

test.each(['map', 'session', 'removed'])('a pending image is abandoned after %s changes', async reason => {
    const {game, player, entities, appearance, loaded} = setup(), other = player(2);
    game.applyAvatarAppearance(other, appearance(10, 'evolved'));
    if (reason === 'map') game.map = {};
    if (reason === 'session') game.sessionId = 'next';
    if (reason === 'removed') delete entities[2];
    await loaded();
    expect(other.sprite.name).toBe('base');
    expect(game.worldFx.evolve).not.toHaveBeenCalled();
});

test('failed artwork leaves the avatar visible and can retry from a fresh snapshot', async () => {
    const {game, appearance, loaded} = setup();
    game.applyAvatarAppearance(game.player, appearance(10, 'broken', false));
    await loaded(0, false);
    expect(game.player.sprite.name).toBe('base');
    expect(game.player.avatarSpriteName).toBeUndefined();
    expect(game.player.canHoldWeapon).toBe(false);
    game.applyAvatarAppearance(game.player, appearance(10, 'broken', false));
    expect(game.loadSprite).toHaveBeenCalledTimes(2);
    await loaded(1);
    expect(game.player.sprite.name).toBe('NFT_avatar__form_broken');
});

test('legacy and malformed appearance data leaves existing rendering unchanged', () => {
    const {game, appearance} = setup();
    for (const value of [null, {}, {...appearance(), tokenHash: ''}, {...appearance(), evolutionLevel: -1}]) {
        game.applyAvatarAppearance(game.player, value);
    }
    expect(game.loadSprite).not.toHaveBeenCalled();
    expect(game.player.sprite.name).toBe('base');
});


test('temporary transformations restore the evolved form without changing the equipped weapon', async () => {
    const {game, appearance, loaded} = setup();
    game.sprites.firefox = {name: 'firefox'};
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false)); await loaded();
    game.applyEquipmentAppearance(game.player, 'firefox', 20);
    expect(game.player.sprite.name).toBe('firefox'); expect(game.player.invincible).toBe(true);
    game.applyEquipmentAppearance(game.player, 'NFT_avatar', 21); await loaded();
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved');
    expect(game.player.invincible).toBe(false); expect(game.player.weaponName).toBe('NFT_weapon');
    expect(game.worldFx.evolve).not.toHaveBeenCalled();
});

test('an evolution unlocked during a temporary transformation waits to reveal and celebrate', async () => {
    const {game, appearance, loaded} = setup();
    game.sprites.firefox = {name: 'firefox'};
    game.applyAvatarAppearance(game.player, appearance()); await loaded();
    game.applyEquipmentAppearance(game.player, 'firefox', 20);
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false), true); await loaded();
    expect(game.player.sprite.name).toBe('firefox');
    expect(game.worldFx.evolve).not.toHaveBeenCalled();
    game.applyEquipmentAppearance(game.player, 'NFT_avatar', 21); await loaded();
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved');
    expect(game.worldFx.evolve).toHaveBeenCalledTimes(1);
});

test('an image finishing after death cannot replace death artwork or replay its celebration on revive', async () => {
    const {game, appearance, loaded} = setup();
    game.applyAvatarAppearance(game.player, appearance()); await loaded();
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved'), true);
    game.player.isDead = true; game.player.sprite = {name: 'death'}; await loaded();
    expect(game.player.sprite.name).toBe('death'); expect(game.worldFx.evolve).not.toHaveBeenCalled();
    game.player.isDead = false; game.applyAvatarAppearance(game.player, appearance(10, 'evolved')); await loaded();
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved'); expect(game.worldFx.evolve).not.toHaveBeenCalled();
});
