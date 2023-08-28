
var Utils = require("./utils");
let discord = require("./discord");
let moment = require("moment");
let Properties = require("./properties");

var Formulas = {};

let XP_MULTIPLIER = 1;
let XP_END_TIME = 0;
let XP_TIMEOUT = null;

Formulas.dmg = function (weaponLevel, armorLevel) {
    var dealt = Math.round((weaponLevel * 0.25 + 1) * Utils.randomInt(5, 10)),
        absorbed = armorLevel * Utils.randomInt(1, 3),
        dmg = dealt - absorbed;

    //console.log("abs: "+absorbed+"   dealt: "+ dealt+"   dmg: "+ (dealt - absorbed));
    if (dmg <= 0) {
        return Utils.randomInt(0, 3);
    } else {
        return dmg;
    }
};

Formulas.hp = function (level) {
    var hp = 80 + ((level - 1) * 20);
    return hp;
};

Formulas.xp = function (mob) {
    if (Properties[Types.getKindAsString(mob.kind)].xp != undefined) {
        return Properties[Types.getKindAsString(mob.kind)].xp * XP_MULTIPLIER;
    } else {
        let baseXp = mob.level * 7;
        let xp = baseXp * XP_MULTIPLIER;
        return xp;
    }
}

Formulas.setXPMultiplier = function (multiplier, timeout) {
    // Only set multiplier if the duration is greater than the current bonus
    let calledEndTime = Date.now() + timeout * 1000;
    let duration = moment.duration(timeout * 1000);

    if (calledEndTime > XP_END_TIME)
    {
        discord.sendMessage("XP is " + multiplier + "x for " + duration.humanize());
        console.log("XP multiplier set to " + multiplier + " for " + timeout + " seconds");
        
        XP_MULTIPLIER = multiplier;
        XP_END_TIME = calledEndTime;
        clearTimeout(XP_TIMEOUT);
        XP_TIMEOUT = setTimeout(function () {
            discord.sendMessage("XP is back to normal");
            console.log("XP multiplier reset to 1");
            XP_MULTIPLIER = 1;
        }, timeout * 1000);
    }
}


Formulas.calculateExperienceMap = function (numLevels) {
    const experienceMap = {};

    experienceMap[1] = 0;
    for (let level = 2; level <= numLevels; level++) {
        let experienceRequired = 0;
        experienceRequired = Math.floor(100 * (9 * Math.pow(level, 3) - 51 * Math.pow(level, 2) + 126 * level - 108));
        experienceMap[level] = experienceRequired;
        console.log("Level " + level + " exp req: " + experienceRequired);
    }

    return experienceMap;
};

// Usage example:
const numLevels = 50;
const EXPERIENCE_MAP = Formulas.calculateExperienceMap(numLevels);

Formulas.level = function (experience) {
    let levels = Object.keys(EXPERIENCE_MAP);
    let level = levels.find(function(level) {
        //console.log(level, EXPERIENCE_MAP[level], experience);
        return EXPERIENCE_MAP[level] >= experience;
    });
    level = Number(level) - 1
    return level;
};


Formulas.calculatePercentageToNextLevel = function (experience) {
    const currentLevel = Formulas.level(experience);
    const currentLevelExperience = EXPERIENCE_MAP[currentLevel];
    const nextLevelExperience = EXPERIENCE_MAP[currentLevel + 1];

    let experienceToNextLevel;
    let experienceRequiredToLevel;

    experienceToNextLevel = experience - currentLevelExperience;
    experienceRequiredToLevel = nextLevelExperience - currentLevelExperience;
    
    let percentage = (experienceToNextLevel / experienceRequiredToLevel) * 100;
    percentage = percentage.toFixed(2);
    return {
        currentLevel: currentLevel,
        percentage: percentage
    }
}

Formulas.xpShare = function (xp, allDmgTaken, partialDmgTaken) {
    let xpShare = Math.round((xp * partialDmgTaken) / allDmgTaken);
    return xpShare;
}

if (!(typeof exports === 'undefined')) {
    module.exports = Formulas;
}