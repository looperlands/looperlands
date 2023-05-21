
Types = {
    Messages: {
        HELLO: 0,
        WELCOME: 1,
        SPAWN: 2,
        DESPAWN: 3,
        MOVE: 4,
        LOOTMOVE: 5,
        AGGRO: 6,
        ATTACK: 7,
        HIT: 8,
        HURT: 9,
        HEALTH: 10,
        CHAT: 11,
        LOOT: 12,
        EQUIP: 13,
        DROP: 14,
        TELEPORT: 15,
        DAMAGE: 16,
        POPULATION: 17,
        KILL: 18,
        LIST: 19,
        WHO: 20,
        ZONE: 21,
        DESTROY: 22,
        HP: 23,
        BLINK: 24,
        OPEN: 25,
        CHECK: 26,
        EQUIP_INVENTORY: 27
    },
    
    Entities: {
        WARRIOR: 1,
        
        // Mobs
        RAT: 2,
        SKELETON: 3,
        GOBLIN: 4,
        OGRE: 5,
        SPECTRE: 6,
        CRAB: 7,
        BAT: 8,
        WIZARD: 9,
        EYE: 10,
        SNAKE: 11,
        SKELETON2: 12,
        BOSS: 13,
        DEATHKNIGHT: 14,
        
        // Armors
        FIREFOX: 20,
        CLOTHARMOR: 21,
        LEATHERARMOR: 22,
        MAILARMOR: 23,
        PLATEARMOR: 24,
        REDARMOR: 25,
        GOLDENARMOR: 26,
        
        // Objects
        FLASK: 35,
        BURGER: 36,
        CHEST: 37,
        FIREPOTION: 38,
        CAKE: 39,
        
        // NPCs
        GUARD: 40,
        KING: 41,
        OCTOCAT: 42,
        VILLAGEGIRL: 43,
        VILLAGER: 44,
        PRIEST: 45,
        SCIENTIST: 46,
        AGENT: 47,
        RICK: 48,
        NYAN: 49,
        SORCERER: 50,
        BEACHNPC: 51,
        FORESTNPC: 52,
        DESERTNPC: 53,
        LAVANPC: 54,
        CODER: 55,
        
        // Weapons
        SWORD1: 60,
        SWORD2: 61,
        REDSWORD: 62,
        GOLDENSWORD: 63,
        MORNINGSTAR: 64,
        AXE: 65,
        BLUESWORD: 66,

        // NFTs
        NFT_c762bf80c40453b66f5eb91a99a5a84731c3cc83e1bcadaa9c62e2e59e19e4f6: 70,
        NFT_38278eacc7d1c86fdbc85d798dca146fbca59a2e5e567dc15898ce2edac21f5f: 71,
        NFT_d2fb1ad9308803ea4df2ba6b1fe0930ad4d6443b3ac6468eaedbc9e2c214e57a: 72,
        NFT_b03847a6a7c25e8f52016c0ffca8e7d608593f004c17f3519506b4d0a42d61bf: 73,
        NFT_3c1fa300af2deef916ade14eb6ca68dd14913e4adc4a4d174ea98f1f878ef733: 74,
        NFT_cfd9a7ae82698da0da065befb2b39f3bfe3eca509febdb9da865fafd4d98e543: 75,
        NFT_b131df57290a3c656d6cf35b10e4d342e147345ca01c9cf34ad13205d0e43e50: 76,
        NFT_9f051ae4b657a07bc82d8d1fac5a5263ca0cb33e3be717c29814d06fa4860487: 77,
        NFT_01346618000000000000000002386f26fc10000000000000000000000000037b: 78,
        NFT_82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741: 79,
        NFT_17222e7f16e5fb69bbc410f8c093cf92904ab8d2e4681a6bc9dee01900d8e6b7: 80,
        NFT_2bab6c4b9cbb8eddb94614bb05e2b4b67b229e6e94ea7b152d74d1a1e2e21360: 81,
        NFT_b26214bac18f742d93b948c44ccd05c768f8344c7c89d6550a67e4f919ad7e6f: 82,
        NFT_b26214bac18f742d93b948c44ccd05c768f8344c7c89d6550a67e4f919ad7e6f: 83,
        NFT_2530bd882f78be80636b02467386e272f87bdb27d6762b41bd09dd71407bdcb1: 84,
        NFT_5454cad3ebe151e92b53083d0ae6f8a03273fd86c4af33d1ef2991bbe8dae198: 85,
        NFT_20fdfc6fa49d9001f154ef03129ba66a6bc606489631fbc181751bd17fb1d520: 86,
        NFT_426754b71f8ac324122c64c541a99e1888602a06c2e7a203568d3a9fb0281263: 87,
        NFT_691b67e4466879e4de582f765b85a5bbc1cacc087b9c0f410a86f00d32081ea7: 88 // @lastid@
        //@nextIdLine@
    },
    
    Orientations: {
        UP: 1,
        DOWN: 2,
        LEFT: 3,
        RIGHT: 4
    }
};

