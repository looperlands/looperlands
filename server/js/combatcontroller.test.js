const fs=require('fs'),vm=require('vm');
global.Types ||= {};
function setup(){
    let now=10000;
    const M={MOVE:1,LOOTMOVE:2,HIT:3,HURT:4,ATTACK:5};
    const Messages={Move:function(e){this.id=e.id;},Destroy:function(e){this.id=e.id;}};
    const fieldExport={exports:{}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./combatfieldattacks'),'utf8'),{module:fieldExport,require:name=>{
        if(name.endsWith('gametypes'))return {getKindAsString:k=>k};
        if(name==='./properties')return {spectre:{}};
        if(name==='./formulas')return {dmg:()=>10};
        if(name==='./combatconfig')return require('./combatconfig');
        return Messages;
    }});
    const exported={exports:{}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./combatcontroller'),'utf8'),{module:exported,require:name=>
        name==='./combatfieldattacks'?fieldExport.exports:name.endsWith('gametypes')?{Messages:M}:Messages});
    const world={players:{},entities:{},groups:{a:{entities:{}},far:{entities:{}}},map:{doors:[]},
        isValidPosition:()=>true,handleEntityGroupMembership:jest.fn(()=>true),pushToPreviousGroups:jest.fn(),
        pushRelevantEntityListTo:jest.fn(),pushToAdjacentGroups:jest.fn(),broadcastAttacker:jest.fn(),
        handleMobHate:jest.fn(),handleHurtEntity:jest.fn(),server:{activity:{meaningful:jest.fn()}}};
    const combat=new exported.exports(world,()=>now);combat.fieldAttacks.random=()=>0;
    function player(id=1,group='a'){
        const handlers={},socket={emit:jest.fn(),on:(event,fn)=>{handlers[event]=fn;}};
        const p={id,type:'player',group,x:10,y:11,hitPoints:80,maxHitPoints:100,hasEnteredGame:true,isDead:false,
            getMoveSpeed:()=>120,getLevel:()=>20,getWeaponLevel:()=>20,getActiveBuff:()=>null,
            playerClassModifiers:{meleeDamageTaken:1,meleeDamageDealt:1,hate:1},
            setPosition(x,y){this.x=x;this.y=y;},clearTarget:jest.fn(),resetTimeout:jest.fn(),move_callback:jest.fn(),
            regenHealthBy:jest.fn(),handleExperience:jest.fn(),incrementNFTWeaponExperience:jest.fn(),
            handleHurt(mob,n){this.hitPoints-=n;},connection:{_connection:socket,listen_callback:jest.fn()}};
        world.players[id]=p;world.entities[id]=p;const original=p.connection.listen_callback;combat.bind(p);
        return {p,socket,handlers,original,ready(){handlers.combat({action:'ready'});return combat.encounters.get(id);}};
    }
    const one=player();
    const mob={id:50,type:'mob',kind:'spectre',target:1,x:10,y:10,hitPoints:100,maxHitPoints:100,armorLevel:1,
        getWeaponLevel:()=>3,setPosition(x,y){this.x=x;this.y=y;},receiveDamage(n){this.hitPoints-=n;}};
    world.entities[50]=mob;world.groups.a.entities[50]=mob;
    return {combat,world,one,mob,M,player,advance(ms){now+=ms;combat.tick();},start(){
        const e=one.ready();combat.fieldAttacks.cooldowns.set(50,0);
        one.p.connection.listen_callback([M.HURT,50,0]);return e;
    }};
}

