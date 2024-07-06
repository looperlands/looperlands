const { Client, GatewayIntentBits} = require('discord.js')
const NodeCache = require( "node-cache" );
const cache = new NodeCache();
const GAMESERVER_NAME = process.env.GAMESERVER_NAME;

let ready = false;
const client = new Client({
    intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers
    ]
});
client.on('ready', () => {
    ready = true;
    console.log(`Logged in as ${client.user.tag}!`);
});

//make sure this line is the last line
if (process.env.DISCORD_TOKEN === undefined) {
    console.warn("DISCORD_TOKEN environment variable not set");
}

sendMessage = (message) => {
    const channels = ['1156612974669209723'];
    try {
        for (let channelId of channels) {
            let channel = client.channels.cache.get(channelId);

            try {
                if (cache.get(message + channelId) === undefined) {
                    cache.set(message + channelId, true, 60*5);
                    channel.send(`${GAMESERVER_NAME}: ${message}`);
                }
            } catch (e) {
                //console.log(message, e);
            }
        }

    } catch (e) {
        //console.log(e);
    }
}

exports.sendMessage = sendMessage;
exports.ready = ready

exports.sendToDevChannel = (message) => {
    const channels = ['1156613041467695144'];
    try {
        for (let channelId of channels) {
            let channel = client.channels.cache.get(channelId);
            try {
                channel.send(`${GAMESERVER_NAME}: ${message}`);
            } catch (e) {
                //console.log(message, e);
            }
        }
    } catch (e) {
        //console.log(e);
    }
}

exports.sendToDebugChannel = (message) => {
    const channels = ['1259006864981758043'];
    try {
        for (let channelId of channels) {
            let channel = client.channels.cache.get(channelId);
            try {
                channel.send(`${GAMESERVER_NAME}: ${message}`);
            } catch (e) {
                //console.log(message, e);
            }
        }
    } catch (e) {
        //console.log(e);
    }
}

try {
    if (process.env.NODE_ENV === "production") {
        client.login(process.env.DISCORD_TOKEN);
    } else {
        console.warn("Not production so not setting up discord");
    }
    
} catch (e) {
    // console.log(e);
}
