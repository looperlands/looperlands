const Formulas = require('./formulas.js');
const dao = require('./dao.js');


class NFTWeapon {

    static xp_update_queue = [];

    static {
        async function processXpUpdateQueue() {
            try {
                let next = NFTWeapon.xp_update_queue.shift();
                if (next !== undefined) {
                    const updatedExperience = await dao.saveNFTWeaponExperience(next.walletId, next.nftId, next.damageDealt);
                    next.weapon.setExperience(updatedExperience);
                }
            } finally {
                setTimeout(processXpUpdateQueue, 100);
            }
        }

        processXpUpdateQueue();
    }

    constructor(walletId, nftId) {
        //console.log("Creating NFTWeapon: ", nftId, walletId);
        this.nftId = nftId.replace("NFT_", "0x");
        this.walletId = walletId;
        this.trait = undefined;
        this.experience = undefined;
        this.level = 1;
    }

    async loadWeaponData() {
        const response = await dao.loadNFTWeapon(this.walletId, this.nftId);
        this.experience = response.experience;
        this.trait = response.trait;
        if (!this.trait) {
            await this.#setTraitInServer();
        }
        this.level = Formulas.level(this.experience);
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
        chance += this.level
        return chance >= 89; // base level is 1, so base chance of trait is 10%
    }

    async incrementExperience(damageDealt) {
        try {
            damageDealt = damageDealt/4;
            damageDealt = Math.round(damageDealt);
            NFTWeapon.xp_update_queue.push({walletId: this.walletId, nftId: this.nftId, damageDealt: damageDealt, weapon: this});
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

    setExperience(updatedExperience) {
        if (!Number.isNaN(updatedExperience)) {
            this.experience = updatedExperience;
            let updatedLevel = Formulas.level(updatedExperience);
            if (updatedLevel > this.level) {
                this.level = updatedLevel;
            }
        } else {
            console.error("Error updating experience", this.walletId, this.nftId, damageDealt, updatedExperience);
        }
    }
}

exports.NFTWeapon = NFTWeapon;
