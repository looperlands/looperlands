const {Playground}=require('./model');
const advance=(sim,ms)=>{while(ms>0){const dt=Math.min(ms,50);sim.update(dt);ms-=dt;}};

test.each(['pillar','meteor'])('%s warns first, hits a tile-boundary player once and has a harmless aftermath',kind=>{
    const sim=new Playground(),h=sim.hazard(kind);
    advance(sim,h.impactAt-1);expect(sim.player.hp).toBe(100);
    advance(sim,1);const hp=sim.player.hp;expect(hp).toBeLessThan(100);
    advance(sim,2000);expect(sim.player.hp).toBe(hp);
    advance(sim,2000);expect(sim.hazards).toHaveLength(0);
});

test('moving out of a warning prevents damage; walking back during aftermath is safe',()=>{
    const sim=new Playground(),h=sim.hazard('meteor'),start={...sim.player};
    sim.move(0,-1,500);advance(sim,h.impactAt+200);expect(sim.player.hp).toBe(100);
    sim.player.x=start.x;sim.player.y=start.y;advance(sim,1000);expect(sim.player.hp).toBe(100);
});

test('flamethrower ticks at a bounded rate only inside its active lane',()=>{
    const sim=new Playground(),h=sim.hazard('flamethrower');
    advance(sim,h.impactAt+1500);expect(sim.player.hp).toBe(40);
    sim.player.y-=20;advance(sim,400);expect(sim.player.hp).toBe(40);
});

test('frost expires after three seconds and cannot be refreshed during cooldown',()=>{
    const sim=new Playground();expect(sim.counter('frost',true)).toBe(true);
    const until=sim.enemy.frozenUntil;advance(sim,2000);sim.counter('frost',true);
    expect(sim.enemy.frozenUntil).toBe(until);advance(sim,1000);expect(sim.time).toBe(until);
    advance(sim,7000);sim.counter('frost',true);expect(sim.enemy.frozenUntil).toBe(13000);
});

test('dodge opens a bounded automatic counter; returning triggers it only once',()=>{
    const sim=new Playground();sim.charge();sim.move(-1,0,300);advance(sim,1000);
    expect(sim.counterUntil).toBe(2250);expect(sim.player.hp).toBe(100);
    sim.move(1,0,300);advance(sim,50);expect(sim.hits).toBe(1);
    advance(sim,1000);expect(sim.hits).toBe(1);
});

test('standing in the charge hurts, expired counters do not fire, and frozen enemies cannot charge',()=>{
    const sim=new Playground();sim.charge();advance(sim,1000);expect(sim.player.hp).toBe(80);
    sim.counter('frost',true);sim.charge();expect(sim.enemyCharge).toBeNull();
    advance(sim,3000);sim.charge();sim.move(-1,0,400);advance(sim,2400);
    sim.move(1,0,400);advance(sim,50);expect(sim.hits).toBe(1);
});

test('death stops movement, attacks and charges; respawn and reset clear pending hazards',()=>{
    const sim=new Playground();sim.hazard('pillar');sim.charge();sim.die('soul');
    const x=sim.player.x;sim.move(1,0,500);expect(sim.player.x).toBe(x);
    expect(sim.attack()).toBe(false);expect(sim.counter()).toBe(false);expect(sim.hazard('meteor')).toBeUndefined();
    sim.charge();expect(sim.enemyCharge).toBeNull();
    sim.respawn();expect(sim.player.hp).toBe(100);expect(sim.hazards).toHaveLength(0);
    sim.hazard('meteor');sim.reset();advance(sim,3000);expect(sim.player.hp).toBe(100);expect(sim.drain()).toEqual([]);
});

test('ordinary hits enforce range and cadence; hazard count and movement stay bounded',()=>{
    const sim=new Playground();expect(sim.attack()).toBe(true);expect(sim.attack()).toBe(false);
    advance(sim,300);sim.move(-1,-1,10000);expect(sim.player.x).toBe(24);expect(sim.player.y).toBe(48);
    expect(sim.attack()).toBe(false);expect(sim.counter()).toBe(false);
    sim.move(1,1,10000);expect(sim.player.x).toBe(360);expect(sim.player.y).toBe(216);
    for(let i=0;i<30;i++)sim.hazard('pillar');expect(sim.hazards).toHaveLength(12);
    expect(sim.hazard('bad')).toBeUndefined();
});
