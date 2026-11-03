const C=require('./placedfxconfig');
const row={id:'fire',name:'Fire',effect:'fire/campfire',x:2,y:3,width:2,height:3,scale:.5,hazard:null};
const hazard={warningMs:1000,activeMs:500,cooldownMs:2000,damage:10,tickMs:250,impactMs:400};
test('every pinned effect is available for decorative and hazardous placement',()=>{
    expect(Object.keys(C.catalog)).toHaveLength(244);
    for(const effect of Object.keys(C.catalog)) {expect(C.validate([{...row,effect}],{width:10,height:10})).toHaveLength(1);expect(C.validate([{...row,effect,hazard:{...hazard,impactMs:0}}])).toHaveLength(1);}
});
test('region is half-open, tile aligned and independent of visual scale',()=>{
    expect(C.contains(row,2,3)).toBe(true);expect(C.contains(row,3,5)).toBe(true);expect(C.contains(row,4,5)).toBe(false);expect(C.contains(row,2,6)).toBe(false);
    expect(C.phase(row,3500)).toEqual({kind:'decoration',effectMs:500});
});
test('effect anticipation, warning, impact, tick and safe cooldown share one clock',()=>{
    const r={...row,hazard};
    expect(C.phase(r,599)).toMatchObject({kind:'warning',effectMs:null,remaining:401});
    expect(C.phase(r,600)).toMatchObject({kind:'warning',effectMs:0});
    expect(C.phase(r,1000)).toMatchObject({kind:'active',effectMs:400,tick:0});
    expect(C.phase(r,1250)).toMatchObject({kind:'active',tick:1});
    expect(C.phase(r,1500)).toMatchObject({kind:'cooldown',effectMs:900});
    expect(C.phase(r,5600)).toMatchObject({kind:'warning',cycle:1});
});
test.each([{effect:'../../evil'},{id:''},{x:.5},{width:0},{scale:99},{hue:181},{hue:'red'},{name:'<script>'},{hazard:{...hazard,damage:0}},{hazard:{...hazard,warningMs:0}},{hazard:{...hazard,impactMs:1001}},{unknown:true}])('rejects invalid mapmaker input: %j',change=>expect(()=>C.validate([{...row,...change}],{width:10,height:10})).toThrow());
test('duplicate IDs and regions outside the map fail validation',()=>{expect(()=>C.validate([row,row])).toThrow('unique');expect(()=>C.validate([{...row,x:9}],{width:10,height:10})).toThrow('inside');expect(()=>C.validate(Array(101).fill(row))).toThrow('100');});


test('animations finish during the safe phase, then the cooldown begins before another warning',()=>{
    const r={...row,effect:'fire/meteor',hazard:{...hazard,impactMs:620}};
    expect(C.phase(r,1500)).toMatchObject({kind:'cooldown',effectMs:1120});
    expect(C.phase(r,5379).effectMs).toBe(4999);
    expect(C.phase(r,5380).effectMs).toBeNull();
    expect(C.cycleDuration(r)).toBe(7380);
    expect(C.phase(r,7380)).toMatchObject({kind:'warning',cycle:1});
});
test('random strikes stay inside the region, stay fixed during one cycle and vary across cycles',()=>{
    const r={...row,width:10,height:8,hazard:{...hazard,placement:'random',areaWidth:2,areaHeight:3}};
    const positions=new Set();for(let cycle=0;cycle<50;cycle++){
        const area=C.hitRegion(r,cycle,12345);expect(area).toEqual(C.hitRegion(r,cycle,12345));
        expect(area.x).toBeGreaterThanOrEqual(r.x);expect(area.y).toBeGreaterThanOrEqual(r.y);
        expect(area.x+area.width).toBeLessThanOrEqual(r.x+r.width);expect(area.y+area.height).toBeLessThanOrEqual(r.y+r.height);
        positions.add(area.x+','+area.y);
    }
    expect(positions.size).toBeGreaterThan(10);
    expect(()=>C.validate([{...r,hazard:{...r.hazard,areaWidth:11}}])).toThrow('Strike width');
});