var kinds = {
    warrior: [Types.Entities.WARRIOR, "player"],
    
    rat: [Types.Entities.RAT, "mob"],
    skeleton: [Types.Entities.SKELETON , "mob"],
    goblin: [Types.Entities.GOBLIN, "mob"],
    ogre: [Types.Entities.OGRE, "mob"],
    spectre: [Types.Entities.SPECTRE, "mob"],
    deathknight: [Types.Entities.DEATHKNIGHT, "mob"],
    crab: [Types.Entities.CRAB, "mob"],
    snake: [Types.Entities.SNAKE, "mob"],
    bat: [Types.Entities.BAT, "mob"],
    wizard: [Types.Entities.WIZARD, "mob"],
    eye: [Types.Entities.EYE, "mob"],
    skeleton2: [Types.Entities.SKELETON2, "mob"],
    boss: [Types.Entities.BOSS, "mob"],

    sword1: [Types.Entities.SWORD1, "weapon"],
    sword2: [Types.Entities.SWORD2, "weapon"],
    axe: [Types.Entities.AXE, "weapon"],
    redsword: [Types.Entities.REDSWORD, "weapon"],
    bluesword: [Types.Entities.BLUESWORD, "weapon"],
    goldensword: [Types.Entities.GOLDENSWORD, "weapon"],
    morningstar: [Types.Entities.MORNINGSTAR, "weapon"],
    
    firefox: [Types.Entities.FIREFOX, "armor"],
    clotharmor: [Types.Entities.CLOTHARMOR, "armor"],
    leatherarmor: [Types.Entities.LEATHERARMOR, "armor"],
    mailarmor: [Types.Entities.MAILARMOR, "armor"],
    platearmor: [Types.Entities.PLATEARMOR, "armor"],
    redarmor: [Types.Entities.REDARMOR, "armor"],
    goldenarmor: [Types.Entities.GOLDENARMOR, "armor"],

    flask: [Types.Entities.FLASK, "object"],
    cake: [Types.Entities.CAKE, "object"],
    burger: [Types.Entities.BURGER, "object"],
    chest: [Types.Entities.CHEST, "object"],
    firepotion: [Types.Entities.FIREPOTION, "object"],

    guard: [Types.Entities.GUARD, "npc"],
    villagegirl: [Types.Entities.VILLAGEGIRL, "npc"],
    villager: [Types.Entities.VILLAGER, "npc"],
    coder: [Types.Entities.CODER, "npc"],
    scientist: [Types.Entities.SCIENTIST, "npc"],
    priest: [Types.Entities.PRIEST, "npc"],
    king: [Types.Entities.KING, "npc"],
    rick: [Types.Entities.RICK, "npc"],
    nyan: [Types.Entities.NYAN, "npc"],
    sorcerer: [Types.Entities.SORCERER, "npc"],
    agent: [Types.Entities.AGENT, "npc"],
    octocat: [Types.Entities.OCTOCAT, "npc"],
    beachnpc: [Types.Entities.BEACHNPC, "npc"],
    forestnpc: [Types.Entities.FORESTNPC, "npc"],
    desertnpc: [Types.Entities.DESERTNPC, "npc"],
    lavanpc: [Types.Entities.LAVANPC, "npc"], 

    //NFT
    NFT_c762bf80c40453b66f5eb91a99a5a84731c3cc83e1bcadaa9c62e2e59e19e4f6: [Types.Entities.NFT_c762bf80c40453b66f5eb91a99a5a84731c3cc83e1bcadaa9c62e2e59e19e4f6, "armor"],
    NFT_38278eacc7d1c86fdbc85d798dca146fbca59a2e5e567dc15898ce2edac21f5f: [Types.Entities.NFT_38278eacc7d1c86fdbc85d798dca146fbca59a2e5e567dc15898ce2edac21f5f, "armor"],
    NFT_d2fb1ad9308803ea4df2ba6b1fe0930ad4d6443b3ac6468eaedbc9e2c214e57a: [Types.Entities.NFT_d2fb1ad9308803ea4df2ba6b1fe0930ad4d6443b3ac6468eaedbc9e2c214e57a, "armor"],
    NFT_b03847a6a7c25e8f52016c0ffca8e7d608593f004c17f3519506b4d0a42d61bf: [Types.Entities.NFT_b03847a6a7c25e8f52016c0ffca8e7d608593f004c17f3519506b4d0a42d61bf, "armor"],
    NFT_3c1fa300af2deef916ade14eb6ca68dd14913e4adc4a4d174ea98f1f878ef733: [Types.Entities.NFT_3c1fa300af2deef916ade14eb6ca68dd14913e4adc4a4d174ea98f1f878ef733, "armor"],
    NFT_cfd9a7ae82698da0da065befb2b39f3bfe3eca509febdb9da865fafd4d98e543: [Types.Entities.NFT_cfd9a7ae82698da0da065befb2b39f3bfe3eca509febdb9da865fafd4d98e543, "armor"],
    NFT_b131df57290a3c656d6cf35b10e4d342e147345ca01c9cf34ad13205d0e43e50: [Types.Entities.NFT_b131df57290a3c656d6cf35b10e4d342e147345ca01c9cf34ad13205d0e43e50, "armor"],
    NFT_9f051ae4b657a07bc82d8d1fac5a5263ca0cb33e3be717c29814d06fa4860487: [Types.Entities.NFT_9f051ae4b657a07bc82d8d1fac5a5263ca0cb33e3be717c29814d06fa4860487, "armor"],
    NFT_01346618000000000000000002386f26fc10000000000000000000000000037b: [Types.Entities.NFT_01346618000000000000000002386f26fc10000000000000000000000000037b, "armor"],
    NFT_82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741: [Types.Entities.NFT_82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741, "weapon"],
    NFT_17222e7f16e5fb69bbc410f8c093cf92904ab8d2e4681a6bc9dee01900d8e6b7: [Types.Entities.NFT_17222e7f16e5fb69bbc410f8c093cf92904ab8d2e4681a6bc9dee01900d8e6b7, "armor"],
    NFT_2bab6c4b9cbb8eddb94614bb05e2b4b67b229e6e94ea7b152d74d1a1e2e21360: [Types.Entities.NFT_2bab6c4b9cbb8eddb94614bb05e2b4b67b229e6e94ea7b152d74d1a1e2e21360, "armor"],
    NFT_b26214bac18f742d93b948c44ccd05c768f8344c7c89d6550a67e4f919ad7e6f: [Types.Entities.NFT_b26214bac18f742d93b948c44ccd05c768f8344c7c89d6550a67e4f919ad7e6f, "armor"],
    NFT_b26214bac18f742d93b948c44ccd05c768f8344c7c89d6550a67e4f919ad7e6f: [Types.Entities.NFT_b26214bac18f742d93b948c44ccd05c768f8344c7c89d6550a67e4f919ad7e6f, "armor"],
    NFT_2530bd882f78be80636b02467386e272f87bdb27d6762b41bd09dd71407bdcb1: [Types.Entities.NFT_2530bd882f78be80636b02467386e272f87bdb27d6762b41bd09dd71407bdcb1, "armor"],
    NFT_5454cad3ebe151e92b53083d0ae6f8a03273fd86c4af33d1ef2991bbe8dae198: [Types.Entities.NFT_5454cad3ebe151e92b53083d0ae6f8a03273fd86c4af33d1ef2991bbe8dae198, "armor", "1"],
    NFT_20fdfc6fa49d9001f154ef03129ba66a6bc606489631fbc181751bd17fb1d520: [Types.Entities.NFT_20fdfc6fa49d9001f154ef03129ba66a6bc606489631fbc181751bd17fb1d520, "armor", "1"],
    NFT_426754b71f8ac324122c64c541a99e1888602a06c2e7a203568d3a9fb0281263: [Types.Entities.NFT_426754b71f8ac324122c64c541a99e1888602a06c2e7a203568d3a9fb0281263, "armor", "n"],
    NFT_691b67e4466879e4de582f765b85a5bbc1cacc087b9c0f410a86f00d32081ea7: [Types.Entities.NFT_691b67e4466879e4de582f765b85a5bbc1cacc087b9c0f410a86f00d32081ea7, "armor"],
    // @nextSpriteLine@

    
    getType: function(kind) {
        return kinds[Types.getKindAsString(kind)][1];
    }
};

