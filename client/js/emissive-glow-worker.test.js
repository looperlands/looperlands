const {Pass} = require('./emissive-glow-worker');

function setup() {
    const canvases = [], draws = [], gradients = [];
    function createCanvas(width, height) {
        const canvas = {width, height}, stack = [];
        const ctx = {canvas, globalAlpha: 1, globalCompositeOperation: 'source-over', imageSmoothingEnabled: false};
        ctx.save = () => stack.push([ctx.globalAlpha, ctx.globalCompositeOperation, ctx.imageSmoothingEnabled]);
        ctx.restore = () => [ctx.globalAlpha, ctx.globalCompositeOperation, ctx.imageSmoothingEnabled] = stack.pop();
        ctx.clearRect = jest.fn(); ctx.scale = jest.fn(); ctx.fillRect = jest.fn();
        ctx.drawImage = jest.fn((...args) => draws.push({ctx, args, alpha: ctx.globalAlpha, operation: ctx.globalCompositeOperation}));
        ctx.createRadialGradient = jest.fn((...args) => {
            const gradient = {args, stops: [], addColorStop(position, color) {this.stops.push([position, color]);}};
            gradients.push(gradient); return gradient;
        });
        canvas.getContext = () => ctx; canvases.push(canvas);
        return canvas;
    }
    const target = createCanvas(480, 224), pass = new Pass(createCanvas);
    return {pass, target, canvases, draws, gradients};
}
const source = {x: 64, y: 64, glowIntensity: .3, glowRadius: 18, color: {r: 255, g: 180, b: 90}};
const view = {cameraX: 0, cameraY: 0, width: 480, height: 224};

test('only explicitly opted-in finite round sources allocate or draw', () => {
    const fixture = setup();
    const sources = [{x: 32, y: 32}, {...source, glowIntensity: 0}, {...source, glowIntensity: NaN},
        {...source, x: Infinity}, {...source, global: true}, {...source, kind: 'shadow'}, {...source, spread: 90}];
    expect(fixture.pass.draw(fixture.target.getContext(), sources, view)).toBe(0);
    expect(fixture.canvases).toHaveLength(1);
    expect(fixture.draws).toHaveLength(0);
    expect(fixture.pass.draw(fixture.target.getContext(), [{...source, intensity: 0, shadow: 0}], view)).toBe(1);
});

test('camera motion and intensity changes reuse a bounded sprite and scratch without mutating cached art', () => {
    const fixture = setup(), mask = jest.fn(ctx => {ctx.globalCompositeOperation = 'destination-out';});
    for (let i = 0; i < 120; i++) {
        fixture.pass.draw(fixture.target.getContext(), [{...source, glowIntensity: .2 + i / 1000}],
            {...view, cameraX: i / 10, mask});
    }
    expect(fixture.canvases).toHaveLength(3); // Destination, cached native sprite, reusable local scratch.
    expect(fixture.gradients).toHaveLength(1);
    expect(mask).toHaveBeenCalledTimes(120);
    expect(fixture.pass.bytes).toBe(36 * 36 * 4);
    const sprite = [...fixture.pass.sprites.values()][0];
    expect(sprite.getContext().drawImage).not.toHaveBeenCalled();
    expect(fixture.target.getContext().globalAlpha).toBe(1);
    expect(fixture.target.getContext().globalCompositeOperation).toBe('source-over');
});

test('native radius, inherited or explicit color and preview resolution have independent semantics', () => {
    const fixture = setup(), ctx = fixture.target.getContext();
    const defaultRadius = {...source}; delete defaultRadius.glowRadius;
    fixture.pass.draw(ctx, [defaultRadius], {...view, pixelScale: .25});
    expect(ctx.drawImage.mock.lastCall.slice(1)).toEqual([0, 0, 32, 32, 60, 60, 8, 8]);
    fixture.pass.draw(ctx, [{...source, glowColor: {r: 8, g: 120, b: 255}, glowRadius: 999}], view);
    expect(ctx.drawImage.mock.lastCall.slice(1)).toEqual([0, 0, 128, 128, 0, 0, 128, 128]);
    expect(fixture.gradients[0].stops[0]).toEqual([0, 'rgba(255,180,90,1)']);
    expect(fixture.gradients[1].stops[0]).toEqual([0, 'rgba(8,120,255,1)']);
    expect(source).toEqual({x: 64, y: 64, glowIntensity: .3, glowRadius: 18, color: {r: 255, g: 180, b: 90}});
});

