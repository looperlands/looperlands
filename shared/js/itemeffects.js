// Data-only consumable vocabulary shared by the Toolbox and game server.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ItemEffects = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const modifiers = {
        xp: 'XP', meleeDamageDealt: 'Melee damage', rangedDamageDealt: 'Ranged damage',
        meleeDamageTaken: 'Melee damage taken', moveSpeed: 'Movement speed', fishing: 'Fishing',
        hpRegen: 'Health regeneration', maxHp: 'Maximum health', hate: 'Aggro',
        attackRate: 'Attack speed', stealth: 'Stealth'
    };
    const maxEffects = 24;
    function validate(effects, resolveType) {
        if (!Array.isArray(effects) || effects.length > maxEffects) throw new Error('Add at most ' + maxEffects + ' consumption effects.');
        const seen = new Set();
        const duration = value => {
            if (!Number.isInteger(value) || value < 1000 || value > 86400000) throw new Error('Effect duration must be between 1 and 86400 seconds.');
            return value;
        };
        const reference = (id, type) => {
            if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(id) || (resolveType && resolveType(id) !== type)) throw new Error('Choose a registered ' + type + ' for the effect.');
            return id;
        };
        return effects.map(effect => {
            if (!effect || !['heal', 'modifier', 'drops', 'spawn'].includes(effect.type)) throw new Error('Choose a supported consumption effect.');
            const key = effect.type === 'modifier' ? effect.stat : effect.type === 'spawn' ? 'spawn:' + effect.entityType + ':' + effect.entity : effect.type;
            if (seen.has(key)) throw new Error('Configure each consumption effect only once.');
            seen.add(key);
            if (effect.type === 'heal') {
                if (!Number.isInteger(effect.amount) || effect.amount < 1 || effect.amount > 100000) throw new Error('Healing must be a whole number between 1 and 100000 HP.');
                return {type: 'heal', amount: effect.amount};
            }
            if (effect.type === 'spawn') {
                if (!['mob', 'item', 'npc'].includes(effect.entityType)) throw new Error('Choose a mob, item or NPC to spawn.');
                if (!Number.isInteger(effect.amount) || effect.amount < 1 || effect.amount > 10) throw new Error('Spawn between 1 and 10 entities per effect.');
                return {type: 'spawn', entityType: effect.entityType, entity: reference(effect.entity, effect.entityType), amount: effect.amount,
                    ...(effect.entityType === 'npc' ? {duration: duration(effect.duration)} : {})};
            }
            if (effect.type === 'drops') {
                if (!effect.drops || typeof effect.drops !== 'object' || Array.isArray(effect.drops) || Object.keys(effect.drops).length > 30 || !Object.keys(effect.drops).length) throw new Error('Choose between 1 and 30 items for the drop table.');
                let total = 0;
                const drops = Object.fromEntries(Object.entries(effect.drops).map(([id, chance]) => {
                    reference(id, 'item');
                    if (!Number.isFinite(chance) || chance < 0 || chance > 100) throw new Error('Drop chances must be between 0 and 100%.');
                    total += chance;
                    return [id, chance];
                }));
                if (total > 100) throw new Error('Drop chances must total at most 100%.');
                return {type: 'drops', drops, mob: effect.mob === undefined || effect.mob === '' ? '' : reference(effect.mob, 'mob'), duration: duration(effect.duration)};
            }
            if (!Object.hasOwn(modifiers, effect.stat)) throw new Error('Choose a supported stat for the effect.');
            if (!Number.isFinite(effect.multiplier) || effect.multiplier < 0.01 || effect.multiplier > 100) throw new Error('Stat multipliers must be between 0.01 and 100.');
            return {type: 'modifier', stat: effect.stat, multiplier: effect.multiplier, duration: duration(effect.duration)};
        });
    }
    function rollDrop(drops, random = Math.random) {
        const roll = random() * 100;
        let total = 0;
        for (const [id, chance] of Object.entries(drops)) {
            total += chance;
            if (roll < total) return id;
        }
        return null;
    }
    function describe(effects) {
        return (effects || []).map(effect => {
            if (effect.type === 'heal') return 'Restores ' + effect.amount + ' HP';
            if (effect.type === 'spawn') return 'Spawns ' + effect.amount + ' × ' + effect.entity + (effect.entityType === 'npc' ? ' for ' + effect.duration / 1000 + 's' : '');
            if (effect.type === 'drops') return 'Loot from your ' + (effect.mob || 'mob') + ' kills: ' + Object.entries(effect.drops).map(([id, chance]) => id + ' ' + chance + '%').join(', ') + ' for ' + effect.duration / 1000 + 's';
            return modifiers[effect.stat] + ' ×' + effect.multiplier + ' for ' + effect.duration / 1000 + 's';
        }).join('; ');
    }
    return {modifiers, maxEffects, validate, describe, rollDrop};
});
