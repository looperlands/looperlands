define(function () {
    // Reuse the media element across tracks: Safari grants autoplay per element.
    // Long music files can stream without downloading and decoding the whole song.
    var MusicPlayer = Class.extend({
        init: function () {
            var self = this;
            this.sound = null;
            this.source = null;
            this.active = false;
            this.pending = null;
            this.attempt = 0;
            this.retryPlayback = function () {
                if (!document.hidden) self.resume();
            };
            this.gestures = ['click', 'touchend', 'keydown'];
            this.gestures.forEach(function (event) {
                document.addEventListener(event, self.retryPlayback, true);
            });
            document.addEventListener('visibilitychange', this.retryPlayback);
        },

        getSound: function () {
            if (!this.sound) {
                this.sound = document.createElement('audio');
                this.sound.preload = 'auto';
                this.sound.loop = true;
                this.sound.addEventListener('canplay', this.retryPlayback);
            }
            return this.sound;
        },

        play: function (source) {
            var sound = this.getSound();
            if (source !== this.source) {
                this.stop();
                this.source = source;
                sound.src = source;
                sound.load();
            }
            this.active = true;
            this.resume();
        },

        resume: function () {
            var self = this;
            var sound = this.sound;
            if (!this.active || !sound || this.pending !== null || (!sound.paused && !sound.ended)) return;

            // A network/media error may be recoverable on the next interaction.
            if (sound.error) sound.load();
            var attempt = ++this.attempt;
            this.pending = attempt;
            var settled = function () {
                if (self.pending === attempt) self.pending = null;
            };
            try {
                var playback = sound.play();
                if (playback && typeof playback.then === 'function') {
                    // Handle asynchronous autoplay rejection, not just a thrown error.
                    playback.then(settled, settled);
                } else {
                    settled();
                }
            } catch (error) {
                settled();
            }
        },

        stop: function () {
            this.active = false;
            this.pending = null;
            this.attempt += 1;
            if (this.sound) {
                this.sound.pause();
                if (this.sound.readyState > 0) this.sound.currentTime = 0;
            }
        },

        destroy: function () {
            var self = this;
            this.stop();
            this.gestures.forEach(function (event) {
                document.removeEventListener(event, self.retryPlayback, true);
            });
            document.removeEventListener('visibilitychange', this.retryPlayback);
            if (this.sound) {
                this.sound.removeEventListener('canplay', this.retryPlayback);
                this.sound.removeAttribute('src');
                this.sound.load();
            }
        }
    });
    return MusicPlayer;
});
