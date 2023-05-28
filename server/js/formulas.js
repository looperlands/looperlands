
var Utils = require("./utils");

var Formulas = {};

const EXPERIENCE_GROWTH = 4;
const BASE_EXPERIENCE = 1000;

Formulas.dmg = function (weaponLevel, armorLevel) {
    var dealt = weaponLevel * Utils.randomInt(5, 10),
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
    var hp = 80 + ((level - 1) * 15);
    return hp;
};

Formulas.xp = function (mobProperties) {
    return (Math.round(Math.round((mobProperties.hp + mobProperties.armor + mobProperties.weapon) / 2) / 10) * 10) / 2;
}



Formulas.calculateExperienceMap = function (numLevels) {
    const experienceMap = {};

    for (let level = 1; level <= numLevels; level++) {
        let experience = 0;
        let experienceRequired = BASE_EXPERIENCE;

        for (let currentLevel = 1; currentLevel < level; currentLevel++) {
            experience += experienceRequired;
            experienceRequired = Math.floor(BASE_EXPERIENCE * Math.pow(EXPERIENCE_GROWTH, currentLevel - 1));
        }

        experienceMap[level] = experienceRequired;
    }

    return experienceMap;
};

// Usage example:
const numLevels = 20;
const EXPERIENCE_MAP = Formulas.calculateExperienceMap(numLevels);

Formulas.level = function (experience) {
    if (experience <= BASE_EXPERIENCE) {
        return 1;
    }
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
    if (experience <= BASE_EXPERIENCE) {
        experienceToNextLevel = experience;
        experienceRequiredToLevel = BASE_EXPERIENCE;
    } else {
        experienceToNextLevel = experience - currentLevelExperience;
        experienceRequiredToLevel = nextLevelExperience - currentLevelExperience;
    }

    let percentage = (experienceToNextLevel / experienceRequiredToLevel) * 100;
    percentage = percentage.toFixed(2);
    return {
        currentLevel: currentLevel,
        percentage: percentage
    }
}


if (!(typeof exports === 'undefined')) {
    module.exports = Formulas;
}