Types.rankedWeapons = [
    Types.Entities.SWORD1,
    Types.Entities.SWORD2,
    Types.Entities.AXE,
    Types.Entities.MORNINGSTAR,
    Types.Entities.BLUESWORD,
    Types.Entities.REDSWORD,
    Types.Entities.GOLDENSWORD,
    Types.Entities.NFT_82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741
];

Types.rankedArmors = [
    Types.Entities.CLOTHARMOR,
    Types.Entities.NFT_426754b71f8ac324122c64c541a99e1888602a06c2e7a203568d3a9fb0281263,
    Types.Entities.LEATHERARMOR,
    Types.Entities.MAILARMOR,
    Types.Entities.PLATEARMOR,
    Types.Entities.REDARMOR,
    Types.Entities.GOLDENARMOR
];

Types.getWeaponRank = function(weaponKind) {
    return _.indexOf(Types.rankedWeapons, weaponKind);
};

Types.getArmorRank = function(armorKind) {
    return _.indexOf(Types.rankedArmors, armorKind);
};

Types.isPlayer = function(kind) {
    return kinds.getType(kind) === "player";
};

Types.isMob = function(kind) {
    return kinds.getType(kind) === "mob";
};

Types.isNpc = function(kind) {
    return kinds.getType(kind) === "npc";
};

