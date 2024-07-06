const discord = require("../js/discord");
const DEBUG = true;

class MinigameController {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.minigames = {};

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
        try {
            for (const config of this.minigamesConfig) {
                const MinigameClass = config.module.endsWith('.mjs')
                    ? (await import(config.module)).default
                    : require(config.module);

                const minigameInstance = new MinigameClass(this.cache, this.platformClient);
                this.minigames[config.name] = minigameInstance;
            }
        } catch (error) {
            this.errorEncountered(`[MINIGAMECONTROLLER] Error Registering Minigame: ${error}`);
        }
    }

    async handleRequest(req, res) {
        try {
            const { minigame, action } = req.body;

            if (!this.minigames[minigame]) {
                return res.status(400).json({ error: "Minigame not found" });
            }

            //console.log(`[${minigame}] processing action: ${action}`);
            this.minigames[minigame].handleAction(req, res, action);
        } catch (error) {
            this.errorEncountered(`[MINIGAMECONTROLLER] Error with Minigame: ${error}`);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    errorEncountered(message) {
        if (DEBUG) {
            discord.sendToDebugChannel(message);
        } else {
            discord.sendToDevChannel(message);
        }
        console.log(message);
    }
}

module.exports = MinigameController;