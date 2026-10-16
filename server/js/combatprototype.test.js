const fs = require('fs');
const vm = require('vm');

function setup() {
    let time = 10000;
    const M = {AGGRO: 1, ATTACK: 2, HIT: 3, HURT: 4, SHOOT: 5, MOVE: 6, LOOTMOVE: 7};
    class Mob {
        constructor(id, kind, x, y) { Object.assign(this,{id,kind,x,y,type:'mob'}); }
        setPosition(x,y) { Object.assign(this,{x,y}); }
        spawn() { return {spawn:this.id}; }
        despawn() { return {despawn:this.id}; }
    }
    const packet = function(...args) { this.args = args; };
    const exported = {exports:{}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./combatprototype'), 'utf8'), {
        module: exported, require: name => name.endsWith('gametypes') ? {Messages:M,Entities:{OGRE:9}}
            : name==='./mob' ? Mob : {Damage:packet,Move:packet,Teleport:packet},
    });
    const {CombatPrototype,TIMING} = exported.exports;
    const socket = {emit:jest.fn(),on:jest.fn()};
    const player = {id:1,type:'player',x:10,y:10,hitPoints:45,maxHitPoints:100,hasEnteredGame:true,
        connection:{_connection:socket,listen_callback:jest.fn()},resetTimeout:jest.fn(),regenHealthBy:jest.fn(),handleExperience:jest.fn(),getLevel:()=>1,getActiveBuff:()=>null,playerClassModifiers:{xp:1},
        setPosition(x,y) { Object.assign(this,{x,y}); },health(){return {health:this.hitPoints};},getMoveSpeed:()=>120,getAttackRate:()=>800,move_callback:jest.fn()};
    const blocked = new Set();
    const world = {players:{1:player},entities:{1:player},map:{doors:[]},
        isValidPosition:(x,y)=>x>0&&y>0&&!blocked.has(`${x},${y}`),nextMobId:()=>100,
        handlePlayerVanish:jest.fn(),handleEntityGroupMembership:jest.fn(),pushRelevantEntityListTo:jest.fn(),
        pushToPlayer:jest.fn(),pushBroadcast:jest.fn(),pushToAdjacentGroups:jest.fn(),
        handleHurtEntity(entity,attacker){
            if(entity.hitPoints<=0 && this.entities[entity.id]===entity) {
                this.distributeExp(entity,attacker);delete this.entities[entity.id];
            }
        },
        addMob(mob){this.entities[mob.id]=mob;},removeEntity(mob){delete this.entities[mob.id];}};
    // Use the real XP distribution boundary so awarded XP and the existing KILL packet agree.
    const worldExport={exports:{}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./worldserver'),'utf8'),{
        module:worldExport,require:name=>{
            if(name==='./lib/class')return {Class:{extend:methods=>methods}};
            if(name==='./formulas')return {xp:()=>100,xpShare:(xp,total,damage)=>xp*damage/total};
            if(name==='./message')return {Kill:function(mob,xp){Object.assign(this,{mob,xp});}};
            return {};
        }
    });
    world.distributeExp=worldExport.exports.distributeExp;
    world.getEntityById=id=>world.entities[id];
    player.connection.listen_callback = jest.fn(([type,id])=>{
        if(type===M.HIT) for(const targetId of world.attackTargets || [id]) {
            const target=world.entities[targetId];if(target) world.handleHurtEntity(target,player,10);
        }
    });
    const controller = new CombatPrototype(world,()=>time);
    controller.bind(player); controller.command(player,{action:'enable'});
    const encounter=controller.encounters.get(1);
    return {controller,world,player,encounter,socket,blocked,M,TIMING,
        advance(ms){time+=ms;controller.tick();},
        move(x,y,next=null){controller.command(player,{action:'move',x,y,next,correction:encounter.correction});},
        technique(){controller.command(player,{action:'technique'});},
        windup(){time+=1200;controller.tick();time+=300;controller.tick();time+=800;controller.tick();time+=800;controller.tick();}};
}

