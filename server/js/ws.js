
var cls = require("./lib/class"),
    url = require('url'),
    // wsserver = require("websocket-server"),
    // miksagoConnection = require('websocket-server/lib/ws/connection'),
    // worlizeRequest = require('websocket').request,
    http = require('http'),
    https = require('https'),
    Utils = require('./utils'),
    _ = require('underscore'),
    BISON = require('bison'),
    WS = {},
    useBison = false
cors = require('cors');

module.exports = WS;

const axios = require('axios');
const crypto = require('crypto');
const NodeCache = require("node-cache");
const dao = require('./dao.js');
const Formulas = require('./formulas.js');
const ens = require("./ens.js");
const chat = require("./chat.js");
const quests = require("./quests/quests.js");
const Lakes = require("./lakes.js");
const Collectables = require('./collectables.js');
const Properties = require('./properties.js')
const Types = require("../../shared/js/gametypes");
const platform = require('./looperlandsplatformclient.js');
const minigame = require('../apps/minigame.js');
const cache = new NodeCache();

const LOOPWORMS_LOOPERLANDS_BASE_URL = process.env.LOOPWORMS_LOOPERLANDS_BASE_URL;
const APP_URL = process.env.APP_URL;
const GAMESERVER_NAME = process.env.GAMESERVER_NAME;
const LOOPERLANDS_PLATFORM_BASE_URL = process.env.LOOPERLANDS_PLATFORM_BASE_URL;
const LOOPERLANDS_PLATFORM_API_KEY = process.env.LOOPERLANDS_PLATFORM_API_KEY;


const platformClient = new platform.LooperLandsPlatformClient(LOOPERLANDS_PLATFORM_API_KEY, LOOPERLANDS_PLATFORM_BASE_URL);

function extractDetails(inputUrl) {
    const parsedUrl = new URL(inputUrl);
    let protocol = parsedUrl.protocol;
    let host = parsedUrl.hostname;
    let port;

    if (protocol === 'http:') {
        port = 8000;
    } else if (protocol === 'https:') {
        port = 443;
    }

    protocol = protocol.replace(':', '');

    return { protocol, host, port };
}

// Example usage
const urlDetails = extractDetails(APP_URL);

/**
 * Abstract Server and Connection classes
 */
var Server = cls.Class.extend({
    _connections: {},
    _counter: 0,

    init: function (port) {
        this.port = port;
    },

    onConnect: function (callback) {
        this.connection_callback = callback;
    },

    onError: function (callback) {
        this.error_callback = callback;
    },

    broadcast: function (message) {
        throw "Not implemented";
    },

    forEachConnection: function (callback) {
        _.each(this._connections, callback);
    },

    addConnection: function (connection) {
        this._connections[connection.id] = connection;
    },

    removeConnection: function (id) {
        delete this._connections[id];
    },

    getConnection: function (id) {
        return this._connections[id];
    },

    connectionsCount: function () {
        return Object.keys(this._connections).length
    }
});


var Connection = cls.Class.extend({
    init: function (id, connection, server) {
        this._connection = connection;
        this._server = server;
        this.id = id;
    },

    onClose: function (callback) {
        this.close_callback = callback;
    },

    listen: function (callback) {
        this.listen_callback = callback;
    },

    broadcast: function (message) {
        throw "Not implemented";
    },

    send: function (message) {
        throw "Not implemented";
    },

    sendUTF8: function (data) {
        throw "Not implemented";
    },

    close: function (logError) {
        console.log("Closing connection to " + this._connection.remoteAddress + ". Error: " + logError);
        this._connection.close();
    }
});

/***************
    SOCKET.IO
    Author: Nenu Adrian
            http://nenuadrian.com
            http://codevolution.com
 ***************/
