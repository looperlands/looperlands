const NodeCache = require( "node-cache" );
const cache = new NodeCache();
const discord = require("./discord.js");

const MAX_MESSAGES = 12;
exports.addMessage = function(playerName, message) {
    let messages = cache.get("logs");
    if (messages === undefined) {
        messages = [];
    }
    message = {
        playerName: playerName,
        message: message,
        epoch: Date.now()
    }
    messages.push(message);
    if (messages.length > MAX_MESSAGES) {
        messages.shift();
    }
    let discordMessage = `💬 **${playerName}:** ${message.message.replace(/@|\//g, "")}`;
    discord.sendMessage(discordMessage);
    cache.set("logs", messages);
}

exports.getMessages = function() {
    let messages = cache.get("logs");
    return messages;
}