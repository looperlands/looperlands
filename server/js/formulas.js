
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
        return Utils.randomInt(0, Math.round(weaponLevel/2));
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
    }

    return experienceMap;
};

//Speed formula is tuned for base speed of 800. If you ever change player base speed value, the formula needs to be adapted.
Formulas.calculateSpeedTraitMap = function (numLevels) {
    const speedTraitMap = {};

    speedTraitMap[1] = 200;
    for (let level = 2; level <= numLevels; level++) {
        let speedBonus;
        speedBonus = (650 - speedTraitMap[level-1]) * 0.0083 + speedTraitMap[level-1];
        speedTraitMap[level] = speedBonus;
    }

    return speedTraitMap;
};

Formulas.calculateToolLevelMap = function (numLevels) {
    const toolLevelMap = {};

    toolLevelMap[1] = 0;
    toolLevelMap[2] = 1000;
    for (let level = 3; level <= numLevels; level++) {
        toolLevelMap[level] = toolLevelMap[level-1] * 2;
    }

    return toolLevelMap;
};

// Usage example:
const numLevels = 100;
const EXPERIENCE_MAP = Formulas.calculateExperienceMap(numLevels);
const SPEEDTRAIT_MAP = Formulas.calculateSpeedTraitMap(numLevels);
const TOOLLEVEL_MAP = Formulas.calculateToolLevelMap(numLevels);

Formulas.level = function (experience) {
    let levels = Object.keys(EXPERIENCE_MAP);
    let level = levels.find(function(level) {
        //console.log(level, EXPERIENCE_MAP[level], experience);
        return EXPERIENCE_MAP[level] >= experience;
    });
    level = Number(level) - 1
    return level;
}

Formulas.toolLevel = function (experience) {
    let levels = Object.keys(TOOLLEVEL_MAP);
    let level = levels.find(function(level) {
        return TOOLLEVEL_MAP[level] > experience;
    });
    level = Number(level) - 1;
    return level;
}

Formulas.xpPercentageOfLevel = function(level, percent) {
    let xp = (EXPERIENCE_MAP[level + 1] - EXPERIENCE_MAP[level]) * percent/100.0;
    xp = Math.round(xp);
    return xp;
}


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

Formulas.calculateToolPercentageToNextLevel = function (experience) {
    const currentLevel = Formulas.toolLevel(experience);
    const currentLevelExperience = TOOLLEVEL_MAP[currentLevel];
    const nextLevelExperience = TOOLLEVEL_MAP[currentLevel + 1];

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

Formulas.getSpeedTraitBonus = function (weaponLevel) {
    return SPEEDTRAIT_MAP[weaponLevel];
}

Formulas.gaussianRand = function() {
    var rand = 0;
    for (var i = 0; i < 6; i += 1) {
      rand += Math.random();
    }
    return rand / 6;
}
  
Formulas.gaussianRangeRandom = function(start, end) {
    return Math.floor(start + Formulas.gaussianRand() * (end - start + 1));
}

if (!(typeof exports === 'undefined')) {
    module.exports = Formulas;
}