
define(['area', 'musicplayer'], function (Area, MusicPlayer) {

    var AudioManager = Class.extend({
        init: function (game) {
            var self = this;

            this.enabled = true;
            this.extension = Detect.canPlayMP3() ? "mp3" : "ogg";
            this.sounds = {};
            this.soundEffects = {};
            this.game = game;
            this.currentMusic = null;
            this.musicPlayer = new MusicPlayer();
            this.streamMusic = new MusicPlayer();
            this.areas = [];
            this.musicNames = [
                // MAIN MUSIC    
                "village", "full", "fluteguitar", "guitar", "exploration", "beach", "forest", "cave", "desert", "lavaland", "boss",
                // OA MUSIC
                "oaspooky", "oafortressboss", "oacastle", "oasnowcon", "oanightharrow", "oainsidecastle", "oacrystal", "oavillage", "oaglacialord", "oaforest", "oasnowthaven", "overworld", "oaseacombat", "oacave", "oawind", "oaforesttown", "oatitle", "oaporttown", "oaplanes", "oacave2", "oaforestboss", "oahome", "oaspiderboss", "oaforest2", "oamain", "oacustoms", "oafishing", "oanorthern", "oatower", "oaarena", "oachristmas", "oachristmas2", "oatavern","taikotown","taikocity","taikotrain",
                // COBS FARM MUSIC
                "cobsfarmmain", "cobdungeon", "cobspookyforest", "cobactionadventure", "cobsnuggles", "cobbasicfishing", "cobreggae", "CobHomeAutomation", "CobAboveItAll", "CobLettingTheLeavesFall", "CobCow5", "CobChickenCoop3", "CobDarkThrillerMystery",
                // DUCKVILLE MUSIC
                "duckvilleaoe", "duckvillefly",
                // M88N MUSIC
                "pillowfight", "dreamstroll", "steeldrums", "mib", "bitbeats", "elevatormusic", "watertheme", "exploration", "classychristmas", "funkychristmas", "shark", "beesinthegarden", "treeforest","clowncircus", "minecave", "pixelparty", "pixelplayground", "zombietown",
                // MRMLABS MUSIC
                "battletheme",
                // BITCORN MUSIC
                "bitcorncornsino", "bit_sludgeriver", "bit_portal",
                // ROBITS MUSIC
                "ROBITSMAIN1", "MOONBASES", "cclobby", "CCSPOOKY", "CCHAUNTEDBOSS", "CCLIBRARY", "CCMANSION",
            ];

            this.soundNames = [
                // DEFAULT SOUNDS
                "achievement", "chat", "chest", "death", "firefox", "heal", "hit1", "hit2", "hurt", "kill1", "kill2", "loot", "noloot", "npc", "npc-end", "revive", "teleport",
                // FISHING SOUNDS
                "fishingfail", "fishingsuccess", "watersplash",
                // BITCORN SOUNDS
                "honk"
            ];


            var loadSoundFiles = function () {
                console.log("Loading sound files...");
                _.each(self.soundNames, function (name) {
                    self.loadSound(name);
                });
            };

            if (!(Detect.isSafari() && Detect.isWindows())) {
                loadSoundFiles();
            } else {
                this.enabled = false; // Disable audio on Safari Windows
            }
        },

        disable: function () {
            this.enabled = false;

            _.each(this.soundEffects, function (sound) {
                sound.stop();
            });

            this.resetMusic({sound: this.musicPlayer.sound});
            this.currentMusic = null;
        },

        destroy: function () {
            this.disable();
            this.musicPlayer.destroy();
            this.streamMusic.destroy();
            _.each(this.soundEffects, function (sound) {
                sound.unload();
            });
        },

        enable: function () {
            this.enabled = true;

            if (this.currentMusic) {
                this.currentMusic = null;
            }
            this.updateMusic();
        },

        toggle: function () {
            if (this.enabled) {
                this.disable();
            } else {
                this.enable();
            }
        },

        getAudioPath: function (basePath, name) {
            if (!(window.location.href.indexOf("127.0.0.1") > -1)) {
                basePath = 'https://cdn.jsdelivr.net/gh/balkshamster/looperlands@main/client/' + basePath;
            }

            return basePath + name + "." + this.extension;
        },

        load: function (basePath, name, loaded_callback, channels) {

            var path = this.getAudioPath(basePath, name),
                sound = document.createElement('audio'),
                self = this;

            sound.addEventListener('canplaythrough', function (e) {
                this.removeEventListener('canplaythrough', arguments.callee, false);
                console.debug(path + " is ready to play.");
                if (loaded_callback) {
                    loaded_callback();
                }
            }, false);
            sound.addEventListener('error', function (e) {
                console.error("Error: " + path + " could not be loaded.");
                self.sounds[name] = null;
            }, false);

            sound.preload = "auto";
            sound.autobuffer = true;
            sound.src = path;
            sound.load();

            this.sounds[name] = [sound];
            _.times(channels - 1, function () {
                self.sounds[name].push(sound.cloneNode(true));
            });
        },

        loadSound: function (name, handleLoaded) {
            // Use decoded buffers for short effects on Safari instead of starting
            // and seeking HTML media elements during combat. Howler is loaded by index.html.
            if (Detect.isSafari() && window.Howl && window.Howler && window.Howler.usingWebAudio) {
                var self = this;
                var effect = new window.Howl({
                    src: [this.getAudioPath("audio/sounds/", name)],
                    preload: false,
                    pool: 4,
                    onload: handleLoaded,
                    onloaderror: function () {
                        effect.unload();
                        delete self.soundEffects[name];
                        self.load("audio/sounds/", name, handleLoaded, 4);
                    }
                });
                this.soundEffects[name] = effect;
                effect.load();
                return;
            }
            this.load("audio/sounds/", name, handleLoaded, 4);
        },

        getMusic: function (name) {
            if (this.musicNames.indexOf(name) === -1) return null;
            return {name: name, src: this.getAudioPath("audio/music/", name)};
        },

        playStreamMusic: function (url) {
            if (!url) {
                var wasActive = this.streamMusic.active;
                this.streamMusic.stop();
                if (wasActive) this.updateMusic();
                return;
            }
            if (this.streamMusic.active && this.streamMusic.source === url) return;
            this.resetMusic({sound: this.musicPlayer.sound});
            this.currentMusic = null;
            this.streamMusic.play(url);
        },

        getSound: function (name) {
            if (!this.sounds[name]) {
                return null;
            }
            var sound = _.detect(this.sounds[name], function (sound) {
                return sound.ended || sound.paused;
            });
            if (sound && sound.ended) {
                sound.currentTime = 0;
            } else {
                sound = this.sounds[name][0];
            }
            return sound;
        },

        playSound: function (name, lowerMusicVolume) {
            if (lowerMusicVolume === undefined) {
                lowerMusicVolume = false;
            }


            if(parseInt(name) > 0) {
                name = this.soundNames[parseInt(name)];
            }

            var effect = this.soundEffects[name];
            var sound = this.enabled && (effect || this.getSound(name));

            if (sound) {

                if (lowerMusicVolume && this.currentMusic) {
                    this.lowerCurrentMusicVolume();
                }

                let self = this;
                if (lowerMusicVolume) {
                    var duration = effect ? effect.duration() : sound.duration;
                    if (duration > 2) {
                        setTimeout(() => { self.raiseCurrentMusicVolume() }, Math.round(duration * 1000) - 1000)
                    } else {
                        self.raiseCurrentMusicVolume();
                    }
                }

                sound.play();
            }
        },

        addArea: function (x, y, width, height, musicName) {
            var area = new Area(x, y, width, height);
            area.musicName = musicName;
            this.areas.push(area);
        },

        getSurroundingMusic: function (entity) {
            var music = null,
                area = _.detect(this.areas, function (area) {
                    return area.contains(entity);
                });

            if (area) {
                music = this.getMusic(area.musicName);
            }
            return music;
        },

        updateMusic: function () {
            if (this.enabled && !this.streamMusic.active) {
                var music = this.getSurroundingMusic(this.game.player);

                if (music) {
                    if (!this.isCurrentMusic(music)) {
                        this.playMusic(music);
                    }
                } else {
                    this.fadeOutCurrentMusic();
                }
            }
        },

        isCurrentMusic: function (music) {
            return this.currentMusic && (music.name === this.currentMusic.name);
        },

        playMusicByName: function (name) {
            if (/^\d+$/.test(String(name))) name = this.musicNames[Number(name)];
            var music = this.getMusic(name);
            if (music && !this.isCurrentMusic(music)) this.playMusic(music);
        },

        playMusic: function (music) {
            if (this.enabled && !this.streamMusic.active && music) {
                music.sound = this.musicPlayer.getSound();
                var fadeIn = music.sound.fadingOut && this.musicPlayer.source === music.src;
                this.clearFadeIn(music);
                this.clearFadeOut(music);
                if (!fadeIn) music.sound.volume = 1;
                this.currentMusic = music;
                this.musicPlayer.play(music.src);
                if (fadeIn) this.fadeInMusic(music);
            }
        },

        resetMusic: function (music) {
            if (music && music.sound) {
                this.clearFadeIn(music);
                this.clearFadeOut(music);
                this.musicPlayer.stop();
            }
        },

        fadeOutMusic: function (music, ended_callback, step) {
            var self = this;
            if (music) {
                this.clearFadeOut(music);
                this.clearFadeIn(music);
                music.sound.fadingOut = setInterval(function () {
                    var volume = music.sound.volume - step;

                    if (self.enabled && volume >= step) {
                        music.sound.volume = volume;
                    } else {
                        music.sound.volume = 0;
                        self.clearFadeOut(music);
                        ended_callback(music);
                    }
                }, 50);
            }
        },

        fadeInMusic: function (music) {
            var self = this;
            if (music && !music.sound.fadingIn) {
                this.clearFadeOut(music);
                music.sound.fadingIn = setInterval(function () {
                    var step = 0.01;
                    var volume = music.sound.volume + step;

                    if (self.enabled && volume < 1 - step) {
                        music.sound.volume = volume;
                    } else {
                        music.sound.volume = 1;
                        self.clearFadeIn(music);
                    }
                }, 30);
            }
        },

        clearFadeOut: function (music) {
            if (music.sound.fadingOut) {
                clearInterval(music.sound.fadingOut);
                music.sound.fadingOut = null;
            }
        },

        clearFadeIn: function (music) {
            if (music.sound.fadingIn) {
                clearInterval(music.sound.fadingIn);
                music.sound.fadingIn = null;
            }
        },

        fadeOutCurrentMusic: function (step = 0.02) {
            var self = this;
            if (this.currentMusic) {
                this.fadeOutMusic(this.currentMusic, function (music) {
                    self.resetMusic(music);
                }, step);
                this.currentMusic = null;
            }
        },

        lowerCurrentMusicVolume: function () {
            var self = this;
            var music = this.currentMusic;
            if (music) {
                this.clearFadeIn(music);
                this.clearFadeOut(music);
                music.sound.fadingOut = setInterval(function () {
                    var volume = music.sound.volume - 0.02;
                    if (self.enabled && volume >= 0.25) {
                        music.sound.volume = volume;
                    } else {
                        self.clearFadeOut(music);
                    }
                }, 20);
            }
        },

        raiseCurrentMusicVolume: function () {
            var self = this;
            var music = this.currentMusic;
            if (music) {
                this.clearFadeOut(music);
                this.clearFadeIn(music);
                music.sound.fadingIn = setInterval(function () {
                    var volume = music.sound.volume + 0.02;
                    if (self.enabled && volume < 1) {
                        music.sound.volume = volume;
                    } else {
                        music.sound.volume = 1;
                        self.clearFadeIn(music);
                    }
                }, 50);
            }
        }
    });

    return AudioManager;
});
