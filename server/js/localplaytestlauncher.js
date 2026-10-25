const fs = require('fs');
const path = require('path');
const {isLocalPlaytest} = require('./localplaytest');
const WorldClock = require('./worldclock');

const traits = ['fighter', 'ranger', 'tank', 'rogue'];
const maxLevel = 9999;
const defaultAvatar = '0xb69e3e44f58d5399faad29b94108a88dbed79e6a14c676fb202e817ac5697560';

function experienceAtLevel(level) {
    if (!Number.isInteger(level) || level < 1 || level > maxLevel) throw new Error('Choose a level between 1 and ' + maxLevel + '.');
    return level === 1 ? 1 : Math.floor(100 * (9 * level ** 3 - 51 * level ** 2 + 126 * level - 108)) + 1;
}

function fishingExperienceAtLevel(level) {
    if (!Number.isInteger(level) || level < 1 || level > 45) throw new Error('Choose a fishing rod level between 1 and 45.');
    return level === 1 ? 0 : 1000 * 2 ** (level - 2);
}

function buildCatalog(worlds) {
    const Types = require('../../shared/js/gametypes');
    const names = require('../../shared/js/altnames');
    const Properties = require('./properties');
    const client = path.resolve(__dirname, '../../client');
    const avatars = [], weapons = [], items = [], seen = new Set();
    for (const kind of Object.values(Types.Entities)) {
        const id = Types.getKindAsString(kind);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        if (Types.isItem(kind) && !id.startsWith('NFT_') && !Types.isProjectile(kind)) {
            items.push({id: String(kind), name: names.getName(id), key: id});
        }
        const avatar = id.startsWith('NFT_') && Types.isArmor(kind);
        if (!avatar && !Types.isWeapon(kind) && !Types.isFishingRod(kind)) continue;
        const metadata = path.join(client, 'sprites', id + '.json');
        if (!fs.existsSync(metadata) || !fs.existsSync(path.join(client, 'img/1', id + '.png'))) continue;
        const sprite = JSON.parse(fs.readFileSync(metadata, 'utf8'));
        const nftId = id.startsWith('NFT_') ? id.replace('NFT_', '0x') : null;
        const alias = names.getName(id);
        const name = alias !== id ? alias : nftId ? (avatar ? 'Avatar ' : 'Weapon ') + kind + ' · ' + nftId.slice(2, 8) + '…' + nftId.slice(-4) : id;
        const entry = {id, nftId, name, sprite: {url: '/img/1/' + id + '.png', width: sprite.width, height: sprite.height,
            row: sprite.animations?.idle_down?.row ?? sprite.animations?.walk_down?.row ?? 0}};
        if (Types.isFishingRod(kind)) {entry.fishingRod = true;entry.maxLevel = 45;}
        if (!avatar && !nftId) entry.fixedLevel = Properties.getWeaponLevel(kind);
        (avatar ? avatars : weapons).push(entry);
    }
    avatars.sort((a, b) => a.name.localeCompare(b.name));
    weapons.sort((a, b) => a.name.localeCompare(b.name));
    const maps = buildMapCatalog(worlds);
    items.sort((a, b) => a.name.localeCompare(b.name));
    return {maps, avatars, weapons, items, traits, maxLevel, defaults: {
        mapId: maps.some(map => map.id === 'm88n2') ? 'm88n2' : maps[0]?.id,
        checkpointId: 1, walletId: '0x1e8ab2cc09be581530bb9f3ac94353f6f7412239',
        nftId: avatars.some(avatar => avatar.nftId === defaultAvatar) ? defaultAvatar : avatars[0]?.nftId,
        level: 12, weaponId: 'sword1', weaponLevel: weapons.find(weapon => weapon.id === 'sword1')?.fixedLevel ?? 0, trait: 'rogue', title: 'Mapmaker'
    }};
}

