
define(['npc'], function(Npc) {

    var NPCs = {

        Guard: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.GUARD, 1);
            }
        }),

        TAIKOGUARD: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.TAIKOGUARD, 1);
            }
        }),        

        King: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.KING, 1);
            }
        }),

        King2: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.KING2, 1);
            }
        }),

        Agent: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.AGENT, 1);
            }
        }),

        Rick: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.RICK, 1);
            }
        }),
        Gelidus: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.GELIDUS, 1);
            }
        }),
        Snjor: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.SNJOR, 1);
            }
        }),
        Lumi: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.LUMI, 1);
            }
        }),
        Edur: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.EDUR, 1);
            }
        }),

        Torin: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.TORIN, 1);
            }
        }),
        Elara: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.ELARA, 1);
            }
        }),
        Eldrin: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.ELDRIN, 1);
            }
        }),
        Draylen: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.DRAYLEN, 1);
            }
        }),
        Thaelen: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.THAELEN, 1);
            }
        }),
        Glacialord: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.GLACIALORD, 1);
            }
        }),
        Keldor: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.KELDOR, 1);
            }
        }),
        Torvin: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.TORVIN, 1);
            }
        }),
        Liora: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.LIORA, 1);
            }
        }),
        Aria: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.ARIA, 1);
            }
        }),

        Elric: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.ELRIC, 1);
            }
        }), 
        Gripnar: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.GRIPNAR, 1);
            }
        }), 
        Whiskers: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.WHISKERS, 1);
            }
        }), 
        Torian: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.TORIAN, 1);
            }
        }), 
        Neena: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.NEENA, 1);
            }
        }),
        Athlyn: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.ATHLYN, 1);
            }
        }),
        Jeniper: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.JENIPER, 1);
            }
        }),       
        Glink: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.GLINK, 1);
            }
        }),              

        VillageGirl: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGEGIRL, 1);
            }
        }),

        Villager: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGER, 1);
            }
        }),
        
        Coder: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.CODER, 1);
            }
        }),

        Scientist: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.SCIENTIST, 1);
            }
        }),

        Nyan: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.NYAN, 1);
                this.idleSpeed = 50;
            }
        }),
        
        Sorcerer: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.SORCERER, 1);
                this.idleSpeed = 150;
            }
        }),

        Priest: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.PRIEST, 1);
            }
        }),
        
        BeachNpc: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.BEACHNPC, 1);
            }
        }),

        WildWill: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.WILDWILL, 1);
            }
        }),

        ShopOwner: Npc.extend({
           init: function (id) {
                this._super(id, Types.Entities.SHOPOWNER, 1);
           }
        }),

        Blacksmith: Npc.extend({
            init: function (id) {
                this._super(id, Types.Entities.BLACKSMITH, 1);
            }
        }),

        ForestNpc: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.FORESTNPC, 1);
            }
        }),

        DesertNpc: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.DESERTNPC, 1);
            }
        }),

        LavaNpc: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.LAVANPC, 1);
            }
        }),

        Octocat: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.OCTOCAT, 1);
            }
        }),

        Goose: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.GOOSE, 1);
            }
        }),

        Tanashi: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.TANASHI, 1);
            }
        }),

        Miner: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.MINER, 1);
            }
        }),

        Villagesign1: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.VILLAGESIGN1, 1);
            }
        }),

        Coblumberjack: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBLUMBERJACK, 1);
            }
        }),

        Cobhillsnpc: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBHILLSNPC, 1);
            }
        }),

        Cobcobmin: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCOBMIN, 1);
            }
        }),

        VILLAGESIGN2: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN2, 1);}}),
        VILLAGESIGN3: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN3, 1);}}),
        VILLAGESIGN4: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN4, 1);}}),
        VILLAGESIGN5: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN5, 1);}}),
        VILLAGESIGN6: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN6, 1);}}),
        VILLAGESIGN7: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN7, 1);}}),
        VILLAGESIGN8: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN8, 1);}}),
        VILLAGESIGN9: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN9, 1);}}),
        
        Cobellen: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBELLEN, 1);
            }
        }),

        cobashley: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBASHLEY, 1);
            }
        }),

        Cobjohnny: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBJOHNNY, 1);
            }
        }),

        VILLAGESIGN11: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN11, 1);}}),
        VILLAGESIGN12: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN12, 1);}}),
        VILLAGESIGN13: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN13, 1);}}),
        VILLAGESIGN14: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN14, 1);}}),
        VILLAGESIGN15: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN15, 1);}}),
        VILLAGESIGN16: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN16, 1);}}),
        VILLAGESIGN: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN, 1);}}),
        VILLAGESIGN17: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN17, 1);}}),
        VILLAGESIGN18: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN18, 1);}}),
        VILLAGESIGN19: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN19, 1);}}),
        VILLAGESIGN20: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN20, 1);}}),
        VILLAGESIGN21: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN21, 1);}}),
        VILLAGESIGN22: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN22, 1);}}),
        VILLAGESIGN23: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN23, 1);}}),
        VILLAGESIGN24: Npc.extend({init: function(id) {this._super(id, Types.Entities.VILLAGESIGN24, 1);}}),
        THEDIUS: Npc.extend({init: function(id) {this._super(id, Types.Entities.THEDIUS, 1);}}),
        NIANDRA: Npc.extend({init: function(id) {this._super(id, Types.Entities.NIANDRA, 1);}}),
        BLARK: Npc.extend({init: function(id) {this._super(id, Types.Entities.BLARK, 1);}}),
        DANIEL: Npc.extend({init: function(id) {this._super(id, Types.Entities.DANIEL, 1);}}),
        ESTELLA: Npc.extend({init: function(id) {this._super(id, Types.Entities.ESTELLA, 1);}}),
        CITYSIGN1: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN1, 1);}}),
        CITYSIGN2: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN2, 1);}}),
        CITYSIGN3: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN3, 1);}}),
        CITYSIGN4: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN4, 1);}}),
        CITYSIGN5: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN5, 1);}}),
        CITYSIGN6: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN6, 1);}}),
        CITYSIGN7: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN7, 1);}}),
        CITYSIGN8: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN8, 1);}}),
        CITYSIGN9: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN9, 1);}}),
        CITYSIGN10: Npc.extend({init: function(id) {this._super(id, Types.Entities.CITYSIGN10, 1);}}),
        cobelliott: Npc.extend({init: function(id) {this._super(id, Types.Entities.COBELLIOTT, 1);}}),
        cobfern: Npc.extend({init: function(id) {this._super(id, Types.Entities.COBFERN, 1);}}),
        cobmauve: Npc.extend({init: function(id) {this._super(id, Types.Entities.COBMAUVE, 1);}}),
        keeperariadne: Npc.extend({init: function(id) {this._super(id, Types.Entities.KEEPERARIADNE, 1);}}),
        mayoroswald: Npc.extend({init: function(id) {this._super(id, Types.Entities.MAYOROSWALD, 1);}}),
        guardianfintan: Npc.extend({init: function(id) {this._super(id, Types.Entities.GUARDIANFINTAN, 1);}}),
        newcomersilas: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEWCOMERSILAS, 1);}}),
        patroncora: Npc.extend({init: function(id) {this._super(id, Types.Entities.PATRONCORA, 1);}}),
        GOFFREY: Npc.extend({init: function(id) {this._super(id, Types.Entities.GOFFREY, 1);}}),
        //m88n NPCs
        wenmoon: Npc.extend({init: function(id) {this._super(id, Types.Entities.WENMOON, 1);}}),
        kingfroggy: Npc.extend({init: function(id) {this._super(id, Types.Entities.KINGFROGGY, 1);}}),
        //MRMlabs NPCs
        tylerdurden: Npc.extend({init: function(id) {this._super(id, Types.Entities.TYLERDURDEN, 1);}}),
        //ShortDestroyers
        derrick: Npc.extend({init: function(id) {this._super(id, Types.Entities.DERRICK, 1);}}),
        frog: Npc.extend({init: function(id) {this._super(id, Types.Entities.FROG, 1);}}),
        angrymom: Npc.extend({init: function(id) {this._super(id, Types.Entities.ANGRYMOM, 1);}}),
        devon: Npc.extend({init: function(id) {this._super(id, Types.Entities.DEVON, 1);}}),
        misty: Npc.extend({init: function(id) {this._super(id, Types.Entities.MISTY, 1);}}),
        managertim: Npc.extend({init: function(id) {this._super(id, Types.Entities.MANAGERTIM, 1);}}),
        oracle: Npc.extend({init: function(id) {this._super(id, Types.Entities.ORACLE, 1);}}),
        gill: Npc.extend({init: function(id) {this._super(id, Types.Entities.GILL, 1);}}),
        customer1: Npc.extend({init: function(id) {this._super(id, Types.Entities.CUSTOMER1, 1);}}),
        customer2: Npc.extend({init: function(id) {this._super(id, Types.Entities.CUSTOMER2, 1);}}),
        portalgill: Npc.extend({init: function(id) {this._super(id, Types.Entities.PORTALGILL, 1);}}),
        // @nextNPCLine@
    };
    
    return NPCs;
});
