const Aura=require('./invincibility-aura-worker');
test('near and far halves straddle the actor depth without a solid ground layer',()=>{
    const entries=Aura.entries([{x:80,y:96,time:600}],{cameraX:64,cameraY:64,scale:1});
    expect(entries.map(e=>e.y)).toEqual([95.9,96.1]);
    for(const entry of entries){
        const ctx={save:jest.fn(),restore:jest.fn(),fillRect:jest.fn()};entry.draw(ctx);
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(50);
        expect(ctx.fillRect.mock.calls.every(([x,y,w,h])=>x>=-3&&x<=35&&y>=-10&&y<=39&&w===1&&h===1)).toBe(true);
        expect(ctx.restore).toHaveBeenCalled();
    }
});
