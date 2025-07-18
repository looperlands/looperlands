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
                this.setAttackRate(1200);
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
                this.aggroRange = 3;
                this.setAttackRate(1200);
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
                this.title = "BOSS";
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
                this.idleSpeed = 100;
                this.atkSpeed = 100;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),

        Glacialord: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.GLACIALORD);
                this.moveSpeed = 250;
                this.idleSpeed = 100;
                this.atkSpeed = 100;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
                this.title = "EVERFROST GIANT";
            }
        }),
        Nightharrow: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NIGHTHARROW);
                this.moveSpeed = 250;
                this.idleSpeed = 400;
                this.atkSpeed = 100;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
                this.title = "NIGHT KING";
            }
        }),
        Boar: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BOAR);
                this.moveSpeed = 250;
                this.idleSpeed = 450;
                this.atkSpeed = 100;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),
        Gnashling: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.GNASHLING);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 100;            
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),   
        Barrel: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BARREL);
                this.moveSpeed = 100;
                this.idleSpeed = 100;
                this.atkSpeed = 100;            
                this.shadowOffsetY = -2;
                this.isAggressive = false;
                this.deathAnimated = true;
            }
        }),             
        Grizzlefang: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.GRIZZLEFANG);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 100;            
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),        


        Wildgrin: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.WILDGRIN);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 100;              
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),

        Thudlord: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.THUDLORD);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 100;              
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
                this.title = "LORD OF THUDD";
            }
        }),

        Loomleaf: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.LOOMLEAF);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 50;                
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
                this.title = "THE WATCHER";
            }
        }),        

        Redslime: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.REDSLIME);
                this.moveSpeed = 250;
                this.idleSpeed = 100;
                this.atkSpeed = 100;                
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),

        Alaric: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.ALARIC);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),


        Blackdog: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BLACKDOG);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),   
        Turtle: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.TURTLE);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),    
        Browndog: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BROWNDOG);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),   

        Tabbycat: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.TABBYCAT);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),   
        Oablackcat: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.OABLACKCAT);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),   
        Whitedog: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.WHITEDOG);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }), 

        Brownspotdog: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BROWNSPOTDOG);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }), 

        Villager1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER1);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
     

        Villager2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER2);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Villager3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER3);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER4);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager5: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER5);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager6: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER6);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager7: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER7);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager8: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER8);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager9: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER9);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager10: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER10);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager11: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER11);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager12: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER12);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager13: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER13);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager14: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER14);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager15: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER15);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager16: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER16);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager17: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER17);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager18: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER18);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager19: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER19);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager20: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER20);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager21: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER21);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager22: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER22);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager23: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER23);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager24: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER24);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager25: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER25);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager26: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER26);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager27: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER27);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager28: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER28);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Villager29: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER29);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Fvillager1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER1);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Fvillager2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER2);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Fvillager3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER3);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER4);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager5: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER5);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager6: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER6);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager7: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER7);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager8: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER8);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager9: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER9);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager10: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER10);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager11: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER11);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager12: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER12);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager13: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER13);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager14: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER14);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager15: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER15);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager16: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER16);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager17: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER17);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager18: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER18);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager19: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER19);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager20: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER20);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager21: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER21);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager22: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER22);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager23: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER23);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager24: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER24);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager25: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER25);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager26: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER26);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager27: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER27);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager28: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER28);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager29: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER29);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager30: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER30);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),
        Fvillager31: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FVILLAGER31);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),


        Jayce: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.JAYCE);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Orlan: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.ORLAN);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Kingslime: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.KINGSLIME);
                this.moveSpeed = 250;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;                
                this.isAggressive = true;
                this.aggroRange = 1;
                this.deathAnimated = true;
                this.title = "KING OF SLIME";
            }
        }),       
        
        Silkshade: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SILKSHADE);
                this.moveSpeed = 500;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.atkSpeed = 100;
                this.aggroRange = 3;
                this.deathAnimated = true;
                this.title = "FANG QUEEN";
            }
        }),         

        Spider: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SPIDER);
                this.moveSpeed = 350;
                this.idleSpeed = 250;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        Gloomforged: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.GLOOMFORGED);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 400;
                this.shadowOffsetY = 1;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.setAttackRate(1200);
            }
        }),

        Fangwing: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FANGWING);
                this.moveSpeed = 350;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),

        Arachweave: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.ARACHWEAVE);
                this.moveSpeed = 350;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),

        Crystolith: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.CRYSTOLITH);
                this.moveSpeed = 350;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),
        Shiverrock: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SHIVERROCK);
                this.moveSpeed = 350;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),
        ShiverrockII: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SHIVERROCKII);
                this.moveSpeed = 350;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),
        ShiverrockIII: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SHIVERROCKIII);
                this.moveSpeed = 350;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),
        Stoneguard: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.STONEGUARD);
                this.moveSpeed = 350;
                this.idleSpeed = 100;
                this.shadowOffsetY = -2;
                this.atkSpeed = 100;
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
                this.title = "BOSS";
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
                let rootTarget;

                if (self.hasTarget()){
                    rootTarget = self.target;
                    rootTarget.root();
                }
                
                function smashAoe(unrootTarget){
                    if (unrootTarget) {
                    unrootTarget.unroot();
                    }

                    self.root();
                    self.animationLock = true; // Prevent special animation from being cancelled by movement
                    self.animate("special", 150, 1, function () {
                        self.animationLock = false;
                        self.unroot();
                        self.restoreDefaultMovement();
                        self.idle();
                    });
                }

                setTimeout(function () {
                    smashAoe(rootTarget);
                }, 2000); // Change this duration also in server/worldserver.js      
            }
        }),

        SeaCreature: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SEACREATURE);
                this.idleSpeed = 250;
                this.restoreDefaultMovement();
                this.aggroRange = 0;
                this.atkSpeed = 100;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.deathSpeed = 350;
                this.title = "";
            },

            restoreDefaultMovement: function () {
                this.moveSpeed = 0;
                this.walkSpeed = 0;
            },

            idle: function(orientation) {
                this._super(Types.Orientations.UP);
            },

            moveTo_: function(x, y, callback) {
                return;
            },
        }),


        Tentacle: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.TENTACLE);
                this.idleSpeed = 400;
                this.restoreDefaultMovement();
                this.aggroRange = 1;
                this.atkSpeed = 100;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.title = "";
            },

            restoreDefaultMovement: function () {
                this.moveSpeed = 0;
                this.walkSpeed = 0;
            },

            idle: function(orientation) {
                this._super(Types.Orientations.UP);
            },

            moveTo_: function(x, y, callback) {
                return;
            },
        }),

        Tentacle2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.TENTACLE2);
                this.idleSpeed = 400;
                this.restoreDefaultMovement();
                this.aggroRange = 1;
                this.atkSpeed = 100;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.title = "";
            },

            restoreDefaultMovement: function () {
                this.moveSpeed = 0;
                this.walkSpeed = 0;
            },

            idle: function(orientation) {
                this._super(Types.Orientations.UP);
            },

            moveTo_: function(x, y, callback) {
                return;
            },
        }),
        
        Cobchicken: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCHICKEN);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobcow: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCOW);
                this.idleSpeed = 500;
                this.walkSpeed = 350;
                this.moveSpeed = 500;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobpig: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBPIG);
                this.idleSpeed = 500;
                this.walkSpeed = 300;
                this.moveSpeed = 400;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobgoat: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBGOAT);
                this.idleSpeed = 500;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Ghostie: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.GHOSTIE);
                this.idleSpeed = 500;
                this.walkSpeed = 200;
                this.atkSpeed = 100;
                this.moveSpeed = 250;
                this.aggroRange = 3;
        		this.setAttackRate(1250);
                this.deathAnimated = true;
                this.isFriendly = true;
                this.setVisible(false);
                this.aggroMessage = "Boo!";
            },

            appear: function() {
                this.isFriendly = false;
                this.setVisible(true);
                this.fadeIn(new Date().getTime());
            },

            breakFriendly: function(player) {
                if (this.isFriendly && this.isNear(player, this.aggroRange - 1) && !this.exitingCombat) {
                    this.appear()
                    return true;
                }
                return false;
            },

            joinCombat: function() {
                this._super();
                if (this.inCombat && this.isFriendly) {
                    this.appear();
                }
            },

            exitCombat: function() {
                let self = this;
                this.isFriendly = true;
                this.inCombat = false;
                this.exitingCombat = setTimeout(function() {
                    self.setVisible(false);
                    self.exitingCombat = null;
                }, 1500)  
            }
        }),

        Cobslimered: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMERED);
                this.moveSpeed = 250;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        Cobslimeyellow: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMEYELLOW);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 2;
            }
        }),

        Cobslimeblue: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMEBLUE);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 1;
            }
        }),

        Cobslimepurple: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMEPURPLE);
                this.moveSpeed = 360;
                this.atkSpeed = 110;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        Cobslimegreen: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMEGREEN);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        Cobslimepink: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMEPINK);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        Cobslimecyan: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMECYAN);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        Cobslimemint: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMEMINT);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        Cobslimeking: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBSLIMEKING);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.aggroRange = 4;
                this.deathAnimated = true;
                this.title = "BOSS";
            },

            doSpecial: function() {
                let self=this;

                self.animationLock = true; // Prevent special animation from being cancelled by movement
                self.animate("special", 150, 1, function () {
                        self.animationLock = false;
                        self.idle();
                    });
            },
        }),

        Cobcat: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCAT);
                this.idleSpeed = 333;
                this.walkSpeed = 250;
                this.moveSpeed = 300;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobcatorange: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCATORANGE);
                this.idleSpeed = 333;
                this.walkSpeed = 250;
                this.moveSpeed = 300;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobcatbrown: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCATBROWN);
                this.idleSpeed = 333;
                this.walkSpeed = 250;
                this.moveSpeed = 300;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobyorkie: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBYORKIE);
                this.idleSpeed = 500;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        Cobdirt: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBDIRT);
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobhay: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBHAY);
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobhaytwo: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBHAYTWO);
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobincubator: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBINCUBATOR);
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        Cobcoblin: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCOBLIN);
                this.moveSpeed = 200;
                this.walkSpeed = 200;
                this.atkSpeed = 75;
                this.idleSpeed = 600;
                this.setAttackRate(700);
                this.aggroRange = 2;
            }
        }),

        Cobcobane: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCOBANE);
                this.moveSpeed = 225;
                this.walkSpeed = 225;
                this.atkSpeed = 75;
                this.idleSpeed = 600;
                this.setAttackRate(900);
                this.aggroRange = 3;
            }
        }),

        Cobogre: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBOGRE);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 600;
                this.aggroRange = 5;
                this.title = "SHREK!?";
            }
        }),

        //mycupbloody

        BORAC: Mob.extend({ 
            init: function(id) { 
                this._super(id, Types.Entities.BORAC); 
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 400;
                this.walkSpeed = 200;
                this.aggroRange = 3;
                this.setAttackRate(700);
            }
        }),
       
        INFERNOTH: Mob.extend({ 
            init: function(id) {
                this._super(id, Types.Entities.INFERNOTH); 
                this.moveSpeed = 250;
                this.atkSpeed = 250; 
                this.idleSpeed = 800;
                this.aggroRange = 2;
                this.walkSpeed = 250;
                this.title = "Dragon King";
            }
        }),

        WINGELLA: Mob.extend({ 
            init: function(id) { 
                this._super(id, Types.Entities.WINGELLA); 
                this.moveSpeed = 350; 
                this.atkSpeed = 100; 
                this.idleSpeed = 620; 
                this.shadowOffsetY = 1; 
                this.aggroRange = 3;
            }
        }),

        GAUNTER: Mob.extend({ 
            init: function(id) { 
                this._super(id, Types.Entities.GAUNTER); 
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 800;
                this.walkSpeed = 200;
                this.shadowOffsetY = 1;
                this.aggroRange = 3;
                this.setAttackRate(800);
            }
        }),
        
        MASTROM: Mob.extend({ 
            init: function(id) { 
                this._super(id, Types.Entities.MASTROM); 
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 800;
                this.walkSpeed = 200;
                this.shadowOffsetY = 1;
                this.aggroRange = 3;
                this.setAttackRate(500);
            }
        }),

        VALKYM: Mob.extend({ 
            init: function(id) { 
                this._super(id, Types.Entities.VALKYM); 
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 800;
                this.walkSpeed = 200;
                this.shadowOffsetY = 1;
                this.aggroRange = 3;
                this.setAttackRate(800);
            }
        }),

        //m88n Mobs
        balloondogb: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONDOGB);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        balloondogy: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONDOGY);
                this.moveSpeed = 250;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        balloondoga: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONDOGA);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        balloondogv: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONDOGV);
                this.moveSpeed = 150;
                this.atkSpeed = 200;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        balloondogp: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONDOGP);
                this.moveSpeed = 150;
                this.atkSpeed = 200;
                this.idleSpeed = 750;
                this.setAttackRate(750);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        balloondogg: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONDOGG);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        balloonhotdogr: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONHOTDOGR);
                this.moveSpeed = 300;
                this.atkSpeed = 250;
                this.idleSpeed = 750;
                this.setAttackRate(750);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        balloongiraffeo: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.BALLOONGIRAFFEO);
                this.moveSpeed = 300;
                this.atkSpeed = 250;
                this.idleSpeed = 750;
                this.setAttackRate(500);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nbigchungus: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBIGCHUNGUS);
                this.moveSpeed = 300;
                this.atkSpeed = 250;
                this.idleSpeed = 750;
                this.setAttackRate(500);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.title = "Happy Easter!";
            }
        }),

        m88noctopussy: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NOCTOPUSSY);
                this.moveSpeed = 300;
                this.atkSpeed = 250;
                this.idleSpeed = 750;
                this.setAttackRate(500);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.title = "Leave me alone!";
            }
        }),

        sharkboss: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.SHARKBOSS);
                this.moveSpeed = 100;
                this.idleSpeed = 100;
                this.setAttackRate(500);
                this.atkSpeed = 50;                
                this.isAggressive = true;
                this.aggroRange = 4;
                this.deathAnimated = true;
                this.title = "Shark!";
            }
        }),

        m88njaws: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NJAWS);
                this.moveSpeed = 100;
                this.idleSpeed = 100;
                this.setAttackRate(300);
                this.atkSpeed = 30;                
                this.isAggressive = true;
                this.aggroRange = 6;
                this.deathAnimated = true;
                this.title = "Shark!";
            }
        }),

        m88nhermie: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NHERMIE);
                this.moveSpeed = 350;
                this.idleSpeed = 700;
                this.shadowOffsetY = -2;
                this.isAggressive = false;
                this.aggroRange = 1;
                this.deathAnimated = true;
            }
        }),

        m88nmrcrab: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMRCRAB);
                this.moveSpeed = 200;
                this.atkSpeed = 40;
                this.idleSpeed = 500;
                this.deathAnimated = true;
            }
        }),

        roachclip: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.ROACHCLIP);
                this.moveSpeed = 150;
                this.atkSpeed = 60;
                this.idleSpeed = 600;
                this.setAttackRate(700);
                this.aggroRange = 2;
                this.deathAnimated = true;
            }
        }),

        m88nnightmaremonsterb: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NNIGHTMAREMONSTERB);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nnightmaremonstery: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NNIGHTMAREMONSTERY);
                this.moveSpeed = 250;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nnightmaremonstera: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NNIGHTMAREMONSTERA);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nnightmaremonsterv: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NNIGHTMAREMONSTERV);
                this.moveSpeed = 150;
                this.atkSpeed = 200;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nnightmaremonsterp: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NNIGHTMAREMONSTERP);
                this.moveSpeed = 150;
                this.atkSpeed = 200;
                this.idleSpeed = 750;
                this.setAttackRate(750);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nnightmaremonsterg: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NNIGHTMAREMONSTERG);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nboner: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBONER);
                this.moveSpeed = 300;
                this.atkSpeed = 250;
                this.idleSpeed = 750;
                this.setAttackRate(500);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nshortsqueeze: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NSHORTSQUEEZE);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nconepooper: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NCONEPOOPER);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nfishlips: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHLIPS);
                this.atkSpeed = 50;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 420;
        		this.setAttackRate(800);
                this.deathAnimated = true;
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

        m88nsushi: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NSUSHI);
                this.atkSpeed = 50;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 420;
        		this.setAttackRate(800);
                this.deathAnimated = true;
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

        m88nsashimi: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NSASHIMI);
                this.atkSpeed = 50;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 420;
        		this.setAttackRate(800);
                this.deathAnimated = true;
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

        m88nufo1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NUFO1);
                this.atkSpeed = 420;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 220;
        		this.setAttackRate(800);
                this.deathAnimated = true;
        		this.aggroRange = 8;
            },
            
            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nufo2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NUFO2);
                this.atkSpeed = 420;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 220;
        		this.setAttackRate(800);
                this.deathAnimated = true;
        		this.aggroRange = 8;
            },
            
            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nufo3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NUFO3);
                this.atkSpeed = 420;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 220;
        		this.setAttackRate(800);
                this.deathAnimated = true;
        		this.aggroRange = 8;
            },
            
            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nufo4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NUFO4);
                this.atkSpeed = 420;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 220;
        		this.setAttackRate(800);
                this.deathAnimated = true;
        		this.aggroRange = 8;
            },
            
            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmine: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMINE);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbtcmine: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBTCMINE);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmeathook: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMEATHOOK);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88npoisonfrog1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPOISONFROG1);
                this.moveSpeed = 420;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 2;
            }
        }),

        m88npoisonfrog2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPOISONFROG2);
                this.moveSpeed = 420;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 2;
            }
        }),

        m88npoisonfrog3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPOISONFROG3);
                this.moveSpeed = 420;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 2;
            }
        }),

        m88npoisonfrog4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPOISONFROG4);
                this.moveSpeed = 420;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 2;
            }
        }),

        m88npoisonfrog5: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPOISONFROG5);
                this.moveSpeed = 420;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 2;
            }
        }),

        m88nzombieboo: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NZOMBIEBOO);
                this.moveSpeed = 220;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 2;
            }
        }),

        m88nsaw: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NSAW);
                this.atkSpeed = 420;
        		this.moveSpeed = 220;
        		this.walkSpeed = 100;
        		this.idleSpeed = 220;
        		this.setAttackRate(800);
                this.deathAnimated = true;
        		this.aggroRange = 8;
            },
            
            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nhotwing: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NHOTWING);
                this.moveSpeed = 300;
                this.atkSpeed = 250;
                this.idleSpeed = 750;
                this.setAttackRate(800);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 1;
                this.title = "Leave me alone!";
            }
        }),

        m88ntrainer: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTRAINER);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ntrainer2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTRAINER2);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ntrainer3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTRAINER3);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ntrainer4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTRAINER4);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nzombietrash: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NZOMBIETRASH);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ncow: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NCOW);
                this.moveSpeed = 420;
        		this.walkSpeed = 420;
        		this.idleSpeed = 420;
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ntree: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTREE);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nthewarden: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTHEWARDEN);
                this.moveSpeed = 100;
                this.idleSpeed = 100;
                this.setAttackRate(500);
                this.atkSpeed = 50;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nkennyclown: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NKENNYCLOWN);
                this.isAggressive = false;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nnancyclown: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NNANCYCLOWN);
                this.isAggressive = false;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88njimmyclown: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NJIMMYCLOWN);
                this.isAggressive = false;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nheadlessonesie: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NHEADLESSONESIE);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                //this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nheadlessskeleton: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NHEADLESSSKELETON);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                //this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nghostpumpkin: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NGHOSTPUMPKIN);
                this.moveSpeed = 300;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                //this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        m88nturkey: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTURKEY);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nicecrab: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NICECRAB);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nelf: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NELF);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                //this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nelf2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NELF2);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                //this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88nsnowmobile: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NSNOWMOBILE);
                this.moveSpeed = 200;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                //this.deathAnimated = true;
                this.isAggressive = true;
                this.aggroRange = 4;
            }
        }),

        m88npinataballoons: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPINATABALLOONS);
                this.deathAnimated = true;
                this.isAggressive = false;
                this.nameless = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabymonkey: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYMONKEY);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabychimp: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYCHIMP);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabyape: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYAPE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabypenguin: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYPENGUIN);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabyturtle: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYTURTLE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndaddyape: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDADDYAPE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndaddypenguin: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDADDYPENGUIN);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndaddyturtle: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDADDYTURTLE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nparrot: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPARROT);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ntoucan: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTOUCAN);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nseal: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NSEAL);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nwalrus: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NWALRUS);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbunnyblue: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBUNNYBLUE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbunnypink: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBUNNYPINK);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbunnyyellow: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBUNNYYELLOW);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbunnywhite: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBUNNYWHITE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nkittentabby: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NKITTENTABBY);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88npuppyyorkie: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NPUPPYYORKIE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ntigercub: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTIGERCUB);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabyduck: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYDUCK);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabypig: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYPIG);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nflamingo: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFLAMINGO);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nfrog: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFROG);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ngoat: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NGOAT);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nswan: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NSWAN);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nvulture: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NVULTURE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmagiccarpet: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMAGICCARPET);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndinor: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDINOR);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndinow: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDINOW);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndinob: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDINOB);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndinog: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDINOG);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nlion: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NLION);
                this.idleSpeed = 840;
                this.walkSpeed = 450;
                this.moveSpeed = 500;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ntiger: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NTIGER);
                this.idleSpeed = 840;
                this.walkSpeed = 450;
                this.moveSpeed = 500;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ncamel: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NCAMEL);
                this.idleSpeed = 840;
                this.walkSpeed = 450;
                this.moveSpeed = 500;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nflybutterfly: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFLYBUTTERFLY);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ndaddybearbrown: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NDADDYBEARBROWN);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nfishy: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHY);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nfishyb: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHYB);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nfishyc: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHYC);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nfishyd: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHYD);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nfishye: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHYE);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nfishyf: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHYF);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nfishyg: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHYG);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nfishyh: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NFISHYH);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            }
        }),

        m88nbabyyoda1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYYODA1);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nbabyyoda2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NBABYYODA2);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nreindeer: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NREINDEER);
                this.idleSpeed = 420;
                this.walkSpeed = 225;
                this.moveSpeed = 250;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        //m88n Mob Nexans
        nexan1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN1);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN2);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN3);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan6: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN6);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan7: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN7);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan8: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN8);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan9: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN9);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan21: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN21);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan22: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN22);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan23: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN23);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan24: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN24);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan25: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN25);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan26: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN26);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan27: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN27);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan30: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN30);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88njeeves: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NJEEVES);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan49: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN49);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan50: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN50);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan51: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN51);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan52: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN52);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan53: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN53);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexan54: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXAN54);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmermaid1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAID1);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmermaid2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAID2);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmermaid3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAID3);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmermaid4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAID4);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmermaid5: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAID5);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmerman1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAN1);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmerman2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAN2);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmerman3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAN3);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmerman4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAN4);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nmerman5: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NMERMAN5);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nastronaut2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NASTRONAUT2);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88nastronaut3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NASTRONAUT3);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexanzombie1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXANZOMBIE1);
                this.idleSpeed = 420;
                this.walkSpeed = 250;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        m88ngrimreaper: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.M88NGRIMREAPER);
                this.idleSpeed = 420;
                this.walkSpeed = 420;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        nexanhazmat1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEXANHAZMAT1);
                this.idleSpeed = 420;
                this.walkSpeed = 420;
                this.moveSpeed = 333;
                this.isFriendly = true;
            },

            idle: function(orientation) {
                if(!this.hasTarget()) {
                    this._super(Types.Orientations.DOWN);
                } else {
                    this._super(orientation);
                }
            }
        }),

        //Short Destroyers
        lateflea: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.LATEFLEA);
                this.moveSpeed = 100;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        wolfboss: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.WOLFBOSS);
                this.moveSpeed = 200;
                this.idleSpeed = 300;
                this.atkSpeed = 50;  
                this.shadowOffsetY = -3;              
                this.isAggressive = true;
                this.aggroRange = 3;
                this.title = "I don't want to grow up!";
            }
        }),

        fleaboss: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.FLEABOSS);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 50;  
                this.shadowOffsetY = -3;              
                this.isAggressive = true;
                this.aggroRange = 3;
            }
        }),

        horde1: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.HORDE1);
                this.moveSpeed = 100;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),
        
        horde2: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.HORDE2);
                this.moveSpeed = 100;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),
        
        horde3: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.HORDE3);
                this.moveSpeed = 100;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        horde4: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.HORDE4);
                this.moveSpeed = 100;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

        horde5: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.HORDE5);
                this.moveSpeed = 100;
                this.atkSpeed = 100;
                this.idleSpeed = 750;
                this.setAttackRate(1000);
                this.deathAnimated = true;
                this.aggroRange = 3;
            }
        }),

       cobWalkingNpc1: Mob.extend({
           init: function(id) {
               this._super(id, Types.Entities.COBWALKINGNPC1);
               this.idleSpeed = 500;
               this.walkSpeed = 250;
               this.moveSpeed = 333;
               this.isFriendly = true;
           },

           idle: function(orientation) {
               if(!this.hasTarget()) {
                   this._super(Types.Orientations.DOWN);
                } else {
                   this._super(orientation);
               }
            }
       }),

       cobWalkingNpc2: Mob.extend({
           init: function(id) {
               this._super(id, Types.Entities.COBWALKINGNPC2);
               this.idleSpeed = 500;
               this.walkSpeed = 250;
               this.moveSpeed = 333;
               this.isFriendly = true;
           },

           idle: function(orientation) {
               if(!this.hasTarget()) {
                   this._super(Types.Orientations.DOWN);
                } else {
                   this._super(orientation);
               }
            }
       }),

       cobWalkingNpc3: Mob.extend({
           init: function(id) {
               this._super(id, Types.Entities.COBWALKINGNPC3);
               this.idleSpeed = 500;
               this.walkSpeed = 250;
               this.moveSpeed = 333;
               this.isFriendly = true;
           },

           idle: function(orientation) {
               if(!this.hasTarget()) {
                   this._super(Types.Orientations.DOWN);
                } else {
                   this._super(orientation);
               }
            }
       }),

       cobWalkingNpc4: Mob.extend({
           init: function(id) {
               this._super(id, Types.Entities.COBWALKINGNPC4);
               this.idleSpeed = 500;
               this.walkSpeed = 250;
               this.moveSpeed = 333;
               this.isFriendly = true;
           },

           idle: function(orientation) {
               if(!this.hasTarget()) {
                   this._super(Types.Orientations.DOWN);
                } else {
                   this._super(orientation);
               }
            }
       }),

       cobWalkingNpc5: Mob.extend({
           init: function(id) {
               this._super(id, Types.Entities.COBWALKINGNPC5);
               this.idleSpeed = 500;
               this.walkSpeed = 250;
               this.moveSpeed = 333;
               this.isFriendly = true;
           },

           idle: function(orientation) {
               if(!this.hasTarget()) {
                   this._super(Types.Orientations.DOWN);
                } else {
                   this._super(orientation);
               }
            }
       }),
        ROBITSE3: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE3); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        COLOSSUS: Mob.extend({ init: function(id) { this._super(id, Types.Entities.COLOSSUS); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ROBITSE4: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE4); this.moveSpeed = 100; this.atkSpeed = 80; this.idleSpeed = 800; thisaggroRange = 4; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ROBITSE5: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE5); this.moveSpeed = 300; this.atkSpeed = 100; this.idleSpeed = 600; this.aggroRange = 5; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ROBITSE6: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE6); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ONI: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ONI); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ROBITSE7: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE7); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ROBITSE8: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE8); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ROBITSE9: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE9); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ROBITSE10: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ROBITSE10); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        INFERNOID: Mob.extend({ init: function(id) { this._super(id, Types.Entities.INFERNOID); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        ZAROTH: Mob.extend({ init: function(id) { this._super(id, Types.Entities.ZAROTH); this.moveSpeed = 300; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.aggroRange = 3; this.setAttackRate(1200);}}),
        INFECTION: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.INFECTION);
                this.moveSpeed = 100;
                this.atkSpeed = 60;
                this.idleSpeed = 600;
                this.setAttackRate(700);
                this.aggroRange = 3;
            }
        }),
        SLUDGERAT: Mob.extend({ init: function(id) {this._super(id, Types.Entities.SLUDGERAT); this.moveSpeed = 100 + Math.random()*300; this.atkSpeed = 50 + Math.random()*100; this.idleSpeed = 700; this.shadowOffsetY = -2; this.isAggressive = true; this.aggroRange = 1 + Math.random()*4; this.deathAnimated = true;}}),
        SPACECRAB: Mob.extend({ init: function(id) {this._super(id, Types.Entities.SPACECRAB); this.moveSpeed = 150 + Math.random()*100; this.atkSpeed = 20 + Math.random()*40; this.idleSpeed = 500; this.isAggressive = true; this.aggroRange = 1 + Math.random()*3; this.deathAnimated = true;}}),
        BLACKMAGE: Mob.extend({ init: function(id) {this._super(id, Types.Entities.BLACKMAGE); this.moveSpeed = 100 + Math.random()*100; this.atkSpeed = 50 + Math.random()*50; this.idleSpeed = 150; this.isAggressive = true; this.aggroRange = 1 + Math.random()*3; this.deathAnimated = true;}}),
        RABBID: Mob.extend({ init: function(id) {this._super(id, Types.Entities.RABBID); this.moveSpeed = 100 + Math.random()*100; this.atkSpeed = 50 + Math.random()*50; this.idleSpeed = 250; this.isAggressive = true; this.aggroRange = 1 + Math.random()*3; this.deathAnimated = true;}}),
        ZOMBBID: Mob.extend({ init: function(id) {this._super(id, Types.Entities.ZOMBBID); this.moveSpeed = 100 + Math.random()*250; this.atkSpeed = 50 + Math.random()*50; this.idleSpeed = 250; this.isAggressive = true; this.aggroRange = 1 + Math.random()*3; this.deathAnimated = true;}}),
        HOPPINK: Mob.extend({ init: function(id) {this._super(id, Types.Entities.HOPPINK); this.moveSpeed = 100 + Math.random()*150; this.atkSpeed = 50 + Math.random()*100; this.idleSpeed = 250; this.isAggressive = true; this.aggroRange = 1 + Math.random()*3; this.deathAnimated = true;}}),
        HOPPURP: Mob.extend({ init: function(id) {this._super(id, Types.Entities.HOPPURP); this.moveSpeed = 100 + Math.random()*150; this.atkSpeed = 50 + Math.random()*100; this.idleSpeed = 250; this.isAggressive = true; this.aggroRange = 1 + Math.random()*5; this.deathAnimated = true;}}),
        CRAPTOR: Mob.extend({ init: function(id) {this._super(id, Types.Entities.CRAPTOR); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 700; this.nameOffsetY = -24}}),
        
        BURGERBOSS: Mob.extend({ init: function(id) { this._super(id, Types.Entities.BURGERBOSS); this.moveSpeed = 200; this.atkSpeed = 250; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        FRYGUY: Mob.extend({ init: function(id) { this._super(id, Types.Entities.FRYGUY); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        GHOST1: Mob.extend({ init: function(id) { this._super(id, Types.Entities.GHOST1); this.moveSpeed = 300; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.aggroRange = 2; this.setAttackRate(1200);}}),
        GHOST2: Mob.extend({ init: function(id) { this._super(id, Types.Entities.GHOST2); this.moveSpeed = 250; this.atkSpeed = 80; this.idleSpeed = 800; this.shadowOffsetY = 1; this.aggroRange = 3; this.setAttackRate(1200);}}),
        GHOST3: Mob.extend({ init: function(id) { this._super(id, Types.Entities.GHOST3); this.moveSpeed = 350; this.atkSpeed = 50; this.idleSpeed = 800; this.shadowOffsetY = 1; this.aggroRange = 3; this.setAttackRate(1200);}}),
        HORSEMAN: Mob.extend({ init: function(id) { this._super(id, Types.Entities.HORSEMAN); this.moveSpeed = 200; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        PUMPKINPUNK: Mob.extend({ init: function(id) { this._super(id, Types.Entities.PUMPKINPUNK); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        WRAITH: Mob.extend({ init: function(id) { this._super(id, Types.Entities.WRAITH); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        PUMPKINWARLOCK: Mob.extend({ init: function(id) { this._super(id, Types.Entities.PUMPKINWARLOCK); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        EVILPUMPKIN: Mob.extend({ init: function(id) { this._super(id, Types.Entities.EVILPUMPKIN); this.moveSpeed = 350; this.atkSpeed = 100; this.idleSpeed = 800; this.shadowOffsetY = 1; this.setAttackRate(1200);}}),
        // @nextMobLine@
    };
    return Mobs;
});
