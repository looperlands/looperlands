(function (root, factory) {
    if (typeof define === 'function' && define.amd) define(['ambientconfig'], factory);
    else if (typeof module === 'object' && module.exports) module.exports = factory(require('./ambientconfig'));
    else root.Soundscape = factory(root.AmbientConfig);
}(typeof self !== 'undefined' ? self : this, function (Config) {
    'use strict';
    // Synthesized fallback textures keep presets available if a recording cannot load.
    function texture(context, preset) {
        const rate = 22050, seconds = 12;
        const buffer = context.createBuffer(1, rate * seconds, rate), out = buffer.getChannelData(0);
        let low = 0, crackle = 0, phase = 0;
        const crackleDecay = Math.exp(-1 / (rate * .012));
        for (let i = 0; i < out.length; i++) {
            const t = i / rate, noise = Math.random() * 2 - 1;
            low += .025 * (noise - low);
            let value;
            if (preset === 'campfire') {
                if (Math.random() < 7 / rate) crackle = .25 + Math.random() * .65;
                crackle *= crackleDecay;
                value = low * .7 + noise * (.012 + crackle);
            } else if (preset === 'birds') {
                const cycle = t % 3, chirp = cycle > .3 && cycle < .85;
                const envelope = chirp ? Math.sin((cycle - .3) / .55 * Math.PI) ** 2 : 0;
                phase += 2 * Math.PI * (2100 + 900 * Math.sin(cycle * 28) + 400 * Math.sin(t * 7)) / rate;
                value = Math.sin(phase) * envelope * .13;
            } else if (preset === 'lava') {
                value = low * 1.4 + Math.sin(t * 2 * Math.PI * 58) * .035 * (1 + Math.sin(t * 2 * Math.PI / 3));
            } else {
                const wave = .55 + .45 * Math.sin(t * 2 * Math.PI / (preset === 'surf' ? 6 : 12));
                value = preset === 'water' ? (noise * .06 + low * .8) * (.8 + .2 * Math.sin(t * 13))
                    : low * (preset === 'surf' ? 1.8 : 1.2) * wave;
            }
            // Taper the join to avoid discontinuities in the repeating noise buffer.
            out[i] = value * Math.min(1, t / .04, (seconds - t) / .04);
        }
        return buffer;
    }

    class Soundscape {
        constructor(host = window, doc = document) {
            this.host = host; this.doc = doc; this.voices = new Map(); this.cues = new Set();
            this.buffers = new Map(); this.pending = new Map(); this.errors = new Map(); this.enabled = true;
            this.effectsVolume = 1; this.ambientVolume = 1;
            this.unlock = () => {
                if (!this.enabled || this.doc.hidden || this.destroyed) return;
                try {
                    if (!this.context) {
                        const Context = this.host.AudioContext || this.host.webkitAudioContext;
                        if (!Context) return;
                        this.context = new Context();
                        this.master = this.context.createGain();
                        this.master.gain.value = .65;
                        this.master.connect(this.context.destination);
                        this.effectsBus = this.context.createGain(); this.effectsBus.connect(this.master);
                        this.ambientBus = this.context.createGain(); this.ambientBus.connect(this.master);
                        this.setVolumes(this.effectsVolume, this.ambientVolume);
                    }
                    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
                } catch (_) { /* Existing sampled effects remain available without Web Audio. */ }
            };
            this.visibility = () => {if (this.doc.hidden) this.clear();};
            for (const event of ['pointerdown', 'keydown', 'touchend']) doc.addEventListener(event, this.unlock);
            doc.addEventListener('visibilitychange', this.visibility);
        }
        setEnabled(enabled) {this.enabled = enabled; if (!enabled) this.clear();}
        setVolumes(effects, ambient) {
            this.effectsVolume = Math.max(0, Math.min(1, effects));
            this.ambientVolume = Math.max(0, Math.min(1, ambient));
            if (this.effectsBus) this.effectsBus.gain.value = this.effectsVolume;
            if (this.ambientBus) this.ambientBus.gain.value = this.ambientVolume;
        }
        bufferFor(preset) {
            if (this.buffers.has(preset)) {
                const buffer = this.buffers.get(preset);
                this.buffers.delete(preset); this.buffers.set(preset, buffer);
                return buffer;
            }
            const builtIn = Object.hasOwn(Config.presets, preset);
            const filename = Config.uploadFile(preset) || (builtIn && Config.presets[preset].file);
            if (filename && this.host.fetch && !this.errors.has(preset)) {
                if (!this.pending.has(preset) && this.pending.size < 8) {
                    const controller = new this.host.AbortController();
                    this.pending.set(preset, controller);
                    this.host.fetch('/audio/ambient/' + filename, {signal: controller.signal})
                        .then(response => {if (!response.ok) throw new Error('Audio file unavailable.'); return response.arrayBuffer();})
                        .then(bytes => {if (bytes.byteLength > 1400000) throw new Error('Audio file too large.'); return this.context.decodeAudioData(bytes);})
                        .then(buffer => {
                            if (controller.signal.aborted || this.destroyed) return;
                            if (!Number.isFinite(buffer.duration) || buffer.duration > 30 || buffer.duration < .1) throw new Error('Invalid audio duration.');
                            // Eight voices plus an LRU cache: visiting many maps cannot retain every recording.
                            if (this.buffers.size >= 16) this.buffers.delete(this.buffers.keys().next().value);
                            this.buffers.set(preset, buffer);
                        })
                        .catch(error => {if (!controller.signal.aborted) this.errors.set(preset, error.message);})
                        .finally(() => {if (this.pending.get(preset) === controller) this.pending.delete(preset);});
                }
                return null;
            }
            if (builtIn) {
                const buffer = texture(this.context, preset); this.buffers.set(preset, buffer); return buffer;
            }
            return null;
        }
        connect(buffer, loop, gainValue, panValue) {
            const c = this.context, source = c.createBufferSource(), gain = c.createGain();
            const pan = c.createStereoPanner ? c.createStereoPanner() : null;
            const bus = loop ? this.ambientBus : this.effectsBus;
            source.buffer = buffer; source.loop = loop; source.connect(gain);
            gain.gain.value = gainValue;
            if (pan) {pan.pan.value = panValue; gain.connect(pan); pan.connect(bus);}
            else gain.connect(bus);
            const voice = {source, gain, pan};
            source.onended = () => {source.disconnect(); gain.disconnect(); pan?.disconnect(); this.cues.delete(voice);};
            source.start(0, loop ? Math.random() * buffer.duration : 0);
            return voice;
        }
        update(entries, listener, active = true) {
            if (!active || !this.enabled || this.doc.hidden) {this.clear(); return;}
            if (!this.context || this.context.state !== 'running') return;
            const audible = entries.map(row => ({row, ...Config.spatial(row, listener)}))
                .filter(v => v.gain > .001).sort((a, b) => b.gain - a.gain).slice(0, 8);
            const ids = new Set(audible.map(v => v.row.id)), now = this.context.currentTime;
            for (const [id, voice] of this.voices) if (!ids.has(id)) {
                voice.gain.gain.setTargetAtTime(0, now, .08);
                voice.source.stop(now + .4); this.voices.delete(id); this.cues.add(voice);
            }
            for (const {row, gain, pan} of audible) {
                let voice = this.voices.get(row.id);
                if (voice && voice.preset !== row.preset) {voice.source.stop(); this.voices.delete(row.id); voice = null;}
                if (!voice) {
                    // Include releasing voices in the budget when crossing overlapping edges.
                    if (this.voices.size + this.cues.size >= 24) continue;
                    const buffer = this.bufferFor(row.preset); if (!buffer) continue;
                    voice = this.connect(buffer, true, 0, pan);
                    voice.preset = row.preset; this.voices.set(row.id, voice);
                }
                voice.gain.gain.setTargetAtTime(gain / Math.sqrt(Math.max(1, audible.length)), now, .12);
                voice.pan?.pan.setTargetAtTime(pan, now, .08);
            }
        }
        cue(material, position = {gain: 1, pan: 0}, footstep = false) {
            if (!this.enabled || this.doc.hidden || this.context?.state !== 'running' || this.cues.size >= 16 || position.gain <= .001) return;
            const c = this.context, duration = footstep ? .075 : .16;
            const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate), out = buffer.getChannelData(0);
            const frequency = (material === 'stone' ? 1250 : material === 'wood' ? 340 : 160) * (.9 + Math.random() * .2);
            let low = 0;
            for (let i = 0; i < out.length; i++) {
                const t = i / c.sampleRate, noise = Math.random() * 2 - 1;
                low += .15 * (noise - low);
                const tone = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 55);
                const value = material === 'stone' || material === 'wood' ? tone * .35 + low * .3
                    : material === 'water' ? noise * .16 + low * .35
                        : material === 'grass' ? noise * .09 + low * .25
                            : material === 'sand' || material === 'soil' ? noise * .04 + low * .5
                                : low * .5 + Math.sin(t * 2 * Math.PI * 95) * .12;
                out[i] = value * Math.min(1, t / .003) * Math.exp(-t / (duration / 5));
            }
            const voice = this.connect(buffer, false, position.gain * (footstep ? .22 : .65), position.pan);
            this.cues.add(voice);
        }
        clear() {
            for (const controller of this.pending.values()) controller.abort();
            this.pending.clear();
            for (const voice of [...this.voices.values(), ...this.cues]) {voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect(); voice.pan?.disconnect();}
            this.voices.clear(); this.cues.clear();
        }
        destroy() {
            this.clear(); this.destroyed = true;
            for (const event of ['pointerdown', 'keydown', 'touchend']) this.doc.removeEventListener(event, this.unlock);
            this.doc.removeEventListener('visibilitychange', this.visibility);
            this.context?.close().catch(() => {}); this.buffers.clear();
        }
    }
    Soundscape.texture = texture;
    return Soundscape;
}));
