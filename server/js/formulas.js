
var Utils = require("./utils");

var Formulas = {};

const EXPERIENCE_GROWTH = 5;
const BASE_EXPERIENCE = 1000;

Formulas.dmg = function(weaponLevel, armorLevel) {
    var dealt = weaponLevel * Utils.randomInt(5, 10),
        absorbed = armorLevel * Utils.randomInt(1, 3),
        dmg =  dealt - absorbed;
    
    //console.log("abs: "+absorbed+"   dealt: "+ dealt+"   dmg: "+ (dealt - absorbed));
    if(dmg <= 0) {
        return Utils.randomInt(0, 3);
    } else {
        return dmg;
    }
};

Formulas.hp = function(level) {
    var hp = 80 + ((level - 1) * 15);
    return hp;
};

Formulas.xp = function(mobProperties) {
    return (Math.round(Math.round((mobProperties.hp + mobProperties.armor + mobProperties.weapon)/2)/10) * 10)/2;
}


Formulas.level = function(experience) {
    
    let level = 1;
    let experienceRequired = BASE_EXPERIENCE;
  
    while (experience >= experienceRequired) {
      experience -= experienceRequired;
      level++;
      experienceRequired = Math.floor(BASE_EXPERIENCE * Math.pow(EXPERIENCE_GROWTH, level - 1));
    }
  
    return level;
}

Formulas.calculatePercentageToNextLevel = function (experience) {
    const currentLevel = Formulas.level(experience);
    
    let previousExpRequired = 0;
    if (currentLevel > 1) {
        previousExpRequired = Math.floor(BASE_EXPERIENCE * Math.pow(EXPERIENCE_GROWTH, currentLevel - 2));
    }
    let experienceRequiredForCurrentLevel = Math.floor(BASE_EXPERIENCE * Math.pow(EXPERIENCE_GROWTH, currentLevel - 1)) - previousExpRequired;
    experience-=previousExpRequired;

    let percentage;
    if (experience === 0) {
        percentage = 0;
    } else {
        let percentage = (experience/experienceRequiredForCurrentLevel) * 100;
        percentage = Math.round(percentage, 2);
    }
    return {
        currentLevel: currentLevel,
        percentage: percentage
    }
}


if(!(typeof exports === 'undefined')) {
    module.exports = Formulas;
}