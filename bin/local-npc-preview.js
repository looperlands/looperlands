#!/usr/bin/env node
// A self-contained preview: all backend writes go to the loopback fixture API.
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const port = Number(process.env.NPC_PREVIEW_PORT || 8013);
const fixturePort = Number(process.env.NPC_PREVIEW_FIXTURE_PORT || 3013);
const combatPreview = process.env.COMBAT_PREVIEW === '1';
const slamPreview = combatPreview && process.env.COMBAT_SLAM_PREVIEW === '1';
// Set a separate directory for a fresh test session without resetting other previews.
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
    CHAT_HISTORY_FILE: path.join(data, 'chat.json'), NPC_MEMORY_FILE: path.join(data, 'npc-memory.json'),
    FIELD_GUIDE_SPOOL_PATH: path.join(data, 'field-guide-pending.json')
});
delete process.env.DISCORD_TOKEN;
const express = require('express');
const api = express();
api.use(express.json());
const avatars = [1, 2].map(id => '0x' + String(id).padStart(64, '0'));
const wallets = [1, 2].map(id => '0x' + String(id).padStart(40, '0'));
// Give the combat feel test enough damage to chain nearby mobs quickly.
const combatWeapon = '0x82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741';
const experienceAtLevel = level => Math.floor(100 * (9 * level ** 3 - 51 * level ** 2 + 126 * level - 108)) + 1;
const previewExperience = new Map([
    ...avatars.map(nft => [nft, combatPreview ? experienceAtLevel(30) : 100]),
    [combatWeapon, experienceAtLevel(24)]
]);
const gameDataFile = path.join(data, 'lantern-game-data.json');
if (combatPreview) process.env.ACTIVITY_SPOOL_PATH = path.join(data, 'activity.jsonl');
const savedGameData = fs.existsSync(gameDataFile) ? JSON.parse(fs.readFileSync(gameDataFile, 'utf8')) : {};
const gameData = new Map(avatars.map(nft => [nft, savedGameData[nft] || {kills: {}, items: [], quests: [], choices: []}]));
function saveGameData() {
    const temporary = gameDataFile + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(Object.fromEntries(gameData), null, 2));
    fs.renameSync(temporary, gameDataFile);
}
const picnic = require('../server/npc-behaviors/lantern-picnic');

let previewWorld;
let previewCombat;
let picnicScene;
api.get('/preview/state', (req, res) => res.json({
    players: previewWorld?.playerCount || 0,
    attackMode: previewCombat?.fieldAttacks.attackMode, slamEnabled: previewCombat?.fieldAttacks.slamEnabled,
    combat: [...(previewCombat?.encounters.values() || [])].map(e => ({phase:e.phase, until:e.until, serverNow:Date.now(),
        ...previewCombat.fieldAttacks.state(e), combo:e.combo, comboUntil:e.comboUntil, streak:e.streak, streakUntil:e.streakUntil, streakBonusPercent:previewCombat.streakBonus(e), chargeHit:e.chargeHit, correction:e.correction, lastCorrection:e.lastCorrection, xp:previewWorld.server.cache.get(e.player.sessionId)?.xp, stats:e.stats, event:e.event, lane:e.lane,
        player:{x:e.player.x,y:e.player.y,hp:e.player.hitPoints},mob:e.mob?{id:e.mob.id,x:e.mob.x,y:e.mob.y,hp:e.mob.hitPoints}:null})),
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
api.get('/api/asset/nft/:nft/owns', (req, res) => res.json(avatars.some((nft, index) =>
    (nft === req.params.nft || combatPreview && req.params.nft === combatWeapon) && wallets[index] === String(req.query.wallet).toLowerCase())));
api.get(['/api/asset/nft/:nft', '/api/game/asset/info/:nft'], (req, res) => {
    const weapon = combatPreview && req.params.nft === combatWeapon;
    res.json({name: weapon ? 'Local level 24 sword' : 'Local Looper', assetType: weapon ? 'weapon' : 'looper',
        xp: previewExperience.get(req.params.nft), trait: weapon ? 'speed' : 'rogue', class: weapon ? 'sword' : undefined,
        token: {tokenHash: req.params.nft, tokenId: req.params.nft}});
});
api.get('/api/game/asset/equipped/:nft', (req, res) => res.json({weapon: combatPreview ? combatWeapon : 'sword1'}));
api.post('/api/game/asset/xp', (req, res) => {
    const xp = (previewExperience.get(req.body.nftId) || 0) + req.body.xp;
    previewExperience.set(req.body.nftId, xp); res.json({success: true, xp});
});
api.get('/api/game/asset/data/:nft', (req, res) => res.json(gameData.get(req.params.nft) || {}));
api.get('/api/maps/:map/flow', (req, res) => res.json([]));
api.get('/api/maps/:map/music', (req, res) => res.json([]));
// Local shop fixtures are deliberately empty; production reads its configured stock.
api.get('/api/game/shop/inventory/:shop', (req, res) => res.json([]));
api.get('/api/game/asset/modifiers/:server/:nft', (req, res) => res.json(Object.fromEntries([
    'meleeDamageDealt', 'meleeDamageTaken', 'moveSpeed', 'rangedDamageDealt', 'hpRegen', 'maxHp',
    'hate', 'attackRate', 'stealth', 'xp', 'fishing'
].map(key => [key, 1]))));
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
api.get('/api/game/asset/:nft/field-guide', (req, res) => {
    const saved = gameData.get(req.params.nft);
    if (!saved) return res.sendStatus(404);
    res.json({facts: saved.fieldGuide || []});
});
api.post('/api/game/asset/field-guide', (req, res) => {
    const saved = gameData.get(req.body.nftId);
    if (!saved || !Array.isArray(req.body.facts)) return res.sendStatus(400);
    saved.fieldGuide = [...new Set([...(saved.fieldGuide || []), ...req.body.facts])];
    saveGameData();
    res.json({accepted: req.body.facts});
});
api.post('/api/game/asset/kill', (req, res) => {
    for (const kill of req.body) {
        const data = gameData.get(kill.nftId);
        if (data) data.kills[kill.mob] = (data.kills[kill.mob] || 0) + kill.amount;
    }
    saveGameData();
    res.json({success: true});
});
api.post('/api/game/activity', (req, res) => res.json({accepted: req.body.map(row => row.id)}));
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
            xp: previewExperience.get(avatars[index]), mapId: 'main', ...(slamPreview ? {x:59,y:11} : combatPreview ? {x:20,y:150} : {checkpointId:'2'}), f2p: false, trait: 'rogue'})
    });
    const session = await response.json();
    if (!response.ok || !session.sessionId) throw new Error('Could not create local NPC session');
    return process.env.APP_URL + '/?sessionId=' + session.sessionId;
}

