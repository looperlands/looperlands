#!/usr/bin/env node
// A self-contained preview: all backend writes go to the loopback fixture API.
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const port = Number(process.env.NPC_PREVIEW_PORT || 8013);
const fixturePort = Number(process.env.NPC_PREVIEW_FIXTURE_PORT || 3013);
const data = process.env.NPC_PREVIEW_DATA_DIR || path.join(os.tmpdir(), 'looperlands-npc-preview');
fs.mkdirSync(data, {recursive: true});
Object.assign(process.env, {
    NODE_ENV: 'development', APP_URL: 'http://127.0.0.1:' + port, GAMESERVER_NAME: 'local-npc-preview',
    LOOPWORMS_API_KEY: 'local-npc-preview-only',
    LOOPWORMS_LOOPERLANDS_BASE_URL: 'http://127.0.0.1:' + fixturePort,
    LOOPERLANDS_BACKEND_BASE_URL: 'http://127.0.0.1:' + fixturePort,
    LOOPERLANDS_BACKEND_API_KEY: 'local-only',
    LOOPERLANDS_PLATFORM_BASE_URL: 'http://127.0.0.1:' + fixturePort,
    LOOPERLANDS_PLATFORM_API_KEY: 'local-only',
    CHAT_HISTORY_FILE: path.join(data, 'chat.json'), NPC_MEMORY_FILE: path.join(data, 'npc-memory.json')
});
delete process.env.DISCORD_TOKEN;
const express = require('express');
const api = express();
api.use(express.json());
const avatars = [1, 2].map(id => '0x' + String(id).padStart(64, '0'));
const wallets = [1, 2].map(id => '0x' + String(id).padStart(40, '0'));
const gameDataFile = path.join(data, 'lantern-game-data.json');
const savedGameData = fs.existsSync(gameDataFile) ? JSON.parse(fs.readFileSync(gameDataFile, 'utf8')) : {};
const gameData = new Map(avatars.map(nft => [nft, savedGameData[nft] || {kills: {}, items: [], quests: [], choices: []}]));
function saveGameData() {
    const temporary = gameDataFile + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(Object.fromEntries(gameData), null, 2));
    fs.renameSync(temporary, gameDataFile);
}
const picnic = require('../server/npc-behaviors/lantern-picnic');

const previewControls = process.env.NPC_PREVIEW_CONTROLS !== 'off';
let previewWorld;
let picnicScene;
api.get('/preview/state', (req, res) => res.json({
    players: previewWorld?.playerCount || 0,
    playerPositions: Object.values(previewWorld?.players || {}).map(p => ({index: avatars.indexOf(p.nftId) + 1, x: p.x, y: p.y})),
    picnic: picnicScene?.state || null,
    npcs: [...(previewWorld?.npcBehavior?.routines.values() || [])].map(({npc, definition}) => ({
        key: definition.key, id: npc.id, kind: npc.kind, x: npc.x, y: npc.y, ...npc.behaviorState
    }))
}));
api.get('/preview/player/:index', async (req, res) => {
    const index = Number(req.params.index) - 1;
    if (![0, 1].includes(index)) return res.sendStatus(404);
    try { res.redirect(await createSession(index)); }
    catch (error) { res.status(500).send(error.message); }
});
// Local-fixture travel only, for exercising distant main-map chapters quickly.
api.post('/preview/player/:index/location', (req, res) => {
    const nft = avatars[Number(req.params.index) - 1];
    const player = Object.values(previewWorld?.players || {}).find(p => p.nftId === nft);
    const {x, y} = req.body;
    if (!player || !Number.isInteger(x) || !Number.isInteger(y) || !previewWorld.isValidPosition(x, y)) return res.sendStatus(400);
    const Messages = require('../server/js/message');
    player.setPosition(x, y); player.clearTarget();
    player.broadcast(new Messages.Teleport(player));
    previewWorld.pushToPlayer(player, new Messages.Teleport(player));
    previewWorld.handlePlayerVanish(player); previewWorld.pushRelevantEntityListTo(player);
    res.json({x: player.x, y: player.y});
});
api.get('/api/asset/nft/:nft/owns', (req, res) => res.json(avatars.some((nft, index) =>
    nft === req.params.nft && wallets[index] === String(req.query.wallet).toLowerCase())));
api.get('/api/asset/nft/:nft', (req, res) => res.json({
    name: 'Local Looper', assetType: 'looper', token: {tokenHash: req.params.nft, tokenId: req.params.nft}
}));
api.get('/api/game/asset/equipped/:nft', (req, res) => res.json({weapon: 'sword1'}));
api.get('/api/game/asset/data/:nft', (req, res) => res.json(gameData.get(req.params.nft) || {}));
api.get('/api/maps/:map/flow', (req, res) => res.json([]));
api.get('/api/maps/:map/music', (req, res) => res.json([]));
api.get('/api/game/asset/modifiers/:server/:nft', (req, res) => res.json(Object.fromEntries([
    'meleeDamageDealt', 'meleeDamageTaken', 'moveSpeed', 'rangedDamageDealt', 'hpRegen', 'maxHp',
    'hate', 'attackRate', 'stealth', 'xp', 'fishing'
].map(key => [key, key === 'maxHp' ? Number(process.env.NPC_PREVIEW_HEALTH_MULTIPLIER || 1) : 1]))));
api.get('/api/game/asset/:nft/stats', (req, res) => res.json({}));
api.post('/api/game/asset/quest', (req, res) => {
    const data = gameData.get(req.body.nftId);
    if (!data) return res.sendStatus(404);
    data.quests = data.quests.filter(quest => (quest.questKey || quest.id) !== req.body.questKey);
    data.quests.push({questKey: req.body.questKey, status: req.body.status});
    saveGameData();
    res.json({success: true});
});
api.post('/api/game/asset/choice', (req, res) => {
    const data = gameData.get(req.body.nftId);
    if (!data) return res.sendStatus(404);
    if (!data.choices.includes(req.body.choice)) data.choices.push(req.body.choice);
    saveGameData();
    res.json({success: true});
});
api.post('/api/game/asset/kill', (req, res) => {
    for (const kill of req.body) {
        const data = gameData.get(kill.nftId);
        if (data) data.kills[kill.mob] = (data.kills[kill.mob] || 0) + kill.amount;
    }
    saveGameData();
    res.json({success: true});
});
api.get(/.*/, (req, res) => res.json([]));
api.post(/.*/, (req, res) => res.json({success: true, xp: 0}));
api.put(/.*/, (req, res) => res.json({success: true}));
require('../server/js/ens').getEns = async wallet => 'Local Looper ' + (wallets.indexOf(wallet) + 1);
const discord = require('../server/js/discord');
discord.sendMessage = async () => {};
discord.sendToDevChannel = async () => {};

