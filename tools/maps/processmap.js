
var Log = require('log'),
    _ = require('underscore'),
    log = new Log(console.debug),
    Types = require("../../shared/js/gametypes");

var map,
    mode,
    staticEntities = {},
    lakes = {},
    mobsFirstgid;

module.exports = function processMap(json, options) {
    var self = this,
        Tiled = json.map,
        layerIndex = 0,
        tileIndex = 0,
        tilesetFilepath = "";

    map = {
        width: 0,
        height: 0,
        collisions: [],
        doors: [],
        checkpoints: [],
        triggers: [],
        hiddenLayers: {},
        collidingTiles: {}
    };
    mode = options.mode;

    if(mode === "client") {
        map.data = [];
        map.high = [];
        map.animated = {};
        map.blocking = [];
        map.plateau = [];
        map.musicAreas = [];
        map.pvpZones = [];
        map.fishingTiles = {};
    }
    if(mode === "server") {
        map.roamingAreas = [];
        map.chestAreas = [];
        map.staticChests = [];
        map.staticEntities = {};
    }

    console.log("Processing map info...");
    map.width = Tiled.width;
    map.height = Tiled.height;
    map.tilesize = Tiled.tilewidth;

    // Tile properties (collision, z-index, animation length...)
    var tileProperties;
    var handleProp = function(property, id) {
        if(property.name === "c") {
            map.collidingTiles[id] = true;
        }

        if(mode === "client") {
            if(property.name === "v") {
                map.high.push(id);
            }
            if(property.name === "length") {
                if(!map.animated[id]) {
                    map.animated[id] = {};
                }
                map.animated[id].l = property.value;
            }
            if(property.name === "delay") {
                if(!map.animated[id]) {
                    map.animated[id] = {};
                }
                map.animated[id].d = property.value;
            }
            if(property.name === "lake") {
                lakes[id] = property.value;
            }
        }
    }

    var getObjectGroupByName = function(groupName) {
        for(var i=0; i < Tiled.objectgroup.length; i += 1) {
            var group = Tiled.objectgroup[i];
            if(group.name !== groupName) {
                continue;
            }

            let objects = group.object;
            if(objects === undefined) {
                return null;
            }

            if(objects[0] === undefined) {
                objects = [objects];
            }

            return objects;
        }
    }

    var processGroup = function(groupName, callback) {
        console.log("Processing " + groupName + "...");
        var group = getObjectGroupByName(groupName);
        if(group) {
            _.each(group, function(object, idx) {
                callback(object, idx);
            });
        }
    }

    if(Tiled.tileset instanceof Array) {
        _.each(Tiled.tileset, function(tileset) {
            if(tileset.name === "tilesheet") {
                console.log("Processing terrain properties...");
                tileProperties = tileset.tile;
                for(var i=0; i < tileProperties.length; i += 1) {
                    var property = tileProperties[i].properties.property;
                    var tilePropertyId = tileProperties[i].id + 1;
                    if(property instanceof Array) {
                        for(var pi=0; pi < property.length; pi += 1) {
                            handleProp(property[pi], tilePropertyId);
                        }
                    } else {
                        handleProp(property, tilePropertyId);
                    }
                }
            }
            else if(tileset.name === "Mobs" && mode === "server") {
                console.log("Processing static entity properties...");
                mobsFirstgid = tileset.firstgid;
                _.each(tileset.tile, function(p) {
                    var property = p.properties.property,
                        id = p.id + 1;

                    if(property.name === "type") {
                        staticEntities[id] = property.value;
                    }
                });
            }
        });
    } else {
        console.error("A tileset is missing");
    }

    var processDoor = function(door) {
        let newDoor = {
            x: door.x / map.tilesize,
            y: door.y / map.tilesize,
            p: (door.type === 'portal') ? 1 : 0,
            map: door.map
        }
        var doorProps = door.properties.property;
        for(var k=0; k < doorProps.length; k += 1) {
            newDoor['t'+doorProps[k].name] = doorProps[k].value;
        }

        map.doors.push(newDoor);
    }

    var processRoamingArea = function(area, idx) {
        var nb = null;
        if(area.properties) {
            nb = area.properties.property.value;
        }

        map.roamingAreas.push({
            id: idx,
            x: area.x / 16,
            y: area.y / 16,
            width: area.width / 16,
            height: area.height / 16,
            type: area.type,
            nb: nb
        });
    }

    var processTriggerArea = function(triggerArea, idx) {
        var trigger = {
            id: triggerArea.id,
            x: triggerArea.x / map.tilesize,
            y: triggerArea.y / map.tilesize,
            w: triggerArea.width / map.tilesize,
            h: triggerArea.height / map.tilesize,
        };

        if(triggerArea.properties) {
            var triggerProps = triggerArea.properties.property;

            if (triggerProps[0] === undefined) {
                triggerProps = [triggerArea.properties.property];
            }

            for (var k = 0; k < triggerProps.length; k += 1) {
                trigger[triggerProps[k].name] = triggerProps[k].value;
            }
        }

        map.triggers.push(trigger);
    }

    var processChestArea = function(area) {
        var chestArea = {
            x: area.x / map.tilesize,
            y: area.y / map.tilesize,
            w: area.width / map.tilesize,
            h: area.height / map.tilesize
        };
        _.each(area.properties.property, function(prop) {
            if(prop.name === 'items') {
                chestArea['i'] = _.map(prop.value.split(','), function(name) {
                    return Types.getKindFromString(name);
                });
            } else if(prop.name === 'chances') {
                chestArea['c'] = {};
                let changes = prop.value.split(',');
                for (let i = 0; i < changes.length; i += 1) {
                    let chance = changes[i].split(':');
                    chestArea['c'][Types.getKindFromString(chance[0])] = parseFloat(chance[1]);
                }
            } else {
                chestArea['t'+prop.name] = prop.value;
            }
        });
        map.chestAreas.push(chestArea);
    }

    var processChest = function(chest) {
        if(chest.properties.property.value) {
            var items = chest.properties.property.value;
            var newChest = {
                y: chest.y / map.tilesize,
                x: chest.x / map.tilesize,
                i: _.map(items.split(','), function(name) {
                    return Types.getKindFromString(name);
                })
            };
        } else {
            var newChest = {
                y: chest.y / map.tilesize,
                x: chest.x / map.tilesize
            }
            _.each(chest.properties.property, function(prop) {
                if(prop.name === 'items') {
                    newChest['i'] = _.map(prop.value.split(','), function(name) {
                        return Types.getKindFromString(name);
                    });
                } else if(prop.name === 'chances') {
                    newChest['c'] = {};
                    let changes = prop.value.split(',');
                    for (let i = 0; i < changes.length; i += 1) {
                        let chance = changes[i].split(':');
                        newChest['c'][Types.getKindFromString(chance[0])] = parseFloat(chance[1]);
                    }
                } else if(prop.name === 'delay') {
                    newChest['d'] = parseInt(prop.value) * 1000;
                } else {
                    newChest['t'+prop.name] = prop.value;
                }
            });
        }

        map.staticChests.push(newChest);
    }

    var processMusic = function (music) {
        var musicArea = {
            x: music.x / map.tilesize,
            y: music.y / map.tilesize,
            w: music.width / map.tilesize,
            h: music.height / map.tilesize,
            id: music.properties.property.value
        };
        map.musicAreas.push(musicArea);
    }

    var processCheckpoint = function(checkpoint, idx) {
        var cp = {
            id: idx + 1,
            x: checkpoint.x / map.tilesize,
            y: checkpoint.y / map.tilesize,
            w: checkpoint.width / map.tilesize,
            h: checkpoint.height / map.tilesize
        };

        if(mode === "server") {
            cp.s = checkpoint.type ? 1 : 0;
        }

        map.checkpoints.push(cp);
    }

    var processPvpZone = function(pvp) {
        var pvpZone = {
            x: pvp.x / map.tilesize,
            y: pvp.y / map.tilesize,
            w: pvp.width / map.tilesize,
            h: pvp.height / map.tilesize
        };
        map.pvpZones.push(pvpZone);
    }

    // Object layers
    processGroup('doors', processDoor);
    processGroup('triggers', processTriggerArea);

    if (mode === 'server') {
        processGroup('roaming', processRoamingArea);
        processGroup('chestareas', processChestArea);
        processGroup('chests', processChest);
    }

    if (mode === "client") {
        processGroup('music', processMusic);
        processGroup('pvpzones', processPvpZone);
    }

    processGroup('checkpoints', processCheckpoint);

    // Layers
    if(Tiled.layer instanceof Array) {
        for(var i=Tiled.layer.length - 1; i > 0; i -= 1) {
            processLayer(Tiled.layer[i]);
        }
    } else {
        processLayer(Tiled.layer);
    }

    if(mode === "client") {
        // Set all undefined tiles to 0
        for(var i=0, max=map.data.length; i < max; i+=1) {
            if(!map.data[i]) {
                map.data[i] = 0;
            }
        }
    }

    return map;
};

