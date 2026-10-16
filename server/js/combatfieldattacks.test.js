const fs=require('fs'),vm=require('vm');
function setup(options={}){
    const props={};for(const kind of ['rat','goblin','skeleton','skeleton2','ogre','crab','snake','boss','wizard','spectre','eye','deathknight','bat','spider','minimag','sharkboss','tentacle','tentacle2','seacreature','megamag','cobslimeking','cobogre'])props[kind]={};
    const module={exports:{}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./combatfieldattacks'),'utf8'),{module,require:name=>{
        if(name.endsWith('gametypes'))return {getKindAsString:k=>k};
        if(name==='./properties')return props;
        if(name==='./formulas')return {dmg:()=>10};
        return {Move:function(mob){this.id=mob.id;}};
    }});
    const player={id:1,x:10,y:11,isDead:false,hitPoints:100,getLevel:()=>20,getWeaponLevel:()=>20,
        getMoveSpeed:()=>120,hasEnteredGame:true,handleHurt:jest.fn(function(mob,damage){this.hitPoints-=damage;}),incrementNFTWeaponExperience:jest.fn(),playerClassModifiers:{meleeDamageTaken:1,meleeDamageDealt:1,hate:1}};
    const mob={id:2,type:'mob',kind:'goblin',target:1,x:10,y:10,hitPoints:100,maxHitPoints:100,armorLevel:1,level:3,
        getWeaponLevel:()=>3,setPosition(x,y){this.x=x;this.y=y;},receiveDamage(n){this.hitPoints-=n;}};
    const encounter={player,patterns:new Set(['lunge','slam']),mob:{id:100},phase:'chase',lockUntil:0};
    const world={players:{1:player},entities:{1:player,2:mob},isValidPosition:()=>true,
        broadcastAttacker:jest.fn(),handleMobHate:jest.fn(),handleHurtEntity:jest.fn(),handleEntityGroupMembership:jest.fn(),pushToAdjacentGroups:jest.fn()};
    const controller={world,mobIds:new Set([100]),encounters:new Map([[1,encounter]]),free:()=>true,send:jest.fn(),rewardCombo:jest.fn()};
    const random=jest.fn(()=>0);const field=new module.exports(controller,random,options);
    return {field,props,player,mob,encounter,world,controller,random,start(){field.cooldowns.set(2,0);return field.intercept(encounter,mob,0);}};
}
test('charges default on across regular mobs and ordinary bosses',()=>{
    const s=setup();
    for(const kind of ['rat','goblin','skeleton','skeleton2','ogre','crab','snake','spectre','eye','deathknight','bat','spider','wizard','boss','sharkboss']) {
        expect(s.field.eligible({...s.mob,kind})).toBe(true);
    }
    s.props.newenemy={};expect(s.field.eligible({...s.mob,kind:'newenemy'})).toBe(true);
    s.props.boss.redpacket=true;expect(s.field.eligible({...s.mob,kind:'boss'})).toBe(true);
    s.props.minimag.aoe={onDeath:true};expect(s.field.eligible({...s.mob,kind:'minimag'})).toBe(true);
});
test('stationary and scripted encounters are excluded even before their special timer starts',()=>{
    const s=setup();
    for(const kind of ['tentacle','tentacle2','seacreature','megamag','cobslimeking','cobogre']) {
        const mob={...s.mob,kind};s.world.entities[2]=mob;s.field.cooldowns.set(2,0);
        expect(s.field.intercept(s.encounter,mob,0)).toBe(false);
    }
    expect(s.field.attacks.size).toBe(0);
    expect(s.controller.send).not.toHaveBeenCalled();
});
test('friendly entities, trainers, timed AoE and active scripts keep their existing behavior',()=>{
    const s=setup();
    for(const overrides of [{specialInterval:1},{addArray:[{}]},{id:100},{type:'npc'},{kind:'unknown'}]) {
        expect(s.field.eligible({...s.mob,...overrides})).toBe(false);
    }
    s.props.goblin.aoe={onTimer:4000};expect(s.field.eligible(s.mob)).toBe(false);
    delete s.props.goblin.aoe;s.props.goblin.friendly=true;expect(s.field.eligible(s.mob)).toBe(false);
});
test.each(['spectre','eye','deathknight','boss','spider'])('newly eligible %s completes a lunge and opens a counter after a sidestep',kind=>{
    const s=setup();s.mob.kind=kind;
    expect(s.start()).toBe(true);s.player.x=11;
    s.field.tick(650);s.field.tick(830);
    expect(s.encounter.fieldCombo).toMatchObject({kind:'counter',mob:s.mob});
    s.field.technique(s.encounter,2,900);
    expect(s.mob.hitPoints).toBe(85);expect(s.encounter.fieldCombo).toBeNull();
});
test('normal swings precede a randomized special and failed rolls keep ordinary attacks',()=>{
    const s=setup();expect(s.field.intercept(s.encounter,s.mob,0)).toBe(false);
    expect(s.field.intercept(s.encounter,s.mob,1000)).toBe(false);
    s.random.mockReturnValue(.9);expect(s.field.intercept(s.encounter,s.mob,1200)).toBe(false);
    expect(s.field.attacks.size).toBe(0);
    s.random.mockReturnValue(0);expect(s.field.intercept(s.encounter,s.mob,8000)).toBe(true);
    expect(s.field.held(s.mob)).toBe(true);
    expect(s.field.state(s.encounter).fieldAttacks[0]).toMatchObject({windup:650,phase:'windup'});
});
test('locked telegraph misses a sidestep and opens one empowered counter on that mob',()=>{
    const s=setup();expect(s.start()).toBe(true);s.player.x=11;
    s.field.tick(650);expect([s.mob.x,s.mob.y]).toEqual([10,11]);
    s.field.tick(830);expect(s.player.handleHurt).not.toHaveBeenCalled();
    expect(s.encounter.fieldCombo.kind).toBe('counter');
    s.field.technique(s.encounter,2,900);expect(s.mob.hitPoints).toBe(85);
    expect(s.encounter.fieldCombo).toBeNull();
    s.field.technique(s.encounter,2,1000);s.field.tick(1400);
    expect(s.mob.hitPoints).toBe(85);expect(s.encounter.lockUntil).toBe(0);
    expect(s.controller.rewardCombo).not.toHaveBeenCalled();
    expect(s.encounter.chargeHit).toBeUndefined();
});
test('standing in the warned lane takes one powered hit and no counter opening',()=>{
    const s=setup();s.start();s.field.tick(650);s.field.tick(830);s.field.tick(900);
    expect(s.player.handleHurt).toHaveBeenCalledTimes(1);expect(s.player.handleHurt).toHaveBeenCalledWith(s.mob,20);
    expect(s.encounter.fieldCombo).toBeUndefined();expect(s.encounter.chargeHit).toBe(1);
});
test('only one mob can telegraph at a time per player, and clearing restores normal AI',()=>{
    const s=setup();s.start();const other={...s.mob,id:3};s.field.cooldowns.set(3,0);
    expect(s.field.intercept(s.encounter,other,1)).toBe(false);
    s.field.clear(s.encounter);expect(s.field.held(s.mob)).toBe(false);expect(s.world.broadcastAttacker).toHaveBeenCalledWith(s.mob);
});
test('despawn, target changes and player death cancel pending attacks without damage',()=>{
    for(const change of ['despawn','target','death']){
        const s=setup();s.start();
        if(change==='despawn')delete s.world.entities[2];else if(change==='target')s.mob.target=4;else s.player.isDead=true;
        s.field.tick(1000);expect(s.field.attacks.size).toBe(0);expect(s.player.handleHurt).not.toHaveBeenCalled();
    }
});
test('killing the ordinary target clears its followup and uses the normal reward boundary once',()=>{
    const s=setup();s.start();s.player.x=11;s.field.tick(650);s.field.tick(830);s.mob.hitPoints=10;
    s.field.technique(s.encounter,2,900);expect(s.encounter.fieldCombo).toBeNull();
    expect(s.world.handleHurtEntity).toHaveBeenCalledWith(s.mob,s.player,15,true);
    expect(s.player.incrementNFTWeaponExperience).toHaveBeenCalledWith(15);
    s.field.technique(s.encounter,2,1000);expect(s.world.handleHurtEntity).toHaveBeenCalledTimes(1);
});