async function createSession(index) {
    const response = await fetch(process.env.APP_URL + '/session', {
        method: 'POST', headers: {'Content-Type': 'application/json', 'x-api-key': process.env.LOOPWORMS_API_KEY},
        body: JSON.stringify({walletId: wallets[index], nftId: avatars[index], title: 'Local Looper ' + (index + 1),
            xp: 100, mapId: 'main', checkpointId: '2', f2p: false, trait: 'rogue'})
    });
    const session = await response.json();
    if (!response.ok || !session.sessionId) throw new Error('Could not create local NPC session');
    return process.env.APP_URL + '/?sessionId=' + session.sessionId;
}

api.listen(fixturePort, '127.0.0.1', () => {
    const WS = require('../server/js/ws');
    const server = new WS.socketIOServer();
    const World = require('../server/js/worldserver');
    server.worldsMap = {};
    const world = new World('world_main', 20, server);
    previewWorld = world;
    const Messages = require('../server/js/message');
    const packetFor = player => {
        const road = world.lanternRoad.packet(player);
        const choices = server.cache.get(player.sessionId)?.gameData?.choices || [];
        return ({...world.npcBehavior.config.ambience,
        particles: world.map.getSceneAt(player.x, player.y)?.name === world.npcBehavior.config.ambience.scene ? world.npcBehavior.config.ambience.particles : 'none',
        serverTime: Date.now(), epoch: 0,
        ...road,
        picnic: road.finalePicnic || (picnicScene?.state && {...picnicScene.state, music: choices.includes(picnic.MUSIC)}) || null,
        previewPicnic: picnicScene?.state || null,
        previewStory: {title: 'The Lantern Picnic', goal: picnic.progress(server.cache.get(player.sessionId)?.gameData),
            event: picnicScene?.state?.message || '',
            canReplay: picnicScene?.completed(player) && (!picnicScene.state || picnicScene.state.phase === 'finished')}});
    };
    const configureAmbience = (mode = 'night') => {
        if (!world.npcBehavior) return;
        const ambience = world.npcBehavior.config.ambience;
        Object.assign(ambience, {mode, previewTimeMode: mode, previewControls});
        for (const player of Object.values(world.players)) {
            world.pushToPlayer(player, new Messages.WorldAmbience(packetFor(player)));
        }
    };
    server.app.post('/__npc_preview/ambience', (req, res) => {
        if (!['day', 'night', 'cycle'].includes(req.body.mode)) return res.sendStatus(400);
        configureAmbience(req.body.mode);
        res.json({mode: req.body.mode});
    });
    server.app.post('/__npc_preview/picnic', (req, res) => {
        const session = server.cache.get(req.body.sessionId);
        const player = session && world.getPlayerById(session.entityId);
        if (!player || !avatars.includes(player.nftId) || !picnicScene?.completed(player)) return res.sendStatus(400);
        if (picnicScene.state && picnicScene.state.phase !== 'finished') return res.sendStatus(409);
        picnicScene.start(player);
        res.json({started: true});
    });
    server.worldsMap.main = world;
    world.run(path.join(root, 'server/maps/world_server_main.json'));
    const initializeMap = world.map.ready_func;
    world.map.ready(() => {
        initializeMap();
        picnicScene = world.lanternPicnic;
        Object.assign(world.npcBehavior.config.ambience, {mode: 'night', previewTimeMode: 'night', previewControls,
            previewStory: {title: 'The Lantern Picnic', goal: picnic.progress()}});
    });
    const storyGoals = new Map();
    setInterval(() => {

        for (const player of Object.values(world.players)) {
            const packet = packetFor(player);
            const goal = JSON.stringify([packet.story, packet.picnic, packet.previewStory]);
            if (storyGoals.get(player.id) !== goal) {
                world.pushToPlayer(player, new Messages.WorldAmbience(packet));
                storyGoals.set(player.id, goal);
            }
        }
        for (const id of storyGoals.keys()) if (!world.players[id]) storyGoals.delete(id);
    }, 1000);
    server.onConnect(function(connection) { world.connect_callback(new Player(connection, world)); });
    server.onRequestStatus(() => JSON.stringify([world.playerCount]));
    server.onError(error => console.error(error));
    // The server's handlers wait for the map; sessions are printed after setup.
    setTimeout(async () => {
        try {
            configureAmbience();
            const urls = await Promise.all([createSession(0), createSession(1)]);
            fs.writeFileSync(path.join(data, 'sessions.json'), JSON.stringify(urls, null, 2));
            urls.forEach((url, index) => console.log('NPC PREVIEW PLAYER ' + (index + 1) + ': ' + url));
        } catch (error) { console.error(error); }
    }, 1500);
});
