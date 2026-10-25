const Types = require('../../shared/js/gametypes');
const AltNames = require('../../shared/js/altnames');

const modifierLabels = {
    xp: 'XP', meleeDamageDealt: 'melee damage', rangedDamageDealt: 'ranged damage',
    meleeDamageTaken: 'melee taken', moveSpeed: 'move speed', fishing: 'fishing',
    hpRegen: 'health regen', maxHp: 'max health', hate: 'aggro',
    attackRate: 'attack speed', stealth: 'stealth'
};
const fishLabels = {hp: 'max health', atk: 'attack', exp: 'XP'};

function getConsumableEffects(player, now = Date.now()) {
    const effects = [];
    const addModifiers = (target, prefix) => {
        if (!target || target.isDead) return;
        for (const modifier of target.playerClassModifiers?.getActiveTemporaryModifiers(now) || []) {
            const label = modifierLabels[modifier.name];
            if (!label) continue;
            effects.push({id: prefix + modifier.name,
                label: (prefix ? 'Companion ' : '') + modifier.value + 'x ' + label,
                expiresAt: modifier.expiresAt});
        }
    };
    if (player && !player.isDead) {
        addModifiers(player, '');
        addModifiers(player.getBot?.(), 'companion:');
        const fish = player.consumableBuff;
        if (fish?.buff && fish.expireTime > now) {
            effects.push({id: 'fish', label: '+' + fish.buff.percent + '% ' + (fishLabels[fish.buff.stat] || fish.buff.stat),
                expiresAt: fish.expireTime});
        }
        if (player.invincible && player.invincibilityExpiresAt > now) {
            effects.push({id: 'invincibility', label: 'Invincible', expiresAt: player.invincibilityExpiresAt});
        }
        if (player.dropOverride !== undefined && player.dropOverrideExpiresAt > now) {
            effects.push({id: 'drops', label: 'Drops: ' + (AltNames[Types.getKindAsString(player.dropOverride)] || 'special loot'),
                expiresAt: player.dropOverrideExpiresAt});
        }
        if (player.dropTableOverride?.expiresAt > now) {
            effects.push({id: 'drops', label: 'Custom loot' + (player.dropTableOverride.mob === null ? '' : ': ' + Types.getKindAsString(player.dropTableOverride.mob)),
                expiresAt: player.dropTableOverride.expiresAt});
        }
    }
    return {effects, effectsUpdatedAt: now};
}

module.exports = {getConsumableEffects};
