const Types = require('../../shared/js/gametypes');
const Lakes = require('./lakes');
const {loadFishingRod, equipFishingRod, restoreFishingWeapon} = require('./fishingequipment');

async function requestFish(session, worlds, params, now = Date.now(), equipment = {}) {
    const denied = (error, status = 200, extra = {}) => ({status, body: {allowed: false, error, ...extra}});
    if (!session) return denied('Session not found. Start a new game session.', 404);
    const world = worlds?.[session.mapId], player = world?.getPlayerById(session.entityId);
    const alive = () => player && world.getPlayerById(session.entityId) === player && player.hasEnteredGame && !player.disconnected && !player.isDead && player.hitPoints > 0;
    if (!alive()) return denied('You must be alive and in the map to fish.');
    const x = Number(params.x), y = Number(params.y), lake = params.lakeName;
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || x < 0 || y < 0 || x >= world.map.width || y >= world.map.height ||
        world.map.getLakeName(x, y) !== lake || !Lakes[lake]?.fish) return denied('That tile is not fishable. Build the map and start a fresh session after editing.');
    const nearby = () => {
        const dx = Math.abs(player.x - x), dy = Math.abs(player.y - y);
        return (!dx || !dy) && dx + dy <= 2 && dx + dy >= 1;
    };
    if (!nearby()) return denied('Stand one or two tiles away, in the same row or column as the water.');
    if (player.fishingRequest || player.pendingFish?.expiresAt > now) return denied('Finish your current cast before fishing again.');
    const request = player.fishingRequest = {}, weapon = player.weapon, model = player.nftWeapon;
    let accepted = false, equipped = false;
    try {
        const rod = await loadFishingRod(player, equipment);
        if (player.fishingRequest !== request || !alive() || !nearby() || player.weapon !== weapon || player.nftWeapon !== model) {
            return denied('Cast cancelled. Please try again.');
        }
        if (!rod) return denied('You need a fishing rod in your inventory to fish.');
        const rodLevel = rod.model?.getLevel(), lakeLvl = Lakes.getLakeLevel(lake);
        if (!Number.isFinite(rodLevel) || rodLevel < lakeLvl) return denied('You need level ' + lakeLvl + ' fishing to catch fish here.', 200, {reqLevel: lakeLvl});
        equipped = player.weapon !== rod.kind;
        equipFishingRod(player, rod);
        const trait = player.getNFTSpecialItemActiveTrait(), fish = Lakes.getRandomFish(lake, trait === 'lucky');
        if (!fish) return denied('No catch is available in this water.', 400);
        player.pendingFish = {name: fish, exp: Lakes.calculateFishExp(fish, lake), double: trait === 'double_catch', lakeLvl, lakeName: lake,
            mapId: world.id, expiresAt: now + 60000};
        const normal = Lakes.getDifficulty(rodLevel, lake, trait === 'upper_hand');
        const difficulty = player.playerClassModifiers.isModiferActive('fishing') ? player.playerClassModifiers.fishing : normal.difficulty;
        world.announceSpawnFloat(player, x, y);
        player.fishingSpot = {x: player.x, y: player.y};
        accepted = true;
        return {status: 200, body: {allowed: true, fish, rod: Types.getKindAsString(rod.kind), difficulty, speed: Lakes.getFishSpeed(fish, lake), bullseyeSize: normal.bullseye, trait}};
    } catch (error) {
        console.error('[fishing] could not prepare cast:', error.message);
        return denied('Could not prepare your fishing rod. Please try again.', 503);
    } finally {
        if (player.fishingRequest === request) {
            player.fishingRequest = null;
            if (!accepted && equipped) {
                player.pendingFish = null;
                restoreFishingWeapon(player);
            }
        }
    }
}
module.exports = {requestFish};
