#!/usr/bin/env node
// Real game clients against the isolated PostgreSQL quest fixture; no production API calls.
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.resolve(__dirname, '..'); process.chdir(root);
const port = Number(process.env.QUEST_PREVIEW_PORT || 8018);
const fixturePort = Number(process.env.QUEST_PREVIEW_FIXTURE_PORT || 3018);
const phpUrl = process.env.QUEST_PREVIEW_API_URL || 'http://127.0.0.1:3318';
if (!['127.0.0.1', 'localhost'].includes(new URL(phpUrl).hostname)) throw new Error('Preview API must be loopback');
const data = process.env.QUEST_PREVIEW_DATA || path.join(os.tmpdir(), 'looperlands-quest-board-preview');
const configDir = path.join(data, 'quests'); fs.mkdirSync(configDir, {recursive: true});
const configFile = path.join(configDir, 'main.json');
if (!fs.existsSync(configFile)) {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'docs/examples/main.json'), 'utf8'));
    config.quests.unshift(...require('../server/js/quests/main').quests);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
}
Object.assign(process.env, {
    NODE_ENV: 'development', APP_URL: 'http://127.0.0.1:' + port, GAMESERVER_NAME: 'local-quest-board-preview',
    LOOPWORMS_API_KEY: 'local-quest-preview-only', LOOPWORMS_LOOPERLANDS_BASE_URL: 'http://127.0.0.1:' + fixturePort,
    LOOPERLANDS_BACKEND_BASE_URL: 'http://127.0.0.1:' + fixturePort, LOOPERLANDS_BACKEND_API_KEY: 'local-only',
    LOOPERLANDS_PLATFORM_BASE_URL: 'http://127.0.0.1:' + fixturePort, LOOPERLANDS_PLATFORM_API_KEY: 'local-only',
    QUEST_BOARD_CONFIG_DIR: configDir, QUEST_BOARD_PROGRESS_FILE: path.join(data, 'progress.jsonl'),
    CHAT_HISTORY_FILE: path.join(data, 'chat.json'), NPC_MEMORY_FILE: path.join(data, 'npcs.json')
});
delete process.env.DISCORD_TOKEN;
const express = require('express'), axios = require('axios');
const Types = require('../shared/js/gametypes');
const api = express(); api.use(express.json());
const avatars = [41, 42].map(id => '0x' + String(id).padStart(64, '0'));
const wallets = [41, 42].map(id => '0x' + String(id).padStart(40, '0'));
let server, world, sessions;
const target = {mapId: 'main', board: {x: 44, y: 214}, handIn: {x: 48, y: 218}};
api.use(async (req, res, next) => {
    if (!/^\/api\/game\/(quest-board|farming|inventory\/(transactions|transfer)|asset\/(data|inventory|xp))/.test(req.path) && !req.path.startsWith('/__fixture')) return next();
    try {
        const response = await axios({method: req.method, url: phpUrl + req.originalUrl,
            data: ['POST', 'PUT'].includes(req.method) ? req.body : undefined, validateStatus: () => true});
        res.status(response.status).json(response.data);
    } catch {res.status(503).json({code: 'fixture_unavailable'});}
});
api.get('/preview/state', (req, res) => res.json({target, sessions, configFile,
    players: Object.values(world?.players || {}).map(p => ({id: p.id, nftId: p.nftId, x: p.x, y: p.y, level: p.level}))}));
api.get('/preview/player/:index', async (req, res) => {
    const index = Number(req.params.index) - 1;
    if (![0, 1].includes(index)) return res.sendStatus(404);
    try {res.redirect(await createSession(index));} catch (error) {res.status(503).send(error.message);}
});
api.get('/api/asset/nft/:nft/owns', (req, res) => res.json(avatars.some((nft, i) => nft === req.params.nft && wallets[i] === req.query.wallet)));
api.get('/api/asset/nft/:nft', (req, res) => res.json({name: 'Local Adventurer', assetType: 'looper', token: {tokenHash: req.params.nft, tokenId: req.params.nft}}));
api.get('/api/game/asset/equipped/:nft', (req, res) => res.json({weapon: 'sword1'}));
api.get('/api/game/asset/modifiers/:server/:nft', (req, res) => res.json(Object.fromEntries([
    'meleeDamageDealt', 'meleeDamageTaken', 'moveSpeed', 'rangedDamageDealt', 'hpRegen', 'maxHp', 'hate', 'attackRate', 'stealth', 'xp', 'fishing'
].map(key => [key, 1]))));
api.get(/.*/, (req, res) => res.json([]));
api.post(/.*/, (req, res) => res.json({success: true}));
api.put(/.*/, (req, res) => res.json({success: true}));
require('../server/js/ens').getEns = async wallet => 'Adventurer ' + (wallets.indexOf(wallet) + 1);
const discord = require('../server/js/discord'); discord.sendMessage = async () => {}; discord.sendToDevChannel = async () => {};
async function createSession(index) {
    const {data: state} = await axios.get(phpUrl + '/api/game/asset/data/' + avatars[index]);
    const response = await axios.post(process.env.APP_URL + '/session', {walletId: wallets[index], nftId: avatars[index],
        title: 'Local Adventurer', xp: state.xp, mapId: 'main', x: 43, y: 216 + index, f2p: false, trait: 'rogue'},
    {headers: {'x-api-key': process.env.LOOPWORMS_API_KEY}});
    return process.env.APP_URL + '/?sessionId=' + response.data.sessionId;
}
(async () => {
    await axios.post(phpUrl + '/__fixture/init', {
        players: avatars.map((nftId, i) => ({nftId, wallet: wallets[i], xp: 10000,
            items: {[Types.Entities.BOARHIDE]: 10, [Types.Entities.ORE]: 10}})),
        funding: [{id: 'quest-preview', mapId: 'main', item: String(Types.Entities.M88NSEEDS), amount: 1000}]
    });
    api.listen(fixturePort, '127.0.0.1', () => {
        require('../server/world-definitions').register();
        const WS = require('../server/js/ws'), World = require('../server/js/worldserver');
        server = new WS.socketIOServer(); server.worldsMap = {};
        // The isolated fixture has no NFT sprite service. Use a bundled avatar
        // only in these two preview session responses; NFT ownership, balances,
        // progress, and the regular game handshake still use fixture identities.
        const sendJson = server.app.response.json;
        server.app.response.json = function (body) {
            if (this.req.method === 'GET' && /^\/session\/[^/]+$/.test(this.req.path)
                && avatars.includes(body?.nftId) && body?.player) {
                body = {...body, player: {...body.player, armor: 'clotharmor'}};
            }
            return sendJson.call(this, body);
        };
        world = new World('world_main', 20, server); server.worldsMap.main = world;
        world.run(path.join(root, 'server/maps/world_server_main.json'));
        const ready = world.map.ready_func;
        world.map.ready(() => {
            ready();
            Promise.all([createSession(0), createSession(1)]).then(urls => {
                sessions = urls;
                fs.writeFileSync(path.join(data, 'sessions.json'), JSON.stringify({target, urls, configFile}, null, 2));
                console.log('QUEST PREVIEW: http://127.0.0.1:' + fixturePort + '/preview/player/1');
                console.log('SECOND PLAYER: http://127.0.0.1:' + fixturePort + '/preview/player/2');
                console.log('EDIT CONFIG: ' + configFile);
            }).catch(console.error);
        });
        server.onConnect(connection => world.connect_callback(new Player(connection, world)));
        server.onRequestStatus(() => JSON.stringify([world.playerCount])); server.onError(console.error);
    });
})().catch(error => {console.error(error.message); process.exitCode = 1;});
