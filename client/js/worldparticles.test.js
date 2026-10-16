const WorldParticles = require('./worldparticles-worker');

test('reactive fireflies use world coordinates without mutating procedural positions', () => {
    const point = {x: 40, y: 40, scale: 2, seed: 1};
    const fx = {actor: {x: 22, y: 28, vx: 80, vy: 0}, flags: {fireflies: true, leaves: true}};
    const moved = WorldParticles.react(point, 'fireflies', 1, {cameraX: 10, cameraY: 10}, fx);
    expect(moved.x).toBeGreaterThan(point.x); expect(point.x).toBe(40);
    expect(WorldParticles.react(point, 'fireflies', 1, {cameraX: 10, cameraY: 10}, {...fx, flags: {}})).toBe(point);
});

test('leaf wake reacts only to a moving nearby player and remains camera-continuous', () => {
    const point = {x: 40, y: 40, scale: 2, seed: 1};
    const fx = {actor: {x: 22, y: 28, vx: 80, vy: 0}, flags: {leaves: true}};
    const moved = WorldParticles.react(point, 'leaves', 1, {cameraX: 10, cameraY: 10}, fx);
    const panned = WorldParticles.react({...point, x: 20}, 'leaves', 1, {cameraX: 20, cameraY: 10}, fx);
    expect(moved.x).not.toBe(point.x); expect(moved.x - 20).toBeCloseTo(panned.x);
    expect(WorldParticles.react(point, 'leaves', 1, {cameraX: 10, cameraY: 10}, {...fx, actor: {...fx.actor, vx: 0}})).toEqual(point);
    expect(WorldParticles.react(point, 'leaves', 1, {cameraX: 500, cameraY: 10}, fx)).toBe(point);
});

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
