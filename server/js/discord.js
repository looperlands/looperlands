const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js')
const NodeCache = require("node-cache");
const cache = new NodeCache();

const GAMESERVER_NAME = process.env.GAMESERVER_NAME.toUpperCase();
const MESSAGE_PREFIX = `\`${GAMESERVER_NAME}\` `;
const MAX_MESSAGE_LENGTH = 2000; // DISCORD LIMIT
const MAX_SPLIT_MESSAGES = 2;

const GAME_LOG_CHANNEL = '1156612974669209723';
const GAME_ERROR_CHANNEL = `1156613041467695144`;
const GAME_DEBUG_CHANNEL = `1259006864981758043`;

exports.ready = false;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.on('ready', () => {
    exports.ready = true;
    console.log(`Logged in as ${client.user.tag}!`);
});

if (process.env.DISCORD_TOKEN === undefined) {
    console.warn("DISCORD_TOKEN environment variable not set");
}

exports.sendMessage = (message) => {
    const channels = [GAME_LOG_CHANNEL];
    try {
        for (let channelId of channels) {
            let channel = client.channels.cache.get(channelId);

            try {
                if (cache.get(message + channelId) === undefined) {
                    cache.set(message + channelId, true, 60 * 5);
                    channel.send(`${MESSAGE_PREFIX}${message}`);
                }
            } catch (e) {
                //console.log(message, e);
            }
        }

    } catch (e) {
        //console.log(e);
    }
}

exports.sendToDevChannel = (message, embed = false) => {
    const channels = [GAME_ERROR_CHANNEL];
    sendMessageToChannel(channels, message, embed);
}

exports.sendToDebugChannel = (message, embed = false) => {
    const channels = [GAME_DEBUG_CHANNEL];
    sendMessageToChannel(channels, message, embed);
}

//////////////////////
// HELPER FUNCTIONS //
//////////////////////

const sendMessageToChannel = (channels, message, embed = false) => {
    for (let channelId of channels) {
        let channel = client.channels.cache.get(channelId);
        try {
            if (embed) {
                const embedMessage = buildErrorEmbed(message);
                if (embedMessage) {
                    channel.send({ embeds: [embedMessage] });
                } else {
                    // Invalid embed ==> send as message
                    sendMessageToChannel(channels, message, false);
                }
            } else {
                const availableLength = MAX_MESSAGE_LENGTH - MESSAGE_PREFIX.length;
                if (message.length <= availableLength) {
                    channel.send(`${MESSAGE_PREFIX}${message}`);
                } else {
                    const messages = splitMessage(message);
                    for (let msg of messages) {
                        channel.send(`${MESSAGE_PREFIX}${msg}`);
                    }
                }
            }
        } catch (e) {
            //console.log(message, e);
        }
    }
};

const splitMessage = (message) => {
    const availableLength = MAX_MESSAGE_LENGTH - MESSAGE_PREFIX.length;
    let messages = [];

    // Split message into chunks of availableLength
    for (let i = 0; i < message.length && messages.length < MAX_SPLIT_MESSAGES; i += availableLength) {
        messages.push(message.substring(i, i + availableLength));
    }

    return messages;
};

const truncateString = (str, maxLength) => {
    return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
};

const buildErrorEmbed = (message) => {
    try {
        const parsedMessage = JSON.parse(message);

        // DISCORD EMBED LIMITS
        const maxTitleLength = 256;
        const maxDescriptionLength = 4096;
        const maxFieldLength = 1024;
        const maxFooterLength = 2048;
        const maxTotalLength = 6000;

        let title = truncateString(parsedMessage.title, maxTitleLength);
        let description = truncateString(`**ERROR SUMMARY** ${parsedMessage.summary}\n\`\`\`${parsedMessage.error}\`\`\``, maxDescriptionLength);
        let file = truncateString(parsedMessage.file, maxFieldLength);
        let location = truncateString(parsedMessage.location, maxFieldLength);
        let footerText = truncateString(`Server: ${GAMESERVER_NAME}`, maxFooterLength);

        // Calculate total length
        let totalLength = title.length + description.length + file.length + location.length + footerText.length + 20; // +20 for JSON structure characters

        // Truncate description if total length exceeds maxTotalLength
        if (totalLength > maxTotalLength) {
            const excessLength = totalLength - maxTotalLength;
            description = truncateString(description, maxDescriptionLength - excessLength);
            totalLength = title.length + description.length + file.length + location.length + footerText.length + 20;
        }

        // Recheck and truncate other fields if still exceeds maxTotalLength
        if (totalLength > maxTotalLength) {
            const remainingLength = maxTotalLength - (title.length + file.length + location.length + footerText.length + 20);
            description = truncateString(description, remainingLength);
        }

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .addFields(
                { name: 'FILE', value: file },
                { name: 'LOCATION', value: location, inline: true }
            )
            .setFooter({ text: footerText });
    } catch (e) {
        return null;
    }
};

try {
    if (process.env.NODE_ENV === "production") {
        client.login(process.env.DISCORD_TOKEN);
    } else {
        console.warn("Not production so not setting up discord");
    }

} catch (e) {
    // console.log(e);
}
