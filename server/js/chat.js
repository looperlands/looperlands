const NodeCache = require( "node-cache" );
const cache = new NodeCache();
const discord = require("./discord.js");

const MAX_MESSAGES = 100;
let persistentHistory;
exports.setHistory = history => { persistentHistory = history; };
exports.addMessage = function(playerName, message, identity) {
    let messages = cache.get("logs");
    if (messages === undefined) {
        messages = [];
    }
    message = {
        playerName: playerName,
        message: message,
        epoch: Date.now(),
        ...(identity ? { identity } : {})
    }
    messages.push(message);
    if (messages.length > MAX_MESSAGES) {
        messages.shift();
    }
    let discordMessage = `💬 **${playerName}:** ${message.message.replace(/@|\//g, "")}`;
    for (let i = 0; i < discordMessage.length; i += 2000) {
        discord.sendMessage(discordMessage.slice(i, i + 2000));
    }
    cache.set("logs", messages);
}

exports.getMessages = function() {
    if (persistentHistory) return (persistentHistory.get('world') || []).map(message => ({
        playerName: message.sender.label, message: message.message, epoch: message.epoch, identity: message.sender
    }));
    let messages = cache.get("logs");
    return messages;
}
