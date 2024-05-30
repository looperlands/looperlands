const Formulas = require("./formulas");
var cls = require("./lib/class"),
    _ = require("underscore"),
    Log = require('log'),
    Entity = require('./entity'),
    Character = require('./character'),
    Mob = require('./mob'),
    Mapx = require('./map'),
    Npc = require('./npc'),
    Player = require('./player'),
    Item = require('./item'),
    MobArea = require('./mobarea'),
    ChestArea = require('./chestarea'),
    Chest = require('./chest'),
    Messages = require('./message'),
    Properties = require("./properties"),
    Utils = require("./utils"),
    Types = require("../../shared/js/gametypes"),
    dao = require("./dao.js"),
    discord = require("./discord.js"),
    Fieldeffect = require('./fieldeffect');
const quests = require("./quests/quests");

const WorldEventBroker = require("./flows/worldeventbroker.js");

    Lakes = require('./lakes');

// ======= GAME SERVER ========

module.exports = World = cls.Class.extend({
    init: function (id, maxPlayers, websocketServer) {
        var self = this;

        this.id = id;
        this.maxPlayers = maxPlayers;
        this.server = websocketServer;
        this.ups = 50;

        this.map = null;

        this.entities = {};
        this.players = {};
        this.consumeCooldowns = {};
        this.mobs = {};
        this.attackers = {};
        this.items = {};
        this.equipping = {};
        this.hurt = {};
        this.npcs = {};
        this.mobAreas = [];
        this.chestAreas = [];
        this.triggerAreas = {};
        this.groups = {};
        this.doorTriggers = {};
        this.fieldEffects = {};

        this.outgoingQueues = {};

        this.itemCount = 0;
        this.playerCount = 0;

        this.zoneGroupsReady = false;

        this.worldEventBroker = new WorldEventBroker.WorldEventBroker(id);

        this.onPlayerConnect(function (player) {
            player.onRequestPosition(function () {
                if (player.lastCheckpoint) {
                    return player.lastCheckpoint.getRandomPosition();
                } else {
                    return self.map.getRandomStartingPosition();
                }
            });
        });

        this.onPlayerEnter(function (player) {
            //console.log(player.name + " has joined "+ self.id, "Player ID " + player.id);

            if (!player.hasEnteredGame && !player.isBot()) {
                self.incrementPlayerCount();
            }

            // Number of players in this world
            // and in the overall server world
            //self.pushToPlayer(player, new Messages.Population(self.playerCount, self.server.connectionsCount()));
            self.updatePopulation();

            self.pushRelevantEntityListTo(player);
            self.pushToggledLayersTo(player)

            var move_callback = function (x, y) {
                //console.debug(player.name + " is moving to (" + x + ", " + y + ").");

                player.forEachAttacker(function (mob) {
                    var target = self.getEntityById(mob.target);
                    if (target) {
                        var pos = self.findPositionNextTo(mob, target);
                        if (pos) {
                            if (mob.distanceToSpawningPoint(pos.x, pos.y) > 25) {
                                mob.clearTarget();
                                mob.forgetEveryone();
                                player.removeAttacker(mob);
                            } else {
                                self.moveEntity(mob, pos.x, pos.y);
                            }
                        }
                    }
                });
            };

            player.onMove(move_callback);
            player.onLootMove(move_callback);

            player.onZone(function () {
                var hasChangedGroups = self.handleEntityGroupMembership(player);

                if (hasChangedGroups) {
                    self.pushToPreviousGroups(player, new Messages.Destroy(player));
                    self.pushRelevantEntityListTo(player);
                }
            });

            player.onBroadcast(function (message, ignoreSelf) {
                self.pushToAdjacentGroups(player.group, message, ignoreSelf ? player.id : null);
            });

            player.onBroadcastToZone(function(message, ignoreSelf) {
                self.pushToGroup(player.group, message, ignoreSelf ? player.id : null);
            });

            player.onExit(function () {
                //console.log(player.name + " has left the game.");
                self.removePlayer(player);
                if (!player.isBot()) {
                    self.decrementPlayerCount();
                }
                if (self.removed_callback) {
                    self.removed_callback();
                }
            });

            player.onCheckCooldown(function (group) {
                if (self.consumeCooldowns[player.nftId] !== undefined && self.consumeCooldowns[player.nftId][group] !== undefined) {
                    return new Date().getTime() < self.consumeCooldowns[player.nftId][group];
                }
                return false; //not on cooldown
            });

            player.onApplyCooldown(function (group, duration) {
                if (group && (duration > 0)) {
                    if (!self.consumeCooldowns[player.nftId]) {
                        self.consumeCooldowns[player.nftId] = {};
                    }
                    self.consumeCooldowns[player.nftId][group] = new Date().getTime() + duration;
                }
            });

            player.onReleaseMob(function (kind) {
                let mob = new Mob(self.nextMobId(), kind, player.x, player.y);
                mob.handleRespawn = function () {
                    return;
                };// dont respawn
                self.addMob(mob);

                let pos = self.findPositionNextTo(mob, player);
                if (pos) {
                    self.moveEntity(mob, pos.x, pos.y);
                }
            });

            if (self.added_callback) {
                self.added_callback();
            }
        });

        // Called when an entity is attacked by another entity
        this.onEntityAttack(function (attacker) {
            var target = self.getEntityById(attacker.target);
            if (target && attacker.type === "mob") {
                var pos = self.findPositionNextTo(attacker, target);
                if (pos) {
                    self.moveEntity(attacker, pos.x, pos.y);
                }
            }
        });


        this.onRegenTick(function() {
            self.forEachCharacter(function(character) {
                if(!character.hasFullHealth()) {
                    let regenHealthBy = character.maxHitPoints / 25
                    if (character.type === 'player') {
                        regenHealthBy *= character.playerClassModifiers.hpRegen;
                    }
                    character.regenHealthBy(Math.floor(regenHealthBy));

                    if(character.type === 'player') {
                        self.pushToPlayer(character, character.regen());
                    }
                }
            });
        });
    },


    run: function(mapFilePath) {
        var self = this;

        this.map = new Mapx(mapFilePath);

        this.map.ready(function () {
            self.initZoneGroups();
            self.initDoorTriggers();

            self.map.generateCollisionGrid();

            // Populate all mob "roaming" areas
            _.each(self.map.mobAreas, function (a) {
                var area = new MobArea(a.id, a.nb, a.type, a.x, a.y, a.width, a.height, self);
                area.spawnMobs();
                area.onEmpty(self.handleEmptyMobArea.bind(self, area));

                self.mobAreas.push(area);
            });

            // Create all chest areas
            _.each(self.map.chestAreas, function (a) {
                var area = new ChestArea(a.id, a.x, a.y, a.w, a.h, a.tx, a.ty, a.i, self);
                if(a.c) {
                    area.setChances(a.c);
                }
                self.chestAreas.push(area);
                area.onEmpty(self.handleEmptyChestArea.bind(self, area));
            });

            // Create all trigger areas
            _.each(self.map.triggers, function (a) {
                var area = new Area(a.id, a.x, a.y, a.w, a.h, self);
                area.trigger = a.trigger;
                area.message = a.message;
                area.minigame = a.minigame;
                area.delay = a.delay;
                self.triggerAreas[a.id] = area;
            });

            // Spawn static chests
            _.each(self.map.staticChests, function (chest) {
                var c = self.createChest(chest.x, chest.y, chest.i);
                if(chest.c) {
                    c.setChances(chest.c);
                }
                if(chest.d) {
                    c.setDelay(chest.d);
                }
                self.addStaticItem(c);
            });

            // Spawn static entities
            self.spawnStaticEntities();

            // Set maximum number of entities contained in each chest area
            _.each(self.chestAreas, function (area) {
                area.setNumberOfEntities(area.entities.length);
            });
        });

        var regenCount = this.ups * 2;
        var updateCount = 0;

        setInterval(function() {
            if (self.getPlayerCount() < 1) {
                return;
            }
            self.processGroups();
            self.processQueues();

            if (updateCount < regenCount) {
                updateCount += 1;
            } else {
                if (self.regen_callback) {
                    self.regen_callback();
                }
                updateCount = 0;
            }
        }, 1000 / this.ups);

        console.log(""+this.id+" created (capacity: "+this.maxPlayers+" players).");
    },


    onInit: function(callback) {
        this.init_callback = callback;
    },

    setUpdatesPerSecond: function (ups) {
        this.ups = ups;
    },

    onPlayerConnect: function (callback) {
        this.connect_callback = callback;
    },

    onPlayerEnter: function(callback) {
        this.enter_callback = callback;
    },

    onPlayerAdded: function(callback) {
        this.added_callback = callback;
    },

    onPlayerRemoved: function(callback) {
        this.removed_callback = callback;
    },

    onRegenTick: function(callback) {
        this.regen_callback = callback;
    },

    pushRelevantEntityListTo: function(player) {
        var entities;

        if(player && (player.group in this.groups)) {
            entities = _.keys(this.groups[player.group].entities);
            entities = _.reject(entities, function (id) {
                return id == player.id;
            });
            entities = _.map(entities, function (id) {
                return parseInt(id);
            });
            entities = entities.filter(id=> id != null);
            if (entities) {
                this.pushToPlayer(player, new Messages.List(entities));
            }
        }
    },


    pushSpawnsToPlayer: function(player, ids) {
        var self = this;

        _.each(ids, function(id) {
            var entity = self.getEntityById(id);
            if (entity) {
                self.pushToPlayer(player, new Messages.Spawn(entity));
            }
        });

        //console.debug("Pushed "+_.size(ids)+" new spawns to "+player.id);
    },

    pushToggledLayersTo: function(player) {
        var self = this;
        _.forEach(Object.keys(this.map.toggledLayers), (layer) => {
            let visible = self.map.toggledLayers[layer];
            self.pushToPlayer(player, new Messages.Layer(layer, visible ));
        });
    },

    pushToPlayer: function (player, message) {
        let playerIdInQueue = player.id in this.outgoingQueues;
        if (player && playerIdInQueue) {
            if (message !== undefined) {
                this.outgoingQueues[player.id].push(message.serialize());
            }
        } else {
            console.error("pushToPlayer: player was undefined", player, playerIdInQueue, message);
        }
    },

    pushToGroup: function (groupId, message, ignoredPlayer) {
        let group = this.groups[groupId];

        if (group) {
            let removeList = [];

            const groupPlayers = group.players;
            const groupPlayersLength = groupPlayers.length;
            for (let i = 0; i < groupPlayersLength; i++) {
                let playerId = groupPlayers[i];
                if (playerId != ignoredPlayer) {
                    let entity = this.getEntityById(playerId);
                    if (entity === undefined) {
                        removeList.push(playerId);
                    } else {
                        this.pushToPlayer(entity, message);
                    }
                }
            }
            const removeListLength = removeList.length;
            for (let i = 0; i < removeListLength; i++) {
                let playerId = removeList[i];
                group.players = _.reject(group.players, function (id) {
                    return id === playerId;
                });
            }
        } else {
            console.error("groupId: " + groupId + " is not a valid group");
        }
    },

    pushToAdjacentGroups: function (groupId, message, ignoredPlayer) {
        var self = this;
        self.map.forEachAdjacentGroup(groupId, function (id) {
            self.pushToGroup(id, message, ignoredPlayer);
        });
    },

    pushToPreviousGroups: function (player, message) {
        var self = this;

        // Push this message to all groups which are not going to be updated anymore,
        // since the player left them.
        _.each(player.recentlyLeftGroups, function (id) {
            self.pushToGroup(id, message);
        });
        player.recentlyLeftGroups = [];
    },

    pushToAllGroups: function (message, ignoredPlayer) {
        let self = this;
        this.map.forEachGroup(function (id) {
            self.pushToGroup(id, message, ignoredPlayer);
        });
    },

    pushBroadcast: function (message, ignoredPlayer) {
        for (var id in this.outgoingQueues) {
            if (id != ignoredPlayer) {
                this.outgoingQueues[id].push(message.serialize());
            }
        }
    },

    processQueues: function () {
        var self = this,
            connection;

        for (var id in this.outgoingQueues) {
            if (this.outgoingQueues[id].length > 0) {
                connection = this.server.getConnection(id);
                if (connection !== undefined) {
                    connection.send(this.outgoingQueues[id]);
                }
                this.outgoingQueues[id] = [];
            }
        }
    },

    addEntity: function(entity) {
        this.entities[entity.id] = entity;
        this.handleEntityGroupMembership(entity);
    },

    removeEntity: function (entity) {
        if (entity.id in this.entities) {
            delete this.entities[entity.id];
        }
        if (entity.id in this.mobs) {
            delete this.mobs[entity.id];
        }
        if (entity.id in this.items) {
            delete this.items[entity.id];
        }

        if (entity.type === "mob") {
            this.clearMobAggroLink(entity);
            this.clearMobHateLinks(entity);
            this.despawnAllAdds(entity);
        }

        entity.destroy();
        this.removeFromGroups(entity);
        //console.debug("Removed "+ Types.getKindAsString(entity.kind) +" : "+ entity.id);
    },

    addPlayer: function (player) {
        this.addEntity(player);

        this.players[player.id] = player;
        this.outgoingQueues[player.id] = [];

        //console.log("Added player : " + player.id);
    },

    removePlayer: function (player) {
        this.server.cache.del(player.sessionId);
        player.broadcast(player.despawn());
        this.removeEntity(player);
        delete this.players[player.id];
        delete this.outgoingQueues[player.id];
        player.playerEventBroker.destroy();
    },

    addMob: function (mob) {
        this.addEntity(mob);
        this.mobs[mob.id] = mob;
    },

    addNpc: function (kind, x, y) {
        var npc = new Npc('8' + x + '' + y, kind, x, y);
        this.addEntity(npc);
        this.npcs[npc.id] = npc;

        return npc;
    },

    getClosestNpcOfKind: function(kind, x, y) {
        var minDist = 99999,
            closest = null,
            npc,
            dist;

        for(var id in this.npcs) {
            if(this.npcs.hasOwnProperty(id)) {
                npc = this.npcs[id];
                if(parseInt(npc.kind) === parseInt(kind)) {
                    dist = Utils.distanceTo(x, y, npc.x, npc.y);
                    if(dist < minDist) {
                        closest = npc;
                        minDist = dist;
                    }
                }
            }
        }
        return closest;
    },

    getClosestMobOfKind: function(kind, x, y) {
        var minDist = 99999,
            closest = null,
            mob,
            dist;

        for(var id in this.mobs) {
            if(this.mobs.hasOwnProperty(id)) {
                mob = this.mobs[id];
                if(mob.kind === kind && !mob.isDead) {
                    dist = Utils.distanceTo(x, y, mob.x, mob.y);
                    if(dist < minDist) {
                        closest = mob;
                        minDist = dist;
                    }
                }
            }
        }
        return closest;
    },

    addItem: function(item) {
        this.addEntity(item);
        this.items[item.id] = item;

        return item;
    },

    addFieldEffect: function (kind, x, y) {
        const self = this;

        var fieldEffect = new Fieldeffect('4' + x + '' + y + '' + kind, kind, x, y);
        this.addEntity(fieldEffect);
        this.fieldEffects[fieldEffect.id] = fieldEffect;

        fieldEffect.initContinousDamageCallback(self.doAoe.bind(self));
        fieldEffect.initSingleHitCallback(self.doAoe.bind(self), self.despawn.bind(self));

        return fieldEffect;
    },

    createItem: function (kind, x, y) {
        var id = '9' + this.itemCount++,
            item = null;

        if(kind === Types.Entities.CHEST) {
            item = new Chest(id, x, y);
        } else {
            item = new Item(id, kind, x, y);
        }
        return item;
    },

    createChest: function (x, y, items, chances) {
        var chest = this.createItem(Types.Entities.CHEST, x, y);
        chest.setItems(items);
        if(chances) {
            chest.setChances(chances)
        }
        return chest;
    },

    addStaticItem: function (item) {
        item.isStatic = true;
        item.onRespawn(this.addStaticItem.bind(this, item));

        return this.addItem(item);
    },

    addItemFromChest: function (kind, x, y) {
        var item = this.createItem(kind, x, y);
        item.isFromChest = true;

        return this.addItem(item);
    },

    /**
     * The mob will no longer be registered as an attacker of its current target.
     */
    clearMobAggroLink: function (mob) {
        var player = null;
        if (mob.target) {
            player = this.getEntityById(mob.target);
            if (player) {
                player.removeAttacker(mob);
            }
        }
    },

    clearMobHateLinks: function (mob) {
        var self = this;
        if (mob) {
            _.each(mob.hatelist, function (obj) {
                var player = self.getEntityById(obj.id);
                if (player) {
                    player.removeHater(mob);
                }
            });
        }
    },

    forEachEntity: function (callback) {
        for (var id in this.entities) {
            callback(this.entities[id]);
        }
    },

    forEachPlayer: function (callback) {
        for (var id in this.players) {
            callback(this.players[id]);
        }
    },

    forEachMob: function (callback) {
        for (var id in this.mobs) {
            callback(this.mobs[id]);
        }
    },

    forEachCharacter: function (callback) {
        this.forEachPlayer(callback);
        this.forEachMob(callback);
    },

    handleMobHate: function (mobId, playerId, hatePoints) {
        var mob = this.getEntityById(mobId),
            player = this.getEntityById(playerId);

        if (player && mob) {
            mob.increaseHateFor(playerId, hatePoints);
            player.addHater(mob);

            if (mob.hitPoints > 0) { // only choose a target if still alive
                this.chooseMobTarget(mob);
            }
        }
    },

    chooseMobTarget: function (mob, hateRank) {
        var player = this.getEntityById(mob.getHatedPlayerId(hateRank));

        // If the mob is not already attacking the player, create an attack link between them.
        if (player) {
            this.clearMobAggroLink(mob);

            player.addAttacker(mob);
            mob.setTarget(player);

            this.broadcastAttacker(mob);
            //console.debug(mob.id + " is now attacking " + player.id);
        }
    },

    onEntityAttack: function (callback) {
        this.attack_callback = callback;
    },

    getEntityById: function (id) {
        return this.entities[id];
    },

    getPlayerById: function (id) {
        if (id in this.players) {
            return this.players[id];
        } else {
            //console.error("Unknown player: " + id);
        }
    },

    broadcastAttacker: function (character) {
        if (character) {
            this.pushToAdjacentGroups(character.group, character.attack(), character.id);
        }
        if (this.attack_callback) {
            this.attack_callback(character);
        }
    },

    handleHurtEntity: function (entity, attacker, damage) {
        var self = this;

        if (entity.type === 'player') {
            // A player is only aware of his own hitpoints
            this.pushToPlayer(entity, entity.health());
        }

        if (attacker.type === 'player') {
            this.pushToPlayer(attacker, new Messages.Damage(entity, damage));
        }

        // If the entity is about to die
        if (entity.hitPoints <= 0) {
            if (entity.type === "mob") {
                var mob = entity,
                    item = this.getDroppedItem(mob);

                let kind = Types.getKindAsString(mob.kind);
                this.handleRedPacket(mob, kind);
                this.pushToAdjacentGroups(mob.group, mob.despawn());
                this.pushToGroup(mob.group, mob.despawn());
                //On death AoE handling
                let aoeProps = Properties[kind].aoe;
                if (aoeProps !== undefined && aoeProps.onDeath) {
                    this.doAoe(mob);
                }

                // Despawn must be enqueued before the item drop
                if (item) {
                    this.pushToAdjacentGroups(mob.group, mob.drop(item));
                    this.handleItemDespawn(item);
                }

                this.distributeExp(mob);
                // Distribute exp first, so the multiplier doesnt apply to this kill (that would be OP)
                this.handleExpMultiplierOnDeath(mob);
                if (attacker.type === 'player') {
                    mob.dmgTakenArray.forEach(function (arrElem) {
                        let accomplice = self.getEntityById(arrElem.id);
                        if (accomplice !== undefined && accomplice.type === 'player' && !accomplice.isBot()) {
                            accomplice.playerEventBroker.killMobEvent(mob);
                        }
                    })
                }

                if(mob.aoeTimer) { clearInterval(mob.aoeTimer);}

                if (mob.kind === Types.Entities.TENTACLE || mob.kind === Types.Entities.TENTACLE2) {
                    self.handleSeaCreatureDie(mob, attacker);
                }
            }

            if (entity.type === "player") {
                this.handlePlayerVanish(entity);
                this.pushToAdjacentGroups(entity.group, entity.despawn());
                entity.playerEventBroker.deathEvent(entity, {x: entity.x , y: entity.y});
            }

            this.removeEntity(entity);
        }
    },

    handleRedPacket: function (mob, kind) {
        if (Properties[kind].redpacket) {
            let url = "https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=" + kind;
            let msg = `<a href='${url}' target="blank"><h2>Click For Reward!</h2></a>`;
            this.pushToGroup(mob.group, new Messages.Chat(mob, msg), false);
        }
    },

    despawn: function (entity) {
        this.pushToAdjacentGroups(entity.group, entity.despawn());

        if (entity.id in this.entities) {
            this.removeEntity(entity);
        }
    },

    spawnStaticEntities: function () {
        var self = this,
            count = 0;

        _.each(this.map.staticEntities, function (kindName, tid) {
            var kind = Types.getKindFromString(kindName),
                pos = self.map.tileIndexToGridPosition(tid);

            if (Types.isNpc(kind)) {
                self.addNpc(kind, pos.x + 1, pos.y);
            }
            if (Types.isFieldEffect(kind)) {
                self.addFieldEffect(kind, pos.x + 1, pos.y);
            }
            if (Types.isMob(kind)) {
                var mob = new Mob('7' + kind + count++, kind, pos.x + 1, pos.y);
                mob.onRespawn(function () {
                    mob.isDead = false;
                    mob.generateLevel();
                    mob.recalculateStats();
                    self.addMob(mob);
                    if (mob.area && mob.area instanceof ChestArea) {
                        mob.area.addToArea(mob);
                    }

                    if (kind === Types.Entities.SEACREATURE) {
                        self.handleSeaCreatureSpawn(mob);
                    }
                });
                mob.onMove(self.onMobMoveCallback.bind(self));
                mob.onExitCombat(self.onMobExitCombatCallback.bind(self));
                self.addMob(mob);
                self.tryAddingMobToChestArea(mob);

                if (kind === Types.Entities.SEACREATURE) {
                    self.handleSeaCreatureSpawn(mob);
                }
            }
            if (Types.isItem(kind)) {
                self.addStaticItem(self.createItem(kind, pos.x + 1, pos.y));
            }
        });
    },

    isValidPosition: function (x, y) {
        if (this.map && _.isNumber(x) && _.isNumber(y) && !this.map.isOutOfBounds(x, y) && !this.map.isColliding(x, y)) {
            return true;
        }
        return false;
    },

    handlePlayerVanish: function (player) {
        var self = this,
            previousAttackers = [];

        // When a player dies or teleports, all of his attackers go and attack their second most hated player.
        player.forEachAttacker(function (mob) {
            previousAttackers.push(mob);
            self.chooseMobTarget(mob, 2);
        });

        _.each(previousAttackers, function (mob) {
            player.removeAttacker(mob);
            mob.clearTarget();
            mob.forgetPlayer(player.id, 1000);
        });

        this.handleEntityGroupMembership(player);
    },

    setPlayerCount: function (count) {
        this.playerCount = count;
    },

    getPlayerCount: function () {
        return this.playerCount;
    },

    incrementPlayerCount: function () {
        this.setPlayerCount(this.playerCount + 1);
    },

    decrementPlayerCount: function () {
        if (this.playerCount > 0) {
            this.setPlayerCount(this.playerCount - 1);
        }
    },

    getDroppedItem: function (mob) {
        var kind = Types.getKindAsString(mob.kind),
            drops = Properties[kind].drops,
            v = Utils.random(100),
            p = 0,
            item = null;

        for (var itemName in drops) {
            var percentage = drops[itemName];

            p += percentage;
            if (v <= p) {
                item = this.addItem(this.createItem(Types.getKindFromString(itemName), mob.x, mob.y));
                break;
            }
        }

        return item;
    },

    onMobMoveCallback: function (mob) {
        this.pushToAdjacentGroups(mob.group, new Messages.Move(mob));
        this.handleEntityGroupMembership(mob);
    },


    moveNpc: function(npc, x, y) {
        npc.setPosition(x,y);
        this.pushToAdjacentGroups(npc.group, new Messages.Move(npc));
        this.handleEntityGroupMembership(npc);
    },

    findPositionNextTo: function (entity, target) {
        let positions = ['N','S','W','E'];

        while (positions.length > 0) {
            let randArrPos = Utils.random(positions.length);
            let side = positions[randArrPos];

            let pos = entity.getPositionNextTo(target, side);
            if (this.isValidPosition(pos.x, pos.y)){
                return pos;
            }
            positions.splice(randArrPos, 1);
        }
        return false;
    },

    initZoneGroups: function () {
        var self = this;

        this.map.forEachGroup(function (id) {
            self.groups[id] = {
                entities: {},
                players: [],
                incoming: []
            };
        });
        this.zoneGroupsReady = true;
    },

    initDoorTriggers: function () {
        var self = this;
        Object.keys(self.map.triggerDoors).forEach(door => {
            self.doorTriggers[door] = false
        });
    },

    removeFromGroups: function (entity) {
        var self = this,
            oldGroups = [];

        if (entity && entity.group) {
            var group = this.groups[entity.group];
            if (entity instanceof Player) {
                group.players = _.reject(group.players, function (id) {
                    return id === entity.id;
                });
            }

            this.map.forEachAdjacentGroup(entity.group, function (id) {
                if (entity.id in self.groups[id].entities) {
                    delete self.groups[id].entities[entity.id];
                    oldGroups.push(id);
                }
            });
            entity.group = null;
        }
        return oldGroups;
    },

    /**
     * Registers an entity as "incoming" into several groups, meaning that it just entered them.
     * All players inside these groups will receive a Spawn message when WorldServer.processGroups is called.
     */
    addAsIncomingToGroup: function (entity, groupId) {
        var self = this,
            isChest = entity && entity instanceof Chest,
            isItem = entity && entity instanceof Item,
            isDroppedItem = entity && isItem && !entity.isStatic && !entity.isFromChest;

        if (entity && groupId) {
            this.map.forEachAdjacentGroup(groupId, function (id) {
                var group = self.groups[id];

                if (group) {
                    if (!_.include(group.entities, entity.id)
                        //  Items dropped off of mobs are handled differently via DROP messages. See handleHurtEntity.
                        && (!isItem || isChest || (isItem && !isDroppedItem))) {
                        group.incoming.push(entity);
                    }
                }
            });
        }
    },

    addToGroup: function (entity, groupId) {
        var self = this,
            newGroups = [];

        if (entity && groupId && (groupId in this.groups)) {
            this.map.forEachAdjacentGroup(groupId, function (id) {
                self.groups[id].entities[entity.id] = entity;
                newGroups.push(id);
            });
            entity.group = groupId;

            if (entity instanceof Player) {
                this.groups[groupId].players.push(entity.id);
            }
        }
        return newGroups;
    },

    logGroupPlayers: function (groupId) {
        console.debug("Players inside group " + groupId + ":");
        _.each(this.groups[groupId].players, function (id) {
            console.debug("- player " + id);
        });
    },

    handleEntityGroupMembership: function (entity) {
        var hasChangedGroups = false;
        if (entity) {
            var groupId = this.map.getGroupIdFromPosition(entity.x, entity.y);
            if (!entity.group || (entity.group && entity.group !== groupId)) {
                hasChangedGroups = true;
                this.addAsIncomingToGroup(entity, groupId);
                var oldGroups = this.removeFromGroups(entity);
                var newGroups = this.addToGroup(entity, groupId);

                if (_.size(oldGroups) > 0) {
                    entity.recentlyLeftGroups = _.difference(oldGroups, newGroups);
                    //console.debug("group diff: " + entity.recentlyLeftGroups);
                }
            }
        }
        return hasChangedGroups;
    },

    processGroups: function () {
        let self = this;

        if (this.zoneGroupsReady) {
            this.map.forEachGroup(function (id) {
                let incoming = self.groups[id].incoming;
                const incomingLength = incoming.length;
                if (incomingLength > 0) {
                    for (let i = 0; i < incomingLength; i++) {
                        let entity = incoming[i];
                        if (entity instanceof Player) {
                            self.pushToGroup(id, new Messages.Spawn(entity), entity.id);
                        } else {
                            self.pushToGroup(id, new Messages.Spawn(entity));
                        }
                    }
                    self.groups[id].incoming = [];
                }
            });
        }
    },

    moveEntity: function (entity, x, y) {
        if (entity) {
            entity.setPosition(x, y);
            this.handleEntityGroupMembership(entity);
        }
    },

    handleItemDespawn: function (item) {
        var self = this;

        if (item) {
            item.handleDespawn({
                beforeBlinkDelay: 10000,
                blinkCallback: function () {
                    self.pushToAdjacentGroups(item.group, new Messages.Blink(item));
                },
                blinkingDuration: 4000,
                despawnCallback: function () {
                    self.pushToAdjacentGroups(item.group, new Messages.Destroy(item));
                    self.removeEntity(item);
                }
            });
        }
    },

    handleEmptyMobArea: function (area) {

    },

    handleEmptyChestArea: function (area) {
        if (area) {
            var chest = this.addItem(this.createChest(area.chestX, area.chestY, area.items, area.chances));
            this.handleItemDespawn(chest);
        }
    },

    handleOpenedChest: function (chest, player) {
        this.pushToAdjacentGroups(chest.group, chest.despawn());
        this.removeEntity(chest);

        var kind = chest.getRandomItem();
        if (kind) {
            var item = this.addItemFromChest(kind, chest.x, chest.y);
            this.handleItemDespawn(item);
        }
    },

    tryAddingMobToChestArea: function (mob) {
        _.each(this.chestAreas, function (area) {
            if (area.contains(mob)) {
                area.addToArea(mob);
            }
        });
    },

    updatePopulation: function () {
        let totalCount = 0;

        for (let wordId in this.server.worldsMap) {
            totalCount += this.server.worldsMap[wordId].playerCount;
        }
        //console.log("Updating population: " + this.playerCount + " " + totalPlayers)
        this.pushBroadcast(new Messages.Population(this.playerCount, totalCount));
    },


    getPollingInfo: function (playerId) {
        let player = this.getEntityById(playerId);

        if (!player) {
            return;
        }

        let playerInfo = {
            armor: Types.getKindAsString(player.armor),
            powerUpActive: player.getPowerUpActive()
        }

        let characterInfo = this.getCharactersInfoInPlayerGroup(player);
        return {
            characterInfo: characterInfo,
            playerInfo: playerInfo
        }
    },

    getCharactersInfoInPlayerGroup: function (player) {
        const group = this.groups[player.group];

        let ret = {}
        if (group === undefined) {
            return ret;
        }
        for (const id in group.entities) {
            let entity = group.entities[id];
            if (entity.type === 'mob' || entity.type === 'player') {
                ret[id] = {
                    maxHitPoints: entity.maxHitPoints,
                    hitPoints: entity.hitPoints,
                    moveSpeed: entity.getMoveSpeed(),
                    attackRate: entity.getAttackRate(),
                    inCombat: entity.isInCombat(),
                    x: entity.x,
                    y: entity.y,
                    stealth: entity.getStealth()
                }
            }
        }
        return ret;
    },

    getNFTWeaponStatistics: function (playerId) {
        const player = this.getEntityById(playerId);
        if (player === undefined) {
            return;
        }

        let nftWeapon = player.getNFTWeapon();
        if (nftWeapon === undefined) {
            return;
        }

        let weaponInfo = {
            constructor: nftWeapon.constructor.name,
            experience: nftWeapon.experience,
            trait: nftWeapon.trait,
            selectedProjectile: player.selectedProjectile
        }
        return weaponInfo;
    },

    getItemWeaponStatistics: function(playerId) {
        const player = this.getEntityById(playerId);
        if (player === undefined) {
            return;
        }

        return {
            currentLevel: player.getWeaponLevel()
        }
    },

    doAoe: function (mob) {
        let kind = Types.getKindAsString(mob.kind);
        let aoeProps = Properties[kind].aoe;

        if (aoeProps !== undefined) {
            let aoeDamage = aoeProps.damage;
            let aoeRange = aoeProps.range !== undefined ? aoeProps.range : 1; //default AoE range is 1

            if (aoeDamage !== undefined && aoeDamage > 0) {
                const group = this.groups[mob.group];
                if (group !== undefined) {
                    let entityIds = Object.keys(group.entities);

                    entityIds.forEach(function (id) {
                        let nearbyEntity = group.entities[id];
                        if (nearbyEntity !== undefined && nearbyEntity.type === 'player') {
                            let distance = Utils.distanceTo(mob.x, mob.y, nearbyEntity.x, nearbyEntity.y);
                            if (distance <= aoeRange) {
                                nearbyEntity.handleHurt(mob, aoeDamage);
                            }
                        }
                    })
                }
            }
        }
    },

    distributeExp: function (mob) {
        let self = this;

        let xp = Formulas.xp(mob);
        let allDmgTaken = mob.dmgTakenArray.reduce((partialSum, currElem) => partialSum + currElem.dmg, 0);

        mob.dmgTakenArray.forEach(function (arrElem) {
            let accomplice = self.getEntityById(arrElem.id);
            /* Occasionally the entity is not found based on the ID.
            The only outcome is that a share of mob's exp is given to nobody; 
            therefore it can simply be ignored by returning on undefined entity*/
            if (accomplice === undefined) {
                return;
            }

            let accompliceDmg = arrElem.dmg;
            if (accomplice.type === "player" && allDmgTaken > 0 && accompliceDmg > 0) {
                let accompliceShare = Formulas.xpShare(xp, allDmgTaken, accompliceDmg);
                let accompliceLevel = accomplice.getLevel();
                let mobLevel = mob.level;
                if (accompliceLevel > Math.round(mobLevel * 1.25)) {
                    accompliceShare = Math.round(accompliceShare * Math.max(1 - (accompliceLevel - (mobLevel * 1.25)) * 0.1, 0.5));
                }
                let buff = accomplice.getActiveBuff();
                if (buff && buff.stat === "exp"){
                    accompliceShare = Math.round(accompliceShare * (100 + buff.percent)/100);
                }
                accomplice.handleExperience(accompliceShare);
                self.pushToPlayer(accomplice, new Messages.Kill(mob, accompliceShare));
            }
        })
    },

    handleExpMultiplierOnDeath: function (mob) {
        let self = this;

        let kind = Types.getKindAsString(mob.kind);
        let expProps = Properties[kind].expMultiplier;
        if (expProps !== undefined) {
            let expDuration = expProps.duration;
            let expMultiplier = expProps.multiplier !== undefined ? expProps.multiplier : 2; //default EXP multiplier is 2

            if (expDuration !== undefined && expDuration > 0 &&
                expMultiplier !== undefined && expMultiplier > 0) {

                let killersList = "";
                mob.dmgTakenArray.forEach(function (arrElem) {
                    let killer = self.getEntityById(arrElem.id);
                    if (killer !== undefined && killer.type === "player") {
                        if (killersList !== "") {
                            killersList += ", "
                        }
                        ;
                        killersList += killer.name;
                    }
                })
                discord.sendMessage(kind + " has been slain by " + killersList + "!");
                Formulas.setXPMultiplier(expMultiplier, expDuration);
            }
        }
    },

    handleMobSpecial: function (mob) {
        //Megamag (repeating AoE)
        if (mob.kind === Types.Entities.MEGAMAG) {
            let self = this;
            if (mob.specialInterval == null) {
                mob.specialInterval = setInterval(function () {
                    let kind = Types.getKindAsString(mob.kind);
                    let msg = Properties[kind].messages[Utils.random(Properties[kind].messages.length)]; // Fetch random message from properties
                    self.pushToGroup(mob.group, new Messages.Chat(mob, msg), false); // Warn players Special incoming
                    self.pushToGroup(mob.group, new Messages.MobDoSpecial(mob), false);
                    setTimeout(function () {
                        if (mob !== undefined) {
                            self.doAoe(mob);
                            let target = self.getEntityById(mob.target);
                            if (target !== undefined) {
                                self.spawnFieldAdd(mob, Types.getKindFromString("magcrack"), target.x, target.y);
                            } else {
                                self.spawnFieldAdd(mob, Types.getKindFromString("magcrack"), mob.x, mob.y);
                            }
                        }
                    }, 2000); // Change this duration also in client/mobs.js
                }, Types.timeouts[Types.Entities.MEGAMAG]);
            }
        }
        //END Megamag

        //Slime king (random slime spawn)
        if (mob.kind === Types.Entities.COBSLIMEKING) {
            let self = this;
            if (mob.specialInterval == null) {
                mob.specialInterval = setInterval(function () {
                    let slimeType = Utils.random(3);
                    let slimeKind;
                    switch (slimeType) {
                        case 0:
                            slimeKind = Types.getKindFromString("cobslimeblue");
                            break;
                        case 1:
                            slimeKind = Types.getKindFromString("cobslimeyellow");
                            break;
                        case 2:
                            slimeKind = Types.getKindFromString("cobslimered");
                            break;
                    }
                    self.spawnMobAdd(mob, slimeKind, mob.x, mob.y);
                    self.pushToGroup(mob.group, new Messages.MobDoSpecial(mob), false);
                }, Types.timeouts[Types.Entities.COBSLIMEKING]);
            }
        }
        //END Slime king 

        //Cobogre (falling rocks on random target within 10 distance)
        if (mob.kind === Types.Entities.COBOGRE) {
            let self = this;
            if (mob.specialInterval == null) {
                mob.specialInterval = setInterval(function () {
                    let target = {score: -1};
                    mob.hatelist.forEach(function (obj) {
                        let hated = self.getEntityById(obj.id);
                        if (Utils.distanceTo(mob.x, mob.y, hated.x, hated.y) < 10) {
                            let random = Utils.random(100);
                            if (random > target.score) {
                                target.score = random;
                                target.x = hated.x;
                                target.y = hated.y;
                            }
                        }
                    });
                    if (target.x && target.y) {
                        self.spawnFieldAdd(mob, Types.getKindFromString("cobfallingrock"), target.x, target.y);
                    }
                }, Types.timeouts[Types.Entities.COBOGRE]);
            }
        }
        //END Cobogre
    },

    checkTriggerActive: function (triggerId) {
        triggerState = this.doorTriggers[triggerId];
        return triggerState !== undefined ? triggerState : false;
    },

    activateTrigger: function(triggerId) {
        this.doorTriggers[triggerId] = true;
        this.worldEventBroker.triggerActivated(this.id, triggerId);
    },

    deactivateTrigger: function(triggerId) {
        this.doorTriggers[triggerId] = false;
        this.worldEventBroker.triggerDeactivated(this.id, triggerId);
    },

    onMobExitCombatCallback: function (mob) {
        this.pushToAdjacentGroups(mob.group, new Messages.MobExitCombat(mob));
        mob.clearSpecialInterval();
        this.despawnAllAdds(mob);
        mob.resetHitPoints(mob.maxHitPoints);
    },

    spawnMobAdd: function (parent, childKind, x, y, canRespawn, distributeDamageToParent) {
        if (distributeDamageToParent === undefined) {
            distributeDamageToParent = false;
        }
        if (parent.addArray.length < 15) { // Limit amount of adds to 15 to prevent any funny business
            let self = this;
            let add = new Mob('8' + Math.round(Math.random() * 9999999), childKind, x, y);
            add.parentId = parent.id;
            parent.addArray.push(add);
            if (canRespawn === true) {
                let originalHandleRespawn = add.handleRespawn;
                add.handleRespawn = function () {
                    if (!parent.isDead) {
                        originalHandleRespawn.call(add);
                    }
                }
                add.onRespawn(function () {
                    if (!parent.isDead) {
                        self.spawnMobAdd(parent, childKind, x, y, true, distributeDamageToParent);
                    }
                });
            } else {
                add.handleRespawn = function () {
                    return;
                };// dont respawn
            }

            if (distributeDamageToParent === true) {
                let originalHandleHurt = add.handleHurt;
                add.handleHurt = function (attacker, dmg) {
                    originalHandleHurt.call(add, attacker, dmg);
                    self.handleHurtEntity(parent, attacker, dmg);
                }
            }

            add.onDetachFromParent(self.onDetachFromParentCallback.bind(self))
            add.onMove(self.onMobMoveCallback.bind(self));
            add.onExitCombat(self.onMobExitCombatCallback.bind(self));

            let kind = Types.getKindAsString(add.kind);
            let aoeProps = Properties[kind].aoe;
            if (aoeProps?.onTimer > 0) {
                add.aoeTimer = setInterval(() => {
                    self.doAoe(add);
                }, aoeProps.onTimer);
            }

            self.addMob(add);

            // Add spawns in player destination (his x,y), not current position! Therefore we instantly aggro the mob to prevent kiting out of aggro range
            self.handleMobHate(add.id, parent.target, 5);
        }
    },

    spawnFieldAdd: function (parent, fieldKind, x, y) {
        if (parent.addArray.length < 15) { // Limit amount of adds to 15 to prevent any funny business
            let self = this;
            field = self.addFieldEffect(fieldKind, x, y);
            field.parentId = parent.id;
            field.onDetachFromParent(self.onDetachFromParentCallback.bind(self));
            parent.addArray.push(field);
        }
    },

    despawnAllAdds: function (mob) {
        let self = this;
        const mobAddArrayLength = mob.addArray.length;
        if (mobAddArrayLength > 0) {
            for (let i = mobAddArrayLength - 1; i >= 0; i--) { // go backwards through the loop, because we do splice in despawn
                let add = mob.addArray[i];
                if (add !== undefined) {
                    self.despawn(add);
                }
            }
            mob.addArray = [];
        }
    },

    onDetachFromParentCallback: function (parentId, child) {
        let parent = this.getEntityById(parentId);
        if (parent !== undefined) {
            const index = parent.addArray.indexOf(child);
                if (index > -1) {
                    parent.addArray.splice(index, 1);
                }
        }
    },

    nextMobId: function() {
        // return highest key + 1
        return _.max(_.keys(this.mobs), function(id) { return parseInt(id); }) + 1;
    },

    showLayer: function(player, layer) {
        this.map.toggledLayers[layer] = true;
        this.pushBroadcast(new Messages.Layer(layer, true), false);
    },

    hideLayer: function(player, layer) {
        this.map.toggledLayers[layer] = false;
        this.pushBroadcast(new Messages.Layer(layer, false), false);
    },

    toggleLayer: function(player, layer) {
        this.map.toggledLayers[layer] = !this.map.toggledLayers[layer];
        this.pushBroadcast(new Messages.Layer(layer, this.map.toggledLayers[layer]), false);
    },

    triggerAnimation: function(entity, animationId) {

        this.pushToAdjacentGroups(entity.group, new Messages.Animate(entity.id, animationId), false);
    },

    newQuest: function(player, questId) {
        let questText = quests.newQuest(this.server.cache, player.sessionId, questId);
        if(_.isEmpty(questText)) {
           return false;
        }

        this.sendNotifications(player, questText);
        return true;
    },

    completeQuest: function(player, questId) {
        let result = quests.completeQuest(this.server.cache, player.sessionId, questId);
        if(result === false) {
            return false;
        }

        if(!_.isEmpty(result)) {
            this.sendNotifications(player, result);
        }

        player.handleCompletedQuests([quests.questsByID[questId]]);

        return true;
    },

    sendNotifications: function(player, notifications) {
        if(!_.isArray(notifications)) {
            notifications = [notifications];
        }
        let self = this;
        let delay = 0;
        const SHOW_MESSAGE_TIME = 2000;
        notifications.forEach((text) => {
            setTimeout(function() {
                self.pushToPlayer(player, new Messages.Notify(text), false);
            }, delay * SHOW_MESSAGE_TIME);
            delay++;
        })
    },

    addToInventory(player, itemKind, amount) {
        let item = this.createItem(itemKind, 0, 0);
        player.playerEventBroker.lootEvent(item, amount);

    },

    removeFromInventory(player, itemKind, amount) {
        let item = this.createItem(itemKind, 0, 0);
        player.playerEventBroker.lootEvent(item, amount * -1);
    },

    npcTalked(npcId, message, sessionData) {
        let player = this.getEntityById(sessionData.entityId)
        player.playerEventBroker.npcTalked(npcId, message)
    },

    handleSeaCreatureSpawn: function (mob) {
        this.spawnMobAdd(mob, Types.Entities.TENTACLE, mob.x - 5, mob.y - 2, true);
        this.spawnMobAdd(mob, Types.Entities.TENTACLE, mob.x - 2, mob.y - 2, true);
        this.spawnMobAdd(mob, Types.Entities.TENTACLE2, mob.x + 5, mob.y - 2, true);
        this.spawnMobAdd(mob, Types.Entities.TENTACLE2, mob.x + 2, mob.y - 2, true);
    },

    handleSeaCreatureDie: function (mob, attacker) {
        let parent = this.getEntityById(mob.parentId);
        if (parent.addArray.length === 1) {
            parent.hitPoints = 0;
            this.handleHurtEntity(parent, attacker, parent.hitPoints);
        }
    },

    announceSpawnFloat: function(player, gX, gY) {
        let playerNftWeapon = player.getNFTWeapon();
        if (playerNftWeapon !== undefined){
            let floatName = playerNftWeapon.nftId.replace("0x","NFT_");
            this.pushToAdjacentGroups(player.group, new Messages.SpawnFloat(player.id, floatName , gX, gY), player.id);
        }
    },

    announceDespawnFloat: function(player) {
        this.pushToAdjacentGroups(player.group, new Messages.DespawnFloat(player.id), player.id);
    },

    getConsumeGroupCooldown: function(nftId, itemGroup) {
        let playerCooldowns = this.consumeCooldowns[nftId];
        if (playerCooldowns) {
            let expireDate = playerCooldowns[itemGroup];
            if (expireDate !== undefined) {
                return expireDate > new Date().getTime() ? expireDate : 0;
            }
        }
        return 0;
    },


    announceSpawnProjectile: function(player, projectileType, mob) {
        this.pushToAdjacentGroups(player.group, new Messages.SpawnProjectile(player.id, projectileType, mob));
    },

});