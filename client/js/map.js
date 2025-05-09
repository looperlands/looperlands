define(['jquery', 'area'], function ($, Area) {

    var Mapx = Class.extend({
        init: function (loadMultiTilesheets, game, mapId) {
            this.game = game;
            this.mapId = mapId;
            this.data = [];
            this.isLoaded = false;
            this.tilesetsLoaded = false;
            this.mapLoaded = false;
            this.loadMultiTilesheets = loadMultiTilesheets;

            var useWorker = !(this.game.renderer.mobile || this.game.renderer.tablet);

            this._loadMap(useWorker);
            this._initTilesets();
            //this._initStreamCheck();
            this.highTileCache = {};
            this.animatedTileCache = {};
        },

        _checkReady: function () {
            if (this.tilesetsLoaded && this.mapLoaded) {
                this.isLoaded = true;
                if (this.ready_func) {
                    this.ready_func();
                }
            }
        },

        _initStreamCheck: function () {
            let url = '/music';
            let song = "";
            let self = this;
            let audio;
            let mapRequest = { map: this.mapId };

            setInterval(function () {
                axios.post(url, mapRequest).then(function (response) {
                    if (response.data === undefined || response.data.length === 0 || response.data.length === undefined) {
                        return;
                    }

                    let mp3URL = response.data;

                    if (mp3URL === 'null' || self.game.app.settings.getStreamMusicEnabled() === false) {
                        if (audio !== undefined) {
                            audio.pause();
                            delete audio;
                            song = "";
                        }
                        return;
                    }


                    if (song !== mp3URL) {

                        if (audio !== undefined) {
                            audio.pause();
                        }
                        audio = new Audio(mp3URL);
                        audio.loop = true;

                        document.body.addEventListener("mousemove", function () {
                            if (audio.playing === undefined) {
                                audio.playing = true;
                                console.log("playing song", mp3URL);
                                try {
                                    audio.play();
                                    self.game.audioManager.disable();
                                } catch (e) {
                                    song = undefined;
                                    audio = undefined;
                                    console.log(e);
                                }
                            }
                        });

                        song = mp3URL;
                    }

                }).catch(function (error) {
                    console.log(error);
                });

            }, 5000);
        },

        _loadMap: function (useWorker) {
            var self = this,
                filepath = "maps/world_client_" + this.mapId + ".json";

            if (useWorker) {
                console.log("Loading map with web worker." + this.mapId);
                let worker = new Worker('js/mapworker.js');
                worker.postMessage(this.mapId);

                worker.onmessage = function (event) {
                    var map = event.data;
                    self._initMap(map);
                    self.grid = map.grid;
                    self.plateauGrid = map.plateauGrid;
                    self.mapLoaded = true;
                    self._checkReady();
                    worker.terminate();
                };
            } else {
                console.log("Loading map via Ajax.");
                $.get(filepath, function (data) {
                    self._initMap(data);
                    self._generateCollisionGrid();
                    self._generatePlateauGrid();
                    self.mapLoaded = true;
                    self._checkReady();
                }, 'json');
            }
        },

        _initTilesets: function () {
            var tileset1, tileset2, tileset3;

            /**
             * This allows for shared tilesheets among maps.
             */
            let mapIdToTileset = {
                "oa": "oa",
                "oadungeon": "oa",
                "oaoverworld": "oa",
                "cobsfarm": "cobsfarm",
                "cobsfarmcity": "cobsfarmcity"
            }

            let tilesetId = mapIdToTileset[this.mapId];

            if (tilesetId === undefined) {
                tilesetId = this.mapId;
            }

            if (!this.loadMultiTilesheets) {
                this.tilesetCount = 1;
                tileset1 = this._loadTileset('img/1/tilesheet_' + tilesetId + '.png');
            } else {
                if (this.game.renderer.mobile || this.game.renderer.tablet) {
                    this.tilesetCount = 1;
                    tileset2 = this._loadTileset('img/2/tilesheet_' + tilesetId + '.png');
                } else {
                    this.tilesetCount = 2;
                    tileset2 = this._loadTileset('img/2/tilesheet_' + tilesetId + '.png');
                    tileset3 = this._loadTileset('img/3/tilesheet_' + tilesetId + '.png');
                }
            }

            this.tilesets = [tileset1, tileset2, tileset3];
        },

        _initMap: function (map) {
            this.width = map.width;
            this.height = map.height;
            this.tilesize = map.tilesize;
            this.data = map.data;
            this.blocking = map.blocking || [];
            this.plateau = map.plateau || [];
            this.musicAreas = map.musicAreas || [];
            this.pvpZones = map.pvpZones || [];
            this.fishingTiles = map.fishingTiles || {};
            this.collisions = map.collisions;
            this.high = map.high;
            this.animated = map.animated;
            this.hiddenLayers = map.hiddenLayers || {};
            this.collidingTiles = map.collidingTiles || {};
            this.doors = this._getDoors(map);
            this.triggers = this._getTriggers(map);
            this.scenes = this._getScenes(map);
            this.lights = map.lights;
            this.shadows = map.shadows;
            this.lightTiles = map.lightTiles;
            this.checkpoints = this._getCheckpoints(map);
        },

        _getDoors: function (map) {
            var doors = {},
                self = this;

            _.each(map.doors, function (door) {
                var o;

                switch (door.to) {
                    case 'u': o = Types.Orientations.UP;
                        break;
                    case 'd': o = Types.Orientations.DOWN;
                        break;
                    case 'l': o = Types.Orientations.LEFT;
                        break;
                    case 'r': o = Types.Orientations.RIGHT;
                        break;
                    default: o = Types.Orientations.DOWN;
                }

                doors[self.GridPositionToTileIndex(door.x, door.y)] = {
                    x: door.tx,
                    y: door.ty,
                    orientation: o,
                    cameraX: door.tcx,
                    cameraY: door.tcy,
                    portal: door.p === 1,
                    nft: door.tnft,
                    collection: door.tcollection,
                    map: door.tmap,
                    triggerId: door.ttid,
                    item: door.titem,
                    quest: door.tquest,
                    message: door.tmessage,
                    trigger_message: door.ttrigger_message,
                    nft_message: door.tnft_message,
                    collection_message: door.tcollection_message,
                    item_message: door.titem_message,
                    quest_message: door.tquest_message,
                    http_redirect: door.thttp_redirect,
                    level: door.tlevel,
                    weaponLevel: door.tweapon_level
                };
            });

            return doors;
        },

        _getScenes: function (map) {
            var scenes = {};
            _.each(map.scenes, function (scene) {
                var area = new Area(scene.x, scene.y, scene.w, scene.h);
                area.id = scene.id;
                area.name = scene.name;
                area.bg = scene.bg;
                area.dn_cycle = scene.dn_cycle;
                area.darkness = scene.darkness;
                scenes[scene.id] = area;
            });
            return scenes;
        },

        _getTriggers: function (map) {
            var self = this;
            var triggers = {};
            _.each(map.triggers, function (trigger) {
                var area = new Area(trigger.x, trigger.y, trigger.w, trigger.h);
                area.id = trigger.id;
                area.message = trigger.message;
                area.player_message = trigger.player_message;
                area.minigame = trigger.minigame;
                area.offset = trigger.offset; // used to control location of minigame prompt
                triggers[self.GridPositionToTileIndex(trigger.x, trigger.y)] = area;
            });
            return triggers;
        },

        _loadTileset: function (filepath) {
            var self = this;
            var tileset = new Image();

            tileset.src = filepath;

            console.log("Loading tileset: " + filepath);

            tileset.onload = function () {
                if (tileset.width % self.tilesize > 0) {
                    throw Error("Tileset size should be a multiple of " + self.tilesize);
                }
                console.log("Map tileset loaded.");

                self.tilesetCount -= 1;
                if (self.tilesetCount === 0) {
                    console.debug("All map tilesets loaded.")

                    self.tilesetsLoaded = true;
                    self._checkReady();
                }
            };

            return tileset;
        },

        ready: function (f) {
            this.ready_func = f;
        },

        tileIndexToGridPosition: function (tileNum) {
            var x = 0,
                y = 0;

            var getX = function (num, w) {
                if (num == 0) {
                    return 0;
                }
                return (num % w == 0) ? w - 1 : (num % w) - 1;
            }

            tileNum -= 1;
            x = getX(tileNum + 1, this.width);
            y = Math.floor(tileNum / this.width);

            return { x: x, y: y };
        },

        GridPositionToTileIndex: function (x, y) {
            return (y * this.width) + x + 1;
        },

        isColliding: function (x, y) {
            if (this.isOutOfBounds(x, y) || !this.grid) {
                return false;
            }

            // Loop over keys of this.hiddenLayers
            for (var i = 0; i < Object.keys(this.hiddenLayers).length; i++) {
                let layerName = Object.keys(this.hiddenLayers)[i]
                if (this.game.toggledLayers[layerName]) {

                    // if layer has collision
                    let tileIndex = this.GridPositionToTileIndex(x - 1, y);
                    let tileType = this.hiddenLayers[layerName][tileIndex];
                    if (tileType !== null) {
                        return (this.collidingTiles[tileType] === true);
                    }
                }
            }

            return (this.grid[y][x] === 1);
        },

        isPlateau: function (x, y) {
            if (this.isOutOfBounds(x, y) || !this.plateauGrid) {
                return false;
            }
            return (this.plateauGrid[y][x] === 1);
        },

        _generateCollisionGrid: function () {
            var tileIndex = 0,
                self = this;

            this.grid = [];
            for (var j, i = 0; i < this.height; i++) {
                this.grid[i] = [];
                for (j = 0; j < this.width; j++) {
                    this.grid[i][j] = 0;
                }
            }

            _.each(this.collisions, function (tileIndex) {
                var pos = self.tileIndexToGridPosition(tileIndex + 1);
                self.grid[pos.y][pos.x] = 1;
            });

            _.each(this.blocking, function (tileIndex) {
                var pos = self.tileIndexToGridPosition(tileIndex + 1);
                if (self.grid[pos.y] !== undefined) {
                    self.grid[pos.y][pos.x] = 1;
                }
            });
            console.log("Collision grid generated.");
        },

        _generatePlateauGrid: function () {
            var tileIndex = 0;

            this.plateauGrid = [];
            for (var j, i = 0; i < this.height; i++) {
                this.plateauGrid[i] = [];
                for (j = 0; j < this.width; j++) {
                    if (_.include(this.plateau, tileIndex)) {
                        this.plateauGrid[i][j] = 1;
                    } else {
                        this.plateauGrid[i][j] = 0;
                    }
                    tileIndex += 1;
                }
            }
            console.log("Plateau grid generated.");
        },

        /**
         * Returns true if the given tile id is "high", i.e. above all entities.
         * Used by the renderer to know which tiles to draw after all the entities
         * have been drawn.
         *
         * @param {Number} id The tile id in the tileset
         * @see Renderer.drawHighTiles
         */
        isHighTile: function (id) {
            let cached = this.highTileCache[id];
            if (cached !== undefined) {
                return cached;
            } else {
                let isHigh = _.indexOf(this.high, id + 1) >= 0;
                this.highTileCache[id] = isHigh;
                return isHigh;
            }
        },

        /**
         * Returns true if the tile is animated. Used by the renderer.
         * @param {Number} id The tile id in the tileset
         */
        isAnimatedTile: function (id) {
            let cached = this.animatedTileCache[id];
            if (cached !== undefined) {
                return cached;
            } else {
                let isAnimatedTile = id + 1 in this.animated;
                this.animatedTileCache[id] = isAnimatedTile;
                return isAnimatedTile;
            }
        },

        isLightTile: function (id) {
            if(!this.lightTiles) {
                return false;
            }

            return this.lightTiles[id+1];
        },

        getTileAnimationProps: function(id) {
            function parseCSV(value) {
                if (typeof value === 'string') {
                    return value.split(',').map(Number);
                }
                return value;
            }

            function parseColor(color) {
                if (color.length === 6 && !isNaN(parseInt(color, 16))) {
                    return {
                        r: parseInt(color.slice(0, 2), 16),
                        g: parseInt(color.slice(2, 4), 16),
                        b: parseInt(color.slice(4, 6), 16)
                    };
                }
                return null;
            }

            function calculateColorDifference(startColor, endColor) {
                return {
                    r: endColor.r - startColor.r,
                    g: endColor.g - startColor.g,
                    b: endColor.b - startColor.b
                };
            }

            function parseColorShift(colorShift) {
                if (!colorShift) { return null; }
                const values = colorShift.split(',').map(v => v.trim());
                if (values.length === 2) {
                    const startColor = parseColor(values[0]);
                    const endColor = parseColor(values[1]);
                    if (startColor && endColor) {
                        return calculateColorDifference(startColor, endColor);
                    }
                }
                return null;
            }

            const tileProps = this.animated[id + 1] || {};

            return {
                frames: tileProps.frames,
                length: tileProps.l,
                speed: parseCSV(tileProps.d),
                direction: tileProps.direction,
                slideAmount: parseCSV(tileProps.slideAmount),
                colorShift: parseColorShift(tileProps.colorShift),
                loopStyle: tileProps.loopStyle,
                startFrame: tileProps.startFrame,
                bouncePause: tileProps.bouncePause
            };
        },

        isDoor: function (x, y) {
            return this.doors[this.GridPositionToTileIndex(x, y)] !== undefined;
        },

        getDoorDestination: function (x, y) {
            return this.doors[this.GridPositionToTileIndex(x, y)];
        },

        _getCheckpoints: function (map) {
            var checkpoints = [];
            _.each(map.checkpoints, function (cp) {
                var area = new Area(cp.x, cp.y, cp.w, cp.h);
                area.id = cp.id;
                checkpoints.push(area);
            });
            return checkpoints;
        },

        getCurrentCheckpoint: function (entity) {
            return _.detect(this.checkpoints, function (checkpoint) {
                return checkpoint.contains(entity);
            });
        },

        getCurrentTrigger: function (entity) {
            return _.detect(this.triggers, function (trigger) {
                return trigger.contains(entity);
            });
        },

        getCurrentScene: function (entity) {
            return _.detect(this.scenes, function (scene) {
                return scene.contains(entity);
            });
        },

        /**
         * Returns true if the given position is outside the dimensions of the map.
         *
         * @param {Number} x - The x-coordinate of the position.
         * @param {Number} y - The y-coordinate of the position.
         * @returns {Boolean} Whether the position is out of bounds.
         */
        isOutOfBounds: function (x, y) {
            return isInt(x) && isInt(y) && (x < 0 || x >= this.width || y < 0 || y >= this.height);
        },

        isInsidePvpZone: function (x, y) {
            const inZone = (element) => x >= element.x &&
                x < element.x + element.w &&
                y >= element.y &&
                y < element.y + element.h;
            return this.pvpZones.some(inZone);
        },

        forEachPosition: function (callback, extra) {
            for (let x = 0; x < this.width; x += 1) {
                for (let y = 0; y < this.height; y += 1) {
                    callback(x, y);
                }
            }
        },

        getLakeName: function (x, y) {
            return this.fishingTiles[this.GridPositionToTileIndex(x, y) - 1];
        }
    });

    return Mapx;
});
