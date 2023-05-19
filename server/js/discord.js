const { Client, GatewayIntentBits} = require('discord.js')

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
    try {
        let channel = client.channels.cache.get('1108905948308844704');
        try {
            channel.send(message);
        } catch (e) {
            console.log(message, e);
        }
    } catch (e) {
        console.log(e);
    }
    
}
exports.sendMessage = sendMessage;
exports.ready = ready
try {
    client.login(process.env.DISCORD_TOKEN);
} catch (e) {
    console.log(e);
}
