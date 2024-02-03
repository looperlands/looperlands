
var Utils = require('./utils'),
    Types = require("../../shared/js/gametypes");

const _ = require('underscore');

module.exports = Chest = Item.extend({
    init: function(id, x, y) {
        this._super(id, Types.Entities.CHEST, x, y);
    },

    setItems: function(items) {
        this.items = items;
    },

    setChances: function(chances) {
        this.chances = chances;
    },

    getRandomItem: function() {
        if (this.chances) {
            return this.getRandomItemByChances();
        }

        var nbItems = _.size(this.items),
            item = null;

        if(nbItems > 0) {
            item = this.items[Utils.random(nbItems)];
        }
        return item;
    },

    getRandomItemByChances: function() {
        let sum = Object.values(this.chances).reduce((a, b) => a + b, 0);
        let rnd = Utils.random(sum);

        let tmpSum = 0;
        for(let i = 0; i < Object.keys(this.chances).length; i++) {
            tmpSum += Object.values(this.chances)[i];
            if(rnd < tmpSum) {
                return Object.keys(this.chances)[i];
            }
        }
    }
});