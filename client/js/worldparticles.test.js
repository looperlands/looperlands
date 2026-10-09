const WorldParticles = require('./worldparticles-worker');

function draw(type, daylight) {
    const pixels = [];
    const context = {
        globalCompositeOperation: 'source-over', save() {}, restore() {}, translate() {}, rotate() {},
        createRadialGradient: () => ({addColorStop() {}}),
        fillRect(...rect) {
            if (typeof this.fillStyle === 'string') {
                pixels.push({rect, color: this.fillStyle.match(/[\d.]+/g).map(Number), blend: this.globalCompositeOperation});
            }
        },
    };
    WorldParticles.draw(context, {x: 20, y: 20, scale: 2, seed: 0.5}, type, 10, daylight);
    return pixels;
}

test.each(['leaves', 'dust', 'spray', 'pollen', 'sand', 'ash'])(
    '%s gets a darker underside and a stronger core in daylight', type => {
        const day = draw(type, 1);
        const dusk = draw(type, 0.5);
        const night = draw(type, 0);
        const brightness = pixel => pixel.color.slice(0, 3).reduce((sum, value) => sum + value, 0);
        expect(day.length).toBeGreaterThan(night.length);
        expect(brightness(day[0])).toBeLessThan(brightness(day.at(-1)) / 2);
        expect(day.at(-1).color[3]).toBeGreaterThan(dusk.at(-1).color[3]);
        expect(dusk.at(-1).color[3]).toBeGreaterThan(night.at(-1).color[3]);
        expect(day.at(-1).color[3]).toBeGreaterThan(0.5);
    });

test('ember cores use normal compositing and stay strong at noon', () => {
    const noon = draw('embers', 1);
    const night = draw('embers', 0);
    expect(noon.at(-1).blend).toBe('source-over');
    expect(night.at(-1).blend).toBe('source-over');
    expect(noon.at(-1).color[3]).toBeGreaterThan(0.5);
    expect(noon.at(-1).color[3]).toBeGreaterThan(night.at(-1).color[3]);
});

test('fireflies retain their night-only additive glow', () => {
    expect(draw('fireflies', 1)).toHaveLength(0);
    expect(draw('fireflies', 0).at(-1).blend).toBe('lighter');
});
