class MinigameController {
    constructor(cache) {
        this.cache = cache;
        this.minigames = {};
        this.playerId = null;

        this.minigamesConfig = [
            { name: 'jackace', module: '../apps/JackAce/jackace_ss' },
            // Add new minigames here
        ];

        this.registerMinigames();
    }

    registerMinigame(name, minigame) {
        this.minigames[name] = minigame;
    }

    async registerMinigames() {
        for (const config of this.minigamesConfig) {
            let MinigameClass;

            if (config.module.endsWith('.mjs')) {
                MinigameClass = (await import(config.module)).default;
            } else {
                MinigameClass = require(config.module);
            }

            const minigameInstance = new MinigameClass();
            this.registerMinigame(config.name, minigameInstance);
        }
    }

    async setPlayerId(req) {
        const sessionId = req.params.sessionId;
        const sessionData = this.cache.get(sessionId);
        if (!sessionData) {
            throw new Error(`No session with id ${sessionId} found`);
        }
        this.playerId = sessionData.nftId;
    }
    async handleRequest(req, res) {
        try {

            if (!this.playerId) {
                await this.setPlayerId(req);
                console.log('playerid: ', this.playerId);
                if(!this.playerId){return res.status(400).json({ message: "Player ID not found" });}
            }

            const { minigame, action } = req.body;

            if (!this.minigames[minigame]) {
                return res.status(400).json({ error: "Minigame not found" });
            }

            try {
                console.log(`${minigame} | processing action: ${action}`);
                this.minigames[minigame].handleAction(req, res, this.playerId, action);
            } catch (error) {
                console.log('error with minigame: ', error);
                res.status(500).json({ message: "Internal server error" });
            }
        } catch (error) {
            console.error(error.message);
            res.status(404).json({ status: false, error: error.message, user: null });
        }
    }
}

module.exports = MinigameController;