
const classes = require('./playerclassmodifiers.js').classes;

class PlayerClassController {

    constructor(cache, worldsMap) {
        this.cache = cache;
        this.worldsMap = worldsMap;
    }

    async getPlayerClasses(req, res) {
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