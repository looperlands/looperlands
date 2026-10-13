
define(function() {
    const COMBAT_TEXT_DURATION = 650;
    const STACK_WINDOW = 200;
    const POP_DURATION = 160;
    const FADE_START = 0.55;

    var InfoManager = Class.extend({
        init: function(game) {
            this.game = game;
            this.infos = {};
            this.destroyQueue = [];
            this.nextId = 0;
            this.damageLanes = {};
            this.damageStacks = {};
        },
    
        addDamageInfo: function(value, x, y, type, entityId, critical = false) {
            const time = this.game.currentTime;
            const combat = ['inflicted', 'received', 'healed'].includes(type);
            const amount = combat ? Number(value) : NaN;
            const targetKey = entityId === undefined ? x + ':' + y : entityId;
            // Keep critical and ordinary hits separate, and anchor the window to the first hit.
            const key = combat ? type + ':' + targetKey + ':' + (critical === true) : undefined;
            const stack = combat && this.damageStacks[key];
            const stacked = stack && this.infos[stack.id];
            if (stacked && time >= stacked.startedAt && time - stacked.startedAt < STACK_WINDOW
                && Number.isFinite(amount) && Number.isFinite(stacked.amount)
                && Math.sign(amount) === Math.sign(stacked.amount)) {
                stacked.setAmount(stacked.amount + amount);
                stacked.poppedAt = time;
                stacked.update(time);
                return;
            }

            const id = ++this.nextId;
            const info = new DamageInfo(id, value, x, y, COMBAT_TEXT_DURATION, type);
            if (combat) {
                // Damage, healing and criticals share lanes so their labels cannot occupy the same slot.
                const previous = this.damageLanes[targetKey];
                const lane = previous && time - previous.time < COMBAT_TEXT_DURATION ? previous.lane + 1 : 0;
                this.damageLanes[targetKey] = {lane: lane, time: time};
                this.damageStacks[key] = {id: id, time: time};
                info.x += [-4, 4, -8, 8][lane % 4];
                info.combat = true;
                info.startedAt = time;
                info.poppedAt = time;
                info.initialX = info.x;
                info.initialY = y - (lane % 4) * 16;
                info.drift = [-4, 4, -6, 6][lane % 4];
                info.lift = [16, 18, 17, 19][lane % 4];
                info.tilt = [-0.08, 0.08, -0.12, 0.12][lane % 4];
                info.critical = critical === true;
                info.reducedMotion = this.game.app.settings.getReducedMotion();
                if (Number.isFinite(amount)) info.setAmount(amount);
                info.update(time);
            }

            info.onDestroy(id => {
                this.destroyQueue.push(id);
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
            this.damageStacks = {};
        },

        update: function(time) {
            var self = this;
            Object.keys(this.damageLanes).forEach(key => {
                if (time - this.damageLanes[key].time >= COMBAT_TEXT_DURATION) delete this.damageLanes[key];
            });
            Object.keys(this.damageStacks).forEach(key => {
                if (time - this.damageStacks[key].time >= STACK_WINDOW) delete this.damageStacks[key];
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
            stroke: "#481c24"
        },
        "inflicted": {
            fill: "white",
            stroke: "#373737"
        },
        "healed": {
            fill: "rgb(80, 255, 80)",
            stroke: "#173c28"
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
            this.type = type;
            this.fillColor = damageInfoColors[type].fill;
            this.strokeColor = damageInfoColors[type].stroke;
        },

        setAmount: function(amount) {
            this.amount = amount;
            this.value = this.type === 'healed' ? '+' + amount : this.critical ? amount + '!' : amount;
            // Logarithmic, capped emphasis also works with high-level characters.
            this.baseScale = 1 + Math.min(0.3, Math.log10(Math.max(1, Math.abs(amount))) * 0.1)
                + (this.critical ? 0.15 : 0);
            if (this.critical) {
                this.fillColor = '#fce045';
                this.strokeColor = '#533642';
            }
        },
    
        isTimeToAnimate: function(time) {
        	return (time - this.lastTime) > this.speed;
        },
    
        update: function(time) {
            if (this.combat) {
                const progress = Math.min(1, Math.max(0, (time - this.startedAt) / this.duration));
                const pop = Math.min(1, Math.max(0, (time - this.poppedAt) / POP_DURATION));
                // A fast overshoot settles in 160 ms; the flight stays anchored at the hit.
                const pulse = pop < 0.25 ? 0.85 + 0.6 * (1 - Math.pow(1 - pop / 0.25, 3))
                    : 1 + 0.45 * Math.pow((1 - pop) / 0.75, 3);
                this.textScale = (this.baseScale || 1) * (this.reducedMotion ? 1 : pulse);
                this.rotation = this.reducedMotion ? 0 : this.tilt * (1 - progress);
                this.x = this.initialX + (this.reducedMotion ? 0 : this.drift * progress);
                this.y = this.initialY - (this.reducedMotion ? 0 : this.lift * progress - 10 * progress * progress);
                this.opacity = progress <= FADE_START ? 1 : Math.pow((1 - progress) / (1 - FADE_START), 2);
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
