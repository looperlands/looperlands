var _ = require('underscore'),
    Types = require("../../shared/js/gametypes");
const Zones = require('../../shared/js/gameplayzones');
const WorldFxConfig = require('../../client/js/worldfxconfig');

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

    lakes = {};
    map = {
        width: 0,
        height: 0,
        collisions: [],
        doors: [],
        checkpoints: [],
        triggers: [],
        scenes: [],
        hiddenLayers: {},
        collidingTiles: {},
        baseFishingTiles: {},
        fishingAreas: [],
        musicAreas: [],
        pvpZones: []
    };
    mode = options.mode;

    if (mode === "client") {
        map.data = [];
        map.high = [];
        map.animated = {};
        map.stagedTiles = {};
        map.actionTiles = {};
        map.lightTiles = {};
        map.lights = [];
        map.shadows = [];
        map.blocking = [];
        map.plateau = [];
        map.fishingTiles = {};
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
    const tilesets = Tiled.tilesets || Tiled.tileset || [];
    const firstTileset = Array.isArray(tilesets) ? tilesets[0] : tilesets;
    map.tilesetColumns = firstTileset?.columns || 0;

    // Tile properties (collision, z-index, animation properties...)
    var tileProperties;
    var handleProp = function (property, id) {
        if (property.name === "c") {
            map.collidingTiles[id] = true;
        }

        if (property.name === "lake") lakes[id] = property.value;
        if (mode === "client") {
            if (property.name === "v") {
                map.high.push(id);
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

            const stageProps = ["groupName", "groupOffset", "groupSize", "highRows", "replaceBaseTile", "renderMode", "stageStride", "stageTiles", "stages"];
            if (stageProps.includes(property.name)) {
                if (!map.stagedTiles[id]) {
                    map.stagedTiles[id] = { size: { w: 1, h:1}, offset: { x:0, y:0}};
                }

                if (property.name === "stages") {
                    map.stagedTiles[id].stages = parseInt(property.value);
                } else if (property.name === "highRows") {
                    map.stagedTiles[id].highRows = parseInt(property.value);
                } else if (property.name === "stageStride") {
                    map.stagedTiles[id].stageStride = parseInt(property.value);
                } else if (property.name === "replaceBaseTile") {
                    map.stagedTiles[id].replaceBaseTile = property.value === true || property.value === "true" || property.value === "1";
                } else if (property.name === "stageTiles") {
                    map.stagedTiles[id].stageTiles = property.value
                        .split(',')
                        .map((stageTile) => parseInt(stageTile.trim()))
                        .filter((stageTile) => !Number.isNaN(stageTile));
                } else if (property.name === "groupOffset") {
                    map.stagedTiles[id].offset = {x: parseInt(property.value.split(',')[0]), y: parseInt(property.value.split(',')[1])};
                } else if (property.name === "groupSize") {
                    map.stagedTiles[id].size = {w: parseInt(property.value.split(',')[0]), h: parseInt(property.value.split(',')[1])};
                } else {
                    map.stagedTiles[id][property.name] = property.value;
                }
            }

            const actionProps = ["action", "allowedPlantTypes"];
            if(actionProps.includes(property.name)) {
                if (!map.actionTiles[id]) {
                    map.actionTiles[id] = {};
                }

                map.actionTiles[id][property.name] = property.value;
            }
        }
    }

    var getObjectGroupByName = function (groupName) {
        const groups = Tiled.objectgroup ? (Array.isArray(Tiled.objectgroup) ? Tiled.objectgroup : [Tiled.objectgroup]) : [];
        if (['fishing', 'checkpoints', 'triggers', 'pvpzones', 'music', 'eventBoards'].includes(groupName)) {
            const found = groups.filter(group => group.name === groupName);
            if (found.length > 1 || found.some(group => ['offsetx','offsety','x','y'].some(key => Number(group[key] || 0)))) throw new Error('Use one '+groupName+' object layer without offsets.');
        }
        for (var i = 0; i < groups.length; i += 1) {
            var group = groups[i];
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

    var removeStagedTileAnimationTiming = function () {
        if (mode !== "client" || !map.tilesetColumns) {
            return;
        }

        _.each(map.stagedTiles, function (stagedTile, key) {
            var baseTileId = parseInt(key, 10),
                width = stagedTile.size?.w || 1,
                height = stagedTile.size?.h || 1;

            if (Number.isNaN(baseTileId)) {
                return;
            }

            for (var x = 0; x < width; x += 1) {
                for (var y = 0; y < height; y += 1) {
                    var tileId = baseTileId + x + (y * map.tilesetColumns),
                        animation = map.animated[tileId];

                    if (!animation) {
                        continue;
                    }

                    if (Number(animation.l) > 1) {
                        animation.l = 1;
                    }

                    delete animation.d;
                }
            }
        });
    }

    if (Tiled.tileset instanceof Array) {
        _.each(Tiled.tileset, function (tileset) {
            if (tileset.name === "tilesheet") {
                console.log("Processing terrain properties...");
                tileProperties = [].concat(tileset.tile || []);
                for (var i = 0; i < tileProperties.length; i += 1) {
                    var property = tileProperties[i]?.properties?.property ?? {};
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

    removeStagedTileAnimationTiming();

    var processDoor = function (door) {
        let newDoor = {
            x: door.x / map.tilesize,
            y: door.y / map.tilesize,
            p: ((door.type || door.class) === 'portal') ? 1 : 0,
            map: door.map
        }
        var rawDoorProps = door.properties?.property;
        var doorProps = rawDoorProps ? (Array.isArray(rawDoorProps) ? rawDoorProps : [rawDoorProps]) : [];
        for (var k = 0; k < doorProps.length; k += 1) {
            newDoor['t' + doorProps[k].name] = doorProps[k].value;
        }

        map.doors.push(newDoor);
    }

    var processRoamingArea = function (area, idx) {
        const props = [].concat(area.properties || []).flatMap(group => [].concat(group.property || []));
        const nb = Number(props.find(p => p.name === 'nb')?.value ?? props[0]?.value ?? 0);

        map.roamingAreas.push({
            id: idx,
            objectId: area.id,
            name: area.name,
            x: area.x / map.tilesize,
            y: area.y / map.tilesize,
            width: area.width / map.tilesize,
            height: area.height / map.tilesize,
            type: area.type || area.class,
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

        trigger.objectId = triggerArea.id;trigger.name = triggerArea.name || '';
        for (const [key,value] of Object.entries(Zones.properties(triggerArea))) if (!['id','x','y','w','h','objectId','name'].includes(key)) trigger[key] = value;

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

        if (newScene.ambience !== undefined) newScene.ambience = WorldFxConfig.ambient(newScene.ambience);
        if (newScene.fx !== undefined) {
            newScene.fx = WorldFxConfig.parse(newScene.fx);
            WorldFxConfig.scenery(newScene.fx);
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

            // The TMX converter wraps properties differently for a single child
            // and for an object with both properties and an ellipse.
            const lightProps = [].concat(light.properties).flatMap(group => [].concat(group.property || []));

            if (lightProps) {
                for (var k = 0; k < lightProps.length; k += 1) {
                    switch (lightProps[k].name) {
                        case "intensity":
                        case "light":
                            newLight.intensity = parseFloat(String(lightProps[k].value).replace(',', '.'));
                            break;
                        case "color":
                            let colors = String(lightProps[k].value).split(',');
                            newLight.color = {r: parseInt(colors[0]), g: parseInt(colors[1]), b: parseInt(colors[2])};
                            break;
                        case "radius":
                            newLight.radius = parseInt(lightProps[k].value);
                            break;
                        case "innerRadius":
                            newLight.innerRadius = parseInt(lightProps[k].value);
                            break;
                        case "spread":
                            newLight.spread = parseInt(lightProps[k].value);
                            break;
                        case "innerSpread":
                            newLight.innerSpread = parseInt(lightProps[k].value);
                            break;
                        case "angle":
                            newLight.angle = parseInt(lightProps[k].value);
                            break;
                        case "shadow":
                            newLight.shadow = parseFloat(String(lightProps[k].value).replace(',', '.'));
                            break;
                        case "animation":
                            newLight.animation = lightProps[k].value;
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
            id: area.id,
            objectId: area.id,
            name: area.name,
            x: area.x / map.tilesize,
            y: area.y / map.tilesize,
            w: area.width / map.tilesize,
            h: area.height / map.tilesize
        };
        _.each([].concat(area.properties || []).flatMap(group => [].concat(group.property || [])), function (prop) {
            if (prop.name === 'items') {
                chestArea['i'] = _.map(prop.value.split(','), function (name) {
                    return Types.getKindFromString(name.trim());
                });
            } else if (prop.name === 'chances') {
                chestArea['c'] = {};
                let changes = prop.value.split(',');
                for (let i = 0; i < changes.length; i += 1) {
                    let chance = changes[i].split(':');
                    chestArea['c'][Types.getKindFromString(chance[0].trim())] = parseFloat(chance[1]);
                }
            } else {
                chestArea['t' + prop.name] = ['x','y'].includes(prop.name) ? Number(prop.value) : prop.value;
            }
        });
        map.chestAreas.push(chestArea);
    }

    var processChest = function (chest) {
            var newChest = {
                objectId: chest.id,
                name: chest.name,
                y: chest.y / map.tilesize,
                x: chest.x / map.tilesize
            }
            _.each([].concat(chest.properties || []).flatMap(group => [].concat(group.property || [])), function (prop) {
                if (prop.name === 'items') {
                    newChest['i'] = _.map(prop.value.split(','), function (name) {
                        return Types.getKindFromString(name.trim());
                    });
                } else if (prop.name === 'chances') {
                    newChest['c'] = {};
                    let changes = prop.value.split(',');
                    for (let i = 0; i < changes.length; i += 1) {
                        let chance = changes[i].split(':');
                        newChest['c'][Types.getKindFromString(chance[0].trim())] = parseFloat(chance[1]);
                    }
                } else if (prop.name === 'delay') {
                    newChest['d'] = Number(prop.value) * 1000;
                } else {
                    newChest['t' + prop.name] = prop.value;
                }
            });
        map.staticChests.push(newChest);
    }

    var processMusic = function (music) {
        var musicArea = {
            x: music.x / map.tilesize,
            y: music.y / map.tilesize,
            w: music.width / map.tilesize,
            h: music.height / map.tilesize,
            objectId:music.id,name:music.name||'',
            id: Zones.properties(music).music ?? Object.values(Zones.properties(music))[0]
        };
        map.musicAreas.push(musicArea);
    }

    var processCheckpoint = function (checkpoint, idx) {
        var cp = {
            id: Zones.checkpointId(checkpoint,idx),
            objectId:checkpoint.id, name:checkpoint.name||'',
            x: checkpoint.x / map.tilesize,
            y: checkpoint.y / map.tilesize,
            w: checkpoint.width / map.tilesize,
            h: checkpoint.height / map.tilesize
        };

        if (mode === "server") {
            cp.s = Zones.starting(checkpoint) ? 1 : 0;
        }

        if (!Number.isSafeInteger(cp.id) || cp.id < 1 || map.checkpoints.some(other=>other.id===cp.id)) throw new Error('Checkpoint IDs must be unique positive whole numbers.');
        map.checkpoints.push(cp);
    }

    var processPvpZone = function (pvp) {
        var pvpZone = {
            objectId:pvp.id,name:pvp.name||'',
            x: pvp.x / map.tilesize,
            y: pvp.y / map.tilesize,
            w: pvp.width / map.tilesize,
            h: pvp.height / map.tilesize
        };
        map.pvpZones.push(pvpZone);
    }

    // Fishing rectangles are shared by client and authoritative server exports.
    processGroup('fishing', object => {
        if (object.rotation || object.gid || object.ellipse || object.polygon || object.point || object.polyline || object.text) throw new Error('Fishing areas must be unrotated rectangles.');
        const list = object.properties?.property || object.properties || [];
        const p = Object.fromEntries((Array.isArray(list) ? list : [list]).map(row => [row.name, row.value]));
        map.fishingAreas.push({id: String(object.id), kind: 'fishing', name: object.name || '',
            x: object.x / map.tilesize, y: object.y / map.tilesize, width: object.width / map.tilesize, height: object.height / map.tilesize,
            scope: p.scope || 'area', sourceLake: p.sourceLake || '', level: Number(p.level || 1),
            fish: String(p.fish || '').split(',').filter(Boolean).map(value => {const [item, rarity] = value.trim().split(':');return {item, rarity};})});
    });
    // Object layers
    processGroup('doors', processDoor);
    processGroup('triggers', processTriggerArea);
    processGroup('scenes', processScene);
    map.eventBoards = [];
    processGroup('eventBoards', board => {
        map.eventBoards.push({objectId:board.id,name:board.name||'',x: board.x / map.tilesize, y: board.y / map.tilesize, w: board.width / map.tilesize, h: board.height / map.tilesize});
    });

    if (mode === 'server') {
        processGroup('roaming', processRoamingArea);
        processGroup('chestareas', processChestArea);
        processGroup('chests', processChest);
    }

    processGroup('music', processMusic);
    processGroup('pvpzones', processPvpZone);
    if (mode === "client") {
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

    if (mode === 'server') processGroup('mapmaker-entities', function (object) {
        const kind = Types.getKindFromString(object.name);
        const x = Math.floor(object.x / map.tilesize), y = Math.floor(object.y / map.tilesize);
        if (!kind || !(Types.isMob(kind) || Types.isNpc(kind) || Types.isItem(kind))) throw new Error('Unknown mapmaker entity: ' + object.name);
        if (object.gid) throw new Error('Use point objects for mapmaker entities, not tile objects.');
        if (x < 1 || y < 0 || x >= map.width || y >= map.height) throw new Error('Mapmaker entity must be inside the map, after the first column: ' + object.name);
        const position = y * map.width + x;
        if (map.staticEntities[position]) throw new Error('Two entities occupy the same map cell: ' + object.name);
        map.staticEntities[position] = object.name;
    });
    const firstLayer = Array.isArray(Tiled.layer) ? Tiled.layer[0] : null;
    if (firstLayer && firstLayer.visible !== 0 && !['entities','blocking','plateau'].includes(firstLayer.name)) [].concat(firstLayer.data?.tile || []).forEach((tile,index) => {if (tile.gid in lakes) map.baseFishingTiles[index] = lakes[tile.gid];});
    const Fishing = require('../../server/js/fishingareas');
    Fishing.validate(map.fishingAreas, map);
    return Fishing.apply(map);
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

            if (gid > 0 && gid in lakes) map.baseFishingTiles[j] = lakes[gid];

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
