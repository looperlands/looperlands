const Formulas = require('./formulas.js');
const axios = require('axios');

class Weapon {
    constructor(trait, xp, nftId) {
        this.nftId = nftId;
        this.trait = trait || this.chooseRandomTrait();
        this.level = Formulas.level(this.xp);
    }

    chooseRandomTrait() {
        const traits = ['aoe', 'crit'];
        const randomIndex = Math.floor(Math.random() * traits.length);
        let trait = traits[randomIndex];
        this.#setTraitInServer(trait);
        return trait;
    }

    #setTraitInServer(trait) {
        //todo: dao call to set trait
    }

    isTraitActive() {
        let chance = Math.floor(Math.random() * 100);
        chance += this.level;
        return chance >= 89; // base level is 1, so base chance of trait is 10%
    }

    incrementExperience(damageDealt) {
        // todo: dao call here to update and set the level based on the returned xp
    }

}