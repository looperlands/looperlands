// Composition root for world scenery features; Renderer remains content-agnostic.
define(function () {
    let actions = [];
    const pending = new Set();
    const nearby = (action, x, y, radius) => Math.abs(action.gridX - x) <= radius && Math.abs(action.gridY - y) <= radius;
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
            actions = (config?.worldActions || []).filter(action => ['inspect', 'travel'].includes(action.type)).map(action => ({
                id: 'world-' + (action.extension || '') + '-' + action.id.replace(/[^a-z0-9_-]/gi, '-'), storyId: action.id,
                extension: action.extension, storyType: action.type, label: action.label,
                gridX: action.x, gridY: action.y, x: action.x * 16, y: action.y * 16
            }));
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
        nearestAction(x, y, radius = 1) {
            return actions.filter(action => nearby(action, x, y, radius))
                .sort((a, b) => Math.abs(a.gridX-x) + Math.abs(a.gridY-y) - Math.abs(b.gridX-x) - Math.abs(b.gridY-y))[0];
        },
        actionAt(x, y) { return actions.find(action => action.gridX === x && action.gridY === y); },
        prompt(game) {
            const action = this.nearestAction(game.player.gridX, game.player.gridY);
            if (!action || !game.started || game.player.isDead) return;
            game.showTileActionBubble(action, {name: action.label});
            const bubble = game.bubbleManager.getBubbleById(action.id);
            bubble?.element.off('click.story').on('click.story', event => {
                event.stopPropagation();
                this.execute(game, action);
            });
        },
        async execute(game, action) {
            if (!actions.includes(action) || pending.has(action.id) || game.player.isDead ||
                !nearby(action, game.player.gridX, game.player.gridY, 1)) return;
            pending.add(action.id);
            try {
                const response = await fetch('/session/' + game.sessionId + '/story/' + action.storyType + '/' + encodeURIComponent(action.storyId) + (action.extension ? '?extension=' + encodeURIComponent(action.extension) : ''), {method: 'POST'});
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Please try again.');
                game.destroyBubble(action.id);
                if (action.storyType === 'inspect') {
                    actions = actions.filter(item => item !== action);
                    game.showNewQuestPopup({heading: result.type === 'collect' ? 'Story item collected' : result.type === 'deliver' ? 'Delivery made' : 'Discovery', name: action.label, startText: result.text});
                }
                return result;
            } catch (error) {
                game.showNotification(error.message);
            } finally { pending.delete(action.id); }
        }
    };
});
