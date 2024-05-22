class PlayerClassModifiers {
    constructor(playerClass) {
        this._playerClass = playerClass;
        this._meleeDamageDealt = 1;
        this._meleeDamageTaken = 1;
        this._moveSpeed = 1;
        this._rangedDamageDealt = 1;
        this._hpRegen = 1;
        this._maxHp = 1;
        this._hate = 1;
        this._attackRate = 1;
        this._stealth = 1;
    }

    get playerClass() {
        return this._playerClass;
    }

    // positive multiplier
    get meleeDamageDealt() {
        return this._meleeDamageDealt;
    }

    // positive multiplier
    get meleeDamageTaken() {
        return this._meleeDamageTaken;
    }

    // positive multiplier
    get moveSpeed() {
        return this._moveSpeed;
    }

    // positive multiplier
    get rangedDamageDealt() {
        return this._rangedDamageDealt;
    }

    // positive multiplier
    get hpRegen() {
        return this._hpRegen;
    }

    // positive multiplier
    get maxHp() {
        return this._maxHp;
    }

    // positive multiplier
    get hate() {
        return this._hate;
    }

    // postive multiplier
    get attackRate() {
        return this._attackRate;
    }

    // positive multiplier
    get stealth() {
        return this._stealth;
    }
}

module.exports.PlayerClassModifiers = PlayerClassModifiers;