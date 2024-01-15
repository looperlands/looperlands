
define(['mobs', 'items', 'npcs', 'warrior', 'chest','fieldeffects'], function(Mobs, Items, NPCs, Warrior, Chest, Fieldeffects) {

    var EntityFactory = {};

    EntityFactory.createEntity = function(kind, id, name) {
        if(!kind) {
            console.error("kind is undefined", true);
            return;
        }
    
        if(!_.isFunction(EntityFactory.builders[kind])) {
            throw Error(kind + " is not a valid Entity type");
        }
    
        return EntityFactory.builders[kind](id, name);
    };

    //===== mobs ======

    EntityFactory.builders = [];

    EntityFactory.builders[Types.Entities.WARRIOR] = function(id, name) {
        return new Warrior(id, name);
    };

    EntityFactory.builders[Types.Entities.RAT] = function(id) {
        return new Mobs.Rat(id);
    };
    EntityFactory.builders[Types.Entities.GLOOMFORGED] = function(id) {
        return new Mobs.Gloomforged(id);
    };

    EntityFactory.builders[Types.Entities.SKELETON] = function(id) {
        return new Mobs.Skeleton(id);
    };

    EntityFactory.builders[Types.Entities.SKELETON2] = function(id) {
        return new Mobs.Skeleton2(id);
    };

    EntityFactory.builders[Types.Entities.SPECTRE] = function(id) {
        return new Mobs.Spectre(id);
    };
    
    EntityFactory.builders[Types.Entities.DEATHKNIGHT] = function(id) {
        return new Mobs.Deathknight(id);
    };

    EntityFactory.builders[Types.Entities.GOBLIN] = function(id) {
        return new Mobs.Goblin(id);
    };

    EntityFactory.builders[Types.Entities.OGRE] = function(id) {
        return new Mobs.Ogre(id);
    };

    EntityFactory.builders[Types.Entities.CRAB] = function(id) {
        return new Mobs.Crab(id);
    };

    EntityFactory.builders[Types.Entities.SNAKE] = function(id) {
        return new Mobs.Snake(id);
    };

    EntityFactory.builders[Types.Entities.EYE] = function(id) {
        return new Mobs.Eye(id);
    };

    EntityFactory.builders[Types.Entities.BAT] = function(id) {
        return new Mobs.Bat(id);
    };

    EntityFactory.builders[Types.Entities.WIZARD] = function(id) {
        return new Mobs.Wizard(id);
    };

    EntityFactory.builders[Types.Entities.BOSS] = function(id) {
        return new Mobs.Boss(id);
    };

    EntityFactory.builders[Types.Entities.SLIME] = function(id) {
        return new Mobs.Slime(id);
    };
    EntityFactory.builders[Types.Entities.BOAR] = function(id) {
        return new Mobs.Boar(id);
    };
    EntityFactory.builders[Types.Entities.THUDLORD] = function(id) {
        return new Mobs.Thudlord(id);
    };
 
    EntityFactory.builders[Types.Entities.GNASHLING] = function(id) {
        return new Mobs.Gnashling(id);
    };    
    EntityFactory.builders[Types.Entities.GRIZZLEFANG] = function(id) {
        return new Mobs.Grizzlefang(id);
    };    
    EntityFactory.builders[Types.Entities.BARREL] = function(id) {
        return new Mobs.Barrel(id);
    };    

    EntityFactory.builders[Types.Entities.LOOMLEAF] = function(id) {
        return new Mobs.Loomleaf(id);
    };    

    EntityFactory.builders[Types.Entities.WILDGRIN] = function(id) {
        return new Mobs.Wildgrin(id);
    };      

    EntityFactory.builders[Types.Entities.REDSLIME] = function(id) {
        return new Mobs.Redslime(id);
    };

    EntityFactory.builders[Types.Entities.KINGSLIME] = function(id) {
        return new Mobs.Kingslime(id);
    };
    EntityFactory.builders[Types.Entities.SILKSHADE] = function(id) {
        return new Mobs.Silkshade(id);
    };    
    EntityFactory.builders[Types.Entities.CRYSTOLITH] = function(id) {
        return new Mobs.Crystolith(id);
    };  
    EntityFactory.builders[Types.Entities.STONEGUARD] = function(id) {
        return new Mobs.Stoneguard(id);
    };    
    EntityFactory.builders[Types.Entities.SHIVERROCK] = function(id) {
        return new Mobs.Shiverrock(id);
    }; 
    EntityFactory.builders[Types.Entities.SHIVERROCKII] = function(id) {
        return new Mobs.ShiverrockII(id);
    };    
    EntityFactory.builders[Types.Entities.SHIVERROCKIII] = function(id) {
        return new Mobs.ShiverrockIII(id);
    };  
    EntityFactory.builders[Types.Entities.SPIDER] = function(id) {
        return new Mobs.Spider(id);
    };   

    EntityFactory.builders[Types.Entities.FANGWING] = function(id) {
        return new Mobs.Fangwing(id);
    };   
    EntityFactory.builders[Types.Entities.ARACHWEAVE] = function(id) {
        return new Mobs.Arachweave(id);
    };   

    EntityFactory.builders[Types.Entities.MINIMAG] = function(id) {
        return new Mobs.Minimag(id);
    };

    EntityFactory.builders[Types.Entities.MEGAMAG] = function(id) {
        return new Mobs.Megamag(id);
    };

    EntityFactory.builders[Types.Entities.SEACREATURE] = function(id) {
        return new Mobs.SeaCreature(id);
    }

    EntityFactory.builders[Types.Entities.TENTACLE] = function(id) {
        return new Mobs.Tentacle(id);
    }

    EntityFactory.builders[Types.Entities.TENTACLE2] = function(id) {
        return new Mobs.Tentacle2(id);
    }

    EntityFactory.builders[Types.Entities.COBCHICKEN] = function(id) {
        return new Mobs.Cobchicken(id);
    };

    EntityFactory.builders[Types.Entities.COBCOW] = function(id) {
        return new Mobs.Cobcow(id);
    };

    EntityFactory.builders[Types.Entities.COBPIG] = function(id) {
        return new Mobs.Cobpig(id);
    };

    EntityFactory.builders[Types.Entities.COBGOAT] = function(id) {
        return new Mobs.Cobgoat(id);
    };

    EntityFactory.builders[Types.Entities.GHOSTIE] = function(id) {
        return new Mobs.Ghostie(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMERED] = function(id) {
        return new Mobs.Cobslimered(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMEYELLOW] = function(id) {
        return new Mobs.Cobslimeyellow(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMEBLUE] = function(id) {
        return new Mobs.Cobslimeblue(id);  
    };

    EntityFactory.builders[Types.Entities.COBSLIMEPURPLE] = function(id) {
        return new Mobs.Cobslimepurple(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMEGREEN] = function(id) {
        return new Mobs.Cobslimegreen(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMEPINK] = function(id) {
        return new Mobs.Cobslimepink(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMECYAN] = function(id) {
        return new Mobs.Cobslimecyan(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMEMINT] = function(id) {
        return new Mobs.Cobslimemint(id);
    };

    EntityFactory.builders[Types.Entities.COBSLIMEKING] = function(id) {
        return new Mobs.Cobslimeking(id);
    };

    EntityFactory.builders[Types.Entities.COBCOBLIN] = function(id) {
        return new Mobs.Cobcoblin(id);
    };

    EntityFactory.builders[Types.Entities.COBCOBANE] = function(id) {
        return new Mobs.Cobcobane(id);
    };

    EntityFactory.builders[Types.Entities.COBOGRE] = function(id) {
        return new Mobs.Cobogre(id);
    };

    EntityFactory.builders[Types.Entities.ALARIC] = function(id) {
        return new Mobs.Alaric(id);
    };


    
    EntityFactory.builders[Types.Entities.JAYCE] = function(id) {
        return new Mobs.Jayce(id);
    };
    EntityFactory.builders[Types.Entities.ORLAN] = function(id) {
        return new Mobs.Orlan(id);
    };

    EntityFactory.builders[Types.Entities.COBCAT] = function(id) {
        return new Mobs.Cobcat(id);
    };
        
    EntityFactory.builders[Types.Entities.COBDIRT] = function(id) {
        return new Mobs.Cobdirt(id);
    };

    EntityFactory.builders[Types.Entities.COBINCUBATOR] = function(id) {
        return new Mobs.Cobincubator(id);
    };

    EntityFactory.builders[Types.Entities.COBYORKIE] = function(id) {
        return new Mobs.Cobyorkie(id);
    };

    // OA Villagers


    EntityFactory.builders[Types.Entities.BLACKDOG] = function(id) {
        return new Mobs.Blackdog(id);
    }
    EntityFactory.builders[Types.Entities.TURTLE] = function(id) {
        return new Mobs.Turtle(id);
    }
    EntityFactory.builders[Types.Entities.WHITEDOG] = function(id) {
        return new Mobs.Whitedog(id);
    }
    EntityFactory.builders[Types.Entities.BROWNDOG] = function(id) {
        return new Mobs.Browndog(id);
    }
    EntityFactory.builders[Types.Entities.BROWNSPOTDOG] = function(id) {
        return new Mobs.Brownspotdog(id);
    }
    EntityFactory.builders[Types.Entities.TABBYCAT] = function(id) {
        return new Mobs.Tabbycat(id);
    }
    
    EntityFactory.builders[Types.Entities.OABLACKCAT] = function(id) {
        return new Mobs.Oablackcat(id);
    }
    
    EntityFactory.builders[Types.Entities.FVILLAGER1] = function(id) {
        return new Mobs.Fvillager1(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER2] = function(id) {
        return new Mobs.Fvillager2(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER3] = function(id) {
        return new Mobs.Fvillager3(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER4] = function(id) {
        return new Mobs.Fvillager4(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER5] = function(id) {
        return new Mobs.Fvillager5(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER6] = function(id) {
        return new Mobs.Fvillager6(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER7] = function(id) {
        return new Mobs.Fvillager7(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER8] = function(id) {
        return new Mobs.Fvillager8(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER9] = function(id) {
        return new Mobs.Fvillager9(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER10] = function(id) {
        return new Mobs.Fvillager10(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER11] = function(id) {
        return new Mobs.Fvillager11(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER12] = function(id) {
        return new Mobs.Fvillager12(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER13] = function(id) {
        return new Mobs.Fvillager13(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER14] = function(id) {
        return new Mobs.Fvillager14(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER15] = function(id) {
        return new Mobs.Fvillager15(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER16] = function(id) {
        return new Mobs.Fvillager16(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER17] = function(id) {
        return new Mobs.Fvillager17(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER18] = function(id) {
        return new Mobs.Fvillager18(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER19] = function(id) {
        return new Mobs.Fvillager19(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER20] = function(id) {
        return new Mobs.Fvillager20(id);
    };    
    EntityFactory.builders[Types.Entities.FVILLAGER21] = function(id) {
        return new Mobs.Fvillager21(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER22] = function(id) {
        return new Mobs.Fvillager22(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER23] = function(id) {
        return new Mobs.Fvillager23(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER24] = function(id) {
        return new Mobs.Fvillager24(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER25] = function(id) {
        return new Mobs.Fvillager25(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER26] = function(id) {
        return new Mobs.Fvillager26(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER27] = function(id) {
        return new Mobs.Fvillager27(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER28] = function(id) {
        return new Mobs.Fvillager28(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER29] = function(id) {
        return new Mobs.Fvillager29(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER30] = function(id) {
        return new Mobs.Fvillager30(id);
    };
    EntityFactory.builders[Types.Entities.FVILLAGER31] = function(id) {
        return new Mobs.Fvillager31(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER1] = function(id) {
        return new Mobs.Villager1(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER2] = function(id) {
        return new Mobs.Villager2(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER3] = function(id) {
        return new Mobs.Villager3(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER4] = function(id) {
        return new Mobs.Villager4(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER5] = function(id) {
        return new Mobs.Villager5(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER6] = function(id) {
        return new Mobs.Villager6(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER7] = function(id) {
        return new Mobs.Villager7(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER8] = function(id) {
        return new Mobs.Villager8(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER9] = function(id) {
        return new Mobs.Villager9(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER10] = function(id) {
        return new Mobs.Villager10(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER11] = function(id) {
        return new Mobs.Villager11(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER12] = function(id) {
        return new Mobs.Villager12(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER13] = function(id) {
        return new Mobs.Villager13(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER14] = function(id) {
        return new Mobs.Villager14(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER15] = function(id) {
        return new Mobs.Villager15(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER16] = function(id) {
        return new Mobs.Villager16(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER17] = function(id) {
        return new Mobs.Villager17(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER18] = function(id) {
        return new Mobs.Villager18(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER19] = function(id) {
        return new Mobs.Villager19(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER20] = function(id) {
        return new Mobs.Villager20(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER21] = function(id) {
        return new Mobs.Villager21(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER22] = function(id) {
        return new Mobs.Villager22(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER23] = function(id) {
        return new Mobs.Villager23(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER24] = function(id) {
        return new Mobs.Villager24(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER25] = function(id) {
        return new Mobs.Villager25(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER26] = function(id) {
        return new Mobs.Villager26(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER27] = function(id) {
        return new Mobs.Villager27(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER28] = function(id) {
        return new Mobs.Villager28(id);
    };
    EntityFactory.builders[Types.Entities.VILLAGER29] = function(id) {
        return new Mobs.Villager29(id);
    };
    EntityFactory.builders[Types.Entities.BORAC]=function(id){
        return new Mobs.BORAC(id);
    };
    EntityFactory.builders[Types.Entities.INFERNOTH]=function(id){
        return new Mobs.INFERNOTH(id);
    };
    EntityFactory.builders[Types.Entities.WINGELLA]=function(id){
        return new Mobs.WINGELLA(id);
    };
    EntityFactory.builders[Types.Entities.GAUNTER]=function(id){
        return new Mobs.GAUNTER(id);
    };
    EntityFactory.builders[Types.Entities.MASTROM]=function(id){
        return new Mobs.MASTROM(id);
    };
    EntityFactory.builders[Types.Entities.VALKYM]=function(id){
        return new Mobs.VALKYM(id);
    };
    //Short Destroyers
    EntityFactory.builders[Types.Entities.LATEFLEA] = function(id) {
        return new Mobs.lateflea(id);
    };
    EntityFactory.builders[Types.Entities.WOLFBOSS] = function(id) {
        return new Mobs.wolfboss(id);
    };
    EntityFactory.builders[Types.Entities.HORDE1] = function(id) {
        return new Mobs.horde1(id);
    };
    EntityFactory.builders[Types.Entities.HORDE2] = function(id) {
        return new Mobs.horde2(id);
    };
    EntityFactory.builders[Types.Entities.HORDE3] = function(id) {
        return new Mobs.horde3(id);
    };
    EntityFactory.builders[Types.Entities.HORDE4] = function(id) {
        return new Mobs.horde4(id);
    };
    EntityFactory.builders[Types.Entities.HORDE5] = function(id) {
        return new Mobs.horde5(id);
    };
   
    // @nextMobLine@
    //===== items ======
 
    EntityFactory.builders[Types.Entities.SWORD2] = function(id) {
        return new Items.Sword2(id);
    };

    EntityFactory.builders[Types.Entities.AXE] = function(id) {
        return new Items.Axe(id);
    };

    EntityFactory.builders[Types.Entities.REDSWORD] = function(id) {
        return new Items.RedSword(id);
    };

    EntityFactory.builders[Types.Entities.BLUESWORD] = function(id) {
        return new Items.BlueSword(id);
    };

    EntityFactory.builders[Types.Entities.GOLDENSWORD] = function(id) {
        return new Items.GoldenSword(id);
    };

    EntityFactory.builders[Types.Entities.MORNINGSTAR] = function(id) {
        return new Items.MorningStar(id);
    };

    EntityFactory.builders[Types.Entities.MAILARMOR] = function(id) {
        return new Items.MailArmor(id);
    };

    EntityFactory.builders[Types.Entities.LEATHERARMOR] = function(id) {
        return new Items.LeatherArmor(id);
    };

    EntityFactory.builders[Types.Entities.PLATEARMOR] = function(id) {
        return new Items.PlateArmor(id);
    };

    EntityFactory.builders[Types.Entities.REDARMOR] = function(id) {
        return new Items.RedArmor(id);
    };

    EntityFactory.builders[Types.Entities.GOLDENARMOR] = function(id) {
        return new Items.GoldenArmor(id);
    };

    EntityFactory.builders[Types.Entities.FLASK] = function(id) {
        return new Items.Flask(id);
    };
    EntityFactory.builders[Types.Entities.POTION] = function(id) {
        return new Items.Potion(id);
    };
    
    EntityFactory.builders[Types.Entities.FIREPOTION] = function(id) {
        return new Items.FirePotion(id);
    };

    EntityFactory.builders[Types.Entities.BURGER] = function(id) {
        return new Items.Burger(id);
    };
    
    EntityFactory.builders[Types.Entities.CAKE] = function(id) {
        return new Items.Cake(id);
    };

    EntityFactory.builders[Types.Entities.COBCORN] = function(id) {
        return new Items.Cobcorn(id);
    };

    EntityFactory.builders[Types.Entities.COBAPPLE] = function(id) {
        return new Items.Cobapple(id);
    };

    EntityFactory.builders[Types.Entities.COBLOG] = function(id) {
        return new Items.Coblog(id);
    };

    EntityFactory.builders[Types.Entities.COBCLOVER] = function(id) {
        return new Items.Cobclover(id);
    };

    EntityFactory.builders[Types.Entities.COBEGG] = function(id) {
        return new Items.Cobegg(id);
    };

    EntityFactory.builders[Types.Entities.CHEST] = function(id) {
        return new Chest(id);
    };

    EntityFactory.builders[Types.Entities.KEY_ARACHWEAVE]=function(id){return new Items.KEY_ARACHWEAVE(id);};
    EntityFactory.builders[Types.Entities.BOARHIDE]=function(id){return new Items.BOARHIDE(id);};
    EntityFactory.builders[Types.Entities.THUDKEY]=function(id){return new Items.THUDKEY(id);};
    EntityFactory.builders[Types.Entities.BATWING]=function(id){return new Items.BATWING(id);};
    EntityFactory.builders[Types.Entities.ORB]=function(id){return new Items.ORB(id);};
    EntityFactory.builders[Types.Entities.SLIMEBALL]=function(id){return new Items.SLIMEBALL(id);};
    EntityFactory.builders[Types.Entities.REDOOZE]=function(id){return new Items.REDOOZE(id);};
    EntityFactory.builders[Types.Entities.WILDBLADE]=function(id){return new Items.WILDBLADE(id);};
    EntityFactory.builders[Types.Entities.WILDFLOWER]=function(id){return new Items.WILDFLOWER(id);};
    EntityFactory.builders[Types.Entities.MAGICMUSHROOM]=function(id){return new Items.MAGICMUSHROOM(id);};
    EntityFactory.builders[Types.Entities.BLACKCAT]=function(id){return new Items.BLACKCAT(id);};
    EntityFactory.builders[Types.Entities.HERMITHOME]=function(id){return new Items.HERMITHOME(id);};
    EntityFactory.builders[Types.Entities.GREEN_PEARL]=function(id){return new Items.GREEN_PEARL(id);};
    EntityFactory.builders[Types.Entities.FOREST_KEY]=function(id){return new Items.FOREST_KEY(id);};
    EntityFactory.builders[Types.Entities.ICEKEY1]=function(id){return new Items.ICEKEY1(id);};
    EntityFactory.builders[Types.Entities.ICEKEY2]=function(id){return new Items.ICEKEY2(id);};
    EntityFactory.builders[Types.Entities.ICEKEY3]=function(id){return new Items.ICEKEY3(id);};
    EntityFactory.builders[Types.Entities.ICEKEY4]=function(id){return new Items.ICEKEY4(id);};
    EntityFactory.builders[Types.Entities.ICEBOUNDCRYSTAL]=function(id){return new Items.ICEBOUNDCRYSTAL(id);};
    EntityFactory.builders[Types.Entities.SATCHEL]=function(id){return new Items.SATCHEL(id);};
    EntityFactory.builders[Types.Entities.ICESSENCE]=function(id){return new Items.ICESSENCE(id);};
    EntityFactory.builders[Types.Entities.FORGEDSWORD]=function(id){return new Items.FORGEDSWORD(id);};
    EntityFactory.builders[Types.Entities.BANNER]=function(id){return new Items.BANNER(id);};
    EntityFactory.builders[Types.Entities.PNEUMA_SIGN]=function(id){return new Items.PNEUMA_SIGN(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN10]=function(id){return new Items.VILLAGESIGN10(id);};
    EntityFactory.builders[Types.Entities.GOLD1]=function(id){return new Items.GOLD1(id);};
    EntityFactory.builders[Types.Entities.GOLD2]=function(id){return new Items.GOLD2(id);};
    EntityFactory.builders[Types.Entities.GOLD3]=function(id){return new Items.GOLD3(id);};
    EntityFactory.builders[Types.Entities.GOLD]=function(id){return new Items.GOLD(id);};
    EntityFactory.builders[Types.Entities.EVERPEAKMAP1]=function(id){return new Items.EVERPEAKMAP1(id);};
    EntityFactory.builders[Types.Entities.EVERPEAKMAP2]=function(id){return new Items.EVERPEAKMAP2(id);};
    EntityFactory.builders[Types.Entities.EVERPEAKMAP3]=function(id){return new Items.EVERPEAKMAP3(id);};
    EntityFactory.builders[Types.Entities.EVERPEAKMAP4]=function(id){return new Items.EVERPEAKMAP4(id);};
    EntityFactory.builders[Types.Entities.EVERPEAKMAP5]=function(id){return new Items.EVERPEAKMAP5(id);};
    EntityFactory.builders[Types.Entities.COFFEEBEANS] = function(id) { return new Items.coffeebeans(id); };
    EntityFactory.builders[Types.Entities.CRYSTAL] = function(id) { return new Items.crystal(id); };
    EntityFactory.builders[Types.Entities.TRINKET] = function(id) { return new Items.trinket(id); };
    EntityFactory.builders[Types.Entities.WILDFLOWERS] = function(id) { return new Items.wildflowers(id); };
    EntityFactory.builders[Types.Entities.LUMINOUSSTONES] = function(id) { return new Items.luminousstones(id); };
    //Short Destroyers
    EntityFactory.builders[Types.Entities.VHS] = function(id) { return new Items.vhs(id); };
    EntityFactory.builders[Types.Entities.DVD] = function(id) { return new Items.dvd(id); };
    EntityFactory.builders[Types.Entities.GAME] = function(id) { return new Items.game(id); };
    EntityFactory.builders[Types.Entities.POPCORN] = function(id) { return new Items.popcorn(id); };
    //mycupbloody
    EntityFactory.builders[Types.Entities.EYEBALL]=function(id){
        return new Items.EYEBALL(id);
    };
    EntityFactory.builders[Types.Entities.REDPOTION]=function(id){
        return new Items.REDPOTION(id);
    };
    EntityFactory.builders[Types.Entities.GREYPOTION]=function(id){
        return new Items.GREYPOTION(id);
    };
    // @nextObjectLine@

    //====== NPCs ======

    EntityFactory.builders[Types.Entities.GUARD] = function(id) {
        return new NPCs.Guard(id);
    };

    EntityFactory.builders[Types.Entities.KING] = function(id) {
        return new NPCs.King(id);
    };

    EntityFactory.builders[Types.Entities.KING2] = function(id) {
        return new NPCs.King2(id);
    };    

    EntityFactory.builders[Types.Entities.VILLAGEGIRL] = function(id) {
        return new NPCs.VillageGirl(id);
    };

    EntityFactory.builders[Types.Entities.VILLAGER] = function(id) {
        return new NPCs.Villager(id);
    };
    
    EntityFactory.builders[Types.Entities.CODER] = function(id) {
        return new NPCs.Coder(id);
    };

    EntityFactory.builders[Types.Entities.AGENT] = function(id) {
        return new NPCs.Agent(id);
    };


    EntityFactory.builders[Types.Entities.RICK] = function(id) {
        return new NPCs.Rick(id);
    };
    EntityFactory.builders[Types.Entities.TORIAN] = function(id) {
        return new NPCs.Torian(id);
    };

    EntityFactory.builders[Types.Entities.TORIN] = function(id) {
        return new NPCs.Torin(id);
    };    

    EntityFactory.builders[Types.Entities.ELARA] = function(id) {
        return new NPCs.Elara(id);
    };
    EntityFactory.builders[Types.Entities.EDUR] = function(id) {
        return new NPCs.Edur(id);
    };
    EntityFactory.builders[Types.Entities.LUMI] = function(id) {
        return new NPCs.Lumi(id);
    };
    EntityFactory.builders[Types.Entities.SNJOR] = function(id) {
        return new NPCs.Snjor(id);
    };
    EntityFactory.builders[Types.Entities.GELIDUS] = function(id) {
        return new NPCs.Gelidus(id);
    };    
    EntityFactory.builders[Types.Entities.ELDRIN] = function(id) {
        return new NPCs.Eldrin(id);
    };    
    EntityFactory.builders[Types.Entities.DRAYLEN] = function(id) {
        return new NPCs.Draylen(id);
    };    
    EntityFactory.builders[Types.Entities.THAELEN] = function(id) {
        return new NPCs.Thaelen(id);
    };    
    EntityFactory.builders[Types.Entities.KELDOR] = function(id) {
        return new NPCs.Keldor(id);
    };    
    EntityFactory.builders[Types.Entities.TORVIN] = function(id) {
        return new NPCs.Torvin(id);
    };    
    EntityFactory.builders[Types.Entities.LIORA] = function(id) {
        return new NPCs.Liora(id);
    };    
    EntityFactory.builders[Types.Entities.ARIA] = function(id) {
        return new NPCs.Aria(id);
    };
    EntityFactory.builders[Types.Entities.ELRIC] = function(id) {
        return new NPCs.Elric(id);
    };   
    EntityFactory.builders[Types.Entities.GRIPNAR] = function(id) {
        return new NPCs.Gripnar(id);
    };   
    EntityFactory.builders[Types.Entities.WHISKERS] = function(id) {
        return new NPCs.Whiskers(id);
    };    
    EntityFactory.builders[Types.Entities.NEENA] = function(id) {
        return new NPCs.Neena(id);
    };    
    EntityFactory.builders[Types.Entities.ATHLYN] = function(id) {
        return new NPCs.Athlyn(id);
    };    
    EntityFactory.builders[Types.Entities.JENIPER] = function(id) {
        return new NPCs.Jeniper(id);
    };    
    EntityFactory.builders[Types.Entities.GLINK] = function(id) {
        return new NPCs.Glink(id);
    }; 
    EntityFactory.builders[Types.Entities.GLACIALORD] = function(id) {
        return new Mobs.Glacialord(id);
    }; 
    EntityFactory.builders[Types.Entities.NIGHTHARROW] = function(id) {
        return new Mobs.Nightharrow(id);
    }; 
    EntityFactory.builders[Types.Entities.SCIENTIST] = function(id) {
        return new NPCs.Scientist(id);
    };

    EntityFactory.builders[Types.Entities.NYAN] = function(id) {
        return new NPCs.Nyan(id);
    };

    EntityFactory.builders[Types.Entities.PRIEST] = function(id) {
        return new NPCs.Priest(id);
    };
    
    EntityFactory.builders[Types.Entities.SORCERER] = function(id) {
        return new NPCs.Sorcerer(id);
    };

    EntityFactory.builders[Types.Entities.OCTOCAT] = function(id) {
        return new NPCs.Octocat(id);
    };
    
    EntityFactory.builders[Types.Entities.BEACHNPC] = function(id) {
        return new NPCs.BeachNpc(id);
    };

    EntityFactory.builders[Types.Entities.WILDWILL] = function(id) {
        return new NPCs.WildWill(id);
    };

    EntityFactory.builders[Types.Entities.FORESTNPC] = function(id) {
        return new NPCs.ForestNpc(id);
    };
    
    EntityFactory.builders[Types.Entities.DESERTNPC] = function(id) {
        return new NPCs.DesertNpc(id);
    };
    
    EntityFactory.builders[Types.Entities.LAVANPC] = function(id) {
        return new NPCs.LavaNpc(id);
    };

    EntityFactory.builders[Types.Entities.GOOSE] = function(id) {
        return new NPCs.Goose(id);
    };

    EntityFactory.builders[Types.Entities.TANASHI] = function(id) {
        return new NPCs.Tanashi(id);
    };    

    EntityFactory.builders[Types.Entities.MINER] = function(id) {
        return new NPCs.Miner(id);
    };    

    EntityFactory.builders[Types.Entities.VILLAGESIGN1] = function(id) {
        return new NPCs.Villagesign1(id);
    };
    
    EntityFactory.builders[Types.Entities.COBLUMBERJACK] = function(id) {
        return new NPCs.Coblumberjack(id);
    };    

    EntityFactory.builders[Types.Entities.COBHILLSNPC] = function(id) {
        return new NPCs.Cobhillsnpc(id);
    };    

    EntityFactory.builders[Types.Entities.COBCOBMIN] = function(id) {
        return new NPCs.Cobcobmin(id);
    };  
    EntityFactory.builders[Types.Entities.VILLAGESIGN2]=function(id){return new NPCs.VILLAGESIGN2(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN3]=function(id){return new NPCs.VILLAGESIGN3(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN4]=function(id){return new NPCs.VILLAGESIGN4(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN5]=function(id){return new NPCs.VILLAGESIGN5(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN6]=function(id){return new NPCs.VILLAGESIGN6(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN7]=function(id){return new NPCs.VILLAGESIGN7(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN8]=function(id){return new NPCs.VILLAGESIGN8(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN9]=function(id){return new NPCs.VILLAGESIGN9(id);};

    EntityFactory.builders[Types.Entities.COBELLEN] = function(id) {
        return new NPCs.Cobellen(id);
    };  

    EntityFactory.builders[Types.Entities.COBASHLEY] = function(id) {
        return new NPCs.cobashley(id);
    };  

    EntityFactory.builders[Types.Entities.COBJOHNNY] = function(id) {
        return new NPCs.Cobjohnny(id);
    };  
    EntityFactory.builders[Types.Entities.VILLAGESIGN11]=function(id){return new NPCs.VILLAGESIGN11(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN12]=function(id){return new NPCs.VILLAGESIGN12(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN13]=function(id){return new NPCs.VILLAGESIGN13(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN14]=function(id){return new NPCs.VILLAGESIGN14(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN15]=function(id){return new NPCs.VILLAGESIGN15(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN16]=function(id){return new NPCs.VILLAGESIGN16(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN]=function(id){return new NPCs.VILLAGESIGN(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN17]=function(id){return new NPCs.VILLAGESIGN17(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN18]=function(id){return new NPCs.VILLAGESIGN18(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN19]=function(id){return new NPCs.VILLAGESIGN19(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN20]=function(id){return new NPCs.VILLAGESIGN20(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN21]=function(id){return new NPCs.VILLAGESIGN21(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN22]=function(id){return new NPCs.VILLAGESIGN22(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN23]=function(id){return new NPCs.VILLAGESIGN23(id);};
    EntityFactory.builders[Types.Entities.VILLAGESIGN24]=function(id){return new NPCs.VILLAGESIGN24(id);};
    EntityFactory.builders[Types.Entities.THEDIUS]=function(id){return new NPCs.THEDIUS(id);};
    EntityFactory.builders[Types.Entities.NIANDRA]=function(id){return new NPCs.NIANDRA(id);};
    EntityFactory.builders[Types.Entities.BLARK]=function(id){return new NPCs.BLARK(id);};
    EntityFactory.builders[Types.Entities.DANIEL]=function(id){return new NPCs.DANIEL(id);};
    EntityFactory.builders[Types.Entities.ESTELLA]=function(id){return new NPCs.ESTELLA(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN1]=function(id){return new NPCs.CITYSIGN1(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN2]=function(id){return new NPCs.CITYSIGN2(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN3]=function(id){return new NPCs.CITYSIGN3(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN4]=function(id){return new NPCs.CITYSIGN4(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN5]=function(id){return new NPCs.CITYSIGN5(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN6]=function(id){return new NPCs.CITYSIGN6(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN7]=function(id){return new NPCs.CITYSIGN7(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN8]=function(id){return new NPCs.CITYSIGN8(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN9]=function(id){return new NPCs.CITYSIGN9(id);};
    EntityFactory.builders[Types.Entities.CITYSIGN10]=function(id){return new NPCs.CITYSIGN10(id);};
    EntityFactory.builders[Types.Entities.COBELLIOTT]=function(id){return new NPCs.cobelliott(id);};
    EntityFactory.builders[Types.Entities.COBFERN]=function(id){return new NPCs.cobfern(id);};
    EntityFactory.builders[Types.Entities.COBMAUVE]=function(id){return new NPCs.cobmauve(id);};
    EntityFactory.builders[Types.Entities.KEEPERARIADNE]=function(id){return new NPCs.keeperariadne(id);};
    EntityFactory.builders[Types.Entities.MAYOROSWALD]=function(id){return new NPCs.mayoroswald(id);};
    EntityFactory.builders[Types.Entities.NEWCOMERSILAS]=function(id){return new NPCs.newcomersilas(id);};
    EntityFactory.builders[Types.Entities.PATRONCORA]=function(id){return new NPCs.patroncora(id);};
    EntityFactory.builders[Types.Entities.GUARDIANFINTAN]=function(id){return new NPCs.guardianfintan(id);};
    EntityFactory.builders[Types.Entities.GOFFREY]=function(id){return new NPCs.GOFFREY(id);};
    // @nextNPCLine@

     //====== FieldEffectss ======

    EntityFactory.builders[Types.Entities.MAGCRACK] = function(id) {
        return new Fieldeffects.Magcrack(id);
    };  

    EntityFactory.builders[Types.Entities.COBFALLINGROCK] = function(id) {
        return new Fieldeffects.Cobfallingrock(id);
    };  
    
    return EntityFactory;
});
