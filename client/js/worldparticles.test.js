const WorldParticles = require('./worldparticles-worker');

test('custom drift is deterministic and camera movement preserves world positions', () => {
    const design = require('./worldfxconfig').custom({velocityX: 10, velocityY: -5, sway: 0});
    const positions = (time, x = 0) => WorldParticles.positions('custom', 12, time, {x, y: 0, scale: 2}, 960, 448, design);
    const start = positions(0).find(point => point.index === 0 && point.x > 40 && point.x < 900 && point.y > 30);
    const next = positions(1).find(point => point.index === 0 && Math.abs(point.x - start.x - 20) < 0.1);
    expect(next.y - start.y).toBeCloseTo(-10);
    expect(positions(1, 8)).toContainEqual({...next, x: next.x - 16});
    expect(positions(1)).toEqual(positions(1));
});

test.each(['pixel', 'spark', 'star', 'soft'])('custom %s draws its palette, opacity and bounded geometry', shape => {
    const design = require('./worldfxconfig').custom({shape, colors: ['#123456'], opacity: 0.5, pulse: 0, glow: 4, spin: 1});
    const colors = [], rects = [];
    const context = {save: jest.fn(), restore: jest.fn(), translate: jest.fn(), rotate: jest.fn(),
        createRadialGradient: () => ({addColorStop: (_, color) => colors.push(color)}),
        fillRect(...values) {rects.push(values);if (typeof this.fillStyle === 'string') colors.push(this.fillStyle);}};
    WorldParticles.draw(context, {x: 20,y: 30,scale: 2,index: 0,seed: 0.5}, 'custom', 1, 1, design);
    expect(colors).toContain('rgba(18,52,86,0.5)');
    expect(rects.flat().every(Number.isFinite)).toBe(true);
    expect(context.save).toHaveBeenCalledTimes(1);expect(context.restore).toHaveBeenCalledTimes(1);
});

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
