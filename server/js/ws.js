
var cls = require("./lib/class"),
    url = require('url'),
   // wsserver = require("websocket-server"),
   // miksagoConnection = require('websocket-server/lib/ws/connection'),
   // worlizeRequest = require('websocket').request,
    http = require('http'),
    Utils = require('./utils'),
    _ = require('underscore'),
    BISON = require('bison'),
    WS = {},
    useBison = false;

module.exports = WS;

const axios = require('axios');

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

getCharacterData = async function(wallet, nft, apiKey) {
    const data = new URLSearchParams();
    data.append('WalletID', wallet);
    data.append('NFTID', nft);
    data.append('APIKEY', apiKey);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    try {
        const responseData = await axios.post('https://loopworms.io/DEV/Wormagotchi/RaidBoss/LoadPost.php', data, options);
        //console.debug("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);
        return responseData.data;
    } catch {
        return {"error": "Error loading character data"};
    }

}

saveCharacterData = async function(wallet, nft, apiKey, saveGame) {
    const data = new URLSearchParams();
    data.append('WalletID', wallet);
    data.append('NFTID', nft);
    data.append('APIKEY', apiKey);
    data.append('SaveGame', JSON.stringify(saveGame));
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    };
    const axios = require('axios');
    try {
        const responseData = await axios.post('https://loopworms.io/DEV/Wormagotchi/RaidBoss/SavePost.php', data, options);
        //console.debug("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);
        return responseData.data;
    } catch {
        return {"error": "Error saving character data"};
    }
}

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
        var express = require('express');
        var app = express();
        app.use("/", express.static(__dirname + "/../../client-build"));
        var http = require('http').Server(app);

        var corsAddress = self.protocol + "://" + self.host;
        self.io = require('socket.io')(http, {
            allowEIO3: true,
            cors: {origin: corsAddress, credentials: true}
        });

        app.use(express.json())

        app.get('/wallets/:walletId/nfts/:nftId', async (req, res) => {
            const walletId = req.params.walletId;
            const nftId = req.params.nftId;
            const saveData = await getCharacterData(walletId, nftId, process.env.LOOPWORMS_API_KEY);
            let parsedSaveData;
            try {
                parsedSaveData = JSON.parse(saveData[0]);
            } catch {
                console.error("Error parsing save data " + saveData);
            }
            

            let name = walletId.substring(0,6);
            try {
                let ensLookup = await axios.get(`https://api3.loopring.io/api/wallet/v3/resolveName?owner=${walletId}`);
                console.log(ensLookup.data.data);
                name = ensLookup.data.data.split(".")[0];
            } catch {
                console.error("Error while looking up ENS name");
            }

            if (parsedSaveData === undefined) {
                parsedSaveData = {
                    hasAlreadyPlayed: undefined,
                    player: {
                        name: "",
                        weapon: "",
                        armor: "",
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
            

            if(parsedSaveData.hasAlreadyPlayed == true && parsedSaveData.player.armor === "") {
                parsedSaveData.hasAlreadyPlayed = false;
            }
            res.status(200).json(parsedSaveData);
        });
        
        app.post('/wallets/:walletId/nfts/:nftId', (req, res) => {
            const walletId = req.params.walletId;
            const nftId = req.params.nftId;

            const body = req.body;
            const data = saveCharacterData(walletId, nftId, process.env.LOOPWORMS_API_KEY, body);
            res.status(200).send(true);
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