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

    if (mode === "client") {
        map.data = [];
        map.high = [];
        map.animated = {};
        map.lightTiles = {};
        map.lights = [];
        map.shadows = [];
        map.blocking = [];
        map.plateau = [];
        map.musicAreas = [];
        map.pvpZones = [];
        map.fishingTiles = {};
        map.scenes = [];
    }
    if (mode === "server") {
        map.roamingAreas = [];
        map.chestAreas = [];
        map.staticChests = [];
        map.staticEntities = {};
    }

    console.log("Processing map info...");
    map.width = Tiled.width;
    map.height = Tiled.height;
    map.tilesize = Tiled.tilewidth;

    // Tile properties (collision, z-index, animation properties...)
    var tileProperties;
    var handleProp = function (property, id) {
        if (property.name === "c") {
            map.collidingTiles[id] = true;
        }

        if (mode === "client") {
            if (property.name === "v") {
                map.high.push(id);
            }

            if (property.name === "lake") {
                lakes[id] = property.value;
            }
            const animProps = ["length", "frames", "delay", "direction", "slideAmount", "colorShift", "loopStyle", "startFrame", "bouncePause"];
            if (animProps.includes(property.name)) {
                if (!map.animated[id]) {
                    map.animated[id] = {};
                }

                // Special handling for 'length' and 'delay'
                if (property.name === "length") {
                    map.animated[id].l = property.value;
                } else if (property.name === "delay") {
                    map.animated[id].d = property.value;
                } else {
                    map.animated[id][property.name] = property.value;
                }
            }

            const lightProps = ["intensity", "light", "color", "radius", "innerRadius", "spread", "innerSpread", "angle", "shadow", "animation"];
            if (lightProps.includes(property.name)) {
                if (!map.lightTiles[id]) {
                    map.lightTiles[id] = {};
                }

                if (property.name === "light" || property.name === "intensity") {
                    map.lightTiles[id].intensity = parseFloat(String(property.value).replace(',', '.'));
                } else if (property.name === "color") {
                    // r,g,b as string
                    let colors = property.value.split(',');
                    map.lightTiles[id].color = {r: parseInt(colors[0]), g: parseInt(colors[1]), b: parseInt(colors[2])};
                } else if (property.name === "radius") {
                    map.lightTiles[id][property.name] = parseInt(property.value);
                } else if (property.name === "innerRadius") {
                    map.lightTiles[id][property.name] = parseInt(property.value);
                } else if (property.name === "spread") {
                    map.lightTiles[id][property.name] = parseInt(property.value);
                } else if (property.name === "innerSpread") {
                    map.lightTiles[id][property.name] = parseInt(property.value);
                } else if (property.name === "angle") {
                    map.lightTiles[id][property.name] = parseInt(property.value);
                } else if (property.name === "shadow") {
                    map.lightTiles[id][property.name] = parseFloat(String(property.value).replace(',', '.'));
                } else {
                    map.lightTiles[id][property.name] = property.value;
                }
            }
        }
    }

    var getObjectGroupByName = function (groupName) {
        for (var i = 0; i < Tiled.objectgroup.length; i += 1) {
            var group = Tiled.objectgroup[i];
            if (group.name !== groupName) {
                continue;
            }

            let objects = group.object;
            if (objects === undefined) {
                return null;
            }

            if (objects[0] === undefined) {
                objects = [objects];
            }

            return objects;
        }
    }

    var processGroup = function (groupName, callback) {
        console.log("Processing " + groupName + "...");
        var group = getObjectGroupByName(groupName);
        if (group) {
            _.each(group, function (object, idx) {
                callback(object, idx);
            });
        }
    }

    if (Tiled.tileset instanceof Array) {
        _.each(Tiled.tileset, function (tileset) {
            if (tileset.name === "tilesheet") {
                console.log("Processing terrain properties...");
                tileProperties = tileset.tile;
                for (var i = 0; i < tileProperties.length; i += 1) {
                    var property = tileProperties[i].properties.property;
                    var tilePropertyId = tileProperties[i].id + 1;
                    if (property instanceof Array) {
                        for (var pi = 0; pi < property.length; pi += 1) {
                            handleProp(property[pi], tilePropertyId);
                        }
                    } else {
                        handleProp(property, tilePropertyId);
                    }
                }
            } else if (tileset.name === "Mobs" && mode === "server") {

                // Substitution dictionary (to safeguard against old naming convention)
                var substitutionDict = {
                    "firepotion": "loopring",
                    "burger": "taikoboost"
                };

                console.log("Processing static entity properties...");
                mobsFirstgid = tileset.firstgid;
                _.each(tileset.tile, function (p) {
                    var property = p.properties.property,
                        id = p.id + 1;

                    // Check if property name needs to be substituted
                    var propName = substitutionDict[property.name] || property.name;

                    if (property.name === "type") {
                        staticEntities[id] = property.value;
                    }
                });
            }
        });
    } else {
        console.error("A tileset is missing");
    }

    var processDoor = function (door) {
        let newDoor = {
            x: door.x / map.tilesize,
            y: door.y / map.tilesize,
            p: (door.type === 'portal') ? 1 : 0,
            map: door.map
        }
        var doorProps = door.properties.property;
        for (var k = 0; k < doorProps.length; k += 1) {
            newDoor['t' + doorProps[k].name] = doorProps[k].value;
        }

        map.doors.push(newDoor);
    }

    var processRoamingArea = function (area, idx) {
        var nb = null;
        if (area.properties) {
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

    var processTriggerArea = function (triggerArea, idx) {
        var trigger = {
            id: triggerArea.id,
            x: triggerArea.x / map.tilesize,
            y: triggerArea.y / map.tilesize,
            w: triggerArea.width / map.tilesize,
            h: triggerArea.height / map.tilesize,
        };

        if (triggerArea.properties) {
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


    var processScene = function (scene, idx) {
        var newScene = {
            id: scene.id,
            x: Math.floor(scene.x / map.tilesize),
            y: Math.floor(scene.y / map.tilesize),
            w: Math.ceil(scene.width / map.tilesize),
            h: Math.ceil(scene.height / map.tilesize),
            name: scene.name,
        };

        if (scene.properties) {
            var sceneProps = scene.properties.property;

            if (sceneProps[0] === undefined) {
                sceneProps = [scene.properties.property];
            }

            for (var k = 0; k < sceneProps.length; k += 1) {
                newScene[sceneProps[k].name] = sceneProps[k].value;
            }
        }

        map.scenes.push(newScene);
    }


    var processLights = function (light, idx) {
        var newLight = {
            id: light.id,
            x: parseInt(light.x),
            y: parseInt(light.y),
        };

        if (light.ellipse !== undefined) {
            console.log("Processing light: " + light.id);
            console.log(light);
            console.log(newLight.x + " + " + light.width + " / 2 = " + (newLight.x + parseInt(light.width) / 2));
            newLight.x += parseInt(light.width) / 2;
            newLight.y += parseInt(light.height) / 2;
            newLight.radius = Math.ceil(parseInt(light.width) / 2 / map.tilesize);
        } else {
            newLight.w = light.width
            newLight.h = light.height
            newLight.global = true;
        }

        if (light.properties) {

            let lightProps = light.properties;
            if (!Array.isArray(light.properties)) {
                lightProps = [light.properties];
            }

            if (lightProps) {
                for (var k = 0; k < lightProps.length; k += 1) {
                    if (lightProps[k].property.name === "light") {
                        lightProps[k].property.name = "intensity";
                    }

                    switch (lightProps[k].property.name) {
                        case "intensity":
                        case "light":
                            newLight.intensity = parseFloat(String(lightProps[k].property.value).replace(',', '.'));
                            break;
                        case "color":
                            let colors = lightProps[k].property.value.split(',');
                            newLight.color = {r: parseInt(colors[0]), g: parseInt(colors[1]), b: parseInt(colors[2])};
                            break;
                        case "radius":
                            newLight.radius = parseInt(lightProps[k].property.value);
                            break;
                        case "innerRadius":
                            newLight.innerRadius = parseInt(lightProps[k].property.value);
                            break;
                        case "spread":
                            newLight.spread = parseInt(lightProps[k].property.value);
                            break;
                        case "innerSpread":
                            newLight.innerSpread = parseInt(lightProps[k].property.value);
                            break;
                        case "angle":
                            newLight.angle = parseInt(lightProps[k].property.value);
                            break;
                        case "shadow":
                            newLight.shadow = parseFloat(String(lightProps[k].property.value).replace(',', '.'));
                            break;
                        case "animation":
                            newLight.animation = lightProps[k].property.value;
                            break;
                    }
                }
            }
        }

        map.lights.push(newLight);
    }

    var processShadows = function (shadow, idx) {
        map.shadows.push(shadow);
    }

    var processChestArea = function (area) {
        var chestArea = {
            x: area.x / map.tilesize,
            y: area.y / map.tilesize,
            w: area.width / map.tilesize,
            h: area.height / map.tilesize
        };
        _.each(area.properties.property, function (prop) {
            if (prop.name === 'items') {
                chestArea['i'] = _.map(prop.value.split(','), function (name) {
                    return Types.getKindFromString(name);
                });
            } else if (prop.name === 'chances') {
                chestArea['c'] = {};
                let changes = prop.value.split(',');
                for (let i = 0; i < changes.length; i += 1) {
                    let chance = changes[i].split(':');
                    chestArea['c'][Types.getKindFromString(chance[0])] = parseFloat(chance[1]);
                }
            } else {
                chestArea['t' + prop.name] = prop.value;
            }
        });
        map.chestAreas.push(chestArea);
    }

    var processChest = function (chest) {
        if (chest.properties.property.value) {
            var items = chest.properties.property.value;
            var newChest = {
                y: chest.y / map.tilesize,
                x: chest.x / map.tilesize,
                i: _.map(items.split(','), function (name) {
                    return Types.getKindFromString(name);
                })
            };
        } else {
            var newChest = {
                y: chest.y / map.tilesize,
                x: chest.x / map.tilesize
            }
            _.each(chest.properties.property, function (prop) {
                if (prop.name === 'items') {
                    newChest['i'] = _.map(prop.value.split(','), function (name) {
                        return Types.getKindFromString(name);
                    });
                } else if (prop.name === 'chances') {
                    newChest['c'] = {};
                    let changes = prop.value.split(',');
                    for (let i = 0; i < changes.length; i += 1) {
                        let chance = changes[i].split(':');
                        newChest['c'][Types.getKindFromString(chance[0])] = parseFloat(chance[1]);
                    }
                } else if (prop.name === 'delay') {
                    newChest['d'] = parseInt(prop.value) * 1000;
                } else {
                    newChest['t' + prop.name] = prop.value;
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

    var processCheckpoint = function (checkpoint, idx) {
        var cp = {
            id: idx + 1,
            x: checkpoint.x / map.tilesize,
            y: checkpoint.y / map.tilesize,
            w: checkpoint.width / map.tilesize,
            h: checkpoint.height / map.tilesize
        };

        if (mode === "server") {
            cp.s = checkpoint.type ? 1 : 0;
        }

        map.checkpoints.push(cp);
    }

    var processPvpZone = function (pvp) {
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
        processGroup('scenes', processScene);
        processGroup('lights', processLights);
        processGroup('shadows', processShadows);
    }

    processGroup('checkpoints', processCheckpoint);

    // Layers
    if (Tiled.layer instanceof Array) {
        for (var i = Tiled.layer.length - 1; i > 0; i -= 1) {
            processLayer(Tiled.layer[i]);
        }
    } else {
        processLayer(Tiled.layer);
    }

    if (mode === "client") {
        // Set all undefined tiles to 0
        for (var i = 0, max = map.data.length; i < max; i += 1) {
            if (!map.data[i]) {
                map.data[i] = 0;
            }
        }
    }

    return map;
};

var processLayer = function processLayer(layer) {
    if (mode === "server") {
        // Mobs
        if (layer.name === "entities") {
            console.log("Processing positions of static entities ...");
            var tiles = layer.data.tile;

            for (var j = 0; j < tiles.length; j += 1) {
                var gid = tiles[j].gid - mobsFirstgid + 1;
                if (gid && gid > 0) {
                    map.staticEntities[j] = staticEntities[gid];
                }
            }
        }
    }

    var tiles = layer.data.tile;

    if (layer.name === "blocking") {
        console.log("Processing blocking tiles...");
        for (var i = 0; i < tiles.length; i += 1) {
            var gid = tiles[i].gid;

            if (gid && gid > 0) {
                if (mode === "server") {
                    map.collisions.push(i);
                } else {
                    map.blocking.push(i);
                }
            }
        }
    } else if (mode === "client" && layer.name === "plateau") {
        console.log("Processing plateau tiles...");
        for (var i = 0; i < tiles.length; i += 1) {
            var gid = tiles[i].gid;

            if (gid && gid > 0) {
                map.plateau.push(i);
            }
        }
    } else if (layer.visible !== 0 && layer.name !== "entities") {
        console.log("Processing layer: " + layer.name);

        for (var j = 0; j < tiles.length; j += 1) {
            var gid = tiles[j].gid;

            if (mode === "client") {
                // Set tile gid in the tilesheet
                if (gid > 0) {
                    if (map.data[j] === undefined) {
                        map.data[j] = gid;
                    } else if (map.data[j] instanceof Array) {
                        map.data[j].unshift(gid);
                    } else {
                        map.data[j] = [gid, map.data[j]];
                    }
                    // fishing tiles
                    if (gid in lakes) {
                        map.fishingTiles[j] = lakes[gid];
                    }
                }
            }

            // Colliding tiles
            if (gid in map.collidingTiles) {
                map.collisions.push(j);
            }
        }
    } else if (layer.visible === 0) {
        console.log("Processing hidden layer: " + layer.name);
        map.hiddenLayers[layer.name] = [];
        for (var j = 0; j < tiles.length; j += 1) {
            var gid = tiles[j].gid;
            if (gid > 0) {
                if (map.hiddenLayers[layer.name][j] === undefined) {
                    map.hiddenLayers[layer.name][j] = gid;
                } else if (map.hiddenLayers[layer.name][j] instanceof Array) {
                    map.hiddenLayers[layer.name][j].unshift(gid);
                } else {
                    map.hiddenLayers[layer.name][j] = [gid, map.hiddenLayers[layer.name][j]];
                }
            }
        }
    }
}