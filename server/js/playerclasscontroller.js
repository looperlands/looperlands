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
        }
        
        const player = this.worldsMap[sessionData.mapId]?.getPlayerById(sessionData.entityId);
        if (player) {
            const playerModifiers = player.playerClassModifiers.getAllModifiers();
            res.json(playerModifiers);
        } else {
            res.status(404).json({
                status: false,
                "error": "player not found",
                user: null
            });
        }
    }
}

module.exports.PlayerClassController = PlayerClassController;