Types.isCharacter = function(kind) {
    return Types.isMob(kind) || Types.isNpc(kind) || Types.isPlayer(kind);
};

Types.isArmor = function(kind) {
    return kinds.getType(kind) === "armor";
};

Types.isWeapon = function(kind) {
    return kinds.getType(kind) === "weapon";
};

Types.isObject = function(kind) {
    return kinds.getType(kind) === "object";
};

Types.isChest = function(kind) {
    return kind === Types.Entities.CHEST;
};

Types.isItem = function(kind) {
    return Types.isWeapon(kind) 
        || Types.isArmor(kind) 
        || (Types.isObject(kind) && !Types.isChest(kind));
};

Types.isHealingItem = function(kind) {
    return kind === Types.Entities.FLASK 
        || kind === Types.Entities.BURGER;
};

Types.isExpendableItem = function(kind) {
    return Types.isHealingItem(kind)
        || kind === Types.Entities.FIREPOTION
        || kind === Types.Entities.CAKE;
};

Types.getKindFromString = function(kind) {
    if(kind in kinds) {
        return kinds[kind][0];
    }
};

Types.getKindAsString = function(kind) {
    for(var k in kinds) {
        if(kinds[k][0] === kind) {
            return k;
        }
    }
};

Types.forEachKind = function(callback) {
    for(var k in kinds) {
        callback(kinds[k][0], k);
    }
};

Types.forEachArmor = function(callback) {
    Types.forEachKind(function(kind, kindName) {
        if(Types.isArmor(kind)) {
            callback(kind, kindName);
        }
    });
};

Types.forEachMobOrNpcKind = function(callback) {
    Types.forEachKind(function(kind, kindName) {
        if(Types.isMob(kind) || Types.isNpc(kind)) {
            callback(kind, kindName);
        }
    });
};

Types.forEachArmorKind = function(callback) {
    Types.forEachKind(function(kind, kindName) {
        if(Types.isArmor(kind)) {
            callback(kind, kindName);
        }
    });
};

Types.getOrientationAsString = function(orientation) {
    switch(orientation) {
        case Types.Orientations.LEFT: return "left"; break;
        case Types.Orientations.RIGHT: return "right"; break;
        case Types.Orientations.UP: return "up"; break;
        case Types.Orientations.DOWN: return "down"; break;
    }
};

Types.getRandomItemKind = function(item) {
    var all = _.union(this.rankedWeapons, this.rankedArmors),
        forbidden = [Types.Entities.SWORD1, Types.Entities.CLOTHARMOR],
        itemKinds = _.difference(all, forbidden),
        i = Math.floor(Math.random() * _.size(itemKinds));
    
    return itemKinds[i];
};

Types.getMessageTypeAsString = function(type) {
    var typeName;
    _.each(Types.Messages, function(value, name) {
        if(value === type) {
            typeName = name;
        }
    });
    if(!typeName) {
        typeName = "UNKNOWN";
    }
    return typeName;
};

if(!(typeof exports === 'undefined')) {
    module.exports = Types;
}