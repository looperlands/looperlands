const Formulas = require('./formulas.js');
const dao = require('./dao.js');

const XP_BATCH_SIZE = 500;
class NFTWeapon {

    constructor(walletId, nftId) {
        //console.log("Creating NFTWeapon: ", nftId, walletId);
        this.nftId = nftId.replace("NFT_", "0x");
        this.walletId = walletId;
        this.trait = undefined;
        this.experience = undefined;
        this.level = 1;
        this.accumulatedExperience = 0;
        this.projectileType = 'arrow';
    }

    async loadWeaponData() {
        const response = await dao.loadNFTWeapon(this.walletId, this.nftId);
        this.experience = response.experience;
        this.trait = response.trait;
        if (!this.trait) {
            await this.#setTraitInServer();
        }
        this.level = Formulas.level(this.experience);

        if (response.projectileType) {
            this.projectileType = response.projectileType;
        }
    }

    async #setTraitInServer() {
        try {
            const trait = await dao.saveNFTWeaponTrait(this.walletId, this.nftId);
            //console.log("Got trait: ", trait, this.walletId, this.nftId);
            this.trait = trait;
        } catch (error) {
            console.error(error);
        }
    }

    isTraitActive() {
        if (this.getTrait() === "speed") {
            return true;
        }
        let chance = Math.floor(Math.random() * 100);
        chance += this.level * 0.5;
        return chance >= 89; // base level is 1, so base chance of trait is 10%
    }

    async incrementExperience(damageDealt) {
        try {
            damageDealt = damageDealt/4;
            damageDealt = Math.round(damageDealt);

            this.accumulatedExperience += damageDealt;
            this.experience += damageDealt;
            let updatedLevel = Formulas.level(this.experience);
            if (updatedLevel > this.level) {
                this.level = updatedLevel;
            }
            if (this.accumulatedExperience > XP_BATCH_SIZE) {
                this.syncExperience();
            }
        } catch(error) {
            console.error(error);
        }
    }

    async syncExperience() {
        try {
            const updatedExperience = await dao.saveNFTWeaponExperience(this.walletId, this.nftId, this.accumulatedExperience);
            if (!Number.isNaN(updatedExperience)) {
                this.experience = updatedExperience;
                this.accumulatedExperience = 0;
            } else {
                console.error("Error synching experience", this.walletId, this.nftId, this.accumulatedExperience, updatedExperience);
            }
        } catch(error) {
            console.error(error);
        }

    }

    getLevel() {
        return this.level;
    }
    
    getTrait() {
        return this.trait;
    }

    getProjectiles() {
        switch (self.projectileType) {
            case 'bullet':
                return [
                    Types.Entities.STEEL_BULLET,
                    Types.Entities.SILVER_BULLET,
                    Types.Entities.GOLD_BULLET,
                ];
            case 'magic':
                return [
                    Types.Entities.BOTTLED_FIRE,
                    Types.Entities.BOTTLED_LIGHTNING,
                    Types.Entities.BOTTLED_POISON,
                ];
            case 'arrow':
            default:
                return [
                    // Types.Entities.BASIC_ARROW,
                    // Types.Entities.FEATHER_ARROW,
                    // Types.Entities.FIRE_ARROW,
                    Types.Entities.CPOTION_S,
                ];
        }
    }
}

exports.NFTWeapon = NFTWeapon;
