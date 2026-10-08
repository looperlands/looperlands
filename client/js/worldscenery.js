// Composition root for world scenery features; Renderer remains content-agnostic.
define(function () {
    return {
        attach(renderer) {
            if (!this.renderers) this.renderers = new WeakMap();
            if (!this.renderers.has(renderer)) this.renderers.set(renderer, new Set());
        },
        update(renderer, config, game) {
            this.attach(renderer);
            const previous = this.renderers.get(renderer), active = new Set();
            for (const extension of config?.rendererExtensions || []) {
                if (!/^[a-z][a-z0-9-]*$/.test(extension.id) || !/^[a-z][a-z0-9-]*-worker\.js$/.test(extension.script)) continue;
                renderer.registerExtension(extension.script);
                renderer.setExtensionData(extension.id, extension.data);
                active.add(extension.id);
            }
            for (const id of previous) if (!active.has(id)) renderer.setExtensionData(id, null);
            this.renderers.set(renderer, active);
            const audio = game?.audioManager, music = config?.musicAreas || [];
            if (audio && JSON.stringify(music) !== game.worldMusicSnapshot) {
                audio.areas = audio.areas.filter(area => !(game.worldMusicAreas || []).includes(area));
                game.worldMusicAreas = [];
                for (const area of music) {
                    audio.addArea(area.x, area.y, area.width, area.height, area.track);
                    const created = audio.areas.pop();
                    game.worldMusicAreas.push(created); audio.areas.unshift(created);
                }
                game.worldMusicSnapshot = JSON.stringify(music); audio.updateMusic();
            }
        },
    };
});
