class AnnouncementController {

    constructor(worldsMap) {
        this.worldsMap = worldsMap;
        this.receipts = new Set();
    }

    sendAnnouncement(req, res) {
        const { maps, message, timeToShow, announcementId } = req.body;

        const apiKey = req.headers['x-api-key'];
        if (!process.env.LOOPWORMS_API_KEY || apiKey !== process.env.LOOPWORMS_API_KEY) {
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

        if ((maps !== undefined && (!Array.isArray(maps) || maps.some(map => typeof map !== 'string'))) || typeof message !== 'string' || message.length > 4096 || (announcementId !== undefined && !/^[a-f0-9]{64}$/.test(announcementId))) return res.status(400).send('Invalid announcement.');
        if (announcementId && this.receipts.has(announcementId)) return res.status(200).send({success:true});
        if (announcementId) {
            this.receipts.add(announcementId);
            if (this.receipts.size > 10000) this.receipts.delete(this.receipts.values().next().value);
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
        if (!world) return;
        Object.keys(world.players).forEach(playerId => {
            const player = world.players[playerId];
            player.sendAnnoucement(message, timeToShow);
        });
    }

}

exports.AnnouncementController = AnnouncementController;
