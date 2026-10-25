define(['jquery', 'area', 'mapassets'], function ($, Area, MapAssets) {

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
            if (!this.loadError && !this.isLoaded && this.tilesetsLoaded && this.mapLoaded) {
                this.isLoaded = true;
                if (this.ready_func) {
                    this.ready_func();
                }
            }
        },

        _initStreamCheck: function () {
            var self = this;
            this.stopStreamCheck();
            var check = function () {
                if (self.streamRequestPending) return;
                self.streamRequestPending = true;
                var version = self.streamRequestVersion = (self.streamRequestVersion || 0) + 1;
                axios.post('/music', {map: self.mapId}, {timeout: 10000}).then(function (response) {
                    // Old maps and out-of-order requests must not replace the current song.
                    if (self.game.map !== self || self.streamRequestVersion !== version) return;
                    var url = typeof response.data === 'string' ? response.data.trim() : '';
                    self.streamMusicURL = url && url !== 'null' ? url : null;
                    self.updateStreamMusic();
                }).catch(function (error) {
                    console.log(error);
                }).finally(function () {
                    if (self.streamRequestVersion === version) self.streamRequestPending = false;
                });
            };
            check();
            this.streamCheckId = setInterval(check, 5000);
        },

        updateStreamMusic: function () {
            if (this.game.map !== this || !this.game.audioManager) return;
            var enabled = this.game.app.settings.getStreamMusicEnabled();
            this.game.audioManager.playStreamMusic(enabled ? this.streamMusicURL : null);
        },

        stopStreamCheck: function () {
            this.streamRequestPending = false;
            this.streamRequestVersion = (this.streamRequestVersion || 0) + 1;
            if (this.streamCheckId !== undefined) {
                clearInterval(this.streamCheckId);
                this.streamCheckId = undefined;
            }
        },

        _failLoad: function (error) {
            if (this.loadError || this.isLoaded) return;
            this.loadError = error;
            console.error('[map] Failed to load ' + this.mapId, error);
            if (this.error_func) this.error_func(error);
        },

        _loadMap: function (useWorker) {
            var self = this,
                filepath = "maps/world_client_" + this.mapId + ".json";

            if (!useWorker) {
                console.log("Loading map via Ajax.");
                $.ajax({url: filepath, dataType: 'json', timeout: 20000})
                    .done(function (data) {
                        if (self.loadError) return;
                        try {
                            self._initMap(data);
                            self._generateCollisionGrid();
                            self._generatePlateauGrid();
                            self.mapLoaded = true;
                            self._checkReady();
                        } catch (error) {
                            self._failLoad(error);
                        }
                    })
                    .fail(function () {
                        self._failLoad(new Error('Map data could not be downloaded: ' + filepath));
                    });
                return;
            }

            console.log("Loading map with web worker." + this.mapId);
            var worker, timer, finished = false;
            function stopWorker() {
                finished = true;
                clearTimeout(timer);
                if (worker) {
                    worker.onmessage = worker.onerror = worker.onmessageerror = null;
                    worker.terminate();
                }
            }
            function fallback() {
                if (finished) return;
                stopWorker();
                if (!self.loadError) {
                    console.warn('[map] Worker unavailable for ' + self.mapId + '; loading map via Ajax.');
                    self._loadMap(false);
                }
            }
            try {
                worker = new Worker('js/mapworker.js');
                worker.onerror = function (event) {
                    event.preventDefault();
                    fallback();
                };
                worker.onmessageerror = fallback;
                worker.onmessage = function (event) {
                    if (finished || self.loadError) {stopWorker(); return;}
                    try {
                        var map = event.data;
                        self._initMap(map);
                        self.grid = map.grid;
                        self.plateauGrid = map.plateauGrid;
                        self.mapLoaded = true;
                    } catch (error) {
                        fallback();
                        return;
                    }
                    stopWorker();
                    self._checkReady();
                };
                timer = setTimeout(fallback, 15000);
                worker.postMessage(this.mapId);
            } catch (error) {
                fallback();
            }
        },

        _initTilesets: function () {
            var tileset1, tileset2, tileset3;

            /**
             * This allows for shared tilesheets among maps.
             */
            let tilesetId = MapAssets.tilesetId(this.mapId);

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

        preloadNearDoors: function (x, y) {
            this.assetPreloader = this.assetPreloader || new MapAssets(this.game.renderer);
            this.assetPreloader.near(this, x, y);
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
            this.stagedTiles = map.stagedTiles || {};
            this.actionTiles = map.actionTiles || {};
            this.authoringActions = map.authoringActions || {};
            this.eventBoards = map.eventBoards || [];
            this.tilesetColumns = map.tilesetColumns;
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
                    weaponLevel: door.tweapon_level,
                    timeRange: door.ttime_range,
                    time_message: door.ttime_message
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
                area.message = scene.message;
                area.dn_cycle = scene.dn_cycle;
                area.darkness = scene.darkness;
                area.ambience = scene.ambience;
                area.authoringAtmosphere = scene.authoringAtmosphere;
                area.authoringMusic = scene.authoringMusic;
                area.fx = scene.fx;
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

            console.log("Loading tileset: " + filepath);
            var timer = setTimeout(function () {
                self._failLoad(new Error('Tileset download timed out: ' + filepath));
            }, 20000);
            tileset.onerror = function () {
                clearTimeout(timer);
                self._failLoad(new Error('Tileset could not be downloaded: ' + filepath));
            };
            tileset.onload = function () {
                clearTimeout(timer);
                if (self.loadError) return;
                if (tileset.width % self.tilesize > 0) {
                    self._failLoad(new Error("Tileset size should be a multiple of " + self.tilesize));
                    return;
                }
                console.log("Map tileset loaded.");

                self.tilesetCount -= 1;
                if (self.tilesetCount === 0) {
                    console.debug("All map tilesets loaded.")

                    self.tilesetsLoaded = true;
                    self._checkReady();
                }
            };

            tileset.src = filepath;
            return tileset;
        },

        ready: function (f, onError) {
            this.ready_func = f;
            this.error_func = onError;
            if (this.loadError) {
                if (onError) onError(this.loadError);
            } else if (this.isLoaded) {
                f();
            }
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
            var self = this;

            this.plateauGrid = [];
            for (var j, i = 0; i < this.height; i++) {
                this.plateauGrid[i] = [];
                for (j = 0; j < this.width; j++) {
                    this.plateauGrid[i][j] = 0;
                }
            }

            // Mark each plateau once instead of searching the full list for every tile.
            _.each(this.plateau, function (tileIndex) {
                if (typeof tileIndex === 'number' && tileIndex >= 0 &&
                    tileIndex < self.width * self.height && tileIndex % 1 === 0) {
                    self.plateauGrid[Math.floor(tileIndex / self.width)][tileIndex % self.width] = 1;
                }
            });
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

        findNearestActionTileAround: function (x, y, r) {
            let nearestAction = null;
            let nearestDistance = r + 1;

            for (let i = x - r, max_i = x + r; i <= max_i; i += 1) {
                for (let j = y - r, max_j = y + r; j <= max_j; j += 1) {
                    if (!this.isOutOfBounds(i, j)) {
                        let self = this;
                        const placed = this.authoringActions?.[i+'.'+j];
                        if (placed) {
                            const distance=Math.abs(i-x)+Math.abs(j-y);
                            if(distance<nearestDistance){nearestAction={...placed,id:'tile-action-'+i+'-'+j,name:placed.action,gridX:i,gridY:j,x:i*this.tilesize,y:j*this.tilesize};nearestDistance=distance;}
                            continue;
                        }
                        _.each(this.data[(j * this.width) + i], function (tileId) {
                            const tile = {
                                id: tileId,
                                x: i * self.tilesize,
                                gridX: i,
                                y: j * self.tilesize,
                                gridY: j
                            };

                            // Calculate the distance from the center point
                            const distance = Math.abs(i - x) + Math.abs(j - y);

                            // Is Action tile?
                            const isActionTile = tile.id in self.actionTiles;

                            if (distance < nearestDistance && isActionTile) {
                                Object.assign(tile, self.actionTiles[tile.id]);
                                tile.name = self.actionTiles[tile.id].action;
                                nearestAction = tile
                                nearestDistance = distance;
                            }
                        });
                    }
                }
            }

            return nearestAction;
        },

        getLakeName: function (x, y) {
            return this.fishingTiles[this.GridPositionToTileIndex(x, y) - 1];
        }
    });

    return Mapx;
});
