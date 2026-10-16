const {HealthTrail,Bars}=require('./mobhealthbar-worker');
test('HP changes immediately while damage trail holds 180ms then settles over 280ms',()=>{
    const state=new HealthTrail();state.update(100,100,0,false);
    expect(state.update(60,100,10,false)).toEqual({ratio:.6,trail:1});
    expect(state.update(60,100,189,false).trail).toBe(1);
    expect(state.update(60,100,330,false).trail).toBeCloseTo(.65);
    expect(state.update(60,100,470,false).trail).toBeCloseTo(.6);
});
test('burst damage preserves the trail; healing, max HP changes and reduced motion cancel it',()=>{
    const state=new HealthTrail();state.update(100,100,0,false);state.update(80,100,10,false);
    expect(state.update(50,100,100,false).trail).toBe(1);
    expect(state.update(70,100,110,false).trail).toBe(.7);
    state.update(40,100,120,false);expect(state.update(40,200,130,false).trail).toBe(.2);
    state.update(20,200,140,false);expect(state.update(20,200,150,true).trail).toBe(.1);
});
test('bars clamp ratios, follow camera coordinates, and release despawned state',()=>{
    const bars=new Bars(),ctx={fillRect:jest.fn()};
    bars.draw(ctx,[{id:1,x:20.2,y:30.2,hp:120,maxHp:100}],{cameraX:10,cameraY:20,scale:3},0,false);
    expect(ctx.fillRect).toHaveBeenCalledWith(-15,27,90,15);
    expect(bars.states.size).toBe(1);bars.draw(ctx,[],{},100,false);expect(bars.states.size).toBe(0);
});
