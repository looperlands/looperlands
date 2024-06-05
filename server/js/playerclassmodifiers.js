class PlayerClassModifiers {
    constructor(platformClient, nftId, playerClass) {
        this.platformClient = platformClient;
        this.nftId = nftId;
        this._playerClass = playerClass;

        // set default modifiers
        this._meleeDamageDealt = 1
        this._meleeDamageTaken = 1
        this._moveSpeed = 1
        this._rangedDamageDealt = 1
        this._hpRegen = 1
        this._maxHp = 1
        this._hate = 1
        this._attackRate = 1
        this._stealth = 1;

        this.loadModifierData();
    }

    async loadModifierData() {
        const modifiers = await this.platformClient.getLooperModifierData(this.nftId);
        this._meleeDamageDealt = modifiers.meleeDamageDealt;
        this._meleeDamageTaken = modifiers.meleeDamageTaken;
        this._moveSpeed = modifiers.moveSpeed;
        this._rangedDamageDealt = modifiers.rangedDamageDealt;
        this._hpRegen = modifiers.hpRegen;
        this._maxHp = modifiers.maxHp;
        this._hate = modifiers.hate;
        this._attackRate = modifiers.attackRate;
        this._stealth = modifiers.stealth;
    }

    get playerClass() {
        return this._playerClass;
    }

    set playerClass(playerClass) {
        if (this._playerClass === null) {
            this._playerClass = playerClass;
        }
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

    get emoji() {
        switch(this.playerClass) {
            case 'fighter':
                return '🗡️';
            case 'ranger':
                return '🏹';
            case 'tank':
                return '🛡️';
            case 'rogue':
                return '🥷';
            default:
                return undefined;
        }
    }

    // Method to return all modifiers in an object
    async getAllModifiers() {
        await this.loadModifierData();
        return {
            playerClass: this._playerClass,
            meleeDamageDealt: this._meleeDamageDealt,
            meleeDamageTaken: this._meleeDamageTaken,
            moveSpeed: this._moveSpeed,
            rangedDamageDealt: this._rangedDamageDealt,
            hpRegen: this._hpRegen,
            maxHp: this._maxHp,
            hate: this._hate,
            attackRate: this._attackRate,
            stealth: this._stealth,
            emoji: this.emoji
        };
    }
}

module.exports.PlayerClassModifiers = PlayerClassModifiers;