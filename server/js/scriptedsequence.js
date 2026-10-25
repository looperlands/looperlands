const S=require('../../shared/js/scriptedsequences'),C=require('../../shared/js/mapmakerauthoring');
const {randomUUID}=require('crypto');
const eventNames={SPAWNED:'player.spawned',QUEST_COMPLETED:'quest.completed',NPC_TALKED:'npc.talked',KILL_MOB:'player.killed_mob',TRIGGER_ACTIVATED:'trigger.activated'};
class SequenceDirector {
    constructor(world,definitions,now=Date.now) {this.world=world;this.definitions=definitions.filter(d=>d.enabled);this.now=now;this.runs=new Map();this.pending=[];this.players=new Map();this.cooldowns=new Map();}
    event(player,type,data={}) {
        const name=eventNames[type];if(!name)return;
        const value=data.quest?.id??data.npc?.kind??data.mob?.kind??data.trigger;
        for(const definition of this.definitions)if(S.matches(definition.when,name,{value}))this.enqueue(player,definition);
    }
    enqueue(player,definition) {
        if(this.runs.get(player.id)?.definition.id===definition.id||this.pending.length>=100||this.pending.some(p=>p.player===player&&p.definition.id===definition.id))return;
        this.pending.push({player,definition,expires:this.now()+15000});
    }
    memory() {return this.world.server.npcMemory;}
    allowed(player,definition) {
        if(this.world.players[player.id]!==player||!player.hasEnteredGame||player.isDead||player.isBot?.())return false;
        const key=String(player.nftId||player.id)+':'+definition.id;
        if((this.cooldowns.get(key)||0)>this.now()||(definition.repeat==='once'&&this.memory()?.has(this.mapId(),definition.id,player,'sequence-finished')))return false;
        const data=this.world.server.cache.get(player.sessionId)?.gameData||{},quests=data.quests||{};
        return definition.conditions.every(condition=>C.condition(condition,{items:data.items,kills:data.mobKills,level:player.getLevel?.()||1,triggers:Object.keys(this.world.doorTriggers||{}).filter(id=>this.world.doorTriggers[id]),openQuests:(quests.IN_PROGRESS||[]).map(q=>q.id),completedQuests:(quests.FINISHED||[]).map(q=>q.id)}));
    }
    mapId(){return this.world.id.replace(/^world_/,'');}
    emit(run,packet) {run.player.connection?._connection?.emit('scripted-sequence',{runId:run.id,name:run.definition.name,...packet});}
    start(player,definition) {
        if(this.runs.has(player.id)||player.sequenceLock||!this.allowed(player,definition))return false;
        const behavior=this.world.npcBehavior,keys=[...new Set(definition.steps.map(s=>s.actor).filter(Boolean))];
        const actors=keys.map(key=>behavior?.routines.get(key));
        if(actors.some(actor=>!actor||actor.sceneOwner||actor.listeners?.size||behavior?.conversation?.definition.steps.some(s=>s.npc===actor.definition.key)||this.world.entities[actor.npc.id]!==actor.npc))return false;
        const run={id:randomUUID(),player,definition,index:0,started:this.now(),next:this.now(),actors:actors.map(actor=>({actor,route:actor.definition.route,waypoint:actor.waypoint,pause:actor.pauseUntil,override:actor.scheduleOverride}))};
        for(const {actor} of run.actors){actor.sceneOwner=run;actor.scheduleOverride={activity:'cutscene',location:definition.name};actor.path=[];actor.pauseUntil=Infinity;}
        this.runs.set(player.id,run);if(definition.cinematic)player.sequenceLock=run.id;
        const socket=player.connection?._connection;
        run.skip=packet=>{if(packet?.runId===run.id&&definition.skippable)this.finish(run,true,'skipped');};socket?.on('sequence-skip',run.skip);
        this.emit(run,{type:'start',cinematic:definition.cinematic,skippable:definition.skippable,actors:run.actors.map(({actor})=>actor.npc.getState())});return true;
    }
    tick() {
        const time=this.now();
        for(const player of Object.values(this.world.players)) {
            if(!player.hasEnteredGame||player.isDead)continue;
            let seen=this.players.get(player.id);if(!seen){seen=new Map();this.players.set(player.id,seen);this.event(player,'SPAWNED');}
            for(const definition of this.definitions.filter(d=>d.when.type==='area.entered')) {
                const entered=S.inside(player,definition.when),was=seen.get(definition.id);seen.set(definition.id,entered);if(entered&&!was)this.enqueue(player,definition);
            }
        }
        for(const id of this.players.keys())if(!this.world.players[id])this.players.delete(id);
        const pending=this.pending;this.pending=[];
        for(const task of pending)if(task.expires>=time&&this.allowed(task.player,task.definition)&&!this.start(task.player,task.definition))this.pending.push(task);
        for(const run of this.runs.values()) {
            if(this.world.players[run.player.id]!==run.player||run.player.isDead||time-run.started>330000||run.actors.some(({actor})=>this.world.entities[actor.npc.id]!==actor.npc)){this.finish(run,false,'cancelled');continue;}
            if(time-(run.heartbeat||0)>4000){this.emit(run,{type:'heartbeat',actors:run.actors.map(({actor})=>actor.npc.getState())});run.heartbeat=time;}
            try{this.advance(run,time);}catch(error){console.error('Sequence '+run.definition.id+' stopped: '+error.message);this.finish(run,false,'failed');}
        }
    }
    advance(run,time) {
        if(!run.moving&&time<run.next)return;
        const step=run.definition.steps[run.index];if(!step){this.finish(run,true,'completed');return;}
        const behavior=this.world.npcBehavior,actor=step.actor&&behavior?.routines.get(step.actor);
        if(run.moving){
            if(run.actorX!==actor.npc.x||run.actorY!==actor.npc.y){
                const teleport=Math.abs(run.actorX-actor.npc.x)+Math.abs(run.actorY-actor.npc.y)>1;
                run.actorX=actor.npc.x;run.actorY=actor.npc.y;
                this.emit(run,{type:'actor_move',actorId:actor.npc.id,x:actor.npc.x,y:actor.npc.y,actor:actor.npc.getState(),teleport,durationMs:teleport?0:Math.max(200,Math.min(1900,actor.definition.stepMs-100))});
            }
            if(actor.npc.x===step.x&&actor.npc.y===step.y){
                // Server positions lead the rendered walk by one tile. Let its final movement finish.
                actor.pauseUntil=Infinity;run.arrivalAt??=Math.max(time,actor.nextStep);
                if(time>=run.arrivalAt){this.emit(run,{type:'move_complete',actorId:actor.npc.id,x:step.x,y:step.y});run.moving=false;run.index++;run.next=time;}
            }else if(time>=run.next)throw new Error('NPC could not reach its destination');
            return;
        }
        if(time<run.next)return;
        if(step.type==='move'){
            if(!behavior.walkable(step)||!(behavior.canReach?behavior.canReach(actor,step):(actor.npc.x===step.x&&actor.npc.y===step.y)||behavior.findPath(actor,step).length))throw new Error('NPC destination is unreachable');
            actor.definition.route=[{x:step.x,y:step.y,waitSeconds:600,activity:'cutscene'}];actor.waypoint=0;actor.path=[];actor.pauseUntil=time;actor.nextStep=time;run.moving=true;run.next=time+step.seconds*1000;run.arrivalAt=undefined;run.actorX=actor.npc.x;run.actorY=actor.npc.y;
            this.emit(run,{type:'step',step:{...step,actorId:actor.npc.id,actorX:actor.npc.x,actorY:actor.npc.y},index:run.index,total:run.definition.steps.length});return;
        }
        if(step.type==='face'){behavior.face(actor,step);this.emit(run,{type:'actor_state',actor:actor.npc.getState()});}
        if(step.type==='speech') {behavior.face(actor,run.player);behavior.speak(actor,step.text,run.player,true);actor.pauseUntil=Infinity;}
        if(step.type==='trigger_on')this.world.activateTrigger(step.value);
        if(step.type==='trigger_off')this.world.deactivateTrigger(step.value);
        if(!['face','trigger_on','trigger_off'].includes(step.type))this.emit(run,{type:'step',step:{...step,actorId:actor?.npc.id,...(actor?{actorState:actor.npc.getState()}:{})},index:run.index,total:run.definition.steps.length});
        run.index++;run.next=time+step.seconds*1000;
    }
    finish(run,completed,reason) {
        if(this.runs.get(run.player.id)!==run)return;
        this.runs.delete(run.player.id);if(run.player.sequenceLock===run.id)delete run.player.sequenceLock;
        run.player.connection?._connection?.off('sequence-skip',run.skip);
        for(const {actor,route,waypoint,pause,override} of run.actors)if(actor.sceneOwner===run){delete actor.sceneOwner;actor.definition.route=route;actor.waypoint=waypoint;actor.path=[];actor.scheduleOverride=override;actor.pauseUntil=Math.max(this.now()+500,Number.isFinite(pause)?pause:0);actor.nextStep=this.now()+500;}
        this.cooldowns.set(String(run.player.nftId||run.player.id)+':'+run.definition.id,this.now()+run.definition.cooldownSeconds*1000);
        if(completed&&run.definition.repeat==='once'){try{this.memory()?.remember(this.mapId(),run.definition.id,run.player,'sequence-finished');}catch(error){console.error('Could not remember sequence completion: '+error.message);}}
        this.emit(run,{type:'end',reason});
    }
    forget(player) {const run=this.runs.get(player.id);if(run)this.finish(run,false,'disconnected');this.pending=this.pending.filter(p=>p.player!==player);this.players.delete(player.id);}
}
module.exports={SequenceDirector};
