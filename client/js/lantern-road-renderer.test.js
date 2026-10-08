const scenery = require('./lantern-road-renderer-worker');
const picnic = require('./picnic-renderer-worker');
function context() {return {canvas: {width: 960, height: 448}, fillRect: jest.fn(), createRadialGradient: () => ({addColorStop() {}})};}
test('personal road markers and repaired lanterns share the exact terrain camera', () => {
    const ctx = context();
    scenery.draw(ctx, [{kind: 'marker', x: 42, y: 216}, {kind: 'memorial', x: 43, y: 216}], {cameraX: 640.25, cameraY: 3360, scale: 2});
    expect(ctx.fillRect.mock.calls[0]).toEqual([(42*16-640.25+4)*2, (216*16-3360+11)*2, 16, 4]);
    expect(ctx.fillRect.mock.calls[2]).toEqual([(43*16-640.25+3)*2, (216*16-3360+3)*2, 20, 24]);
    ctx.fillRect.mockClear();
    scenery.draw(ctx, [{kind: 'lantern', x: 1, y: 1}], {cameraX: 640, cameraY: 3360, scale: 2});
    expect(ctx.fillRect).not.toHaveBeenCalled();
});
test('the larger finale table contains contributions and optional remembered places', () => {
    const ctx = context(), view = {cameraX: 600, cameraY: 7100, scale: 2};
    picnic.draw(ctx, {phase: 'celebrating', center: {x: 40, y: 450}, longTable: true, golden: true, keepsake: true, watchRelief: true}, view);
    const calls = ctx.fillRect.mock.calls;
    expect(calls.filter(([, , w, h]) => w === 80 && h === 48)).toHaveLength(3);
    expect(calls).toContainEqual([(40*16-600+19)*2, (450*16-7100-3)*2, 8, 18]);
    expect(picnic.layer).toBe('ground');
    expect(scenery.layer).toBe('ground');
});