test('locked lane survives a sidestep; evade, counter and committed finisher resolve on server time',()=>{
    const s=setup(); s.windup();
    expect(s.encounter.phase).toBe('windup');
    const lane=JSON.stringify(s.encounter.lane);
    s.advance(300); s.move(11,11);
    expect(JSON.stringify(s.encounter.lane)).toBe(lane);
    s.advance(550); expect(s.encounter.phase).toBe('lunge');
    s.advance(180); expect(s.encounter.combo).toBe('counter');
    const hp=s.encounter.mob.hitPoints;
    s.technique(); expect(s.encounter.mob.hitPoints).toBe(hp-22);
    expect(s.encounter.combo).toBe('finisher');
    s.technique(); expect(s.encounter.phase).toBe('finisher');
    const before={x:s.player.x,y:s.player.y};
    s.move(12,11); expect({x:s.player.x,y:s.player.y}).toEqual(before);
    s.advance(379); expect(s.encounter.mob.hitPoints).toBe(hp-22);
    s.advance(1); expect(s.encounter.mob.hitPoints).toBe(hp-66);
    expect(s.encounter.phase).toBe('stagger');
});

test('remaining in the lane hurts, while backing up along it is also unsafe',()=>{
    const s=setup(); s.windup();
    s.advance(300); s.move(10,12);
    s.advance(550); s.advance(180);
    expect(s.player.hitPoints).toBe(60);
    expect(s.encounter.combo).toBeNull();
});

test('ordinary destination MOVE and legacy hit messages cannot bypass encounter rules',()=>{
    const s=setup();
    expect(s.controller.intercept(s.player,[s.M.MOVE,30,30])).toBe(true);
    expect(s.player.x).toBe(10);
    for(const type of [s.M.HIT,s.M.HURT,s.M.ATTACK,s.M.AGGRO]) {
        expect(s.controller.intercept(s.player,[type,100])).toBe(true);
    }
    expect(s.controller.intercept({id:2},[s.M.HIT,100])).toBe(true);
});

test('steps reject warps, walls, occupied tiles, corner cutting and excessive speed',()=>{
    const s=setup(); s.advance(300);
    s.move(20,20); expect(s.player.x).toBe(10);
    s.blocked.add('11,11'); s.move(11,11); expect(s.player.x).toBe(10);
    s.move(11,12); expect(s.player.x).toBe(10);
    s.blocked.clear(); s.move(11,11); expect(s.player.x).toBe(11);
    s.move(12,11);expect(s.player.x).toBe(12);
    s.move(13,11);s.move(14,11);expect(s.player.x).toBeLessThan(14);
});

test('counter cannot fire early, out of range, or after its deadline',()=>{
    const s=setup(); s.technique(); expect(s.encounter.mob.hitPoints).toBe(160);
    s.windup(); s.advance(300); s.move(11,11); s.advance(550); s.advance(180);
    const hp=s.encounter.mob.hitPoints;
    s.advance(200); s.move(12,11); s.technique(); expect(s.encounter.combo).toBe('counter');
    s.advance(1300); s.technique(); expect(s.encounter.combo).toBeNull();
    expect(s.encounter.mob.hitPoints).toBe(hp);
});

test('reset cancels a pending finisher; disable removes the trainer and restores health and position',()=>{
    const s=setup(); s.windup(); s.advance(300);s.move(11,11);s.advance(550);s.advance(180);
    s.technique();s.technique();
    s.controller.command(s.player,{action:'reset'});s.advance(400);
    expect(s.encounter.mob.hitPoints).toBe(160);
    s.controller.command(s.player,{action:'disable'});
    expect(s.controller.encounters.size).toBe(0);expect(s.world.entities[100]).toBeUndefined();
    expect([s.player.x,s.player.y,s.player.hitPoints]).toEqual([10,10,45]);
    expect(s.controller.intercept(s.player,[s.M.MOVE,12,12])).toBe(false);
});

test('disconnect cleans up without restoring a departed player or leaving a damaging timer',()=>{
    const s=setup();s.windup();
    const disconnect=s.socket.on.mock.calls.find(([name])=>name==='disconnect')[1];
    delete s.world.players[1];disconnect();s.advance(5000);
    expect(s.controller.encounters.size).toBe(0);expect(s.world.entities[100]).toBeUndefined();
});

