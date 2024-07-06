class PlayerClassModifiers {
    constructor(platformClient, nftId, playerClass) {
        this.platformClient = platformClient;
        this.nftId = nftId;
        this._playerClass = playerClass;

        // set default modifiers
        this._meleeDamageDealt = 1;
        this._meleeDamageTaken = 1;
        this._moveSpeed = 1;
        this._rangedDamageDealt = 1;
        this._hpRegen = 1;
        this._maxHp = 1;
        this._hate = 1;
        this._attackRate = 1;
        this._stealth = 1;

        this._temporaryModifiers = {};
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
        if (!this._playerClass) {
            this._playerClass = playerClass;
        }
    }

    get meleeDamageDealt() {
        return this._applyTemporaryModifier(this._meleeDamageDealt, 'meleeDamageDealt');
    }

    get meleeDamageTaken() {
        return this._applyTemporaryModifier(this._meleeDamageTaken, 'meleeDamageTaken');
    }

    get moveSpeed() {
        return this._applyTemporaryModifier(this._moveSpeed, 'moveSpeed');
    }

    get rangedDamageDealt() {
        return this._applyTemporaryModifier(this._rangedDamageDealt, 'rangedDamageDealt');
    }

    get hpRegen() {
        return this._applyTemporaryModifier(this._hpRegen, 'hpRegen');
    }

    get maxHp() {
        return this._applyTemporaryModifier(this._maxHp, 'maxHp');
    }

    get hate() {
        return this._applyTemporaryModifier(this._hate, 'hate');
    }

    get attackRate() {
        return this._applyTemporaryModifier(this._attackRate, 'attackRate');
    }

    get stealth() {
        return this._applyTemporaryModifier(this._stealth, 'stealth');
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

    _applyTemporaryModifier(baseValue, modifierName) {
        if (this._temporaryModifiers[modifierName]) {
            return baseValue * this._temporaryModifiers[modifierName];
        }
        return baseValue;
    }

    async getAllModifiers() {
        await this.loadModifierData();
        return {
            playerClass: this._playerClass,
            meleeDamageDealt: this.meleeDamageDealt,
            meleeDamageTaken: this.meleeDamageTaken,
            moveSpeed: this.moveSpeed,
            rangedDamageDealt: this.rangedDamageDealt,
            hpRegen: this.hpRegen,
            maxHp: this.maxHp,
            hate: this.hate,
            attackRate: this.attackRate,
            stealth: this.stealth,
            emoji: this.emoji
        };
    }

    applyTemporaryModifierWithTimeout(modifierName, value, duration) {
        this._temporaryModifiers[modifierName] = value;
        setTimeout(() => {
            delete this._temporaryModifiers[modifierName];
        }, duration);
    }
}

module.exports.PlayerClassModifiers = PlayerClassModifiers;
