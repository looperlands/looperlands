
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
    EntityFactory.builders[Types.Entities.COBCATORANGE] = function(id) {
        return new Mobs.Cobcatorange(id);
    };
    EntityFactory.builders[Types.Entities.COBCATBROWN] = function(id) {
        return new Mobs.Cobcatbrown(id);
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

    EntityFactory.builders[Types.Entities.COBHAY] = function(id) {
        return new Mobs.Cobhay(id);
    };

    EntityFactory.builders[Types.Entities.COBHAYTWO] = function(id) {
        return new Mobs.Cobhaytwo(id);
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
    //m88n Mobs
    EntityFactory.builders[Types.Entities.BALLOONDOGB] = function(id) {
        return new Mobs.balloondogb(id);
    };
    EntityFactory.builders[Types.Entities.BALLOONDOGY] = function(id) {
        return new Mobs.balloondogy(id);
    };
    EntityFactory.builders[Types.Entities.BALLOONDOGA] = function(id) {
        return new Mobs.balloondoga(id);
    };
    EntityFactory.builders[Types.Entities.BALLOONDOGV] = function(id) {
        return new Mobs.balloondogv(id);
    };
    EntityFactory.builders[Types.Entities.BALLOONDOGP] = function(id) {
        return new Mobs.balloondogp(id);
    };
    EntityFactory.builders[Types.Entities.BALLOONDOGG] = function(id) {
        return new Mobs.balloondogg(id);
    };
    EntityFactory.builders[Types.Entities.BALLOONHOTDOGR] = function(id) {
        return new Mobs.balloonhotdogr(id);
    };
    EntityFactory.builders[Types.Entities.BALLOONGIRAFFEO] = function(id) {
        return new Mobs.balloongiraffeo(id);
    };
    EntityFactory.builders[Types.Entities.SHARKBOSS] = function(id) {
        return new Mobs.sharkboss(id);
    };
    EntityFactory.builders[Types.Entities.M88NMINE] = function(id) {
        return new Mobs.m88nmine(id);
    };
    EntityFactory.builders[Types.Entities.M88NBTCMINE] = function(id) {
        return new Mobs.m88nbtcmine(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYMONKEY] = function(id) {
        return new Mobs.m88nbabymonkey(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYCHIMP] = function(id) {
        return new Mobs.m88nbabychimp(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYAPE] = function(id) {
        return new Mobs.m88nbabyape(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYPENGUIN] = function(id) {
        return new Mobs.m88nbabypenguin(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYTURTLE] = function(id) {
        return new Mobs.m88nbabyturtle(id);
    };
    EntityFactory.builders[Types.Entities.M88NDADDYAPE] = function(id) {
        return new Mobs.m88ndaddyape(id);
    };
    EntityFactory.builders[Types.Entities.M88NDADDYPENGUIN] = function(id) {
        return new Mobs.m88ndaddypenguin(id);
    };
    EntityFactory.builders[Types.Entities.M88NDADDYTURTLE] = function(id) {
        return new Mobs.m88ndaddyturtle(id);
    };
    EntityFactory.builders[Types.Entities.M88NPARROT] = function(id) {
        return new Mobs.m88nparrot(id);
    };
    EntityFactory.builders[Types.Entities.M88NTOUCAN] = function(id) {
        return new Mobs.m88ntoucan(id);
    };
    EntityFactory.builders[Types.Entities.M88NSEAL] = function(id) {
        return new Mobs.m88nseal(id);
    };
    EntityFactory.builders[Types.Entities.M88NWALRUS] = function(id) {
        return new Mobs.m88nwalrus(id);
    };
    EntityFactory.builders[Types.Entities.M88NBUNNYBLUE] = function(id) {
        return new Mobs.m88nbunnyblue(id);
    };
    EntityFactory.builders[Types.Entities.M88NBUNNYPINK] = function(id) {
        return new Mobs.m88nbunnypink(id);
    };
    EntityFactory.builders[Types.Entities.M88NBUNNYYELLOW] = function(id) {
        return new Mobs.m88nbunnyyellow(id);
    };
    EntityFactory.builders[Types.Entities.M88NBUNNYWHITE] = function(id) {
        return new Mobs.m88nbunnywhite(id);
    };
    EntityFactory.builders[Types.Entities.M88NKITTENTABBY] = function(id) {
        return new Mobs.m88nkittentabby(id);
    };
    EntityFactory.builders[Types.Entities.M88NPUPPYYORKIE] = function(id) {
        return new Mobs.m88npuppyyorkie(id);
    };
    EntityFactory.builders[Types.Entities.M88NTIGERCUB] = function(id) {
        return new Mobs.m88ntigercub(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYDUCK] = function(id) {
        return new Mobs.m88nbabyduck(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYPIG] = function(id) {
        return new Mobs.m88nbabypig(id);
    };
    EntityFactory.builders[Types.Entities.M88NFLAMINGO] = function(id) {
        return new Mobs.m88nflamingo(id);
    };
    EntityFactory.builders[Types.Entities.M88NFROG] = function(id) {
        return new Mobs.m88nfrog(id);
    };
    EntityFactory.builders[Types.Entities.M88NGOAT] = function(id) {
        return new Mobs.m88ngoat(id);
    };
    EntityFactory.builders[Types.Entities.M88NSWAN] = function(id) {
        return new Mobs.m88nswan(id);
    };
    EntityFactory.builders[Types.Entities.M88NVULTURE] = function(id) {
        return new Mobs.m88nvulture(id);
    };
    EntityFactory.builders[Types.Entities.M88NBIGCHUNGUS] = function(id) {
        return new Mobs.m88nbigchungus(id);
    };
    EntityFactory.builders[Types.Entities.M88NOCTOPUSSY] = function(id) {
        return new Mobs.m88noctopussy(id);
    };
    EntityFactory.builders[Types.Entities.M88NMAGICCARPET] = function(id) {
        return new Mobs.m88nmagiccarpet(id);
    };
    EntityFactory.builders[Types.Entities.M88NHERMIE] = function(id) {
        return new Mobs.m88nhermie(id);
    };
    EntityFactory.builders[Types.Entities.M88NMRCRAB] = function(id) {
        return new Mobs.m88nmrcrab(id);
    };
    EntityFactory.builders[Types.Entities.M88NPINATABALLOONS] = function(id) {
        return new Mobs.m88npinataballoons(id);
    };
    EntityFactory.builders[Types.Entities.M88NDINOR] = function(id) {
        return new Mobs.m88ndinor(id);
    };
    EntityFactory.builders[Types.Entities.M88NDINOW] = function(id) {
        return new Mobs.m88ndinow(id);
    };
    EntityFactory.builders[Types.Entities.M88NDINOB] = function(id) {
        return new Mobs.m88ndinob(id);
    };
    EntityFactory.builders[Types.Entities.M88NDINOG] = function(id) {
        return new Mobs.m88ndinog(id);
    };
    EntityFactory.builders[Types.Entities.ROACHCLIP] = function(id) {
        return new Mobs.roachclip(id);
    };
    EntityFactory.builders[Types.Entities.M88NLION] = function(id) {
        return new Mobs.m88nlion(id);
    };
    EntityFactory.builders[Types.Entities.M88NTIGER] = function(id) {
        return new Mobs.m88ntiger(id);
    };
    EntityFactory.builders[Types.Entities.M88NCAMEL] = function(id) {
        return new Mobs.m88ncamel(id);
    };
    EntityFactory.builders[Types.Entities.M88NFLYBUTTERFLY] = function(id) {
        return new Mobs.m88nflybutterfly(id);
    };
    EntityFactory.builders[Types.Entities.M88NNIGHTMAREMONSTERA] = function(id) {
        return new Mobs.m88nnightmaremonstera(id);
    };
    EntityFactory.builders[Types.Entities.M88NNIGHTMAREMONSTERB] = function(id) {
        return new Mobs.m88nnightmaremonsterb(id);
    };
    EntityFactory.builders[Types.Entities.M88NNIGHTMAREMONSTERG] = function(id) {
        return new Mobs.m88nnightmaremonsterg(id);
    };
    EntityFactory.builders[Types.Entities.M88NNIGHTMAREMONSTERP] = function(id) {
        return new Mobs.m88nnightmaremonsterp(id);
    };
    EntityFactory.builders[Types.Entities.M88NNIGHTMAREMONSTERV] = function(id) {
        return new Mobs.m88nnightmaremonsterv(id);
    };
    EntityFactory.builders[Types.Entities.M88NNIGHTMAREMONSTERY] = function(id) {
        return new Mobs.m88nnightmaremonstery(id);
    };
    EntityFactory.builders[Types.Entities.M88NBONER] = function(id) {
        return new Mobs.m88nboner(id);
    };
    EntityFactory.builders[Types.Entities.M88NSHORTSQUEEZE] = function(id) {
        return new Mobs.m88nshortsqueeze(id);
    };
    EntityFactory.builders[Types.Entities.M88NDADDYBEARBROWN] = function(id) {
        return new Mobs.m88ndaddybearbrown(id);
    };
    EntityFactory.builders[Types.Entities.M88NJAWS] = function(id) {
        return new Mobs.m88njaws(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHY] = function(id) {
        return new Mobs.m88nfishy(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHYB] = function(id) {
        return new Mobs.m88nfishyb(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHYC] = function(id) {
        return new Mobs.m88nfishyc(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHYD] = function(id) {
        return new Mobs.m88nfishyd(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHYE] = function(id) {
        return new Mobs.m88nfishye(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHYF] = function(id) {
        return new Mobs.m88nfishyf(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHYG] = function(id) {
        return new Mobs.m88nfishyg(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHYH] = function(id) {
        return new Mobs.m88nfishyh(id);
    };
    EntityFactory.builders[Types.Entities.M88NFISHLIPS] = function(id) {
        return new Mobs.m88nfishlips(id);
    };
    EntityFactory.builders[Types.Entities.M88NSUSHI] = function(id) {
        return new Mobs.m88nsushi(id);
    };
    EntityFactory.builders[Types.Entities.M88NSASHIMI] = function(id) {
        return new Mobs.m88nsashimi(id);
    };
    EntityFactory.builders[Types.Entities.M88NCONEPOOPER] = function(id) {
        return new Mobs.m88nconepooper(id);
    };
    EntityFactory.builders[Types.Entities.M88NKENNYCLOWN] = function(id) {
        return new Mobs.m88nkennyclown(id);
    };
    EntityFactory.builders[Types.Entities.M88NNANCYCLOWN] = function(id) {
        return new Mobs.m88nnancyclown(id);
    };
    EntityFactory.builders[Types.Entities.M88NJIMMYCLOWN] = function(id) {
        return new Mobs.m88njimmyclown(id);
    };
    EntityFactory.builders[Types.Entities.M88NTHEWARDEN] = function(id) {
        return new Mobs.m88nthewarden(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYYODA1] = function(id) {
        return new Mobs.m88nbabyyoda1(id);
    };
    EntityFactory.builders[Types.Entities.M88NBABYYODA2] = function(id) {
        return new Mobs.m88nbabyyoda2(id);
    };
    EntityFactory.builders[Types.Entities.M88NHEADLESSONESIE] = function(id) {
        return new Mobs.m88nheadlessonesie(id);
    };
    EntityFactory.builders[Types.Entities.M88NHEADLESSSKELETON] = function(id) {
        return new Mobs.m88nheadlessskeleton(id);
    };
    EntityFactory.builders[Types.Entities.M88NGHOSTPUMPKIN] = function(id) {
        return new Mobs.m88nghostpumpkin(id);
    };
    EntityFactory.builders[Types.Entities.M88NTURKEY] = function(id) {
        return new Mobs.m88nturkey(id);
    };
    EntityFactory.builders[Types.Entities.M88NICECRAB] = function(id) {
        return new Mobs.m88nicecrab(id);
    };
    EntityFactory.builders[Types.Entities.M88NELF] = function(id) {
        return new Mobs.m88nelf(id);
    };
    EntityFactory.builders[Types.Entities.M88NELF2] = function(id) {
        return new Mobs.m88nelf2(id);
    };
    EntityFactory.builders[Types.Entities.M88NREINDEER] = function(id) {
        return new Mobs.m88nreindeer(id);
    };
    EntityFactory.builders[Types.Entities.M88NSNOWMOBILE] = function(id) {
        return new Mobs.m88nsnowmobile(id);
    };
    EntityFactory.builders[Types.Entities.M88NCOW] = function(id) {
        return new Mobs.m88ncow(id);
    };
    EntityFactory.builders[Types.Entities.M88NTREE] = function(id) {
        return new Mobs.m88ntree(id);
    };
    EntityFactory.builders[Types.Entities.M88NUFO1] = function(id) {
        return new Mobs.m88nufo1(id);
    };
    EntityFactory.builders[Types.Entities.M88NUFO2] = function(id) {
        return new Mobs.m88nufo2(id);
    };
    EntityFactory.builders[Types.Entities.M88NUFO3] = function(id) {
        return new Mobs.m88nufo3(id);
    };
    EntityFactory.builders[Types.Entities.M88NUFO4] = function(id) {
        return new Mobs.m88nufo4(id);
    };
    EntityFactory.builders[Types.Entities.M88NHOTWING] = function(id) {
        return new Mobs.m88nhotwing(id);
    };
    EntityFactory.builders[Types.Entities.M88NSAW] = function(id) {
        return new Mobs.m88nsaw(id);
    };
    EntityFactory.builders[Types.Entities.M88NMEATHOOK] = function(id) {
        return new Mobs.m88nmeathook(id);
    };
    EntityFactory.builders[Types.Entities.M88NTRAINER] = function(id) {
        return new Mobs.m88ntrainer(id);
    };
    EntityFactory.builders[Types.Entities.M88NTRAINER2] = function(id) {
        return new Mobs.m88ntrainer2(id);
    };
    EntityFactory.builders[Types.Entities.M88NTRAINER3] = function(id) {
        return new Mobs.m88ntrainer3(id);
    };
    EntityFactory.builders[Types.Entities.M88NTRAINER4] = function(id) {
        return new Mobs.m88ntrainer4(id);
    };
    EntityFactory.builders[Types.Entities.M88NZOMBIETRASH] = function(id) {
        return new Mobs.m88nzombietrash(id);
    };
    EntityFactory.builders[Types.Entities.M88NPOISONFROG1] = function(id) {
        return new Mobs.m88npoisonfrog1(id);
    };
    EntityFactory.builders[Types.Entities.M88NPOISONFROG2] = function(id) {
        return new Mobs.m88npoisonfrog2(id);
    };
    EntityFactory.builders[Types.Entities.M88NPOISONFROG3] = function(id) {
        return new Mobs.m88npoisonfrog3(id);
    };
    EntityFactory.builders[Types.Entities.M88NPOISONFROG4] = function(id) {
        return new Mobs.m88npoisonfrog4(id);
    };
    EntityFactory.builders[Types.Entities.M88NPOISONFROG5] = function(id) {
        return new Mobs.m88npoisonfrog5(id);
    };
    EntityFactory.builders[Types.Entities.M88NZOMBIEBOO] = function(id) {
        return new Mobs.m88nzombieboo(id);
    };

    //m88n Mob Nexans
    EntityFactory.builders[Types.Entities.NEXAN1] = function(id) {
        return new Mobs.nexan1(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN2] = function(id) {
        return new Mobs.nexan2(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN3] = function(id) {
        return new Mobs.nexan3(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN6] = function(id) {
        return new Mobs.nexan6(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN7] = function(id) {
        return new Mobs.nexan7(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN8] = function(id) {
        return new Mobs.nexan8(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN9] = function(id) {
        return new Mobs.nexan9(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN21] = function(id) {
        return new Mobs.nexan21(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN22] = function(id) {
        return new Mobs.nexan22(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN23] = function(id) {
        return new Mobs.nexan23(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN24] = function(id) {
        return new Mobs.nexan24(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN25] = function(id) {
        return new Mobs.nexan25(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN26] = function(id) {
        return new Mobs.nexan26(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN27] = function(id) {
        return new Mobs.nexan27(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN30] = function(id) {
        return new Mobs.nexan30(id);
    };
    EntityFactory.builders[Types.Entities.M88NJEEVES] = function(id) {
        return new Mobs.m88njeeves(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN49] = function(id) {
        return new Mobs.nexan49(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN50] = function(id) {
        return new Mobs.nexan50(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN51] = function(id) {
        return new Mobs.nexan51(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN52] = function(id) {
        return new Mobs.nexan52(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN53] = function(id) {
        return new Mobs.nexan53(id);
    };
    EntityFactory.builders[Types.Entities.NEXAN54] = function(id) {
        return new Mobs.nexan54(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAID1] = function(id) {
        return new Mobs.m88nmermaid1(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAID2] = function(id) {
        return new Mobs.m88nmermaid2(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAID3] = function(id) {
        return new Mobs.m88nmermaid3(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAID4] = function(id) {
        return new Mobs.m88nmermaid4(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAID5] = function(id) {
        return new Mobs.m88nmermaid5(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAN1] = function(id) {
        return new Mobs.m88nmerman1(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAN2] = function(id) {
        return new Mobs.m88nmerman2(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAN3] = function(id) {
        return new Mobs.m88nmerman3(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAN4] = function(id) {
        return new Mobs.m88nmerman4(id);
    };
    EntityFactory.builders[Types.Entities.M88NMERMAN5] = function(id) {
        return new Mobs.m88nmerman5(id);
    };
    EntityFactory.builders[Types.Entities.M88NASTRONAUT2] = function(id) {
        return new Mobs.m88nastronaut2(id);
    };
    EntityFactory.builders[Types.Entities.M88NASTRONAUT3] = function(id) {
        return new Mobs.m88nastronaut3(id);
    };
    EntityFactory.builders[Types.Entities.NEXANZOMBIE1] = function(id) {
        return new Mobs.nexanzombie1(id);
    };
    EntityFactory.builders[Types.Entities.M88NGRIMREAPER] = function(id) {
        return new Mobs.m88ngrimreaper(id);
    };
    EntityFactory.builders[Types.Entities.NEXANHAZMAT1] = function(id) {
        return new Mobs.nexanhazmat1(id);
    };
    
    
    //Short Destroyers
    EntityFactory.builders[Types.Entities.LATEFLEA] = function(id) {
        return new Mobs.lateflea(id);
    };
    EntityFactory.builders[Types.Entities.WOLFBOSS] = function(id) {
        return new Mobs.wolfboss(id);
    };
    EntityFactory.builders[Types.Entities.FLEABOSS] = function(id) {
        return new Mobs.fleaboss(id);
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
   
    EntityFactory.builders[Types.Entities.COBWALKINGNPC1] = function(id) { return new Mobs.cobWalkingNpc1(id); };
    EntityFactory.builders[Types.Entities.COBWALKINGNPC2] = function(id) { return new Mobs.cobWalkingNpc2(id); };
    EntityFactory.builders[Types.Entities.COBWALKINGNPC3] = function(id) { return new Mobs.cobWalkingNpc3(id); };
    EntityFactory.builders[Types.Entities.COBWALKINGNPC4] = function(id) { return new Mobs.cobWalkingNpc4(id); };
    EntityFactory.builders[Types.Entities.COBWALKINGNPC5] = function(id) { return new Mobs.cobWalkingNpc5(id); };
    EntityFactory.builders[Types.Entities.ROBITSE3]=function(id){return new Mobs.ROBITSE3(id);};
    EntityFactory.builders[Types.Entities.COLOSSUS]=function(id){return new Mobs.COLOSSUS(id);};
    EntityFactory.builders[Types.Entities.ROBITSE4]=function(id){return new Mobs.ROBITSE4(id);};
    EntityFactory.builders[Types.Entities.ROBITSE5]=function(id){return new Mobs.ROBITSE5(id);};
    EntityFactory.builders[Types.Entities.ROBITSE6]=function(id){return new Mobs.ROBITSE6(id);};
    EntityFactory.builders[Types.Entities.ONI]=function(id){return new Mobs.ONI(id);};
    EntityFactory.builders[Types.Entities.ROBITSE7]=function(id){return new Mobs.ROBITSE7(id);};
    EntityFactory.builders[Types.Entities.ROBITSE8]=function(id){return new Mobs.ROBITSE8(id);};
    EntityFactory.builders[Types.Entities.ROBITSE9]=function(id){return new Mobs.ROBITSE9(id);};
    EntityFactory.builders[Types.Entities.ROBITSE10]=function(id){return new Mobs.ROBITSE10(id);};
    EntityFactory.builders[Types.Entities.INFERNOID]=function(id){return new Mobs.INFERNOID(id);};
    EntityFactory.builders[Types.Entities.ZAROTH]=function(id){return new Mobs.ZAROTH(id);};
    EntityFactory.builders[Types.Entities.INFECTION]=function(id){return new Mobs.INFECTION(id);};

    //BITCORN MOBS
    EntityFactory.builders[Types.Entities.SLUDGERAT] = function(id) {return new Mobs.SLUDGERAT(id);};
    EntityFactory.builders[Types.Entities.SPACECRAB] = function(id) {return new Mobs.SPACECRAB(id);};
    EntityFactory.builders[Types.Entities.BLACKMAGE] = function(id) {return new Mobs.BLACKMAGE(id);};
    EntityFactory.builders[Types.Entities.RABBID] = function(id) {return new Mobs.RABBID(id);};
    EntityFactory.builders[Types.Entities.ZOMBBID] = function(id) {return new Mobs.ZOMBBID(id);};
    EntityFactory.builders[Types.Entities.HOPPURP] = function(id) {return new Mobs.HOPPURP(id);};
    EntityFactory.builders[Types.Entities.HOPPINK] = function(id) {return new Mobs.HOPPINK(id);};
    EntityFactory.builders[Types.Entities.CRAPTOR] = function(id) {return new Mobs.CRAPTOR(id);};

    EntityFactory.builders[Types.Entities.BURGERBOSS]=function(id){return new Mobs.BURGERBOSS(id);};
    EntityFactory.builders[Types.Entities.FRYGUY]=function(id){return new Mobs.FRYGUY(id);};
    EntityFactory.builders[Types.Entities.GHOST1]=function(id){return new Mobs.GHOST1(id);};
    EntityFactory.builders[Types.Entities.GHOST2]=function(id){return new Mobs.GHOST2(id);};
    EntityFactory.builders[Types.Entities.GHOST3]=function(id){return new Mobs.GHOST3(id);};
    EntityFactory.builders[Types.Entities.HORSEMAN]=function(id){return new Mobs.HORSEMAN(id);};
    EntityFactory.builders[Types.Entities.PUMPKINPUNK]=function(id){return new Mobs.PUMPKINPUNK(id);};
    EntityFactory.builders[Types.Entities.WRAITH]=function(id){return new Mobs.WRAITH(id);};
    EntityFactory.builders[Types.Entities.PUMPKINWARLOCK]=function(id){return new Mobs.PUMPKINWARLOCK(id);};
    EntityFactory.builders[Types.Entities.EVILPUMPKIN]=function(id){return new Mobs.EVILPUMPKIN(id);};
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
    
    EntityFactory.builders[Types.Entities.LOOPRING] = function(id) {
        return new Items.Loopring(id);
    };

    EntityFactory.builders[Types.Entities.TAIKOBOOST] = function(id) {
        return new Items.TaikoBoost(id);
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

    EntityFactory.builders[Types.Entities.CPOTION_S] = function(id) {
        return new Items.Cpotion_s(id);
    };

    EntityFactory.builders[Types.Entities.CPOTION_M] = function(id) {
        return new Items.Cpotion_m(id);
    };

    EntityFactory.builders[Types.Entities.CPOTION_L] = function(id) {
        return new Items.Cpotion_l(id);
    };

    EntityFactory.builders[Types.Entities.CIMMUPOT] = function(id) {
        return new Items.Cimmupot(id);
    };

    EntityFactory.builders[Types.Entities.CAGEDRAT] = function(id) {
        return new Items.Cagedrat(id);
    };

    EntityFactory.builders[Types.Entities.WOOD] = function(id) {
        return new Items.Wood(id);
    };

    EntityFactory.builders[Types.Entities.ORE] = function(id) {
        return new Items.Ore(id);
    };

    EntityFactory.builders[Types.Entities.MANACRYSTAL] = function(id) {
        return new Items.Manacrystal(id);
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
    EntityFactory.builders[Types.Entities.GOLD4]=function(id){return new Items.GOLD4(id);};
    EntityFactory.builders[Types.Entities.GOLD5]=function(id){return new Items.GOLD5(id);};
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
    EntityFactory.builders[Types.Entities.ENERGYDRINK] = function(id) { return new Items.energydrink(id); };
    EntityFactory.builders[Types.Entities.FLYER] = function(id) { return new Items.flyer(id); };
    //m88n's Items
    EntityFactory.builders[Types.Entities.M88NMAP] = function(id) { return new Items.m88nmap(id); };
    EntityFactory.builders[Types.Entities.M88NEGG1] = function(id) { return new Items.m88negg1(id); };
    EntityFactory.builders[Types.Entities.M88NEGG2] = function(id) { return new Items.m88negg2(id); };
    EntityFactory.builders[Types.Entities.M88NEGG3] = function(id) { return new Items.m88negg3(id); };
    EntityFactory.builders[Types.Entities.M88NEGG4] = function(id) { return new Items.m88negg4(id); };
    EntityFactory.builders[Types.Entities.M88NEGG5] = function(id) { return new Items.m88negg5(id); };
    EntityFactory.builders[Types.Entities.M88NEGG6] = function(id) { return new Items.m88negg6(id); };
    EntityFactory.builders[Types.Entities.M88NEGG7] = function(id) { return new Items.m88negg7(id); };
    EntityFactory.builders[Types.Entities.M88NFABERGEEGG] = function(id) { return new Items.m88nfabergeegg(id); };
    EntityFactory.builders[Types.Entities.M88NGEM]=function(id){return new Items.m88ngem(id);};
    EntityFactory.builders[Types.Entities.M88NMONEYBAGS]=function(id){return new Items.m88nmoneybags(id);};
    EntityFactory.builders[Types.Entities.M88NGOLDENPOO]=function(id){return new Items.m88ngoldenpoo(id);};
    EntityFactory.builders[Types.Entities.M88NGOLDENCHALIS]=function(id){return new Items.m88ngoldenchalis(id);};
    EntityFactory.builders[Types.Entities.M88NDRSGME]=function(id){return new Items.m88ndrsgme(id);};
    EntityFactory.builders[Types.Entities.MOVIEGLASSES]=function(id){return new Items.movieglasses(id);};
    EntityFactory.builders[Types.Entities.BATTERY]=function(id){return new Items.battery(id);};
    EntityFactory.builders[Types.Entities.GAMEBOY]=function(id){return new Items.gameboy(id);};
    EntityFactory.builders[Types.Entities.HARDWALLET]=function(id){return new Items.hardwallet(id);};
    EntityFactory.builders[Types.Entities.M88NCOMPASS] = function(id) { return new Items.m88ncompass(id); };
    EntityFactory.builders[Types.Entities.M88NBINOCULARS] = function(id) { return new Items.m88nbinoculars(id); };
    EntityFactory.builders[Types.Entities.M88NPEEL] = function(id) { return new Items.m88npeel(id); };
    EntityFactory.builders[Types.Entities.M88NDUNGBEETLE] = function(id) { return new Items.m88ndungbeetle(id); };
    EntityFactory.builders[Types.Entities.M88NFLY] = function(id) { return new Items.m88nfly(id); };
    EntityFactory.builders[Types.Entities.M88NJUNEBUG] = function(id) { return new Items.m88njunebug(id); };
    EntityFactory.builders[Types.Entities.M88NBUTTERFLY] = function(id) { return new Items.m88nbutterfly(id); };
    EntityFactory.builders[Types.Entities.M88NSTICKBUG] = function(id) { return new Items.m88nstickbug(id); };
    EntityFactory.builders[Types.Entities.M88NDIAMONDNECKLACE] = function(id) { return new Items.m88ndiamondnecklace(id); };
    EntityFactory.builders[Types.Entities.M88NDIAMONDRING] = function(id) { return new Items.m88ndiamondring(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDEARRINGS] = function(id) { return new Items.m88ngoldearrings(id); };
    EntityFactory.builders[Types.Entities.M88NCLOVER] = function(id) { return new Items.m88nclover(id); };
    EntityFactory.builders[Types.Entities.M88NLUCKYCLOVER] = function(id) { return new Items.m88nluckyclover(id); };
    EntityFactory.builders[Types.Entities.M88NMAIL] = function(id) { return new Items.m88nmail(id); };
    EntityFactory.builders[Types.Entities.M88NPACKAGE] = function(id) { return new Items.m88npackage(id); };
    EntityFactory.builders[Types.Entities.M88NSTEAK] = function(id) { return new Items.m88nsteak(id); };
    EntityFactory.builders[Types.Entities.M88NPOTATO] = function(id) { return new Items.m88npotato(id); };
    EntityFactory.builders[Types.Entities.M88NSALAD] = function(id) { return new Items.m88nsalad(id); };
    EntityFactory.builders[Types.Entities.M88NBREWSKI] = function(id) { return new Items.m88nbrewski(id); };
    EntityFactory.builders[Types.Entities.M88NPIE] = function(id) { return new Items.m88npie(id); };
    EntityFactory.builders[Types.Entities.M88NSEEDS] = function(id) { return new Items.m88nseeds(id); };
    EntityFactory.builders[Types.Entities.M88NSACK] = function(id) { return new Items.m88nsack(id); };
    EntityFactory.builders[Types.Entities.M88NSHOVEL] = function(id) { return new Items.m88nshovel(id); };
    EntityFactory.builders[Types.Entities.M88NWATERCAN] = function(id) { return new Items.m88nwatercan(id); };
    EntityFactory.builders[Types.Entities.M88NTICKET] = function(id) { return new Items.m88nticket(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDENTICKET] = function(id) { return new Items.m88ngoldenticket(id); };
    EntityFactory.builders[Types.Entities.M88NDRSBOOK] = function(id) { return new Items.m88ndrsbook(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDTIARA] = function(id) { return new Items.m88ngoldtiara(id); };
    EntityFactory.builders[Types.Entities.M88NTEDDY] = function(id) { return new Items.m88nteddy(id); };
    EntityFactory.builders[Types.Entities.M88NDIRT] = function(id) { return new Items.m88ndirt(id); };
    EntityFactory.builders[Types.Entities.M88NWORM] = function(id) { return new Items.m88nworm(id); };
    EntityFactory.builders[Types.Entities.M88NSNAIL] = function(id) { return new Items.m88nsnail(id); };
    EntityFactory.builders[Types.Entities.M88NTENTACLE] = function(id) { return new Items.m88ntentacle(id); };
    EntityFactory.builders[Types.Entities.M88NFASTSHOES] = function(id) { return new Items.m88nfastshoes(id); };
    EntityFactory.builders[Types.Entities.M88NSLOWSHOES] = function(id) { return new Items.m88nslowshoes(id); };
    EntityFactory.builders[Types.Entities.M88NWIZARDSHAT] = function(id) { return new Items.m88nwizardshat(id); };
    EntityFactory.builders[Types.Entities.M88NBRASSKNUCKLES] = function(id) { return new Items.m88nbrassknuckles(id); };
    EntityFactory.builders[Types.Entities.M88NKEVLARARMOR] = function(id) { return new Items.m88nkevlararmor(id); };
    EntityFactory.builders[Types.Entities.M88NGRENADE] = function(id) { return new Items.m88ngrenade(id); };
    EntityFactory.builders[Types.Entities.M88NDINNERBELL] = function(id) { return new Items.m88ndinnerbell(id); };
    EntityFactory.builders[Types.Entities.M88NPANTS] = function(id) { return new Items.m88npants(id); };
    EntityFactory.builders[Types.Entities.M88NTSHIRT] = function(id) { return new Items.m88ntshirt(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDMEDAL] = function(id) { return new Items.m88ngoldmedal(id); };
    EntityFactory.builders[Types.Entities.M88NSILVERMEDAL] = function(id) { return new Items.m88nsilvermedal(id); };
    EntityFactory.builders[Types.Entities.M88NBRONZEMEDAL] = function(id) { return new Items.m88nbronzemedal(id); };
    EntityFactory.builders[Types.Entities.M88NFISHINGPOLE] = function(id) { return new Items.m88nfishingpole(id); };
    EntityFactory.builders[Types.Entities.M88NPRIZES] = function(id) { return new Items.m88nprizes(id); };
    EntityFactory.builders[Types.Entities.M88NLAMP] = function(id) { return new Items.m88nlamp(id); };
    EntityFactory.builders[Types.Entities.M88NGEMTICKET] = function(id) { return new Items.m88ngemticket(id); };
    EntityFactory.builders[Types.Entities.M88NBAG] = function(id) { return new Items.m88nbag(id); };
    EntityFactory.builders[Types.Entities.M88NVIPBAG] = function(id) { return new Items.m88nvipbag(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDBAG] = function(id) { return new Items.m88ngoldbag(id); };
    EntityFactory.builders[Types.Entities.M88NGEMBAG] = function(id) { return new Items.m88ngembag(id); };
    EntityFactory.builders[Types.Entities.M88NLUCKYBAG] = function(id) { return new Items.m88nluckybag(id); };
    EntityFactory.builders[Types.Entities.M88NCHAMPAGNE] = function(id) { return new Items.m88nchampagne(id); };
    EntityFactory.builders[Types.Entities.M88NCHAMPAGNEBOTTLE] = function(id) { return new Items.m88nchampagnebottle(id); };
    EntityFactory.builders[Types.Entities.M88NSHINE] = function(id) { return new Items.m88nshine(id); };
    EntityFactory.builders[Types.Entities.M88NWHISKEY] = function(id) { return new Items.m88nwhiskey(id); };
    EntityFactory.builders[Types.Entities.M88NDARKCLOUD] = function(id) { return new Items.m88ndarkcloud(id); };
    EntityFactory.builders[Types.Entities.M88NDREAMCLOUD] = function(id) { return new Items.m88ndreamcloud(id); };
    EntityFactory.builders[Types.Entities.M88NSUNSHINE] = function(id) { return new Items.m88nsunshine(id); };
    EntityFactory.builders[Types.Entities.M88NSKELETONKEY] = function(id) { return new Items.m88nskeletonkey(id); };
    EntityFactory.builders[Types.Entities.M88NHOLYHANDGRENADE] = function(id) { return new Items.m88nholyhandgrenade(id); };
    EntityFactory.builders[Types.Entities.M88NDIRTYMARTINI] = function(id) { return new Items.m88ndirtymartini(id); };
    EntityFactory.builders[Types.Entities.M88NHELIOISLANDICEDTEA] = function(id) { return new Items.m88nhelioislandicedtea(id); };
    EntityFactory.builders[Types.Entities.M88NMANAMAITAI] = function(id) { return new Items.m88nmanamaitai(id); };
    EntityFactory.builders[Types.Entities.M88NMERMAIDMOJITO] = function(id) { return new Items.m88nmermaidmojito(id); };
    EntityFactory.builders[Types.Entities.M88NMIMOSA] = function(id) { return new Items.m88nmimosa(id); };
    EntityFactory.builders[Types.Entities.M88NNEXUSSANGRIA] = function(id) { return new Items.m88nnexussangria(id); };
    EntityFactory.builders[Types.Entities.M88NPARADISEHURRICANE] = function(id) { return new Items.m88nparadisehurricane(id); };
    EntityFactory.builders[Types.Entities.M88NSUNSETDAIQUIRI] = function(id) { return new Items.m88nsunsetdaiquiri(id); };
    EntityFactory.builders[Types.Entities.M88NBURGER] = function(id) { return new Items.m88nburger(id); };
    EntityFactory.builders[Types.Entities.M88NFRIES] = function(id) { return new Items.m88nfries(id); };
    EntityFactory.builders[Types.Entities.M88NHOTDOG] = function(id) { return new Items.m88nhotdog(id); };
    EntityFactory.builders[Types.Entities.M88NTACO] = function(id) { return new Items.m88ntaco(id); };
    EntityFactory.builders[Types.Entities.M88NMEDIC] = function(id) { return new Items.m88nmedic(id); };
    EntityFactory.builders[Types.Entities.M88NMEDIC2] = function(id) { return new Items.m88nmedic2(id); };
    EntityFactory.builders[Types.Entities.M88NRUCK] = function(id) { return new Items.m88nruck(id); };
    EntityFactory.builders[Types.Entities.M88NRUCK2] = function(id) { return new Items.m88nruck2(id); };
    EntityFactory.builders[Types.Entities.M88NRUCK3] = function(id) { return new Items.m88nruck3(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDKNUCKLES] = function(id) { return new Items.m88ngoldknuckles(id); };
    EntityFactory.builders[Types.Entities.M88NPIESLINGER] = function(id) { return new Items.m88npieslinger(id); };
    EntityFactory.builders[Types.Entities.CANDYBUCKET] = function(id) { return new Items.candybucket(id); };
    EntityFactory.builders[Types.Entities.CANDYTREAT] = function(id) { return new Items.candytreat(id); };
    EntityFactory.builders[Types.Entities.CANDYCORNTREAT] = function(id) { return new Items.candycorntreat(id); };
    EntityFactory.builders[Types.Entities.CHOCOLATETREAT] = function(id) { return new Items.chocolatetreat(id); };
    EntityFactory.builders[Types.Entities.LOLLITREAT] = function(id) { return new Items.lollitreat(id); };
    EntityFactory.builders[Types.Entities.HEADSTONETRICK] = function(id) { return new Items.headstonetrick(id); };
    EntityFactory.builders[Types.Entities.SKULLNBONESTRICK] = function(id) { return new Items.skullnbonestrick(id); };
    EntityFactory.builders[Types.Entities.SPIDERTRICK] = function(id) { return new Items.spidertrick(id); };
    EntityFactory.builders[Types.Entities.M88NDUFFLEBAG] = function(id) { return new Items.m88ndufflebag(id); };
    EntityFactory.builders[Types.Entities.M88NCHOCOLATEBANANA] = function(id) { return new Items.m88nchocolatebanana(id); };
    EntityFactory.builders[Types.Entities.M88NCHOCOLATENUTSBANANA] = function(id) { return new Items.m88nchocolatenutsbanana(id); };
    EntityFactory.builders[Types.Entities.M88NCHOCOLATESPRINKLEBANANA] = function(id) { return new Items.m88nchocolatesprinklebanana(id); };
    EntityFactory.builders[Types.Entities.M88NCHOCOLATEWHIPPEDBANANA] = function(id) { return new Items.m88nchocolatewhippedbanana(id); };
    EntityFactory.builders[Types.Entities.M88NM88NBANANA] = function(id) { return new Items.m88nm88nbanana(id); };
    EntityFactory.builders[Types.Entities.M88NPICKLEBANANA] = function(id) { return new Items.m88npicklebanana(id); };
    EntityFactory.builders[Types.Entities.M88NPLAINBANANA] = function(id) { return new Items.m88nplainbanana(id); };
    EntityFactory.builders[Types.Entities.M88NBANANAPIE] = function(id) { return new Items.m88nbananapie(id); };
    EntityFactory.builders[Types.Entities.M88NCHERRYPIE] = function(id) { return new Items.m88ncherrypie(id); };
    EntityFactory.builders[Types.Entities.M88NLEMONPIE] = function(id) { return new Items.m88nlemonpie(id); };
    EntityFactory.builders[Types.Entities.M88NPUMPKINPIE] = function(id) { return new Items.m88npumpkinpie(id); };
    EntityFactory.builders[Types.Entities.M88NTURKEYDINNER] = function(id) { return new Items.m88nturkeydinner(id); };
    EntityFactory.builders[Types.Entities.M88NTURKEYFEATHER] = function(id) { return new Items.m88nturkeyfeather(id); };
    EntityFactory.builders[Types.Entities.M88NTURKEYLEG] = function(id) { return new Items.m88nturkeyleg(id); };
    EntityFactory.builders[Types.Entities.M88NBROCCOLI] = function(id) { return new Items.m88nbroccoli(id); };
    EntityFactory.builders[Types.Entities.M88NCAULIFLOWER] = function(id) { return new Items.m88ncauliflower(id); };
    EntityFactory.builders[Types.Entities.M88NLETTUCE] = function(id) { return new Items.m88nlettuce(id); };
    EntityFactory.builders[Types.Entities.M88NSTICKS] = function(id) { return new Items.m88nsticks(id); };
    EntityFactory.builders[Types.Entities.M88NTOMATO] = function(id) { return new Items.m88ntomato(id); };
    EntityFactory.builders[Types.Entities.M88NTURNIP] = function(id) { return new Items.m88nturnip(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDWORM] = function(id) { return new Items.m88ngoldworm(id); };
    EntityFactory.builders[Types.Entities.M88NDIAMONDWORM] = function(id) { return new Items.m88ndiamondworm(id); };
    EntityFactory.builders[Types.Entities.M88NSOURWORM] = function(id) { return new Items.m88nsourworm(id); };
    EntityFactory.builders[Types.Entities.M88NSOURWORM2] = function(id) { return new Items.m88nsourworm2(id); };
    EntityFactory.builders[Types.Entities.M88NBITCOIN] = function(id) { return new Items.m88nbitcoin(id); };
    EntityFactory.builders[Types.Entities.M88NBITCOINVIP] = function(id) { return new Items.m88nbitcoinvip(id); };
    EntityFactory.builders[Types.Entities.M88NBLUNT] = function(id) { return new Items.m88nblunt(id); };
    EntityFactory.builders[Types.Entities.M88NDIAMONDBLUNT] = function(id) { return new Items.m88ndiamondblunt(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDBLUNT] = function(id) { return new Items.m88ngoldblunt(id); };
    EntityFactory.builders[Types.Entities.M88NDIAMONDCLOVER] = function(id) { return new Items.m88ndiamondclover(id); };
    EntityFactory.builders[Types.Entities.M88NGOLDCLOVER] = function(id) { return new Items.m88ngoldclover(id); };
    EntityFactory.builders[Types.Entities.M88NLUCKYDIAMONDCLOVER] = function(id) { return new Items.m88nluckydiamondclover(id); };
    EntityFactory.builders[Types.Entities.M88NLUCKYGOLDCLOVER] = function(id) { return new Items.m88nluckygoldclover(id); };
    EntityFactory.builders[Types.Entities.M88NJOINT] = function(id) { return new Items.m88njoint(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIEFISH] = function(id) { return new Items.m88nzombiefish(id); };
    EntityFactory.builders[Types.Entities.M88NFIAT] = function(id) { return new Items.m88nfiat(id); };
    EntityFactory.builders[Types.Entities.M88NGRAVESTONE] = function(id) { return new Items.m88ngravestone(id); };
    EntityFactory.builders[Types.Entities.M88NSKULL] = function(id) { return new Items.m88nskull(id); };
    EntityFactory.builders[Types.Entities.M88NSPIDERWEB] = function(id) { return new Items.m88nspiderweb(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIEAMC] = function(id) { return new Items.m88nzombieamc(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIEBB] = function(id) { return new Items.m88nzombiebb(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIEBBBY] = function(id) { return new Items.m88nzombiebbby(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIEGME] = function(id) { return new Items.m88nzombiegme(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIERADIO] = function(id) { return new Items.m88nzombieradio(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIESEARS] = function(id) { return new Items.m88nzombiesears(id); };
    EntityFactory.builders[Types.Entities.M88NZOMBIETOYRF] = function(id) { return new Items.m88nzombietoyrf(id); };
    EntityFactory.builders[Types.Entities.POSEIDONSTRIDENT] = function(id) { return new Items.poseidonstrident(id); };
    //MRMlabs Items
    EntityFactory.builders[Types.Entities.FIRSTAIDKIT] = function(id) { return new Items.firstaidkit(id); };
    EntityFactory.builders[Types.Entities.BANDAID] = function(id) { return new Items.bandaid(id); };
    EntityFactory.builders[Types.Entities.LIGHTER] = function(id) { return new Items.lighter(id); };
    EntityFactory.builders[Types.Entities.CIGARETTE] = function(id) { return new Items.cigarette(id); };
    EntityFactory.builders[Types.Entities.CIGARETTEPACK] = function(id) { return new Items.cigarettepack(id); };
    EntityFactory.builders[Types.Entities.SOAP] = function(id) { return new Items.soap(id); };
    EntityFactory.builders[Types.Entities.STRANGEYELLOWLIQUID] = function(id) { return new Items.strangeyellowliquid(id); };
    //m88n TT Items
    EntityFactory.builders[Types.Entities.M88NAMMOCAN] = function(id) { return new Items.m88nammocan(id); };
    EntityFactory.builders[Types.Entities.M88NBANANA] = function(id) { return new Items.m88nbanana(id); };
    EntityFactory.builders[Types.Entities.M88NBASKETBALL] = function(id) { return new Items.m88nbasketball(id); };
    EntityFactory.builders[Types.Entities.M88NBLUEPRINT] = function(id) { return new Items.m88nblueprint(id); };
    EntityFactory.builders[Types.Entities.M88NBNOTE] = function(id) { return new Items.m88nbnote(id); };
    EntityFactory.builders[Types.Entities.M88NBONE] = function(id) { return new Items.m88nbone(id); };
    EntityFactory.builders[Types.Entities.M88NCARROT] = function(id) { return new Items.m88ncarrot(id); };
    EntityFactory.builders[Types.Entities.M88NCHEESE] = function(id) { return new Items.m88ncheese(id); };
    EntityFactory.builders[Types.Entities.M88NCHOCOLATE] = function(id) { return new Items.m88nchocolate(id); };
    EntityFactory.builders[Types.Entities.M88NCLEANUNDIES] = function(id) { return new Items.m88ncleanundies(id); };
    EntityFactory.builders[Types.Entities.M88NDOGCOLLAR] = function(id) { return new Items.m88ndogcollar(id); };
    EntityFactory.builders[Types.Entities.M88NDUCKY] = function(id) { return new Items.m88nducky(id); };
    EntityFactory.builders[Types.Entities.M88NENOTE] = function(id) { return new Items.m88nenote(id); };
    EntityFactory.builders[Types.Entities.M88NFANCYHAT] = function(id) { return new Items.m88nfancyhat(id); };
    EntityFactory.builders[Types.Entities.M88NGLOWSTICK] = function(id) { return new Items.m88nglowstick(id); };
    EntityFactory.builders[Types.Entities.M88NGUITAR] = function(id) { return new Items.m88nguitar(id); };
    EntityFactory.builders[Types.Entities.M88NHARDHAT] = function(id) { return new Items.m88nhardhat(id); };
    EntityFactory.builders[Types.Entities.M88NHOCKEYSTICK] = function(id) { return new Items.m88nhockeystick(id); };
    EntityFactory.builders[Types.Entities.M88NIPOD] = function(id) { return new Items.m88nipod(id); };
    EntityFactory.builders[Types.Entities.M88NJOYSTICK] = function(id) { return new Items.m88njoystick(id); };
    EntityFactory.builders[Types.Entities.M88NLETTERMANJACKET] = function(id) { return new Items.m88nlettermanjacket(id); };
    EntityFactory.builders[Types.Entities.M88NLUGGAGE] = function(id) { return new Items.m88nluggage(id); };
    EntityFactory.builders[Types.Entities.M88NPOLICEBADGE] = function(id) { return new Items.m88npolicebadge(id); };
    EntityFactory.builders[Types.Entities.M88NPOLICEHAT] = function(id) { return new Items.m88npolicehat(id); };
    EntityFactory.builders[Types.Entities.M88NQNOTE] = function(id) { return new Items.m88nqnote(id); };
    EntityFactory.builders[Types.Entities.M88NRAINBOW] = function(id) { return new Items.m88nrainbow(id); };
    EntityFactory.builders[Types.Entities.M88NROLEX] = function(id) { return new Items.m88nrolex(id); };
    EntityFactory.builders[Types.Entities.M88NROLLINGPIN] = function(id) { return new Items.m88nrollingpin(id); };
    EntityFactory.builders[Types.Entities.M88NROSE] = function(id) { return new Items.m88nrose(id); };
    EntityFactory.builders[Types.Entities.M88NRUBYRING] = function(id) { return new Items.m88nrubyring(id); };
    EntityFactory.builders[Types.Entities.M88NSHADES] = function(id) { return new Items.m88nshades(id); };
    EntityFactory.builders[Types.Entities.M88NSNOTE] = function(id) { return new Items.m88nsnote(id); };
    EntityFactory.builders[Types.Entities.M88NSNOWFLAKE] = function(id) { return new Items.m88nsnowflake(id); };
    EntityFactory.builders[Types.Entities.M88NTP] = function(id) { return new Items.m88ntp(id); };
    EntityFactory.builders[Types.Entities.M88NWORKGLOVES] = function(id) { return new Items.m88nworkgloves(id); };
    EntityFactory.builders[Types.Entities.M88NCHEESEPIZZA] = function(id) { return new Items.m88ncheesepizza(id); };
    EntityFactory.builders[Types.Entities.M88NPIZZA] = function(id) { return new Items.m88npizza(id); };
    EntityFactory.builders[Types.Entities.M88NSWORD] = function(id) { return new Items.m88nsword(id); };
    //Duckville
    EntityFactory.builders[Types.Entities.EYEBALL]=function(id){
        return new Items.EYEBALL(id);
    };
    EntityFactory.builders[Types.Entities.REDPOTION]=function(id){
        return new Items.REDPOTION(id);
    };
    EntityFactory.builders[Types.Entities.GREYPOTION]=function(id){
        return new Items.GREYPOTION(id);
    };
    EntityFactory.builders[Types.Entities.HAMSTER1]=function(id){return new Items.HAMSTER1(id);};
    EntityFactory.builders[Types.Entities.DUCKBIT]=function(id){return new Items.DUCKBIT(id);};
    EntityFactory.builders[Types.Entities.MILK2]=function(id){return new Items.MILK2(id);};
    EntityFactory.builders[Types.Entities.WHISPYSPIRIT]=function(id){return new Items.WHISPYSPIRIT(id);};
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

    EntityFactory.builders[Types.Entities.SHOPOWNER] = function(id) {
        return new NPCs.ShopOwner(id);
    };

    EntityFactory.builders[Types.Entities.BLACKSMITH] = function(id) {
        return new NPCs.Blacksmith(id);
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
    
    EntityFactory.builders[Types.Entities.COBCATBLACK] = function(id) {
        return new NPCs.Cobcatblack(id);
    };  

    EntityFactory.builders[Types.Entities.COBHILLSNPC] = function(id) {
        return new NPCs.Cobhillsnpc(id);
    };    

    EntityFactory.builders[Types.Entities.COBCOBMIN] = function(id) {
        return new NPCs.Cobcobmin(id);
    };

    EntityFactory.builders[Types.Entities.TAIKOGUARD]=function(id){return new NPCs.TAIKOGUARD(id);};

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

    EntityFactory.builders[Types.Entities.COBMINER] = function(id) {
        return new NPCs.Cobminer(id);
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

    //m88n NPCs
    EntityFactory.builders[Types.Entities.WENMOON]=function(id){return new NPCs.wenmoon(id);};
    EntityFactory.builders[Types.Entities.KINGFROGGY]=function(id){return new NPCs.kingfroggy(id);};
    EntityFactory.builders[Types.Entities.NEXAN4]=function(id){return new NPCs.nexan4(id);};
    EntityFactory.builders[Types.Entities.NEXAN5]=function(id){return new NPCs.nexan5(id);};
    EntityFactory.builders[Types.Entities.NEXAN10]=function(id){return new NPCs.nexan10(id);};
    EntityFactory.builders[Types.Entities.NEXAN11]=function(id){return new NPCs.nexan11(id);};
    EntityFactory.builders[Types.Entities.NEXAN12]=function(id){return new NPCs.nexan12(id);};
    EntityFactory.builders[Types.Entities.NEXAN13]=function(id){return new NPCs.nexan13(id);};
    EntityFactory.builders[Types.Entities.NEXAN14]=function(id){return new NPCs.nexan14(id);};
    EntityFactory.builders[Types.Entities.NEXAN15]=function(id){return new NPCs.nexan15(id);};
    EntityFactory.builders[Types.Entities.NEXAN16]=function(id){return new NPCs.nexan16(id);};
    EntityFactory.builders[Types.Entities.NEXAN17]=function(id){return new NPCs.nexan17(id);};
    EntityFactory.builders[Types.Entities.NEXAN18]=function(id){return new NPCs.nexan18(id);};
    EntityFactory.builders[Types.Entities.NEXAN19]=function(id){return new NPCs.nexan19(id);};
    EntityFactory.builders[Types.Entities.NEXAN20]=function(id){return new NPCs.nexan20(id);};
    EntityFactory.builders[Types.Entities.NEXAN28]=function(id){return new NPCs.nexan28(id);};
    EntityFactory.builders[Types.Entities.NEXAN29]=function(id){return new NPCs.nexan29(id);};
    EntityFactory.builders[Types.Entities.THEHOOKUP]=function(id){return new NPCs.thehookup(id);};
    EntityFactory.builders[Types.Entities.NEXAN31]=function(id){return new NPCs.nexan31(id);};
    EntityFactory.builders[Types.Entities.NEXAN32]=function(id){return new NPCs.nexan32(id);};
    EntityFactory.builders[Types.Entities.NEXAN33]=function(id){return new NPCs.nexan33(id);};
    EntityFactory.builders[Types.Entities.NEXAN34]=function(id){return new NPCs.nexan34(id);};
    EntityFactory.builders[Types.Entities.M88NBUSHGUY]=function(id){return new NPCs.m88nbushguy(id);};
    EntityFactory.builders[Types.Entities.M88NSIGNGUY]=function(id){return new NPCs.m88nsignguy(id);};
    EntityFactory.builders[Types.Entities.M88NMYSTERYHOOD]=function(id){return new NPCs.m88nmysteryhood(id);};
    EntityFactory.builders[Types.Entities.M88NTAIKOTWIN1]=function(id){return new NPCs.m88ntaikotwin1(id);};
    EntityFactory.builders[Types.Entities.M88NTAIKOTWIN2]=function(id){return new NPCs.m88ntaikotwin2(id);};
    EntityFactory.builders[Types.Entities.M88NSTIMYTIMY]=function(id){return new NPCs.m88nstimytimy(id);};
    EntityFactory.builders[Types.Entities.M88NREALTYAGENT]=function(id){return new NPCs.m88nrealtyagent(id);};
    EntityFactory.builders[Types.Entities.M88NGENIE]=function(id){return new NPCs.m88ngenie(id);};
    EntityFactory.builders[Types.Entities.NEXAN35]=function(id){return new NPCs.nexan35(id);};
    EntityFactory.builders[Types.Entities.NEXAN36]=function(id){return new NPCs.nexan36(id);};
    EntityFactory.builders[Types.Entities.NEXAN37]=function(id){return new NPCs.nexan37(id);};
    EntityFactory.builders[Types.Entities.NEXAN38]=function(id){return new NPCs.nexan38(id);};
    EntityFactory.builders[Types.Entities.NEXAN39]=function(id){return new NPCs.nexan39(id);};
    EntityFactory.builders[Types.Entities.NEXAN40]=function(id){return new NPCs.nexan40(id);};
    EntityFactory.builders[Types.Entities.NEXAN41]=function(id){return new NPCs.nexan41(id);};
    EntityFactory.builders[Types.Entities.NEXAN42]=function(id){return new NPCs.nexan42(id);};
    EntityFactory.builders[Types.Entities.NEXAN43]=function(id){return new NPCs.nexan43(id);};
    EntityFactory.builders[Types.Entities.NEXAN44]=function(id){return new NPCs.nexan44(id);};
    EntityFactory.builders[Types.Entities.NEXAN45]=function(id){return new NPCs.nexan45(id);};
    EntityFactory.builders[Types.Entities.NEXAN46]=function(id){return new NPCs.nexan46(id);};
    EntityFactory.builders[Types.Entities.NEXAN47]=function(id){return new NPCs.nexan47(id);};
    EntityFactory.builders[Types.Entities.NEXAN48]=function(id){return new NPCs.nexan48(id);};
    EntityFactory.builders[Types.Entities.M88NMERMANKING]=function(id){return new NPCs.m88nmermanking(id);};
    EntityFactory.builders[Types.Entities.M88NMERMAIDPRINCESS]=function(id){return new NPCs.m88nmermaidprincess(id);};
    EntityFactory.builders[Types.Entities.KINGFROGGYBW]=function(id){return new NPCs.kingfroggybw(id);};
    EntityFactory.builders[Types.Entities.M88NAPE]=function(id){return new NPCs.m88nape(id);};
    EntityFactory.builders[Types.Entities.M88NMOBILEBARTENDER]=function(id){return new NPCs.m88nmobilebartender(id);};
    EntityFactory.builders[Types.Entities.M88NBANANASTAND]=function(id){return new NPCs.m88nbananastand(id);};
    EntityFactory.builders[Types.Entities.M88NSAGE]=function(id){return new NPCs.m88nsage(id);};
    EntityFactory.builders[Types.Entities.M88NSAGE2]=function(id){return new NPCs.m88nsage2(id);};
    EntityFactory.builders[Types.Entities.M88NSAGE3]=function(id){return new NPCs.m88nsage3(id);};
    EntityFactory.builders[Types.Entities.M88NSAGE4]=function(id){return new NPCs.m88nsage4(id);};
    EntityFactory.builders[Types.Entities.M88NSAGE5]=function(id){return new NPCs.m88nsage5(id);};
    EntityFactory.builders[Types.Entities.M88NSAGE6]=function(id){return new NPCs.m88nsage6(id);};
    EntityFactory.builders[Types.Entities.M88NSAGE7]=function(id){return new NPCs.m88nsage7(id);};
    EntityFactory.builders[Types.Entities.M88NFROSTY]=function(id){return new NPCs.m88nfrosty(id);};
    EntityFactory.builders[Types.Entities.M88NSANTA]=function(id){return new NPCs.m88nsanta(id);};
    EntityFactory.builders[Types.Entities.M88NRUDOLPH]=function(id){return new NPCs.m88nrudolph(id);};
    EntityFactory.builders[Types.Entities.M88NTOWNIE]=function(id){return new NPCs.m88ntownie(id);};
    EntityFactory.builders[Types.Entities.M88NTOWNIES]=function(id){return new NPCs.m88ntownies(id);};
    EntityFactory.builders[Types.Entities.M88NTOWNIE2]=function(id){return new NPCs.m88ntownie2(id);};
    EntityFactory.builders[Types.Entities.M88NASTRONAUT]=function(id){return new NPCs.m88nastronaut(id);};
    EntityFactory.builders[Types.Entities.NEXANZOMBIECAT]=function(id){return new NPCs.nexanzombiecat(id);};
    EntityFactory.builders[Types.Entities.NEXANEXECUTIONER]=function(id){return new NPCs.nexanexecutioner(id);};
    EntityFactory.builders[Types.Entities.NEXANZOMBIE2]=function(id){return new NPCs.nexanzombie2(id);};
    EntityFactory.builders[Types.Entities.NEXANZOMBIE3]=function(id){return new NPCs.nexanzombie3(id);};
    EntityFactory.builders[Types.Entities.NEXANZOMBIE4]=function(id){return new NPCs.nexanzombie4(id);};
    EntityFactory.builders[Types.Entities.NEXANZOMBIE5]=function(id){return new NPCs.nexanzombie5(id);};
    EntityFactory.builders[Types.Entities.NEXANHAZMAT2]=function(id){return new NPCs.nexanhazmat2(id);};

    //MRMlabs NPCs
    EntityFactory.builders[Types.Entities.TYLERDURDEN]=function(id){return new NPCs.tylerdurden(id);};

    //Taiko Town NPCs
    EntityFactory.builders[Types.Entities.TAIKOTOWNNPC1]=function(id){return new NPCs.taikotownnpc1(id);};
    EntityFactory.builders[Types.Entities.TAIKOTOWNNPC2]=function(id){return new NPCs.taikotownnpc2(id);};
    EntityFactory.builders[Types.Entities.TAIKOTOWNNPC3]=function(id){return new NPCs.taikotownnpc3(id);};
    EntityFactory.builders[Types.Entities.TAIKOTOWNNPC4]=function(id){return new NPCs.taikotownnpc4(id);};
    EntityFactory.builders[Types.Entities.TAIKOTOWNNPC5]=function(id){return new NPCs.taikotownnpc5(id);};
    EntityFactory.builders[Types.Entities.TAIKOTOWNNPC6]=function(id){return new NPCs.taikotownnpc6(id);};
    EntityFactory.builders[Types.Entities.TAIKOTOWNNPC7]=function(id){return new NPCs.taikotownnpc7(id);};
    EntityFactory.builders[Types.Entities.STUPIDMONKEY]=function(id){return new NPCs.stupidmonkey(id);};

    //Robits NPCs
    EntityFactory.builders[Types.Entities.ROBITSC1]=function(id){return new NPCs.ROBITSC1(id);};

    //ShortDestroyers
    EntityFactory.builders[Types.Entities.DERRICK]=function(id){return new NPCs.derrick(id);};
    EntityFactory.builders[Types.Entities.FROG]=function(id){return new NPCs.frog(id);};
    EntityFactory.builders[Types.Entities.ANGRYMOM]=function(id){return new NPCs.angrymom(id);};
    EntityFactory.builders[Types.Entities.DEVON]=function(id){return new NPCs.devon(id);};
    EntityFactory.builders[Types.Entities.MISTY]=function(id){return new NPCs.misty(id);};
    EntityFactory.builders[Types.Entities.MANAGERTIM]=function(id){return new NPCs.managertim(id);};
    EntityFactory.builders[Types.Entities.ORACLE]=function(id){return new NPCs.oracle(id);};
    EntityFactory.builders[Types.Entities.GILL]=function(id){return new NPCs.gill(id);};
    EntityFactory.builders[Types.Entities.CUSTOMER1]=function(id){return new NPCs.customer1(id);};
    EntityFactory.builders[Types.Entities.CUSTOMER2]=function(id){return new NPCs.customer2(id);};
    EntityFactory.builders[Types.Entities.PORTALGILL]=function(id){return new NPCs.portalgill(id);};
    EntityFactory.builders[Types.Entities.KAWAIIPRINCESS]=function(id){return new NPCs.KAWAIIPRINCESS(id);};
    EntityFactory.builders[Types.Entities.KAWAIIPRINCESS2]=function(id){return new NPCs.KAWAIIPRINCESS2(id);};

    EntityFactory.builders[Types.Entities.ZILEEL]=function(id){return new NPCs.ZILEEL(id);};
    EntityFactory.builders[Types.Entities.HDUCKLEE]=function(id){return new NPCs.HDUCKLEE(id);};
    EntityFactory.builders[Types.Entities.APEBRAIN1]=function(id){return new NPCs.APEBRAIN1(id);};
    EntityFactory.builders[Types.Entities.CORTEZ]=function(id){return new NPCs.CORTEZ(id);};
    EntityFactory.builders[Types.Entities.NICO1]=function(id){return new NPCs.NICO1(id);};
    EntityFactory.builders[Types.Entities.JUSTIN]=function(id){return new NPCs.JUSTIN(id);};
    EntityFactory.builders[Types.Entities.GAVIN]=function(id){return new NPCs.GAVIN(id);};
    EntityFactory.builders[Types.Entities.KARAOKEBIT]=function(id){return new NPCs.KARAOKEBIT(id);};
    EntityFactory.builders[Types.Entities.BALKSBIT]=function(id){return new NPCs.BALKSBIT(id);};
    EntityFactory.builders[Types.Entities.BIRDSBIT]=function(id){return new NPCs.BIRDSBIT(id);};
    EntityFactory.builders[Types.Entities.CRISPYBIT]=function(id){return new NPCs.CRISPYBIT(id);};
    EntityFactory.builders[Types.Entities.DARIUS]=function(id){return new NPCs.DARIUS(id);};
    EntityFactory.builders[Types.Entities.SEB]=function(id){return new NPCs.SEB(id);};
    EntityFactory.builders[Types.Entities.NAH]=function(id){return new NPCs.NAH(id);};
    EntityFactory.builders[Types.Entities.FUZZYBIT]=function(id){return new NPCs.FUZZYBIT(id);};
    EntityFactory.builders[Types.Entities.JIMBIT]=function(id){return new NPCs.JIMBIT(id);};
    EntityFactory.builders[Types.Entities.DSOUZBIT]=function(id){return new NPCs.DSOUZBIT(id);};
    EntityFactory.builders[Types.Entities.OBSERVER]=function(id){return new NPCs.OBSERVER(id);};
    EntityFactory.builders[Types.Entities.PIZZABIT]=function(id){return new NPCs.PIZZABIT(id);};
    EntityFactory.builders[Types.Entities.JACKBIT]=function(id){return new NPCs.JACKBIT(id);};
    EntityFactory.builders[Types.Entities.GENTLEBIT]=function(id){return new NPCs.GENTLEBIT(id);};
    EntityFactory.builders[Types.Entities.MAGMABIT]=function(id){return new NPCs.MAGMABIT(id);};
    EntityFactory.builders[Types.Entities.ROBITSMAIN]=function(id){return new NPCs.ROBITSMAIN(id);};
    EntityFactory.builders[Types.Entities.DFVBIT]=function(id){return new NPCs.DFVBIT(id);};
    EntityFactory.builders[Types.Entities.PRINCEBIT]=function(id){return new NPCs.PRINCEBIT(id);};
    EntityFactory.builders[Types.Entities.BIDENBIT]=function(id){return new NPCs.BIDENBIT(id);};
    EntityFactory.builders[Types.Entities.ARTWHITE]=function(id){return new NPCs.ARTWHITE(id);};
    EntityFactory.builders[Types.Entities.ARTWHITEROBIT]=function(id){return new NPCs.ARTWHITEROBIT(id);};
    EntityFactory.builders[Types.Entities.OCARINABIT]=function(id){return new NPCs.OCARINABIT(id);};
    EntityFactory.builders[Types.Entities.WENMOONBIT]=function(id){return new NPCs.WENMOONBIT(id);};
    EntityFactory.builders[Types.Entities.CLOWNCAPONEBIT]=function(id){return new NPCs.CLOWNCAPONEBIT(id);};
    EntityFactory.builders[Types.Entities.FEDORABIT]=function(id){return new NPCs.FEDORABIT(id);};
    EntityFactory.builders[Types.Entities.APEBRAINOG]=function(id){return new NPCs.APEBRAINOG(id);};
    EntityFactory.builders[Types.Entities.SIREN]=function(id){return new NPCs.SIREN(id);};
    //BITCORN NPCS
    EntityFactory.builders[Types.Entities.BITNPC_BITCORN]=function(id){return new NPCs.BITNPC_BITCORN(id);};
    EntityFactory.builders[Types.Entities.BITNPC_THORNBEARD_KNEEL]=function(id){return new NPCs.BITNPC_THORNBEARD_KNEEL(id);};
    EntityFactory.builders[Types.Entities.BITNPC_THORNBEARD]=function(id){return new NPCs.BITNPC_THORNBEARD(id);};

    EntityFactory.builders[Types.Entities.VOYAGER]=function(id){return new NPCs.VOYAGER(id);};
    EntityFactory.builders[Types.Entities.VOYAGERMONKEY]=function(id){return new NPCs.VOYAGERMONKEY(id);};
    EntityFactory.builders[Types.Entities.CHEN]=function(id){return new NPCs.CHEN(id);};
    EntityFactory.builders[Types.Entities.VOYAGERROBIT]=function(id){return new NPCs.VOYAGERROBIT(id);};
    EntityFactory.builders[Types.Entities.SARAH]=function(id){return new NPCs.SARAH(id);};
    EntityFactory.builders[Types.Entities.MOONBASES]=function(id){return new NPCs.MOONBASES(id);};
    EntityFactory.builders[Types.Entities.NURSEOWNER]=function(id){return new NPCs.NURSEOWNER(id);};
    EntityFactory.builders[Types.Entities.WHISPYRED]=function(id){return new NPCs.WHISPYRED(id);};
    EntityFactory.builders[Types.Entities.WHISPYWITCH]=function(id){return new NPCs.WHISPYWITCH(id);};
    EntityFactory.builders[Types.Entities.WHISPYKING]=function(id){return new NPCs.WHISPYKING(id);};
    EntityFactory.builders[Types.Entities.WHISPYBOBBY]=function(id){return new NPCs.WHISPYBOBBY(id);};
    EntityFactory.builders[Types.Entities.WHISPYDIAMOND]=function(id){return new NPCs.WHISPYDIAMOND(id);};
    EntityFactory.builders[Types.Entities.WHISPYLL]=function(id){return new NPCs.WHISPYLL(id);};
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
