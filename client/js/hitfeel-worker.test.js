const renderer=require('./hitfeel-worker');
function context(){return{save:jest.fn(),restore:jest.fn(),translate:jest.fn(),scale:jest.fn(),drawImage:jest.fn(),globalAlpha:1};}
const draw={sx:0,sy:0,sW:16,sH:16,dx:-8,dy:-12,dW:32,dH:32};
test('squash pivots on the planted feet and normal sprites use their original source rectangle',()=>{
    const ctx=context(),image={};renderer.drawSprite(ctx,image,draw,{squashX:1.16,squashY:.84,shatter:null,flash:false},2);
    expect(ctx.translate.mock.calls[0]).toEqual([16,32]);expect(ctx.scale).toHaveBeenCalledWith(1.16,.84);
    expect(ctx.drawImage).toHaveBeenCalledWith(image,0,0,16,16,-8,-12,32,32);expect(ctx.restore).toHaveBeenCalled();
});
test('shatter draws bounded sprite fragments without affecting the canvas outside the actor',()=>{
    const ctx=context(),image={};renderer.drawSprite(ctx,image,draw,{squashX:1,squashY:1,shatter:.5},2);
    expect(ctx.drawImage).toHaveBeenCalledTimes(16);expect(ctx.globalAlpha).toBe(.5);
    for(const call of ctx.drawImage.mock.calls){expect(call[3]).toBe(4);expect(call[4]).toBe(4);expect(call[7]).toBe(8);expect(call[8]).toBe(8);}
});
test('large sprites cap shatter to 64 fragments and preserve source-to-display scaling',()=>{
    const ctx=context(),large={sx:0,sy:0,sW:256,sH:128,dx:0,dy:0,dW:256,dH:128};
    renderer.drawSprite(ctx,{},large,{squashX:1,squashY:1,shatter:.5,shatterStrength:1},2);
    expect(ctx.drawImage).toHaveBeenCalledTimes(64);
    for(const call of ctx.drawImage.mock.calls){expect(call[3]).toBe(32);expect(call[4]).toBe(16);expect(call[7]).toBe(32);expect(call[8]).toBe(16);}
});
test('flash masks only the sprite and reuses its canvas without reallocating unchanged dimensions',()=>{
    let width=16,height=16;const resize=jest.fn();
    const maskContext={clearRect:jest.fn(),drawImage:jest.fn(),fillRect:jest.fn()};
    const mask={get width(){return width;},set width(value){width=value;resize();},
        get height(){return height;},set height(value){height=value;resize();},getContext:()=>maskContext};
    global.OffscreenCanvas=jest.fn(()=>mask);
    try{
        const ctx=context(),image={},effect={squashX:1,squashY:1,shatter:null,flash:true};
        renderer.drawSprite(ctx,image,draw,effect,2);renderer.drawSprite(ctx,image,draw,effect,2);
        expect(global.OffscreenCanvas).toHaveBeenCalledTimes(1);expect(resize).not.toHaveBeenCalled();
        expect(maskContext.drawImage).toHaveBeenCalledWith(image,0,0,16,16,0,0,16,16);
        expect(maskContext.fillRect).toHaveBeenCalledWith(0,0,16,16);
        expect(maskContext.globalCompositeOperation).toBe('source-over');
        expect(ctx.drawImage).toHaveBeenCalledWith(mask,0,0,16,16,-8,-12,32,32);
        renderer.drawSprite(ctx,image,{...draw,sW:32,sH:24,dW:64,dH:48},effect,2);
        expect(resize).toHaveBeenCalledTimes(2);
    }finally{delete global.OffscreenCanvas;}
});
test('slash arcs follow attack direction in camera coordinates and sparks shrink as they expire',()=>{
    const ctx={...context(),beginPath:jest.fn(),arc:jest.fn(),stroke:jest.fn(),fillRect:jest.fn()};
    const impact={sourceX:20,sourceY:30,x:25,y:32,dirX:0,dirY:1,age:0,slash:true,sparks:12,critical:true};
    const feedback={scale:2,cameraX:10,cameraY:20,hitFeel:[impact]};
    renderer.drawImpacts(ctx,feedback);
    expect(ctx.arc).toHaveBeenCalledWith(20,20,36,Math.PI/2-1,Math.PI/2+.9);
    expect(ctx.fillRect).toHaveBeenCalledTimes(12);
    expect(ctx.fillRect.mock.calls.every(call=>call[2]===4&&call[3]===4)).toBe(true);
    ctx.arc.mockClear();ctx.fillRect.mockClear();
    renderer.drawImpacts(ctx,{...feedback,hitFeel:[{...impact,age:200,critical:false}]});
    expect(ctx.arc).not.toHaveBeenCalled();expect(ctx.fillRect).toHaveBeenCalledTimes(12);
    expect(ctx.fillRect.mock.calls.every(call=>call[2]===2&&call[3]===2)).toBe(true);
    expect(ctx.globalAlpha).toBeCloseTo(1-200/280);
});
test('absent impact data draws nothing',()=>{
    const ctx={...context(),fillRect:jest.fn(),arc:jest.fn()};renderer.drawImpacts(ctx,{scale:2,cameraX:0,cameraY:0});
    expect(ctx.fillRect).not.toHaveBeenCalled();expect(ctx.arc).not.toHaveBeenCalled();expect(ctx.restore).toHaveBeenCalledTimes(1);
});
