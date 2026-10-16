const renderer=require('./combat-prototype-worker');

function context() {
    let sx=1,sy=1;
    return {rects:[],scale(x,y){sx*=x;sy*=y;},
        fillRect(x,y,w,h){this.rects.push([x*sx,y*sy,w*sx,h*sy]);},
        ellipse:jest.fn(),fill:jest.fn(),strokeRect:jest.fn(),beginPath:jest.fn(),moveTo:jest.fn(),lineTo:jest.fn(),stroke:jest.fn(),
        strokeText:jest.fn(),fillText:jest.fn()};
}

test('ground warnings use native world pixels and the current camera position',()=>{
    const ctx=context();renderer.ground(ctx,{phase:'windup',mobX:160,mobY:304,until:1850,now:1000,lane:[{x:10,y:20}]},{cameraX:80,cameraY:160,scale:1,displayScale:3});
    expect(ctx.rects).toEqual([[81,161,14,14]]);
});

test('foreground health and labels use display scale so they stay attached to the mob',()=>{
    const ctx=context();renderer.draw(ctx,{mobX:160,mobY:320,mob:{hp:80,maxHp:160},phase:'recovery'},
        {cameraX:80,cameraY:160,scale:3});
    expect(ctx.rects[0]).toEqual([213,405,102,9]);
    expect(ctx.rects[1]).toEqual([213,405,51,9]);
    expect(ctx.fillText).toHaveBeenCalledWith('OPEN',88,133);
});


test('charge pulse grows before impact and the kill-streak timer stays below the avatar',()=>{
    const ctx=context();
    renderer.ground(ctx,{phase:'windup',mobX:160,mobY:320,now:1800,until:1850}, {cameraX:80,cameraY:160});
    expect(ctx.ellipse).toHaveBeenCalledWith(88,174,expect.any(Number),expect.any(Number),0,0,Math.PI*2);
    renderer.draw(ctx,{phase:'windup',mobX:160,mobY:320,mob:{hp:160,maxHp:160},now:1800,until:1850,
        playerX:176,playerY:320,streak:2,streakUntil:7800},{cameraX:80,cameraY:160,scale:1});
    expect(ctx.fillText).toHaveBeenCalledWith('CHARGING',88,133);
    expect(ctx.fillText).toHaveBeenCalledWith('2 KILLS · HASTE  6.0s',104,184);
});
