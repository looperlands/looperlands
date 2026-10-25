const {SequenceDirector}=require('./scriptedsequence'),S=require('../../shared/js/scriptedsequences');
const {validate}=require('./scriptedsequenceconfig');
function setup(steps,extra={}) {
    let time=1000;const packets=[],listeners=new Map(),memory=new Set();
    const player={id:1,nftId:'avatar',sessionId:'one',hasEnteredGame:true,x:2,y:2,getLevel:()=>5,connection:{_connection:{emit:(event,p)=>packets.push(p),on:(event,fn)=>listeners.set(event,fn),off:(event,fn)=>{if(listeners.get(event)===fn)listeners.delete(event);}}}};
    const actor={npc:{id:9,x:2,y:2,behaviorState:{},getState(){return [this.id,40,this.x,this.y,false,this.behaviorState];}},definition:{route:[{x:2,y:2}],stepMs:200},waypoint:0,pauseUntil:0,listeners:new Map()};
    const world={id:'world_one',players:{1:player},entities:{9:actor.npc},doorTriggers:{},server:{cache:{get:()=>({gameData:{items:{},quests:{FINISHED:[]}}})},npcMemory:{has:(map,id,p,key)=>memory.has(id+key),remember:(map,id,p,key)=>memory.add(id+key)}},npcBehavior:{routines:new Map([['host',actor]]),walkable:()=>true,canReach:()=>true,face:jest.fn(),speak:jest.fn(()=>true)},activateTrigger:jest.fn(),deactivateTrigger:jest.fn()};
    const definition={...S.create('meeting'),steps, ...extra},director=new SequenceDirector(world,[definition],()=>time);
    return {director,world,actor,player,definition,packets,listeners,memory,tick(t){time=t;director.tick();}};
}
test('timeline runs in order, restores routines and records one completion per avatar',()=>{
    const s=setup([{type:'move',actor:'host',x:4,y:4,seconds:5},{type:'speech',actor:'host',text:'Welcome',seconds:1},{type:'camera',x:4,y:4,seconds:2},{type:'trigger_on',value:'gate',seconds:0}]);
    const original=s.actor.definition.route;s.tick(1000);expect(s.player.sequenceLock).toBeTruthy();expect(s.actor.definition.route[0]).toMatchObject({x:4,y:4});
    s.actor.npc.x=4;s.actor.npc.y=4;s.tick(1200);s.tick(1400);expect(s.world.npcBehavior.speak).toHaveBeenCalledWith(s.actor,'Welcome',s.player,true);
    s.tick(2400);expect(s.packets.some(p=>p.step?.type==='camera')).toBe(true);s.tick(4400);s.tick(4600);
    expect(s.world.activateTrigger).toHaveBeenCalledWith('gate');expect(s.actor.definition.route).toBe(original);expect(s.player.sequenceLock).toBeUndefined();expect(s.memory.has('meetingsequence-finished')).toBe(true);expect(s.listeners.size).toBe(0);
    s.director.event(s.player,'SPAWNED');s.tick(100000);expect(s.director.runs.size).toBe(0);
});
test('skip is tied to the active run and restores actors without executing later gameplay actions',()=>{
    const s=setup([{type:'speech',actor:'host',text:'Hello',seconds:10},{type:'trigger_on',value:'gate',seconds:0}]);s.tick(1000);
    const skip=s.listeners.get('sequence-skip');skip({runId:'forged'});expect(s.director.runs.size).toBe(1);
    skip({runId:s.player.sequenceLock});expect(s.director.runs.size).toBe(0);expect(s.world.activateTrigger).not.toHaveBeenCalled();expect(s.actor.sceneOwner).toBeUndefined();expect(s.player.sequenceLock).toBeUndefined();
});
test('Move NPC sends follow positions and waits for the final tile before the next step',()=>{
    const s=setup([{type:'move',actor:'host',x:4,y:4,seconds:5},{type:'caption',text:'Arrived',seconds:1}]);
    s.tick(1000);
    expect(s.packets.find(p=>p.type==='start').actors).toEqual([s.actor.npc.getState()]);
    expect(s.packets.find(p=>p.step?.type==='move')?.step).toMatchObject({actorId:9,actorX:2,actorY:2,x:4,y:4});
    s.actor.npc.x=3;s.actor.nextStep=1400;s.tick(1200);
    expect(s.packets.at(-1)).toMatchObject({type:'actor_move',actorId:9,x:3,y:2});
    expect(s.packets.at(-1).actor).toEqual(s.actor.npc.getState());
    s.tick(1300);expect(s.packets.filter(p=>p.type==='actor_move')).toHaveLength(1);
    s.actor.npc.x=4;s.actor.npc.y=4;s.actor.nextStep=1600;s.tick(1400);
    expect(s.packets.some(p=>p.type==='move_complete')).toBe(false);
    expect(s.packets.some(p=>p.step?.type==='caption')).toBe(false);
    s.tick(1600);expect(s.packets.at(-1)).toMatchObject({type:'move_complete',actorId:9,x:4,y:4});
    s.tick(1800);expect(s.packets.at(-1).step).toMatchObject({type:'caption',text:'Arrived'});
});
test('NPC doorway transitions send a teleport snapshot instead of a walk across the map',()=>{
    const s=setup([{type:'move',actor:'host',x:80,y:70,seconds:15}]);s.tick(1000);
    s.actor.npc.x=80;s.actor.npc.y=70;s.actor.nextStep=1400;s.tick(1200);
    expect(s.packets.at(-1)).toMatchObject({type:'actor_move',actorId:9,x:80,y:70,teleport:true,durationMs:0});
});
test.each(['death','disconnect','missing actor','unreachable'])('%s cancels without completion and always releases the input lock',cause=>{
    const s=setup([{type:'move',actor:'host',x:4,y:4,seconds:5}]);s.tick(1000);
    if(cause==='death')s.player.isDead=true;if(cause==='disconnect')s.director.forget(s.player);if(cause==='missing actor')delete s.world.entities[9];if(cause==='unreachable')s.tick(6001);s.tick(7000);
    expect(s.director.runs.size).toBe(0);expect(s.player.sequenceLock).toBeUndefined();expect(s.actor.sceneOwner).toBeUndefined();expect(s.memory.size).toBe(0);
});
test('rectangle triggers fire on entry, respect requirements and repeat cooldowns',()=>{
    const s=setup([{type:'caption',text:'Entered',seconds:0}],{repeat:'repeat',cooldownSeconds:2,when:{type:'area.entered',value:'',x:1,y:1,width:4,height:4},conditions:[{type:'has.level',options:{level:3}}]});
    s.tick(1000);s.tick(1200);expect(s.packets.filter(p=>p.type==='start')).toHaveLength(1);s.tick(4000);expect(s.director.runs.size).toBe(0);
    s.player.x=8;s.tick(4200);s.player.x=2;s.tick(4400);expect(s.packets.filter(p=>p.type==='start')).toHaveLength(2);
});
test('shared NPCs cannot be borrowed by two scenes and queued attempts expire',()=>{
    const s=setup([{type:'speech',actor:'host',text:'Hello',seconds:30}]);s.tick(1000);
    const other={...s.player,id:2,nftId:'two',sequenceLock:undefined};s.world.players[2]=other;s.director.event(other,'SPAWNED');s.tick(1200);expect(s.director.runs.size).toBe(1);
    s.tick(18000);s.director.forget(s.player);s.tick(20000);expect(s.director.runs.size).toBe(0);
});
const catalog={width:20,height:20,collisions:[63],routines:[{id:'host'}],quests:[{id:'quest'}],npcs:[{id:40}],mobs:[{id:2}],sounds:[{id:'hit1'}],music:[{id:'forest'}]};
test('configuration validates a data-only timeline and all registered references',()=>{
    const row={...S.create(),steps:[{type:'move',actor:'host',x:4,y:4,seconds:10},{type:'speech',actor:'host',text:'<span class="dialogue-item">Welcome</span>',seconds:4},{type:'music',value:'forest',seconds:0}]};expect(()=>validate([row],catalog)).not.toThrow();
    for(const change of [{actor:'missing'},{x:3,y:3},{x:20},{seconds:0}]){const bad=structuredClone(row);Object.assign(bad.steps[0],change);expect(()=>validate([bad],catalog)).toThrow();}
    expect(()=>validate([{...row,steps:[{type:'eval',text:'code',seconds:0}]}],catalog)).toThrow('supported');
    expect(()=>validate([{...row,steps:[{type:'caption',text:'<script>bad()</script>',seconds:0}]}],catalog)).toThrow();
    expect(()=>validate([{...row,steps:Array(6).fill({type:'wait',seconds:60})}],catalog)).toThrow('five minutes');
});
test('event matching uses the exact triggering quest, NPC, mob or gate',()=>{
    for(const [type,data,when] of [['QUEST_COMPLETED',{quest:{id:'quest'}},{type:'quest.completed',value:'quest'}],['NPC_TALKED',{npc:{kind:40}},{type:'npc.talked',value:'40'}],['KILL_MOB',{mob:{kind:2}},{type:'player.killed_mob',value:'2'}],['TRIGGER_ACTIVATED',{trigger:'gate'},{type:'trigger.activated',value:'gate'}]]){
        const s=setup([{type:'wait',seconds:1}],{when});s.director.event(s.player,type,data);s.tick(1000);expect(s.director.runs.size).toBe(1);
    }
});
