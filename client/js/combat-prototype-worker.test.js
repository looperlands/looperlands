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
    const ctx=context();renderer.draw(ctx,{mobX:160,mobY:320,mob:{hp:80,maxHp:160},showHealthBar:true,phase:'recovery'},
        {cameraX:80,cameraY:160,scale:3});
    expect(ctx.rects[0]).toEqual([213,402,102,15]);
    expect(ctx.rects[2]).toEqual([216,405,48,9]);
    expect(ctx.fillText).toHaveBeenCalledWith('OPEN',88,133);
});


test('charge pulse remains, without a separate kills or haste display',()=>{
    const ctx=context();
    renderer.ground(ctx,{phase:'windup',mobX:160,mobY:320,now:1800,until:1850}, {cameraX:80,cameraY:160});
    expect(ctx.ellipse).toHaveBeenCalledWith(88,174,expect.any(Number),expect.any(Number),0,0,Math.PI*2);
    renderer.draw(ctx,{phase:'windup',mobX:160,mobY:320,mob:{hp:160,maxHp:160},now:1800,until:1850,
        playerX:176,playerY:320,streak:2,streakUntil:7800},{cameraX:80,cameraY:160,scale:1});
    expect(ctx.fillText).toHaveBeenCalledWith('CHARGING',88,133);
    expect(ctx.fillText.mock.calls.map(call=>call[0])).toEqual(['LUNGER','CHARGING']);
});


test('trainer name and actual level stay visible while its attack status changes',()=>{
    for (const phase of ['chase','windup','lunge','recovery','stagger']) {
        const ctx=context();
        renderer.draw(ctx,{mobX:160,mobY:320,mob:{hp:160,maxHp:160,level:12},phase,now:1000,until:1850},
            {cameraX:80,cameraY:160,scale:3});
        expect(ctx.fillText).toHaveBeenCalledWith('Lv. 12 LUNGER',88,125);
    }
});

test('unselected trainer keeps its name and attack warning but hides its health bar',()=>{
    const ctx=context();renderer.draw(ctx,{mobX:160,mobY:320,mob:{hp:80,maxHp:160},showHealthBar:false,phase:'recovery'},{cameraX:80,cameraY:160,scale:3});
    expect(ctx.rects).toEqual([]);
    expect(ctx.fillText).toHaveBeenCalledWith('OPEN',88,133);
});
