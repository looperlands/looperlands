class MinigameController {
    constructor(cache) {
        this.cache = cache;
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
        for (const config of this.minigamesConfig) {
            const MinigameClass = config.module.endsWith('.mjs')
                ? (await import(config.module)).default
                : require(config.module);

            const minigameInstance = new MinigameClass(this.cache);
            this.minigames[config.name] = minigameInstance;
        }
    }

    async handleRequest(req, res) {
        try {
            const { minigame, action } = req.body;

            if (!this.minigames[minigame]) {
                return res.status(400).json({ error: "Minigame not found" });
            }

            console.log(`${minigame} | processing action: ${action}`);
            this.minigames[minigame].handleAction(req, res, action);
        } catch (error) {
            console.log('error with minigame: ', error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

module.exports = MinigameController;