#!/usr/bin/env node
// The real game, with main/DreamLand maps and isolated local progress. No Platform account needed.
const fs = require('fs');
const path = require('path');
const os = require('os');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const port = Number(process.env.PARALLAX_PREVIEW_PORT || 8064);
const data = process.env.PARALLAX_PREVIEW_DATA_DIR || path.join(os.tmpdir(), 'looperlands-parallax-preview');
fs.mkdirSync(data, {recursive: true});
Object.assign(process.env, {
    NODE_ENV: 'development', LOOPERLANDS_LOCAL_PLAYTEST: '1',
    APP_URL: 'http://127.0.0.1:' + port, LOOPERLANDS_BIND_ADDRESS: '127.0.0.1',
    GAMESERVER_NAME: 'local-parallax-preview', LOOPWORMS_API_KEY: 'local-parallax-preview-only',
    LOOPERLANDS_LOCAL_DATA_DIR: data,
    CHAT_HISTORY_FILE: path.join(data, 'chat.json'), NPC_MEMORY_FILE: path.join(data, 'npcs.json'),
    FIELD_GUIDE_SPOOL_PATH: path.join(data, 'field-guide.json'), ACTIVITY_SPOOL_PATH: path.join(data, 'activity.jsonl'),
    LOOPERLANDS_TOOLBOX_URL: 'http://127.0.0.1:' + port + '/parallax/'
});
delete process.env.DISCORD_TOKEN;
require('../server/world-definitions').register();
const WS = require('../server/js/ws');
const World = require('../server/js/worldserver');
const server = new WS.socketIOServer();
server.worldsMap = {};
for (const mapId of ['main', 'm88n']) {
    const world = new World('world_' + mapId, 20, server);
    new (require('../server/js/combatcontroller'))(world);
    server.worldsMap[mapId] = world;
    world.run(path.join(root, 'server/maps/world_server_' + mapId + '.json'));
}
server.onConnect(connection => {
    const world = server.worldsMap[connection._connection.handshake.query.mapId];
    if (!world) return connection.close('Map unavailable in this local preview');
    const player = new Player(connection, world);
    world.combat?.bind(player);
    world.connect_callback(player);
});
server.onRequestStatus(() => JSON.stringify(Object.values(server.worldsMap).map(world => world.playerCount)));
server.onError(error => console.error(error));
const destinations = {
    town: {label: 'Town · garden breeze', x: 42, y: 216},
    beach: {label: 'Beach · clouds', x: 44, y: 272},
    forest: {label: 'Forest · layered trees', x: 42, y: 166},
    graveyard: {label: 'Graveyard · mist', x: 44, y: 123},
    desert: {label: 'Desert · drifting sand', x: 44, y: 84},
    lava: {label: 'Lavaland · smoke & embers', x: 44, y: 35},
    'party-beach': {label: 'Party beach · sea haze', x: 48, y: 451},
    blacksmith: {label: 'Blacksmith · forge embers', x: 155, y: 440},
    gauntlet: {label: 'Gauntlet · cold haze', x: 33, y: 372},
    dreamland: {label: 'DreamLand · deep sky', mapId: 'm88n', x: 100, y: 164}
};
server.app.get('/parallax/play/:scene', async (req, res) => {
    const destination = destinations[req.params.scene];
    if (!destination) return res.sendStatus(404);
    const mapId = destination.mapId || 'main', world = server.worldsMap[mapId];
    if (!world.map?.isLoaded) return res.status(503).send('Map is still loading. Refresh in a moment.');
    const scene = world.map.scenes.find(scene => destination.x >= scene.x && destination.x < scene.x + scene.w &&
        destination.y >= scene.y && destination.y < scene.y + scene.h);
    // Use the nearest open tile to each viewpoint, including after map edits.
    let spawn;
    for (let radius = 0; radius <= 10 && !spawn; radius++) {
        for (let y = destination.y - radius; y <= destination.y + radius && !spawn; y++) {
            for (let x = destination.x - radius; x <= destination.x + radius; x++) {
                if (scene && (x < scene.x || y < scene.y || x >= scene.x + scene.w || y >= scene.y + scene.h)) continue;
                if (world.isValidPosition(x, y)) {spawn = {x, y}; break;}
            }
        }
    }
    if (!spawn) return res.status(422).send('No walkable spawn near this viewpoint.');
    try {
        const catalog = await (await fetch(process.env.APP_URL + '/local/api/catalog')).json();
        const response = await fetch(process.env.APP_URL + '/local/api/session', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({...catalog.defaults, mapId, checkpointId: 1, ...spawn,
                title: 'Parallax explorer', level: 50, timeOfDay: typeof req.query.time === 'string' ? req.query.time : '12:00', localDoorAccess: 'allow-all'})
        });
        const session = await response.json();
        if (!response.ok) throw new Error(session.error || 'Could not start preview');
        res.redirect(session.url);
    } catch (error) {res.status(500).send(error.message);}
});
server.app.get('/parallax/', (req, res) => res.type('html').send(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LooperLands · Parallax preview</title>
<style>
body{margin:0;background:#141e1a;color:#e7e6d5;font:17px/1.6 system-ui,sans-serif}main{max-width:780px;margin:10vh auto;padding:24px}h1{font-size:40px;line-height:1.1;letter-spacing:-1px}p{color:#acb9ad}nav{display:flex;gap:16px;flex-wrap:wrap;margin:32px 0}a{color:#e7e6d5}nav a{border:1px solid #57765b;background:#23392b;padding:22px;border-radius:6px;text-decoration:none}nav a:hover{background:#38543e}.label{color:#b6d487;font-size:13px;letter-spacing:2px;text-transform:uppercase}small{color:#acb9ad}
</style><main><div class="label">Main &amp; DreamLand / local preview</div><h1>A little more depth.</h1>
<p>A breeze through town, sand across the desert, smoke above lava, and a deep sky beneath DreamLand. Explore ten viewpoints, each with its own gentle movement and depth.</p>
<nav>${Object.entries(destinations).map(([id, destination]) => `<a href="/parallax/play/${id}">${destination.label}</a>`).join('')}</nav>
<p>Move with WASD or the arrow keys. Walk in both directions to compare the terrain and overhead layers, or stand still to watch the weather drift. Settings → Reduced motion anchors the layers to the map and pauses the drift.</p>
<p><a href="/parallax/play/forest?time=12:55">Forest rain</a> · <a href="/parallax/play/forest?time=18:00">Forest dusk</a> · <a href="/parallax/play/forest?time=20:55">Forest night rain</a></p>
<p><a href="/parallax/clips/">Watch short gameplay clips</a></p>
<small>Each link starts a fresh local session. Return here to switch scenes. <a href="/local/">Open playtest settings</a></small></main></html>`));
server.app.use('/parallax/clips', require('express').static(path.join(root, 'output/gameplay')));
console.log('PARALLAX PREVIEW: ' + process.env.APP_URL + '/parallax/');
