// Composition root for world scenery features; Renderer remains content-agnostic.
define(function () {
    let actions = [];
    const pending = new Set();
    const nearby = (action, x, y, radius) => Math.abs(action.gridX - x) <= radius && Math.abs(action.gridY - y) <= radius;
    return {
        attach(renderer) {
            renderer.registerExtension('picnic-renderer-worker.js');
            renderer.registerExtension('lantern-road-renderer-worker.js');
        },
        update(renderer, config) {
            renderer.setExtensionData('picnic', config?.picnic || config?.previewPicnic || null);
            renderer.setExtensionData('lantern-road', config?.storyScenery || null);
            actions = (config?.storyScenery || []).filter(o => o.id && ['marker', 'passage'].includes(o.kind)).map(o => ({
                id: 'story-' + o.id.replace(/[^a-z0-9_-]/gi, '-'), storyId: o.id,
                storyType: o.kind === 'passage' ? 'travel' : 'inspect', label: o.label,
                gridX: o.x, gridY: o.y, x: o.x * 16, y: o.y * 16
            }));
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
                const response = await fetch('/session/' + game.sessionId + '/story/' + action.storyType + '/' + encodeURIComponent(action.storyId), {method: 'POST'});
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Please try again.');
                game.destroyBubble(action.id);
                if (action.storyType === 'inspect') {
                    actions = actions.filter(item => item !== action);
                    game.showNewQuestPopup({heading: 'Discovery', name: action.label, startText: result.text});
                }
                return result;
            } catch (error) {
                game.showNotification(error.message);
            } finally { pending.delete(action.id); }
        }
    };
});
