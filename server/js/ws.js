
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
const NodeCache = require( "node-cache" );
const dao = require('./dao.js');
const Formulas = require('./formulas.js');
const ens = require("./ens.js");
const chat = require("./chat.js");
const quests = require("./quests/quests.js");
const signing = require("./signing.js");
const Lakes = require("./lakes.js");

const cache = new NodeCache();

const LOOPWORMS_LOOPERLANDS_BASE_URL = process.env.LOOPWORMS_LOOPERLANDS_BASE_URL;
const INSTANCE_URI = process.env.INSTANCE_URI ? process.env.INSTANCE_URI : "";

/**
 * Abstract Server and Connection classes
 */
var Server = cls.Class.extend({
    _connections: {},
    _counter: 0,

    init: function(port) {
        this.port = port;
    },
    
    onConnect: function(callback) {
        this.connection_callback = callback;
    },
    
    onError: function(callback) {
        this.error_callback = callback;
    },
    
    broadcast: function(message) {
        throw "Not implemented";
    },
    
    forEachConnection: function(callback) {
        _.each(this._connections, callback);
    },
    
    addConnection: function(connection) {
        this._connections[connection.id] = connection;
    },
    
    removeConnection: function(id) {
        delete this._connections[id];
    },
    
    getConnection: function(id) {
        return this._connections[id];
    },

    connectionsCount: function()
    {
        return Object.keys(this._connections).length
    }
});


