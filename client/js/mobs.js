
define(['mob', 'timer'], function(Mob, Timer) {

    var Mobs = {
        Rat: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.RAT);
                this.moveSpeed = 350;
                this.idleSpeed = 700;
                this.shadowOffsetY = -2;
                this.isAggressive = false;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),

        Skeleton: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SKELETON);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 800;
                this.shadowOffsetY = 1;
                this.setAttackRate(1300);
            }
        }),

        Skeleton2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SKELETON2);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 800;
                this.walkSpeed = 200;
                this.shadowOffsetY = 1;
                this.setAttackRate(1300);
            }
        }),

        Spectre: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SPECTRE);
                this.moveSpeed = 150;
                this.atkSpeed = 50;
                this.idleSpeed = 200;
                this.walkSpeed = 200;
                this.shadowOffsetY = 1;
                this.setAttackRate(900);
            }
        }),
        
        Deathknight: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.DEATHKNIGHT);
                this.atkSpeed = 50;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 450;
        		this.setAttackRate(800);
        		this.aggroRange = 3;
            },
            
            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Goblin: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.GOBLIN);
                this.moveSpeed = 150;
                this.atkSpeed = 60;
                this.idleSpeed = 600;
                this.setAttackRate(700);
                this.aggroRange = 2;
            }
        }),

        Ogre: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.OGRE);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 600;
                this.aggroRange = 5;
            }
        }),

        Crab: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.CRAB);
                this.moveSpeed = 200;
                this.atkSpeed = 40;
                this.idleSpeed = 500;
            }
        }),

        Snake: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SNAKE);
                this.moveSpeed = 200;
                this.atkSpeed = 40;
                this.idleSpeed = 250;
                this.walkSpeed = 100;
                this.shadowOffsetY = -4;
                this.aggroRange = 5;
            }
        }),

        Eye: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.EYE);
                this.moveSpeed = 200;
                this.atkSpeed = 40;
                this.idleSpeed = 50;
            }
        }),

        Bat: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BAT);
                this.moveSpeed = 120;
                this.atkSpeed = 90;
                this.idleSpeed = 90;
                this.walkSpeed = 85;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        Wizard: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.WIZARD);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 150;
            }
        }),

        Boss: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BOSS);
                this.moveSpeed = 300;
                this.atkSpeed = 50;
                this.idleSpeed = 400;
                this.atkRate = 2000;
                this.attackCooldown = new Timer(this.atkRate);
        		this.aggroRange = 3;
            },
            
            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Slime: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SLIME);
                this.moveSpeed = 250;
                this.idleSpeed = 700;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),

        Redslime: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.REDSLIME);
                this.moveSpeed = 250;
                this.idleSpeed = 700;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),

        Kingslime: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.KINGSLIME);
                this.moveSpeed = 250;
                this.idleSpeed = 700;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),       
        
        Silkshade: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SILKSHADE);
                this.moveSpeed = 500;
                this.idleSpeed = 700;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),         

        Spider: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SPIDER);
                this.moveSpeed = 350;
                this.idleSpeed = 700;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),

        Minimag: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.MINIMAG);
                this.idleSpeed = 1000;
                this.walkSpeed = 125;
                this.atkSpeed = 75;
                this.moveSpeed = 150;
                this.aggroRange = 3;
        		this.setAttackRate(1000);
                this.deathAnimated = true;
            }
        }),

        Megamag: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.MEGAMAG);
                this.idleSpeed = 1000;
                this.restoreDefaultMovement();
                this.aggroRange = 4;
                this.atkSpeed = 100;
        		this.setAttackRate(2000);
                this.deathAnimated = true;
            },

            restoreDefaultMovement: function () {
                this.moveSpeed = 250;
                this.walkSpeed = 150;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            },

            doSpecial: function() {
                let self=this;

                self.moveSpeed = 100; // Charge at the target
                self.walkSpeed = 75; 
                if (self.hasTarget()){
                    self.target.root();
                }
                
                setTimeout(function () {
                    self.target.unroot();

                    self.root();
                    self.animationLock = true; // Prevent special animation from being cancelled by movement
                    self.animate("special", 150, 1, function () {
                        self.animationLock = false;
                        self.unroot();
                        self.restoreDefaultMovement();
                        self.idle();
                    });
                }, 2000); // Change this duration also in server/worldserver.js      
            }
        }) 
    };
    return Mobs;
});
