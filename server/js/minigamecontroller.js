class MinigameController {
    constructor(platformClient, cache) {
        this.platformClient = platformClient;
        this.cache = cache;
        this.minigames = {};
    }

    registerMinigame(name, minigame) {
        this.minigames[name] = minigame;
    }

    handleRequest(req, res) {
        const { minigame, action } = req.body;

        if (!this.minigames[minigame]) {
            return res.status(400).json({ error: "Minigame not found" });
        }

        this.minigames[minigame].handleAction(req, res, action);
    }
}

module.exports = MinigameController;
