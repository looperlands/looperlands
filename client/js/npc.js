define(['character', '../../shared/js/npctalk'], function (Character, NpcTalk) {




    var Npc = Character.extend({
        init: function (id, kind) {
            this._super(id, kind, 1);
            this.itemKind = Types.getKindAsString(this.kind);
            this.talkCount = NpcTalk[this.itemKind].length;
            this.talkIndex = 0;
            this.thoughts = [];
            this.thoughtsClearedCallback = null;
            this.showIndicator = false;
        },

        applyBehaviorState: function (state) {
            if (!state || !state.key) return;
            this.behaviorControlled = true;
            this.behaviorActivity = state.activity;
            this.name = state.label || this.name;
            this.moveSpeed = Math.max(200, Math.min(1900, state.moveSpeed || 450));
            this.setOrientation(state.orientation);
            if (this.isLoaded && !this.isMoving()) this.idle();
        },

        animate: function (animation, speed, count, onEndCount) {
            const direction = Types.getOrientationAsString(this.orientation);
            const supported = this.hasAnimation(animation + '_' + direction) ||
                (direction === 'left' && this.hasAnimation(animation + '_right')) || this.hasAnimation(animation);
            if (supported) {
                this._super(animation, speed, count, onEndCount);
                if (['idle', 'walk'].includes(animation) && this.currentAnimation) this.currentAnimation.setSpeed(speed);
            } else if (this.hasAnimation('idle_down')) {
                // Older NPC sheets only have a front-facing idle strip. Reuse it
                // rather than requesting missing directional or walking frames.
                this.flipSpriteX = direction === 'left';
                this.setAnimation('idle_down', animation === 'walk' ? 180 : this.idleSpeed, count, onEndCount);
                if (this.currentAnimation) this.currentAnimation.setSpeed(animation === 'walk' ? 180 : this.idleSpeed);
            }
        },

        talk: function (walletId) {
            let msg = null;

            if (this.talkIndex > this.talkCount) {
                this.talkIndex = 0;
            }
            if (this.talkIndex < this.talkCount) {
                msg = NpcTalk[this.itemKind][this.talkIndex];
            }
            this.talkIndex += 1;

            if (msg) msg = msg.replace("{walletId}", walletId);

            return msg;
        },

        addThoughts: function (messages, thoughtsClearedCallback) {
            // add elements from messages array to thoughts array
            for (var i = 0; i < messages.length; i++) {
                this.thoughts.push(messages[i]);
            }

            this.thoughtsClearedCallback = thoughtsClearedCallback;
        },

        setShowIndicator: function (indicator) {
            this.showIndicator = indicator;
        },

        hasTalked: function() {
          this.hasTalkedRecently = true;
        },

        hasInteraction : function () {
            if ((this.showIndicator || this.thoughts.length > 0 || NpcTalk[this.itemKind].length > 0) && !this.hasTalkedRecently) {
                return true;
            }

            setTimeout(() => this.hasTalkedRecently = false, 500);
            return false;
        }
    });

    return Npc;
});
