const playerClassModifiersData = {
    tank: {
      description: "The Tank class is a frontline warrior designed to absorb damage and protect allies, with high defense and health regeneration. They excel at drawing enemy attacks away from teammates, ensuring the safety and stability of the party.",
      meleeDamageDealt: 0.8,
      meleeDamageTaken: 0.8,
      moveSpeed: 0.8,
      rangedDamageDealt: 0.8,
      hpRegen: 1.3,
      maxHp: 1.5,
      hate: 1.5,
      attackRate: 0.8,
      stealth: 1
    },
    rogue: {
      description: "Rogues deal high melee damage and move quickly, but are more fragile and generate less aggro. They have high stealth.",
      meleeDamageDealt: 1.5,
      meleeDamageTaken: 1.2,
      moveSpeed: 1.4,
      rangedDamageDealt: 1.0,
      hpRegen: 0.8,
      maxHp: 0.9,
      hate: 0.7,
      attackRate: 1.3,
      stealth: 2
    },
    ranger: {
      description: "Rangers excel in ranged combat and have balanced attributes. They are slightly faster and generate moderate aggro.",
      meleeDamageDealt: 0.9,
      meleeDamageTaken: 1.0,
      moveSpeed: 1.2,
      rangedDamageDealt: 1.5,
      hpRegen: 1.0,
      maxHp: 1.0,
      hate: 0.9,
      attackRate: 1.1,
      stealth: 1
    },
    fighter: {
      description: "Fighter class has balanced attributes across all stats with no significant strengths or weaknesses.",
      meleeDamageDealt: 1.0,
      meleeDamageTaken: 1.0,
      moveSpeed: 1.0,
      rangedDamageDealt: 1.0,
      hpRegen: 1.0,
      maxHp: 1.0,
      hate: 1.0,
      attackRate: 1.0,
      stealth: 1.0
    }
};

class PlayerClassModifiers {
    constructor(playerClass) {
        // Default to 'normal' if the class is not found
        const modifiers = playerClassModifiersData[playerClass] || playerClassModifiersData['standard'];

        this._playerClass = playerClass;
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
module.exports.classes = playerClassModifiersData;