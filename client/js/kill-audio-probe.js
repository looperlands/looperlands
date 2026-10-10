// Opt-in diagnostic: add &profileKills=1 to a game URL. No data is uploaded.
define(['mob'], function (Mob) {
    function install(game) {
        if (game.killAudioProbe) return game.killAudioProbe;
        const audio = game.audioManager;
        const originalPlay = audio.playSound;
        const originalDespawn = game.client.despawn_callback;
        const records = [], pending = [], history = [], restores = [];
        let mode = 'normal', previousFrame = null, frameRequest, stopped = false;
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;right:12px;bottom:70px;z-index:99999;padding:12px;background:#15202eee;color:white;font:13px monospace;max-width:420px';
        const label = document.createElement('div');
        label.textContent = 'Kill audio probe — visible frames only';
        panel.appendChild(label);
        const results = document.createElement('pre');
        results.style.cssText = 'white-space:pre-wrap;max-height:220px;overflow:auto';
        panel.addEventListener('click', event => event.stopPropagation());
        panel.addEventListener('keydown', event => event.stopPropagation());

        function display() {
            const backend = Object.values(audio.soundEffects || {}).some(sound => sound._webAudio) ? 'Web Audio' : 'HTML audio';
            results.textContent = 'Mode: ' + mode + ' (' + backend + ' available)\n' +
                (audio.enabled ? '' : 'Sound disabled in game settings\n') +
                records.slice(-5).map(record => record.invalidReason ||
                    record.mode + ': before ' + record.beforeMaxMs.toFixed(1) + ' ms; after ' + record.afterMaxMs.toFixed(1) +
                    ' ms; death handler ' + record.despawnMs.toFixed(1) + ' ms').join('\n') +
                '\nDetails: __killAudioProbe.report()';
        }

        function stopEffects() {
            Object.values(audio.soundEffects || {}).forEach(sound => sound.stop());
            audio.soundNames.forEach(name => (audio.sounds[name] || []).forEach(sound => sound.pause()));
        }

        function setMode(value) {
            if (!['normal', 'html', 'silent'].includes(value)) throw new Error('Unknown audio probe mode');
            for (const record of pending) record.invalidReason = 'Audio mode changed during sample';
            stopEffects();
            if (value === 'html') {
                audio.soundNames.forEach(name => {
                    if (!audio.sounds[name]) audio.load('audio/sounds/', name, null, 4);
                });
            }
            mode = value;
            display();
        }

        for (const [value, text] of [['normal', 'Normal'], ['html', 'HTML audio'], ['silent', 'Effects off']]) {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = 'margin:8px 4px 0 0;padding:6px';
            button.addEventListener('click', () => setMode(value));
            panel.appendChild(button);
        }
        panel.appendChild(results);
        document.body.appendChild(panel);

        function frame(now) {
            if (stopped) return;
            if (!document.hidden && previousFrame !== null) {
                const entry = {time: now, start: previousFrame, gap: now - previousFrame};
                history.push(entry);
                if (history.length > 600) history.shift();
                for (const record of pending) record.frames.push(entry);
            }
            previousFrame = document.hidden ? null : now;
            frameRequest = requestAnimationFrame(frame);
        }

        function visibilityChanged() {
            previousFrame = null;
            if (document.hidden) for (const record of pending) record.invalidReason = 'Page hidden during sample';
            display();
        }
        document.addEventListener('visibilitychange', visibilityChanged);
        frameRequest = requestAnimationFrame(frame);

        function wrap(owner, name) {
            const original = owner[name];
            if (typeof original !== 'function') return;
            owner[name] = function (...args) {
                const start = performance.now();
                try { return original.apply(this, args); }
                finally {
                    const duration = performance.now() - start;
                    for (const record of pending) record.stages[name] = Math.max(record.stages[name] || 0, duration);
                }
            };
            restores.push(() => {owner[name] = original;});
        }
        wrap(game, 'tick');
        wrap(game.updater, 'update');
        wrap(game.renderer, 'renderFrame');
        wrap(game.client, 'receiveActionBatch');

        audio.playSound = function (...args) {
            const effects = this.soundEffects;
            const start = performance.now();
            try {
                if (mode === 'silent') return;
                if (mode === 'html') this.soundEffects = {};
                return originalPlay.apply(this, args);
            } finally {
                this.soundEffects = effects;
                for (const record of pending) record.sounds.push({name: args[0], mode, durationMs: performance.now() - start});
            }
        };

        function finish(record) {
            pending.splice(pending.indexOf(record), 1);
            const before = record.frames.filter(frame => frame.time <= record.time);
            // Include a frame that started before death and ended afterwards.
            const after = record.frames.filter(frame => frame.time > record.time && frame.start <= record.time + 2000);
            if (!before.length || !after.length) record.invalidReason = record.invalidReason || 'Insufficient visible frames';
            records.push({mode: record.mode, soundEnabled: record.soundEnabled, mobId: record.mobId,
                despawnMs: record.despawnMs, beforeMaxMs: Math.max(0, ...before.map(frame => frame.gap)),
                afterMaxMs: Math.max(0, ...after.map(frame => frame.gap)),
                gapsOver50ms: after.filter(frame => frame.gap > 50).map(frame => ({afterDeathMs: frame.time - record.time, gapMs: frame.gap})),
                stages: record.stages, sounds: record.sounds, invalidReason: record.invalidReason});
            if (records.length > 100) records.shift();
            display();
        }

        game.client.despawn_callback = function (id) {
            const entity = game.getEntityById(id);
            if (!(entity instanceof Mob) || entity.isDead || !game.camera.isVisible(entity)) return originalDespawn.apply(this, arguments);
            const time = performance.now();
            const record = {time, mode, soundEnabled: audio.enabled, mobId: id, stages: {}, sounds: [],
                frames: history.filter(frame => frame.time >= time - 500), invalidReason: document.hidden ? 'Page hidden at death' : undefined};
            pending.push(record);
            try { return originalDespawn.apply(this, arguments); }
            finally {
                record.despawnMs = performance.now() - time;
                record.timer = setTimeout(() => finish(record), 2000);
            }
        };

        const probe = {
            setMode,
            report: () => JSON.parse(JSON.stringify(records)),
            stop: () => {
                stopped = true;
                cancelAnimationFrame(frameRequest);
                pending.forEach(record => clearTimeout(record.timer));
                document.removeEventListener('visibilitychange', visibilityChanged);
                audio.playSound = originalPlay;
                game.client.despawn_callback = originalDespawn;
                restores.forEach(restore => restore());
                panel.remove();
                delete game.killAudioProbe;
            }
        };
        game.killAudioProbe = probe;
        display();
        return probe;
    }
    return {install};
});
