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
    }

    get playerClass() {
        return this._playerClass;
    }

    get meleeDamageDealt() {
        return this._meleeDamageDealt;
    }

    get meleeDamageTaken() {
        return this._meleeDamageTaken;
    }

    get moveSpeed() {
        return this._moveSpeed;
    }

    get rangedDamageDealt() {
        return this._rangedDamageDealt;
    }

    get hpRegen() {
        return this._hpRegen;
    }

    get maxHp() {
        return this._maxHp;
    }

    get hate() {
        return this._hate;
    }

    get attackRate() {
        return this._attackRate;
    }
}

module.exports.PlayerClassModifiers = PlayerClassModifiers;