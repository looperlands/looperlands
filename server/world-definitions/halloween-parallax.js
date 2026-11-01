// Halloween chooses the atmosphere; scene geometry remains owned by the map.
const regions = {
    624: {spacing: 1, opacity: 1},       // Town
    627: {spacing: 1.2, opacity: .85},   // Beach
    628: {spacing: 1, opacity: .9},      // Forest
    629: {spacing: .8, opacity: 1},     // Graveyard
    630: {spacing: 1.4, opacity: .7},    // Desert
    631: {spacing: 1.5, opacity: .65},  // Lavaland
    633: {spacing: 1.15, opacity: .85}  // Party Beach
};
const ghostLayers = [
    {width: 88, height: 88, spacingX: 240, spacingY: 192, opacity: .38,
        factorX: 1.035, factorY: 1.02, driftX: -6, driftY: -.5, swayY: 5, swayPeriod: 9},
    {width: 56, height: 56, spacingX: 352, spacingY: 272, opacity: .28,
        factorX: 1.015, factorY: 1.01, driftX: 3, driftY: -.3, swayY: 3, swayPeriod: 13},
    {width: 112, height: 112, spacingX: 560, spacingY: 420, opacity: .16,
        factorX: 1.065, factorY: 1.04, driftX: -2, driftY: .4, swayY: 7, swayPeriod: 17}
];

function createParallax(scenes = []) {
    return {scenes: scenes.filter(scene => regions[scene.id]).map(({id, x, y, w, h}) => {
        const profile = regions[id];
        const layers = ghostLayers.map((layer, index) => ({...layer,
            image: '/img/parallax/halloween-drifting-ghost.png', plane: 'foreground', activeSceneOnly: true,
            spacingX: Math.round(layer.spacingX * profile.spacing), spacingY: Math.round(layer.spacingY * profile.spacing),
            opacity: layer.opacity * profile.opacity, nightOpacity: .9, nightBrightness: .95,
            offsetX: (id * 73 + index * 137) % 520, offsetY: (id * 41 + index * 97) % 420,
            orbitRadius: 12, orbitPeriod: 23, orbitVariation: .6, scaleVariation: .18
        }));
        if (id === 624) layers.unshift({image: '/img/parallax/mist.png', plane: 'ground', width: 512, height: 384,
            factorX: .98, factorY: .99, opacity: .13, driftX: 2, driftY: -.3, activeSceneOnly: true});
        return {id, x, y, w, h, layers};
    })};
}

module.exports = {createParallax};