api.listen(fixturePort, '127.0.0.1', () => {
    require('../server/world-definitions').register();
    const WS = require('../server/js/ws');
    const server = new WS.socketIOServer();
    const World = require('../server/js/worldserver');
    server.worldsMap = {};
    const world = new World('world_main', 20, server);
    previewWorld = world;
    if (combatPreview) {
        if (process.env.COMBAT_LIVE_PREVIEW !== '1') {
            const {CombatPrototype} = require('../server/js/combatprototype');
            previewCombat = new CombatPrototype(world);
        }

        server.app.get('/__combat_preview/play', async (req, res) => {
            try { res.redirect(await createSession(0)); }
            catch (error) { res.status(500).send(error.message); }
        });
    }
    if (!combatPreview || process.env.COMBAT_LIVE_PREVIEW === '1') {
        previewCombat = new (require('../server/js/combatcontroller'))(world, Date.now, {slam:slamPreview});
    }
    const Messages = require('../server/js/message');
    const packetFor = player => ({...world.npcBehavior.ambienceFor(player), ...world.scenes.packet(player),
        particles: world.map.getSceneAt(player.x, player.y)?.name === world.npcBehavior.config.ambience.scene ? world.npcBehavior.config.ambience.particles : 'none',
        serverTime: Date.now(), epoch: 0,
        previewSlam: slamPreview, previewAttackMode: previewCombat?.fieldAttacks.attackMode,
        previewPicnic: combatPreview ? null : picnicScene?.state || null,
        previewStory: combatPreview ? null : {title: 'The Lantern Picnic', goal: picnic.progress(server.cache.get(player.sessionId)?.gameData),
            event: picnicScene?.state?.message || '',
            canReplay: picnicScene?.completed(player) && (!picnicScene.state || picnicScene.state.phase === 'finished')}});
    const configureAmbience = (mode = 'night') => {
        if (!world.npcBehavior) return;
        const ambience = world.npcBehavior.config.ambience;
        Object.assign(ambience, {mode, previewTimeMode: mode, previewControls: true, previewCombat: combatPreview && process.env.COMBAT_LIVE_PREVIEW !== '1', previewSlam:slamPreview, previewAttackMode:previewCombat?.fieldAttacks.attackMode});
        for (const player of Object.values(world.players)) {
            world.pushToPlayer(player, new Messages.WorldAmbience(packetFor(player)));
        }
    };
    if (slamPreview) server.app.post('/__combat_preview/patterns', (req,res) => {
        if (!previewCombat.fieldAttacks.setMode(req.body.mode)) return res.sendStatus(400);
        // Mode changes cancel warnings without resetting health, position, target or XP.
        for (const encounter of previewCombat.encounters.values()) previewCombat.fieldAttacks.clear(encounter);
        previewCombat.fieldAttacks.cooldowns.clear();
        configureAmbience(world.npcBehavior.config.ambience.mode);
        for (const encounter of previewCombat.encounters.values()) previewCombat.send(encounter);
        res.json({mode:previewCombat.fieldAttacks.attackMode});
    });
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
        picnicScene = world.scenes.get('lantern-picnic');
        Object.assign(world.npcBehavior.config.ambience, {mode: 'night', previewTimeMode: 'night', previewControls: true, previewCombat: combatPreview && process.env.COMBAT_LIVE_PREVIEW !== '1', previewSlam:slamPreview, previewAttackMode:previewCombat?.fieldAttacks.attackMode,
            previewStory: combatPreview ? null : {title: 'The Lantern Picnic', goal: picnic.progress()}});
    });
    const storyGoals = new Map();
    setInterval(() => {

        if (combatPreview) return;
        for (const player of Object.values(world.players)) {
            const packet = packetFor(player);
            const goal = packet.previewStory.goal + packet.previewStory.event;
            if (world.map.getSceneAt(player.x, player.y)?.name !== packet.scene) {
                storyGoals.delete(player.id);
                continue;
            }
            if (storyGoals.get(player.id) !== goal) {
                world.pushToPlayer(player, new Messages.WorldAmbience(packet));
                storyGoals.set(player.id, goal);
            }
        }
        for (const id of storyGoals.keys()) if (!world.players[id]) storyGoals.delete(id);
    }, 1000);
    server.onConnect(function(connection) {
        const player = new Player(connection, world);
        world.combat?.bind(player);
        world.connect_callback(player);
    });
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
