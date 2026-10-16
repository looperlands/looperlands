// Local-preview charges default on for mobile enemies, with narrow mechanic exclusions.
const Types=require('../../shared/js/gametypes');
const Properties=require('./properties');
const Formulas=require('./formulas');
const Messages=require('./message');
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
const same=(a,b)=>a.x===b.x&&a.y===b.y;
// These encounters are stationary or own a scripted special-attack cycle.
const SCRIPTED_KINDS=new Set(['tentacle','tentacle2','seacreature','megamag','cobslimeking','cobogre']);
class FieldAttacks {
    constructor(controller,random=Math.random){this.controller=controller;this.world=controller.world;this.random=random;this.attacks=new Map();this.cooldowns=new Map();this.serial=0;}
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
        const windup=650+Math.round(this.random()*300);
        const attack={id:++this.serial,mob,encounter,phase:'windup',direction,windup,until:now+windup,
            lane:[1,2].map(n=>({x:mob.x+direction.x*n,y:mob.y+direction.y*n})).filter(p=>this.world.isValidPosition(p.x,p.y))};
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
        const points=Math.max(1,Math.round(Formulas.dmg(player.getLevel()+player.getWeaponLevel(),mob.armorLevel)*multiplier*player.playerClassModifiers.meleeDamageDealt));
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
        for(const [id] of this.cooldowns)if(!this.world.entities[id])this.cooldowns.delete(id);
        for(const attack of this.attacks.values()){
            const {mob,encounter}=attack,player=encounter.player;
            if(this.world.entities[mob.id]!==mob||mob.hitPoints<=0||player.isDead||this.world.players[player.id]!==player
                ||this.controller.encounters.get(player.id)!==encounter||Number(mob.target)!==Number(player.id)
                ||Math.abs(player.x-mob.x)+Math.abs(player.y-mob.y)>8){this.release(attack);encounter.fieldCombo=null;continue;}
            if(now<attack.until)continue;
            if(attack.phase==='windup'){
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
                    const damage=Math.round(Formulas.dmg(mob.getWeaponLevel(),Math.round(player.getLevel()*.5))*2*player.playerClassModifiers.meleeDamageTaken);
                    const previousHp=player.hitPoints;
                    player.handleHurt(mob,damage);
                    if(player.hitPoints<previousHp)encounter.chargeHit=(encounter.chargeHit||0)+1;
                }else{
                    encounter.fieldCombo={mob,kind:'counter',until:now+1250};
                    this.event(encounter,mob,'Counter ready');
                }
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
    state(encounter){
        const mobState=mob=>({id:mob.id,x:mob.x,y:mob.y,hp:mob.hitPoints,maxHp:mob.maxHitPoints,level:mob.level});
        const attacks=[...this.attacks.values()].filter(a=>a.encounter===encounter).map(a=>({id:a.id,phase:a.phase,until:a.until,
            windup:a.windup,direction:a.direction,lane:a.lane,mob:mobState(a.mob)}));
        const combo=encounter.fieldCombo;
        return {fieldAttacks:attacks,fieldCombo:combo?{kind:combo.kind,until:combo.until,mob:mobState(combo.mob)}:null,fieldEvent:encounter.fieldEvent};
    }
}
module.exports=FieldAttacks;
