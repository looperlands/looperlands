const AltNames = {
    skeleton2: 'greater skeleton',
    eye: 'evil eye',
    deathknight: 'death knight',
    cobslimeblue: "slime",
    cobslimeyellow: "slime",
    cobslimered: "slime",
    cobslimeking: "slime king",
    magcrack: "megamag"
};

AltNames.getAltNameFromKind = function(kind){
    if(kind in AltNames) {
        return AltNames[kind];
    }
}

if(!(typeof exports === 'undefined')) {
    module.exports = AltNames;
}