// Composition root for world scenery features; Renderer remains content-agnostic.
define(function () {
    return {
        attach(renderer) { renderer.registerExtension('picnic-renderer-worker.js'); },
        update(renderer, config) { renderer.setExtensionData('picnic', config?.picnic || config?.previewPicnic || null); }
    };
});
