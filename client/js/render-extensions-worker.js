(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.RendererExtensions = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const extensions = new Map();
    return {
        register(id, extension) {
            if (!/^[a-z][a-z0-9-]*$/.test(id) || !['ground', 'foreground'].includes(extension?.layer) ||
                typeof extension.draw !== 'function') throw new Error('Invalid render extension');
            extensions.set(id, extension);
        },
        draw(layer, context, data = {}, view) {
            if (!view) return;
            for (const [id, extension] of extensions) {
                if (extension.layer !== layer || data[id] == null) continue;
                context.save();
                try { extension.draw(context, data[id], view); }
                catch (error) {
                    // A broken feature cannot stop the game or flood every frame.
                    extensions.delete(id);
                    console.error('Disabled render extension ' + id + ': ' + error.message);
                } finally { context.restore(); }
            }
        }
    };
});
