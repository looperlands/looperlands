const fs=require('fs'),vm=require('vm');
function setup(){
    const props={};for(const kind of ['rat','goblin','skeleton','skeleton2','ogre','crab','snake','boss','cobogre','wizard'])props[kind]={};
    const module={exports:{}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./combatfieldattacks'),'utf8'),{module,require:name=>{
        if(name.endsWith('gametypes'))return {getKindAsString:k=>k};
        if(name==='./properties')return props;
        if(name==='./formulas')return {dmg:()=>10};
        return {Move:function(mob){this.id=mob.id;}};
    }});
    const player={id:1,x:10,y:11,isDead:false,hitPoints:100,getLevel:()=>20,getWeaponLevel:()=>20,
        handleHurt:jest.fn(function(mob,damage){this.hitPoints-=damage;}),incrementNFTWeaponExperience:jest.fn(),playerClassModifiers:{meleeDamageTaken:1,meleeDamageDealt:1,hate:1}};
    const mob={id:2,type:'mob',kind:'goblin',target:1,x:10,y:10,hitPoints:100,maxHitPoints:100,armorLevel:1,level:3,
        getWeaponLevel:()=>3,setPosition(x,y){this.x=x;this.y=y;},receiveDamage(n){this.hitPoints-=n;}};
    const encounter={player,mob:{id:100},phase:'chase',lockUntil:0};
    const world={players:{1:player},entities:{1:player,2:mob},isValidPosition:()=>true,
        broadcastAttacker:jest.fn(),handleMobHate:jest.fn(),handleHurtEntity:jest.fn(),handleEntityGroupMembership:jest.fn(),pushToAdjacentGroups:jest.fn()};
    const controller={world,mobIds:new Set([100]),encounters:new Map([[1,encounter]]),free:()=>true,send:jest.fn(),rewardCombo:jest.fn()};
    const random=jest.fn(()=>0);const field=new module.exports(controller,random);
    return {field,props,player,mob,encounter,world,controller,random,start(){field.cooldowns.set(2,0);return field.intercept(encounter,mob,0);}};
}
test('only ordinary allowlisted mobs qualify; bosses, custom AI, AoE and friendly mobs retain their behavior',()=>{
    const s=setup();
    for(const kind of ['rat','goblin','skeleton','skeleton2','ogre','crab','snake'])expect(s.field.eligible({...s.mob,kind})).toBe(true);
    for(const kind of ['boss','cobogre','wizard','sharkboss','megamag'])expect(s.field.eligible({...s.mob,kind})).toBe(false);
    expect(s.field.eligible({...s.mob,specialInterval:1})).toBe(false);
    s.props.goblin.aoe={onHit:true};expect(s.field.eligible(s.mob)).toBe(false);
    delete s.props.goblin.aoe;s.props.goblin.friendly=true;expect(s.field.eligible(s.mob)).toBe(false);
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