var processLayer = function processLayer(layer) {
    if(mode === "server") {
        // Mobs
        if(layer.name === "entities") {
            console.log("Processing positions of static entities ...");
            var tiles = layer.data.tile;

            for(var j=0; j < tiles.length; j += 1) {
                var gid = tiles[j].gid - mobsFirstgid + 1;
                if(gid && gid > 0) {
                    map.staticEntities[j] = staticEntities[gid];
                }
            }
        }
    }

    var tiles = layer.data.tile;

    if(layer.name === "blocking") {
        console.log("Processing blocking tiles...");
        for (var i = 0; i < tiles.length; i += 1) {
            var gid = tiles[i].gid;

            if (gid && gid > 0) {
                if(mode === "server") {
                    map.collisions.push(i);
                } else {
                    map.blocking.push(i);
                }
            }
        }
    }
    else if(mode === "client" && layer.name === "plateau") {
        console.log("Processing plateau tiles...");
        for(var i=0; i < tiles.length; i += 1) {
            var gid = tiles[i].gid;

            if(gid && gid > 0) {
                map.plateau.push(i);
            }
        }
    }
    else if(layer.visible !== 0 && layer.name !== "entities") {
        console.log("Processing layer: "+ layer.name);

        for(var j=0; j < tiles.length; j += 1) {
            var gid = tiles[j].gid;

            if(mode === "client") {
                // Set tile gid in the tilesheet
                if(gid > 0) {
                    if(map.data[j] === undefined) {
                        map.data[j] = gid;
                    }
                    else if(map.data[j] instanceof Array) {
                        map.data[j].unshift(gid);
                    }
                    else {
                        map.data[j] = [gid, map.data[j]];
                    }
                // fishing tiles
                if(gid in lakes) {
                    map.fishingTiles[j] = lakes[gid];
                    }
                }
            }

            // Colliding tiles
            if(gid in map.collidingTiles) {
                map.collisions.push(j);
            }
        }
    } else if(layer.visible === 0) {
        console.log("Processing hidden layer: "+ layer.name);
        map.hiddenLayers[layer.name] = [];
        for(var j=0; j < tiles.length; j += 1) {
            var gid = tiles[j].gid;
            if(gid > 0) {
                if(map.hiddenLayers[layer.name][j] === undefined) {
                    map.hiddenLayers[layer.name][j] = gid;
                }
                else if(map.hiddenLayers[layer.name][j] instanceof Array) {
                    map.hiddenLayers[layer.name][j].unshift(gid);
                }
                else {
                    map.hiddenLayers[layer.name][j] = [gid, map.hiddenLayers[layer.name][j]];
                }
            }
        }
    }
}