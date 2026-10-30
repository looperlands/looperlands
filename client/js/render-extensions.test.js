const createRegistry = require('./render-extensions-worker');
test('ground features stay on the terrain grid while foreground uses the fractional camera', () => {
    const registry = createRegistry();
    const ground = jest.fn(), foreground = jest.fn();
    registry.register('blanket', {layer: 'ground', draw: ground});
    registry.register('weather', {layer: 'foreground', draw: foreground});
    const context = {save: jest.fn(), restore: jest.fn()};
    const view = {cameraX: 100.5, cameraY: 200, scale: 3};
    registry.draw('ground', context, {blanket: {x: 4}, weather: {rain: true}}, view);
    expect(ground).toHaveBeenCalledWith(context, {x: 4}, {...view, cameraX: 100});
    expect(foreground).not.toHaveBeenCalled();
    registry.draw('foreground', context, {weather: {rain: true}}, view);
    expect(foreground).toHaveBeenCalledWith(context, {rain: true}, view);
    registry.draw('ground', context, {}, view);
    expect(ground).toHaveBeenCalledTimes(1);
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.restore).toHaveBeenCalledTimes(2);
});
test('ground scenery can opt into subpixel motion without shifting other ground features', () => {
    const registry = createRegistry(), draw = jest.fn();
    registry.register('drift', {layer: 'ground', subpixel: true, draw});
    const view = {cameraX: 100.25, cameraY: 200.75, scale: 1};
    registry.draw('ground', {save() {}, restore() {}}, {drift: {}}, view);
    expect(draw).toHaveBeenCalledWith(expect.anything(), {}, view);
});
test('a failed extension restores context and leaves other features running', () => {
    const registry = createRegistry(), next = jest.fn();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    registry.register('broken', {layer: 'ground', draw: () => {throw new Error('example');}});
    registry.register('next', {layer: 'ground', draw: next});
    const context = {save: jest.fn(), restore: jest.fn()};
    registry.draw('ground', context, {broken: true, next: true}, {});
    registry.draw('ground', context, {broken: true, next: true}, {});
    expect(next).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(3);
    log.mockRestore();
});
test('unsupported layers and invalid callbacks are rejected', () => {
    const registry = createRegistry();
    expect(() => registry.register('invalid', {layer: 'sky', draw() {}})).toThrow();
    expect(() => registry.register('invalid', {layer: 'ground'})).toThrow();
    registry.draw('ground', {}, {}, null);
});

test('entity scenery is sorted by world depth and drawing failures are isolated', () => {
    const registry = createRegistry(), drawn = [];
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    registry.register('trees', {layer: 'entities', entries: () => [
        {y: 50, draw: () => drawn.push('front')}, {y: 10, draw: () => drawn.push('back')}
    ]});
    registry.register('broken', {layer: 'entities', entries: () => [{y: 20, draw: () => {throw new Error('image');}}]});
    const context = {save: jest.fn(), restore: jest.fn()};
    const entries = registry.sorted({trees: true, broken: true}, {});
    expect(entries.map(entry => entry.y)).toEqual([10, 20, 50]);
    entries.forEach(entry => entry.draw(context));
    expect(drawn).toEqual(['back', 'front']);
    expect(registry.sorted({trees: true, broken: true}, {})).toHaveLength(2);
    expect(context.save).toHaveBeenCalledTimes(3); expect(context.restore).toHaveBeenCalledTimes(3);
    log.mockRestore();
});

test('readiness checks start all active loads and isolate failures', () => {
    const registry = createRegistry(), first=jest.fn(()=>false), second=jest.fn(()=>true);
    registry.register('first',{layer:'background',draw(){},ready:first});
    registry.register('second',{layer:'background',draw(){},ready:second});
    expect(registry.ready({first:{},second:{}},{})).toBe(false);
    expect(second).toHaveBeenCalledTimes(1);
    first.mockReturnValue(true);
    expect(registry.ready({first:{},second:{}},{})).toBe(true);
    expect(registry.ready({},{})).toBe(true);
    first.mockImplementation(()=>{throw new Error('bad image');});
    const log=jest.spyOn(console,'error').mockImplementation(()=>{});
    expect(registry.ready({first:{},second:{}},{})).toBe(true);
    expect(log).toHaveBeenCalledTimes(1);log.mockRestore();
});