test('capability handshake preserves HP, position, regeneration and legacy clients',()=>{
    const s=setup(),p=s.one.p,regen=p.regenHealthBy;
    p.connection.listen_callback([s.M.MOVE,15,15]);expect(s.one.original).toHaveBeenCalled();
    expect(s.combat.encounters.size).toBe(0);
    s.one.ready();s.one.ready();
    expect(s.combat.encounters.size).toBe(1);expect([p.x,p.y,p.hitPoints]).toEqual([10,11,80]);
    expect(p.regenHealthBy).toBe(regen);expect(s.world.combatPrototype).toBeUndefined();
    expect(s.one.socket.emit).toHaveBeenCalledWith('combat',expect.objectContaining({live:true,mob:null,enabled:true}));
});
test('normal clients cannot spawn/reset trainers, restore HP, or reset their streak window',()=>{
    const s=setup(),e=s.one.ready();e.streak=3;
    for(const action of ['enable','reset','disable','select'])s.one.handlers.combat({action});
    expect(s.combat.encounters.get(1)).toBe(e);expect(e.streak).toBe(3);expect(s.one.p.hitPoints).toBe(80);
    expect(Object.keys(s.world.entities)).toHaveLength(2);
    s.one.p.hasEnteredGame=false;s.one.handlers.combat({action:'move',x:11,y:11,correction:1});
    expect(s.one.p.x).toBe(10);
});
test('completed tiles update visibility and activity; stale reports cannot teleport back',()=>{
    const s=setup(),e=s.one.ready();s.advance(300);
    s.one.p.connection.listen_callback([s.M.MOVE,30,30]);expect(s.one.p.x).toBe(10);
    s.one.handlers.combat({action:'move',x:11,y:11,correction:e.correction});
    expect(s.one.p.x).toBe(11);expect(s.world.pushRelevantEntityListTo).toHaveBeenCalledWith(s.one.p);
    expect(s.world.server.activity.meaningful).toHaveBeenCalledWith(s.one.p);
    expect(s.one.p.resetTimeout).toHaveBeenCalled();
    const old=e.correction;s.one.p.setPosition(70,3);s.combat.teleport(s.one.p);
    s.one.handlers.combat({action:'move',x:12,y:11,correction:old});expect([s.one.p.x,s.one.p.y]).toEqual([70,3]);
    expect(e.correction).toBe(old+1);expect(s.one.p.hitPoints).toBe(80);
});
test('new mob charge opens exactly one validated counter and cannot award free XP',()=>{
    const s=setup(),e=s.start();
    s.one.handlers.combat({action:'technique',mobId:50});expect(s.mob.hitPoints).toBe(100);
    s.advance(300);s.one.handlers.combat({action:'move',x:11,y:11,correction:1});
    s.advance(350);s.advance(180);expect(e.fieldCombo.kind).toBe('counter');
    s.one.handlers.combat({action:'technique',mobId:999});expect(s.mob.hitPoints).toBe(100);
    s.one.handlers.combat({action:'technique',mobId:50});s.one.handlers.combat({action:'technique',mobId:50});
    expect(s.mob.hitPoints).toBe(85);expect(s.one.p.handleExperience).not.toHaveBeenCalled();
    expect(e.fieldCombo).toBeNull();expect(s.one.p.hitPoints).toBe(80);
});
test('nearby observers see charges, but receive no counter rights and distant players receive no attack state',()=>{
    const s=setup(),near=s.player(2),far=s.player(3,'far');near.ready();far.ready();s.start();s.combat.tick();
    const packet=near.socket.emit.mock.calls.at(-1)[1];
    expect(packet.fieldAttacks).toHaveLength(1);expect(packet.fieldAttacks[0].targetId).toBe(1);
    expect(packet.fieldCombo).toBeNull();expect(far.socket.emit.mock.calls.at(-1)[1].fieldAttacks).toHaveLength(0);
    near.handlers.combat({action:'technique',mobId:50});expect(s.mob.hitPoints).toBe(100);
});
test.each(['teleport','death','disconnect'])('%s cancels pending charges and restores ordinary mob AI',reason=>{
    const s=setup(),e=s.start();
    if(reason==='teleport')s.combat.teleport(s.one.p);
    else if(reason==='death'){s.one.p.isDead=true;s.advance(50);}
    else s.one.handlers.disconnect();
    expect(s.combat.fieldAttacks.attacks.size).toBe(0);expect(e.fieldCombo).toBeNull();
    expect(s.world.broadcastAttacker).toHaveBeenCalledWith(s.mob);
    s.advance(1000);expect(s.one.p.hitPoints).toBe(80);
});
test('unchanged state is deduplicated with a one-second heartbeat',()=>{
    const s=setup();s.one.ready();s.combat.tick();s.advance(50);
    expect(s.one.socket.emit).toHaveBeenCalledTimes(1);
    s.advance(1000);expect(s.one.socket.emit).toHaveBeenCalledTimes(2);
});
test('production HIT scopes streak credit to one primary kill, excluding splash and assists',()=>{
    const s=setup(),e=s.one.ready();s.mob.hitPoints=0;
    s.one.original.mockImplementation(()=>{
        const splash={...s.mob,id:51};s.world.entities[51]=splash;
        expect(s.combat.killExperience(splash,s.one.p,s.one.p,100)).toBe(100);
        expect(s.combat.killExperience(s.mob,s.one.p,{id:2},100)).toBe(100);
        expect(s.combat.killExperience(s.mob,s.one.p,s.one.p,100)).toBe(125);
        expect(s.combat.killExperience(s.mob,s.one.p,s.one.p,100)).toBe(100);
    });
    e.streak=1;e.streakUntil=12000;s.one.p.connection.listen_callback([s.M.HIT,50]);
    expect(e.streak).toBe(2);expect(s.combat.activeAttack).toBeUndefined();
});


test('ready records supported patterns without letting repeated ready reset an encounter',()=>{
    const s=setup();s.one.handlers.combat({action:'ready',patterns:['lunge','slam']});
    const encounter=s.combat.encounters.get(1);expect(encounter.patterns.has('slam')).toBe(true);
    s.one.handlers.combat({action:'ready',patterns:['lunge']});expect(encounter.patterns.has('slam')).toBe(true);
    expect(s.combat.fieldAttacks.slamEnabled).toBe(false);
});


test.each([0,1,2,5])('the kill window stays fixed at 1.5 seconds with %s other nearby attackers', others=>{
    const s=setup(),e=s.one.ready();s.mob.hitPoints=0;
    for(let i=0;i<others;i++)s.world.entities[100+i]={...s.mob,id:100+i,hitPoints:100};
    function primaryKill(){
        s.combat.activeAttack={player:s.one.p,targetId:50,credited:false};
        return s.combat.killExperience(s.mob,s.one.p,s.one.p,100);
    }
    expect(primaryKill()).toBe(100);expect(e.streakUntil).toBe(11500);
    s.advance(1499);expect(primaryKill()).toBe(125);expect(e.streakUntil).toBe(12999);
    s.advance(1500);expect(primaryKill()).toBe(100);expect(e.streak).toBe(1);
});
test('AoE splash cannot refresh a streak in a crowd, and primary kills keep the existing XP cap',()=>{
    const s=setup(),e=s.one.ready();s.mob.hitPoints=0;e.streak=5;e.streakUntil=11500;
    for(let i=0;i<5;i++)s.world.entities[100+i]={...s.mob,id:100+i,hitPoints:100};
    s.combat.activeAttack={player:s.one.p,targetId:999,credited:false};
    expect(s.combat.killExperience(s.mob,s.one.p,s.one.p,100)).toBe(100);
    expect(e.streak).toBe(5);expect(e.streakUntil).toBe(11500);
    s.combat.activeAttack={player:s.one.p,targetId:50,credited:false};
    expect(s.combat.killExperience(s.mob,s.one.p,s.one.p,100)).toBe(175);
    expect(e.streakUntil).toBe(11500);
});
