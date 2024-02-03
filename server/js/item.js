const Properties = require("./properties"),
      Types = require("../../shared/js/gametypes");

module.exports = Item = Entity.extend({
    init: function(id, kind, x, y) {
        this._super(id, "item", kind, x, y);
        this.isStatic = false;
        this.isFromChest = false;
    },
    
    handleDespawn: function(params) {
        var self = this;
        
        this.blinkTimeout = setTimeout(function() {
            params.blinkCallback();
            self.despawnTimeout = setTimeout(params.despawnCallback, params.blinkingDuration);
        }, params.beforeBlinkDelay);
    },

    setDelay: function(delay) {
        this.delay = delay;
        console.log('set delay: ' + this.delay);
    },
    
    destroy: function() {
        if(this.blinkTimeout) {
            clearTimeout(this.blinkTimeout);
        }
        if(this.despawnTimeout) {
            clearTimeout(this.despawnTimeout);
        }
        
        if(this.isStatic) {
            let delay = this.delay ?? 30000;
            if(Properties[Types.getKindAsString(this.kind)] !== undefined && 
               Properties[Types.getKindAsString(this.kind)].respawnDelay !== undefined) {
                delay = Properties[Types.getKindAsString(this.kind)].respawnDelay;    
            }

            this.scheduleRespawn(delay);
        }
    },
    
    scheduleRespawn: function(delay) {
        var self = this;
        setTimeout(function() {
            if(self.respawn_callback) {
                self.respawn_callback();
            }
        }, delay);
    },
    
    onRespawn: function(callback) {
        this.respawn_callback = callback;
    }
});