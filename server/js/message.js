
var cls = require("./lib/class"),
    _ = require("underscore"),
    Utils = require("./utils"),
    Types = require("../../shared/js/gametypes");

var Messages = {};
module.exports = Messages;

var Message = cls.Class.extend({
});

Messages.Spawn = Message.extend({
    init: function(entity) {
        this.entity = entity;
    },
    serialize: function() {
        var spawn = [Types.Messages.SPAWN];
        return spawn.concat(this.entity.getState());
    }
});

Messages.Despawn = Message.extend({
    init: function(entityId) {
        this.entityId = entityId;
    },
    serialize: function() {
        return [Types.Messages.DESPAWN, this.entityId];
    }
});

Messages.Move = Message.extend({
    init: function(entity) {
        this.entity = entity;
    },
    serialize: function() {
        return [Types.Messages.MOVE,
                this.entity.id,
                this.entity.x,
                this.entity.y];
    }
});

Messages.LootMove = Message.extend({
    init: function(entity, item) {
        this.entity = entity;
        this.item = item;
    },
    serialize: function() {
        return [Types.Messages.LOOTMOVE,
                this.entity.id,
                this.item.id];
    }
});

Messages.Attack = Message.extend({
    init: function(attackerId, targetId) {
        this.attackerId = attackerId;
        this.targetId = targetId;
    },
    serialize: function() {
        return [Types.Messages.ATTACK,
                this.attackerId,
                this.targetId];
    }
});

Messages.Health = Message.extend({
    init: function(points, isRegen) {
        this.points = points;
        this.isRegen = isRegen;
    },
    serialize: function() {
        var health = [Types.Messages.HEALTH,
                      this.points];
        
        if(this.isRegen) {
            health.push(1);
        }
        return health;
    }
});

Messages.HitPoints = Message.extend({
    init: function(maxHitPoints) {
        this.maxHitPoints = maxHitPoints;
    },
    serialize: function() {
        return [Types.Messages.HP,
                this.maxHitPoints];
    }
});

Messages.Resource = Message.extend({
  init: function (resource, qty) {
      this.resource = resource
      this.qty = qty;
  },
  serialize: function() {
        return [Types.Messages.RESOURCE,
            this.resource,
            this.qty];
    }
})

Messages.EquipItem = Message.extend({
    init: function(player, itemKind) {
        this.playerId = player.id;
        this.itemKind = itemKind;
    },
    serialize: function() {
        return [Types.Messages.EQUIP,
                this.playerId,
                this.itemKind];
    }
});

Messages.Drop = Message.extend({
    init: function(mob, item) {
        this.mob = mob;
        this.item = item;
    },
    serialize: function() {
        var drop = [Types.Messages.DROP,
                    this.mob.id,
                    this.item.id,
                    this.item.kind,
                    _.pluck(this.mob.hatelist, "id")];

        return drop;
    }
});

Messages.Chat = Message.extend({
    init: function(player, message) {
        this.playerId = player.id;
        this.message = message;
    },
    serialize: function() {
        return [Types.Messages.CHAT,
                this.playerId,
                this.message];
    }
});

Messages.Emote = Message.extend({
    init: function(player, emotion) {
        this.playerId = player.id;
        this.emotion = emotion;
    },
    serialize: function() {
        return [Types.Messages.EMOTE,
            this.playerId,
            this.emotion];
    }
})

Messages.Teleport = Message.extend({
    init: function(entity) {
        this.entity = entity;
    },
    serialize: function() {
        return [Types.Messages.TELEPORT,
                this.entity.id,
                this.entity.x,
                this.entity.y];
    }
});

Messages.Damage = Message.extend({
    init: function(entity, points) {
        this.entity = entity;
        this.points = points;
    },
    serialize: function() {
        return [Types.Messages.DAMAGE,
                this.entity.id,
                this.points];
    }
});

Messages.Population = Message.extend({
    init: function(world, total) {
        this.world = world;
        this.total = total;
    },
    serialize: function() {
        return [Types.Messages.POPULATION,
                this.world,
                this.total];
    }
});

Messages.Kill = Message.extend({
    init: function(mob, xp) {
        this.mob = mob;
        this.xp = xp;
    },
    serialize: function() {
        return [Types.Messages.KILL,
                this.mob.kind, this.xp];
    }
});

Messages.List = Message.extend({
    init: function(ids) {
        this.ids = ids;
    },
    serialize: function() {
        var list = this.ids;
        
        list.unshift(Types.Messages.LIST);
        return list;
    }
});

