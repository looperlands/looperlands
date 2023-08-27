const dao = require('./dao.js');

class AvatarEventHandler {
    static Events = {
        KILL_MOB: 'KILL_MOB',
        LOOT_ITEM: 'LOOT_ITEM'
    };

    constructor(cache) {
        this.cache = cache;
    }

    async lootEvent(player, item) {
        dao.saveLootEvent(player.nftId, item.kind);

        let sessionId = player.sessionId;
        let playerCache = this.cache.get(sessionId);
        let gameData = playerCache.gameData;
        let itemCount = gameData.items[item.kind];
        if (itemCount) {
            gameData.items[item.kind] = itemCount + 1;
        } else {
            gameData.items[item.kind] = 1;
        }

        playerCache.gameData = gameData;
        this.cache.set(sessionId, playerCache);
    }
}

exports.AvatarEventHandler = AvatarEventHandler;