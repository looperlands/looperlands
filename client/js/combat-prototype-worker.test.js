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
    expect(ctx.fillText.mock.calls.flat()).not.toContain('OPEN');
});


test('charge pulse remains, without a separate kills or haste display',()=>{
    const ctx=context();
    renderer.ground(ctx,{phase:'windup',mobX:160,mobY:320,now:1800,until:1850}, {cameraX:80,cameraY:160});
    expect(ctx.ellipse).toHaveBeenCalledWith(88,174,expect.any(Number),expect.any(Number),0,0,Math.PI*2);
    renderer.draw(ctx,{phase:'windup',mobX:160,mobY:320,mob:{hp:160,maxHp:160},now:1800,until:1850,
        playerX:176,playerY:320,streak:2,streakUntil:7800},{cameraX:80,cameraY:160,scale:1});
    expect(ctx.fillText.mock.calls.map(call=>call[0])).toEqual(['LUNGER']);
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
    expect(ctx.fillText.mock.calls.flat()).not.toContain('OPEN');
});


test('Slam warns exactly the surrounding square without any charge-status text',()=>{
    const ctx=context();const lane=[];
    for(let y=19;y<=21;y++)for(let x=9;x<=11;x++)lane.push({x,y});
    const state={pattern:'slam',phase:'windup',mobX:160,mobY:320,mob:{id:2},ordinary:true,windup:1000,until:2000,now:1500,lane};
    renderer.ground(ctx,state,{cameraX:80,cameraY:160});
    expect(ctx.rects.filter(r=>r[2]===14&&r[3]===14)).toHaveLength(9);
    expect(ctx.rects).toContainEqual([65,145,14,14]);
    renderer.draw(ctx,state,{cameraX:80,cameraY:160,scale:1});
    expect(ctx.fillText).not.toHaveBeenCalled();
});
test.each([false,true])('Slam impact has a short ground burst and honors reduced motion=%s',reducedMotion=>{
    const ctx=context();const state={pattern:'slam',phase:'impact',mobX:160,mobY:320,impactAt:1000,now:1100,reducedMotion,lane:[]};
    renderer.ground(ctx,state,{cameraX:80,cameraY:160});
    expect(ctx.ellipse).toHaveBeenCalledWith(88,174,reducedMotion?12:16,reducedMotion?5:7,0,0,Math.PI*2);
    expect(ctx.rects).toHaveLength(reducedMotion?0:4);
    ctx.ellipse.mockClear();state.now=1400;renderer.ground(ctx,state,{cameraX:80,cameraY:160});
    expect(ctx.ellipse).not.toHaveBeenCalled();
});

test.each(['lunge','slam'])('%s warnings retain tile coverage using short corners without center crosses',pattern=>{
    const ctx=context();
    renderer.ground(ctx,{pattern,phase:'windup',mobX:160,mobY:320,now:1000,until:2000,windup:1000,lane:[{x:10,y:20}]},
        {cameraX:80,cameraY:160,scale:1});
    expect(ctx.rects).toEqual([[81,161,14,14]]);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
    const starts=ctx.moveTo.mock.calls,ends=ctx.lineTo.mock.calls;
    expect(starts).toHaveLength(4);expect(ends).toHaveLength(8);
    for(let i=0;i<4;i++){
        const a=starts[i],b=ends[i*2],c=ends[i*2+1];
        expect(a[0]===b[0]||a[1]===b[1]).toBe(true);
        expect(b[0]===c[0]||b[1]===c[1]).toBe(true);
        expect(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])).toBe(3);
        expect(Math.abs(b[0]-c[0])+Math.abs(b[1]-c[1])).toBe(3);
    }
});


test.each(['windup','lunge','impact','recovery','round'])('ordinary enemies have no phase text during %s',phase=>{
    const ctx=context();renderer.draw(ctx,{mobX:160,mobY:320,mob:{id:2},ordinary:true,phase,now:1000,until:1850,event:{label:'Reset'}},
        {cameraX:80,cameraY:160,scale:1});
    expect(ctx.strokeText).not.toHaveBeenCalled();expect(ctx.fillText).not.toHaveBeenCalled();
});
