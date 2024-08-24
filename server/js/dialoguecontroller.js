const discord = require("../js/discord");
const _ = require("underscore");
const main = require("./dialogue/main.js");

class DialogueController {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.dialogueTrees = {
            main: main.dialogues
        };
    }

    loadMap(mapName) {
        try {
            console.log(`[DIALOGUE] Loading map: ${mapName}`);
            this.dialogues = this.dialogueTrees[mapName];
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error loading map: ${error}`);
        }
    }

    findDialogueTree(mapId, npcId) {
        try {
            const dialogues = this.dialogueTrees[mapId];
            if (dialogues === null) {
                return null;
            }

            for (let i = 0; i < dialogues.length; i++) {
                const dialogue = dialogues[i];
                if (parseInt(dialogue.npc) === parseInt(npcId)) {
                    return dialogue;
                }
            }
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error finding dialogue: ${error}`);
            return null;
        }
    }

    hasDialogueTree(mapId, npcId) {
        try {
            const dialogue = this.findDialogueTree(mapId, npcId);
            return dialogue !== null;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error with Dialogue: ${error}`);
            return false;
        }
    }

    processDialogueTree(mapId, npcId) {
        try {
            const dialogue = this.findDialogueTree(mapId, npcId);
            console.log(dialogue);
            if (!dialogue) {
                return null;
            }

            // Determine start node
            // ... toto
            console.log('returned text');
            return {text: "I have something to say"};
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