WS.socketIOServer = Server.extend({
    init: function () {
        self = this;
        self.protocol = urlDetails.protocol;
        self.host = urlDetails.host;
        self.port = urlDetails.port;
        const port = urlDetails.port;
        const host = self.host;

        this.cache = cache;
        var express = require('express');
        var app = express();
        app.use("/", express.static(__dirname + "/../../client-build"));

        let httpInclude = require('http');
        let http = new httpInclude.Server(app);


        console.log("APP_URL", APP_URL);
        self.io = require('socket.io')(http, {
            allowEIO3: true,
            cors: { origin: APP_URL, credentials: true }
        });

        app.use(express.json())

        platformClient.createOrUpdateGameServer(host, port, GAMESERVER_NAME);

        async function newSession(body, teleport) {
            const id = crypto.randomBytes(20).toString('hex');
            // this prevents failed logins not being able to login again
            body.isDirty = false;
            //console.log("New Session", id, body);
            if (body.mapId === undefined) {
                body.mapId = "main";
            }
            if (body.checkpointId === undefined) {
                // teleport request
                if (body.x !== undefined && body.y !== undefined) {
                    let checkpoint = self.worldsMap[body.mapId].map.findClosestCheckpoint(body.x, body.y);
                    await dao.saveAvatarMapAndCheckpoint(body.nftId, body.mapId, checkpoint.id);
                }
            }

            body.xp = parseInt(body.xp);

            cache.set(id, body);
            let responseJson = {
                "sessionId": id
            }
            return responseJson;
        }

        app.post('/session', async (req, res) => {
            const body = req.body;
            const apiKey = req.headers['x-api-key'];
            
            if (apiKey !== process.env.LOOPWORMS_API_KEY) {
                console.error("Invalid api key");
                res.status(401).json({
                    status: false,
                    "error": "invalid api key",
                    user: null
                });
            }

            let walletAllowed = await dao.walletHasNFT(body.walletId, body.nftId);
            if (!walletAllowed) {
                console.error("Wallet not allowed", body.walletId, body.nftId);
                res.status(401).json({
                    status: false,
                    error: "Your wallet does not own the avatar you are trying to play with",
                    user: null
                });
                return;
            };

            let nftId = body.nftId.replace("0x", "NFT_");
            let bot = Types.isBot(Types.getKindFromString(nftId));
            if (!bot) {
                let cacheKeys = cache.keys();
                for (i in cacheKeys) {
                    let key = cacheKeys[i];
                    let cachedBody = cache.get(key);
                    let sameWallet = cachedBody.walletId === body.walletId;
                    if (sameWallet) {
                        cache.del(key);
                        if (cachedBody.isDirty === true) {
                            let player = self.worldsMap[cachedBody.mapId]?.getPlayerById(cachedBody.entityId);
                            if (player !== undefined) {
                                player.connection.close('A new session from another device created');
                            }
                        }
                        break;
                    }
                }
            }


            let responseJson = await newSession(body);

            res.status(200).send(responseJson);
        });

        app.post('/session/:sessionId/teleport', async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    error: "No session with id " + sessionId + " found",
                    user: null
                });
                return;
            }

            const body = req.body;
            if (body.x === undefined || body.y === undefined || body.map === undefined) {
                res.status(400).json({
                    status: false,
                    error: "Invalid teleport request",
                    user: null
                });
                return;
            }

            body.nftId = sessionData.nftId;
            body.walletId = sessionData.walletId;
            body.mapId = body.map;
            body.xp = sessionData.xp;
            body.title = sessionData.title;
            delete body.map;

            let responseJson = await newSession(body, true);

            res.status(200).send(responseJson);
        });

        app.get('/session/:sessionId', async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    error: "No session with id " + sessionId + " found",
                    user: null
                });
                return;
            }
            //console.log("Session Data for session id", sessionId, sessionData);
            const nftId = sessionData.nftId;
            const walletId = sessionData.walletId;
            const isDirty = sessionData.isDirty;

            let parsedSaveData = undefined;
            let weapon;
            let avatarGameData;

            if (isDirty === true) {
                res.status(409).json({
                    status: false,
                    error: "Your wallet has an active session",
                    user: null
                });
                return;
            } else {
                weapon = await dao.loadWeapon(walletId, nftId);
                avatarGameData = await dao.loadAvatarGameData(nftId);

                sessionData.isDirty = true;
                sessionData.gameData = avatarGameData;
                cache.set(sessionId, sessionData);
            }

            let name = await ens.getEns(walletId);

            if (parsedSaveData === undefined) {
                //console.log("Save data is undefined, creating new save data for " + name);
                parsedSaveData = {
                    looperlands: true,
                    nftId: nftId,
                    walletId: walletId,
                    hasAlreadyPlayed: sessionData.xp > 0,
                    player: {
                        name: name,
                        weapon: "",
                        armor: nftId.replace("0x", "NFT_"),
                        image: ""
                    },
                    achievements: {
                        unlocked: [],
                        ratCount: 0,
                        skeletonCount: 0,
                        totalKills: 0,
                        totalDmg: 0,
                        totalRevives: 0
                    }
                };
            }
            parsedSaveData.player.name = name;
            parsedSaveData.player.armor = nftId.replace("0x", "NFT_");
            parsedSaveData.player.weapon = weapon;
            parsedSaveData.nftId = nftId;
            parsedSaveData.walletId = walletId;
            parsedSaveData.mapId = sessionData.mapId;
            parsedSaveData.f2p = sessionData.f2p;

            res.status(200).json(parsedSaveData);
        });

        app.get("/session/:sessionId/inventory", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
                return;
            }
            const walletId = sessionData.walletId;

            let inventory = [];
            let special = [];
            let bots = [];
            const nftId = sessionData.nftId;

            let rcvInventory = dao.getInventory(walletId, nftId);
            if (rcvInventory?.data) {
                inventory = rcvInventory.data[0].weapons ? rcvInventory.data[0].weapons.map(function (item) {
                    if (item) {
                        item.nftId = item.nftId.replace("0x", "NFT_");
                        item.level = Formulas.calculatePercentageToNextLevel(item.xp).currentLevel;
                        return item;
                    }
                }) : [];
                if (inventory.length > 0) {
                    inventory = inventory.filter(item => {
                        if (item && Types.isWeapon(Types.getKindFromString(item.nftId))) {
                            return item;
                        }
                    });
                }

                special = rcvInventory.data[0].specialitems ? rcvInventory.data[0].specialitems.map(function (item) {
                    if (item) {
                        item.nftId = item.nftId.replace("0x", "NFT_");
                        item.level = Formulas.calculateToolPercentageToNextLevel(item.xp).currentLevel;
                        return item;
                    }
                }) : [];
                if (special.length > 0) {
                    special = special.filter(item => {
                        if (item && Types.isSpecialItem(Types.getKindFromString(item.nftId))) {
                            return item;
                        }
                    });
                }

                bots = rcvInventory.data[0].bots ? rcvInventory.data[0].bots.map(function (item) {
                    if (item) {
                        item.nftId = item.nftId.replace("0x", "NFT_");
                        return item;
                    }
                }) : [];

                if (bots.length > 0) {
                    bots = bots.filter(item => {
                        if (item && Types.isBot(Types.getKindFromString(item.nftId))) {
                            item.nftId = item.nftId.replace("0x", "NFT_");
                            item.level = Formulas.calculateToolPercentageToNextLevel(item.xp).currentLevel;
                            return item;
                        }
                    });
                }
            }

            let consumables = sessionData.gameData?.consumables || {};
            let resources = {};
            Object.keys(consumables).forEach(item => {
                if (Types.isResource(parseInt(item))) {
                    resources[item] = consumables[item];
                    delete consumables[item];
                }

                if (Types.isWeapon(parseInt(item)) && consumables[item] > 0) {
                    let levelInfo = Properties.getWeaponLevel(item);
                    let weaponLevel = 0;
                    if (typeof levelInfo === "object") {
                        let sortedLevelInfo = _(levelInfo).chain().sortBy("level").reverse().value()
                        for (let i = 0; i < sortedLevelInfo.length; i++) {
                            let level = sortedLevelInfo[i];
                            if (consumables[Types.getKindFromString(level.consumable)] > 0) {
                                weaponLevel = level.level;
                                break;
                            }
                        }
                    } else {
                        weaponLevel = levelInfo;
                    }
                    inventory.push({
                        nftId: Types.getKindAsString(item),
                        weaponName: Properties.getWeaponName(item),
                        level: weaponLevel,
                        Trait: "regular"
                    });
                }

                if (!item || !Collectables.isCollectable(item) || consumables[item] <= 0) {
                    delete consumables[item];
                } else {
                    let remainingCooldown = 0;
                    const cooldownData = Collectables.getCooldownData(item);
                    const cooldownGroup = cooldownData?.group;
                    if (cooldownGroup) {
                        remainingCooldown = self.worldsMap[sessionData.mapId].getConsumeGroupCooldown(sessionData.nftId, cooldownGroup);
                    }

                    consumables[item] = {
                        qty: consumables[item],
                        consumable: Collectables.isConsumable(item),
                        image: Collectables.getCollectableImageName(item),
                        description: Collectables.getInventoryDescription(item),
                        cooldown: remainingCooldown, //this is either a date or 0
                        maxCooldown: cooldownData.duration
                    };
                }
            });

            inventory = _(inventory).chain().sortBy("level").reverse().sortBy("Trait").value();
            special = _(special).chain().sortBy("level").reverse().sortBy("Trait").value();
            res.status(200).json({ inventory: inventory, special: special, consumables: consumables, bots: bots, resources: resources });
        });

        app.get("/session/:sessionId/quests", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
                return;
            }

            // Loop over this.quests and check if they are completed / available by lookup at session game quest data
            let availableQuests = [];
            let questStatus = sessionData?.gameData?.quests;

            if (quests && questStatus) {
                _.each(quests?.questsByID, function (quest) {
                    if (_.findIndex(questStatus.COMPLETED, { questID: quest.id }) !== -1) {

                        availableQuests.push({
                            id: quest.id,
                            name: quest.name,
                            desc: quest.questLogText ?? quest.startText,
                            longDesc: quest.longText ?? quest.startText,
                            type: quest.eventType,
                            target: quest.target,
                            medal: quest.medal,
                            amount: quest.amount,
                            level: quest.level,
                            status: "COMPLETED"
                        });
                    }
                });
                _.each(quests?.questsByID, function (quest) {
                    if (_.findIndex(questStatus.COMPLETED, { questID: quest.id }) !== -1) {
                        return;
                    }
                    if (_.findIndex(questStatus.IN_PROGRESS, { questID: quest.id }) !== -1) {

                        let progressCount = 0;
                        if (quest.eventType === "LOOT_ITEM") {
                            let itemCount = sessionData.gameData.items[quest.target];
                            if (itemCount !== undefined) {
                                progressCount = itemCount;
                            }
                        } else if (quest.eventType === "KILL_MOB") {
                            let mobCount = sessionData.gameData.mobKills[quest.target];
                            if (mobCount !== undefined) {
                                progressCount = mobCount;
                            }
                        }

                        if (progressCount >= quest.amount) {
                            progressCount = quest.amount;
                        }

                        availableQuests.push({
                            id: quest.id,
                            name: quest.name,
                            desc: quest.questLogText ?? quest.startText,
                            longDesc: quest.longText ?? quest.startText,
                            type: quest.eventType,
                            target: quest.target,
                            medal: quest.medal,
                            level: quest.level,
                            progressCount: progressCount,
                            amount: quest.amount,
                            status: "IN_PROGRESS"
                        });
                    }
                });
            }

            res.status(200).json(availableQuests);
        });

        app.get("/session/:sessionId/owns/:nftId", async (req, res) => {
            const sessionId = req.params.sessionId;
            const nftId = req.params.nftId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });

            } else {
                const walletId = sessionData.walletId;
                let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/AssetValidation.php?WalletID=${walletId}&NFTID=${nftId}`
                const result = await axios.get(url);
                res.status(200).json(result.data);
            }

        });

        app.get("/session/:sessionId/ownsItem/:itemId", async (req, res) => {
            const sessionId = req.params.sessionId;
            const itemId = req.params.itemId;
            const entityItemId = Types.getKindFromString(itemId);

            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });

            } else {
                let owns = sessionData.gameData.items[entityItemId] !== undefined;
                res.status(200).json(owns);
                return;
            }
        });

        app.get("/session/:sessionId/completedQuest/:questId", async (req, res) => {
            const sessionId = req.params.sessionId;
            const questId = req.params.questId;

            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
            } else {
                let questStatus = sessionData?.gameData?.quests;
                if (questStatus === undefined || !questStatus) {
                    res.status(200).json(false);
                }

                let completed = (_.findIndex(questStatus.COMPLETED, { questID: questId }) !== -1);
                res.status(200).json(completed);

                return;
            }
        });

        app.get("/session/:sessionId/ownsNFTCollection/:collectionName", async (req, res) => {
            const sessionId = req.params.sessionId;
            const collectionName = req.params.collectionName;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
            } else {
                const walletId = sessionData.walletId;
                let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/selectProject.php?WalletID=${walletId}&Project=${collectionName}`
                const result = await axios.get(url);
                res.status(200).json(result.data);
            }
        });

        app.get("/:mapId/player/:playerId/owns/:nftId", async (req, res) => {
            const mapId = req.params.mapId;
            const playerId = req.params.playerId;
            const nftId = req.params.nftId;

            let player = self.worldsMap[mapId].getPlayerById(playerId);
            if (player === undefined) {
                return res.status(404).json({
                    status: false,
                    error: "Player not found",
                    user: null
                });
            }
            let result = dao.walletHasNFT(player.walletId, nftId);
            if (result === undefined) {
                res.status(400).json({
                    status: false,
                    error: "Could not get player NFT info",
                    user: null
                });
                return;
            }

            res.status(200).json(result);
        });

        app.get("/session/:sessionId/statistics", async (req, res) => {
            const sessionId = req.params.sessionId;
            const nftId = req.params.nftId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
            } else {
                let avatarLevelInfo = Formulas.calculatePercentageToNextLevel(sessionData.xp);
                let maxHp = Formulas.hp(avatarLevelInfo.currentLevel);
                let weaponInfo = self.worldsMap[sessionData.mapId].getNFTWeaponStatistics(sessionData.entityId);
                if (weaponInfo !== undefined) {
                    if (weaponInfo.constructor === "NFTWeapon") {
                        weaponInfo['weaponLevelInfo'] = Formulas.calculatePercentageToNextLevel(weaponInfo.experience);
                    } else if (weaponInfo.constructor === "NFTSpecialItem") {
                        weaponInfo['weaponLevelInfo'] = Formulas.calculateToolPercentageToNextLevel(weaponInfo.experience);
                    }
                } else {
                    weaponInfo = {};
                    weaponInfo['weaponLevelInfo'] = self.worldsMap[sessionData.mapId].getItemWeaponStatistics(sessionData.entityId);
                }

                let botInfo = {};
                if (sessionData.botSessionId !== undefined) {
                    let botSessionData = cache.get(sessionData.botSessionId);
                    if (botSessionData !== undefined) {
                        botInfo = Formulas.calculatePercentageToNextLevel(botSessionData.xp);
                    }
                }

                let ret = {
                    avatarLevelInfo: avatarLevelInfo,
                    maxHp: maxHp,
                    weaponInfo: weaponInfo,
                    botInfo: botInfo
                }
                res.status(200).json(ret);
            }
        });

        app.get("/session/:sessionId/polling", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    error: "No session with id " + sessionId + " found",
                    user: null
                });
                return;
            }
            const playerId = sessionData.entityId;
            let ret = self.worldsMap[sessionData.mapId].getPollingInfo(playerId);
            if (ret === undefined) {
                res.status(500).json({
                    status: false,
                    error: "Could not get polling information",
                    user: null
                });
                return;
            }
            res.status(200).json(ret);
        });

        app.post('/setxpmultiplier', async (req, res) => {
            const body = req.body;
            const apiKey = req.headers['x-api-key'];

            if (apiKey !== process.env.LOOPWORMS_API_KEY) {
                res.status(401).json({
                    status: false,
                    "error": "invalid api key",
                    user: null
                });
                return;
            }

            Formulas.setXPMultiplier(body.multiplier, body.duration);
            res.status(200).send(true);
        });

        const corsOptions = {
            origin: '*',
            methods: [],
            allowedHeaders: [],
            exposedHeaders: [],
            credentials: true
        };

        app.get("/players", cors(corsOptions), async (req, res) => {
            let players = []
            let cacheKeys = cache.keys();
            for (i in cacheKeys) {
                let key = cacheKeys[i];
                let cachedBody = cache.get(key);
                let player = self.worldsMap[cachedBody.mapId]?.getPlayerById(cachedBody.entityId);
                if (cachedBody.isDirty === true && player !== undefined && !player.isBot()) {
                    let player = {
                        name: await ens.getEns(cachedBody.walletId),
                        wallet: cachedBody.walletId,
                        avatar: cachedBody.nftId,
                        mapId: cachedBody.mapId,
                        xp: cachedBody.xp
                    }
                    players.push(player);
                }
            }
            res.status(200).json(players);
        });

        app.get("/session/:sessionId/requestTeleport/:triggerId", async (req, res) => {
            const sessionId = req.params.sessionId;
            const triggerId = req.params.triggerId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
            } else {
                let triggerState = self.worldsMap[sessionData.mapId].checkTriggerActive(triggerId);
                if (triggerState === undefined) {
                    res.status(400).json({
                        status: false,
                        error: "Could not get trigger state",
                        user: null
                    });
                    return;
                }
                res.status(200).send(triggerState);
            }
        });

        app.get("/session/:sessionId/npc/:npcId", async (req, res) => {
            const sessionId = req.params.sessionId;
            const npcId = req.params.npcId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
            } else {
                let questData = quests.handleNPCClick(cache, sessionId, parseInt(npcId));
                const sessionData = cache.get(sessionId);

                if (questData) {
                    self.worldsMap[sessionData.mapId].npcTalked(npcId, questData.text, sessionData)
                }
                res.status(202).json(questData);
            }
        });

        app.post('/activateTrigger', async (req, res) => {
            const body = req.body;
            const apiKey = req.headers['x-api-key'];

            if (apiKey !== process.env.LOOPWORMS_API_KEY) {
                res.status(401).json({
                    status: false,
                    "error": "invalid api key",
                    user: null
                });
                return;
            }
            if (body.mapId === undefined) {
                body.mapId = "main";
            }
            self.worldsMap[body.mapId].activateTrigger(body.triggerId);
            res.status(200).send(true);
        });

        app.post('/deactivateTrigger', async (req, res) => {
            const body = req.body;
            const apiKey = req.headers['x-api-key'];

            if (apiKey !== process.env.LOOPWORMS_API_KEY) {
                res.status(401).json({
                    status: false,
                    "error": "invalid api key",
                    user: null
                });
                return;
            }
            if (body.mapId === undefined) {
                body.mapId = "main";
            }
            self.worldsMap[body.mapId].deactivateTrigger(body.triggerId);
            res.status(200).send(true);
        });

        app.get("/chat", async (req, res) => {
            let msgs = chat.getMessages();
            res.status(200).json(msgs);
        });

        app.get("/nftcommited/:shortnftid", cors(corsOptions), async (req, res) => {
            let nftId = req.params.shortnftid;
            nftId = nftId.replace("0x", "NFT_");
            if (fs.existsSync('./client/img/3/' + nftId + '.png')) {
                res.status(200).send(true);
            } else {
                res.status(404).send(false);
            }
        });

        app.get("/session/:sessionId/requestFish/:lakeName/:x/:y", async (req, res) => {
            const sessionId = req.params.sessionId;
            const lakeName = req.params.lakeName;
            const fx = req.params.x;
            const fy = req.params.y;
            const sessionData = cache.get(sessionId);

            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
            } else {
                let player = self.worldsMap[sessionData.mapId].getPlayerById(sessionData.entityId);
                let lakeLvl = Lakes.getLakeLevel(lakeName);
                if (player.getNFTWeapon().getLevel() < lakeLvl) {
                    let response = { allowed: false, reqLevel: lakeLvl };
                    res.status(200).send(response);
                    return;
                } else {
                    let activeTrait = player.getNFTSpecialItemActiveTrait();
                    let fish = Lakes.getRandomFish(lakeName, (activeTrait === "lucky"));
                    if (fish === undefined) {
                        res.status(400).json({
                            status: false,
                            error: "Could not get fish",
                            user: null
                        });
                        return;
                    }
                    let fishExp = Lakes.calculateFishExp(fish, lakeName);
                    player.pendingFish = { name: fish, exp: fishExp, double: (activeTrait === "double_catch") };
                    let difficulty = Lakes.getDifficulty(player.getNFTWeapon().getLevel(), lakeName, (activeTrait === "upper_hand"));
                    let speed = Lakes.getFishSpeed(fish, lakeName);

                    let response = { allowed: true, fish: fish, difficulty: difficulty?.difficulty, speed: speed, bullseyeSize: difficulty?.bullseye, trait: activeTrait };
                    self.worldsMap[sessionData.mapId].announceSpawnFloat(player, fx, fy);
                    res.status(200).send(response);
                }
            }
        });

        app.post("/session/:sessionId/newBot", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            let botNftId = req.body.botNftId;

            let ownedBots = await dao.getBots(sessionData.walletId);
            let botInfo = ownedBots.find(bot => bot.botNftId === botNftId);
            if (botInfo) {
                let owner = self.worldsMap[sessionData.mapId].getPlayerById(sessionData.entityId);
                let newBot = await dao.newBot(
                    sessionData.mapId,
                    botNftId,
                    botInfo.experience,
                    botInfo.looperName,
                    sessionData.walletId,
                    sessionData.entityId,
                    owner.x,
                    owner.y,
                    APP_URL
                );
                if (newBot?.sessionId) {
                    sessionData.botSessionId = newBot.sessionId;
                    cache.set(sessionId, sessionData);
                    res.status(200).send({});
                } else {
                    res.status(500).send(newBot);
                }
            } else {
                console.error("Bot not found " + sessionData);
                res.status(404).send({});
            }
        });

        app.get("/shop/:shopId/inventory", async (req, res) => {
            const shopId = req.params.shopId;
            let shopInventory = await dao.getShopInventory(shopId);
            res.status(200).json(shopInventory);
        });

        app.get("/session/:sessionId/shop/:shopId/buy/:itemId", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            let player = self.worldsMap[sessionData.mapId].getPlayerById(sessionData.entityId);
            let gameData = sessionData.gameData;
            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    error: "No session with id " + sessionId + " found",
                    user: null
                });
                return;
            }

            const nftId = sessionData.nftId;
            const shopInventory = await dao.getShopInventory(req.params.shopId);
            const item = shopInventory.find(item => item.id === req.params.itemId);

            if (gameData.consumables === undefined) {
                gameData.consumables = {};
            }

            // Check player min level
            let minPlayerLvl = parseInt(item.minPlayerLevel ?? 0);
            if (minPlayerLvl !== undefined && !_.isNaN(minPlayerLvl) && minPlayerLvl > 0 && minPlayerLvl > player.level) {
                res.status(400).json({
                    status: false,
                    error: "You're almost there! Achieve level " + item.minPlayerLevel + " to unlock this item.",
                    user: null
                });

                return;
            }

            // Loop over all keys of price and check if player has enough of that resource
            for (const [key, value] of Object.entries(item.price)) {
                let resourceId = Types.getKindFromString(key);
                let cost = parseInt(value);
                let resource = parseInt(gameData.consumables[resourceId]);
                if (_.isNaN(resource) || !_.isNumber(resource) || (resource < cost)) {
                    res.status(400).json({
                        status: false,
                        error: "Not enough " + key,
                        user: null
                    });

                    return;
                }
            }

            // Loop over all keys of price again and remove that amount of resource from player
            for (const [key, value] of Object.entries(item.price)) {
                let resourceId = Types.getKindFromString(key);
                let cost = parseInt(value);
                dao.saveConsumable(nftId, resourceId, -1 * cost);
                gameData.consumables[resourceId] = gameData.consumables[resourceId] - cost;
            }

            // Add item to player inventory
            dao.saveConsumable(nftId, item.item, item.amount ?? 1);

            let itemCount = gameData.consumables[item.item];
            if (itemCount) {
                gameData.consumables[item.item] = itemCount + (item.amount ?? 1);
            } else {
                gameData.consumables[item.item] = (item.amount ?? 1);
            }

            // Store changes in session data
            sessionData.gameData = gameData;
            cache.set(sessionId, sessionData);

            res.status(200).send({});
        });

        app.get("/session/:sessionId/consumeItem/:item", async (req, res) => {
            const sessionId = req.params.sessionId;
            const item = req.params.item;
            const sessionData = cache.get(sessionId);

            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    "error": "session not found",
                    user: null
                });
            } else {
                const player = self.worldsMap[sessionData.mapId].getPlayerById(sessionData.entityId);

                let consumed = player.consumeItem(item);
                let itemsOnCooldown = [];
                let cooldown = 0;

                let cdGroup = Collectables.getCooldownData(item).group;
                let playerCds = self.worldsMap[sessionData.mapId].consumeCooldowns[player.nftId];
                if (cdGroup && playerCds) {
                    cooldown = playerCds[cdGroup];
                    let itemsInGroup = Properties.getCdItemsByGroup(cdGroup);
                    for (i = 0; i < itemsInGroup.length; i++) {
                        itemsOnCooldown[i] = Types.getKindFromString(itemsInGroup[i]);
                    }
                }

                let response = { consumed: consumed, cooldown: cooldown, items: itemsOnCooldown };
                res.status(200).send(response);
            }
        });

        app.get('/session/:sessionId/getSpin/:linesPlayed/:bet', async (req, res) => {

            const linesPlayed = parseInt(req.params.linesPlayed);
            const betPerLine = parseInt(req.params.bet);
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);

            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    error: "No session with id " + sessionId + " found",
                    user: null
                });
                return;
            }

            const spinResponse = await minigame.getSpin(platformClient, sessionData, linesPlayed, betPerLine);

            if (spinResponse === "Not Enough Gold") {
                res.status(400).json({
                    status: false,
                    error: "Not Enough Gold",
                    user: null
                });
                return;
            }
            
            const { chosenSpin, payout, winningLines } = spinResponse;

            //update cached gold amount
            const spinCost = linesPlayed * betPerLine;
            const spinResult = payout - spinCost;
            const player = self.worldsMap[sessionData.mapId].getPlayerById(sessionData.entityId);
            player.incrementResourceAmount(Types.Entities.GOLD, spinResult);
            player.resetTimeout();

            const response = {
                spinData: chosenSpin,
                valueToPayout: payout,
                winningLines: winningLines
            };

            res.status(200).send(response);
        });

        app.get('/session/:sessionId/completePartnerTask/:taskId', async (req, res) => {
            const sessionId = req.params.sessionId;
            const taskId = req.params.taskId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                res.status(404).json({
                    status: false,
                    error: "No session with id " + sessionId + " found",
                    user: null
                });
                return;
            }

            const walletId = sessionData.walletId;
            let currentState = await dao.getPartnerTask(walletId, taskId);
            let completedTask = false;
            if (currentState.taskStatus !== "true") {
                await dao.completePartnerTask(walletId, taskId);
                completedTask = true;
            }
            res.status(200).send(completedTask);
        });

        self.io.on('connection', function (connection) {
            //console.log('a user connected');

            connection.remoteAddress = connection.handshake.address.address

            var c = new WS.socketIOConnection(self._createId(), connection, self);

            if (self.connection_callback) {
                self.connection_callback(c);
            }
            self.addConnection(c);
        });



        self.io.on('error', function (err) {
            console.error(err.stack);
            self.error_callback()

        })

        http.listen(port, function () {
            console.log('listening on *:' + port);
        });
    },

    _createId: function () {
        return '5' + Utils.random(99) + '' + (this._counter++);
    },


    broadcast: function (message) {
        self.io.emit("message", message)
    },

    onRequestStatus: function (status_callback) {
        this.status_callback = status_callback;
    }



});

WS.socketIOConnection = Connection.extend({
    init: function (id, connection, server) {

        var self = this

        this._super(id, connection, server);

        // HANDLE DISPATCHER IN HERE
        connection.on("dispatch", function (message) {
            //console.log("Received dispatch request")
            self._connection.emit("dispatched", { "status": "OK", host: server.host, port: server.port })
        });

        connection.on("message", function (message) {
            if (self.listen_callback)
                self.listen_callback(message)
        });

        connection.on("disconnect", function () {
            if (self.close_callback) {
                self.close_callback();
            }
            delete self._server.removeConnection(self.id);
        });

    },

    broadcast: function (message) {
        throw "Not implemented";
    },

    send: function (message) {
        this._connection.emit("message", message);
    },

    sendUTF8: function (data) {
        this.send(data)
    },

    close: function (logError) {
        //console.log("Closing connection to socket"+". Error: " + logError);
        this._connection.disconnect();
    }

});