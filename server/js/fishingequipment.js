const Types = require('../../shared/js/gametypes');

// Retain the loaded weapon model, including any unsaved XP and ranged settings.
function rememberFishingWeapon(player) {
    if (Types.isWeapon(player.weapon)) {
        player.fishingWeapon = {weapon: player.weapon, nftWeapon: player.nftWeapon, weaponLevel: player.weaponLevel};
    }
}

async function loadFishingRod(player, {getInventory, createRod}) {
    if (Types.isFishingRod(player.weapon)) {
        await player.fishingRodReady;
        return {kind: player.weapon, model: player.getNFTWeapon()};
    }
    const inventory = await getInventory(player.walletId, player.nftId);
    const rods = (inventory?.tools || []).map(item => Types.getKindFromString(item.nftId.replace(/^0x/, 'NFT_')))
        .filter(kind => Types.isFishingRod(kind));
    const kind = rods.includes(player.lastFishingRod) ? player.lastFishingRod : rods[0];
    if (kind === undefined) return null;
    const model = createRod(player.walletId, Types.getKindAsString(kind));
    await model.loadItemData();
    return {kind, model};
}

function equipFishingRod(player, rod) {
    if (player.weapon === rod.kind) return;
    rememberFishingWeapon(player);
    player.getNFTWeapon()?.syncExperience();
    player.weapon = rod.kind;
    player.nftWeapon = rod.model;
    player.lastFishingRod = rod.kind;
    player.broadcast(player.equip(rod.kind), false);
}

function restoreFishingWeapon(player) {
    const weapon = player.fishingWeapon;
    player.fishingWeapon = null;
    if (!weapon || !Types.isFishingRod(player.weapon)) return;
    player.getNFTWeapon()?.syncExperience();
    Object.assign(player, weapon);
    player.broadcast(player.equip(weapon.weapon), false);
}

function cancelFishing(player) {
    const active = player.fishingRequest || player.pendingFish;
    player.fishingRequest = null;
    player.pendingFish = null;
    restoreFishingWeapon(player);
    if (active) player.server.announceDespawnFloat(player);
}

module.exports = {rememberFishingWeapon, loadFishingRod, equipFishingRod, restoreFishingWeapon, cancelFishing};
