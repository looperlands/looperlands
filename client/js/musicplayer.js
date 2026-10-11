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
            this.watchdog = null;
            this.lastTime = 0;
            this.lastProgress = Date.now();
            this.retryPlayback = function () {
                if (!document.hidden) self.resume();
            };
            this.repeatPlayback = function () {
                if (!self.active || !self.sound || !self.sound.ended) return;
                self.pending = null;
                self.attempt += 1;
                self.recordProgress();
                self.resume(true);
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
                // Explicit completion handling keeps the requested track going at EOF.
                // Handle completion ourselves on the already-unlocked element.
                this.sound.loop = false;
                this.sound.addEventListener('canplay', this.retryPlayback);
                this.sound.addEventListener('ended', this.repeatPlayback);
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
            this.recordProgress();
            if (this.watchdog === null) {
                var self = this;
                this.watchdog = setInterval(function () {self.checkPlayback();}, 5000);
            }
            this.resume();
        },

        recordProgress: function () {
            this.lastTime = this.sound ? this.sound.currentTime : 0;
            this.lastProgress = Date.now();
        },

        checkPlayback: function () {
            var sound = this.sound;
            if (!this.active || !sound) return;
            if (document.hidden || sound.currentTime !== this.lastTime) {
                this.recordProgress();
                return;
            }
            if (Date.now() - this.lastProgress >= 15000) {
                // A stalled element or never-settled play promise can still claim
                // to be playing. Reload only after sustained lack of progress.
                var wasPending = this.pending !== null;
                this.pending = null;
                this.attempt += 1;
                if (wasPending || (!sound.paused && !sound.ended && !sound.error)) sound.load();
                this.recordProgress();
                this.resume(true);
            } else {
                this.resume();
            }
        },

        resume: function (force) {
            var self = this;
            var sound = this.sound;
            if (!this.active || !sound || this.pending !== null) return;
            if (!force && !sound.paused && !sound.ended && !sound.error) return;

            // Finite songs repeat; live sources reconnect at EOF to get fresh data.
            if (sound.error || (sound.ended && !isFinite(sound.duration))) {
                sound.load();
            } else if (sound.ended && sound.readyState > 0) {
                sound.currentTime = 0;
            }
            this.recordProgress();
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
            if (this.watchdog !== null) {
                clearInterval(this.watchdog);
                this.watchdog = null;
            }
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
                this.sound.removeEventListener('ended', this.repeatPlayback);
                this.sound.removeAttribute('src');
                this.sound.load();
            }
        }
    });
    return MusicPlayer;
});
