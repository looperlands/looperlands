
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
    useBison = false;

module.exports = WS;

const axios = require('axios');
const crypto = require('crypto');
const NodeCache = require( "node-cache" );
const dao = require('./dao.js');
const Formulas = require('./formulas.js');
const ens = require("./ens.js");

const cache = new NodeCache();

const LOOPWORMS_LOOPERLANDS_BASE_URL = process.env.LOOPWORMS_LOOPERLANDS_BASE_URL;

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

        let http = require('http').Server(app);
        

        var corsAddress = self.protocol + "://" + self.host;
        self.io = require('socket.io')(http, {
            allowEIO3: true,
            cors: {origin: corsAddress, credentials: true}
        });

        app.use(express.json())

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

            let walletAlreadyPlaying = false;
            let cacheKeys = cache.keys();
            for (i in cacheKeys) {
                let key = cacheKeys[i];
                let cachedBody = cache.get(key);
                let sameWallet = cachedBody.walletId === body.walletId;
                if(sameWallet && cachedBody.isDirty === true) {
                    walletAlreadyPlaying = true;
                    break;
                } else if (sameWallet && cachedBody.isDirty === false){
                    console.log("deleting a session that never connected: " + key)
                    cache.del(key);
                }
            }

            if (walletAlreadyPlaying) {
                console.log("Wallet already playing", body.walletId, body.nftId);
                res.status(409).json({
                    status: false,
                    error: "Your wallet has an active session",
                    user: null
                });
            } else {
                const id = crypto.randomBytes(20).toString('hex');
                // this prevents failed logins not being able to login again
                body.isDirty = false;
                console.log("New Session", id, body);
                cache.set(id, body);
                let responseJson = {
                    "sessionId" : id
                }
                res.status(200).send(responseJson);
            }
        });

        app.get('/session/:sessionId', async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            console.log("Session Data for session id", sessionId, sessionData);
            const nftId = sessionData.nftId;
            const walletId = sessionData.walletId;
            const isDirty = sessionData.isDirty;

            if (isDirty === true) {
                res.status(409).json({
                    status: false,
                    error: "Your wallet has an active session",
                    user: null
                });
                return;
            }

            console.log("Session ID", sessionId, "Wallet ID", walletId, "NFT ID", nftId);
            let parsedSaveData = await dao.getCharacterData(walletId, nftId);
            let weapon = await dao.loadWeapon(walletId, nftId);
            
            let name = await ens.getEns(walletId);

            if (parsedSaveData === undefined) {
                console.log("Save data is undefined, creating new save data for " + name);
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
            } else if (parsedSaveData.error !== undefined) {
                res.status(500).json(parsedSaveData);
                return;
            }
            parsedSaveData.player.name = name;
            parsedSaveData.player.armor = nftId.replace("0x", "NFT_");
            parsedSaveData.player.weapon = weapon;
            parsedSaveData.nftId = nftId;
            parsedSaveData.walletId = walletId;
            
            res.status(200).json(parsedSaveData);
        });
        
        app.put('/session/:sessionId', (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            const nftId = sessionData.nftId;
            const walletId = sessionData.walletId;

            const body = req.body;
            const data = dao.saveCharacterData(walletId, nftId, body);
            res.status(200).send(true);
        });

        app.get("/session/:sessionId/inventory", async (req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            const walletId = sessionData.walletId;

            const inventory = await axios.get(`${LOOPWORMS_LOOPERLANDS_BASE_URL}/selectLooperLands_Item.php?WalletID=${walletId}&APIKEY=${process.env.LOOPWORMS_API_KEY}`);
            res.status(200).json(inventory.data);
        });

        app.get("/session/:sessionId/owns/:nftId", async (req, res) => {
            const sessionId = req.params.sessionId;
            const nftId = req.params.nftId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error" : "session not found",
                    user: null
                });
            } else {
                const walletId = sessionData.walletId;
                let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/AssetValidation.php?WalletID=${walletId}&NFTID=${nftId}`
                console.log(url);
                const result = await axios.get(url);
                res.status(200).json(result.data);
            }
            
        });
        
        app.get("/session/:sessionId/statistics", async (req, res) => {
            const sessionId = req.params.sessionId;
            const nftId = req.params.nftId;
            const sessionData = cache.get(sessionId);
            if (sessionData === undefined) {
                console.error("Session data is undefined for session id, params: ", sessionId, req.params);
                res.status(404).json({
                    status: false,
                    "error" : "session not found",
                    user: null
                });
            } else {
                let levelInfo = Formulas.calculatePercentageToNextLevel(sessionData.xp);
                let maxHp = Formulas.hp(levelInfo.currentLevel);
                let ret = {
                    levelInfo: levelInfo,
                    maxHp: maxHp
                }
                res.status(200).json(ret);
            }
        });

        app.get("/session/:sessionId/hp", async(req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            const playerId = sessionData.entityId;
            let ret = self.worldserver.getHpForCharactersInPlayerGroup(playerId);
            if (ret === undefined) {
                res.status(500).json({
                    status: false,
                    error: "Could not get hp for characters in player group",
                    user: null
                });
                return;
            }
            res.status(200).json(ret);
        });

        app.get("/session/:sessionId/disconnected", async(req, res) => {
            const sessionId = req.params.sessionId;
            const sessionData = cache.get(sessionId);
            let disconnected = false;
            if (sessionData !== undefined) {
                disconnected = sessionData.disconnected !== undefined && sessionData.disconnected;
            }
            res.status(200).json(disconnected);
        });

        self.io.on('connection', function(connection){
          console.log('a user connected');

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
            console.log("Received dispatch request")
            self._connection.emit("dispatched",  { "status" : "OK", host : server.host, port : server.port } )
        });

        connection.on("message", function (message) {
            console.log("Received: " + message)
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
        console.log("Closing connection to socket"+". Error: " + logError);
        this._connection.disconnect();
    }
    


});