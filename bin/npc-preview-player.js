// Local fixture equipment. Nothing here is loaded by a production game server.
function createTestPlayer(formulas) {
    const avatarLevel = 40;
    return {
        avatarLevel,
        // level() counts an exact threshold as the end of the previous level.
        xp: formulas.calculateExperienceMap(avatarLevel + 1)[avatarLevel] + 1,
        weapon: {kind: 'goldensword', level: 40},
        modifiers: {meleeDamageDealt: 1, meleeDamageTaken: 0.25, moveSpeed: 1.5,
            rangedDamageDealt: 1, hpRegen: 4, maxHp: 4, hate: 0.5,
            attackRate: 1, stealth: 8, xp: 1, fishing: 1}
    };
}
module.exports = {createTestPlayer};
