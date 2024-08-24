
define(['jquery', 'timer'], function($, Timer) {

    var Bubble = Class.extend({
        init: function(id, element, time, showCheck) {
            this.id = id;
            this.element = element;
            timeout = 5000;
            if (id === "global") {
                timeout = 1000 * 60 * 15;
            }
            this.timer = new Timer(timeout, time);
            this.showCheck = showCheck;
        },
    
        isOver: function(time) {
            if(this.timer.isOver(time)) {
                return true;
            }
            return false;
        },
    
        destroy: function() {
            $(this.element).remove();
        },
    
        reset: function(time) {
            this.timer.lastTime = time;
        }
    });

    var BubbleManager = Class.extend({
        init: function(container) {
            this.container = container;
            this.bubbles = {};
        },
    
        getBubbleById: function(id) {
            if(id in this.bubbles) {
                return this.bubbles[id];
            }
            return null;
        },
    
        create: function(id, message, time, showCheck) {
            if(this.bubbles[id]) {
                this.bubbles[id].reset(time);
                $("#"+id+" p").html(message);
            }
            else {
                if (id === "global") {
                    var el = $("<div id=\""+id+"\" class=\"bubbleglobal\"><p>"+message+"</p></div>"); //.attr('id', id);
                } else {
                    var el = $("<div id=\""+id+"\" class=\"bubble\"><p>"+message+"</p><div class=\"thingy\"></div></div>"); //.attr('id', id);
                }
                $(el).appendTo(this.container);
                this.bubbles[id] = new Bubble(id, el, time, showCheck);
            }
        },
    
        update: function(time) {
            var self = this,
                bubblesToDelete = [];
        
            _.each(this.bubbles, function(bubble) {
                if(bubble.isOver(time) || (bubble.showCheck && !bubble.showCheck())) {
                    bubble.destroy();
                    bubblesToDelete.push(bubble.id);
                }
            });
        
            _.each(bubblesToDelete, function(id) {
                delete self.bubbles[id];
            });
        },
    
        clean: function() {
            var self = this,
                bubblesToDelete = [];
        
            _.each(this.bubbles, function(bubble) {
                bubble.destroy();
                bubblesToDelete.push(bubble.id);
            });
        
            _.each(bubblesToDelete, function(id) {
                delete self.bubbles[id];
            });
        
            this.bubbles = {};
        },
    
        destroyBubble: function(id) {
            var bubble = this.getBubbleById(id);
        
            if(bubble) {
                bubble.destroy();
                delete this.bubbles[id];
            }
        },
        
        forEachBubble: function(callback) {
            _.each(this.bubbles, function(bubble) {
                callback(bubble);
            });
        }
    });
    
    return BubbleManager;
});
