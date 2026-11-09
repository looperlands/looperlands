const fs = require('fs'), vm = require('vm');
function setup() {
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
        Types: {Entities: {FIREFOX: 20}, isArmor: kind => kind === 20 || kind === 21, isWeapon: () => true, hasShadow: () => true},
        define: (_, factory) => factory(), Class: {extend: value => {methods = value;}}, console, setTimeout, clearTimeout,
    });
    const entities = {}, pending = [];
    const player = id => entities[id] = {
        id, canHoldWeapon: true, spriteName: 'NFT_avatar', weaponName: 'NFT_weapon', sprite: {name: 'base'},
        startInvincibility() {this.invincible = true;}, stopInvincibility() {this.invincible = false;},
        setWeaponName(name) {this.weaponName = name;},
        setSprite(sprite) {this.sprite = this.normalSprite = sprite; this.animations = {atk_down: {name: 'atk_down'}};},
        idle: jest.fn(), currentAnimation: {name: 'atk_down', count: 1, speed: [40, 60], lastTime: 500,
            currentFrame: {index: 1, x: 32, y: 64}, endcount_callback: jest.fn()},
    };
    const game = Object.assign({}, methods, {
        player: player(1), sessionId: 'session', map: {}, sprites: {}, getEntityById: id => entities[id],
        app: {initEquipmentIcons: jest.fn(), updateWeaponAppearanceNotice: jest.fn(), showEvolutionNotification: jest.fn(), hideEvolutionNotification: jest.fn(),
            progressionCards: {refreshAvatar: jest.fn()}},
        worldFx: {evolve: jest.fn(), cancelEvolution: jest.fn()}, audioManager: {playSound: jest.fn()},
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


test('invincibility preserves the evolved form and selected weapon', async () => {
    const {game, appearance, loaded} = setup();
    game.sprites.firefox = {name: 'firefox'};
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false)); await loaded();
    game.applyEquipmentAppearance(game.player, 'firefox', 20);
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved'); expect(game.player.invincible).toBe(true);
    game.applyEquipmentAppearance(game.player, 'NFT_avatar', 21); await loaded();
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved');
    expect(game.player.invincible).toBe(false); expect(game.player.weaponName).toBe('NFT_weapon');
    expect(game.worldFx.evolve).not.toHaveBeenCalled();
});

test('an evolution unlocked during invincibility can reveal and celebrate', async () => {
    const {game, appearance, loaded} = setup();
    game.sprites.firefox = {name: 'firefox'};
    game.applyAvatarAppearance(game.player, appearance()); await loaded();
    game.applyEquipmentAppearance(game.player, 'firefox', 20);
    game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false), true); await loaded();
    expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved');
    expect(game.worldFx.evolve).toHaveBeenCalledTimes(1);
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


