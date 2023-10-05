const Utils = require("./utils");

let Lakes = {
    cobFarmLake: {
        fish: {
            cobguppy: 90,
            cobcarp: 9,
            cobcoldfish: 1
        },
    },
};

Lakes.getRandomFish = function(lake) {
    let allFish = Lakes[lake].fish,
        p = 0,
        retFish = null,
        oddsSum = Object.values(allFish).reduce((partialSum, currFish) => partialSum + currFish, 0),
        v = Utils.random(oddsSum);

        for(let fishName in allFish) {
            let percentage = allFish[fishName];
            
            p += percentage;
            if(v < p) {
                retFish = fishName;
                break;
            }
        }
        return retFish;
};

module.exports = Lakes;