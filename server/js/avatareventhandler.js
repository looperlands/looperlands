const dao = require('./dao.js');

class AvatarEventHandler {
    static Events = {
        KILL_MOB: 'KILL_MOB',
        LOOT_ITEM: 'LOOT_ITEM'
    };


    static avatarEventHandlers = {};

    constructor(player) {
        this.player = player;
        this.cache = player.server.server.cache;
    }

    async lootEvent(item) {
        dao.saveLootEvent(this.player.nftId, item.kind);

        let sessionId = this.player.sessionId;
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

/*
onmessage = (e) => {
    console.log("Message received from main script");
    const workerResult = `Result: ${e.data[0] * e.data[1]}`;
    console.log("Posting message back to main script");
    postMessage(workerResult);
};
*/