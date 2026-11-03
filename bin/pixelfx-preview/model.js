// Deliberately simulated gameplay for the visual playground. No production hooks.
(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.FxPlayground=factory();
})(typeof window!=='undefined'?window:null,function(){
    const TILE=16;
    const hazardSpecs={pillar:{warning:1000,active:1100,damage:20},meteor:{warning:1200,active:150,damage:30},flamethrower:{warning:900,active:1800,damage:15}};
    class Playground {
        constructor(){this.reset();}
        reset(){
            this.time=0;this.player={x:176,y:144,hp:100,direction:'right',dead:false};
            this.enemy={x:208,y:144,frozenUntil:0,immuneUntil:0};
            this.hazards=[];this.events=[];this.hits=0;this.serial=0;
            this.freezeReady=0;this.deadAt=null;this.attackAt=-Infinity;this.counterUntil=0;
            this.enemyCharge=null;this.companion=false;
        }
        emit(type,values={}){this.events.push({id:++this.serial,type,at:this.time,...values});}
        drain(){const result=this.events;this.events=[];return result;}
        move(dx,dy,dt){
            if(this.player.dead)return;
            const length=Math.hypot(dx,dy);if(!length)return;
            this.player.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
            this.player.x=Math.max(24,Math.min(360,this.player.x+dx/length*dt*.085));
            this.player.y=Math.max(48,Math.min(216,this.player.y+dy/length*dt*.085));
        }
        attack(style='sparks',critical=false){
            if(this.player.dead||this.time-this.attackAt<300)return false;
            this.attackAt=this.time;this.emit('swing');
            if(Math.hypot(this.enemy.x-this.player.x,this.enemy.y-this.player.y)>44){this.emit('miss');return false;}
            this.hits++;this.emit('impact',{style:critical?'critical':style,x:this.enemy.x,y:this.enemy.y});return true;
        }
        counter(style='holy',freeze=false){
            if(this.player.dead)return false;
            // The explicit preview button demonstrates a confirmed counter without a prerequisite.
            if(Math.hypot(this.enemy.x-this.player.x,this.enemy.y-this.player.y)>44){this.emit('miss');return false;}
            this.attackAt=this.time;this.hits++;this.emit('impact',{style,x:this.enemy.x,y:this.enemy.y});
            if(freeze&&this.time>=this.freezeReady&&this.time>=this.enemy.immuneUntil){
                this.enemy.frozenUntil=this.time+3000;this.enemy.immuneUntil=this.time+9000;
                this.freezeReady=this.time+10000;this.emit('frozen');
            }
            return true;
        }
        charge(){
            if(this.player.dead||this.enemyCharge||this.enemy.frozenUntil>this.time)return;
            const p=this.player;
            this.enemyCharge={x:p.x,y:p.y,until:this.time+1000};this.emit('charge');
        }
        die(style='embers'){
            if(this.player.dead)return;
            this.player.dead=true;this.player.hp=0;this.deadAt=this.time;
            this.enemyCharge=null;this.counterUntil=0;this.emit('death',{style,x:this.player.x,y:this.player.y});
        }
        respawn(style='portal'){
            this.player.dead=false;this.player.hp=100;this.deadAt=null;
            this.hazards=[];this.enemyCharge=null;this.emit('arrival',{style,x:this.player.x,y:this.player.y});
        }
        hazard(kind){
            if(!hazardSpecs[kind]||this.player.dead)return;
            const spec=hazardSpecs[kind],p=this.player;
            const x=Math.floor(p.x/TILE)*TILE+8,y=Math.floor(p.y/TILE)*TILE+8;
            const tiles=kind==='flamethrower'?Array.from({length:5},(_,i)=>({x:x+(i-2)*TILE,y})):[{x,y}];
            const hazard={id:++this.serial,kind,tiles,at:this.time,impactAt:this.time+spec.warning,until:this.time+spec.warning+spec.active,hit:false,lastTick:-Infinity};
            this.hazards.push(hazard);if(this.hazards.length>12)this.hazards.shift();
            this.emit('hazard',{hazard});return hazard;
        }
        hurt(amount){
            if(this.player.dead)return;
            this.player.hp=Math.max(0,this.player.hp-amount);this.emit('hurt',{amount});
            if(!this.player.hp)this.die();
        }
        update(dt){
            this.time+=Math.max(0,Math.min(dt,100));
            if(this.enemyCharge&&this.time>=this.enemyCharge.until){
                if(Math.hypot(this.player.x-this.enemyCharge.x,this.player.y-this.enemyCharge.y)<18)this.hurt(20);
                else{this.counterUntil=this.time+1250;this.emit('opening');}
                this.enemyCharge=null;
            }
            if(this.counterUntil>this.time&&Math.hypot(this.player.x-this.enemy.x,this.player.y-this.enemy.y)<34){
                this.counterUntil=0;this.counter(this.counterStyle||'holy',this.frostCounter);this.emit('automatic-counter');
            }
            for(const h of this.hazards){
                if(this.time<h.impactAt||this.time>=h.until)continue;
                const inside=h.tiles.some(tile=>this.player.x>=tile.x-8&&this.player.x<tile.x+8&&this.player.y>=tile.y-8&&this.player.y<tile.y+8);
                if(!inside||this.player.dead)continue;
                if(h.kind==='flamethrower'){
                    if(this.time-h.lastTick>=500){h.lastTick=this.time;this.hurt(hazardSpecs[h.kind].damage);}
                }else if(!h.hit){h.hit=true;this.hurt(hazardSpecs[h.kind].damage);}
            }
            this.hazards=this.hazards.filter(h=>this.time<h.until+1500);
        }
    }
    return {Playground,hazardSpecs,TILE};
});
