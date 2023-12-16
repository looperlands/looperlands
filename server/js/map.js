
var fs = require('fs'),
    _ = require('underscore'),
    Utils = require('./utils'),
    Checkpoint = require('./checkpoint');

module.exports = class Mapx {
    constructor(filepath) {
    	var self = this;
    
    	this.isLoaded = false;
    
    	if( fs.lstatSync(filepath).isFile() ) {
     
            fs.readFile(filepath, function(err, file) {
                var json = JSON.parse(file.toString());
            
                self.initMap(json);
            });
        }
        else
        {
            console.error(filepath + " doesn't exist.");
        }
    }

    initMap(map) {
        this.width = map.width;
        this.height = map.height;
        this.collisions = map.collisions;
        this.mobAreas = map.roamingAreas;
        this.chestAreas = map.chestAreas;
        this.staticChests = map.staticChests;
        this.staticEntities = map.staticEntities;
        this.isLoaded = true;
        this.hiddenLayers = map.hiddenLayers || {};
        this.collidingTiles = map.collidingTiles || {};
        this.toggledLayers = [];

        // zone groups
    	this.zoneWidth = 28;
    	this.zoneHeight = 12;
    	this.groupWidth = Math.floor(this.width / this.zoneWidth);
        this.groupHeight = Math.floor(this.height / this.zoneHeight);
    
        this.initConnectedGroups(map.doors);
        this.initCheckpoints(map.checkpoints);
        this.initDoors(map.doors);

        if(map.triggers) {
            this.triggers = {}
            this.initTriggers(map.triggers)
        }
    
        if(this.ready_func) {
            this.ready_func();
        }
    }

    ready(f) {
    	this.ready_func = f;
    }

    tileIndexToGridPosition(tileNum) {
        var x = 0,
            y = 0;
        
        var getX = function(num, w) {
            if(num == 0) {
                return 0;
            }
            return (num % w == 0) ? w - 1 : (num % w) - 1;
        }
    
        tileNum -= 1;
        x = getX(tileNum + 1, this.width);
        y = Math.floor(tileNum / this.width);
    
        return { x: x, y: y };
    }

    GridPositionToTileIndex(x, y) {
        return (y * this.width) + x + 1;
    }

    generateCollisionGrid() {
        this.grid = [];
    
        if(this.isLoaded) {
            var tileIndex = 0;
            for(var	j, i = 0; i < this.height; i++) {
                this.grid[i] = [];
                for(j = 0; j < this.width; j++) {
                    if(_.include(this.collisions, tileIndex)) {
                        this.grid[i][j] = 1;
                    } else {
                        this.grid[i][j] = 0;
                    }
                    tileIndex += 1;
                }
            }
            //console.log("Collision grid generated.");
        }
    }

    isOutOfBounds(x, y) {
        return x <= 0 || x >= this.width || y <= 0 || y >= this.height;
    }

    isColliding(x, y) {
        if(this.isOutOfBounds(x, y)) {
            return false;
        }

        // Loop over keys of this.hiddenLayers
        for(var	i = 0; i < Object.keys(this.hiddenLayers).length; i++) {
            let layerName = Object.keys(this.hiddenLayers)[i]
            if(this.toggledLayers[layerName]) {

                // if layer has collision
                let tileIndex = this.GridPositionToTileIndex(x - 1, y);
                let tileType = this.hiddenLayers[layerName][tileIndex];
                if(tileType !== null) {
                    return (this.collidingTiles[tileType] === true);
                }
            }
        }

        let collides;
        try {
            collides = this.grid[y][x] === 1;
        } catch (e) {
            x = Math.floor(x);
            y = Math.floor(y);
            collides = this.grid[y][x] === 1;
        }
        return collides;
    }
    
    GroupIdToGroupPosition(id) {
        var posArray = id.split('-');
        
        return pos(parseInt(posArray[0]), parseInt(posArray[1]));
    }
    
    forEachGroup(callback) {
        var width = this.groupWidth,
            height = this.groupHeight;
        
        for(var x = 0; x < width; x += 1) {
            for(var y = 0; y < height; y += 1) {
                callback(x+'-'+y);
            }
        }
    }
    
    getGroupIdFromPosition(x, y) {
        var w = this.zoneWidth,
            h = this.zoneHeight,
            gx = Math.floor((x - 1) / w),
            gy = Math.floor((y - 1) / h);

        return gx+'-'+gy;
    }
    
    getAdjacentGroupPositions(id) {
        var self = this,
            position = this.GroupIdToGroupPosition(id),
            x = position.x,
            y = position.y,
            // surrounding groups
            list = [pos(x-1, y-1), pos(x, y-1), pos(x+1, y-1),
                    pos(x-1, y),   pos(x, y),   pos(x+1, y),
                    pos(x-1, y+1), pos(x, y+1), pos(x+1, y+1)];
        
        // groups connected via doors
        _.each(this.connectedGroups[id], function(position) {
            // don't add a connected group if it's already part of the surrounding ones.
            if(!_.any(list, function(groupPos) { return equalPositions(groupPos, position); })) {
                list.push(position);
            }
        });
        
        return _.reject(list, function(pos) { 
            return pos.x < 0 || pos.y < 0 || pos.x >= self.groupWidth || pos.y >= self.groupHeight;
        });
    }
    
    forEachAdjacentGroup(groupId, callback) {
        if(groupId) {
            _.each(this.getAdjacentGroupPositions(groupId), function(pos) {
                callback(pos.x+'-'+pos.y);
            });
        }
    }
    
    initConnectedGroups(doors) {
        var self = this;

        this.connectedGroups = {};
        _.each(doors, function(door) {
            var groupId = self.getGroupIdFromPosition(door.x, door.y),
                connectedGroupId = self.getGroupIdFromPosition(door.tx, door.ty),
                connectedPosition = self.GroupIdToGroupPosition(connectedGroupId);
            
            if(groupId in self.connectedGroups) {
                self.connectedGroups[groupId].push(connectedPosition);
            } else {
                self.connectedGroups[groupId] = [connectedPosition];
            }
        });
    }

    initDoors(doors) {
        let self = this;
        this.tokenizedDoors = {};
        this.triggerDoors = {};

        doors.forEach(function(door) {
            //Tokenized doors
            if (door.tnft !== undefined) {
                if (self.tokenizedDoors[door.tnft] === undefined){
                    self.tokenizedDoors[door.tnft] = []; // can only push to a defined array
                }
                let tDoor = {x: door.x, y: door.y}
                self.tokenizedDoors[door.tnft].push(tDoor);
            }
            // Trigger doors
            if (door.ttid !== undefined) {
                let triggerId = door.ttid;
                if(triggerId.startsWith("!")) {
                    triggerId = triggerId.substring(1);
                }

                if (self.triggerDoors[triggerId] === undefined){
                    self.triggerDoors[triggerId] = []; // can only push to a defined array
                }
                let tDoor = {x: door.x, y: door.y}

                self.triggerDoors[triggerId].push(tDoor);
            }
        });
    }

    initCheckpoints(cpList) {
        var self = this;
        
        this.checkpoints = {};
        this.startingAreas = [];
        
        _.each(cpList, function(cp) {
            var checkpoint = new Checkpoint(cp.id, cp.x, cp.y, cp.w, cp.h);
            self.checkpoints[checkpoint.id] = checkpoint; 
            if(cp.s === 1) {
                self.startingAreas.push(checkpoint);
            }
        });
    }

    initTriggers(triggers) {
        let self = this;

        triggers.forEach(function(trigger) {
            self.triggers[trigger.id] = {
                id: trigger.id,
                x: trigger.x,
                y: trigger.y,
                w: trigger.w,
                h: trigger.h,
                trigger: trigger.trigger,
                delay: trigger.delay
            };
        });
    }

    getCheckpoint(identifier) {
        let checkpoint = this.checkpoints[identifier];
        if (checkpoint === undefined) {
            return undefined;
        }
        checkpoint.x = Math.round(checkpoint.x);
        checkpoint.y = Math.round(checkpoint.y);
        checkpoint.width = Math.round(checkpoint.width);
        checkpoint.height = Math.round(checkpoint.height);
        return this.checkpoints[identifier];
    }
    
    getRandomStartingPosition() {
        var nbAreas = _.size(this.startingAreas);
            i = Utils.randomInt(0, nbAreas-1);
            area = this.startingAreas[i];
        
        return area.getRandomPosition();
    }

    getRequiredNFT(x, y) {
        return Object.keys(this.tokenizedDoors).find(key => 
            this.tokenizedDoors[key].find((element) => 
            element.x === x && element.y === y));
    }

    getDoorTrigger(x, y) {
        return Object.keys(this.triggerDoors).find(key => 
            this.triggerDoors[key].find((element) => 
            element.x === x && element.y === y));
    }

    findClosestCheckpoint(x, y) {
        let closestCheckpoint = null;
        let closestDistance = Infinity;

        for (let id in this.checkpoints) {
            let checkpoint = this.checkpoints[id];
            let distance = Utils.distanceTo(x, y, checkpoint.x, checkpoint.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestCheckpoint = checkpoint;
            }
        }
        return closestCheckpoint;
    }
}

var pos = function(x, y) {
    return { x: x, y: y };
};

var equalPositions = function(pos1, pos2) {
    return pos1.x === pos2.x && pos2.y === pos2.y;
};
