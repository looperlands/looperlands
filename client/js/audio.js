
define(['area', 'musicplayer', 'ambientconfig', 'soundscape'], function (Area, MusicPlayer, AmbientConfig, Soundscape) {

    var AudioManager = Class.extend({
        init: function (game) {
            var self = this;

            this.enabled = true;
            this.soundscape = new Soundscape();
            this.extension = Detect.canPlayMP3() ? "mp3" : "ogg";
            this.sounds = {};
            this.soundEffects = {};
            this.game = game;
            this.currentMusic = null;
            this.musicPlayer = new MusicPlayer();
            this.streamMusic = new MusicPlayer();
            this.areas = [];
            this.volumes = {music: .25, sound: .8, ambient: .8};
            this.setVolumes(this.volumes);
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

        setVolumes: function (values) {
            for (const key of ['music', 'sound', 'ambient']) {
                if (Number.isFinite(values[key])) this.volumes[key] = Math.max(0, Math.min(1, values[key]));
            }
            this.musicPlayer.setVolume(this.volumes.music);
            this.streamMusic.setVolume(this.volumes.music);
            this.soundscape.setVolumes(this.volumes.sound, this.volumes.ambient);
            for (const channels of Object.values(this.sounds)) for (const sound of channels || []) sound.volume = this.volumes.sound;
            for (const sound of Object.values(this.soundEffects)) sound.volume?.(this.volumes.sound);
            if (this.impactGain) this.impactGain.gain.value = this.enabled ? this.volumes.sound : 0;
        },

        disable: function () {
            this.enabled = false;
            this.soundscape.setEnabled(false);
            if (this.impactGain) this.impactGain.gain.value = 0;
            _.each(this.sounds, function (channels) {
                _.each(channels || [], function (sound) {sound.pause();});
            });
            this.impactContext?.suspend()?.catch?.(() => {});

            _.each(this.soundEffects, function (sound) {
                sound.stop();
            });

            this.resetMusic({sound: this.musicPlayer.sound});
            this.currentMusic = null;
        },

        destroy: function () {
            this.disable();
            this.soundscape.destroy();
            this.impactContext?.close()?.catch?.(() => {});
            this.impactContext = null;
            this.impactGain?.disconnect(); this.impactGain = null;
            this.musicPlayer.destroy();
            this.streamMusic.destroy();
            _.each(this.soundEffects, function (sound) {
                sound.unload();
            });
        },

        enable: function () {
            this.enabled = true;
            this.soundscape.setEnabled(true);
            if (this.impactGain) this.impactGain.gain.value = this.volumes.sound;
            this.soundscape.unlock();

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

        updateAmbience: function () {
            const game = this.game, player = game.player, map = game.map;
            if (this.ambientMap !== map) {this.soundscape.clear(); this.ambientMap = map;}
            this.soundscape.update(map?.ambientSounds || [], this.listenerPosition(),
                !!(this.enabled && game.started && !game.isStopped && !game.disconnected && !game.minigameLoaded &&
                    map?.isLoaded && player && !player.isDead));
        },

        listenerPosition: function () {
            const player = this.game.player, size = this.game.map?.tilesize || 16;
            return {x: Number.isFinite(player?.x) ? player.x / size : player?.gridX || 0,
                y: Number.isFinite(player?.y) ? player.y / size : player?.gridY || 0};
        },

        playFootstep: function (surface) {
            if (this.enabled) this.soundscape.cue(surface, {gain: 1, pan: 0}, true);
        },

        playToolImpact: function (material, x, y) {
            if (!this.enabled || !this.game.started || this.game.isStopped || this.game.disconnected || this.game.minigameLoaded || this.game.player?.isDead) return;
            const size = this.game.map?.tilesize || 16;
            this.soundscape.cue(material, AmbientConfig.spatial({x: x / size - .5, y: y / size - .75,
                radius: 12, volume: .75}, this.listenerPosition()));
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
            sound.volume = this.volumes.sound;
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
                    volume: this.volumes.sound,
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

        prepareImpactAudio: function () {
            if (!this.enabled) return;
            try {
                const shared = window.Howler?.ctx;
                const Context = window.AudioContext || window.webkitAudioContext;
                if (!shared && !this.impactContext && Context) this.impactContext = new Context();
                const context = shared || this.impactContext;
                if (context?.state === 'suspended') context.resume().catch(() => {});
            } catch (_) { /* Hit samples remain available when Web Audio is unsupported. */ }
        },

        playConfirmedImpact: function (combo, critical) {
            if (!this.enabled) return;
            this.playSound(combo % 2 ? 'hit1' : 'hit2', false, {
                rate: (1 + Math.min(4, Math.max(0, combo - 1)) * .06) * (critical ? .88 : 1)
            });
            const context = window.Howler?.ctx || this.impactContext;
            if (!context || context.state !== 'running') return;
            const bass = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
            bass.frequency.setValueAtTime(critical ? 110 : 90, now);
            bass.frequency.exponentialRampToValueAtTime(38, now + .1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(.18, now + .004);
            gain.gain.exponentialRampToValueAtTime(.001, now + .12);
            if (!this.impactGain) {
                this.impactGain = context.createGain();
                this.impactGain.gain.value = this.volumes.sound;
                this.impactGain.connect(context.destination);
            }
            bass.connect(gain); gain.connect(this.impactGain);
            bass.onended = () => { bass.disconnect(); gain.disconnect(); };
            bass.start(now); bass.stop(now + .13);
        },

        playSound: function (name, lowerMusicVolume, presentation = {}) {
            if (lowerMusicVolume === undefined) {
                lowerMusicVolume = false;
            }


            if (/^\d+$/.test(String(name))) {
                name = this.soundNames[Number(name)];
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

                // Keep repeated combat/collection sounds lively without changing music or UI cues.
                const varied = ['hit1', 'hit2', 'hurt', 'kill1', 'kill2', 'loot', 'watersplash'].includes(name);
                const rate = varied && Number.isFinite(presentation.rate)
                    ? Math.max(.5, Math.min(1.5, presentation.rate)) : varied ? 0.92 + Math.random() * 0.16 : 1;
                if (effect) {
                    const id = effect.play();
                    if (varied) effect.rate?.(rate, id);
                } else {
                    sound.volume = this.volumes.sound;
                    sound.playbackRate = rate;
                    if (varied) {
                        sound.preservesPitch = false;
                        if ('webkitPreservesPitch' in sound) sound.webkitPreservesPitch = false;
                        if ('mozPreservesPitch' in sound) sound.mozPreservesPitch = false;
                    }
                    sound.play()?.catch?.(() => {});
                }
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

            const scene = this.game.map?.getCurrentScene?.(entity);
            // Scripted world music retains priority; scene authoring replaces only map music.
            if (!(this.game.worldMusicAreas || []).includes(area) && scene?.authoringMusic !== undefined && scene.authoringMusic !== null) {
                return this.getMusic(scene.authoringMusic);
            }
            if (area) {
                music = this.getMusic(area.musicName);
            }
            return music;
        },

        updateMusic: function () {
            if (this.game.scriptedSequence?.music) {this.playMusicByName(this.game.scriptedSequence.music);return;}
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
                if (!fadeIn) this.musicPlayer.setLevel(1);
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
                    var volume = self.musicPlayer.level - step;

                    if (self.enabled && volume >= step) {
                        self.musicPlayer.setLevel(volume);
                    } else {
                        self.musicPlayer.setLevel(0);
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
                    var volume = self.musicPlayer.level + step;

                    if (self.enabled && volume < 1 - step) {
                        self.musicPlayer.setLevel(volume);
                    } else {
                        self.musicPlayer.setLevel(1);
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
                    var volume = self.musicPlayer.level - 0.02;
                    if (self.enabled && volume >= 0.25) {
                        self.musicPlayer.setLevel(volume);
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
                    var volume = self.musicPlayer.level + 0.02;
                    if (self.enabled && volume < 1) {
                        self.musicPlayer.setLevel(volume);
                    } else {
                        self.musicPlayer.setLevel(1);
                        self.clearFadeIn(music);
                    }
                }, 50);
            }
        }
    });

    return AudioManager;
});