test('fire carries a broader warm shoulder than steady windows while sprite allocation remains bounded', () => {
    const fixture = setup(), ctx = fixture.target.getContext();
    const window = {...source, glowRadius: 24};
    const fire = {...window, x: 128, animation: 'fire'};
    expect(fixture.pass.draw(ctx, [window, fire], view)).toBe(2);
    expect(fixture.pass.sprites.size).toBe(2);
    expect(fixture.gradients).toHaveLength(2);
    expect(fixture.gradients[0].stops).toContainEqual([.54, 'rgba(255,180,90,0.18)']);
    expect(fixture.gradients[1].stops).toContainEqual([.5, 'rgba(255,180,90,0.34)']);
    for (let i = 0; i < 60; i++) {
        expect(fixture.pass.draw(ctx, [{...fire, glowIntensity: .3 + i / 1000}], view)).toBe(1);
    }
    expect(fixture.gradients).toHaveLength(2);
    expect(fixture.pass.sprites.size).toBe(2);
});

test('source positions align to the same native grid as terrain and masks use world coordinates', () => {
    const fixture = setup(), mask = jest.fn();
    fixture.pass.draw(fixture.target.getContext(), [source], {...view, cameraX: 12.5, cameraY: 2.75, mask});
    expect(mask.mock.calls[0][2]).toEqual({x: 34, y: 43, width: 36, height: 36, worldX: 46, worldY: 46});
    expect(fixture.target.getContext().drawImage.mock.lastCall.slice(5)).toEqual([34, 43, 36, 36]);
});

test('offscreen emitters do not use the sixteen-source budget and cache memory stays bounded', () => {
    const fixture = setup(), ctx = fixture.target.getContext();
    const sources = [...Array.from({length: 20}, () => ({...source, x: -1000})),
        ...Array.from({length: 20}, () => ({...source, glowRadius: 8}))];
    expect(fixture.pass.draw(ctx, sources, view)).toBe(16);
    const old = fixture.canvases[1];
    for (let i = 0; i < 40; i++) {
        fixture.pass.draw(ctx, [{...source, glowRadius: 64, glowColor: {r: i, g: 90, b: 120}}], view);
    }
    expect(fixture.pass.sprites.size).toBe(32);
    expect(fixture.pass.bytes).toBe(2 * 1024 * 1024);
    expect(old.width).toBe(0);
    expect(old.height).toBe(0);
    expect(fixture.pass.draw(ctx, [source], {...view, pixelScale: 0})).toBe(0);
});

test('the native pixel budget admits the demo, bounds large-source fill and still admits later small sources', () => {
    const demo = setup();
    expect(demo.pass.draw(demo.target.getContext(), [18, 18, 18, 24].map(glowRadius => ({...source, glowRadius})), view)).toBe(4);
    const large = setup(), mask = jest.fn();
    expect(large.pass.draw(large.target.getContext(), Array.from({length: 16}, (_, index) =>
        ({...source, glowRadius: 64, glowColor: {r: index, g: 80, b: 120}})), {...view, mask})).toBe(1);
    expect(large.canvases).toHaveLength(3); // Destination, one admitted sprite, one scratch.
    expect(mask).toHaveBeenCalledTimes(1);
    expect(large.pass.sprites.size).toBe(1);
    const mixed = setup();
    expect(mixed.pass.draw(mixed.target.getContext(), [60, 32, 20].map(glowRadius => ({...source, glowRadius})), view)).toBe(2);
    expect(mixed.target.getContext().drawImage.mock.calls.map(call => call[3])).toEqual([120, 40]);
    expect(mixed.canvases.some(canvas => canvas.width === 64)).toBe(false);
});
