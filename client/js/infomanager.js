
define(function() {
    const COMBAT_TEXT_DURATION = 1000;

    var InfoManager = Class.extend({
        init: function(game) {
            this.game = game;
            this.infos = {};
            this.destroyQueue = [];
            this.nextId = 0;
            this.damageLanes = {};
        },
    
        addDamageInfo: function(value, x, y, type, entityId) {
            var time = this.game.currentTime,
                id = ++this.nextId,
                self = this,
                info = new DamageInfo(id, value, x, y, COMBAT_TEXT_DURATION, type);
        
            if (['inflicted', 'received', 'healed'].includes(type)) {
                const key = type + ':' + (entityId === undefined ? x + ':' + y : entityId);
                const previous = this.damageLanes[key];
                const lane = previous && time - previous.time < COMBAT_TEXT_DURATION ? previous.lane + 1 : 0;
                this.damageLanes[key] = {lane: lane, time: time};
                info.x += [-4, 4, -8, 8][lane % 4];
                info.combat = true;
                info.startedAt = time;
                info.initialY = y;
                info.reducedMotion = this.game.app.settings.getReducedMotion();
            }

            info.onDestroy(function(id) {
                self.destroyQueue.push(id);
            });
            this.infos[id] = info;
        },
    
        forEachInfo: function(callback) {
            var self = this;
        
            _.each(this.infos, function(info, id) {
                callback(info);
            });
        },
    
        clear: function() {
            this.infos = {};
            this.destroyQueue = [];
            this.damageLanes = {};
        },

        update: function(time) {
            var self = this;
            Object.keys(this.damageLanes).forEach(key => {
                if (time - this.damageLanes[key].time >= COMBAT_TEXT_DURATION) delete this.damageLanes[key];
            });
        
            this.forEachInfo(function(info) {
                info.update(time);
            });
        
            _.each(this.destroyQueue, function(id) {
                delete self.infos[id];
            });
            this.destroyQueue = [];
        }
    });


    var damageInfoColors = {
        "received": {
            fill: "rgb(255, 50, 50)",
            stroke: "rgb(255, 180, 180)"
        },
        "inflicted": {
            fill: "white",
            stroke: "#373737"
        },
        "healed": {
            fill: "rgb(80, 255, 80)",
            stroke: "rgb(50, 120, 50)"
        },
        "xp": {
            fill: "rgb(0, 0, 255)",
            stroke: "white",
        },
        "fishTrait": {
            fill: "#00e4ff",
            stroke: "#001dff",
        },
        "emote": {
            fill: "rgb(150, 170, 190)",
            stroke: "rgb(50, 70, 90)"
        }
    };


    var DamageInfo = Class.extend({
        DURATION: 1000,
    
        init: function(id, value, x, y, duration, type) {
            this.id = id;
            this.value = value;
            this.duration = duration;
            this.x = x;
            this.y = y;
            this.opacity = 1.0;
            this.lastTime = 0;
            this.speed = 100;
            this.fillColor = damageInfoColors[type].fill;
            this.strokeColor = damageInfoColors[type].stroke;
        },
    
        isTimeToAnimate: function(time) {
        	return (time - this.lastTime) > this.speed;
        },
    
        update: function(time) {
            if (this.combat) {
                const progress = Math.min(1, Math.max(0, (time - this.startedAt) / this.duration));
                this.y = this.initialY - (this.reducedMotion ? 0 : Math.round(progress * 12));
                this.opacity = 1 - progress;
                if (progress >= 1) this.destroy();
                return;
            }
            if(this.isTimeToAnimate(time)) {
                this.lastTime = time;
                this.tick();
            }
        },
    
        tick: function() {
            this.y -= 1;
            this.opacity -= 0.07;
            if(this.opacity < 0) {
                this.destroy();
            }
        },
    
        onDestroy: function(callback) {
            this.destroy_callback = callback;
        },
    
        destroy: function() {
            if(this.destroy_callback) {
                this.destroy_callback(this.id);
            }
        }
    });
    
    return InfoManager;
});
