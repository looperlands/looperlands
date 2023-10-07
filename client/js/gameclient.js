
define(['player', 'entityfactory', 'lib/bison', 'mob'], function(Player, EntityFactory, BISON, Mob) {

    var GameClient = Class.extend({
        init: function(host, port, protocol, sessionId, mapId) {
            this.connection = null;
            this.host = host;
            this.port = port;
            this.protocol = protocol;
            this.sessionId = sessionId;
            this.mapId = mapId;

            console.log("Game client", this.host, this.port, this.protocol);
    
            this.connected_callback = null;
            this.spawn_callback = null;
            this.movement_callback = null;
        
            this.handlers = [];
            this.handlers[Types.Messages.WELCOME] = this.receiveWelcome;
            this.handlers[Types.Messages.MOVE] = this.receiveMove;
            this.handlers[Types.Messages.LOOTMOVE] = this.receiveLootMove;
            this.handlers[Types.Messages.ATTACK] = this.receiveAttack;
            this.handlers[Types.Messages.SPAWN] = this.receiveSpawn;
            this.handlers[Types.Messages.DESPAWN] = this.receiveDespawn;
            this.handlers[Types.Messages.SPAWN_BATCH] = this.receiveSpawnBatch;
            this.handlers[Types.Messages.HEALTH] = this.receiveHealth;
            this.handlers[Types.Messages.CHAT] = this.receiveChat;
            this.handlers[Types.Messages.EQUIP] = this.receiveEquipItem;
            this.handlers[Types.Messages.DROP] = this.receiveDrop;
            this.handlers[Types.Messages.TELEPORT] = this.receiveTeleport;
            this.handlers[Types.Messages.DAMAGE] = this.receiveDamage;
            this.handlers[Types.Messages.POPULATION] = this.receivePopulation;
            this.handlers[Types.Messages.LIST] = this.receiveList;
            this.handlers[Types.Messages.DESTROY] = this.receiveDestroy;
            this.handlers[Types.Messages.KILL] = this.receiveKill;
            this.handlers[Types.Messages.HP] = this.receiveHitPoints;
            this.handlers[Types.Messages.BLINK] = this.receiveBlink;
            this.handlers[Types.Messages.MOBDOSPECIAL] = this.receiveMobDoSpecial;
            this.handlers[Types.Messages.MOBEXITCOMBAT] = this.receiveMobExitCombat;
            this.handlers[Types.Messages.QUEST_COMPLETE] = this.receieveQuestComplete;
            this.handlers[Types.Messages.SPAWNFLOAT] = this.receiveSpawnFloat;
            this.handlers[Types.Messages.DESPAWNFLOAT] = this.receiveDespawnFloat;

            this.useBison = false;
            this.enable();
        },
    
        enable: function() {
            this.isListening = true;
        },
    
        disable: function() {
            this.isListening = false;
        },
        
        connect: function(dispatcherMode) {
             var url = this.protocol + "://" + this.host + ":" + this.port + "/",
             self = this;
             console.log(url);

             
            this.connection = io(url, {'force new connection':true, query : "mapId=" + this.mapId});
            this.connection.on('connection', function(socket){
                console.log("Connected to server " + url);
            });

            /******
                Dispatcher is a system where you could have another server you connect to first
                which then provides an IP and port for the client to connect to the game server
             ******/
            if(dispatcherMode) {

                this.connection.emit("dispatch", true)

                this.connection.on("dispatched", function(reply) {
                    console.log("Dispatched: ")
                    console.log(reply)
                    if(reply.status === 'OK') {
                        self.dispatched_callback(reply.host, reply.port);
                    } else if(reply.status === 'FULL') {
                        console.log("LooerpQuest is currently at maximum player population. Please retry later.");
                    } else {
                        console.log("Unknown error while connecting to LooperLands.");
                    }
                });
                
            } else {

                this.connection.on("message", function(data) {

                    if(data === "go") {
                        if(self.connected_callback) {
                            self.connected_callback();
                        }
                        return;
                    }
                    if(data === 'timeout') {
                        self.isTimeout = true;
                        return;
                    }
                    
                    self.receiveMessage(data);
                });

                /*this.connection.onerror = function(e) {
                    console.error(e, true);
                };*/

                this.connection.on("disconnect", function() {
                    console.debug("Connection closed");
                    $('#container').addClass('error');
                    
                    if(self.disconnected_callback) {
                        if(self.isTimeout) {
                            self.disconnected_callback("You have been disconnected for being inactive for too long");
                        } else {
                            self.disconnected_callback("The connection to LooperLands has been lost");
                        }
                    }
                });
            }
        },

        sendMessage: function(json) {
            if(this.connection.connected) {
                this.connection.emit("message", json);
            }
        },

        receiveMessage: function(message) {
        
            if(this.isListening) {
       
                console.debug("data: " + message);

                if(message instanceof Array) {
                    if(message[0] instanceof Array) {
                        // Multiple actions received
                        this.receiveActionBatch(message);
                    } else {
                        // Only one action received
                        this.receiveAction(message);
                    }
                }
            }
        },
    
        receiveAction: function(data) {
            var action = data[0];
            if(this.handlers[action] && _.isFunction(this.handlers[action])) {
                this.handlers[action].call(this, data);
            }
            else {
                console.error("Unknown action : " + action);
            }
        },
    
        receiveActionBatch: function(actions) {
            var self = this;

            _.each(actions, function(action) {
                self.receiveAction(action);
            });
        },
    
        receiveWelcome: function(data) {
            var id = data[1],
                name = data[2],
                x = data[3],
                y = data[4],
                hp = data[5];
                title = data[6]
        
            if(this.welcome_callback) {
                this.welcome_callback(id, name, x, y, hp, title);
            }
        },
    
        receiveMove: function(data) {
            var id = data[1],
                x = data[2],
                y = data[3];
        
            if(this.move_callback) {
                this.move_callback(id, x, y);
            }
        },
    
        receiveLootMove: function(data) {
            var id = data[1], 
                item = data[2];
        
            if(this.lootmove_callback) {
                this.lootmove_callback(id, item);
            }
        },
    
        receiveAttack: function(data) {
            var attacker = data[1], 
                target = data[2];
        
            if(this.attack_callback) {
                this.attack_callback(attacker, target);
            }
        },
    
        receiveSpawn: function(data) {
            var id = data[1],
                kind = data[2],
                x = data[3],
                y = data[4];
        
            if(Types.isItem(kind)) {
                var item = EntityFactory.createEntity(kind, id);
            
                if(this.spawn_item_callback) {
                    this.spawn_item_callback(item, x, y);
                }
            } else if(Types.isChest(kind)) {
                var item = EntityFactory.createEntity(kind, id);
            
                if(this.spawn_chest_callback) {
                    this.spawn_chest_callback(item, x, y);
                }
            } else if(Types.isFieldEffect(kind)) {
                var fieldEffect = EntityFactory.createEntity(kind, id);
            
                if(this.spawn_fieldEffect_callback) {
                    this.spawn_fieldEffect_callback(fieldEffect, x, y);
                }
            } else {
                var name, orientation, target, weapon, armor, title, level;
            
                if(Types.isPlayer(kind)) {
                    name = data[5];
                    orientation = data[6];
                    armor = data[7];
                    weapon = data[8];
                    title = data[9];
                    level = data[10]
                    if(data.length > 11) {
                        target = data[11];
                    }
                }
                else if(Types.isMob(kind)) {
                    orientation = data[5];
                    level = data[6];
                    if(data.length > 7) {
                        target = data[7];
                    }
                }

                var character = EntityFactory.createEntity(kind, id, name);
            
                if(character instanceof Player) {
                    character.weaponName = Types.getKindAsString(weapon);
                    character.spriteName = Types.getKindAsString(armor);
                    character.title = title;
                }

                if(character instanceof Mob || character instanceof Player) {
                    character.level = level;
                }
            
                if(this.spawn_character_callback) {
                    this.spawn_character_callback(character, x, y, orientation, target);
                }
            }
        },
    
        receiveDespawn: function(data) {
            var id = data[1];
        
            if(this.despawn_callback) {
                this.despawn_callback(id);
            }
        },
    
        receiveHealth: function(data) {
            var points = data[1],
                isRegen = false;
        
            if(data[2]) {
                isRegen = true;
            }
        
            if(this.health_callback) {
                this.health_callback(points, isRegen);
            }
        },
    
        receiveChat: function(data) {
            var id = data[1],
                text = data[2];
        
            if(this.chat_callback) {
                this.chat_callback(id, text);
            }
        },
    
        receiveEquipItem: function(data) {
            var id = data[1],
                itemKind = data[2];
        
            if(this.equip_callback) {
                this.equip_callback(id, itemKind);
            }
        },
    
        receiveDrop: function(data) {
            var mobId = data[1],
                id = data[2],
                kind = data[3];
        
            var item = EntityFactory.createEntity(kind, id);
            item.wasDropped = true;
            item.playersInvolved = data[4];
        
            if(this.drop_callback) {
                this.drop_callback(item, mobId);
            }
        },
    
        receiveTeleport: function(data) {
            var id = data[1],
                x = data[2],
                y = data[3];
        
            if(this.teleport_callback) {
                this.teleport_callback(id, x, y);
            }
        },
    
        receiveDamage: function(data) {
            var id = data[1],
                dmg = data[2];
        
            if(this.dmg_callback) {
                this.dmg_callback(id, dmg);
            }
        },
    
        receivePopulation: function(data) {
            var worldPlayers = data[1],
                totalPlayers = data[2];
        
            if(this.population_callback) {
                this.population_callback(worldPlayers, totalPlayers);
            }
        },
    
        receiveKill: function(data) {
            let mobKind = data[1],
                xp = data[2];

        
            if(this.kill_callback) {
                this.kill_callback(mobKind, xp);
            }
        },
    
        receiveList: function(data) {
            data.shift();
        
            if(this.list_callback) {
                this.list_callback(data);
            }
        },
    
        receiveDestroy: function(data) {
            var id = data[1];
        
            if(this.destroy_callback) {
                this.destroy_callback(id);
            }
        },
    
        receiveHitPoints: function(data) {
            var maxHp = data[1];
        
            if(this.hp_callback) {
                this.hp_callback(maxHp);
            }
        },
    
        receiveBlink: function(data) {
            var id = data[1];
        
            if(this.blink_callback) {
                this.blink_callback(id);
            }
        },

        receiveMobDoSpecial: function(data) {
            var id = data[1];
        
            if(this.mobDoSpecial_callback) {
                this.mobDoSpecial_callback(id);
            }
        },

        receiveMobExitCombat: function(data) {
            var id = data[1];
        
            if(this.mobExitCombat_callback) {
                this.mobExitCombat_callback(id);
            }
        },

        receieveQuestComplete: function(data) {
            let questName = data[1],
                endText = data[2],
                xpReward = data[3];
                medal = data[4];

            if (this.questComplete_callback) {
                this.questComplete_callback(questName, endText, xpReward, medal);
            }
        },

        receiveSpawnFloat: function(data) {
            let id = data[1],
                name = data[2],
                x = data[3],
                y = data[4];
        
            if(this.spawnFloat_callback) {
                this.spawnFloat_callback(id, name, x, y);
            }
        },

        receiveDespawnFloat: function(data) {
            let id = data[1];
        
            if(this.despawnFloat_callback) {
                this.despawnFloat_callback(id);
            }
        },
        
        onDispatched: function(callback) {
            this.dispatched_callback = callback;
        },

        onConnected: function(callback) {
            this.connected_callback = callback;
        },
        
        onDisconnected: function(callback) {
            this.disconnected_callback = callback;
        },

        onWelcome: function(callback) {
            this.welcome_callback = callback;
        },

        onSpawnCharacter: function(callback) {
            this.spawn_character_callback = callback;
        },
    
        onSpawnItem: function(callback) {
            this.spawn_item_callback = callback;
        },
    
        onSpawnChest: function(callback) {
            this.spawn_chest_callback = callback;
        },

        onSpawnFieldEffect: function(callback) {
            this.spawn_fieldEffect_callback = callback;
        },

        onDespawnEntity: function(callback) {
            this.despawn_callback = callback;
        },

        onEntityMove: function(callback) {
            this.move_callback = callback;
        },

        onEntityAttack: function(callback) {
            this.attack_callback = callback;
        },
    
        onPlayerChangeHealth: function(callback) {
            this.health_callback = callback;
        },
    
        onPlayerEquipItem: function(callback) {
            this.equip_callback = callback;
        },
    
        onPlayerMoveToItem: function(callback) {
            this.lootmove_callback = callback;
        },
    
        onPlayerTeleport: function(callback) {
            this.teleport_callback = callback;
        },
    
        onChatMessage: function(callback) {
            this.chat_callback = callback;
        },
    
        onDropItem: function(callback) {
            this.drop_callback = callback;
        },
    
        onPlayerDamageMob: function(callback) {
            this.dmg_callback = callback;
        },
    
        onPlayerKillMob: function(callback) {
            this.kill_callback = callback;
        },
    
        onPopulationChange: function(callback) {
            this.population_callback = callback;
        },
    
        onEntityList: function(callback) {
            this.list_callback = callback;
        },
    
        onEntityDestroy: function(callback) {
            this.destroy_callback = callback;
        },
    
        onPlayerChangeMaxHitPoints: function(callback) {
            this.hp_callback = callback;
        },
    
        onItemBlink: function(callback) {
            this.blink_callback = callback;
        },

        onMobDoSpecial: function(callback) {
            this.mobDoSpecial_callback = callback;
        },

        onMobExitCombat: function(callback) {
            this.mobExitCombat_callback = callback;
        },

        onQuestComplete: function(callback) {
            this.questComplete_callback = callback;
        },

        onSpawnFloat: function(callback) {
            this.spawnFloat_callback = callback;
        },

        onDespawnFloat: function(callback) {
            this.despawnFloat_callback = callback;
        },

        sendHello: function(player) {
            this.sendMessage([Types.Messages.HELLO,
                              player.name,
                              Types.getKindFromString(player.getSpriteName()),
                              Types.getKindFromString(player.getWeaponName()),
                              this.sessionId]);
        },

        sendMove: function(x, y) {
            this.sendMessage([Types.Messages.MOVE,
                              x,
                              y]);
        },
    
        sendLootMove: function(item, x, y) {
            this.sendMessage([Types.Messages.LOOTMOVE,
                              x,
                              y,
                              item.id]);
        },
    
        sendAggro: function(mob) {
            this.sendMessage([Types.Messages.AGGRO,
                              mob.id]);
        },
    
        sendAttack: function(mob) {
            this.sendMessage([Types.Messages.ATTACK,
                              mob.id]);
        },
    
        sendHit: function(mob) {
            this.sendMessage([Types.Messages.HIT,
                              mob.id]);
        },
    
        sendHurt: function(mob) {
            this.sendMessage([Types.Messages.HURT,
                              mob.id]);
        },
    
        sendChat: function(text) {
            this.sendMessage([Types.Messages.CHAT,
                              text]);
        },
    
        sendLoot: function(item) {
            this.sendMessage([Types.Messages.LOOT,
                              item.id]);
        },
    
        sendTeleport: function(x, y) {
            this.sendMessage([Types.Messages.TELEPORT,
                              x,
                              y]);
        },
    
        sendWho: function(ids) {
            ids.unshift(Types.Messages.WHO);
            this.sendMessage(ids);
        },
    
        sendZone: function() {
            this.sendMessage([Types.Messages.ZONE]);
        },
    
        sendOpen: function(chest) {
            this.sendMessage([Types.Messages.OPEN,
                              chest.id]);
        },
    
        sendCheck: function(id) {
            this.sendMessage([Types.Messages.CHECK,
                              id]);
        },

        sendTrigger: function(id, activated) {
            this.sendMessage([Types.Messages.TRIGGER, id, activated]);
        },

        sendEquipInventory: function(kind, nftId) {
            this.sendMessage([Types.Messages.EQUIP_INVENTORY,
                              kind,
                              nftId]);
        },

        sendFishingResult: function(result) {
            this.sendMessage([Types.Messages.FISHINGRESULT,
                              result]);
        }
    });
    
    return GameClient;
});