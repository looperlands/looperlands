const path = require('path');

// Both local entry points serve the same editor shell and its shared scripts.
function install(app, root) {
    const assets = {
        '/local/dialogue-format.js': 'shared/js/dialogueformat.js',
        '/local/dialogue-text.js': 'client/js/dialoguetext.js',
        '/local/dialogue-presentation.css': 'client/css/dialogue.css',
        '/local/mapmaker-path.js': 'shared/js/mapmakerpath.js',
        '/local/authoring-contract.js': 'shared/js/mapmakerauthoring.js',
        '/local/lighting-contract.js': 'shared/js/mapmakerlighting.js',
        '/local/vendor/lighting-renderer.js': 'client/js/renderer-webworker.js',
        '/local/item-effects.js': 'shared/js/itemeffects.js',
        '/local/interaction-templates.js': 'shared/js/interactiontemplates.js',
        '/local/vendor/worldtime.js': 'client/js/worldtime-worker.js',
        '/local/vendor/particles.js': 'client/js/worldparticles-worker.js',
        '/local/vendor/worldfxconfig.js': 'client/js/worldfxconfig.js'
    };
    for (const [url, source] of Object.entries(assets)) {
        app.get(url, (req, res) => res.sendFile(path.resolve(root, source)));
    }
}

module.exports = {install};
