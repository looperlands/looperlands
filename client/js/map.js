
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
            let url = 'https://loopworms.io/DEV/LooperLands/music.php?mapID=' + this.mapId;
            let song = "";
            let self = this;
            let audio;
            setInterval(function () {
                axios.get(url).then(function (response) {
                    if (response.data === undefined || response.data.length === 0) {
                        return;
                    }
                    let mp3URL = response.data[0]['mp3URL'];

                    if (mp3URL === 'null') {
                        if (audio !== undefined) {
                            audio.pause();
                            delete audio;
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
                var worker = new Worker('js/mapworker.js');
                worker.postMessage(this.mapId);

                worker.onmessage = function (event) {
                    var map = event.data;
                    self._initMap(map);
                    self.grid = map.grid;
                    self.plateauGrid = map.plateauGrid;
                    self.mapLoaded = true;
                    self._checkReady();
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

            this.doors = this._getDoors(map);
            this.triggers = this._getTriggers(map);
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
                    quest_message: door.tquest_message
                };
            });

            return doors;
        },

        _getTriggers: function (map) {
            var self = this;
            var triggers = {};
            _.each(map.triggers, function (trigger) {
                var area = new Area(trigger.x, trigger.y, trigger.w, trigger.h);
                area.id = trigger.id;
                area.message = trigger.message;
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
         * Returns true if the given position is located within the dimensions of the map.
         *
         * @returns {Boolean} Whether the position is out of bounds.
         */
        isOutOfBounds: function (x, y) {
            return isInt(x) && isInt(y) && (x < 0 || x >= this.width || y < 0 || y >= this.height);
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

        /**
         * 
         */
        getTileAnimationLength: function (id) {
            return this.animated[id + 1].l;
        },

        /**
         * 
         */
        getTileAnimationDelay: function (id) {
            var animProperties = this.animated[id + 1];
            if (animProperties.d) {
                return animProperties.d;
            } else {
                return 100;
            }
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

        getLakeName: function(x, y) {
            return this.fishingTiles[this.GridPositionToTileIndex(x, y) - 1];
        }
    });

    return Mapx;
});
