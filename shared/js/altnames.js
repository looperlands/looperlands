const AltNames = {
    skeleton2: 'greater skeleton',
    eye: 'evil eye',
    deathknight: 'death knight',
    cobslimeblue: "slime",
    cobslimeyellow: "slime",
    cobslimered: "slime",
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
    fishingrod: "Fishing Rod",
    weapon: "Weapon"
};

AltNames.getAltNameFromKind = function(kind){
    if(kind in AltNames) {
        return AltNames[kind];
    }
}

AltNames.getName = function (kind){
    let altName = AltNames.getAltNameFromKind(kind);
    return altName !== undefined ? altName : kind;
}

if(!(typeof exports === 'undefined')) {
    module.exports = AltNames;
}