test('an invulnerable player does not receive a charge impact signal',()=>{
    const s=setup();s.player.handleHurt.mockImplementation(()=>{});
    s.start();s.field.tick(650);s.field.tick(830);
    expect(s.encounter.chargeHit).toBeUndefined();
});

test('real mob catalog enables Lavaland enemies and mobile bosses while preserving bespoke encounters',()=>{
    global.Types ||= {}; // Legacy gametypes initializes this global before exporting it.
    const catalog=require('./properties');
    const s=setup();Object.assign(s.props,catalog);
    for(const kind of ['spectre','eye','deathknight','boss','sharkboss','spider','bat','minimag']) {
        expect(s.field.eligible({...s.mob,kind})).toBe(true);
    }
    for(const kind of ['tentacle','tentacle2','seacreature','megamag','cobslimeking','cobogre','cobchicken']) {
        expect(s.field.eligible({...s.mob,kind})).toBe(false);
    }
});


function slamSetup(){const s=setup({slam:true});s.field.setMode('slam');return s;}
test.each(['rat','spectre','eye','deathknight','spider','wizard','boss','sharkboss'])('local Slam is available to every Lunge-eligible %s',kind=>{
    const s=slamSetup();s.mob.kind=kind;expect(s.start()).toBe(true);
    expect(s.field.state(s.encounter).fieldAttacks[0]).toMatchObject({pattern:'slam',windup:950});
});
test('production defaults cannot opt into Slam through mode selection or client capability',()=>{
    const s=setup();expect(s.field.setMode('slam')).toBe(false);
    s.start();expect(s.field.state(s.encounter).fieldAttacks[0].pattern).toBe('lunge');
});
test('Slam fixes its nine warned tiles, stays planted and resolves damage once at impact',()=>{
    const s=slamSetup();s.start();const before=s.field.state(s.encounter).fieldAttacks[0];
    expect(before.lane).toHaveLength(9);expect(before.lane).toContainEqual({x:9,y:9});
    s.field.tick(949);expect(s.player.handleHurt).not.toHaveBeenCalled();
    s.field.tick(950);s.field.tick(951);s.field.tick(1000);
    expect(s.player.handleHurt).toHaveBeenCalledTimes(1);expect(s.player.handleHurt).toHaveBeenCalledWith(s.mob,15);
    expect([s.mob.x,s.mob.y]).toEqual([10,10]);expect(s.world.pushToAdjacentGroups).not.toHaveBeenCalled();
    expect(s.encounter.chargeHit).toBe(1);expect(s.encounter.fieldCombo).toBeUndefined();
    s.field.tick(1130);expect(s.field.state(s.encounter).fieldAttacks[0]).toMatchObject({phase:'recovery',lane:[]});
    s.field.tick(2630);expect(s.field.held(s.mob)).toBe(false);
});
test('a sideways step stays inside Slam, while backing away opens a returning automatic counter',()=>{
    const sideways=slamSetup();sideways.start();sideways.player.x=11;sideways.field.tick(950);
    expect(sideways.player.handleHurt).toHaveBeenCalledTimes(1);expect(sideways.encounter.fieldCombo).toBeUndefined();
    const s=slamSetup();s.start();s.player.y=12;s.field.tick(950);
    expect(s.player.handleHurt).not.toHaveBeenCalled();expect(s.encounter.fieldCombo).toMatchObject({kind:'counter',until:2200});
    s.field.technique(s.encounter,2,1000);expect(s.mob.hitPoints).toBe(100);
    s.player.y=11;s.field.technique(s.encounter,2,1100);s.field.technique(s.encounter,2,1150);
    expect(s.mob.hitPoints).toBe(85);expect(s.encounter.fieldCombo).toBeNull();
    expect(s.controller.rewardCombo).not.toHaveBeenCalled();
});
test('Slam hits nearby capable players once without granting observers a counter',()=>{
    const s=slamSetup(),other={...s.player,id:3,x:9,y:9,hitPoints:100,handleHurt:jest.fn(function(m,n){this.hitPoints-=n;})};
    const otherEncounter={player:other,patterns:new Set(['lunge','slam'])};
    s.world.players[3]=other;s.controller.encounters.set(3,otherEncounter);
    s.start();s.player.y=12;s.field.tick(950);s.field.tick(1000);
    expect(other.handleHurt).toHaveBeenCalledTimes(1);expect(otherEncounter.chargeHit).toBe(1);
    expect(otherEncounter.fieldCombo).toBeUndefined();expect(s.encounter.fieldCombo.kind).toBe('counter');
});
test('players entering after the warning can be hit, but leaving before impact is safe',()=>{
    const s=slamSetup(),other={...s.player,id:3,x:12,y:10,handleHurt:jest.fn()};
    s.world.players[3]=other;s.controller.encounters.set(3,{player:other,patterns:new Set(['slam'])});
    s.start();other.x=11;s.player.y=12;s.field.tick(950);
    expect(other.handleHurt).toHaveBeenCalledTimes(1);expect(s.player.handleHurt).not.toHaveBeenCalled();
});
test('Slam falls back to supported Lunge when a nearby client lacks the pattern capability',()=>{
    const s=slamSetup();s.encounter.patterns=new Set(['lunge']);s.start();
    expect(s.field.state(s.encounter).fieldAttacks[0].pattern).toBe('lunge');
    const nearby=slamSetup();nearby.world.players[3]={...nearby.player,id:3,x:12,y:10};nearby.start();
    expect(nearby.field.state(nearby.encounter).fieldAttacks[0].pattern).toBe('lunge');
});
test('Slam skips blocked escape routes and door tiles rather than trapping players',()=>{
    const s=slamSetup();s.controller.free=()=>false;expect(s.start()).toBe(false);
    const door=slamSetup();door.world.map={doors:[{x:10,y:11}]};expect(door.start()).toBe(false);
    const walls=slamSetup();walls.world.isValidPosition=(x,y)=>x!==9||y!==9;walls.start();
    expect(walls.field.state(walls.encounter).fieldAttacks[0].lane).not.toContainEqual({x:9,y:9});
});
test('Slam escape checks include other active warning tiles and the player movement budget',()=>{
    const s=slamSetup();s.player.getMoveSpeed=()=>1200;expect(s.start()).toBe(false);
    const overlap=slamSetup();const tiles=overlap.field.slamTiles(overlap.mob);
    overlap.controller.free=(x,y)=>x===10&&y===12;
    overlap.field.attacks.set(99,{phase:'windup',lane:[{x:10,y:12}]});
    expect(overlap.field.canEscape(overlap.player,tiles,950)).toBe(false);
});
test.each(['despawn','death','disconnect','retarget'])('pending Slam cancellation on %s causes no impact or opening',reason=>{
    const s=slamSetup();s.start();
    if(reason==='despawn')delete s.world.entities[2];
    if(reason==='death')s.player.isDead=true;
    if(reason==='disconnect')delete s.world.players[1];
    if(reason==='retarget')s.mob.target=999;
    s.field.tick(950);expect(s.player.handleHurt).not.toHaveBeenCalled();expect(s.encounter.fieldCombo).toBeNull();
});
test('Mixed keeps ordinary swings and limits repeated special patterns',()=>{
    const s=setup({slam:true});s.field.setMode('mixed');
    expect(s.field.intercept(s.encounter,s.mob,0)).toBe(false);
    const patterns=[];
    for(const now of [4000,8000,12000]){
        expect(s.field.intercept(s.encounter,s.mob,now)).toBe(true);
        patterns.push(s.field.state(s.encounter).fieldAttacks[0].pattern);s.field.clear(s.encounter);
    }
    expect(patterns).toEqual(['slam','slam','lunge']);
    s.random.mockReturnValue(.9);expect(s.field.intercept(s.encounter,s.mob,16000)).toBe(false);
});