function buildMapCatalog(worlds) {
    return Object.entries(typeof worlds === 'function' ? worlds() : worlds).filter(([, world]) => world.map?.isLoaded).map(([id, world]) => ({
        id, name: id, width: world.map.width, height: world.map.height,
        checkpoints: Object.values(world.map.checkpoints).map(cp => ({id: cp.id, x: cp.x, y: cp.y,
            starting: world.map.startingAreas.some(start => start.id === cp.id)}))
    }));
}

function sameOrigin(req, appUrl) {
    if (!req.headers.origin) return true;
    try {return new URL(req.headers.origin).origin === new URL(appUrl).origin;}
    catch (_) {return false;}
}

function sessionSettings(input, catalog, worlds) {
    const invalid = message => {throw new Error(message);};
    if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Choose your playtest settings.');
    const timeOfDay = input.timeOfDay ?? '';
    if (timeOfDay !== '') WorldClock.parseTimeOfDay(timeOfDay);
    const localDoorAccess = input.localDoorAccess ?? 'local';
    if (!['local', 'live', 'allow-all'].includes(localDoorAccess)) invalid('Choose a door access mode.');
    if (localDoorAccess === 'live' && !require('./localdooraccess').configuration()) invalid('Real ownership checks are not configured on this local server.');
    const startingInventory = input.startingInventory ?? [], finishedQuests = input.finishedQuests ?? [];
    if (!Array.isArray(startingInventory) || startingInventory.length > 100 || startingInventory.some(row =>
        !row || !(catalog.items || []).some(item => item.id === row.item) || !Number.isSafeInteger(row.amount) || row.amount < 1 || row.amount > 1000000) ||
        new Set(startingInventory.map(row => row.item)).size !== startingInventory.length) invalid('Choose unique inventory items with amounts between 1 and 1000000.');
    if (!Array.isArray(finishedQuests) || finishedQuests.length > 200 || finishedQuests.some(id =>
        !(catalog.quests || []).some(quest => quest.id === id)) || new Set(finishedQuests).size !== finishedQuests.length) invalid('Choose unique quests from the finished quests list.');
    const map = catalog.maps.find(row => row.id === input.mapId);
    if (!map) invalid('Choose a loaded map.');
    const checkpoint = map.checkpoints.find(row => String(row.id) === String(input.checkpointId));
    if (!checkpoint) invalid('Choose a checkpoint on this map.');
    if (typeof input.walletId !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(input.walletId)) invalid('Enter a wallet address: 0x followed by 40 hexadecimal characters.');
    const avatar = catalog.avatars.find(row => row.nftId === input.nftId);
    if (!avatar) invalid('Choose an avatar included in this game client.');
    const weapon = catalog.weapons.find(row => row.id === input.weaponId || row.nftId === input.weaponId);
    if (!weapon) invalid('Choose a weapon included in this game client.');
    const xp = experienceAtLevel(input.level);
    const weaponXp = weapon.nftId ? (weapon.fishingRod ? fishingExperienceAtLevel(input.weaponLevel) : experienceAtLevel(input.weaponLevel)) : null;
    if (!weapon.nftId && input.weaponLevel !== undefined && input.weaponLevel !== weapon.fixedLevel) invalid('This bundled weapon uses its fixed game level. Choose an NFT weapon to set a custom level.');
    if (!catalog.traits.includes(input.trait)) invalid('Choose a character class.');
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 24 || /[\u0000-\u001f<>]/.test(input.title)) invalid('Use a display name of 1–24 characters.');
    const body = {walletId: input.walletId, nftId: avatar.nftId, mapId: map.id, checkpointId: String(checkpoint.id),
        xp, weapon: weapon.nftId || weapon.id, trait: input.trait, title: input.title.trim(), f2p: false, localDoorAccess,
        startingInventory: startingInventory.map(({item, amount}) => ({item, amount})), finishedQuests};
    const hasX = input.x !== undefined && input.x !== null && input.x !== '';
    const hasY = input.y !== undefined && input.y !== null && input.y !== '';
    if (hasX || hasY) {
        if (!hasX || !hasY || !Number.isInteger(input.x) || !Number.isInteger(input.y) ||
            !(typeof worlds === 'function' ? worlds() : worlds)[map.id]?.isValidPosition(input.x, input.y)) invalid('Choose a walkable spawn tile with both X and Y coordinates.');
        body.x = input.x; body.y = input.y;
    }
    const fishingRod = catalog.weapons.find(row => row.fishingRod && row.nftId);
    return {body, weapon, weaponXp, timeOfDay, fishingRod};
}

