const Lakes = require("./lakes.js");
const Properties = require("./properties.js");

const Collectables = {
    providers: [Lakes, Properties],
    isCollectable: function (item) {
        for (var i = 0; i < this.providers.length; i++) {
            if (this.providers[i].isCollectable(item)) {
                return true;
            }
        }
        return false;
    },

    isConsumable: function (item) {
        for (var i = 0; i < this.providers.length; i++) {
            if (this.providers[i].isConsumable(item)) {
                return true;
            }
        }
        return false;
    },

    getCollectableImageName: function(item) {
        for (var i = 0; i < this.providers.length; i++) {
            if (this.providers[i].isCollectable(item)) {
                if(!this.providers[i].getCollectableImageName) {
                    return item;
                }
                return this.providers[i].getCollectableImageName(item);
            }
        }
        return item;
    },

    getCollectAmount: function(item) {
        for (var i = 0; i < this.providers.length; i++) {
            if (this.providers[i].isCollectable(item)) {
                if(!this.providers[i].getCollectAmount) {
                    return 1;
                }
                return this.providers[i].getCollectAmount(item);
            }
        }
        return 1;
    },

    getCollectItem: function(item) {
        for (var i = 0; i < this.providers.length; i++) {
            if (this.providers[i].isCollectable(item)) {
                if(!this.providers[i].getCollectItem) {
                    return item;
                }
                return this.providers[i].getCollectItem(item);
            }
        }
        return item;
    },

    consume: function (item, player) {
        for (var i = 0; i < this.providers.length; i++) {
            if (this.providers[i].isConsumable(item) && this.providers[i].consume !== undefined) {
                this.providers[i].consume(item, player);
                return;
            }
        }
    },

    getInventoryDescription: function(item) {
        for (var i = 0; i < this.providers.length; i++) {
            let description = this.providers[i].getInventoryDescription(item);
            if (description) {
                return description;
            }
        }
        return "";
    }
};

module.exports = Collectables;