var Connection = cls.Class.extend({
    init: function(id, connection, server) {
        this._connection = connection;
        this._server = server;
        this.id = id;
    },
    
    onClose: function(callback) {
        this.close_callback = callback;
    },
    
    listen: function(callback) {
        this.listen_callback = callback;
    },
    
    broadcast: function(message) {
        throw "Not implemented";
    },
    
    send: function(message) {
        throw "Not implemented";
    },
    
    sendUTF8: function(data) {
        throw "Not implemented";
    },
    
    close: function(logError) {
        console.log("Closing connection to "+this._connection.remoteAddress+". Error: "+logError);
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
    init: function(host, port, protocol) {
        self = this;
        self.protocol = protocol;
        self.host = host;
        self.port = port;
        this.cache = cache;
        var express = require('express');
        var app = express();
        app.use("/", express.static(__dirname + "/../../client-build"));

        let httpInclude = require('http');
        let http = new httpInclude.Server(app);
        

        var corsAddress = self.protocol + "://" + self.host + INSTANCE_URI;
        console.log("CORS Address", corsAddress);
        self.io = require('socket.io')(http, {
            allowEIO3: true,
            cors: {origin: corsAddress, credentials: true}
        });

        app.use(express.json())


        function newSession(body) {
            const id = crypto.randomBytes(20).toString('hex');
            // this prevents failed logins not being able to login again
            body.isDirty = false;
            //console.log("New Session", id, body);
            if (body.mapId === undefined) {
                body.mapId = "main";
            }
            cache.set(id, body);
            let responseJson = {
                "sessionId" : id
            }
            return responseJson;
        }

        app.post('/session', async (req, res) => {
            const body = req.body;
            const apiKey = req.headers['x-api-key'];

            if (apiKey !== process.env.LOOPWORMS_API_KEY) {
                res.status(401).json({
                    status: false,
                    "error" : "invalid api key",
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

            let cacheKeys = cache.keys();
            for (i in cacheKeys) {
                let key = cacheKeys[i];
                let cachedBody = cache.get(key);
                let sameWallet = cachedBody.walletId === body.walletId;
                if(sameWallet && cachedBody.isDirty === true) {
                    let player = self.worldsMap[cachedBody.mapId].getEntityById(cachedBody.entityId);
                    cache.del(key);
                    if (player !== undefined) {
                        player.connection.close('A new session from another device created');
                    }
                    break;
                } else if (sameWallet && cachedBody.isDirty === false){
                    //console.log("deleting a session that never connected: " + key)
                    cache.del(key);
                }
            }

            let signedMessage = body.signedMessage;
            let signature = body.signature;
            let validSignature = await signing.validateSignature(body.walletId, signedMessage, signature);
            //console.log("Valid signature", validSignature);

            /*
            if (!validSignature) {
                console.error("Invalid signature for wallet", body.walletId);
                res.status(401).json({
                    status: false,
                    error: "Invalid signature",
                    user: null
                });
                return;
            }
            */

            let responseJson = newSession(body);

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

            let responseJson = newSession(body);

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

            let parsedSaveData;
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
                //console.log("Session ID", sessionId, "Wallet ID", walletId, "NFT ID", nftId);
                parsedSaveData = await dao.getCharacterData(walletId, nftId);
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
                    hasAlreadyPlayed: false,
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
            
            res.status(200).json(parsedSaveData);
        });
        
        app.put('/session/:sessionId', (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error" : "session not found",
                    user: null
                });
                return;
            }
            const nftId = sessionData.nftId;
            const walletId = sessionData.walletId;

            const body = req.body;
            dao.saveCharacterData(walletId, nftId, body);
            res.status(200).send(true);
        });

        app.get("/session/:sessionId/inventory", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error" : "session not found",
                    user: null
                });
                return;
            }
            const walletId = sessionData.walletId;

            const inventory = await axios.get(`${LOOPWORMS_LOOPERLANDS_BASE_URL}/selectLooperLands_Item.php?WalletID=${walletId}&APIKEY=${process.env.LOOPWORMS_API_KEY}`);
            res.status(200).json(inventory.data);
        });

        app.get("/session/:sessionId/specialInventory", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error" : "session not found",
                    user: null
                });
                return;
            }
            const walletId = sessionData.walletId;

            const inventory = await dao.getSpecialItems(walletId);
            res.status(200).json(inventory);
        });

        app.get("/session/:sessionId/quests", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                //console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error" : "session not found",
                    user: null
                });
                return;
            }

            // Loop over this.quests and check if they are completed / available by lookup at session game quest data
            let availableQuests = [];
            let questStatus = sessionData?.gameData?.quests;

            if(quests && questStatus) {
                _.each(quests?.questsByID, function (quest) {
                    if (_.findIndex(questStatus.COMPLETED, {questID: quest.id}) !== -1) {

                        availableQuests.push({
                            id: quest.id,
                            name: quest.name,
                            desc: quest.questLogText ?? quest.startText,
                            medal: quest.medal,
                            amount: quest.amount,
                            status: "COMPLETED"
                        });
                    }
                });
                _.each(quests?.questsByID, function (quest) {
                    if(_.findIndex(questStatus.COMPLETED, {questID: quest.id}) !== -1) {
                        return;
                    }
                    if (_.findIndex(questStatus.IN_PROGRESS, {questID: quest.id}) !== -1) {

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
                            medal: quest.medal,
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
                    "error" : "session not found",
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
                    "error" : "session not found",
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
                    "error" : "session not found",
                    user: null
                });
            } else {
                let questStatus = sessionData?.gameData?.quests;
                if(questStatus === undefined || !questStatus) {
                    res.status(200).json(false);
                }

                let completed = (_.findIndex(questStatus.COMPLETED, {questID: questId}) !== -1);
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
                    "error" : "session not found",
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
                    "error" : "session not found",
                    user: null
                });
            } else {
                let avatarLevelInfo = Formulas.calculatePercentageToNextLevel(sessionData.xp);
                let maxHp = Formulas.hp(avatarLevelInfo.currentLevel);
                let weaponInfo = self.worldsMap[sessionData.mapId].getNFTWeaponStatistics(sessionData.entityId);
                if (weaponInfo !== undefined) {
                    if (weaponInfo.constructor === "NFTWeapon") {
                        weaponInfo['weaponLevelInfo'] = Formulas.calculatePercentageToNextLevel(weaponInfo.experience);
                    } else if (weaponInfo.constructor === "NFTSpecialItem")  {
                        weaponInfo['weaponLevelInfo'] = Formulas.calculateToolPercentageToNextLevel(weaponInfo.experience);
                    }
                }

                let ret = {
                    avatarLevelInfo: avatarLevelInfo,
                    maxHp: maxHp,
                    weaponInfo: weaponInfo
                }
                res.status(200).json(ret);
            }
        });

        app.get("/session/:sessionId/polling", async(req, res) => {
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
                    "error" : "invalid api key",
                    user: null
                });
                return;
            }

            Formulas.setXPMultiplier(body.multiplier, body.duration);
            res.status(200).send(true);
        });

        app.get("/players", async (req, res) => {
            let players = []
            let cacheKeys = cache.keys();
            for (i in cacheKeys) {
                let key = cacheKeys[i];
                let cachedBody = cache.get(key);
                if(cachedBody.isDirty === true) {
                    let player = {
                        name: await ens.getEns(cachedBody.walletId),
                        wallet: cachedBody.walletId,
                        avatar: cachedBody.nftId
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
                    "error" : "session not found",
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
                    "error" : "session not found",
                    user: null
                });
            } else {
                let msgText = quests.handleNPCClick(cache, sessionId, npcId);
                res.status(202).json(msgText);
            }
        });

        app.post('/activateTrigger', async (req, res) => {
            const body = req.body;
            const apiKey = req.headers['x-api-key'];

            if (apiKey !== process.env.LOOPWORMS_API_KEY) {
                res.status(401).json({
                    status: false,
                    "error" : "invalid api key",
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
                    "error" : "invalid api key",
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

        app.post("/sign/generatenonce", signing.generateNonce);

        const corsOptions = {
            origin: '*',
            methods: [],
            allowedHeaders: [],
            exposedHeaders: [],
            credentials: true
        };

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
                    "error" : "session not found",
                    user: null
                });
            } else {
                let player = self.worldsMap[sessionData.mapId].getPlayerById(sessionData.entityId);
                let lakeLvl = Lakes.getLakeLevel(lakeName);
                if (player.getNFTWeapon().getLevel() < lakeLvl) {
                    let response = {allowed: false, reqLevel: lakeLvl};
                    res.status(200).send(response);
                    return;
                } else {
                    let fish = Lakes.getRandomFish(lakeName);
                    if (fish === undefined) {
                        res.status(400).json({
                            status: false,
                            error: "Could not get fish",
                            user: null
                        });
                        return;
                    }
                    let fishExp = Lakes.calculateFishExp(fish, lakeName);
                    player.pendingFish = {name: fish, exp: fishExp};
                    let difficulty = Lakes.getDifficulty(player.getNFTWeapon().getLevel(), lakeName);
                    let speed = Lakes.getFishSpeed(fish, lakeName);

                    let response = {allowed: true, fish: fish, difficulty: difficulty, speed: speed};
                    self.worldsMap[sessionData.mapId].announceSpawnFloat(player, fx, fy);
                    res.status(200).send(response);
                }
            }
        });

        self.io.on('connection', function(connection){
          //console.log('a user connected');

          connection.remoteAddress = connection.handshake.address.address

  
          var c = new WS.socketIOConnection(self._createId(), connection, self);
            
          if(self.connection_callback) {
                self.connection_callback(c);
          }
          self.addConnection(c);

        });

        

        self.io.on('error', function (err) { 
            console.error(err.stack); 
            self.error_callback()

         })

        http.listen(port, function(){
          console.log('listening on *:' + port);
        });
    },

    _createId: function() {
        return '5' + Utils.random(99) + '' + (this._counter++);
    },
    
    
    broadcast: function(message) {
        self.io.emit("message", message)
    },

    onRequestStatus: function(status_callback) {
        this.status_callback = status_callback;
    }
    


});

WS.socketIOConnection = Connection.extend({
    init: function(id, connection, server) {

        var self = this

        this._super(id, connection, server);

        // HANDLE DISPATCHER IN HERE
        connection.on("dispatch", function (message) {
            //console.log("Received dispatch request")
            self._connection.emit("dispatched",  { "status" : "OK", host : server.host, port : server.port } )
        });

        connection.on("message", function (message) {
            if (self.listen_callback)
                self.listen_callback(message)
        });

        connection.on("disconnect", function () {
            if(self.close_callback) {
                self.close_callback();
            }
            delete self._server.removeConnection(self.id);
        });

    },
    
    broadcast: function(message) {
        throw "Not implemented";
    },
    
    send: function(message) {
        this._connection.emit("message", message);
    },
    
    sendUTF8: function(data) {
        this.send(data)
    },

    close: function(logError) {
        //console.log("Closing connection to socket"+". Error: " + logError);
        this._connection.disconnect();
    }
    


});