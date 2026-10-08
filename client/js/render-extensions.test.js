const createRegistry = require('./render-extensions-worker');
test('outside features draw at their selected layer with independent state and exact frame camera', () => {
    const registry = createRegistry();
    const ground = jest.fn(), foreground = jest.fn();
    registry.register('blanket', {layer: 'ground', draw: ground});
    registry.register('weather', {layer: 'foreground', draw: foreground});
    const context = {save: jest.fn(), restore: jest.fn()};
    const view = {cameraX: 100.5, cameraY: 200, scale: 3};
    registry.draw('ground', context, {blanket: {x: 4}, weather: {rain: true}}, view);
    expect(ground).toHaveBeenCalledWith(context, {x: 4}, view);
    expect(foreground).not.toHaveBeenCalled();
    registry.draw('foreground', context, {weather: {rain: true}}, view);
    expect(foreground).toHaveBeenCalledWith(context, {rain: true}, view);
    registry.draw('ground', context, {}, view);
    expect(ground).toHaveBeenCalledTimes(1);
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.restore).toHaveBeenCalledTimes(2);
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
