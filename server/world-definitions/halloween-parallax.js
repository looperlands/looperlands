const {event} = require('./halloween-content');

// Seasonal layers follow scene identities; the map remains the owner of bounds.
function createParallax(scenes = []) {
    return {scenes: scenes.flatMap(({id, x, y, w, h}) => {
        const authored = event.parallax.find(row => String(row.sceneId) === String(id));
        return authored ? [{id, x, y, w, h, layers: structuredClone(authored.layers)}] : [];
    })};
}
module.exports = {createParallax};
