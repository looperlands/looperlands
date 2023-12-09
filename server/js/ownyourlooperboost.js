const dao = require('./dao.js'); // Import the dao.js module

class LooperManager {
    static EXPERIENCE_BOOST_PER_LOOPER = 25000;

    constructor(owner) {
        this.owner = owner;
        this.loopers = 0;
    }

    // Asynchronously fetch the number of loopers
    async fetchLoopers() {
        try {
            this.loopers = await dao.getLooperAssetCount(this.owner);
        } catch (error) {
            console.error('Error fetching loopers:', error);
            this.loopers = 0;
        }
    }

    getTotalExperienceBoost() {
        return this.loopers * LooperManager.EXPERIENCE_BOOST_PER_LOOPER;
    }

    getTotalAssets() {
        return this.loopers;
    }
}

module.exports = LooperManager;