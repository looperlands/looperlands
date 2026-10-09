#!/usr/bin/env node
// Two real game clients; all API writes go to the loopback PostgreSQL farming fixture.
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.resolve(__dirname, '..'); process.chdir(root);
const port = Number(process.env.FARM_PREVIEW_PORT || 8014), fixturePort = Number(process.env.FARM_PREVIEW_FIXTURE_PORT || 3014);
const phpUrl = process.env.FARM_PREVIEW_API_URL || 'http://127.0.0.1:3314';
if (!['127.0.0.1', 'localhost'].includes(new URL(phpUrl).hostname)) throw new Error('Preview API must be loopback');
const data = path.join(os.tmpdir(), 'looperlands-farming-preview'); fs.mkdirSync(data, {recursive: true});
Object.assign(process.env, {NODE_ENV: 'development', APP_URL: 'http://127.0.0.1:' + port, GAMESERVER_NAME: 'local-farming-preview',
    LOOPWORMS_API_KEY: 'local-farming-preview-only', LOOPWORMS_LOOPERLANDS_BASE_URL: 'http://127.0.0.1:' + fixturePort,
    LOOPERLANDS_BACKEND_BASE_URL: 'http://127.0.0.1:' + fixturePort, LOOPERLANDS_BACKEND_API_KEY: 'local-only',
    LOOPERLANDS_PLATFORM_BASE_URL: 'http://127.0.0.1:' + fixturePort, LOOPERLANDS_PLATFORM_API_KEY: 'local-only',
    LOOPERLANDS_ATOMIC_FARMING: '1', CHAT_HISTORY_FILE: path.join(data, 'chat.json'), NPC_MEMORY_FILE: path.join(data, 'npcs.json')});
delete process.env.DISCORD_TOKEN;
const express = require('express'), axios = require('axios');
const api = express(); api.use(express.json());
const GameTypes = require('../shared/js/gametypes');
const avatars = [1, 2].map(id => '0x' + String(id).padStart(64, '0'));
const wallets = [1, 2].map(id => '0x' + String(id).padStart(40, '0'));
let server, world, target, sessions;
api.use(async (req, res, next) => {
    if (!/^\/api\/game\/(farming|inventory\/transactions|asset\/(data|inventory|xp))/.test(req.path) && !req.path.startsWith('/__fixture')) return next();
    try {
        const response = await axios({method: req.method, url: phpUrl + req.originalUrl, data: ['POST', 'PUT'].includes(req.method) ? req.body : undefined,
            validateStatus: () => true}); res.status(response.status).json(response.data);
    } catch (error) {res.status(503).json({code: 'fixture_unavailable'});}
});
api.get('/preview/state', (req, res) => res.json({target, sessions, players: Object.values(world?.players || {}).map(p => ({id: p.id, nftId: p.nftId, x: p.x, y: p.y, level: p.level}))}));
api.get('/preview/player/:index', async (req, res) => {
    const index = Number(req.params.index) - 1;
    if (![0, 1].includes(index)) return res.sendStatus(404);
    res.redirect(await createSession(index));
});
api.get('/api/asset/nft/:nft/owns', (req, res) => res.json(avatars.some((nft, i) => nft === req.params.nft && wallets[i] === req.query.wallet)));
api.get('/api/asset/nft/:nft', (req, res) => res.json({name: 'Local Farmer', assetType: 'looper', token: {tokenHash: req.params.nft, tokenId: req.params.nft}}));
api.get('/api/game/asset/equipped/:nft', (req, res) => res.json({weapon: 'sword1'}));
api.get('/api/game/asset/modifiers/:server/:nft', (req, res) => res.json(Object.fromEntries([
    'meleeDamageDealt','meleeDamageTaken','moveSpeed','rangedDamageDealt','hpRegen','maxHp','hate','attackRate','stealth','xp','fishing'].map(key => [key, 1]))));
api.get(/.*/, (req, res) => res.json([]));
api.post(/.*/, (req, res) => res.json({success: true}));
api.put(/.*/, (req, res) => res.json({success: true}));
require('../server/js/ens').getEns = async wallet => 'Farmer ' + (wallets.indexOf(wallet) + 1);
const discord = require('../server/js/discord'); discord.sendMessage = async () => {}; discord.sendToDevChannel = async () => {};
async function createSession(index) {
    const {data: state} = await axios.get(phpUrl + '/api/game/asset/data/' + avatars[index]);
    const response = await axios.post(process.env.APP_URL + '/session', {walletId: wallets[index], nftId: avatars[index],
        title: 'Local Farmer', xp: state.xp, mapId: 'duckville', x: target.positions[index].x, y: target.positions[index].y,
        f2p: false, trait: 'rogue'}, {headers: {'x-api-key': process.env.LOOPWORMS_API_KEY}});
    return process.env.APP_URL + '/?sessionId=' + response.data.sessionId;
}
(async () => {
    await axios.post(phpUrl + '/__fixture/init', {players: avatars.map((nftId, i) => ({nftId, xp: i ? 10000 : 1000000})),
        items: Object.fromEntries(['M88NSHOVEL','M88NWATERCAN','M88NSEEDS','M88NPOO'].map(key => [GameTypes.Entities[key], key === 'M88NSEEDS' ? 10 : 1]))});
    api.listen(fixturePort, '127.0.0.1', () => {
        require('../server/world-definitions').register();
        const definitions = require('../client/tileActions/duckville.json');
        for (const farm of Object.values(definitions)) for (const crop of Object.values(farm.crops || {})) crop.growSeconds = 12;
        const FarmController = require('../server/js/tileactions/duckvillecontroller');
        const loadDefinitions = FarmController.prototype.loadStageDefinitions;
        FarmController.prototype.loadStageDefinitions = () => ({duckville: definitions});
        const WS = require('../server/js/ws'), World = require('../server/js/worldserver');
        FarmController.prototype.loadStageDefinitions = loadDefinitions;
        server = new WS.socketIOServer(); server.worldsMap = {};
        world = new World('world_duckville', 20, server); server.worldsMap.duckville = world;
        world.run(path.join(root, 'server/maps/world_server_duckville.json'));
        const ready = world.map.ready_func;
        world.map.ready(() => {
            ready();
            const Controller = require('../server/js/tileactions/duckvillecontroller');
            const grid = new Controller(server.cache, null).getMapActionGrid('duckville');
            for (const [key, action] of Object.entries(grid)) {
                if (action.action !== 'farm') continue;
                const [x,y] = key.split('.').map(Number);
                const neighbors = [[x-1,y],[x-1,y+1],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b]) => world.isValidPosition(a,b));
                if (neighbors.length >= 2) {target = {name: 'farm', gridX: x, gridY: y, positions: neighbors.slice(0,2).map(([x,y]) => ({x,y}))}; break;}
            }
            if (!target) throw new Error('No valid farm preview location');
            Promise.all([createSession(0), createSession(1)]).then(urls => {
                sessions = urls; fs.writeFileSync(path.join(data, 'sessions.json'), JSON.stringify({target, urls}, null, 2));
                urls.forEach((url,i) => console.log('FARM PREVIEW PLAYER ' + (i+1) + ': ' + url));
            }).catch(console.error);
        });
        server.onConnect(connection => world.connect_callback(new Player(connection, world)));
        server.onRequestStatus(() => JSON.stringify([world.playerCount])); server.onError(console.error);
    });
})().catch(error => {console.error(error.message); process.exitCode = 1;});
