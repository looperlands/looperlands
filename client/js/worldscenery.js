// Composition root for world scenery features; Renderer remains content-agnostic.
define(function () {
    return {
        attach(renderer) {
            renderer.registerExtension('picnic-renderer-worker.js');
            renderer.registerExtension('lantern-road-renderer-worker.js');
        },
        update(renderer, config) {
            renderer.setExtensionData('picnic', config?.picnic || config?.previewPicnic || null);
            renderer.setExtensionData('lantern-road', config?.storyScenery || null);
        }
    };
});
