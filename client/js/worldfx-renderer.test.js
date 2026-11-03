const create = require('./world-fx-renderer-worker');
function setup() {
    const ctx = {canvas: {width: 480, height: 224}, drawImage: jest.fn(), fillRect: jest.fn()};
    for (const method of ['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'ellipse', 'stroke']) ctx[method] = jest.fn();
    const state = {flags: {heat: true}, scenery: {}, time: 500, particles: []};
    const view = {cameraX: 32, cameraY: 48, scale: 3, sources: {background: {}}};
    return {fx: create(), ctx, state, view};
}
test('particles remain anchored to map pixels as the camera and scale change', () => {
    const {fx, ctx, state, view} = setup();
    state.particles = [{x: 48, y: 64, size: 2, alpha: 0.8, color: '#aabbcc'}];
    fx.draw(ctx, state, view); expect(ctx.fillRect).toHaveBeenLastCalledWith(48, 48, 6, 6);
    view.cameraX += 8; fx.draw(ctx, state, view); expect(ctx.fillRect).toHaveBeenLastCalledWith(24, 48, 6, 6);
});

test('custom bursts reach the shared renderer with camera-relative coordinates and fade', () => {
    const {fx,ctx,state,view}=setup();
    const design=require('./worldfxconfig').custom({shape:'star',colors:['#123456'],pulse:0,glow:0,spin:0});
    state.particles=[{x:48,y:64,size:2,alpha:0.5,color:'#123456',design,elapsed:0.3,seed:1}];
    ctx.translate=jest.fn();ctx.rotate=jest.fn();
    fx.draw(ctx,state,view);
    expect(ctx.translate).toHaveBeenCalledWith(48,48);
    expect(ctx.fillStyle).toBe('rgba(18,52,86,0.8)');
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.globalAlpha).toBe(1);
});
test('heat follows existing fire lights while non-fire and offscreen lights are ignored', () => {
    const {fx, ctx, state, view} = setup();
    view.fireLights = [{x: 80, y: 100, animation: 'fire'}, {x: 9000, y: 9000, animation: 'fire'}, {x: 70, y: 80}];
    fx.ground(ctx, state, view); expect(ctx.drawImage).toHaveBeenCalledTimes(14);
    ctx.drawImage.mockClear(); state.flags.heat = false; fx.ground(ctx, state, view);
    expect(ctx.drawImage).not.toHaveBeenCalled();
});
test('authored fire regions replace automatic detection, and an empty list opts out', () => {
    const {fx, ctx, state, view} = setup();
    view.fireLights = [{x: 80, y: 100, animation: 'fire'}]; state.scenery.fires = [];
    fx.ground(ctx, state, view); expect(ctx.drawImage).not.toHaveBeenCalled();
    state.scenery.fires = [{x: 50, y: 80, width: 20, height: 5}];
    fx.ground(ctx, state, view); expect(ctx.drawImage).toHaveBeenCalledTimes(3);
    expect(ctx.drawImage.mock.calls.at(-1)[4]).toBe(1);
});
test('heat draw work is bounded even with many overlapping fire lights', () => {
    const {fx, ctx, state, view} = setup();
    view.fireLights = Array.from({length: 500}, () => ({x: 80, y: 100, animation: 'fire'}));
    fx.ground(ctx, state, view); expect(ctx.drawImage).toHaveBeenCalledTimes(32 * 14);
});

test('level-up ignition and staggered shockwaves use finite camera-relative geometry', () => {
    const {fx, ctx, state, view} = setup();
    state.rings = [{owner: 'levelup', x: 48, y: 64, coreX: 40, coreY: 56, radius: 38, startedAt: 400}];
    state.particles = [{shape: 'star', x: 45, y: 50, size: 2, alpha: 0.8, color: '#ffe078'},
        {shape: 'spark', x: 48, y: 52, size: 1, alpha: 0.5, color: '#9cefe6', trailX: 2, trailY: -3}];
    fx.draw(ctx, state, view);
    expect(ctx.ellipse).toHaveBeenCalledTimes(1);
    expect(ctx.fillRect).toHaveBeenCalled(); expect(ctx.lineTo).toHaveBeenCalledTimes(9);
    for (const method of ['fillRect', 'ellipse', 'moveTo', 'lineTo']) {
        expect(ctx[method].mock.calls.flat().every(value => Number.isFinite(value))).toBe(true);
    }
    ctx.ellipse.mockClear(); ctx.fillRect.mockClear();
    state.time = 1000; state.particles = []; fx.draw(ctx, state, view);
    expect(ctx.ellipse).toHaveBeenCalledTimes(2); expect(ctx.fillRect).not.toHaveBeenCalled();
});

test('avatar trails draw on the ground pass only, before entities and overhead tiles',()=>{
    const {fx,ctx,state,view}=setup();state.flags.heat=false;
    state.particles=[{x:48,y:64,size:1,alpha:1,color:'#ffe7af',layer:'ground'}, {x:64,y:80,size:1,alpha:1,color:'#fff',layer:'foreground'}];
    fx.ground(ctx,state,view);expect(ctx.fillRect.mock.calls).toEqual([[48,48,3,3]]);
    ctx.fillRect.mockClear();fx.draw(ctx,state,view);expect(ctx.fillRect.mock.calls).toEqual([[96,96,3,3]]);
});

test('spark light brightens cores, masks overhead tiles, and reuses its canvas',()=>{
    const {ctx,state,view}=setup(), operations=[];
    const light={save(){},restore(){},clearRect:jest.fn(),
        fillRect(...args){operations.push({kind:'pixel',args,alpha:this.globalAlpha,color:this.fillStyle,blend:this.globalCompositeOperation});},
        drawImage(image){operations.push({kind:'mask',image,blend:this.globalCompositeOperation});}};
    const canvas={width:480,height:224,getContext:()=>light},createCanvas=jest.fn(()=>canvas),fx=create(createCanvas);
    view.sources.overhead={roof:true};view.scale=1;
    state.particles=[{x:48,y:64,size:1,alpha:0.8,color:'#ffe7af',shape:'star',layer:'ground'}];
    fx.lighting(ctx,state,view);
    expect(operations[0]).toMatchObject({args:[12,12,9,9],blend:'screen'});
    expect(operations.filter(row=>row.color==='#ffffff')).toEqual([
        expect.objectContaining({args:[15,16,3,1],alpha:1}),expect.objectContaining({args:[16,15,1,3],alpha:1})]);
    expect(operations.at(-1)).toEqual({kind:'mask',image:view.sources.overhead,blend:'destination-out'});
    expect(ctx.globalCompositeOperation).toBe('screen');expect(ctx.drawImage).toHaveBeenCalledWith(canvas,0,0);
    fx.lighting(ctx,state,view);expect(createCanvas).toHaveBeenCalledTimes(1);expect(light.clearRect).toHaveBeenCalledTimes(2);
    ctx.canvas.width=640;fx.lighting(ctx,state,view);expect(canvas.width).toBe(640);expect(createCanvas).toHaveBeenCalledTimes(1);
    state.particles=[];ctx.drawImage.mockClear();fx.lighting(ctx,state,view);expect(ctx.drawImage).not.toHaveBeenCalled();
});

test('foreground and expired particles do not create ground lighting',()=>{
    const {ctx,state,view}=setup(),createCanvas=jest.fn(),fx=create(createCanvas);
    state.particles=[{layer:'foreground',alpha:1},{layer:'ground',alpha:0}];
    fx.lighting(ctx,state,view);expect(createCanvas).not.toHaveBeenCalled();expect(ctx.drawImage).not.toHaveBeenCalled();
});
