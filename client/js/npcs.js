
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

        Cobcatblack: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCATBLACK, 1);
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

        Cobminer: Npc.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBMINER, 1);
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
        nexan4: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN4, 1);}}),
        nexan5: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN5, 1);}}),
        nexan10: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN10, 1);}}),
        nexan11: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN11, 1);}}),
        nexan12: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN12, 1);}}),
        nexan13: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN13, 1);}}),
        nexan14: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN14, 1);}}),
        nexan15: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN15, 1);}}),
        nexan16: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN16, 1);}}),
        nexan17: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN17, 1);}}),
        nexan18: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN18, 1);}}),
        nexan19: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN19, 1);}}),
        nexan20: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN20, 1);}}),
        nexan28: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN28, 1);}}),
        nexan29: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN29, 1);}}),
        thehookup: Npc.extend({init: function(id) {this._super(id, Types.Entities.THEHOOKUP, 1);}}),
        nexan31: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN31, 1);}}),
        nexan32: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN32, 1);}}),
        nexan33: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN33, 1);}}),
        nexan34: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN34, 1);}}),
        m88nbushguy: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NBUSHGUY, 1);}}),
        m88nsignguy: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSIGNGUY, 1);}}),
        m88nmysteryhood: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NMYSTERYHOOD, 1);}}),
        m88ntaikotwin1: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NTAIKOTWIN1, 1);}}),
        m88ntaikotwin2: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NTAIKOTWIN2, 1);}}),
        m88nstimytimy: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSTIMYTIMY, 1);}}),
        m88nrealtyagent: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NREALTYAGENT, 1);}}),
        m88ngenie: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NGENIE, 1);}}),
        nexan35: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN35, 1);}}),
        nexan36: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN36, 1);}}),
        nexan37: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN37, 1);}}),
        nexan38: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN38, 1);}}),
        nexan39: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN39, 1);}}),
        nexan40: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN40, 1);}}),
        nexan41: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN41, 1);}}),
        nexan42: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN42, 1);}}),
        nexan43: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN43, 1);}}),
        nexan44: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN44, 1);}}),
        nexan45: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN45, 1);}}),
        nexan46: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN46, 1);}}),
        nexan47: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN47, 1);}}),
        nexan48: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXAN48, 1);}}),
        m88nmermanking: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NMERMANKING, 1);}}),
        m88nmermaidprincess: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NMERMAIDPRINCESS, 1);}}),
        kingfroggybw: Npc.extend({init: function(id) {this._super(id, Types.Entities.KINGFROGGYBW, 1);}}),
        m88nape: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NAPE, 1);}}),
        m88nmobilebartender: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NMOBILEBARTENDER, 1);}}),
        m88nbananastand: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NBANANASTAND, 1);}}),
        m88nsage: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSAGE, 1);}}),
        m88nsage2: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSAGE2, 1);}}),
        m88nsage3: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSAGE3, 1);}}),
        m88nsage4: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSAGE4, 1);}}),
        m88nsage5: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSAGE5, 1);}}),
        m88nsage6: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSAGE6, 1);}}),
        m88nsage7: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSAGE7, 1);}}),
        m88nfrosty: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NFROSTY, 1);}}),
        m88nsanta: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NSANTA, 1);}}),
        m88nrudolph: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NRUDOLPH, 1);}}),
        m88ntownie: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NTOWNIE, 1);}}),
        m88ntownies: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NTOWNIES, 1);}}),
        m88ntownie2: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NTOWNIE2, 1);}}),
        m88nastronaut: Npc.extend({init: function(id) {this._super(id, Types.Entities.M88NASTRONAUT, 1);}}),
        nexanzombiecat: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXANZOMBIECAT, 1);}}),
        nexanexecutioner: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXANEXECUTIONER, 1);}}),
        nexanzombie2: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXANZOMBIE2, 1);}}),
        nexanzombie3: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXANZOMBIE3, 1);}}),
        nexanzombie4: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXANZOMBIE4, 1);}}),
        nexanzombie5: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXANZOMBIE5, 1);}}),
        nexanhazmat2: Npc.extend({init: function(id) {this._super(id, Types.Entities.NEXANHAZMAT2, 1);}}),
        //MRMlabs NPCs
        tylerdurden: Npc.extend({init: function(id) {this._super(id, Types.Entities.TYLERDURDEN, 1);}}),
        //Taiko Town NPCs
        taikotownnpc1: Npc.extend({init: function(id) {this._super(id, Types.Entities.TAIKOTOWNNPC1, 1);}}),
        taikotownnpc2: Npc.extend({init: function(id) {this._super(id, Types.Entities.TAIKOTOWNNPC2, 1);}}),
        taikotownnpc3: Npc.extend({init: function(id) {this._super(id, Types.Entities.TAIKOTOWNNPC3, 1);}}),
        taikotownnpc4: Npc.extend({init: function(id) {this._super(id, Types.Entities.TAIKOTOWNNPC4, 1);}}),
        taikotownnpc5: Npc.extend({init: function(id) {this._super(id, Types.Entities.TAIKOTOWNNPC5, 1);}}),
        taikotownnpc6: Npc.extend({init: function(id) {this._super(id, Types.Entities.TAIKOTOWNNPC6, 1);}}),
        taikotownnpc7: Npc.extend({init: function(id) {this._super(id, Types.Entities.TAIKOTOWNNPC7, 1);}}),
        stupidmonkey: Npc.extend({init: function(id) {this._super(id, Types.Entities.STUPIDMONKEY, 1);}}),
        //Robits NPCs
        ROBITSC1: Npc.extend({init: function(id) {this._super(id, Types.Entities.ROBITSC1, 1);}}),
        CLOWNCAPONEBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.CLOWNCAPONEBIT, 1);}}),
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
        KAWAIIPRINCESS: Npc.extend({init: function(id) {this._super(id, Types.Entities.KAWAIIPRINCESS, 1);}}),
        KAWAIIPRINCESS2: Npc.extend({init: function(id) {this._super(id, Types.Entities.KAWAIIPRINCESS2, 1);}}),
        ZILEEL: Npc.extend({init: function(id) {this._super(id, Types.Entities.ZILEEL, 1);}}),
        HDUCKLEE: Npc.extend({init: function(id) {this._super(id, Types.Entities.HDUCKLEE, 1);}}),
        APEBRAIN1: Npc.extend({init: function(id) {this._super(id, Types.Entities.APEBRAIN1, 1);}}),
        CORTEZ: Npc.extend({init: function(id) {this._super(id, Types.Entities.CORTEZ, 1);}}),
        NICO1: Npc.extend({init: function(id) {this._super(id, Types.Entities.NICO1, 1);}}),
        JUSTIN: Npc.extend({init: function(id) {this._super(id, Types.Entities.JUSTIN, 1);}}),
        GAVIN: Npc.extend({init: function(id) {this._super(id, Types.Entities.GAVIN, 1);}}),
        KARAOKEBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.KARAOKEBIT, 1);}}),
        BALKSBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.BALKSBIT, 1);}}),
        BIRDSBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.BIRDSBIT, 1);}}),
        CRISPYBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.CRISPYBIT, 1);}}),
        DARIUS: Npc.extend({init: function(id) {this._super(id, Types.Entities.DARIUS, 1);}}),
        SEB: Npc.extend({init: function(id) {this._super(id, Types.Entities.SEB, 1);}}),
        NAH: Npc.extend({init: function(id) {this._super(id, Types.Entities.NAH, 1);}}),
        FUZZYBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.FUZZYBIT, 1);}}),
        JIMBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.JIMBIT, 1);}}),
        DSOUZBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.DSOUZBIT, 1);}}),
        OBSERVER: Npc.extend({init: function(id) {this._super(id, Types.Entities.OBSERVER, 1);}}),
        PIZZABIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.PIZZABIT, 1);}}),
        JACKBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.JACKBIT, 1);}}),
        GENTLEBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.GENTLEBIT, 1);}}),
        MAGMABIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.MAGMABIT, 1);}}),
        ROBITSMAIN: Npc.extend({init: function(id) {this._super(id, Types.Entities.ROBITSMAIN, 1);}}),
        DFVBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.DFVBIT, 1);}}),
        PRINCEBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.PRINCEBIT, 1);}}),
        BIDENBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.BIDENBIT, 1);}}),
        ARTWHITE: Npc.extend({init: function(id) {this._super(id, Types.Entities.ARTWHITE, 1);}}),
        ARTWHITEROBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.ARTWHITEROBIT, 1);}}),
        OCARINABIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.OCARINABIT, 1);}}),
        WENMOONBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.WENMOONBIT, 1);}}),
        FEDORABIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.FEDORABIT, 1);}}),
        APEBRAINOG: Npc.extend({init: function(id) {this._super(id, Types.Entities.APEBRAINOG, 1);}}),
        SIREN: Npc.extend({init: function(id) {this._super(id, Types.Entities.SIREN, 1);}}),
        // BITCORN NPCS
        BITNPC_BITCORN: Npc.extend({init: function(id) {this._super(id, Types.Entities.BITNPC_BITCORN, 1);}}),
        BITNPC_THORNBEARD_KNEEL: Npc.extend({init: function(id) {this._super(id, Types.Entities.BITNPC_THORNBEARD_KNEEL, 1);}}),
        BITNPC_THORNBEARD: Npc.extend({init: function(id) {this._super(id, Types.Entities.BITNPC_THORNBEARD, 1);}}),

        VOYAGER: Npc.extend({init: function(id) {this._super(id, Types.Entities.VOYAGER, 1);}}),
        VOYAGERMONKEY: Npc.extend({init: function(id) {this._super(id, Types.Entities.VOYAGERMONKEY, 1);}}),
        CHEN: Npc.extend({init: function(id) {this._super(id, Types.Entities.CHEN, 1);}}),
        VOYAGERROBIT: Npc.extend({init: function(id) {this._super(id, Types.Entities.VOYAGERROBIT, 1);}}),
        SARAH: Npc.extend({init: function(id) {this._super(id, Types.Entities.SARAH, 1);}}),
        MOONBASES: Npc.extend({init: function(id) {this._super(id, Types.Entities.MOONBASES, 1);}}),
        NURSEOWNER: Npc.extend({init: function(id) {this._super(id, Types.Entities.NURSEOWNER, 1);}}),
        WHISPYRED: Npc.extend({init: function(id) {this._super(id, Types.Entities.WHISPYRED, 1);}}),
        WHISPYWITCH: Npc.extend({init: function(id) {this._super(id, Types.Entities.WHISPYWITCH, 1);}}),
        WHISPYKING: Npc.extend({init: function(id) {this._super(id, Types.Entities.WHISPYKING, 1);}}),
        WHISPYBOBBY: Npc.extend({init: function(id) {this._super(id, Types.Entities.WHISPYBOBBY, 1);}}),
        WHISPYDIAMOND: Npc.extend({init: function(id) {this._super(id, Types.Entities.WHISPYDIAMOND, 1);}}),
        WHISPYLL: Npc.extend({init: function(id) {this._super(id, Types.Entities.WHISPYLL, 1);}}),
        // @nextNPCLine@
    };
    
    return NPCs;
});
