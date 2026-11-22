(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.RendererExtensions = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const extensions = new Map();
    return {
        register(id, extension) {
            if (!/^[a-z][a-z0-9-]*$/.test(id) || !['background', 'ground', 'entities', 'lighting', 'foreground'].includes(extension?.layer) ||
                typeof (extension.layer === 'entities' ? extension.entries : extension.draw) !== 'function') throw new Error('Invalid render extension');
            extensions.set(id, extension);
        },
        ready(data = {}, view) {
            let ready = true;
            for (const [id, extension] of extensions) {
                if (!extension.ready || data[id] == null) continue;
                try {if (!extension.ready(data[id], view)) ready = false;}
                catch (error) {extensions.delete(id); console.error('Disabled render extension ' + id + ': ' + error.message);}
            }
            return ready;
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
        // Delay allocating a native emission surface until a visible extension
        // actually requests one. Faulty effects cannot take down the renderer.
        backgroundEmission(data = {}, view) {
            const painters = [];
            if (!view) return painters;
            for (const [id, extension] of extensions) {
                if (typeof extension.backgroundEmission !== 'function' || data[id] == null) continue;
                try {
                    const painter = extension.backgroundEmission(data[id], view);
                    if (typeof painter !== 'function') continue;
                    painters.push(context => {
                        if (!extensions.has(id)) return;
                        context.save();
                        try {painter(context);}
                        catch (error) {
                            extensions.delete(id);
                            console.error('Disabled render extension ' + id + ': ' + error.message);
                        } finally {context.restore();}
                    });
                } catch (error) {
                    extensions.delete(id);
                    console.error('Disabled render extension ' + id + ': ' + error.message);
                }
            }
            return painters;
        },
        terrainIllumination(data = {}, view) {
            const fields = [];
            if (!view) return fields;
            for (const [id, extension] of extensions) {
                if (typeof extension.terrainIllumination !== 'function' || data[id] == null) continue;
                try {fields.push(...extension.terrainIllumination(data[id], view).slice(0, 4 - fields.length));}
                catch (error) {extensions.delete(id); console.error('Disabled render extension ' + id + ': ' + error.message);}
                if (fields.length >= 4) break;
            }
            return fields;
        },
        tileAppearance(data = {}) {
            const tiles = [];
            for (const [id, extension] of extensions) {
                if (!extension.tileAppearance || data[id] == null) continue;
                try {tiles.push(...extension.tileAppearance(data[id]).slice(0, 512 - tiles.length));}
                catch (error) {extensions.delete(id); console.error('Disabled render extension ' + id + ': ' + error.message);}
                if (tiles.length >= 512) break;
            }
            return tiles;
        },
        shadowBodies(data = {}, view) {
            const bodies = [];
            for (const [id, extension] of extensions) {
                if (!extension.shadowBodies || data[id] == null) continue;
                try {bodies.push(...extension.shadowBodies(data[id], view).slice(0, 512 - bodies.length));}
                catch (error) {extensions.delete(id); console.error('Disabled render extension ' + id + ': ' + error.message);}
                if (bodies.length >= 512) break;
            }
            return bodies;
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
                    const projection = (layer === 'ground' || layer === 'lighting') && !extension.subpixel ? {...view,
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
