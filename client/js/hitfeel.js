// Balanced combat presentation. Damage, positions and animation callbacks remain authoritative.
define(function () {
    const DEFAULT_OPTIONS = Object.freeze({flash:true,squash:true,slash:true,recoil:true,freeze:true,
        particles:true,shake:true,audio:true,shatter:true,intense:false});
    const PRESETS = {
        subtle: {flash:50,recoil:3,freeze:30,sparks:8,shake:1},
        balanced: {flash:65,recoil:5,freeze:45,sparks:12,shake:1},
        arcade: {flash:80,recoil:8,freeze:65,sparks:18,shake:2}
    };
    class HitFeel {
        constructor(game) {
            this.game=game;this.enabled=true;this.impacts=[];
            this.clear();
            this.bindAudioGestures();
        }
        get options() { return this.game.app.settings.getHitFeelOptions?.() ?? DEFAULT_OPTIONS; }
        get preset() { return this.options.intense ? 'arcade' : 'balanced'; }
        clear() { this.impacts=[];this.combo=0;this.lastHit=null;this.lastSound=null;this.shakeStartedAt=null;this.shakeMultiplier=1;this.mapId=this.game.mapId;this.sessionId=this.game.sessionId; }
        sync() { if(this.mapId!==this.game.mapId||this.sessionId!==this.game.sessionId)this.clear(); }
        active() { return this.enabled && this.game.started && !this.game.isStopped && this.game.player && !this.game.player.isDead; }
        visuals() { return this.active() && this.game.app.settings.getCombatEffectsEnabled(); }
        motion() { return this.visuals() && !this.game.app.settings.getReducedMotion(); }
        bindAudioGestures() {
            if(typeof document==='undefined'||this.unlockAudio)return;
            this.unlockAudio=()=>{if(this.active()&&this.options.audio)this.game.audioManager?.prepareImpactAudio?.();};
            document.addEventListener('pointerdown',this.unlockAudio);document.addEventListener('keydown',this.unlockAudio);
        }
        dispose() {
            if(this.unlockAudio){document.removeEventListener('pointerdown',this.unlockAudio);document.removeEventListener('keydown',this.unlockAudio);this.unlockAudio=null;}
            this.clear();
        }
        addPlayerImpact(damage, time, attacker) {
            const player = this.game.player;
            const heavy = player?.maxHitPoints > 0 && damage >= player.maxHitPoints * .15;
            this.recordImpact(player, damage, time, heavy, attacker);
        }
        addImpact(entity, damage, time, critical) {
            this.recordImpact(entity, damage, time, critical, this.game.player);
        }
        recordImpact(entity, damage, time, strong, source) {
            this.sync();
            if(!this.active()||!entity||!Number.isFinite(damage)||damage<=0||!Number.isFinite(time)||
                ![entity.x,entity.y,this.game.player.x,this.game.player.y].every(Number.isFinite)||this.game.entities[entity.id]!==entity)return;
            const incoming = entity === this.game.player;
            const hasOrigin = Number.isFinite(source?.x) && Number.isFinite(source?.y);
            const dx = hasOrigin ? entity.x - source.x : 0;
            const dy = hasOrigin ? entity.y - source.y : 0;
            const horizontal = Math.abs(dx) >= Math.abs(dy);
            const impact={entity,startedAt:time,strong,incoming,lethal:entity.hitPoints===0&&entity.maxHitPoints>0,
                dirX:horizontal ? Math.sign(dx) : 0,
                dirY:horizontal ? 0 : Math.sign(dy),
                x:entity.x+8,y:entity.y+4,
                sourceX:hasOrigin ? source.x+8 : null,sourceY:hasOrigin ? source.y+6 : null,sprite:entity.normalSprite||entity.sprite,
                frame:entity.currentAnimation?{...entity.currentAnimation.currentFrame}:null,
                poses:incoming ? [] : [source,entity].filter(actor=>actor.currentAnimation?.name?.startsWith('atk')).map(actor=>({actor,animation:actor.currentAnimation,frame:{...actor.currentAnimation.currentFrame}}))};
            // Older servers and damage without a visible attacker still get a short flinch.
            if (incoming && !dx && !dy) impact.dirY = -1;
            this.impacts.push(impact);if(this.impacts.length>24)this.impacts.shift();
            if (incoming) {
                this.addShake(time, strong ? 2 : 1.3);
                return;
            }
            this.combo=this.lastHit!==null && time-this.lastHit<1600 ? Math.min(5,this.combo+1):1;this.lastHit=time;
            if(strong||impact.lethal)this.addShake(time,strong ? 1.4 : 1);
            // AoE packets in one frame share one sound; the existing audio switch is authoritative.
            if(this.options.audio && (this.lastSound===null||time-this.lastSound>=60)){
                this.lastSound=time;this.game.audioManager?.playConfirmedImpact?.(this.combo,strong);
            }
        }
        finish(entity,time) {
            this.sync();if(!this.motion()||!this.options.shatter)return;
            const impact=this.latest(entity,time);
            if(impact?.lethal && time-impact.startedAt<500 && impact.finishedAt===undefined){impact.finishedAt=time;}
        }
        addShake(time,multiplier=1) {
            this.sync();
            if(!this.active()||this.game.app.settings.getReducedMotion()||!this.options.shake||this.game.app.settings.getCameraShakeEnabled?.()===false)return;
            // Critical AoE, a counter packet and a kill can describe the same impact.
            // Share one bounded pulse rather than extending it with each packet.
            if(this.shakeStartedAt===null||time-this.shakeStartedAt>=150){
                this.shakeStartedAt=time;this.shakeMultiplier=multiplier;
            }
        }
        getShake(time) {
            const age=this.shakeStartedAt===null?150:time-this.shakeStartedAt;
            if(!this.active()||!this.options.shake||this.game.app.settings.getReducedMotion()||
                this.game.app.settings.getCameraShakeEnabled?.()===false||age<0||age>=150)return{x:0,y:0};
            const strength=PRESETS[this.preset].shake*this.shakeMultiplier*(1-age/150);
            return{x:Math.round(Math.cos(age/11)*strength),y:Math.round(Math.sin(age/15)*strength*.6)};
        }
        latest(entity,time) {
            this.sync();
            for(let i=this.impacts.length-1;i>=0;i--){const impact=this.impacts[i];if(impact.entity===entity&&time>=impact.startedAt)return impact;}
        }
        getOffset(entity,time) {
            if(!this.motion()||!this.options.recoil||entity.isDead||this.game.entities[entity.id]!==entity)return{x:0,y:0};
            const impact=this.latest(entity,time),age=impact?time-impact.startedAt:Infinity;
            const distance=age<200?Math.round(PRESETS[this.preset].recoil*(impact.strong?1.4:1)*Math.pow(1-age/200,2)):0;
            if (!distance) return {x:0,y:0};
            return{x:impact.dirX*distance,y:impact.dirY*distance};
        }
        pose(entity,animation,time) {
            if(!this.motion()||!this.options.freeze||entity.isDead)return null;
            for(let i=this.impacts.length-1;i>=0;i--){
                const impact=this.impacts[i],age=time-impact.startedAt;
                if(age<0||age>=PRESETS[this.preset].freeze+(impact.strong?15:0))continue;
                const pose=impact.poses.find(p=>p.actor===entity&&p.animation===animation);
                if(pose)return pose.frame;
            }
            return null;
        }
        decorate(entity,data,scale,time) {
            if(!this.visuals()||this.game.entities[entity.id]!==entity)return;
            const impact=this.latest(entity,time);if(!impact || (impact.incoming && entity.pixelDissolve))return;
            const age=time-impact.startedAt,c=PRESETS[this.preset],motion=this.motion();
            const finished=impact.finishedAt!==undefined && time-impact.finishedAt<500;
            if(age>=220&&!finished)return;
            const amount=motion&&this.options.squash&&age<170?.16*Math.pow(1-age/170,2):0;
            data.hitFeel={flash:this.options.flash&&age<(impact.incoming ? c.flash+35 : c.flash),
                flashColor:impact.incoming && (!motion || age>=45) ? '#ff7068' : undefined,
                squashX:1+amount,squashY:1-amount,
                shatter:finished&&motion&&this.options.shatter?(time-impact.finishedAt)/500:null,
                shatterStrength:this.options.intense?1.5:1};
            if(data.hitFeel.shatter!==null && impact.sprite?.name && impact.frame){
                const sprite=impact.sprite,frame=impact.frame;
                data.drawData=data.drawData.filter(draw=>draw.spriteName==='shadow16');
                data.drawData.push({spriteName:sprite.name,sx:frame.x,sy:frame.y,sW:sprite.width,sH:sprite.height,
                    dx:sprite.offsetX*scale,dy:sprite.offsetY*scale,dW:sprite.width*scale,dH:sprite.height*scale});
            }
        }
        frame(time) {
            this.sync();
            if(!this.active()){this.clear();return {impacts:[],shake:{x:0,y:0},hitFeel:[]};}
            this.impacts=this.impacts.filter(i=>time-(i.finishedAt??i.startedAt)<500 && this.game.entities[i.entity.id]===i.entity);
            const shake=this.getShake(time);
            if(!this.motion())return {impacts:[],shake,hitFeel:[]};
            const c=PRESETS[this.preset],o=this.options;
            return {impacts:[],shake,hitFeel:this.impacts.filter(i=>time-i.startedAt>=0&&time-i.startedAt<280).map(i=>({
                x:i.x,y:i.y,sourceX:i.sourceX,sourceY:i.sourceY,dirX:i.dirX,dirY:i.dirY,
                age:time-i.startedAt,sparks:o.particles?c.sparks:0,
                slash:o.slash&&!i.incoming,critical:i.strong,incoming:i.incoming
            }))};
        }
    }
    return HitFeel;
});
