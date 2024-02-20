const AltNames = {
    skeleton2: 'greater skeleton',
    eye: 'evil eye',
    deathknight: 'death knight',
    cobslimeblue: "Blinky",
    cobslimeyellow: "Winky",
    cobslimered: "Inky",
    cobslimepurple: "Plum",
    cobslimegreen: "Glimmer",
    cobslimepink: "Pinky",
    cobslimecyan: "Zippy",
    cobslimemint: "Minty",
    cobslimeking: "slime king",
    magcrack: "megamag",
    cobdirt: "pile of dirt",
    cobincubator: "egg incubator",
    cobcoblin: "coblin",
    cobcobane: "cobane",
    cobogre: "ogre",
    cobfallingrock: "falling rock",
    cobguppy: "guppy",
    cobneon: "neon tetra",
    cobgoldfish: "goldfish",
    cobtrout: "trout",
    cobcatfish: "catfish",
    coblobster: "red lobster",
    cobsardine: "sardine",
    cobwhiting: "whiting",
    cobangelfish: "angel fish",
    cobstingray: "stingray",
    fishingrod: "Fishing Rod",
    weapon: "Weapon",
    cobrosette: "rosette",
    cobparadisefish: "paradise fish",
    cobfatheadminnow: "fathead minnow",
    cobgrasscarp: "grass carp",
    cobgreensunfish: "green sunfish",
    cobcruciancarp: "crucian carp",
    cobbluegill: "bluegill",
    ////OA FISHIES
    oagreyeverfish: "Grey Everfish",
    oafish1: "Grey Everfish",
    oafish2: "Umber Tideglider",
    oafish3: "Great Grayscale",
    oafish4: "Sunny Reefrascal",
    oafish5: "Emerald Mischief",
    oafish6: "Violet Trickster",
    oafish7: "Aqua Jestfish",
    oafish8: "Lumin Everglow",
    oafish9: "Clam of Radiance",
    oafish10: "Nocturne Shellmyst",
    oafish11: "Fantasea Roamer",
    oafish12: "Mythfin Drifter",
    oafish13: "Crimson Squidleap",
    oafish14: "Teal Tentaflash",
    oafish15: "Spiral Squidshell",
    oafish16: "Verde Shellswim",
    oafish17: "Cocoa Helmfloat",
    oafish18: "Everfrond Seawhisper",
    oafish19: "Sunset Skulkprawn",
    oafish20: "Duskpincher",
    oafish21: "Ruby Starfloat",
    oafish22: "Abyssal Evershark",
    oafish23: "Azure Finstealth",
    oafish24: "Verdant Sharkwave",
    oafish25: "Cerulean Wonderfin",
    oafish26: "Scarlet Mysticfish",
    oafish27: "Jade Specterfin",
    oafish28: "Lavender Lorefish",
    oafish29: "Tangerine Medusozoa",
    oafish30: "Crimson Seahaven",
    oafish31: "Sandy Shellecho",
    oafish32: "Garnet Clamharbor",
    oafish33: "Tropic Pinchmarvel",
    oafish34: "Cobalt Asteroidea",
    oafish35: "Orbhead Oceantwirl",
    oafish36: "Emerald Jellyfloat",  

    //Short Destroyers
    lateflea: ".65 Late Flea",  
    wolfboss: "Victor Henry Stevenson",  
    horde1: ".65 Late Flea",  
    horde2: ".65 Late Flea",  
    horde3: ".65 Late Flea",  
    horde4: ".65 Late Flea",  
    horde5: ".65 Late Flea", 
    fleaboss: "Giant Late Flea",

    //bitcorn
    cornBootFish: "a Boot",
    cornCanFish: "a Can of Mother Shucker",
    cornWinkyFish: "the Legendary Winky",

    devon: "Chase", 
};

AltNames.getAltNameFromKind = function(kind){
    if(kind in AltNames) {
        return AltNames[kind];
    }
};

AltNames.getName = function (kind){
    let altName = AltNames.getAltNameFromKind(kind);
    return altName !== undefined ? altName : kind;
};

if(!(typeof exports === 'undefined')) {
    module.exports = AltNames;
}