describe('a paced evolution reveal', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    async function anticipate() {
        const fixture = setup(), {game, appearance, loaded} = fixture;
        game.worldFx.evolve.mockReturnValue(1800);
        game.applyAvatarAppearance(game.player, appearance()); await loaded();
        game.applyAvatarAppearance(game.player, appearance(10, 'evolved', false), true); await loaded();
        return fixture;
    }

    test('keeps the old form and weapon through anticipation, then reveals using the current scale', async () => {
        const {game, appearance} = await anticipate();
        expect(game.player.sprite.name).toBe('NFT_avatar__form_base');
        expect(game.player.canHoldWeapon).toBe(true);
        expect(game.player.dynamicArmorNFTData.tokenHash).toBe('base');
        expect(game.app.showEvolutionNotification).toHaveBeenLastCalledWith(appearance(10, 'evolved', false), true);
        expect(game.audioManager.playSound).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1799);
        expect(game.player.sprite.name).toBe('NFT_avatar__form_base');
        const resized = {name: 'NFT_avatar__form_evolved', scale: 3};
        game.sprites.NFT_avatar__form_evolved = resized;
        jest.advanceTimersByTime(1);
        expect(game.player.sprite).toBe(resized);
        expect(game.player.canHoldWeapon).toBe(false);
        expect(game.player.avatarAppearanceRequest).toBeNull();
        expect(game.player.currentAnimation.name).toBe('atk_down');
        expect(game.app.showEvolutionNotification).toHaveBeenLastCalledWith(appearance(10, 'evolved', false));
        expect(game.audioManager.playSound).toHaveBeenCalledTimes(1);
    });

    test('a newer form cancels the old timer and starts its own anticipation', async () => {
        const {game, appearance, loaded} = await anticipate();
        jest.advanceTimersByTime(1000);
        game.applyAvatarAppearance(game.player, appearance(20, 'final'), true); await loaded();
        expect(game.app.hideEvolutionNotification).toHaveBeenCalledTimes(1);
        expect(game.worldFx.cancelEvolution).toHaveBeenCalledWith(game.player);
        jest.advanceTimersByTime(800);
        expect(game.player.sprite.name).toBe('NFT_avatar__form_base');
        jest.advanceTimersByTime(1000);
        expect(game.player.sprite.name).toBe('NFT_avatar__form_final');
        expect(game.audioManager.playSound).toHaveBeenCalledTimes(1);
    });

    test.each(['map', 'session', 'stop', 'dead', 'dying', 'removed'])('a reveal canceled by %s clears its ceremony and permits a later snapshot', async reason => {
        const {game, entities, appearance, loaded} = await anticipate();
        const actor = game.player;
        if (reason === 'map') game.map = {};
        if (reason === 'session') game.sessionId = 'next';
        if (reason === 'stop') game.isStopped = true;
        if (reason === 'dead') actor.isDead = true;
        if (reason === 'dying') actor.isDying = true;
        if (reason === 'removed') {game.player = {}; delete entities[actor.id];}
        jest.advanceTimersByTime(1800);
        expect(actor.sprite.name).toBe('NFT_avatar__form_base');
        expect(actor.avatarAppearanceRequest).toBeNull();
        expect(game.worldFx.cancelEvolution).toHaveBeenCalledWith(actor);
        expect(game.audioManager.playSound).not.toHaveBeenCalled();
        if (reason !== 'removed') expect(game.app.hideEvolutionNotification).toHaveBeenCalled();
        game.player = actor; entities[actor.id] = actor;
        game.isStopped = actor.isDead = actor.isDying = false;
        game.applyAvatarAppearance(actor, appearance(10, 'evolved', false)); await loaded();
        expect(actor.sprite.name).toBe('NFT_avatar__form_evolved');
        expect(game.worldFx.evolve).toHaveBeenCalledTimes(1);
    });

    test('explicit lifecycle cancellation dismisses anticipation immediately and cannot reveal later', async () => {
        const {game} = await anticipate();
        game.cancelAvatarAppearance(game.player);
        expect(game.app.hideEvolutionNotification).toHaveBeenCalled();
        expect(game.worldFx.cancelEvolution).toHaveBeenCalledWith(game.player);
        jest.advanceTimersByTime(1800);
        expect(game.player.sprite.name).toBe('NFT_avatar__form_base');
        expect(game.audioManager.playSound).not.toHaveBeenCalled();
    });

    test('dying during an invincible anticipation cancels the reveal', async () => {
        const {game} = await anticipate();
        game.applyEquipmentAppearance(game.player, 'firefox', 20);
        game.player.isDead = true;
        game.cancelAvatarAppearance(game.player);
        jest.advanceTimersByTime(1800);
        expect(game.player.sprite.name).toBe('NFT_avatar__form_base');
        expect(game.audioManager.playSound).not.toHaveBeenCalled();
    });

    test('invincibility starting during anticipation preserves the scheduled reveal', async () => {
        const {game} = await anticipate();
        game.applyEquipmentAppearance(game.player, 'firefox', 20);
        expect(game.player.sprite.name).toBe('NFT_avatar__form_base');
        jest.advanceTimersByTime(1800);
        expect(game.player.sprite.name).toBe('NFT_avatar__form_evolved');
        expect(game.player.invincible).toBe(true);
        expect(game.audioManager.playSound).toHaveBeenCalledTimes(1);
    });
});
