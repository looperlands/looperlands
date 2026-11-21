const {frameLayout, inferOffset} = require('./sprite-ground-anchor');
const template = require('../sprites/clotharmor.json');

function fixture(sourceScale = 1) {
    const sprite = {width: template.width, height: template.height, offsetY: template.offset_y,
        animationData: template.animations, sourceScale};
    const image = {width: 160 * sourceScale, height: 288 * sourceScale};
    image.data = new Uint8ClampedArray(image.width * image.height * 4);
    function pixel(frame, row, x, y, alpha = 255) {
        for (let dy = 0; dy < sourceScale; dy++) {
            for (let dx = 0; dx < sourceScale; dx++) {
                const index = (((row * 32 + y) * sourceScale + dy) * image.width + (frame * 32 + x) * sourceScale + dx) * 4;
                image.data[index] = 255;
                image.data[index + 3] = alpha;
            }
        }
    }
    return {sprite, image, pixel};
}

test.each([1, 2, 3])('full standing art has one native four-pixel correction at source scale %s', scale => {
    const {sprite, image, pixel} = fixture(scale);
    pixel(0, 8, 16, 31);
    expect(inferOffset(image, sprite)).toBe(-4);
});

test('all standing frames share the lowest contact edge, regardless of the displayed pose', () => {
    const {sprite, image, pixel} = fixture();
    pixel(0, 8, 16, 26);
    pixel(1, 8, 16, 30, 1);
    expect(inferOffset(image, sprite)).toBe(-3);
    pixel(1, 8, 16, 31);
    expect(inferOffset(image, sprite)).toBe(-4);
});

test('padded legacy standing art stays put even when attacks and unused cells reach the frame edge', () => {
    const {sprite, image, pixel} = fixture();
    pixel(0, 8, 16, 26);
    pixel(1, 8, 16, 27);
    pixel(2, 6, 16, 31); // A downward attack is not the standing contact point.
    pixel(4, 8, 16, 31); // An undeclared cell is not part of idle_down.
    pixel(0, 5, 16, 31); // Other directions do not define the downward standing baseline.
    expect(inferOffset(image, sprite)).toBe(0);
});

test('empty standing frames and RGB pixels with zero alpha retain legacy placement', () => {
    const {sprite, image, pixel} = fixture();
    pixel(0, 8, 16, 31, 0);
    pixel(0, 0, 16, 31);
    expect(inferOffset(image, sprite)).toBe(0);
});

test.each([
    {animationData: undefined}, {animationData: {}}, {animationData: []},
    {animationData: {idle_down: {row: -1, length: 2}}},
    {animationData: {idle_down: {row: 8, length: 1.5}}},
    {animationData: {idle_down: {row: '8', length: 2}}},
    {animationData: {idle_down: {row: 8, length: 2}, atk_down: {row: 6, length: 0}}},
    {sourceScale: 0}, {sourceScale: 1.5}, {width: 0}, {offsetY: NaN},
])('malformed metadata %j leaves the artwork unchanged', override => {
    const {sprite, image, pixel} = fixture();
    pixel(0, 8, 16, 31);
    expect(inferOffset(image, {...sprite, ...override})).toBe(0);
});

test('missing idle_down, incomplete pixels and mismatched sheet dimensions cannot infer an anchor', () => {
    const {sprite, image, pixel} = fixture();
    pixel(0, 8, 16, 31);
    const animations = {...sprite.animationData};
    delete animations.idle_down;
    expect(inferOffset(image, {...sprite, animationData: animations})).toBe(0);
    expect(inferOffset({...image, data: image.data.slice(4)}, sprite)).toBe(0);
    expect(inferOffset({...image, width: 161}, sprite)).toBe(0);
    expect(inferOffset({...image, height: 287}, sprite)).toBe(0);
    expect(inferOffset(undefined, sprite)).toBe(0);
    expect(frameLayout(image.width, image.height, sprite)).toMatchObject({frameWidth: 32, frameHeight: 32, row: 8, length: 2});
});
