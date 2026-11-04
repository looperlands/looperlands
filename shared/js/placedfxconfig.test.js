const C=require('./placedfxconfig');
const row={id:'fire',name:'Fire',effect:'fire/campfire',x:2,y:3,width:2,height:3,scale:.5,hazard:null};
const hazard={warningMs:1000,activeMs:500,cooldownMs:2000,damage:10,tickMs:250,impactMs:400};
test('every pinned effect is available for decorative and hazardous placement',()=>{
    expect(Object.keys(C.catalog)).toHaveLength(244);
    for(const effect of Object.keys(C.catalog)) {expect(C.validate([{...row,effect}],{width:10,height:10})).toHaveLength(1);expect(C.validate([{...row,effect,hazard:{...hazard,impactMs:0}}])).toHaveLength(1);}
});
test('region is half-open, tile aligned and independent of visual scale',()=>{
    expect(C.contains(row,2,3)).toBe(true);expect(C.contains(row,3,5)).toBe(true);expect(C.contains(row,4,5)).toBe(false);expect(C.contains(row,2,6)).toBe(false);
    expect(C.phase(row,3500)).toEqual({kind:'decoration',cycle:1,effectMs:500});
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

test('named palettes are allowlisted while legacy hue placements remain readable',()=>{
    expect(Object.keys(C.palettes)).toHaveLength(27);
    for(const palette of Object.keys(C.palettes))expect(C.validate([{...row,palette}])).toHaveLength(1);
    for(const palette of ['',null,42,'unknown','toString'])expect(()=>C.validate([{...row,palette}])).toThrow('palette');
    expect(C.validate([{...row,hue:120}])).toHaveLength(1);
});

test('attack conditions select a map mob and inactive effects have no animation or warning',()=>{
    expect(C.validate([{...row,attackingMob:13}],{mobs:[{id:13}]})).toHaveLength(1);
    expect(C.phase({...row,hazard},null)).toEqual({kind:'inactive',effectMs:null});
    expect(C.phase(row,null)).toEqual({kind:'inactive',effectMs:null});
    expect(()=>C.validate([{...row,attackingMob:13}],{mobs:[{id:2}]})).toThrow('from this map');
    for(const attackingMob of [null,0,-1,1.5,'13',{},Number.MAX_SAFE_INTEGER+1])expect(()=>C.validate([{...row,attackingMob}])).toThrow('Attacking mob');
});

test('every shipped effect exposes typed, valid defaults without manual seeds or a second palette owner',()=>{
    for(const [effect,meta]of Object.entries(C.catalog)){
        expect(()=>C.validateOptions(effect,meta.options)).not.toThrow();
        expect(C.optionFields(effect).map(f=>f.key)).not.toContain('seed');
        expect(C.optionFields(effect).map(f=>f.key)).not.toContain('palette');
    }
    expect(C.validate([{...row,options:{height:30,wood:['#111111','#222222','#333333','#444444','#555555','#666666']}}])).toHaveLength(1);
    expect(()=>C.validateOptions('water/waterfall',{ledge:false,height:75,width:9})).not.toThrow();
    expect(()=>C.validateOptions('ui/achievement',{title:'WELL DONE',text:'Victory!'})).not.toThrow();
    expect(()=>C.validateOptions('transitions/iris',{focus:[20,30]})).not.toThrow();
});
test.each([null,[],{seed:1},{palette:'leaf'},{actor:{}},{x:12},{height:'30'},{height:0},{height:Infinity},{height:100000},{wood:[]},{wood:['red']},JSON.parse('{"__proto__":{}}')])('rejects unsupported and unsafe options: %j',options=>{
    expect(()=>C.validate([{...row,options}])).toThrow();
});
test('option types and bounds are enforced at the shared authoring boundary',()=>{
    for(const [effect,options]of [['water/waterfall',{ledge:'false'}],['ui/achievement',{title:'<script>'}],['ui/achievement',{text:'a'.repeat(65)}],['fire/flame-pillar',{stone:'red'}],['transitions/iris',{focus:[20]}],['transitions/iris',{focus:[-1,30]}],['holy/sunburst',{rays:1.5}],['impacts/hit-flash',{side:0}]]){
        expect(()=>C.validateOptions(effect,options)).toThrow('option');
    }
});
test('visual seeds vary by placement, cycle, world and fight while remaining deterministic for observers',()=>{
    const seed=C.effectSeed(row,0,123,1000);
    expect(C.effectSeed(row,0,123,1000)).toBe(seed);
    const variants=[seed,C.effectSeed({...row,id:'other'},0,123,1000),C.effectSeed(row,1,123,1000),C.effectSeed(row,0,124,1000),C.effectSeed(row,0,123,2000)];
    expect(new Set(variants).size).toBe(5);expect(variants.every(n=>Number.isInteger(n) && n>0)).toBe(true);
});

const sprite={image:'/img/map-fx/custom-'+ 'a'.repeat(32)+'.png',frameWidth:32,frameHeight:48,columns:4,frames:8,fps:8};
const custom={...row,effect:undefined,sprite};
test('custom sheets use the same synchronized warning, impact and cooldown contract',()=>{
    expect(C.validate([custom])).toHaveLength(1);expect(C.metadata(custom).duration).toBe(1000);
    const r={...custom,hazard};C.validate([r]);expect(C.phase(r,1000)).toMatchObject({kind:'active',effectMs:400});expect(C.phase(r,1600).effectMs).toBe(null);
    expect(C.phase(custom,1250)).toMatchObject({kind:'decoration',cycle:1,effectMs:250});
});
test.each([{image:'https://example.com/hazard.png'},{image:'/img/map-fx/../../secret.png'},{frames:0},{fps:61},{frameWidth:1025},{columns:257},{frames:256,fps:1}])('invalid custom sheet settings are rejected: %j',override=>{
    expect(()=>C.validate([{...custom,sprite:{...sprite,...override}}])).toThrow();
});
test('custom artwork cannot be mixed with PixelFX appearance settings',()=>{
    for(const extra of [{effect:'fire/campfire'},{palette:'leaf'},{options:{}},{background:'transparent'}])expect(()=>C.validate([{...custom,...extra}])).toThrow('own artwork');
});

test('a partial first row can retain unused sheet columns',()=>{expect(()=>C.validate([{...custom,sprite:{...sprite,frames:2}}])).not.toThrow();});