test('practice damage persists rather than being erased by ordinary world regeneration',()=>{
    const s=setup();s.player.regenHealthBy(5);expect(s.player.hitPoints).toBe(100);
    s.windup();s.advance(850);s.advance(180);
    expect(s.player.hitPoints).toBe(60);
    s.player.regenHealthBy(5);expect(s.player.hitPoints).toBe(60);
});


test('two ordinary strikes precede a charged lunge, then the pattern repeats',()=>{
    const s=setup();s.advance(1200);s.advance(300);
    expect(s.encounter.event.kind).toBe('mob-attack');expect(s.player.hitPoints).toBe(92);
    s.advance(800);expect(s.encounter.event.kind).toBe('mob-attack');expect(s.player.hitPoints).toBe(84);
    s.advance(800);expect(s.encounter.phase).toBe('windup');expect(s.encounter.strikes).toBe(0);
    s.advance(850);s.advance(180);s.advance(1250);s.advance(500);
    expect(s.encounter.event.kind).toBe('mob-attack');
});

test('attacking other mobs keeps normal combat messages and following callbacks active',()=>{
    const s=setup();
    for (const type of [s.M.ATTACK,s.M.HIT,s.M.HURT,s.M.AGGRO,s.M.SHOOT]) {
        expect(s.controller.intercept(s.player,[type,200])).toBe(false);
    }
    expect(s.encounter.selected).toBe(false);
    s.advance(300);s.move(11,11);
    expect(s.player.move_callback).toHaveBeenCalledWith(11,11);
    s.controller.command(s.player,{action:'select',mobId:100});
    expect(s.encounter.selected).toBe(true);
    s.encounter.lockUntil=999999;
    expect(s.controller.intercept(s.player,[s.M.HIT,200])).toBe(true);
});

test('kill streak XP grows within 1.5 seconds, caps at 75 percent, and matches the normal XP packet',()=>{
    const s=setup();
    const kill=id=>{
        const mob={id,type:'mob',hitPoints:0,level:1,dmgTakenArray:[{id:1,dmg:10}]};s.world.entities[id]=mob;
        s.player.connection.listen_callback([s.M.HIT,id]);s.player.connection.listen_callback([s.M.HIT,id]);
        return s.world.pushToPlayer.mock.calls.filter(([,msg])=>msg.xp!==undefined).at(-1)[1].xp;
    };
    expect(kill(201)).toBe(100);
    s.advance(1000);expect(kill(202)).toBe(125);
    s.advance(1000);expect(kill(203)).toBe(150);
    expect(kill(204)).toBe(175);expect(kill(205)).toBe(175);
    expect(s.player.handleExperience.mock.calls.map(([xp])=>xp)).toEqual([100,125,150,175,175]);
    expect(s.player.getAttackRate()).toBe(800);
    s.advance(1499);expect(s.encounter.streak).toBe(5);
    s.advance(1);expect(s.encounter.streak).toBe(0);
    expect(kill(206)).toBe(100);expect(s.encounter.streak).toBe(1);
});

test('assists, live targets, and trainer rounds cannot award streak XP',()=>{
    const s=setup();
    const mob={id:201,type:'mob',hitPoints:10};s.world.entities[201]=mob;
    expect(s.controller.killExperience(mob,s.player,s.player,100)).toBe(100);
    mob.hitPoints=0;
    expect(s.controller.killExperience(mob,s.player,{id:2},100)).toBe(100);
    s.controller.damage(s.encounter,160,'Finisher');
    expect(s.encounter.streak).toBe(0);
});

test('landing a finisher awards combo XP once; cancelled finishers award nothing',()=>{
    const s=setup();s.windup();s.advance(300);s.move(11,11);s.advance(550);s.advance(180);
    s.technique();s.technique();s.advance(380);s.advance(100);
    expect(s.player.handleExperience).toHaveBeenCalledTimes(1);
    expect(s.player.handleExperience).toHaveBeenCalledWith(25);
    const t=setup();t.windup();t.advance(300);t.move(11,11);t.advance(550);t.advance(180);
    t.technique();t.technique();t.controller.command(t.player,{action:'reset'});t.advance(380);
    expect(t.player.handleExperience).not.toHaveBeenCalled();
});

