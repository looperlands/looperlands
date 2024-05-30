class AnnouncementController {

    constructor(worldsMap) {
        this.worldsMap = worldsMap;
    }

    sendAnnouncement(req, res) {
        const { maps, message, timeToShow } = req.body;

        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.LOOPWORMS_API_KEY) {
            res.status(401).json({
                status: false,
                "error": "invalid api key",
                user: null
            });
            return;
        }        

        if (!message) {
            return res.status(400).send('Announcement text is required.');
        }

        if (maps === undefined || maps.length == 0) {
            Object.keys(this.worldsMap).forEach(mapId => {
                this.sendAnnouncementToMap(mapId, message, timeToShow);
            });
        } else {
            maps.forEach( mapId => {
                this.sendAnnouncementToMap(mapId, message, timeToShow);
            });
        }

        res.status(200).send({
            "success" : true
        });
    }

    sendAnnouncementToMap(mapId, message, timeToShow) {
        const world = this.worldsMap[mapId];
        Object.keys(world.players).forEach(playerId => {
            const player = world.players[playerId];
            player.sendAnnoucement(message, timeToShow);
        });
    }

}

exports.AnnouncementController = AnnouncementController;
