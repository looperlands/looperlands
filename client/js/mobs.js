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

        BORAC: Mob.extend({ 
            init: function(id) { 
                this._super(id, Types.Entities.BORAC); 
                this.moveSpeed = 350; 
                this.atkSpeed = 100; 
                this.idleSpeed = 800; 
                this.shadowOffsetY = 1; 
                this.setAttackRate(1200);
                this.aggroRange = 3;
            }
        }),

        //Short Destroyers
        Lateflea: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.LATEFLEA);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 100;              
                this.shadowOffsetY = -2;
                this.isAggressive = true;
                this.aggroRange = 3;
                this.deathAnimated = true;
            }
        }),

        Wolfboss: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.WOLFBOSS);
                this.moveSpeed = 300;
                this.idleSpeed = 100;
                this.atkSpeed = 50;  
                this.shadowOffsetY = -3;              
                this.isAggressive = true;
                this.aggroRange = 3;
                this.title = "Time To Test Your Might!";
            }
        }),

        // @nextMobLine@
    };
    return Mobs;
});
