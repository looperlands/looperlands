(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.RendererExtensions = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const extensions = new Map();
    return {
        register(id, extension) {
            if (!/^[a-z][a-z0-9-]*$/.test(id) || !['background', 'ground', 'entities', 'foreground'].includes(extension?.layer) ||
                typeof (extension.layer === 'entities' ? extension.entries : extension.draw) !== 'function') throw new Error('Invalid render extension');
            extensions.set(id, extension);
        },
        terrainCutouts(data = {}, view) {
            const cutouts = [];
            for (const [id, extension] of extensions) {
                if (extension.layer !== 'background' || !extension.terrainCutouts || data[id] == null) continue;
                try {cutouts.push(...extension.terrainCutouts(data[id], view).slice(0, 100));}
                catch (error) {extensions.delete(id); console.error('Disabled render extension ' + id + ': ' + error.message);}
            }
            return cutouts;
        },
        sorted(data = {}, view) {
            const entries = [];
            for (const [id, extension] of extensions) {
                if (extension.layer !== 'entities' || data[id] == null) continue;
                try {
                    for (const entry of extension.entries(data[id], view).slice(0, 512)) {
                        if (!Number.isFinite(entry.y) || typeof entry.draw !== 'function') continue;
                        entries.push({y: entry.y, draw(context) {
                            if (!extensions.has(id)) return;
                            context.save();
                            try {entry.draw(context);}
                            catch (error) {extensions.delete(id); console.error('Disabled render extension ' + id + ': ' + error.message);}
                            finally {context.restore();}
                        }});
                    }
                } catch (error) {extensions.delete(id); console.error('Disabled render extension ' + id + ': ' + error.message);}
            }
            return entries.sort((a, b) => a.y - b.y);
        },
        draw(layer, context, data = {}, view) {
            if (!view) return;
            for (const [id, extension] of extensions) {
                if (extension.layer !== layer || data[id] == null) continue;
                context.save();
                try {
                    const projection = layer === 'ground' && !extension.subpixel ? {...view,
                        cameraX: -Math.round(-view.cameraX), cameraY: -Math.round(-view.cameraY)} : view;
                    extension.draw(context, data[id], projection);
                }
                catch (error) {
                    // A broken feature cannot stop the game or flood every frame.
                    extensions.delete(id);
                    console.error('Disabled render extension ' + id + ': ' + error.message);
                } finally { context.restore(); }
            }
        }
    };
});