test('two legitimately completed tiles arriving together after a slow frame do not snap back',()=>{
    const s=setup();s.advance(300);
    s.move(11,11);s.move(12,11);
    expect([s.player.x,s.player.y]).toEqual([12,11]);
    expect(s.encounter.correction).toBe(1);
});

test('automatic round restart keeps the player position and ordinary target selection',()=>{
    const s=setup();s.advance(300);s.move(11,11);
    s.encounter.selected=false;
    const correction=s.encounter.correction;
    s.controller.endRound(s.encounter,'Victory');
    expect(s.encounter.lockUntil).toBe(0);
    s.advance(2000);
    expect([s.player.x,s.player.y]).toEqual([11,11]);
    expect(s.encounter.selected).toBe(false);
    expect(s.encounter.correction).toBe(correction);
});


test('steps queued before a correction cannot cause a chain of new corrections',()=>{
    const s=setup();s.advance(300);const old=s.encounter.correction;
    s.move(20,20);const corrected=s.encounter.correction;
    s.controller.command(s.player,{action:'move',x:11,y:11,correction:old});
    expect(s.encounter.correction).toBe(corrected);expect(s.player.x).toBe(10);
    s.move(11,11);expect(s.player.x).toBe(11);
});

test('trainer respects the tile a player is already walking into',()=>{
    const s=setup();s.advance(300);
    s.move(10,11,{x:11,y:11});
    expect(s.controller.trainerCanMove(s.encounter,{x:11,y:11})).toBe(false);
    s.move(11,11);expect(s.encounter.nextTile).toBeNull();
});

test('two diagonal completions can arrive together, but unlimited idle speed credit is not allowed',()=>{
    const s=setup();s.advance(10000);
    s.move(11,12);s.move(12,13);
    expect([s.player.x,s.player.y]).toEqual([12,13]);
    s.move(13,14);expect([s.player.x,s.player.y]).toEqual([12,13]);
});


test('AoE kills count at most one streak step and only the primary target earns bonus XP',()=>{
    const s=setup();
    const spawn=id=>{s.world.entities[id]={id,type:'mob',hitPoints:0,level:1,dmgTakenArray:[{id:1,dmg:10}]};};
    [201,202,203,204,205].forEach(spawn);
    s.world.attackTargets=[201,202,203]; // A splash kill happens before the primary kill.
    s.player.connection.listen_callback([s.M.HIT,202]);
    expect(s.encounter.streak).toBe(1);
    expect(s.player.handleExperience.mock.calls.map(([xp])=>xp)).toEqual([100,100,100]);
    s.world.attackTargets=[204,205];
    s.player.connection.listen_callback([s.M.HIT,204]);
    expect(s.encounter.streak).toBe(2);
    expect(s.player.handleExperience.mock.calls.map(([xp])=>xp)).toEqual([100,100,100,125,100]);
    expect(s.controller.activeAttack).toBeUndefined();
});

test('splash kills without a primary-target kill do not start or refresh the streak',()=>{
    const s=setup();
    s.world.entities[201]={id:201,type:'mob',hitPoints:50,level:1,dmgTakenArray:[{id:1,dmg:10}]};
    s.world.entities[202]={id:202,type:'mob',hitPoints:0,level:1,dmgTakenArray:[{id:1,dmg:10}]};
    s.world.attackTargets=[202,201];s.player.connection.listen_callback([s.M.HIT,201]);
    expect(s.encounter.streak).toBe(0);expect(s.encounter.streakUntil).toBe(0);
    expect(s.player.handleExperience).toHaveBeenCalledWith(100);
});


test('ordinary actor destinations do not reject visible free tiles, but the trainer still blocks movement',()=>{
    const s=setup();s.advance(300);
    s.world.entities[200]={id:200,type:'mob',x:11,y:11};
    s.move(10,11,{x:11,y:11});
    expect(s.encounter.nextTile).toEqual({x:11,y:11});
    s.move(11,11);
    expect([s.player.x,s.player.y]).toEqual([11,11]);
    expect(s.encounter.stats.corrections).toBe(0);
    s.encounter.mob.setPosition(12,11);
    s.advance(120);s.move(12,11);
    expect([s.player.x,s.player.y]).toEqual([11,11]);
    expect(s.encounter.stats.corrections).toBe(1);
});
