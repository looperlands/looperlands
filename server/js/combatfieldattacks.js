// Charges default on for mobile enemies, with narrow mechanic exclusions.
const Types=require('../../shared/js/gametypes');
const Properties=require('./properties');
const Formulas=require('./formulas');
const Messages=require('./message');
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
const same=(a,b)=>a.x===b.x&&a.y===b.y;
// These encounters are stationary or own a scripted special-attack cycle.
const SCRIPTED_KINDS=new Set(['tentacle','tentacle2','seacreature','megamag','cobslimeking','cobogre']);
class FieldAttacks {
    constructor(controller,random=Math.random,options={}){
        this.controller=controller;this.world=controller.world;this.random=random;
        this.attacks=new Map();this.cooldowns=new Map();this.history=new Map();this.serial=0;
        // Only the isolated local runner opts into Slam while it is being playtested.
        this.slamEnabled=options.slam===true;
        this.attackMode=this.slamEnabled?'mixed':'lunge';
    }
    setMode(mode){
        if(!this.slamEnabled||!['mixed','lunge','slam'].includes(mode))return false;
        this.attackMode=mode;return true;
    }
    supportsSlam(player){return this.controller.encounters.get(player.id)?.patterns?.has('slam')===true;}
    patternFor(encounter,mob){
        if(!this.slamEnabled||!this.supportsSlam(encounter.player)||this.attackMode==='lunge')return 'lunge';
        // Do not expose nearby older clients to an attack they cannot display.
        if(Object.values(this.world.players).some(p=>!p.isDead&&Math.max(Math.abs(p.x-mob.x),Math.abs(p.y-mob.y))<=4&&!this.supportsSlam(p)))return 'lunge';
        if(this.attackMode==='slam')return 'slam';
        const previous=this.history.get(mob.id);
        if(previous?.count>=2)return previous.pattern==='slam'?'lunge':'slam';
        return this.random()<.5?'slam':'lunge';
    }
    slamTiles(mob){
        const tiles=[];
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            const x=mob.x+dx,y=mob.y+dy;
            if(this.world.isValidPosition(x,y)&&!this.world.map?.doors?.some(d=>d.x===x&&d.y===y))tiles.push({x,y});
        }
        return tiles;
    }
    canEscape(player,tiles,windup){
        const budget=Math.min(4,Math.floor((windup-100)/(player.getMoveSpeed?.()||120)));
        const queue=[{x:player.x,y:player.y,steps:0}],visited=new Set([player.x+','+player.y]);
        const unsafe=p=>tiles.some(t=>same(t,p))||[...this.attacks.values()].some(a=>a.phase!=='recovery'&&a.lane.some(t=>same(t,p)));
        for(let i=0;i<queue.length;i++){
            const p=queue[i];
            if(!unsafe(p))return true;
            if(p.steps>=budget)continue;
            for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
                const next={x:p.x+dx,y:p.y+dy,steps:p.steps+1},key=next.x+','+next.y;
                if(visited.has(key)||!this.controller.free(next.x,next.y,[player]))continue;
                visited.add(key);queue.push(next);
            }
        }
        return false;
    }
    hurt(attack,player,multiplier){
        const damage=Math.round(Formulas.dmg(attack.mob.getWeaponLevel(),Math.round(player.getLevel()*.5))*multiplier*player.playerClassModifiers.meleeDamageTaken);
        const previousHp=player.hitPoints;
        player.handleHurt(attack.mob,damage);
        const encounter=this.controller.encounters.get(player.id);
        if(encounter&&player.hitPoints<previousHp)encounter.chargeHit=(encounter.chargeHit||0)+1;
    }
    opening(attack,now){
        attack.encounter.fieldCombo={mob:attack.mob,kind:'counter',until:now+1250};
        this.event(attack.encounter,attack.mob,'Counter ready');
    }
    slam(attack,now){
        for(const player of Object.values(this.world.players)){
            if(!player.isDead&&player.hasEnteredGame!==false&&this.supportsSlam(player)&&attack.lane.some(p=>same(p,player)))this.hurt(attack,player,1.5);
        }
        if(!attack.encounter.player.isDead&&!attack.lane.some(p=>same(p,attack.encounter.player)))this.opening(attack,now);
    }
    eligible(mob){
        if(!mob||mob.type!=='mob'||this.controller.mobIds.has(Number(mob.id)))return false;
        const kind=Types.getKindAsString(mob.kind),props=Properties[kind];
        return !!props && !props.friendly && !SCRIPTED_KINDS.has(kind)
            && !props.aoe?.onTimer && !mob.specialInterval && !mob.addArray?.length;
    }
    held(mob){return !!mob && this.attacks.has(Number(mob.id));}
    intercept(encounter,mob,now){
        if(this.held(mob))return true;
        if(!this.eligible(mob)||mob.hitPoints<=0||Number(mob.target)!==Number(encounter.player.id)
            ||!adjacent(mob,encounter.player)||encounter.combo||encounter.fieldCombo
            ||['windup','lunge','round'].includes(encounter.phase)
            ||[...this.attacks.values()].some(a=>a.encounter===encounter))return false;
        const ready=this.cooldowns.get(mob.id);
        if(ready===undefined){this.cooldowns.set(mob.id,now+1200+this.random()*1800);return false;}
        if(now<ready)return false;
        this.cooldowns.set(mob.id,now+3000+this.random()*4000);
        if(this.random()>=.4)return false;
        const direction={x:Math.sign(encounter.player.x-mob.x),y:Math.sign(encounter.player.y-mob.y)};
        const pattern=this.patternFor(encounter,mob);
        const windup=pattern==='slam'?950+Math.round(this.random()*200):650+Math.round(this.random()*300);
        const lane=pattern==='slam'?this.slamTiles(mob):[1,2].map(n=>({x:mob.x+direction.x*n,y:mob.y+direction.y*n})).filter(p=>this.world.isValidPosition(p.x,p.y));
        if(pattern==='slam'&&(!lane.some(t=>same(t,encounter.player))||Object.values(this.world.players).some(p=>!p.isDead&&lane.some(t=>same(t,p))&&!this.canEscape(p,lane,windup))))return false;
        const previous=this.history.get(mob.id);
        this.history.set(mob.id,{pattern,count:previous?.pattern===pattern?previous.count+1:1});
        const attack={id:++this.serial,mob,encounter,pattern,phase:'windup',direction,windup,until:now+windup,lane};
        this.attacks.set(Number(mob.id),attack);
        this.controller.send(encounter);
        return true;
    }
    event(encounter,mob,label){encounter.fieldEvent={id:++this.serial,mobId:mob.id,label};}
    technique(encounter,mobId,now){
        const combo=encounter.fieldCombo,player=encounter.player,mob=combo?.mob;
        if(!mob||Number(mob.id)!==Number(mobId)||this.world.entities[mob.id]!==mob||mob.hitPoints<=0
            ||now>combo.until||now<encounter.lockUntil||!adjacent(player,mob))return;
        if(combo.kind!=='counter')return;
        encounter.fieldCombo=null;
        this.strike(encounter,mob,1.5,'Counter');
        this.controller.send(encounter);
    }
    strike(encounter,mob,multiplier,label){
        const player=encounter.player;
        const buff=player.getActiveBuff?.();
        const power=(player.getLevel()+player.getWeaponLevel())*(buff?.stat==='atk' ? 1+buff.percent/100 : 1);
        const points=Math.max(1,Math.round(Formulas.dmg(power,mob.armorLevel)*multiplier*player.playerClassModifiers.meleeDamageDealt));
        mob.receiveDamage(points,player.id);
        this.world.handleMobHate(mob.id,player.id,points*player.playerClassModifiers.hate);
        const previous=this.controller.activeAttack;
        this.controller.activeAttack={player,targetId:Number(mob.id),credited:false};
        try{this.world.handleHurtEntity(mob,player,points,true);}finally{this.controller.activeAttack=previous;}
        player.incrementNFTWeaponExperience(points);
        this.event(encounter,mob,label);
        if(mob.hitPoints<=0)encounter.fieldCombo=null;
    }
    release(attack){
        this.attacks.delete(Number(attack.mob.id));
        if(this.world.entities[attack.mob.id]===attack.mob && attack.mob.hitPoints>0 && attack.mob.target)this.world.broadcastAttacker(attack.mob);
    }
    clear(encounter){
        for(const attack of this.attacks.values())if(attack.encounter===encounter)this.release(attack);
        encounter.fieldCombo=null;
    }
    tick(now){
        for(const [id] of this.cooldowns)if(!this.world.entities[id]){this.cooldowns.delete(id);this.history.delete(id);}
        for(const attack of this.attacks.values()){
            const {mob,encounter}=attack,player=encounter.player;
            if(this.world.entities[mob.id]!==mob||mob.hitPoints<=0||player.isDead||this.world.players[player.id]!==player
                ||this.controller.encounters.get(player.id)!==encounter||Number(mob.target)!==Number(player.id)
                ||Math.abs(player.x-mob.x)+Math.abs(player.y-mob.y)>8){this.release(attack);encounter.fieldCombo=null;continue;}
            if(now<attack.until)continue;
            if(attack.phase==='windup'&&attack.pattern==='slam'){
                attack.phase='impact';attack.impactAt=now;attack.until=now+180;
                this.slam(attack,now);
            }else if(attack.phase==='impact'){
                attack.phase='recovery';attack.until=now+1500;attack.lane=[];
            }else if(attack.phase==='windup'){
                const destination=attack.lane[0];
                attack.phase='lunge';attack.until=now+180;
                if(destination&&this.controller.free(destination.x,destination.y,[mob])
                    &&(!encounter.nextTile||!same(destination,encounter.nextTile))){
                    mob.setPosition(destination.x,destination.y);this.world.handleEntityGroupMembership(mob);
                    this.world.pushToAdjacentGroups(mob.group,new Messages.Move(mob));
                }
            }else if(attack.phase==='lunge'){
                attack.phase='recovery';attack.until=now+1500;
                if(attack.lane.some(p=>same(p,player))){
                    this.hurt(attack,player,2);
                }else this.opening(attack,now);
                attack.lane=[];
            }else this.release(attack);
        }
        for(const encounter of this.controller.encounters.values()){
            const combo=encounter.fieldCombo;if(!combo)continue;
            if(this.world.entities[combo.mob.id]!==combo.mob||combo.mob.hitPoints<=0||encounter.player.isDead){encounter.fieldCombo=null;continue;}
            if(now<combo.until)continue;
            encounter.fieldCombo=null;
        }
    }
    mobState(mob){return {id:mob.id,x:mob.x,y:mob.y,hp:mob.hitPoints,maxHp:mob.maxHitPoints,level:mob.level};}
    attackState(a){return {id:a.id,pattern:a.pattern,phase:a.phase,until:a.until,impactAt:a.impactAt,windup:a.windup,direction:a.direction,lane:a.lane,
        targetId:a.encounter.player.id,mob:this.mobState(a.mob)};}
    visibleState(player){
        const entities=this.world.groups?.[player.group]?.entities || {};
        return [...this.attacks.values()].filter(a=>a.encounter.player===player || entities[a.mob.id]===a.mob).map(a=>this.attackState(a));
    }
    state(encounter){
        const combo=encounter.fieldCombo;
        return {fieldAttacks:[...this.attacks.values()].filter(a=>a.encounter===encounter).map(a=>this.attackState(a)),
            fieldCombo:combo?{kind:combo.kind,until:combo.until,mob:this.mobState(combo.mob)}:null,fieldEvent:encounter.fieldEvent};
    }
}
module.exports=FieldAttacks;
