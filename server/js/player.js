
var cls = require("./lib/class"),
    _ = require("underscore"),
    Messages = require("./message"),
    Utils = require("./utils"),
    Properties = require("./properties"),
    Formulas = require("./formulas"),
    check = require("./format").check,
    Types = require("../../shared/js/gametypes"),
    dao = require('./dao.js');


const discord = require('./discord.js');    
const axios = require('axios');
const chat = require("./chat.js");
const NFTWeapon = require("./nftweapon.js");

const LOOPWORMS_LOOPERLANDS_BASE_URL = process.env.LOOPWORMS_LOOPERLANDS_BASE_URL;
const BASE_SPEED = 120;

module.exports = Player = Character.extend({
    init: function(connection, worldServer) {
        var self = this;
        
        this.server = worldServer;
        this.connection = connection;

        this._super(this.connection.id, "player", Types.Entities.WARRIOR, 0, 0, "");

        this.hasEnteredGame = false;
        this.isDead = false;
        this.haters = {};
        this.lastCheckpoint = null;
        this.formatChecker = new FormatChecker();
        this.disconnectTimeout = null;

        this.moveSpeed = BASE_SPEED;
        this.attackRate = 800;

        
        this.connection.listen(function(message) {

            var action = parseInt(message[0]);
            
            //console.debug("Received: " + message, "from " + self.connection.id);
            if(!check(message)) {
                self.connection.close("Invalid "+Types.getMessageTypeAsString(action)+" message format: "+message);
                return;
            }
            
            if(!self.hasEnteredGame && action !== Types.Messages.HELLO) { // HELLO must be the first message
                self.connection.close("Invalid handshake message: "+message);
                return;
            }
            if(self.hasEnteredGame && !self.isDead && action === Types.Messages.HELLO) { // HELLO can be sent only once
                self.connection.close("Cannot initiate handshake twice: "+message);
                return;
            }
            
            self.resetTimeout();
            
            if(action === Types.Messages.HELLO) {
                var name = Utils.sanitize(message[1]);

                // If name was cleared by the sanitizer, give a default name.
                // Always ensure that the name is not longer than a maximum length.
                // (also enforced by the maxlength attribute of the name input element).
                self.name = (name === "") ? "lorem ipsum" : name.substr(0, 15);
                self.sessionId = message[4];
                let playerCache = self.server.server.cache.get(self.sessionId);
                self.walletId = playerCache.walletId;
                self.nftId = playerCache.nftId;
                
                self.kind = Types.Entities.WARRIOR;
                self.equipArmor(message[2]);
                self.equipWeapon(message[3]);
                self.orientation = Utils.randomOrientation();
                self.updatePosition();
                
                self.server.addPlayer(self);
                self.server.enter_callback(self);


                playerCache.isDirty = true;
                playerCache.entityId = self.id;
                self.server.server.cache.set(self.sessionId, playerCache);
                self.title = playerCache.title;
                self.level = Formulas.level(playerCache.xp);
                self.updateHitPoints();
                self.send([Types.Messages.WELCOME, self.id, self.name, self.x, self.y, self.hitPoints, self.title]);
                self.hasEnteredGame = true;
                self.isDead = false;
                discord.sendMessage(`Player ${self.name} has joined the game.`);
                
            }
            else if(action === Types.Messages.WHO) {
                message.shift();
                self.server.pushSpawnsToPlayer(self, message);
            }
            else if(action === Types.Messages.ZONE) {
                self.zone_callback();
            }
            else if(action === Types.Messages.CHAT) {
                var msg = Utils.sanitize(message[1]);
                
                // Sanitized messages may become empty. No need to broadcast empty chat messages.
                if(msg && msg !== "") {
                    msg = msg.substr(0, 60); // Enforce maxlength of chat input
                    self.broadcastToZone(new Messages.Chat(self, msg), false);
                    chat.addMessage(self.name, msg);
                }
            }
            else if(action === Types.Messages.MOVE) {
                if(self.move_callback) {
                    var x = message[1],
                        y = message[2];
                    
                    if(self.server.isValidPosition(x, y)) {
                        self.setPosition(x, y);
                        self.clearTarget();
                        self.pushEntityList();
                        self.broadcast(new Messages.Move(self));
                        self.move_callback(self.x, self.y);
                    }
                }
            }
            else if(action === Types.Messages.LOOTMOVE) {
                if(self.lootmove_callback) {
                    self.setPosition(message[1], message[2]);
                    
                    var item = self.server.getEntityById(message[3]);
                    if(item) {
                        self.clearTarget();
                        if (Types.isWeapon(item.kind) && self.getNFTWeapon() !== undefined) {
                            console.log("Todo: increment NFT item experience")
                        } else {
                            self.broadcast(new Messages.LootMove(self, item));
                            self.lootmove_callback(self.x, self.y);
                        }

                    }
                }
            }
            else if(action === Types.Messages.AGGRO) {
                if(self.move_callback) {
                    self.server.handleMobHate(message[1], self.id, 5);
                }
            }
            else if(action === Types.Messages.ATTACK) {
                var mob = self.server.getEntityById(message[1]);
                if(mob) {
                    self.setTarget(mob);
                    self.server.broadcastAttacker(self);
                }
            }
            else if(action === Types.Messages.HIT) {
                var mob = self.server.getEntityById(message[1]);

                if(mob) {
                    if (mob instanceof Player) {
                        mob.handleHurt(self);
                    } else {
                        let level = self.getLevel();
                        let totalLevel = (self.getWeaponLevel() + level) - 1;

                        let weaponTrait = self.getNFTWeaponActiveTrait();

                        //console.log(self.name, "Total level ", totalLevel, "Level", level, "Weapon level", self.getWeaponLevel(), "Active Trait", weaponTrait);
                
                        function handleDamage(mob, totalLevel, multiplier) {
                            let dmg = Formulas.dmg(totalLevel, mob.armorLevel);
                            dmg *= multiplier;
                
                            if(dmg > 0) {
                                mob.receiveDamage(dmg, self.id);
                                //console.log("Player "+self.id+" hit mob "+mob.id+" for "+dmg+" damage.", mob.type);
                                self.server.handleMobHate(mob.id, self.id, dmg);
                                self.server.handleHurtEntity(mob, self, dmg);
                            }
                            self.incrementNFTWeaponExperience(dmg);
                        }

                        if (weaponTrait === "aoe") {
                            const group = self.server.groups[self.group];
                            let entityIds = Object.keys(group.entities);
                            entityIds.forEach(function(id) {
                                let entity = group.entities[id];
                                if (entity.type === 'mob') {
                                    let distance = Utils.distanceTo(self.x, self.y, entity.x, entity.y);
                                    if (distance === 1) {
                                        handleDamage(entity, totalLevel, 1);
                                    }
                                }
                            });
                        } else if (weaponTrait === "crit") {
                            handleDamage(mob, totalLevel, 3);
                        } else if (weaponTrait === "speed") {
                            for (i = 0 ; i < 2; i++) {
                                handleDamage(mob, totalLevel, 1);
                            }
                        } else {
                            handleDamage(mob, totalLevel, 1);
                        }
                    }

                }
            }
            else if(action === Types.Messages.HURT) {
                var mob = self.server.getEntityById(message[1]);
                self.handleHurt(mob);
            }
            else if(action === Types.Messages.LOOT) {
                var item = self.server.getEntityById(message[1]);
                
                if(item) {
                    var kind = item.kind;
                    
                    if(Types.isItem(kind)) {
                        self.broadcast(item.despawn());
                        self.server.removeEntity(item);
                        
                        if(kind === Types.Entities.FIREPOTION) {
                            self.updateHitPoints();
                            self.broadcast(self.equip(Types.Entities.FIREFOX));
                            self.firepotionTimeout = setTimeout(function() {
                                self.broadcast(self.equip(self.armor)); // return to normal after 15 sec
                                self.firepotionTimeout = null;
                            }, 15000);
                            self.send(new Messages.HitPoints(self.maxHitPoints).serialize());
                        } else if(Types.isHealingItem(kind)) {
                            var amount;
                            
                            switch(kind) {
                                case Types.Entities.FLASK: 
                                    amount = 40;
                                    break;
                                case Types.Entities.BURGER: 
                                    amount = 100;
                                    break;
                            }
                            
                            if(!self.hasFullHealth()) {
                                self.regenHealthBy(amount);
                                self.server.pushToPlayer(self, self.health());
                            }
                        } else if(Types.isWeapon(kind) && self.getNFTWeapon() === undefined) {
                            self.equipItem(item);
                            self.broadcast(self.equip(kind));
                        }
                    }
                }
            } else if (action === Types.Messages.EQUIP_INVENTORY) {
                let playerCache = self.server.server.cache.get(self.sessionId);
                let _self = self;
                let nftId = message[2];
                dao.walletHasNFT(playerCache.walletId, nftId).then(function (result) {
                    item = {kind: message[1]};
                    _self.equipItem(item);
                    _self.broadcast(_self.equip(item.kind));
                }).catch(function (error) {
                    console.error("Asset validation error: " + error);
                    item = {kind: Types.Entities.SWORD1};
                    _self.equipItem(item);
                    _self.broadcast(_self.equip(item.kind));
                });
            }
            else if(action === Types.Messages.TELEPORT) {
                let _self = self;
                var x = message[1],
                    y = message[2];
                
                let requiredNft = self.server.map.getRequiredNFT(x, y);

                function teleport() {
                    if(_self.server.isValidPosition(x, y)) {
                        _self.setPosition(x, y);
                        _self.clearTarget();

                        _self.broadcast(new Messages.Teleport(_self));
                        _self.server.handlePlayerVanish(_self);
                        _self.server.pushRelevantEntityListTo(_self);
                    } else {
                        console.error("Invalid teleport position : "+x+", "+y);
                    }
                }
                if (requiredNft !== undefined) {
                    let playerCache = self.server.server.cache.get(self.sessionId);
                    let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/AssetValidation.php?WalletID=${playerCache.walletId}&NFTID=${requiredNft}`;
                    axios.get(url).then(function (response) {
                        if (response.data === true) {
                            teleport();
                        } else {
                            console.error("Asset validation failed for player " + _self.name + " and nftId " + requiredNft, url);
                        }
                    })
                    .catch(function (error) {
                        console.error("Asset validation error: " + error, url);
                    });                    
                } else {
                    teleport();
                }

            }
            else if(action === Types.Messages.OPEN) {
                var chest = self.server.getEntityById(message[1]);
                if(chest && chest instanceof Chest) {
                    self.server.handleOpenedChest(chest, self);
                }
            }
            else if(action === Types.Messages.CHECK) {
                var checkpoint = self.server.map.getCheckpoint(message[1]);
                if(checkpoint) {
                    self.lastCheckpoint = checkpoint;
                }
            }
            else {
                if(self.message_callback) {
                    self.message_callback(message);
                }
            }
        });
        
        this.connection.onClose(function() {
            if(self.firepotionTimeout) {
                clearTimeout(self.firepotionTimeout);
            }
            clearTimeout(self.disconnectTimeout);
            if(self.exit_callback) {
                self.exit_callback();
            }
        });
        
        this.connection.sendUTF8("go"); // Notify client that the HELLO/WELCOME handshake can start
    },

    incrementNFTWeaponExperience: function (damage) {
        let nftWeapon = this.getNFTWeapon();
        if (nftWeapon !== undefined) {
            nftWeapon.incrementExperience(damage);
        }
    },

    handleHurt: function(mob) {
        if(mob && this.hitPoints > 0) {
            let level = this.getLevel();

            let totalLevel = (this.armorLevel + level) - 1;
           
            let damage = Formulas.dmg(mob.getWeaponLevel(), totalLevel);
            this.hitPoints -= damage;
            this.server.handleHurtEntity(this, mob, damage);
            //console.log(this.name, "Level " + level, "Armor level", this.armorLevel, "Total level", totalLevel, "Hitpoints", this.hitPoints);

            if (mob instanceof Player) {
                mob.incrementNFTWeaponExperience(damage);
            }

            if(this.hitPoints <= 0) {
                let killer = Types.getKindAsString(mob.kind);
                if (mob instanceof Player)  {
                    discord.sendMessage(`Player ${this.name} ganked by ${mob.name}.`);
                    this.updatePVPStats(mob);
                } else {
                    discord.sendMessage(`Player ${this.name} killed by ${killer}.`);
                }
                
                this.isDead = true;
                if(this.firepotionTimeout) {
                    clearTimeout(this.firepotionTimeout);
                }
            }
        }        
    },
    
    destroy: function() {
        var self = this;
        
        this.forEachAttacker(function(mob) {
            mob.clearTarget();
        });
        this.attackers = {};
        
        this.forEachHater(function(mob) {
            mob.forgetPlayer(self.id);
        });
        this.haters = {};
    },
    
    getState: function() {
        var basestate = this._getBaseState(),
            state = [this.name, this.orientation, this.armor, this.weapon, this.title];

        if(this.target) {
            state.push(this.target);
        }
        
        return basestate.concat(state);
    },
    
    send: function(message) {
        this.connection.send(message);
    },
    
    broadcast: function(message, ignoreSelf) {
        if(this.broadcast_callback) {
            this.broadcast_callback(message, ignoreSelf === undefined ? true : ignoreSelf);
        }
    },
    
    broadcastToZone: function(message, ignoreSelf) {
        if(this.broadcastzone_callback) {
            this.broadcastzone_callback(message, ignoreSelf === undefined ? true : ignoreSelf);
        }
    },

    
    onExit: function(callback) {
        this.exit_callback = callback;
    },
    
    onMove: function(callback) {
        this.move_callback = callback;
    },
    
    onLootMove: function(callback) {
        this.lootmove_callback = callback;
    },
    
    onZone: function(callback) {
        this.zone_callback = callback;
    },
    
    onOrient: function(callback) {
        this.orient_callback = callback;
    },
    
    onMessage: function(callback) {
        this.message_callback = callback;
    },
    
    onBroadcast: function(callback) {
        this.broadcast_callback = callback;
    },
    
    onBroadcastToZone: function(callback) {
        this.broadcastzone_callback = callback;
    },
    
    equip: function(item) {
        return new Messages.EquipItem(this, item);
    },
    
    addHater: function(mob) {
        if(mob) {
            if(!(mob.id in this.haters)) {
                this.haters[mob.id] = mob;
            }
        }
    },
    
    removeHater: function(mob) {
        if(mob && mob.id in this.haters) {
            delete this.haters[mob.id];
        }
    },
    
    forEachHater: function(callback) {
        _.each(this.haters, function(mob) {
            callback(mob);
        });
    },
    
    equipArmor: function(kind) {
        this.armor = kind;
        this.armorLevel = Properties.getArmorLevel(kind);
    },
    
    equipWeapon: function(kind) {
        this.weapon = kind;
        const kindString = Types.getKindAsString(kind);
        if (kindString.startsWith("NFT")) {
            this.nftWeapon = new NFTWeapon.NFTWeapon(this.walletId, kindString);
            this.nftWeapon.loadWeaponData();
        } else {
            if (this.nftWeapon === undefined) {
                this.weaponLevel = Properties.getWeaponLevel(kind);
            }
        }
    },
    
    equipItem: function(item) {
        if(item) {
            //console.debug(this.name + " equips " + Types.getKindAsString(item.kind));
            
            if(Types.isArmor(item.kind)) {
                this.equipArmor(item.kind);
                this.updateHitPoints();
            } else if(Types.isWeapon(item.kind)) {
                this.equipWeapon(item.kind);
                let playerCache = this.server.server.cache.get(this.sessionId);
                let kind = Types.getKindAsString(item.kind);
                dao.saveWeapon(playerCache.walletId, playerCache.nftId,Types.getKindAsString(item.kind));
            }
        }
    },
    
    updateHitPoints: function() {
        let level = this.getLevel();
        let hp = Formulas.hp(level);
        this.resetHitPoints(hp);
        this.send(new Messages.HitPoints(this.maxHitPoints).serialize());
    },
    
    updatePosition: function() {
        if(this.requestpos_callback) {
            var pos = this.requestpos_callback();
            this.setPosition(pos.x, pos.y);
        }
    },
    
    onRequestPosition: function(callback) {
        this.requestpos_callback = callback;
    },
    
    resetTimeout: function() {
        clearTimeout(this.disconnectTimeout);
        this.disconnectTimeout = setTimeout(this.timeout.bind(this), 1000 * 60 * 15); // 15 min.
    },

    receiveDamage: function(points, playerId) {
        this.hitPoints -= points;
    },    
    
    timeout: function() {
        this.connection.sendUTF8("timeout");
        this.connection.close("Player was idle for too long");
    },
    increaseHateFor: function(mobId, points) {
        return;
    },

    getLevel: function(){
        return this.level;
    },

    getPowerUpActive: function() {
        return this.firepotionTimeout !== null && this.firepotionTimeout !== undefined;
    },

    getAttackRate: function() {
        return this.attackRate;
    },

    getMoveSpeed: function() {
        return BASE_SPEED - (this.getLevel() - 1) * 3;
    },

    pushEntityList: function() {
        let now = new Date().getTime();
        if (this.entityListPush !== undefined) {
            if (now - this.entityListPush > 500) {
                this.server.pushRelevantEntityListTo(this);
            }
        }
        this.entityListPush = now;
    },

    updatePVPStats: async function(playerKiller) {
        await dao.updatePVPStats(this.walletId, this.nftId, 0, 1);
        dao.updatePVPStats(playerKiller.walletId, playerKiller.nftId, 1, 0);
    },

    getWeaponLevel: function() {
        const nftWeapon = this.getNFTWeapon();
        if (nftWeapon !== undefined) {
            return nftWeapon.getLevel();
        } else {
            return this.weaponLevel;
        }
    },

    getNFTWeapon: function() {
        return this.nftWeapon;
    },

    getNFTWeaponActiveTrait: function() {
        let nftWeapon = this.getNFTWeapon();
        if (nftWeapon !== undefined && nftWeapon.isTraitActive()) {
            return nftWeapon.getTrait();
        } else {
            return undefined;
        }
    }
    
});