Messages.Destroy = Message.extend({
    init: function(entity) {
        this.entity = entity;
    },
    serialize: function() {
        return [Types.Messages.DESTROY,
                this.entity.id];
    }
});

Messages.Blink = Message.extend({
    init: function(item) {
        this.item = item;
    },
    serialize: function() {
        return [Types.Messages.BLINK,
                this.item.id];
    }
});

Messages.MobDoSpecial = Message.extend({
    init: function(mob) {
        this.mob = mob;
    },
    serialize: function() {
        return [Types.Messages.MOBDOSPECIAL,
                this.mob.id];
    }
});

Messages.MobExitCombat = Message.extend({
    init: function(mob) {
        this.mob = mob;
    },
    serialize: function() {
        return [Types.Messages.MOBEXITCOMBAT,
                this.mob.id];
    }
});

Messages.QuestComplete = Message.extend({
    init: function(questName, endText, xpReward, medal) {
        this.questName = questName;
        this.endText = endText;
        this.xpReward = xpReward;
        this.medal = medal;
    },
    serialize: function() {
        return [Types.Messages.QUEST_COMPLETE,
            this.questName,
            this.endText,
            this.xpReward,
            this.medal
        ];
    }
});

Messages.Follow = Message.extend({
    init: function(entity) {
        this.entity = entity
    },
    serialize: function() {
        return [Types.Messages.FOLLOW,
            this.entity.id,
        ];
    }
});

Messages.Camera = Message.extend({
    init: function(x, y) {
        this.x = x;
        this.y = y;
    },
    serialize: function() {
        return [Types.Messages.CAMERA,
            this.x,
            this.y,
        ];
    }
});

Messages.Sound = Message.extend({
    init: function(sound) {
        this.sound = sound;
    },
    serialize: function() {
        return [Types.Messages.SOUND, this.sound];
    }
})

Messages.Music = Message.extend({
    init: function(music) {
        this.music = music;
    },
    serialize: function() {
        return [Types.Messages.MUSIC, this.music];
    }
})

Messages.Layer = Message.extend({
    init: function(layer, show) {
        this.layer = layer;
        this.show = show
    },
    serialize: function() {
        return [Types.Messages.LAYER, this.layer, this.show];
    }
})

Messages.Animate = Message.extend({
    init: function(entity, animation) {
        this.entity = entity;
        this.animation = animation
    },
    serialize: function() {
        return [Types.Messages.ANIMATE, this.entity, this.animation];
    }
})

Messages.SpawnFloat = Message.extend({
    init: function(playerId, floatName, gX, gY) {
        this.playerId = playerId;
        this.floatName = floatName;
        this.gX = gX;
        this.gY = gY;
    },
    serialize: function() {
        return [Types.Messages.SPAWNFLOAT,
                this.playerId,
                this.floatName,
                this.gX,
                this.gY];
    }
});

Messages.SpawnProjectile = Message.extend({
    init: function(playerId, projectile, mob) {
        this.playerId = playerId;
        this.projectile = projectile;
        this.mob = mob;
    },
    serialize: function() {
        return [Types.Messages.SPAWNPROJECTILE, this.playerId, this.projectile, this.mob];
    }
});

Messages.OutOfAmmo = Message.extend({
   init: function() {

    },
    serialize: function() {
       return [Types.Messages.OUTOFAMMO];
    }
});

Messages.DespawnFloat = Message.extend({
    init: function(playerId) {
        this.playerId = playerId;
    },
    serialize: function() {
        return [Types.Messages.DESPAWNFLOAT,
                this.playerId];
    }
});

Messages.Notify = Message.extend({
    init: function(text) {
        this.text = text;
    },
    serialize: function() {
        return [Types.Messages.NOTIFY, this.text];
    },
});

Messages.Buffinfo = Message.extend({
    init: function(buffstat, buffPercent, buffDuration) {
        this.stat = buffstat;
        this.percent = buffPercent;
        this.duration = buffDuration;
    },
    serialize: function() {
        return [Types.Messages.BUFFINFO,
                this.stat,
                this.percent,
                this.duration];
    },
});

Messages.Announcement = Message.extend({
    init: function(message, timeToShow) {
        this.message = message;
        this.timeToShow = timeToShow;
    },
    serialize: function() {
        return [Types.Messages.ANNOUNCEMENT, this.message, this.timeToShow];
    },
});


Messages.Indicator = Message.extend({
    init: function(entityId, showIndicator) {
        this.entitiyId = entityId;
        this.showIndicator = showIndicator;
    },
    serialize: function() {
        return [Types.Messages.INDICATOR, this.entitiyId, this.showIndicator];
    },
});