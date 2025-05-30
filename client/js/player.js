
define(['character', 'exceptions', '../../shared/js/gametypes'], function(Character, Exceptions) {

    var Player = Character.extend({
        MAX_LEVEL: 10,
    
        init: function(id, name, kind) {
            this._super(id, kind);
        
            this.name = name;
        
            // Renderer
     		this.nameOffsetY = -10;
        
            // sprites
            this.spriteName = "clotharmor";
            this.weaponName = "sword1";
        
            // modes
            this.isLootMoving = false;
            this.isSwitchingWeapon = true;
            this.level = null;
            this.currentProjectileType = null;
        },
    
        loot: function(item) {
            if(item) {
                var rank, currentRank, msg, currentArmorName;
            
                if(this.currentArmorSprite) {
                    currentArmorName = this.currentArmorSprite.name;
                } else {
                    currentArmorName = this.spriteName;
                }

                if(item.type === "armor") {
                    rank = Types.getArmorRank(item.kind);
                    currentRank = Types.getArmorRank(Types.getKindFromString(currentArmorName));
                    msg = "You are wearing a better armor";
                } else if(item.type === "weapon") {
                    rank = Types.getWeaponRank(item.kind);
                    currentRank = Types.getWeaponRank(Types.getKindFromString(this.weaponName));
                    msg = "You are wielding a better weapon";
                }

                if(rank && currentRank) {
                    if(rank === currentRank) {
                        throw new Exceptions.LootException("You already have this "+item.type);
                    } else if(rank <= currentRank) {
                        throw new Exceptions.LootException(msg);
                    }
                }
            
                console.log('Player '+this.id+' has looted '+item.id);
                item.onLoot(this);
            }
        },
    
        /**
         * Returns true if the character is currently walking towards an item in order to loot it.
         */
        isMovingToLoot: function() {
            return this.isLootMoving;
        },
    
        getSpriteName: function() {
            return this.spriteName;
        },
    
        setSpriteName: function(name) {
            if(name !== null) {
                this.spriteName = name;
            }
        },
        
        getArmorName: function() {
            var sprite = this.getArmorSprite();
            return sprite.id;
        },
        
        getArmorSprite: function() {
            if(this.invincible) {
                return this.currentArmorSprite;
            } else {
                return this.sprite;
            }
        },
    
        getWeaponName: function() {
            return this.weaponName;
        },
    
        setWeaponName: function(name) {
            if(name !== null) {
                this.weaponName = name;
            }
        },
    
        hasWeapon: function() {
            return this.weaponName !== null;
        },
    
        switchWeapon: function(newWeaponName, blinkCount) {
            if(blinkCount === undefined) {
                blinkCount = 14;
            }
            var count = blinkCount,
                value = false, 
                self = this;
        
            var toggle = function() {
                value = !value;
                return value;
            };
        
            if(newWeaponName !== this.getWeaponName()) {
                if(this.isSwitchingWeapon) {
                    clearInterval(blanking);
                }
            
                this.switchingWeapon = true;
                var blanking = setInterval(function() {
                    if(toggle()) {
                        self.setWeaponName(newWeaponName);
                    } else {
                        self.setWeaponName(null);
                    }

                    count -= 1;
                    if(count <= 1) {
                        clearInterval(blanking);
                        self.switchingWeapon = false;
                        self.setWeaponName(newWeaponName);
                        
                        if(self.switch_callback) {
                            self.switch_callback();
                        }
                    }
                }, 90);
            }
        },
    
        switchArmor: function(newArmorSprite) {
            var count = 14, 
                value = false, 
                self = this;
        
            var toggle = function() {
                value = !value;
                return value;
            };
        
            if(newArmorSprite && newArmorSprite.id !== this.getSpriteName()) {
                if(this.isSwitchingArmor) {
                    clearInterval(blanking);
                }
            
                this.isSwitchingArmor = true;
                self.setSprite(newArmorSprite);
                self.setSpriteName(newArmorSprite.id);
                var blanking = setInterval(function() {
                    self.setVisible(toggle());

                    count -= 1;
                    if(count === 1) {
                        clearInterval(blanking);
                        self.isSwitchingArmor = false;
                    
                        if(self.switch_callback) {
                            self.switch_callback();
                        }
                    }
                }, 90);
            }
        },
        
        onArmorLoot: function(callback) {
            this.armorloot_callback = callback;
        },
    
        onSwitchItem: function(callback) {
            this.switch_callback = callback;
        },
        
        onInvincible: function(callback) {
            this.invincible_callback = callback;
        },

        startInvincibility: function() {
            if(!this.invincible) {
                this.invincible = true;
                if (this.invincible_callback) { // only the player itself has invincible callback (UI changes)
                    this.invincible_callback();
                }      
            }
        },
    
        stopInvincibility: function() {
            if(this.invincible) {
                this.invincible = false;
                if (this.invincible_callback) { // only the player itself has invincible callback (UI changes)
                    this.invincible_callback();
                }
            }
        },

        getOneStepFurther: function (gX, gY){
            switch(this.getOrientationTo({gridX: gX, gridY: gY})) {
                case Types.Orientations.UP:
                    pos = {gridX: gX, gridY: gY - 1}; break;
                case Types.Orientations.DOWN:
                    pos = {gridX: gX, gridY: gY + 1}; break;
                case Types.Orientations.LEFT:
                    pos = {gridX: gX - 1, gridY: gY}; break;
                case Types.Orientations.RIGHT:
                    pos = {gridX: gX + 1, gridY: gY}; break;
            }

            return pos;
        },

        canAttack: function(time) {
            if (Types.isWeapon(Types.getKindFromString(this.weaponName))){
                return this._super(time);
            }

            return false;
        },

        canReachTarget: function(target) {
            return this._super(target) || (
                        this.hasTarget() &&
                        Types.isRangedWeapon(Types.getKindFromString(this.weaponName)) &&
                        this.isNear(this.target, this.getWeaponRange())
                    );
        },

        getWeaponRange: function() {
            if(this.currentProjectileType === 'short') {
                return 6;
            }

            if(this.currentProjectileType === 'long') {
                return 12;
            }

            return 9;
        }
    });

    return Player;
});