
define(['jquery', 'timer', 'dialoguetext'], function($, Timer, DialogueText) {

    var Bubble = Class.extend({
        init: function(id, element, time, showCheck) {
            this.id = id;
            this.element = element;
            var timeout = 5000;
            if (id === "global") {
                timeout = 1000 * 60 * 15;
            }
            this.timer = new Timer(timeout, time);
            this.showCheck = showCheck;
        },

        isOver: function(time) {
            if (this.dialogueText?.isTyping) return false;
            if(this.timer.isOver(time)) {
                return true;
            }
            return false;
        },

        destroy: function() {
            this.dialogueText?.cancel();
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

        create: function(id, message, time, showCheck, presentation) {
            this.bubbles[id]?.dialogueText?.cancel();
            if(this.bubbles[id]) {
                this.bubbles[id].reset(time);
                if (id === "global") {
                    this.bubbles[id].element.find('.chat-history-content').html(message);
                } else {
                    $("#"+id+" p").html(message);
                }
            }
            else {
                if (id === "global") {
                    var el = $('<div id="global" class="bubbleglobal" role="region" aria-label="Chat history" tabindex="0"><div class="chat-history-content">' + message + '</div></div>');
                } else {
                    var el = $("<div id=\""+id+"\" class=\"bubble\"><p>"+message+"</p><div class=\"thingy\"></div></div>"); //.attr('id', id);
                }
                $(el).appendTo(this.container);
                this.bubbles[id] = new Bubble(id, el, time, showCheck);
            }
            if (id === "global") {
                const history = this.bubbles[id].element;
                history.scrollTop(history[0].scrollHeight);
            } else {
                const bubble = this.bubbles[id];
                bubble.element.removeClass('dialogue-bubble').find('.dialogue-ready-indicator').remove();
                if (presentation?.dialogue) {
                    bubble.element.addClass('dialogue-bubble');
                    const paragraph = bubble.element.find('p')[0];
                    const length = paragraph.textContent.length;
                    const startedAt = Date.now();
                    bubble.dialogueText = new DialogueText(paragraph, {
                        onComplete: () => {
                            bubble.reset(time + Date.now() - startedAt);
                            bubble.timer.duration = Math.max(5000, Math.min(30000, length * 50));
                            bubble.element.append('<span class="dialogue-ready-indicator" aria-hidden="true"></span>');
                        }
                    });
                } else {
                    bubble.dialogueText = null;
                    bubble.timer.duration = 5000;
                }
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
