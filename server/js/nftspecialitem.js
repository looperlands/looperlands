const Formulas = require('./formulas.js');
const dao = require('./dao.js');
const syncExperience = require('./experiencesync.js');

const XP_BATCH_SIZE = 100;
class NFTSpecialItem{

    constructor(walletId, nftId) {
        this.nftId = nftId.replace("NFT_", "0x");
        this.walletId = walletId;
        this.experience = undefined;
        this.level = 1;
        this.accumulatedExperience = 0;
        this.trait = undefined;
    }

    async loadItemData() {
        let self = this;
        let item = await dao.getSpecialItem(this.walletId, self.nftId);
        this.experience = item.xp;
        this.level = Formulas.toolLevel(this.experience);
        this.trait = item.trait;
        if (!this.trait) {
            await this.#setTraitInServer();
        }
    }

    async #setTraitInServer() {
        try {
            const trait = await dao.saveNFTSpecialItemTrait(this.walletId, this.nftId);
            this.trait = trait;
        } catch (error) {
            console.error(error);
        }
    }

    async incrementExperience(experience) {
        try {
            this.accumulatedExperience += experience;
            this.experience += experience;
            let updatedLevel = Formulas.toolLevel(this.experience);
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
            await syncExperience(
                this,
                XP_BATCH_SIZE,
                xp => dao.saveNFTSpecialItemExperience(this.walletId, this.nftId, xp),
                xp => { this.experience = xp; }
            );
        } catch (error) {
            console.error("Error synching experience", this.walletId, this.nftId, error);
        }
    }

    getLevel() {
        return this.level;
    }

    isTraitActive() {
        let roll = Math.floor(Math.random() * 100);
        let trait = this.getTrait();
        let traitMod = (trait === "lucky" || trait === "upper_hand") ? 2 : 1;
        
        let chance = (5 + this.getLevel()) * traitMod;
        return roll < chance;
    }

    getTrait() {
        return this.trait;
    }
}

exports.NFTSpecialItem = NFTSpecialItem;
