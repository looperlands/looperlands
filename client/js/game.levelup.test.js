const fs = require('fs'), vm = require('vm');
function setup() {
    let methods;
    const elements = new Map();
    const $ = selector => {
        if (!elements.has(selector)) elements.set(selector, {text: jest.fn(), show: jest.fn(), hide: jest.fn(), html: jest.fn()});
        return elements.get(selector);
    };
    const axios = {get: jest.fn()};
    vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
        define: (_, factory) => factory(), Class: {extend: value => { methods = value; }}, $, axios, console,
    });
    const companion = {id: 2, x: 40, y: 80};
    const game = Object.assign({}, methods, {sessionId: 'one', player: {id: 1, weaponName: 'sword1'},
        sprites: {}, app: {showLevelUpNotification: jest.fn()}, worldFx: {levelUp: jest.fn()},
        getEntityById: id => id === 2 ? companion : undefined});
    const stats = (avatar = 4, weapon = 3, bot = 2, assetId = 10) => ({
        avatarLevelInfo: {currentLevel: avatar, percentage: 0},
        weaponInfo: {assetId, weaponLevelInfo: {currentLevel: weapon, percentage: 0}},
        botInfo: {assetId: 'bot', entityId: 2, currentLevel: bot, percentage: 0}
    });
    return {game, stats, axios, elements, companion};
}
test('initial loads are silent, zero-percent upgrades celebrate all assets once at their map entity', async () => {
    const {game, stats, axios, companion} = setup();
    axios.get.mockResolvedValue({data: stats()}); await game.renderStatistics();
    expect(game.app.showLevelUpNotification).not.toHaveBeenCalled();
    axios.get.mockResolvedValue({data: stats(5, 4, 3)}); await game.renderStatistics(); await game.renderStatistics();
    expect(game.app.showLevelUpNotification).toHaveBeenCalledTimes(1);
    expect(game.app.showLevelUpNotification).toHaveBeenCalledWith([
        {label: 'Avatar', level: 5}, {label: 'Weapon', level: 4}, {label: 'Companion', level: 3}
    ]);
    expect(game.worldFx.levelUp).toHaveBeenCalledWith(companion, 'Companion');
    expect(game.player.level).toBe(5);
});
test('equipment changes and new sessions establish their own baselines', () => {
    const {game, stats} = setup();
    game.notifyAssetLevelUps(stats()); game.notifyAssetLevelUps(stats(4, 20, 2, 11));
    expect(game.app.showLevelUpNotification).not.toHaveBeenCalled();
    game.notifyAssetLevelUps(stats(4, 21, 2, 11));
    expect(game.app.showLevelUpNotification).toHaveBeenCalledWith([{label: 'Weapon', level: 21}]);
    game.app.showLevelUpNotification.mockClear(); game.sessionId = 'two';
    game.notifyAssetLevelUps(stats(50, 50, 50)); expect(game.app.showLevelUpNotification).not.toHaveBeenCalled();
});
test('tools level independently, missing companions and invalid levels are safe', () => {
    const {game, stats} = setup();
    const data = stats(); data.botInfo = {}; data.weaponInfo.constructor = 'NFTSpecialItem';
    game.notifyAssetLevelUps(data); data.weaponInfo.weaponLevelInfo.currentLevel = 4;
    game.notifyAssetLevelUps(data);
    expect(game.app.showLevelUpNotification).toHaveBeenCalledWith([{label: 'Tool', level: 4}]);
    data.weaponInfo.weaponLevelInfo.currentLevel = NaN; game.notifyAssetLevelUps(data);
    expect(game.app.showLevelUpNotification).toHaveBeenCalledTimes(1);
});
test('late responses cannot roll levels back or create a duplicate upgrade', async () => {
    const {game, stats, axios} = setup(); game.notifyAssetLevelUps(stats());
    let first; axios.get.mockImplementationOnce(() => new Promise(resolve => {first = resolve;}));
    const pending = game.renderStatistics();
    axios.get.mockResolvedValue({data: stats(5)}); await game.renderStatistics();
    first({data: stats()}); await pending;
    expect(game.player.level).toBe(5); expect(game.app.showLevelUpNotification).toHaveBeenCalledTimes(1);
});
