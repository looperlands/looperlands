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

const ambientSounds = [
    {id: 'cauldron', name: 'The bubbling cauldron', preset: 'lava', x: 47, y: 214, radius: 7, volume: .24},
    {id: 'well', name: 'The whispering well', preset: 'water', x: 16, y: 241, radius: 6, volume: .25}
];

module.exports = {decorations, tiles, ambientSounds};
