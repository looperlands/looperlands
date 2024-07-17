class InventorySyncController {
    
    constructor(dao, cache) {
        this.dao = dao;
        this.cache = cache;
    }

    async syncPlayer(req, res) {

        const { nftId } = req.body;

        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.LOOPWORMS_API_KEY) {
            res.status(401).json({
                status: false,
                "error": "invalid api key",
                user: null
            });
            return;
        }        

        const cacheKeys = this.cache.keys();
        for (const i in cacheKeys) {
            const sessionId = cacheKeys[i];
            const sessionData = this.cache.get(sessionId);
            const found = sessionData?.nftId === nftId;
            if (found) {
                await this.dao.processLootEventQueue();
                const gameData = await this.dao.loadAvatarGameData(nftId);
                sessionData.gameData = gameData;
                this.cache.set(sessionId, sessionData);
            }
            res.status(200).json({
                "success" : true
            }); 
            return;           
        }
        res.status(404).json({
            "success" : false,
            "msg": `player with ${nftId} not found`
        });
        return
    }
}

module.exports.InventorySyncController = InventorySyncController;