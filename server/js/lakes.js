const { all } = require("underscore");
const Utils = require("./utils");

const rarities = {
    common: {chance: 700, expMultiplier: 1, speed: 20},
    uncommon: {chance: 243, expMultiplier: 2, speed: 15},
    rare: {chance: 40, expMultiplier: 5, speed: 11},
    epic: {chance: 15, expMultiplier: 20, speed: 8},
    legendary: {chance: 2, expMultiplier: 50, speed: 6}};

//---START CONFIG---
//Not all rarities have to be defined within a lake, but a COMMON is mandatory
const Lakes = {
    cobBathTub: {
        level: 17,
        fish: {
            cobtrashbag: "common",
            cobcan: "uncommon",
            cobkoi: "legendary"
        },
    },
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
    },

    oaeverpond1: {
        level: 1,
        fish: {
            oafish1: "common",
            oafish2: "common",
            oafish3: "uncommon",
            oafish4: "epic",
        }
    },

    oaeverpond2: {
        level: 3,
        fish: {
            oafish5: "common",
            oafish6: "common",
            oafish7: "uncommon",
            oafish8: "epic",
        }
    },

    oaeverpond3: {
        level: 5,
        fish: {
            oafish9: "common",
            oafish10: "common",
            oafish11: "uncommon",
            oafish12: "epic",
            oafish13: "common",
        }
    },

    oaeverpond4: {
        level: 6,
        fish: {
            oafish14: "common",
            oafish15: "common",
            oafish16: "uncommon",
            oafish17: "epic",
            oafish18: "common",
        }
    },

    oaeverpond5: {
        level: 7,
        fish: {
            oafish19: "common",
            oafish20: "common",
            oafish21: "uncommon",
            oafish22: "epic",

        }
    },

    oaeverpond6: {
        level: 8,
        fish: {
            oafish23: "common",
            oafish24: "common",
            oafish25: "uncommon",
            oafish26: "common",
            oafish27: "epic",

        }
    },

    oaeverpond7: {
        level: 10,
        fish: {
            oafish28: "common",
            oafish29: "common",
            oafish30: "uncommon",
            oafish31: "common",
            oafish31: "epic",
        }
    },    

    oaeverpond8: {
        level: 12,
        fish: {
            oafish32: "common",
            oafish33: "common",
            oafish34: "uncommon",
            oafish35: "common",
            oafish36: "epic",
        }
    },

    m88nDreamPond1: {
        level: 1,
        fish: {
            m88ndreamduckyy: "common",
            m88ndreamduckyr: "uncommon",
        }
    },

    m88nDreamPond2: {
        level: 7,
        fish: {
            m88ndreamcandyy: "common",
            m88ndreamcandyp: "common",
            m88ndreamcandyg: "uncommon",
            m88ndreamcandyb: "rare",
            m88ndreamcandyr: "epic",
            m88ndreamcandya: "legendary",
        }
    },

    m88nDreamPond3: {
        level: 6,
        fish: {
            m88ndreamgumbally: "common",
            m88ndreamgumballp: "common",
            m88ndreamgumballg: "uncommon",
            m88ndreamgumballb: "rare",
            m88ndreamgumballa: "epic",
            m88ndreamgumballr: "legendary",
        }
    },

    m88nDreamPond4: {
        level: 5,
        fish: {
            m88ndreamduckyg: "common",
            m88ndreamduckyb: "rare",
            m88ndreamduckyp: "epic",
        }
    },

    m88nNightmarePond1: {
        level: 13,
        fish: {
            m88nnightmareduckyb: "common",
            m88nnightmareduckyv: "uncommon",
            m88nnightmareduckyr: "epic",
            m88nnightmareduckyg: "legendary",
        }
    },

    m88nocean1: {
        level: 8,
        fish: {
            m88nbluetang: "common",
            m88npompano: "uncommon",
            m88nclam: "rare",
            m88nanglerfish: "epic",
        }
    },

    m88nocean2: {
        level: 4,
        fish: {
            m88nbutterflyfish: "common",
            m88ncoral: "uncommon",
            m88nseaangel: "rare",
            m88naxolotl: "epic",
        }
    },

    m88nocean3: {
        level: 9,
        fish: {
            m88nclownfish: "common",
            m88noyster: "uncommon",
            m88npearl: "rare",
            m88nblobfish: "epic",
        }
    },

    m88nocean4: {
        level: 15,
        fish: {
            m88nwolffish: "common",
            m88nnautilus: "uncommon",
            m88nsquid: "rare",
            m88nbettafish: "epic",
        }
    },

    m88nocean5: {
        level: 11,
        fish: {
            m88nparrotfish: "common",
            m88nconch: "uncommon",
            m88ndumbooctopus: "rare",
            m88nbluelobster: "epic",
        }
    },

    m88nocean6: {
        level: 14,
        fish: {
            m88ncowfish: "common",
            m88ncrab: "uncommon",
            m88nlampreyeel: "rare",
            m88ncharfish: "epic",
        }
    },

    m88nocean7: {
        level: 10,
        fish: {
            m88ntuna: "common",
            m88nsundial: "uncommon",
            m88nlionfish: "rare",
            m88njellyfish: "epic",
        }
    },

    m88nocean8: {
        level: 16,
        fish: {
            m88nguppy: "common",
            m88nsanddollar: "uncommon",
            m88nturtle: "rare",
            m88nkoifish: "epic",
        }
    },

    m88nocean9: {
        level: 2,
        fish: {
            m88ntigerfish: "common",
            m88nseacucumber: "uncommon",
            m88npufferfish: "rare",
            m88noctopus: "epic",
        }
    },

    m88nocean10: {
        level: 7,
        fish: {
            m88npinkfantasia: "common",
            m88nscallop: "uncommon",
            m88nsaltwatersnail: "rare",
            m88npiranha: "epic",
            m88nseaspider: "legendary",
        }
    },

    m88nocean11: {
        level: 3,
        fish: {
            m88nseaweed: "common",
            m88nspirula: "uncommon",
            m88nsilvereel: "rare",
            m88nshrimp: "epic",
        }
    },

    m88nocean12: {
        level: 12,
        fish: {
            m88nseafrog: "common",
            m88nseaurchin: "uncommon",
            m88nseahorse: "rare",
            m88nstarfish: "epic",
        }
    },

    m88nocean13: {
        level: 1,
        fish: {
            m88nmackerel: "common",
            m88noceanbass: "uncommon",
        }
    },

    m88ndarkpool: {
        level: 3,
        fish: {
            m88ngmeshare: "common",
            m88nwhiskey: "uncommon",
            m88ndiamondhand: "rare",
            m88ngoldenbanana: "epic",
            m88nshorts: "legendary",
        }
    },

    m88ncraterlake1: {
        level: 8,
        fish: {
            m88nalien1: "common",
            m88nalien2: "uncommon",
            m88nalien3: "rare",
            m88nalien4: "epic",
            m88nalien5: "legendary",
        }
    },

    m88ncraterlake2: {
        level: 8,
        fish: {
            m88nalien6: "common",
            m88nalien7: "uncommon",
            m88nalien8: "rare",
            m88nalien9: "epic",
            m88nalien10: "legendary",
        }
    },

    m88nmoonlake1: {
        level: 16,
        fish: {
            m88nmoon3: "common",
            m88nmoon4: "uncommon",
            m88nmoon1: "rare",
            m88nmoon2: "epic",
            m88nmoon5: "legendary",
        }
    },

    m88nmoonlake2: {
        level: 16,
        fish: {
            m88nmoon7: "common",
            m88nmoon6: "uncommon",
            m88nmoon9: "rare",
            m88nmoon8: "epic",
            //m88nmoon10: "legendary",
        }
    },

    m88npoisonpond: {
        level: 6,
        fish: {
            m88nzombiefoot: "common",
            m88nzombiehand: "uncommon",
            m88nzombieeye: "rare",
            m88nweirdglass: "epic",
        }
    },

    m88n24kpool: {
        level: 11,
        fish: {
            m88n24knecklace: "common",
            m88n24kcrown: "common",
            m88n24kwarriorhelmet: "uncommon",
            m88n24kcigarcutter: "rare",
            m88n24kapestatuette: "epic",
            m88n24kancientscroll: "legendary",
        }
    },

    mrmsodamachine: {
        level: 5,
        fish: {
            cherrycola: "common",
            rootbeer: "uncommon",
            valleydew: "rare",
            gingerale: "epic",
            berryblast: "legendary",
        }
    },

    mrmchipmachine: {
        level: 1,
        fish: {
            bbqchips: "common",
            dillpicklechips: "uncommon",
            blackpepperchips: "rare",
            saltnvinegarchips: "epic",
        }
    },

    lavalake: {
        level: 11,
        fish: {
            dragonegg: "common",
            dragonbreath: "uncommon",
            dragonclaw: "rare",
            luckybabydragon: "epic",
        }
    },

    cornsinoSludgeRiver: {
        level: 1,
        fish: {
            ...Object.fromEntries(["bit_BoneFish", "bit_freshPrawnce", "bit_maCORNtosh", "cornBootFish"].map(fish => [fish, "common"])),
            ...Object.fromEntries(["bit_FEET", "bit_Kickle", "bit_Corn", "bit_NOPEmato", "cornCanFish"].map(fish => [fish, "epic"])),
            ...Object.fromEntries(["bit_MrPunchy", "bit_SnaggletoothEel"].map(fish => [fish, "rare"])),
            ...Object.fromEntries(["bit_JEFF", "cornWinkyFish"].map(fish => [fish, "legendary"]))
        }
    },

    //Short Destroyers
    acidlake: {
        level: 1,
        fish: {
            clownfish: "common",
            swedishfish: "uncommon",
            rainbowfish: "rare",
            lollipop: "epic",
        }
    },

};
// only EPIC fish can be a consumable
const ConsumableFish = {
    hp: ["cobparadisefish","oafish27","m88ndreamcandyr","gingerale", "m88nanglerfish", "m88nbettafish", "m88njellyfish", "m88npiranha"],
    atk: ["cobbluegill","oafish31","oafish22","m88ndreamduckyp","saltnvinegarchips", "m88naxolotl", "m88nbluelobster", "m88nkoifish", "m88nshrimp", "m88nalien4", "m88nmoon2", "m88nweirdglass"],
    exp: ["cobgreensunfish","oafish36", "lollipop","m88ndreamgumballa","m88ngoldenbanana", "m88nblobfish", "m88ncharfish", "m88noctopus", "m88nstarfish", "luckybabydragon", "m88nnightmareduckyr", "m88n24kapestatuette", "m88nalien9", "m88nmoon8"]
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
    try{
        if(Object.keys(Lakes[lake].fish).length == 1){
            return Object.keys(Lakes[lake].fish)[0];
        }
        
        let luckyFish = lucky ? Lakes.getRandomFish(lake,false) : false;
    
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
    
        let retFish = Object.keys(allFish).filter(key => allFish[key] === retRarity) || Object.keys(allFish).filter(key => allFish[key] === "common");
        retFish = Utils.shuffleAndGetRandom(retFish);
    
            if(luckyFish && rarities[allFish[luckyFish]].chance < rarities[allFish[retFish]].chance) {
                return luckyFish;
            } else {
                return retFish;
            }
    }catch(error){
        throw new Error(`[ERROR] lakes.js | getRandomFish >> lake: ${lake}, lucky: ${lucky} \n${error}`);
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

Lakes.getEffectDescription = function(fishName){
    return;
};

Lakes.getCooldownData = function(fishName){
    //not implemented yet - maybe never will?
    return;
};

module.exports = Lakes;
