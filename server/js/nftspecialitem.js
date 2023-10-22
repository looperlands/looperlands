const Formulas = require('./formulas.js');
const dao = require('./dao.js');

const XP_BATCH_SIZE = 100;
class NFTSpecialItem{

    constructor(walletId, nftId) {
        this.nftId = nftId.replace("NFT_", "0x");
        this.walletId = walletId;
        this.experience = undefined;
        this.level = 1;
        this.accumulatedExperience = 0;
    }

    async loadItemData() {
        let self = this;
        const response = await dao.getSpecialItems(this.walletId);
        let item = response.find((item) => item.NFTID === self.nftId);
        this.experience = item.experience;
        this.level = Formulas.toolLevel(this.experience);
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
            const updatedExperience = await dao.saveNFTSpecialItemExperience(this.walletId, this.nftId, this.accumulatedExperience);
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
}

exports.NFTSpecialItem = NFTSpecialItem;
