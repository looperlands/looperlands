const Utils = require("./utils");

const rarities = {common: {chance: 700, expMultiplier: 1, speed: 20},
                uncommon: {chance: 243, expMultiplier: 2, speed: 15},
                rare: {chance: 40, expMultiplier: 5, speed: 11},
                epic: {chance: 15, expMultiplier: 20, speed: 8},
                legendary: {chance: 2, expMultiplier: 50, speed: 6}};

//---START CONFIG---
//Not all rarities have to be defined within a lake, but a COMMON is mandatory
const Lakes = {
    cobFarmLake: {
        level: 1,
        fish: {
            cobguppy: "common",
            cobneon: "uncommon",
            cobgoldfish: "epic"
        },
    },
    cobFarmRiver: {
        level: 3,
        fish: {
            cobtrout: "common",
            cobcatfish: "uncommon",
            coblobster: "rare"
        },
    },
    cobFarmCityOcean: {
        level: 7,
        fish: {
            cobsardine: "common",
            cobwhiting: "uncommon",
            cobangelfish: "rare",
            cobstingray: "epic"
        },
    },
    cobFarmSlimeLake: {
        level: 8,
        fish: {
            cobrosette: "common",
            cobparadisefish: "epic"
        }
    },
    cobFarmForestLake: {
        level: 6,
        fish: {
            cobfatheadminnow: "common",
            cobgrasscarp: "rare",
            cobgreensunfish: "epic"
        }
    },
    cobFarmPond: {
        level: 5,
        fish: {
            cobcruciancarp: "common",
            cobbluegill: "epic"
        }
    }
};
// only EPIC fish can be a consumable
const ConsumableFish = {
    hp: ["cobparadisefish"],
    atk: ["cobbluegill"],
    exp: ["cobgreensunfish"]
};

//---END CONFIG---

generateFishDataMap = function() { // also do config checks
    let retMap = [];
    Object.keys(Lakes).forEach(lake => {
        let lakeLevel = Lakes[lake].level;
        let hasCommon = false;
        if (lakeLevel === undefined){
            console.error("Lake doesn't have a configured level: ", lake);
            process.exit(1);
        }
        Object.keys(Lakes[lake].fish).forEach(fish => {
            if(retMap[fish] !== undefined){
                console.error("Fish appears multiple times in different lakes: ", fish);
                process.exit(1);
            }
            retMap[fish] = {};
            retMap[fish].level = lakeLevel;
            retMap[fish].rarity = Lakes[lake].fish[fish];

            if (retMap[fish].rarity === "common") {
                hasCommon = true;
            }
        });

        if (!hasCommon) {
            console.error("Lake doesn't have a common: ", lake);
            process.exit(1);
        }
    });

    return retMap;
};

const fishDataMap = generateFishDataMap();

Lakes.getRandomFish = function(lake, lucky) {
    let luckyFish = false;
    if (lucky){
        luckyFish = Lakes.getRandomFish(lake, false);
    }
    let allFish = Lakes[lake].fish,
        p = 0,
        retRarity = null,
        oddsSum = Object.values(rarities).reduce((partialSum, curr) => partialSum + curr.chance, 0),
        v = Utils.random(oddsSum);
        for(let rarity in rarities) {
            let percentage = rarities[rarity].chance;
            
            p += percentage;
            if(v < p) {
                retRarity = rarity;
                break;
            }
        }

        let retFish = Object.keys(allFish).find(key => allFish[key] === retRarity);
        if (retFish === undefined){
            retFish = Object.keys(allFish).find(key => allFish[key] === "common");
        }
        if(luckyFish && rarities[allFish[luckyFish]].chance < rarities[allFish[retFish]].chance) {
            return luckyFish;
        } else {
            return retFish;
        }
};

Lakes.getLakeLevel = function(lake) {
    return Lakes[lake] !== undefined ? Lakes[lake].level : undefined;
};

Lakes.calculateFishExp = function(fishName, lakeName) {
    if (Lakes[lakeName] === undefined || Lakes[lakeName].fish[fishName] === undefined) {
        return 0;
    }

    const baseExp = 10;
    const levelMultiplier = 1.25; //25% more exp per lake level

    let lakeLevel = Lakes.getLakeLevel(lakeName);
    let fishMultiplier = rarities[Lakes[lakeName].fish[fishName]].expMultiplier;
    let exp = baseExp * fishMultiplier * Math.pow(levelMultiplier, (lakeLevel - 1));

    return Math.round(exp);
};

Lakes.getFishSpeed = function(fishName, lakeName) {
    if (Lakes[lakeName] === undefined || Lakes[lakeName].fish[fishName] === undefined) {
        return null;
    }

    return rarities[Lakes[lakeName].fish[fishName]].speed;
};

Lakes.getDifficulty = function(playerLevel, lakeName, upperHand) {
    if (Lakes[lakeName] === undefined) {
        return null;
    }

    const maxDifficulty = 5,
          minDifficulty = 25, // a target bar should never be bigger than 25%
          levelGain = 2;

    let traitMod = upperHand ? 2 : 1;

    let calculatedDiff = maxDifficulty + (playerLevel - Lakes[lakeName].level) * levelGain;
    let returnDiff = Math.min(calculatedDiff, minDifficulty) * traitMod;
    let bullseyeDiff = 1 * traitMod;
    return {difficulty: returnDiff, bullseye: bullseyeDiff};
};

Lakes.isCollectable = function(item) {
    return Lakes.isConsumable(item);
};

Lakes.isConsumable = function(fishName) {
    let retVal = false;
    Object.keys(ConsumableFish).forEach(stat => {
        if (Array.isArray(ConsumableFish[stat]) && ConsumableFish[stat].includes(fishName) && fishDataMap[fishName]?.rarity === "epic"){
            retVal = stat;
        }
    });
    return retVal;
};

Lakes.getBuffByFish = function(fishName) {
    let buffObj = {};
    let buff = Lakes.isConsumable(fishName);
    if (buff) {
        buffObj.stat = buff;
    } else {
        return false;
    }

    let level = fishDataMap[fishName]?.level;
    if(level){
        buffObj.percent = Math.min(1 + level/2, 10);
    } else {
        return false;
    }

    return buffObj;
};

Lakes.getInventoryDescription = function(fishName){
    let description = Lakes.getBuffByFish(fishName);
    return description ? description.percent + "% " + description.stat : false;
};

module.exports = Lakes;