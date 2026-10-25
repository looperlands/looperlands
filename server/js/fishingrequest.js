const Types = require('../../shared/js/gametypes');
const Lakes = require('./lakes');

function requestFish(session, worlds, params, now = Date.now()) {
    const denied = (error, status = 200, extra = {}) => ({status, body: {allowed: false, error, ...extra}});
    if (!session) return denied('Session not found. Start a new game session.', 404);
    const world = worlds?.[session.mapId], player = world?.getPlayerById(session.entityId);
    if (!player || !player.hasEnteredGame || player.isDead || player.hitPoints <= 0) return denied('You must be alive and in the map to fish.');
    const x = Number(params.x), y = Number(params.y), lake = params.lakeName;
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || x < 0 || y < 0 || x >= world.map.width || y >= world.map.height ||
        world.map.getLakeName(x, y) !== lake || !Lakes[lake]?.fish) return denied('That tile is not fishable. Build the map and start a fresh session after editing.');
    const dx = Math.abs(player.x - x), dy = Math.abs(player.y - y);
    if ((dx && dy) || dx + dy > 2 || dx + dy < 1) return denied('Stand one or two tiles away, in the same row or column as the water.');
    if (!Types.isFishingRod(player.weapon)) return denied('Equip a fishing rod before casting.');
    const rodLevel = player.getNFTWeapon()?.getLevel(), lakeLvl = Lakes.getLakeLevel(lake);
    if (!Number.isFinite(rodLevel) || rodLevel < lakeLvl) return denied('You need level ' + lakeLvl + ' fishing to catch fish here.', 200, {reqLevel: lakeLvl});
    const trait = player.getNFTSpecialItemActiveTrait(), fish = Lakes.getRandomFish(lake, trait === 'lucky');
    if (!fish) return denied('No catch is available in this water.', 400);
    player.pendingFish = {name: fish, exp: Lakes.calculateFishExp(fish, lake), double: trait === 'double_catch', lakeLvl, lakeName: lake,
        mapId: world.id, expiresAt: now + 60000};
    const normal = Lakes.getDifficulty(rodLevel, lake, trait === 'upper_hand');
    const difficulty = player.playerClassModifiers.isModiferActive('fishing') ? player.playerClassModifiers.fishing : normal.difficulty;
    world.announceSpawnFloat(player, x, y);
    return {status: 200, body: {allowed: true, fish, difficulty, speed: Lakes.getFishSpeed(fish, lake), bullseyeSize: normal.bullseye, trait}};
}
module.exports = {requestFish};
