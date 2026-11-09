define(['../../shared/js/placedfxconfig'], function (Config) {
    // Match the playable PixelFX preview's cropped, game-sized impact animations.
    const hitAppearance = {
        'impacts/crit-hit': {duration:340, end:600, scale:.3},
        'impacts/hit-spark': {duration:240, end:450, scale:.4, palette:'electric'},
        'ice/snowflake-burst': {duration:400, end:1000, scale:.35},
        'shadow/dark-explosion': {duration:450, end:1300, scale:.25},
    };
    class PixelFx {
        constructor(game) {this.game=game;this.clear();}
        clear() {this.rows=[];this.activations={};this.hits=[];this.seen=new Set();this.mapId=this.game.mapId;this.game.renderer?.setExtensionData('pixel-fx',null);this.game.renderer?.setExtensionData('pixel-fx-tiles',null);this.game.renderer?.setExtensionData('invincibility-aura',null);}
        pause() {this.hits=[];this.game.renderer?.setExtensionData('pixel-fx',null);this.game.renderer?.setExtensionData('pixel-fx-tiles',null);this.game.renderer?.setExtensionData('invincibility-aura',null);}
        receive(packet) {
            if (packet.mapId?.replace(/^world_/,'')!==this.game.mapId?.replace(/^world_/,'')) return;
            if(this.mapId!==this.game.mapId)this.clear();
            if(packet.type==='map') {
                try {Config.validate(packet.rows);} catch (_) {return;}
                this.rows=packet.rows;this.seed=packet.seed || 0;this.epoch=packet.epoch;this.activations=packet.activations || {};this.serverTimeAtSync=packet.now;this.syncedAt=performance.now();
            } else if(packet.type==='hit' && hitAppearance[packet.effect] && !this.seen.has(packet.id)) {
                this.seen.add(packet.id);if(this.seen.size>256)this.seen.delete(this.seen.values().next().value);
                this.hits.push({...packet,started:performance.now()});if(this.hits.length>32)this.hits.shift();
            }
        }
        render(renderer) {
            if(this.mapId!==this.game.mapId)this.clear();
            if(!this.game.started || this.game.isStopped)return;
            if(this.renderer!==renderer){renderer.registerExtension('pixelfx-renderer-worker.js');renderer.registerExtension('invincibility-aura-worker.js');this.renderer=renderer;}
            const now=performance.now(), reduced=!!this.game.app?.settings?.getReducedMotion?.();
            this.hits=this.hits.filter(h=>now-h.started<hitAppearance[h.effect].duration);
            const serverTime=this.serverTimeAtSync+now-this.syncedAt;
            const rows=this.rows.map(row=>{
                const epoch=row.attackingMob===undefined?this.epoch:this.activations[row.id];
                const phase=Config.phase(row,Number.isFinite(epoch)?serverTime-epoch:null);
                return {...row,...Config.hitRegion(row,phase.cycle,this.seed),seed:Config.effectSeed(row,phase.cycle,this.seed,epoch),phase};
            });
            const effects=rows.map(row=>({effect:row.effect,sprite:row.sprite,x:(row.x+row.width/2)*16,y:(row.y+row.height/2)*16,scale:row.scale,palette:row.palette,seed:row.seed,options:row.options,hue:row.hue || 0,removeBackdrop:row.background!=='original',time:reduced?200:row.phase.effectMs}));
            if(!reduced && this.game.app?.settings?.getCombatEffectsEnabled?.()!==false) for(const h of this.hits) {
                const appearance=hitAppearance[h.effect];
                effects.push({effect:h.effect,x:h.x*16+8,y:h.y*16+8,scale:appearance.scale,palette:appearance.palette,seed:h.seed,time:(now-h.started)/appearance.duration*appearance.end});
            }
            const players=new Set([...Object.values(this.game.entities || {}),this.game.player]);
            const auras=[];
            for (const player of players) {
                if (!player?.invincible || player.isDead || player.isDying) continue;
                auras.push({x:player.x+8,y:player.y+16,time:reduced?600:now});
            }
            renderer.setExtensionData('invincibility-aura',auras);
            // Warning tiles and countdowns are never disabled by reduced motion.
            renderer.setExtensionData('pixel-fx',effects.filter((e,i)=>i>=rows.length || rows[i].phase.effectMs!==null));
            renderer.setExtensionData('pixel-fx-tiles',rows.filter(r=>r.hazard && ['warning','active'].includes(r.phase.kind)));
        }
    }
    return PixelFx;
});
