// Seasonal dressing is a runtime overlay. Tile guards refer to the current
// export so a later map edit cannot accidentally recolor a different object.
const pumpkin = (x, y) => ({image: '/img/1/item-m88npumpkin.png', x, y});
const decorations = [[34, 210], [39, 211], [43, 213], [48, 215], [41, 224], [49, 224],
    [56, 223], [54, 220], [36, 214], [31, 215], [27, 212], [35, 229], [34, 233],
    [25, 238], [18, 239], [13, 239]].map(([x, y]) => pumpkin(x, y));
decorations.push({image: '/img/1/item-m88ncauldron.png', x: 47, y: 214});

function recolor(x, y, first, width, height, colorDifference) {
    return Array.from({length: width * height}, (_, i) => ({x: x + i % width, y: y + Math.floor(i / width),
        from: first + i % width + Math.floor(i / width) * 20, colorShift: {colorDifference, progress: 1}}));
}
const tiles = [
    ...recolor(33, 202, 213, 4, 4, {r: 65, g: -52, b: -28}),
    ...recolor(51, 208, 213, 4, 4, {r: 65, g: -52, b: -28}),
    ...recolor(33, 216, 44, 8, 4, {r: 36, g: -24, b: 22})
];

const ghostImage = '/img/parallax/halloween-drifting-ghost.png';
const parallax = {scenes: [{id: 624, x: 10, y: 198, w: 62, h: 47, layers: [
    {image: '/img/parallax/mist.png', plane: 'ground', width: 512, height: 384,
        factorX: .98, factorY: .99, opacity: .13, driftX: 2, driftY: -.3, activeSceneOnly: true},
    {image: ghostImage, plane: 'foreground', width: 72, height: 72, spacingX: 440, spacingY: 350,
        factorX: 1.04, factorY: 1.02, opacity: .35, driftX: -5, driftY: -.6,
        swayY: 5, swayPeriod: 9, offsetX: 96, offsetY: 40, activeSceneOnly: true},
    {image: ghostImage, plane: 'foreground', width: 48, height: 48, spacingX: 610, spacingY: 470,
        factorX: 1.015, factorY: 1.01, opacity: .22, driftX: 2.8, driftY: -.3,
        swayY: 3, swayPeriod: 13, offsetX: 300, offsetY: 190, activeSceneOnly: true}
]}]};

const ambientSounds = [
    {id: 'cauldron', name: 'The bubbling cauldron', preset: 'lava', x: 47, y: 214, radius: 7, volume: .24},
    {id: 'well', name: 'The whispering well', preset: 'water', x: 16, y: 241, radius: 6, volume: .25}
];

module.exports = {decorations, tiles, parallax, ambientSounds};
