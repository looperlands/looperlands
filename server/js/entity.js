
var cls = require("./lib/class"),
    Messages = require('./message'),
    Utils = require('./utils');

module.exports = Entity = cls.Class.extend({
    init: function(id, type, kind, x, y) {
        this.id = parseInt(id);
        this.type = type;
        this.kind = kind;
        this.x = x;
        this.y = y;
    },
    
    destroy: function() {

    },
    
    _getBaseState: function() {
        return [
            parseInt(this.id),
            this.kind,
            this.x,
            this.y
        ];
    },
    
    getState: function() {
        return this._getBaseState();
    },
    
    spawn: function() {
        return new Messages.Spawn(this);
    },
    
    despawn: function() {
        return new Messages.Despawn(this.id);
    },
    
    setPosition: function(x, y) {
        this.x = x;
        this.y = y;
    },
    
    getPositionNextTo: function(entity, side) {
        var pos = null;
        if(entity) {
            pos = {};

            pos.x = entity.x;
            pos.y = entity.y;
            if(side === 'N')
                pos.y -= 1;
            if(side === 'S')
                pos.y += 1;
            if(side === 'W')
                pos.x -= 1;
            if(side === 'E')
                pos.x += 1;
        }
        return pos;
    },

    onDetachFromParent: function(callback) {
        this.detachFromParent_callback = callback;
    },

    detachFromParent: function() {
        if (this.parentId !== undefined) {
            if(this.detachFromParent_callback) {
               this.detachFromParent_callback(this.parentId, this);
            }
        }
    }
});