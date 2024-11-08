const fs = require("fs");
const path = require("path");

// Directory containing individual dialogue files
const folderToLoad = "bitcorn";

const dialogueDir = path.join(__dirname, folderToLoad);
let dialogues = [];

// Load all dialogues in the specified folder
fs.readdirSync(dialogueDir).forEach(file => {
    const dialoguePath = path.join(dialogueDir, file);
    const dialogue = require(dialoguePath);
    dialogues.push(dialogue.dialogue);
});

// Export array to make it available for the map
exports.dialogues = dialogues;
