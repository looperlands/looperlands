
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
        const entries = Object.entries(this.chances).filter(([, weight]) => Number.isFinite(weight) && weight > 0);
        let sum = entries.reduce((total, [, weight]) => total + weight, 0);
        let rnd = Math.random() * sum;
        let tmpSum = 0;
        for(let i = 0; i < entries.length; i++) {
            tmpSum += entries[i][1];
            if(rnd < tmpSum) {
                return parseInt(entries[i][0]);
            }
        }
    }
});
