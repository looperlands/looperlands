
var Utils = require("./utils");

var Formulas = {};

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
    const baseExperience = 1000;
    const experienceGrowth = 5;
    
    let level = 1;
    let experienceRequired = baseExperience;
  
    while (experience >= experienceRequired) {
      experience -= experienceRequired;
      level++;
      experienceRequired = Math.floor(baseExperience * Math.pow(experienceGrowth, level - 1));
    }
  
    return level;
}

if(!(typeof exports === 'undefined')) {
    module.exports = Formulas;
}