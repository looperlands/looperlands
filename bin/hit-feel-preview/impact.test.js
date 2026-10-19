const {presets,sample,healthTrail,squash} = require('./impact');
const all = {flash:true,particles:true,recoil:true,shake:true,freeze:true};
test('hit-stop holds the contact pose for its duration without changing elapsed time',()=>{
    expect(sample(44,presets.balanced,all)).toMatchObject({frozen:true,poseAge:0});
    expect(sample(45,presets.balanced,all)).toMatchObject({frozen:false,poseAge:0});
    expect(sample(90,presets.balanced,all)).toMatchObject({frozen:false,poseAge:45});
});
test('reduced motion retains a flash but removes displacement, particles and pose hold',()=>{
    expect(sample(20,presets.arcade,{...all,reduced:true},true)).toMatchObject({flash:true,frozen:false,poseAge:20,recoil:0,shakeX:0,shakeY:0,particles:0});
});
test.each(Object.keys(presets))('%s effects stay bounded and fully expire',preset=>{
    const c=presets[preset];
    for(let age=0;age<1000;age++) {
        const f=sample(age,c,all,true);
        expect(Math.abs(f.shakeX)).toBeLessThanOrEqual(Math.ceil(c.shake*1.4));
        expect(f.recoil).toBeLessThanOrEqual(Math.ceil(c.recoil*1.4));
    }
    for(const age of [-1,420,10000])expect(sample(age,c,all,true)).toMatchObject({active:false,flash:false,frozen:false,recoil:0,shakeX:0,shakeY:0,particles:0});
});
test('each disabled layer produces no effect even on a critical hit',()=>{
    expect(sample(10,presets.arcade,{},true)).toMatchObject({flash:undefined,frozen:false,recoil:0,shakeX:0,shakeY:0,particles:0});
});
test('health trail holds the old HP then settles on confirmed HP without undershooting',()=>{
    expect(healthTrail(159,.4)).toBe(1);
    expect(healthTrail(350,.4)).toBeCloseTo(.7);
    expect(healthTrail(540,.4)).toBe(.4);
    expect(healthTrail(10000,0)).toBe(0);
});
test('squash settles, with no distortion before contact or under reduced motion',()=>{
    expect(squash(0,true,false)).toEqual({x:1.16,y:.84});
    for(const age of [-1,170,1000])expect(squash(age,true,false)).toEqual({x:1,y:1});
    expect(squash(0,true,true)).toEqual({x:1,y:1});
    expect(squash(0,false,false)).toEqual({x:1,y:1});
});
test('normal hits never shake; critical, kill and counter feedback can shake',()=>{
    expect(sample(0,presets.balanced,all,false)).toMatchObject({shakeX:0,shakeY:0});
    expect(sample(0,presets.balanced,all,true).shakeX).toBeGreaterThan(0);
    for(const reason of ['kill','counter']) {
        expect(sample(0,presets.balanced,{...all,[reason]:true},false).shakeX).toBeGreaterThan(0);
        expect(sample(150,presets.balanced,{...all,[reason]:true},false)).toMatchObject({shakeX:0,shakeY:0});
    }
});
