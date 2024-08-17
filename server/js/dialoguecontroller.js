const discord = require("../js/discord");

class DialogueController {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.dialogueTrees = {};

    }

    hasDialogueTree(npcId) {
        try {
            // TODO, see if json file is available for NPC and load into dialogueTrees.
            return true;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error with Dialogue: ${error}`);
            return false;
        }
    }


    processDialogueTree(npcId) {
        try {
            // Determine start node
            // ... toto

            return null;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error with dialogue: ${error}`)
        }
    }

    errorEncountered(message) {
        discord.sendToDevChannel(message);
        console.log(message);
    }
}

module.exports = DialogueController;