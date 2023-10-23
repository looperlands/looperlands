const Utils = require("./utils");

const rarities = {common: {chance: 700, expMultiplier: 1, speed: 20}, 
                uncommon: {chance: 250, expMultiplier: 2, speed: 15}, 
                rare: {chance: 40, expMultiplier: 5, speed: 11}, 
                epic: {chance: 8, expMultiplier: 20, speed: 8}, 
                legendary: {chance: 2, expMultiplier: 50, speed: 6}};

//Not all rarities have to be defined within a lake, but a common is mandatory
let Lakes = {
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
};

Lakes.getRandomFish = function(lake) {
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
        if (retFish !== undefined){
            return retFish;
        }
        else
        {
            return Object.keys(allFish).find(key => allFish[key] === "common");
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

Lakes.getDifficulty = function(playerLevel, lakeName) {
    if (Lakes[lakeName] === undefined) {
        return null;
    }

    const maxDifficulty = 5,
          minDifficulty = 25, // a target bar should never be bigger than 25%
          levelGain = 2;

    let calculatedDiff = maxDifficulty + (playerLevel - Lakes[lakeName].level) * levelGain;
    return Math.min(calculatedDiff, minDifficulty);
};

module.exports = Lakes;