function installLocalLauncher(app, options) {
    if (!isLocalPlaytest()) return false;
    let catalog;
    const getCatalog = () => {
        if (options.catalog) return options.catalog;
        catalog ||= buildCatalog(options.worlds);
        return {...catalog, maps: buildMapCatalog(options.worlds), quests: require('./worlddefinitions').definitions.quests
            .filter(quest => !quest.dialogueOnly).map(quest => ({id: quest.id, name: quest.name || quest.title || quest.id, mapId: quest.mapId}))};
    };
    const express = require('express');
    require('./localtoolboxassets').install(app, path.resolve(__dirname, '../..'));
    app.get(/^\/local$/, (req, res) => res.redirect('/local/'));
    app.use('/local', express.static(path.resolve(__dirname, '../local-launcher'), {index: 'index.html', maxAge: 0}));
    app.get('/local/api/catalog', (req, res) => {
        const data = getCatalog();
        if (!data.maps.length) {catalog = null; return res.status(503).json({error: 'Maps are still loading. Try again shortly.'});}
        res.set('Cache-Control', 'no-store').json({...data, liveOwnershipAvailable: Boolean(require('./localdooraccess').configuration())});
    });
    app.post('/local/api/session', async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!sameOrigin(req, options.appUrl)) return res.status(403).json({error: 'Open the launcher from the local game address.'});
        if (!req.is('application/json')) return res.status(415).json({error: 'Send playtest settings as JSON.'});
        let settings;
        try {settings = sessionSettings(req.body, getCatalog(), options.worlds);}
        catch (error) {return res.status(400).json({error: error.message});}
        try {
            const {body, weapon, weaponXp, timeOfDay, fishingRod} = settings;
            if (weapon.nftId) await options.platform.prepareSession({walletId: body.walletId, nftId: weapon.nftId, xp: weaponXp, trait: weapon.fishingRod ? 'upper_hand' : 'speed'});
            if (!weapon.fishingRod && fishingRod) {
                await options.platform.prepareSession({walletId: body.walletId, nftId: fishingRod.nftId, trait: 'upper_hand'});
            }
            await options.platform.equip(body.walletId, body.nftId, weapon.nftId || weapon.id);
            let status = 200;
            const response = {
                status(code) {status = code; return response;},
                json(data) {return response.send(data);},
                send(data) {
                    if (status >= 400) return res.status(status).json({error: data?.error || 'The game could not create this session.'});
                    if (typeof data?.sessionId !== 'string' || !/^[a-f0-9]{40}$/.test(data.sessionId)) return res.status(502).json({error: 'The game did not return a valid session ID.'});
                    if (timeOfDay !== '') {
                        WorldClock.startAt(timeOfDay);
                        const worlds = typeof options.worlds === 'function' ? options.worlds() : options.worlds;
                        for (const world of Object.values(worlds)) {
                            for (const player of Object.values(world.players || {})) WorldClock.syncPlayer(player);
                        }
                    }
                    return res.status(status).json({sessionId: data.sessionId, url: '/?sessionId=' + data.sessionId});
                }
            };
            await options.createSession({body, headers: {'x-api-key': options.apiKey}}, response);
        } catch (error) {
            if (!res.headersSent) res.status(500).json({error: 'The local game could not start this session. Check the local server log.'});
        }
    });
    return true;
}

module.exports = {installLocalLauncher, experienceAtLevel, fishingExperienceAtLevel, buildCatalog};
