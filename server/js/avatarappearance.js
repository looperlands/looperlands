// Appearance is derived from creator configuration and the avatar's earned level.
// It never changes the NFT identity, equipment, combat level or XP ownership.
const storageKey = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,240}$/.test(value);

function resolveAvatarAppearance(avatar, level) {
    if (!avatar || avatar.assetType !== 'looper' || typeof avatar.nftId !== 'string' ||
        !avatar.nftId || !storageKey(avatar.tokenHash)) return null;

    const appearance = {
        nftId: avatar.nftId,
        tokenHash: avatar.tokenHash,
        assetType: 'looper',
        canHoldWeapon: avatar.options?.canHoldWeapon !== false,
        evolutionLevel: 1
    };
    if (!Number.isFinite(level)) return appearance;
    const evolutions = Array.isArray(avatar.options?.evolutions) ? avatar.options.evolutions : [];
    for (const evolution of evolutions) {
        if (!Number.isInteger(evolution?.level) || evolution.level < 2 || evolution.level > 9999 ||
            evolution.level > level || evolution.level <= appearance.evolutionLevel || !storageKey(evolution.sprite)) continue;
        appearance.tokenHash = evolution.sprite;
        appearance.canHoldWeapon = evolution.canHoldWeapon !== false;
        appearance.evolutionLevel = evolution.level;
    }
    return appearance;
}

module.exports = {resolveAvatarAppearance};
