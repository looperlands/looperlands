require('newrelic');
var fs = require('fs'),
    Metrics = require('./metrics');

const discord = require("./discord.js");

function main(config) {
    console.log(config);
    var ws = require("./ws"),
        WorldServer = require("./worldserver"),
        Log = require('log'),
        _ = require('underscore'),
        server = new ws.socketIOServer(config.host, config.port, config.protocol),
        metrics = config.metrics_enabled ? new Metrics(config) : null;
        worlds = [],
        lastTotalPlayers = 0,
        checkPopulationInterval = setInterval(function() {
            if(metrics && metrics.isReady) {
                metrics.getTotalPlayers(function(totalPlayers) {
                    if(totalPlayers !== lastTotalPlayers) {
                        lastTotalPlayers = totalPlayers;
                        _.each(worlds, function(world) {
                            world.updatePopulation(totalPlayers);
                        });
                    }
                });
            }
        }, 1000);
    
    switch(config.debug_level) {
        case "error":
            log = new Log(console.error); break;
        case "debug":
            log = new Log(console.debug); break;
        case "info":
            log = new Log(console.log); break;
    };
    
    console.log("Starting LOOPERLANDS game server...");
    
    server.onConnect(function(connection) {
        var world, // the one in which the player will be spawned
            connect = function() {
                if(world) {
                    world.connect_callback(new Player(connection, world));
                }
            };
        let mapId = connection._connection.handshake.query.mapId;
        world = this.worldsMap[mapId];
        connect();
    });

    server.onError(function() {
        console.error(Array.prototype.join.call(arguments, ", "));
    });
    
    var onPopulationChange = function() {
        metrics.updatePlayerCounters(worlds, function(totalPlayers) {
            _.each(worlds, function(world) {
                world.updatePopulation(totalPlayers);
            });
        });
        metrics.updateWorldDistribution(getWorldDistribution(worlds));
    };

    server.worldsMap = {};
    _.each(config.maps, function(map) {
        try {
            let world = new WorldServer('world_'+ map, config.nb_players_per_world, server);
            server.worldsMap[map] = world;
            world.run(config.map_directory+"world_server_"+ map + ".json");
            worlds.push(world);
            world.onPlayerAdded(world.updatePopulation);
            world.onPlayerRemoved(world.updatePopulation);
        } catch (e) {
            console.error(e);
        }

    });
    
    server.onRequestStatus(function() {
        return JSON.stringify(getWorldDistribution(worlds));
    });
    
    if(config.metrics_enabled) {
        metrics.ready(function() {
            onPopulationChange(); // initialize all counters to 0 when the server starts
        });
    }
    
    process.on('uncaughtException', function (e) {
        console.error('uncaughtException: ' + e);
    });
}

function getWorldDistribution(worlds) {
    var distribution = [];
    
    _.each(worlds, function(world) {
        distribution.push(world.playerCount);
    });
    return distribution;
}

function getConfigFile(path, callback) {
    fs.readFile(path, 'utf8', function(err, json_string) {
        if(err) {
            console.error("Could not open config file:", err.path);
            callback(null);
        } else {
            callback(JSON.parse(json_string));
        }
    });
}

var defaultConfigPath = './server/config.json';

process.argv.forEach(function (val, index, array) {
    if(index === 2) {
        customConfigPath = val;
    }
});

getConfigFile(defaultConfigPath, function(defaultConfig) {
    main(defaultConfig);
});

process.on('uncaughtException', function(err) {
    // Handle the error safely
    console.error(err, err.stack);
    discord.sendToDevChannel(err + "\n" + err.stack);
});