class MinigameController {
    constructor() {
        this.minigames = {};

        this.minigamesConfig = [
            { name: 'jackace', module: '../apps/JackAce/jackace_ss.js' },
            // Add new minigames here
        ];

        this.registerMinigames();
    }

    registerMinigame(name, minigame) {
        this.minigames[name] = minigame;
    }

    registerMinigames() {
        this.minigamesConfig.forEach(config => {
            const MinigameClass = require(config.module);
            const minigameInstance = new MinigameClass();
            this.registerMinigame(config.name, minigameInstance);
        });
    }

  handleRequest(req, res) {

        const { minigame, action } = req.body;
        console.log(`${minigame} | processing action: ${action}`);

        if (!this.minigames[minigame]) {
            return res.status(400).json({ error: "Minigame not found" });
        }

        this.minigames[minigame].handleAction(req, res, action);
    }
}

module.exports = MinigameController;