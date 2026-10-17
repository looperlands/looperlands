#!/usr/bin/env node
// Real LL client/world with loopback-only platform fixtures. No production writes.
const path = require('path');
const fs = require('fs');
const os = require('os');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const port = Number(process.env.ARCADE_WORLD_PORT || 8027);
const fixturePort = Number(process.env.ARCADE_FIXTURE_PORT || 3027);
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'll-arcade-world-'));
Object.assign(process.env, {
    NODE_ENV: 'development', APP_URL: `http://127.0.0.1:${port}`, GAMESERVER_NAME: 'local-arcade-preview',
    LOOPWORMS_API_KEY: 'local-arcade-only', LOOPERLANDS_BIND_ADDRESS: '127.0.0.1',
    LOOPWORMS_LOOPERLANDS_BASE_URL: `http://127.0.0.1:${fixturePort}`,
    LOOPERLANDS_BACKEND_BASE_URL: `http://127.0.0.1:${fixturePort}`, LOOPERLANDS_BACKEND_API_KEY: 'local-only',
    LOOPERLANDS_PLATFORM_BASE_URL: `http://127.0.0.1:${fixturePort}`, LOOPERLANDS_PLATFORM_API_KEY: 'local-only',
    CHAT_HISTORY_FILE: path.join(data, 'chat.json'), NPC_MEMORY_FILE: path.join(data, 'npcs.json'),
    ACTIVITY_SPOOL_PATH: path.join(data, 'activity.jsonl')
});
delete process.env.DISCORD_TOKEN;
const express = require('express');
const api = express();
api.use(express.json());
const avatar = '0x' + '1'.padStart(64, '0');
const wallet = '0x' + '1'.padStart(40, '0');
api.get('/api/asset/nft/:nft/owns', (req, res) => res.json(req.params.nft === avatar && req.query.wallet === wallet));
api.get(['/api/asset/nft/:nft', '/api/game/asset/info/:nft'], (req, res) => res.json({
    name: 'Arcade Explorer', assetType: 'looper', xp: 100, trait: 'rogue',
    token: {tokenHash: req.params.nft, tokenId: req.params.nft}
}));
api.get('/api/game/asset/equipped/:nft', (req, res) => res.json({weapon: 'sword1'}));
api.get('/api/game/asset/data/:nft', (req, res) => res.json({kills: {}, items: [], quests: [], choices: []}));
api.get('/api/game/asset/modifiers/:server/:nft', (req, res) => res.json(Object.fromEntries([
    'meleeDamageDealt', 'meleeDamageTaken', 'moveSpeed', 'rangedDamageDealt', 'hpRegen', 'maxHp',
    'hate', 'attackRate', 'stealth', 'xp', 'fishing'
].map(key => [key, 1]))));
api.get('/api/game/asset/:nft/stats', (req, res) => res.json({}));
api.post('/api/game/activity', (req, res) => res.json({accepted: req.body.map(row => row.id)}));
api.get(/.*/, (req, res) => res.json([]));
api.post(/.*/, (req, res) => res.json({success: true, xp: 100}));
api.put(/.*/, (req, res) => res.json({success: true}));
require('../server/js/ens').getEns = async () => 'Arcade Explorer';
const discord = require('../server/js/discord');
discord.sendMessage = async () => {};
discord.sendToDevChannel = async () => {};
api.listen(fixturePort, '127.0.0.1', () => {
    require('../server/world-definitions').register();
    const WS = require('../server/js/ws');
    const World = require('../server/js/worldserver');
    const server = new WS.socketIOServer();
    const world = new World('world_m88n2', 20, server);
    server.worldsMap = {m88n2: world};
    world.run(path.join(root, 'server/maps/world_server_m88n2.json'));
    server.onConnect(connection => world.connect_callback(new Player(connection, world)));
    server.onRequestStatus(() => JSON.stringify([world.playerCount]));
    server.onError(error => console.error(error));
    server.app.get('/arcade-play', async (req, res) => {
        try {
            const response = await fetch(process.env.APP_URL + '/session', {
                method: 'POST', headers: {'Content-Type': 'application/json', 'x-api-key': process.env.LOOPWORMS_API_KEY},
                body: JSON.stringify({walletId: wallet, nftId: avatar, title: 'Arcade Explorer', xp: 100,
                    mapId: 'm88n2', x: 91, y: 32, f2p: false, trait: 'rogue'})
            });
            const session = await response.json();
            if (!response.ok || !session.sessionId) throw new Error('Could not create local arcade session');
            res.redirect('/?sessionId=' + session.sessionId);
        } catch (error) { res.status(500).send(error.message); }
    });
    // Local test endpoint exercises the real server damage/death path.
    server.app.post('/__arcade_preview/defeat', (req, res) => {
        const player = Object.values(world.players).find(player => player.nftId === avatar);
        if (!player || player.isDead) return res.sendStatus(409);
        player.handleHurt({kind: require('../shared/js/gametypes').Entities.RAT, type: 'mob'}, player.hitPoints);
        res.json({dead: player.isDead});
    });
    console.log(`IN-GAME ARCADE: http://127.0.0.1:${port}/arcade-play`);
});
