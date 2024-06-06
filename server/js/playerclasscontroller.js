class PlayerClassController {

    constructor(platformClient, cache, worldsMap) {
        this.platformClient = platformClient;
        this.cache = cache;
        this.worldsMap = worldsMap;
    }

    async getPlayerClasses(req, res) {
        const classes = await this.platformClient.getAllLooperClasses();
        res.json(classes);
    }

    async getPlayerModifiers(req, res) {
        const sessionId = req.params.sessionId;
        const sessionData = this.cache.get(sessionId); 
        if (sessionData === undefined) {
            res.status(404).json({
                status: false,
                "error": "session not found",
                user: null
            });
            return;
        }
        
        const player = this.worldsMap[sessionData.mapId]?.getPlayerById(sessionData.entityId);
        if (player) {
            const playerModifiers = await player.playerClassModifiers.getAllModifiers();
            res.json(playerModifiers);
        } else {
            res.status(404).json({
                status: false,
                "error": "player not found",
                user: null
            });
        }
    }

    async setLooperClass(req, res) {
        const sessionId = req.params.sessionId;
        const sessionData = this.cache.get(sessionId);
        if (sessionData === undefined) {
            res.status(404).json({
                status: false,
                "error": "session not found",
                user: null
            });
            return;
        }
        const { playerClass } = req.body;
        const nftId = sessionData["nftId"];
        await this.platformClient.setLooperClass(nftId, playerClass);
        const player = this.worldsMap[sessionData.mapId]?.getPlayerById(sessionData.entityId);
        if (player) {
            player.playerClassModifiers.playerClass = playerClass;
            sessionData.trait = playerClass;
            this.cache.set(sessionId, sessionData);
        }
        res.status(200).json({
            "success" : true
        });
    }
}

module.exports.PlayerClassController = PlayerClassController;